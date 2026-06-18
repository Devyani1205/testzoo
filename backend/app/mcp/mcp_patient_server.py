"""
TestZoo MCP Server 5: Patient Portal
- Patient checkout, order tracking
- Report download, notification preferences
- Order history, cashback details
Run: python -m app.mcp.mcp_patient_server  (port 8005)
"""
from fastmcp import FastMCP, Context
from fastmcp.server.middleware.logging import LoggingMiddleware
from fastmcp.server.middleware.error_handling import ErrorHandlingMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import asyncpg, os, json
from datetime import datetime, timezone
from contextlib import asynccontextmanager


@asynccontextmanager
async def patient_lifespan(server):
    pool = await asyncpg.create_pool(
        os.environ.get("DATABASE_URL_ASYNC", "postgresql://workspace_user:Suni@123@127.0.0.1:5432/sonu"),
        min_size=2, max_size=10,
    )
    try:
        yield {"db": pool}
    finally:
        await pool.close()


mcp = FastMCP(
    "TestZoo-Patient",
    instructions=(
        "Patient portal server. "
        "Use get_checkout_details to load patient checkout page. "
        "Use get_patient_orders to view order history. "
        "Use get_order_tracking for live status and timeline. "
        "Use get_report_download for test report access."
    ),
    lifespan=patient_lifespan,
)
mcp.add_middleware(ErrorHandlingMiddleware())
mcp.add_middleware(LoggingMiddleware())


@mcp.tool(
    name="get_checkout_details",
    description="Load checkout page details for a patient using share token. Returns test info, pricing, and payment options.",
    tags={"patient", "checkout"},
    annotations={"readOnlyHint": True},
)
async def get_checkout_details(
    share_token: str = Field(description="Unique share token from WhatsApp link"),
    ctx: Context = None,
) -> dict:
    db = ctx.lifespan_context["db"]

    rec = await db.fetchrow(
        """
        SELECT r.*,
               t.name AS test_name, t.description AS test_desc, t.category,
               t.biomarkers, t.test_type, t.turnaround_days, t.sample_type,
               t.home_collection, t.mrp_cents, t.b2b_price_cents, t.patient_discount_percent,
               u.full_name AS doctor_name,
               l.name AS lab_name, l.city AS lab_city, l.accreditation
        FROM recommendations r
        JOIN tests t ON t.id = r.test_id
        JOIN doctor_profiles dp ON dp.id = r.doctor_id
        JOIN users u ON u.id = dp.user_id
        LEFT JOIN labs l ON l.id = t.lab_id
        WHERE r.share_token = $1
        """,
        share_token,
    )

    if not rec:
        raise ValueError("Invalid or expired share link")

    now = datetime.now(timezone.utc)
    if rec["expires_at"] and rec["expires_at"].replace(tzinfo=timezone.utc) < now:
        raise ValueError("This payment link has expired. Please contact your doctor for a new link.")

    if rec["status"] == "recommended":
        await db.execute(
            "UPDATE recommendations SET status = 'patient_viewed', updated_at = NOW() WHERE share_token = $1",
            share_token,
        )

    mrp = rec["mrp_cents"] / 100
    b2b = rec["b2b_price_cents"] / 100
    discount = rec["patient_discount_percent"] or 15.0
    patient_price = round(b2b * (1 - discount / 100), 2)
    savings = round(mrp - patient_price, 2)
    biomarkers = json.loads(rec["biomarkers"]) if isinstance(rec["biomarkers"], str) else (rec["biomarkers"] or [])

    return {
        "component": "PatientCheckout",
        "recommendation_id": str(rec["id"]),
        "share_token": share_token,
        "test": {
            "name": rec["test_name"],
            "description": rec["test_desc"],
            "category": rec["category"],
            "biomarkers": biomarkers,
            "test_type": rec["test_type"],
            "turnaround_days": rec["turnaround_days"],
            "sample_type": rec["sample_type"],
            "home_collection": bool(rec["home_collection"]),
        },
        "lab": {
            "name": rec["lab_name"],
            "city": rec["lab_city"],
            "accreditation": rec["accreditation"],
        },
        "pricing": {
            "mrp": mrp,
            "patient_price": patient_price,
            "discount_percent": discount,
            "savings": savings,
            "savings_badge": f"Save ₹{savings:.0f} ({discount:.0f}% off)",
        },
        "doctor": {
            "name": rec["doctor_name"],
            "clinical_reasoning": rec["clinical_reasoning"],
        },
        "expires_at": rec["expires_at"].isoformat() if rec["expires_at"] else None,
        "payment_methods": [
            {"id": "card", "label": "Credit / Debit Card", "icon": "credit-card", "enabled": True},
            {"id": "upi", "label": "UPI (GPay, PhonePe, Paytm)", "icon": "smartphone", "enabled": True},
            {"id": "netbanking", "label": "Net Banking", "icon": "building-2", "enabled": True},
            {"id": "wallet", "label": "TestZoo Wallet", "icon": "wallet", "enabled": True},
            {"id": "cod", "label": "Cash on Delivery", "icon": "banknote", "enabled": os.environ.get("COD_ENABLED", "true").lower() == "true"},
        ],
        "stripe_publishable_key": os.environ.get("STRIPE_PUBLISHABLE_KEY", ""),
    }


@mcp.tool(
    name="get_patient_orders",
    description="Get order history for a patient.",
    tags={"patient", "orders"},
    annotations={"readOnlyHint": True},
)
async def get_patient_orders(
    patient_id: str = Field(description="Patient profile UUID"),
    ctx: Context = None,
) -> dict:
    db = ctx.lifespan_context["db"]

    rows = await db.fetch(
        """
        SELECT o.id, o.order_status, o.payment_status, o.payment_method,
               o.final_amount_cents, o.created_at, o.report_url, o.scheduled_at,
               t.name AS test_name, t.category, t.turnaround_days,
               l.name AS lab_name
        FROM orders o
        JOIN tests t ON t.id = o.test_id
        LEFT JOIN labs l ON l.id = t.lab_id
        WHERE o.patient_id = $1
        ORDER BY o.created_at DESC
        """,
        patient_id,
    )

    return {
        "component": "PatientOrderHistory",
        "orders": [
            {
                "order_id": str(r["id"]),
                "test_name": r["test_name"],
                "lab_name": r["lab_name"] or "",
                "category": r["category"],
                "order_status": r["order_status"],
                "payment_status": r["payment_status"],
                "payment_method": r["payment_method"],
                "amount_paid": r["final_amount_cents"] / 100,
                "report_available": bool(r["report_url"]),
                "created_at": r["created_at"].isoformat(),
                "scheduled_at": r["scheduled_at"].isoformat() if r["scheduled_at"] else None,
            }
            for r in rows
        ],
    }


@mcp.tool(
    name="get_order_tracking",
    description="Get detailed tracking timeline for a patient order.",
    tags={"patient", "tracking"},
    annotations={"readOnlyHint": True},
)
async def get_order_tracking(
    order_id: str = Field(description="Order UUID"),
    ctx: Context = None,
) -> dict:
    db = ctx.lifespan_context["db"]

    order = await db.fetchrow(
        """
        SELECT o.*, t.name AS test_name, t.turnaround_days,
               l.name AS lab_name, l.city AS lab_city
        FROM orders o
        JOIN tests t ON t.id = o.test_id
        LEFT JOIN labs l ON l.id = t.lab_id
        WHERE o.id = $1
        """,
        order_id,
    )
    if not order:
        raise ValueError(f"Order {order_id} not found")

    steps = [
        ("order_placed", "Order Placed", "clipboard-list", True),
        ("payment_confirmed", "Payment Confirmed", "credit-card", order["payment_status"] == "paid"),
        ("sample_collection", "Sample Collection Scheduled", "calendar-check", order["order_status"] in ["sample_collected", "processing", "report_ready", "completed"]),
        ("sample_collected", "Sample Collected", "test-tube", order["order_status"] in ["sample_collected", "processing", "report_ready", "completed"]),
        ("lab_processing", "Lab Processing", "flask-conical", order["order_status"] in ["processing", "report_ready", "completed"]),
        ("report_ready", "Report Ready", "file-text", order["order_status"] in ["report_ready", "completed"]),
        ("completed", "Order Completed", "check-circle", order["order_status"] == "completed"),
    ]

    return {
        "component": "OrderTracker",
        "order_id": order_id,
        "test_name": order["test_name"],
        "lab_name": order["lab_name"],
        "order_status": order["order_status"],
        "payment_status": order["payment_status"],
        "payment_method": order["payment_method"],
        "amount_paid": order["final_amount_cents"] / 100,
        "report_url": order["report_url"],
        "collection_address": order["collection_address"],
        "timeline": [
            {"key": s[0], "label": s[1], "icon": s[2], "completed": s[3]}
            for s in steps
        ],
    }


if __name__ == "__main__":
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8005
    mcp.run(transport="http", host="0.0.0.0", port=port)
