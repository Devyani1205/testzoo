from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from app.database import get_db
from app.models import User, Wallet, WalletTransaction, Referral
from app.api.auth import get_current_user
from app.config import settings
import uuid

router = APIRouter(prefix="/wallet", tags=["wallet"])


@router.get("/balance")
async def get_wallet_balance(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Wallet).where(Wallet.user_id == current_user.id))
    wallet = result.scalar_one_or_none()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")

    tx_result = await db.execute(
        select(WalletTransaction)
        .where(WalletTransaction.wallet_id == wallet.id)
        .order_by(WalletTransaction.created_at.desc())
        .limit(20)
    )
    transactions = tx_result.scalars().all()

    return {
        "component": "WalletCard",
        "wallet_id": wallet.id,
        "balance": wallet.balance_cents / 100,
        "balance_cents": wallet.balance_cents,
        "currency": "INR",
        "transactions": [
            {
                "id": t.id,
                "type": t.transaction_type,
                "amount": t.amount_cents / 100,
                "balance_after": t.balance_after_cents / 100,
                "description": t.description,
                "created_at": t.created_at.isoformat(),
            }
            for t in transactions
        ],
    }


@router.get("/referral")
async def get_referral_info(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Referral).where(Referral.user_id == current_user.id))
    referral = result.scalar_one_or_none()
    if not referral:
        import secrets
        referral = Referral(
            id=str(uuid.uuid4()),
            user_id=current_user.id,
            referral_code=f"TZ-{secrets.token_hex(3).upper()}",
        )
        db.add(referral)
        await db.commit()

    share_link = f"{settings.FRONTEND_URL}/register?ref={referral.referral_code}"
    reward_amount = settings.REFERRAL_REWARD_AMOUNT_CENTS / 100

    return {
        "component": "ReferralCard",
        "referral_code": referral.referral_code,
        "share_link": share_link,
        "whatsapp_share": f"https://wa.me/?text=Join%20TestZoo%20and%20get%20₹{reward_amount:.0f}%20off%20your%20first%20test!%20Use%20my%20code:%20{referral.referral_code}%20👉%20{share_link}",
        "total_reward_earned": referral.total_reward_cents / 100,
        "successful_conversions": referral.successful_conversions,
        "clicks": referral.clicks,
        "reward_per_referral": reward_amount,
    }


class ApplyReferralRequest(BaseModel):
    referral_code: str


@router.post("/apply-referral")
async def apply_referral(
    req: ApplyReferralRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ref_result = await db.execute(select(Referral).where(Referral.referral_code == req.referral_code.upper()))
    referral = ref_result.scalar_one_or_none()
    if not referral:
        raise HTTPException(status_code=404, detail="Invalid referral code")
    if referral.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot use your own referral code")

    reward = settings.REFERRAL_REWARD_AMOUNT_CENTS

    wallet_result = await db.execute(select(Wallet).where(Wallet.user_id == current_user.id))
    my_wallet = wallet_result.scalar_one_or_none()
    if my_wallet:
        old_bal = my_wallet.balance_cents
        my_wallet.balance_cents += reward
        tx = WalletTransaction(
            id=str(uuid.uuid4()), wallet_id=my_wallet.id,
            transaction_type="REFERRAL", amount_cents=reward,
            balance_before_cents=old_bal, balance_after_cents=my_wallet.balance_cents,
            description=f"Referral reward from code {req.referral_code}",
        )
        db.add(tx)

    referrer_wallet_result = await db.execute(select(Wallet).where(Wallet.user_id == referral.user_id))
    ref_wallet = referrer_wallet_result.scalar_one_or_none()
    if ref_wallet:
        old_bal = ref_wallet.balance_cents
        ref_wallet.balance_cents += reward
        tx2 = WalletTransaction(
            id=str(uuid.uuid4()), wallet_id=ref_wallet.id,
            transaction_type="REFERRAL", amount_cents=reward,
            balance_before_cents=old_bal, balance_after_cents=ref_wallet.balance_cents,
            description=f"Referral bonus - friend joined",
        )
        db.add(tx2)

    referral.successful_conversions += 1
    referral.total_reward_cents += reward
    await db.commit()

    return {
        "status": "success",
        "reward_credited": reward / 100,
        "new_balance": my_wallet.balance_cents / 100 if my_wallet else 0,
    }
