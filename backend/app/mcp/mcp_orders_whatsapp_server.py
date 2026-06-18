"""
TestZoo MCP Server 2: Orders & WhatsApp Sharing
- Create share links with expiring tokens
- Send WhatsApp templates via Twilio
- Order lifecycle management
Run: python -m app.mcp.mcp_orders_whatsapp_server  (port 8002)
"""
from fastmcp import FastMCP, Context
from fastmcp.server.middleware.logging import LoggingMiddleware
from fastmcp.server.middleware.error_handling import ErrorHandlingMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import asyncpg, httpx, os, secrets, json
from datetime import datetime, timedelta, timezone
from contextlib import asynccontextmanager
import uuid


@asynccontextmanager
async def orders_lifespan(server):
    pool = await asyncpg.create_pool(
        os.environ.get("DATABASE_URL_ASYNC", "postgresql://workspace_user:Suni@123@127.0.0.1:5432/sonu"),
        min_size=2, max_size=10,
    )
    http_client = httpx.AsyncClient(timeout=10.0)
    try:
        yield {"db": pool, "http": http_client}
    finally:
        await pool.close()
        await http_client.aclose()


mcp = FastMCP(
    "TestZoo-Orders",
    instructions=(
        "Order management and WhatsApp sharing server. "
        "Use create_whatsapp_share_link to share tests with patients. "
        "Use get_order_status to track orders. "
        "Use add_test_to_order for on-the-spot additions."
    ),
    lifespan=orders_lifespan,
)
mcp.add_middleware(ErrorHandlingMiddleware())
mcp.add_middleware(LoggingMiddleware())


class ShareLinkInput(BaseModel):
    test_id: str = Field(description="UUID of the test to share")
    doctor_id: str = Field(description="Doctor's profile UUID")
    patient_phone: str = Field(description="Patient phone in E.164 format e.g. +919876543210")
    patient_name: Optional[str] = Field(None, description="Patient name")
    case_description: Optional[str] = Field(None, description="Brief case context")


@mcp.tool(
    name="create_whatsapp_share_link",
    description="Generate a unique patient checkout link and send WhatsApp message. Returns a ShareConfirmationCard.",
    tags={"orders", "whatsapp", "sharing"},
)
async def create_whatsapp_share_link(input: ShareLinkInput, ctx: Context) -> dict:
    db = ctx.lifespan_context["db"]
    http = ctx.lifespan_context["http"]

    await ctx.info(f"Creating share link for test {input.test_id}")
    await ctx.report_progress(0, 4, "Looking up test...")

    test = await db.fetchrow("SELECT * FROM tests WHERE id = $1", input.test_id)
    if not test:
        raise ValueError(f"Test {input.test_id} not found")

    share_token = secrets.token_urlsafe(24)
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    share_link = f"{frontend_url}/patient/checkout/{share_token}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)

    await ctx.report_progress(1, 4, "Creating recommendation record...")

    rec_id = str(uuid.uuid4())
    await db.execute(
        """
        INSERT INTO recommendations (id, doctor_id, test_id, patient_name, patient_phone,
            case_description, status, share_link, share_token, expires_at, whatsapp_status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, 'sent', $7, $8, $9, 'pending', NOW(), NOW())
        """,
        rec_id, input.doctor_id, input.test_id, input.patient_name, input.patient_phone,
        input.case_description or "", share_link, share_token, expires_at,
    )

    b2b = test["b2b_price_cents"] / 100
    discount = test["patient_discount_percent"] or 15.0
    patient_price = round(b2b * (1 - discount / 100), 2)

    await ctx.report_progress(2, 4, "Sending WhatsApp message...")

    wa_status = "pending"
    twilio_sid = os.environ.get("TWILIO_ACCOUNT_SID", "")
    twilio_token = os.environ.get("TWILIO_AUTH_TOKEN", "")
    wa_from = os.environ.get("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")

    if twilio_sid and twilio_token:
        try:
            body = (
                f"🔬 *TestZoo Diagnostic*\n\n"
                f"Your doctor has recommended: *{test['name']}*\n"
                f"💰 Your price: ₹{patient_price:.0f} ({discount:.0f}% off)\n\n"
                f"🔗 Pay securely:\n{share_link}\n\n"
                f"_Link expires in 7 days_"
            )
            to = input.patient_phone if input.patient_phone.startswith("whatsapp:") else f"whatsapp:{input.patient_phone}"
            response = await http.post(
                f"https://api.twilio.com/2010-04-01/Accounts/{twilio_sid}/Messages.json",
                auth=(twilio_sid, twilio_token),
                data={"Body": body, "From": wa_from, "To": to},
            )
            if response.status_code == 201:
                data = response.json()
                wa_status = data.get("status", "queued")
                await db.execute(
                    "UPDATE recommendations SET whatsapp_status = $1 WHERE id = $2",
                    wa_status, rec_id,
                )
        except Exception as e:
            await ctx.warning(f"WhatsApp send failed: {e}")
    else:
        await ctx.info(f"[MOCK WhatsApp] → {input.patient_phone}: {test['name']} | {share_link}")
        wa_status = "mock_sent"

    await ctx.report_progress(4, 4, "Done")

    return {
        "component": "ShareConfirmationCard",
        "recommendation_id": rec_id,
        "share_link": share_link,
        "share_token": share_token,
        "expires_at": expires_at.isoformat(),
        "whatsapp_status": wa_status,
        "test_name": test["name"],
        "patient_phone": input.patient_phone,
        "patient_price": patient_price,
        "discount_percent": discount,
        "actions": ["copy_link", "open_whatsapp", "view_recommendation"],
    }


@mcp.tool(
    name="get_order_status",
    description="Get current status and timeline for a patient order.",
    tags={"orders", "tracking"},
    annotations={"readOnlyHint": True},
)
async def get_order_status(
    order_id: str = Field(description="Order UUID"),
    ctx: Context = None,
) -> dict:
    db = ctx.lifespan_context["db"]
    row = await db.fetchrow(
        """
        SELECT o.*, t.name as test_name, t.turnaround_days
        FROM orders o JOIN tests t ON t.id = o.test_id
        WHERE o.id = $1
        """,
        order_id,
    )
    if not row:
        raise ValueError(f"Order {order_id} not found")

    timeline_steps = ["pending", "paid", "sample_collected", "processing", "report_ready", "completed"]
    current_idx = timeline_steps.index(row["order_status"]) if row["order_status"] in timeline_steps else 0

    timeline = [
        {"step": s.replace("_", " ").title(), "completed": i <= current_idx, "current": i == current_idx}
        for i, s in enumerate(timeline_steps)
    ]

    return {
        "component": "OrderTracker",
        "order_id": order_id,
        "test_name": row["test_name"],
        "order_status": row["order_status"],
        "payment_status": row["payment_status"],
        "payment_method": row["payment_method"],
        "final_amount": row["final_amount_cents"] / 100,
        "created_at": row["created_at"].isoformat(),
        "report_url": row.get("report_url"),
        "timeline": timeline,
    }


@mcp.tool(
    name="add_test_to_order",
    description="Add an extra test to an existing order (on-the-spot addition during sample collection).",
    tags={"orders", "modification"},
)
async def add_test_to_order(
    order_id: str = Field(description="Existing order UUID"),
    test_id: str = Field(description="New test UUID to add"),
    ctx: Context = None,
) -> dict:
    db = ctx.lifespan_context["db"]

    existing = await db.fetchrow("SELECT * FROM orders WHERE id = $1", order_id)
    if not existing:
        raise ValueError("Order not found")
    if existing["order_status"] not in ["paid", "sample_collected"]:
        raise ValueError(f"Cannot add test to order in status: {existing['order_status']}")

    test = await db.fetchrow("SELECT * FROM tests WHERE id = $1", test_id)
    if not test:
        raise ValueError("Test not found")

    b2b = test["b2b_price_cents"]
    discount = test["patient_discount_percent"] or 15.0
    addon_price = int(b2b * (1 - discount / 100))

    new_order_id = str(uuid.uuid4())
    await db.execute(
        """
        INSERT INTO orders (id, recommendation_id, doctor_id, patient_id, test_id,
            mrp_cents, b2b_price_cents, patient_discount_percent, patient_price_cents,
            final_amount_cents, payment_method, payment_status, order_status, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'paid', 'paid', NOW(), NOW())
        """,
        new_order_id, None, existing["doctor_id"], existing["patient_id"], test_id,
        test["mrp_cents"], b2b, discount, addon_price, addon_price,
        existing["payment_method"],
    )

    return {
        "component": "AddOnConfirmationCard",
        "new_order_id": new_order_id,
        "original_order_id": order_id,
        "test_name": test["name"],
        "addon_price": addon_price / 100,
        "payment_method": existing["payment_method"],
        "status": "success",
    }


@mcp.tool(
    name="remind_patient",
    description="Resend WhatsApp reminder to a patient for a pending recommendation.",
    tags={"orders", "whatsapp"},
)
async def remind_patient(
    recommendation_id: str = Field(description="Recommendation UUID"),
    ctx: Context = None,
) -> dict:
    db = ctx.lifespan_context["db"]
    http = ctx.lifespan_context["http"]

    rec = await db.fetchrow(
        """
        SELECT r.*, t.name as test_name, t.b2b_price_cents, t.patient_discount_percent,
               u.full_name as doctor_name
        FROM recommendations r
        JOIN tests t ON t.id = r.test_id
        JOIN doctor_profiles dp ON dp.id = r.doctor_id
        JOIN users u ON u.id = dp.user_id
        WHERE r.id = $1
        """,
        recommendation_id,
    )
    if not rec:
        raise ValueError("Recommendation not found")

    b2b = rec["b2b_price_cents"] / 100
    discount = rec["patient_discount_percent"] or 15.0
    patient_price = round(b2b * (1 - discount / 100), 2)

    twilio_sid = os.environ.get("TWILIO_ACCOUNT_SID", "")
    twilio_token = os.environ.get("TWILIO_AUTH_TOKEN", "")
    wa_from = os.environ.get("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")
    status = "mock_sent"

    if twilio_sid and twilio_token and rec["patient_phone"]:
        try:
            body = (
                f"🔔 *Reminder from Dr. {rec['doctor_name']}*\n\n"
                f"Your recommended test is still available:\n*{rec['test_name']}*\n"
                f"💰 ₹{patient_price:.0f}\n\n🔗 {rec['share_link']}\n\n_Expires soon!_"
            )
            to = rec["patient_phone"] if rec["patient_phone"].startswith("whatsapp:") else f"whatsapp:{rec['patient_phone']}"
            response = await http.post(
                f"https://api.twilio.com/2010-04-01/Accounts/{twilio_sid}/Messages.json",
                auth=(twilio_sid, twilio_token),
                data={"Body": body, "From": wa_from, "To": to},
            )
            status = "sent" if response.status_code == 201 else "failed"
        except Exception as e:
            status = f"failed: {e}"

    return {"recommendation_id": recommendation_id, "reminder_status": status}


if __name__ == "__main__":
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8002
    mcp.run(transport="http", host="0.0.0.0", port=port)
