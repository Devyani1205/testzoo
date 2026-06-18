"""
TestZoo MCP Server 1: Diagnostic Test Catalog & Sponsored Search
Exposes catalog search, test details, and B2B pricing as MCP tools.
Run: python -m app.mcp.mcp_catalog_server  (port 8001)
"""
from fastmcp import FastMCP, Context
from fastmcp.server.middleware.logging import LoggingMiddleware
from fastmcp.server.middleware.error_handling import ErrorHandlingMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import asyncpg, os, json
from contextlib import asynccontextmanager


@asynccontextmanager
async def db_lifespan(server):
    pool = await asyncpg.create_pool(
        os.environ.get("DATABASE_URL_ASYNC", "postgresql://workspace_user:Suni@123@127.0.0.1:5432/sonu"),
        min_size=2, max_size=10,
    )
    try:
        yield {"db": pool}
    finally:
        await pool.close()


mcp = FastMCP(
    "TestZoo-Catalog",
    instructions=(
        "Diagnostic test marketplace catalog. Use search_diagnostic_tests to find tests by clinical query. "
        "Sponsored results appear first (is_sponsored=True). Use get_test_detail for full pricing and lab info."
    ),
    lifespan=db_lifespan,
)
mcp.add_middleware(ErrorHandlingMiddleware())
mcp.add_middleware(LoggingMiddleware())


class TestSearchInput(BaseModel):
    query: str = Field(description="Clinical query e.g. 'lung cancer EGFR mutation'")
    cancer_type: Optional[str] = Field(None, description="Cancer type filter")
    biomarker: Optional[str] = Field(None, description="Biomarker filter e.g. 'EGFR'")
    max_results: int = Field(10, ge=1, le=50)
    include_sponsored: bool = Field(True)


@mcp.tool(
    name="search_diagnostic_tests",
    description="Search the TestZoo catalog for companion diagnostic tests. Returns ranked cards with B2B pricing, sponsored badges, and UI schema.",
    tags={"catalog", "search"},
    annotations={"readOnlyHint": True},
)
async def search_diagnostic_tests(input: TestSearchInput, ctx: Context) -> dict:
    db = ctx.lifespan_context["db"]
    await ctx.info(f"Searching catalog: {input.query}")
    await ctx.report_progress(0, 3, "Querying catalog...")

    sponsored_rows = await db.fetch(
        """
        SELECT id, name, description, category, b2b_price_cents, mrp_cents,
               lab_commission_percent, patient_discount_percent,
               turnaround_days, sample_type, home_collection,
               is_sponsored, biomarkers,
               (SELECT name FROM labs WHERE labs.id = tests.lab_id) AS lab_name
        FROM tests
        WHERE is_sponsored = TRUE AND is_active = TRUE
          AND (
            name ILIKE $1 OR description ILIKE $1
            OR EXISTS (
                SELECT 1 FROM jsonb_array_elements_text(sponsored_keywords::jsonb) kw
                WHERE kw ILIKE $2
            )
          )
        ORDER BY sponsored_bid_priority DESC
        LIMIT $3
        """,
        f"%{input.query}%", f"%{input.query}%",
        int(os.environ.get("MAX_SPONSORED_RESULTS", 3)),
    )

    await ctx.report_progress(1, 3, "Fetching organic results...")

    organic_rows = await db.fetch(
        """
        SELECT id, name, description, category, b2b_price_cents, mrp_cents,
               lab_commission_percent, patient_discount_percent,
               turnaround_days, sample_type, home_collection,
               is_sponsored, biomarkers,
               (SELECT name FROM labs WHERE labs.id = tests.lab_id) AS lab_name
        FROM tests
        WHERE is_active = TRUE AND is_sponsored = FALSE
          AND (name ILIKE $1 OR description ILIKE $1 OR category ILIKE $1)
        ORDER BY b2b_price_cents ASC
        LIMIT $2
        """,
        f"%{input.query}%", input.max_results,
    )

    await ctx.report_progress(2, 3, "Building response cards...")

    patient_discount_pct = float(os.environ.get("PATIENT_DISCOUNT_PERCENT", 15))

    def build_card(row, sponsored: bool) -> dict:
        mrp = row["mrp_cents"] / 100
        b2b = row["b2b_price_cents"] / 100
        discount = row["patient_discount_percent"] or patient_discount_pct
        patient_price = round(b2b * (1 - discount / 100), 2)
        savings = round(mrp - patient_price, 2)
        biomarkers = json.loads(row["biomarkers"]) if isinstance(row["biomarkers"], str) else (row["biomarkers"] or [])
        return {
            "test_id": str(row["id"]),
            "name": row["name"],
            "lab_name": row["lab_name"] or "Partner Lab",
            "category": row["category"],
            "mrp": mrp,
            "b2b_price": b2b,
            "patient_price": patient_price,
            "discount_percent": discount,
            "savings": savings,
            "turnaround_days": row["turnaround_days"],
            "sample_type": row["sample_type"],
            "home_collection": bool(row["home_collection"]),
            "is_sponsored": sponsored,
            "biomarkers": biomarkers[:5],
            "description": (row["description"] or "")[:200],
            "actions": ["view_details", "share_whatsapp", "add_to_recommendation"],
        }

    cards = [build_card(r, True) for r in sponsored_rows]
    cards += [build_card(r, False) for r in organic_rows]

    await ctx.report_progress(3, 3, "Done")
    return {
        "component": "RecommendationGrid",
        "query": input.query,
        "total": len(cards),
        "sponsored_count": len(sponsored_rows),
        "cards": cards,
    }


@mcp.tool(
    name="get_test_detail",
    description="Get full details for a diagnostic test including pricing tiers, lab info, and sample requirements.",
    tags={"catalog", "detail"},
    annotations={"readOnlyHint": True},
)
async def get_test_detail(
    test_id: str = Field(description="UUID of the test"),
    ctx: Context = None,
) -> dict:
    db = ctx.lifespan_context["db"]
    row = await db.fetchrow(
        """
        SELECT t.*, l.name as lab_name, l.city, l.accreditation, l.description as lab_description
        FROM tests t LEFT JOIN labs l ON t.lab_id = l.id
        WHERE t.id = $1
        """,
        test_id,
    )
    if not row:
        raise ValueError(f"Test {test_id} not found")

    mrp = row["mrp_cents"] / 100
    b2b = row["b2b_price_cents"] / 100
    discount = row["patient_discount_percent"] or float(os.environ.get("PATIENT_DISCOUNT_PERCENT", 15))
    patient_price = round(b2b * (1 - discount / 100), 2)
    biomarkers = json.loads(row["biomarkers"]) if isinstance(row["biomarkers"], str) else (row["biomarkers"] or [])

    return {
        "component": "PriceBreakdownCard",
        "test_id": test_id,
        "name": row["name"],
        "description": row["description"],
        "category": row["category"],
        "biomarkers": biomarkers,
        "test_type": row["test_type"],
        "pricing": {
            "mrp": mrp,
            "b2b_price": b2b,
            "patient_price": patient_price,
            "savings": round(mrp - patient_price, 2),
            "discount_percent": discount,
            "commission_percent": row["lab_commission_percent"],
        },
        "logistics": {
            "turnaround_days": row["turnaround_days"],
            "sample_type": row["sample_type"],
            "home_collection": bool(row.get("home_collection", True)),
        },
        "lab": {
            "name": row["lab_name"],
            "city": row["city"],
            "accreditation": row["accreditation"],
        },
        "is_sponsored": bool(row["is_sponsored"]),
    }


@mcp.resource(
    "testzoo://catalog/stats",
    name="CatalogStats",
    description="High-level catalog statistics",
    mime_type="application/json",
    annotations={"readOnlyHint": True},
)
async def get_catalog_stats(ctx: Context) -> str:
    db = ctx.lifespan_context["db"]
    row = await db.fetchrow(
        """
        SELECT COUNT(*) AS total_tests,
               COUNT(DISTINCT lab_id) AS total_labs,
               SUM(CASE WHEN is_sponsored THEN 1 ELSE 0 END) AS sponsored_count,
               AVG(b2b_price_cents) / 100 AS avg_price
        FROM tests WHERE is_active = TRUE
        """
    )
    return json.dumps(dict(row))


@mcp.prompt(
    name="clinical_case_to_test_query",
    description="Convert a doctor's free-text case to a structured diagnostic search query.",
    tags={"clinical", "ai"},
)
def clinical_case_to_test_query(
    patient_case: str = Field(description="Doctor's case e.g. '70M, lung mass, EGFR suspected'"),
    specialty: str = Field(default="oncology"),
) -> list:
    from fastmcp.prompts import Message
    return [
        Message(
            f"""You are a clinical diagnostic advisor for TestZoo.

Doctor's case: "{patient_case}"
Specialty: {specialty}

Extract and return JSON with: query, cancer_type, biomarkers (list), urgency, suggested_categories (list), clinical_summary.
Be concise and clinically precise.""",
            role="user",
        )
    ]


if __name__ == "__main__":
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8001
    mcp.run(transport="http", host="0.0.0.0", port=port)
