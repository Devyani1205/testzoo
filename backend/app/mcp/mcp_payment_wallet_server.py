"""
TestZoo MCP Server 3: Payments, Wallet, Promo & Referral Codes
- Multi-method payment initiation (Card/UPI/COD/Wallet)
- In-app wallet management
- Promo code validation
- Referral code system
Run: python -m app.mcp.mcp_payment_wallet_server  (port 8003)
"""
from fastmcp import FastMCP, Context
from fastmcp.server.middleware.logging import LoggingMiddleware
from fastmcp.server.middleware.error_handling import ErrorHandlingMiddleware
from pydantic import BaseModel, Field
from typing import Optional
import asyncpg, os, json, secrets
from datetime import datetime, timezone
from contextlib import asynccontextmanager
import uuid


@asynccontextmanager
async def payment_lifespan(server):
    pool = await asyncpg.create_pool(
        os.environ.get("DATABASE_URL_ASYNC", "postgresql://workspace_user:Suni@123@127.0.0.1:5432/sonu"),
        min_size=2, max_size=10,
    )
    try:
        yield {"db": pool}
    finally:
        await pool.close()


mcp = FastMCP(
    "TestZoo-Payment",
    instructions=(
        "Payment, wallet, and discount server. "
        "Use initiate_payment to start a checkout flow. "
        "Use apply_promo_code to validate and apply discounts. "
        "Use get_wallet_balance to check wallet funds. "
        "Use create_referral_code to generate and share referral links."
    ),
    lifespan=payment_lifespan,
)
mcp.add_middleware(ErrorHandlingMiddleware())
mcp.add_middleware(LoggingMiddleware())


class PaymentInput(BaseModel):
    order_id: str = Field(description="Order UUID to pay")
    payment_method: str = Field(description="One of: card, upi, wallet, cod, netbanking")
    wallet_amount_cents: Optional[int] = Field(0, description="Amount to deduct from wallet")
    user_id: Optional[str] = Field(None, description="User UUID (for wallet deduction)")


@mcp.tool(
    name="initiate_payment",
    description="Initiate payment for an order. Returns checkout UI schema for card/UPI/COD/wallet.",
    tags={"payment", "checkout"},
)
async def initiate_payment(input: PaymentInput, ctx: Context) -> dict:
    db = ctx.lifespan_context["db"]
    await ctx.info(f"Initiating {input.payment_method} payment for order {input.order_id}")

    order = await db.fetchrow("SELECT * FROM orders WHERE id = $1", input.order_id)
    if not order:
        raise ValueError(f"Order {input.order_id} not found")

    final_amount_cents = order["final_amount_cents"]
    wallet_used = 0

    if input.payment_method in ("wallet", "card", "upi"):
        if input.wallet_amount_cents and input.wallet_amount_cents > 0 and input.user_id:
            wallet_row = await db.fetchrow("SELECT * FROM wallets WHERE user_id = $1", input.user_id)
            if wallet_row and wallet_row["balance_cents"] >= input.wallet_amount_cents:
                wallet_used = min(input.wallet_amount_cents, final_amount_cents)
                new_balance = wallet_row["balance_cents"] - wallet_used
                await db.execute(
                    "UPDATE wallets SET balance_cents = $1, updated_at = NOW() WHERE id = $2",
                    new_balance, wallet_row["id"],
                )
                tx_id = str(uuid.uuid4())
                await db.execute(
                    """
                    INSERT INTO wallet_transactions
                    (id, wallet_id, transaction_type, amount_cents, balance_before_cents, balance_after_cents,
                     reference_type, reference_id, description, created_at)
                    VALUES ($1, $2, 'DEBIT', $3, $4, $5, 'ORDER', $6, $7, NOW())
                    """,
                    tx_id, wallet_row["id"], wallet_used,
                    wallet_row["balance_cents"], new_balance,
                    input.order_id, f"Payment for order {input.order_id[:8]}",
                )
                final_amount_cents -= wallet_used
                await db.execute(
                    "UPDATE orders SET wallet_used_cents = $1, final_amount_cents = $2, updated_at = NOW() WHERE id = $3",
                    wallet_used, final_amount_cents, input.order_id,
                )

    if input.payment_method == "cod":
        await db.execute(
            "UPDATE orders SET payment_method = 'cod', order_status = 'paid', updated_at = NOW() WHERE id = $1",
            input.order_id,
        )
        return {
            "component": "CODConfirmation",
            "order_id": input.order_id,
            "amount": final_amount_cents / 100,
            "message": "Order confirmed! Pay the phlebotomist when your sample is collected.",
            "status": "confirmed",
        }

    if input.payment_method in ("card", "upi", "netbanking"):
        stripe_key = os.environ.get("STRIPE_SECRET_KEY", "")
        razorpay_key = os.environ.get("RAZORPAY_KEY_ID", "")

        if stripe_key and stripe_key.startswith("sk_"):
            import stripe as stripe_lib
            stripe_lib.api_key = stripe_key
            intent = stripe_lib.PaymentIntent.create(
                amount=final_amount_cents,
                currency="inr",
                metadata={"order_id": input.order_id},
                payment_method_types=["card"],
            )
            await db.execute(
                "UPDATE orders SET stripe_payment_intent_id = $1, payment_method = $2, updated_at = NOW() WHERE id = $3",
                intent.id, input.payment_method, input.order_id,
            )
            return {
                "component": "StripeCheckout",
                "order_id": input.order_id,
                "client_secret": intent.client_secret,
                "amount": final_amount_cents / 100,
                "currency": "INR",
                "stripe_publishable_key": os.environ.get("STRIPE_PUBLISHABLE_KEY", ""),
            }

        return {
            "component": "MockPaymentCheckout",
            "order_id": input.order_id,
            "amount": final_amount_cents / 100,
            "currency": "INR",
            "payment_method": input.payment_method,
            "wallet_used": wallet_used / 100,
            "message": "Configure STRIPE_SECRET_KEY or RAZORPAY_KEY_ID in testzoo.env to enable live payments.",
        }

    raise ValueError(f"Unsupported payment method: {input.payment_method}")


@mcp.tool(
    name="apply_promo_code",
    description="Validate and apply a promo or referral code to an order. Returns updated PriceBreakdownCard.",
    tags={"payment", "discount", "promo"},
)
async def apply_promo_code(
    order_id: str = Field(description="Order UUID"),
    promo_code: str = Field(description="Promo code to apply e.g. SAVE20"),
    ctx: Context = None,
) -> dict:
    db = ctx.lifespan_context["db"]

    order = await db.fetchrow("SELECT * FROM orders WHERE id = $1", order_id)
    if not order:
        raise ValueError("Order not found")

    promo = await db.fetchrow(
        "SELECT * FROM promo_codes WHERE code = $1 AND is_active = TRUE", promo_code.upper()
    )
    if not promo:
        return {"status": "error", "message": f"Promo code '{promo_code}' is invalid or expired."}

    now = datetime.now(timezone.utc)
    if promo["valid_until"] and promo["valid_until"].replace(tzinfo=timezone.utc) < now:
        return {"status": "error", "message": "This promo code has expired."}

    if promo["usage_limit"] and promo["used_count"] >= promo["usage_limit"]:
        return {"status": "error", "message": "Promo code usage limit reached."}

    patient_price = order["patient_price_cents"]
    if patient_price < (promo["minimum_order_cents"] or 0):
        min_order = (promo["minimum_order_cents"] or 0) / 100
        return {"status": "error", "message": f"Minimum order value ₹{min_order:.0f} required for this code."}

    if promo["discount_type"] == "PERCENTAGE":
        discount_cents = int(patient_price * promo["discount_value"] / 100)
        if promo["maximum_discount_cents"]:
            discount_cents = min(discount_cents, promo["maximum_discount_cents"])
    else:
        discount_cents = promo["discount_value"]

    discount_cents = min(discount_cents, patient_price)
    new_final = patient_price - discount_cents

    await db.execute(
        """
        UPDATE orders SET promo_discount_cents = $1, final_amount_cents = $2,
               promo_code_used = $3, updated_at = NOW()
        WHERE id = $4
        """,
        discount_cents, new_final, promo_code.upper(), order_id,
    )
    await db.execute("UPDATE promo_codes SET used_count = used_count + 1 WHERE id = $1", promo["id"])

    return {
        "status": "success",
        "component": "PriceBreakdownCard",
        "promo_code": promo_code.upper(),
        "discount_type": promo["discount_type"],
        "discount_value": promo["discount_value"],
        "original_amount": patient_price / 100,
        "discount_amount": discount_cents / 100,
        "final_amount": new_final / 100,
        "savings_message": f"You saved ₹{discount_cents / 100:.0f} with code {promo_code.upper()}!",
    }


@mcp.tool(
    name="get_wallet_balance",
    description="Get wallet balance and transaction history for a user.",
    tags={"wallet", "balance"},
    annotations={"readOnlyHint": True},
)
async def get_wallet_balance(
    user_id: str = Field(description="User UUID"),
    ctx: Context = None,
) -> dict:
    db = ctx.lifespan_context["db"]

    wallet = await db.fetchrow("SELECT * FROM wallets WHERE user_id = $1", user_id)
    if not wallet:
        return {"component": "WalletCard", "balance": 0, "transactions": [], "user_id": user_id}

    txns = await db.fetch(
        """
        SELECT * FROM wallet_transactions WHERE wallet_id = $1
        ORDER BY created_at DESC LIMIT 20
        """,
        wallet["id"],
    )

    return {
        "component": "WalletCard",
        "wallet_id": str(wallet["id"]),
        "balance": wallet["balance_cents"] / 100,
        "balance_cents": wallet["balance_cents"],
        "currency": wallet["currency"],
        "transactions": [
            {
                "id": str(t["id"]),
                "type": t["transaction_type"],
                "amount": t["amount_cents"] / 100,
                "balance_after": t["balance_after_cents"] / 100,
                "description": t["description"],
                "created_at": t["created_at"].isoformat(),
            }
            for t in txns
        ],
    }


@mcp.tool(
    name="create_referral_code",
    description="Get or create a referral code for a user and return a shareable WhatsApp link.",
    tags={"referral", "wallet"},
)
async def create_referral_code(
    user_id: str = Field(description="User UUID"),
    ctx: Context = None,
) -> dict:
    db = ctx.lifespan_context["db"]

    existing = await db.fetchrow("SELECT * FROM referrals WHERE user_id = $1", user_id)
    if not existing:
        code = f"TZ-{secrets.token_hex(3).upper()}"
        ref_id = str(uuid.uuid4())
        await db.execute(
            "INSERT INTO referrals (id, user_id, referral_code, created_at) VALUES ($1, $2, $3, NOW())",
            ref_id, user_id, code,
        )
        referral_code = code
        stats = {"clicks": 0, "successful_conversions": 0, "total_reward_earned": 0}
    else:
        referral_code = existing["referral_code"]
        stats = {
            "clicks": existing["clicks"],
            "successful_conversions": existing["successful_conversions"],
            "total_reward_earned": (existing["total_reward_cents"] or 0) / 100,
        }

    reward = int(os.environ.get("REFERRAL_REWARD_AMOUNT_CENTS", 50000)) / 100
    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    share_link = f"{frontend_url}/register?ref={referral_code}"
    wa_text = f"Join TestZoo & get ₹{reward:.0f} off your first test! Use code: {referral_code} → {share_link}"

    return {
        "component": "ReferralCard",
        "referral_code": referral_code,
        "share_link": share_link,
        "whatsapp_share_url": f"https://wa.me/?text={wa_text}",
        "reward_per_referral": reward,
        "stats": stats,
    }


if __name__ == "__main__":
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8003
    mcp.run(transport="http", host="0.0.0.0", port=port)
