"""
TestZoo MCP Server 4: Doctor Dashboard & Analytics
- KPI metrics, conversion rates, commission tracking
- Recommendation history with status
- Monthly trends, top tests by conversion
- CSV export, patient reminders
Run: python -m app.mcp.mcp_doctor_dashboard_server  (port 8004)
"""
from fastmcp import FastMCP, Context
from fastmcp.server.middleware.logging import LoggingMiddleware
from fastmcp.server.middleware.error_handling import ErrorHandlingMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import asyncpg, os, json, csv, io
from datetime import datetime, timedelta
from contextlib import asynccontextmanager


@asynccontextmanager
async def dashboard_lifespan(server):
    pool = await asyncpg.create_pool(
        os.environ.get("DATABASE_URL_ASYNC", "postgresql://workspace_user:Suni@123@127.0.0.1:5432/sonu"),
        min_size=2, max_size=10,
    )
    try:
        yield {"db": pool}
    finally:
        await pool.close()


mcp = FastMCP(
    "TestZoo-Dashboard",
    instructions=(
        "Doctor analytics and dashboard server. "
        "Use get_doctor_kpis for summary stats. "
        "Use get_recommendation_history for the recommendations table. "
        "Use get_conversion_trends for monthly chart data. "
        "Use export_recommendations_csv for CSV download."
    ),
    lifespan=dashboard_lifespan,
)
mcp.add_middleware(ErrorHandlingMiddleware())
mcp.add_middleware(LoggingMiddleware())


@mcp.tool(
    name="get_doctor_kpis",
    description="Get KPI summary for a doctor: total recommendations, conversion rate, revenue generated, commission earned.",
    tags={"dashboard", "analytics"},
    annotations={"readOnlyHint": True},
)
async def get_doctor_kpis(
    doctor_id: str = Field(description="Doctor profile UUID"),
    ctx: Context = None,
) -> dict:
    db = ctx.lifespan_context["db"]
    await ctx.info(f"Loading KPIs for doctor {doctor_id}")

    stats = await db.fetchrow(
        """
        SELECT
            COUNT(*) AS total_recommendations,
            SUM(CASE WHEN status = 'paid' OR status = 'completed' THEN 1 ELSE 0 END) AS paid_count,
            SUM(CASE WHEN status = 'sent' THEN 1 ELSE 0 END) AS sent_count,
            SUM(CASE WHEN status = 'patient_viewed' THEN 1 ELSE 0 END) AS viewed_count,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_count
        FROM recommendations WHERE doctor_id = $1
        """,
        doctor_id,
    )

    order_stats = await db.fetchrow(
        """
        SELECT
            COALESCE(SUM(final_amount_cents), 0) AS total_revenue_cents,
            COALESCE(SUM(doctor_commission_cents), 0) AS total_commission_cents,
            COUNT(*) AS paid_orders
        FROM orders WHERE doctor_id = $1 AND payment_status = 'paid'
        """,
        doctor_id,
    )

    total = stats["total_recommendations"] or 0
    paid = stats["paid_count"] or 0
    conversion_rate = (paid / total * 100) if total > 0 else 0.0

    pending_follow_ups = await db.fetch(
        """
        SELECT r.id, r.patient_name, r.patient_phone, r.status,
               t.name as test_name, r.created_at
        FROM recommendations r
        JOIN tests t ON t.id = r.test_id
        WHERE r.doctor_id = $1 AND r.status IN ('sent', 'patient_viewed')
          AND r.created_at > NOW() - INTERVAL '7 days'
        ORDER BY r.created_at DESC
        LIMIT 5
        """,
        doctor_id,
    )

    return {
        "component": "DoctorKPICards",
        "kpis": {
            "total_recommendations": total,
            "paid_conversions": paid,
            "sent_pending": stats["sent_count"] or 0,
            "viewed_unpaid": stats["viewed_count"] or 0,
            "conversion_rate": round(conversion_rate, 1),
            "total_revenue_generated": (order_stats["total_revenue_cents"] or 0) / 100,
            "total_commission_earned": (order_stats["total_commission_cents"] or 0) / 100,
            "paid_orders": order_stats["paid_orders"] or 0,
        },
        "pending_follow_ups": [
            {
                "id": str(r["id"]),
                "patient_name": r["patient_name"] or "Anonymous",
                "test_name": r["test_name"],
                "status": r["status"],
                "created_at": r["created_at"].isoformat(),
            }
            for r in pending_follow_ups
        ],
    }


@mcp.tool(
    name="get_recommendation_history",
    description="Get paginated recommendation history for a doctor with full details.",
    tags={"dashboard", "history"},
    annotations={"readOnlyHint": True},
)
async def get_recommendation_history(
    doctor_id: str = Field(description="Doctor profile UUID"),
    page: int = Field(1, ge=1),
    page_size: int = Field(20, ge=1, le=100),
    status_filter: Optional[str] = Field(None, description="Filter by status"),
    ctx: Context = None,
) -> dict:
    db = ctx.lifespan_context["db"]
    offset = (page - 1) * page_size

    where_clause = "r.doctor_id = $1"
    params = [doctor_id]
    if status_filter:
        params.append(status_filter)
        where_clause += f" AND r.status = ${len(params)}"

    rows = await db.fetch(
        f"""
        SELECT r.id, r.patient_name, r.patient_phone, r.status,
               r.share_link, r.whatsapp_status, r.created_at, r.expires_at,
               r.clinical_reasoning,
               t.name AS test_name, t.category, t.b2b_price_cents, t.patient_discount_percent,
               l.name AS lab_name
        FROM recommendations r
        JOIN tests t ON t.id = r.test_id
        LEFT JOIN labs l ON l.id = t.lab_id
        WHERE {where_clause}
        ORDER BY r.created_at DESC
        LIMIT ${len(params)+1} OFFSET ${len(params)+2}
        """,
        *params, page_size, offset,
    )

    total_row = await db.fetchrow(
        f"SELECT COUNT(*) FROM recommendations r WHERE {where_clause}", *params
    )

    return {
        "component": "RecommendationTable",
        "page": page,
        "page_size": page_size,
        "total": total_row["count"],
        "recommendations": [
            {
                "id": str(r["id"]),
                "patient_name": r["patient_name"] or "Anonymous",
                "patient_phone": r["patient_phone"] or "",
                "status": r["status"],
                "whatsapp_status": r["whatsapp_status"],
                "test_name": r["test_name"],
                "lab_name": r["lab_name"] or "",
                "category": r["category"],
                "patient_price": round((r["b2b_price_cents"] / 100) * (1 - (r["patient_discount_percent"] or 15) / 100), 2),
                "share_link": r["share_link"],
                "created_at": r["created_at"].isoformat(),
                "expires_at": r["expires_at"].isoformat() if r["expires_at"] else None,
                "clinical_reasoning": (r["clinical_reasoning"] or "")[:150],
            }
            for r in rows
        ],
    }


@mcp.tool(
    name="get_conversion_trends",
    description="Get monthly recommendation and conversion trend data for charts.",
    tags={"dashboard", "analytics"},
    annotations={"readOnlyHint": True},
)
async def get_conversion_trends(
    doctor_id: str = Field(description="Doctor profile UUID"),
    months: int = Field(6, ge=1, le=24, description="Number of months to look back"),
    ctx: Context = None,
) -> dict:
    db = ctx.lifespan_context["db"]

    rows = await db.fetch(
        """
        SELECT
            TO_CHAR(created_at, 'YYYY-MM') AS month,
            COUNT(*) AS recommendations,
            SUM(CASE WHEN status IN ('paid', 'completed') THEN 1 ELSE 0 END) AS conversions
        FROM recommendations
        WHERE doctor_id = $1 AND created_at > NOW() - INTERVAL '1 month' * $2
        GROUP BY month ORDER BY month
        """,
        doctor_id, months,
    )

    top_tests = await db.fetch(
        """
        SELECT t.name AS test_name, t.category,
               COUNT(*) AS recommendations,
               SUM(CASE WHEN r.status IN ('paid', 'completed') THEN 1 ELSE 0 END) AS conversions
        FROM recommendations r
        JOIN tests t ON t.id = r.test_id
        WHERE r.doctor_id = $1 AND r.created_at > NOW() - INTERVAL '1 month' * $2
        GROUP BY t.id, t.name, t.category
        ORDER BY conversions DESC, recommendations DESC
        LIMIT 10
        """,
        doctor_id, months,
    )

    return {
        "component": "DashboardCharts",
        "monthly_trend": [
            {
                "month": r["month"],
                "recommendations": r["recommendations"],
                "conversions": r["conversions"],
                "conversion_rate": round((r["conversions"] / r["recommendations"] * 100) if r["recommendations"] > 0 else 0, 1),
            }
            for r in rows
        ],
        "top_tests": [
            {
                "test_name": r["test_name"],
                "category": r["category"],
                "recommendations": r["recommendations"],
                "conversions": r["conversions"],
            }
            for r in top_tests
        ],
    }


@mcp.tool(
    name="export_recommendations_csv",
    description="Export all recommendations for a doctor as CSV string.",
    tags={"dashboard", "export"},
    annotations={"readOnlyHint": True},
)
async def export_recommendations_csv(
    doctor_id: str = Field(description="Doctor profile UUID"),
    ctx: Context = None,
) -> dict:
    db = ctx.lifespan_context["db"]

    rows = await db.fetch(
        """
        SELECT r.created_at, r.patient_name, r.patient_phone, r.status,
               t.name AS test_name, t.category,
               t.b2b_price_cents, t.patient_discount_percent,
               r.clinical_reasoning, r.share_link, r.whatsapp_status
        FROM recommendations r
        JOIN tests t ON t.id = r.test_id
        WHERE r.doctor_id = $1
        ORDER BY r.created_at DESC
        """,
        doctor_id,
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Patient", "Phone", "Test", "Category", "Patient Price (₹)", "Status", "WhatsApp", "Share Link", "Clinical Notes"])
    for r in rows:
        b2b = r["b2b_price_cents"] / 100
        patient_price = round(b2b * (1 - (r["patient_discount_percent"] or 15) / 100), 2)
        writer.writerow([
            r["created_at"].strftime("%Y-%m-%d"),
            r["patient_name"] or "Anonymous",
            r["patient_phone"] or "",
            r["test_name"],
            r["category"],
            patient_price,
            r["status"],
            r["whatsapp_status"],
            r["share_link"] or "",
            (r["clinical_reasoning"] or "")[:100],
        ])

    return {"csv_content": output.getvalue(), "row_count": len(rows), "filename": "testzoo_recommendations.csv"}


if __name__ == "__main__":
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8004
    mcp.run(transport="http", host="0.0.0.0", port=port)
