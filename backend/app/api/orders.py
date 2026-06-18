from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from pydantic import BaseModel, field_validator
from typing import Optional
import re
from app.database import get_db
from app.models import User, Order, Recommendation, Test, PatientProfile, Wallet, WalletTransaction, PromoCode, DoctorProfile, Lab
from app.api.auth import get_current_user
from app.config import settings
from datetime import datetime
import uuid
import csv
import io

router = APIRouter(prefix="/orders", tags=["orders"])


class CheckoutRequest(BaseModel):
    share_token: str
    payment_method: str
    promo_code: Optional[str] = None
    wallet_amount_cents: Optional[int] = 0
    patient_name: Optional[str] = None
    patient_email: Optional[str] = None
    patient_phone: Optional[str] = None
    collection_address: Optional[str] = None

    @field_validator("patient_phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        digits = re.sub(r"\D", "", v)
        if len(digits) != 10:
            raise ValueError("Phone must be exactly 10 digits")
        return digits

    @field_validator("patient_name")
    @classmethod
    def validate_name(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        if not re.match(r"^[A-Za-z\s\.\-']+$", v.strip()):
            raise ValueError("Name must contain letters only")
        return v.strip()


@router.get("/checkout/{share_token}")
async def get_checkout_details(share_token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Recommendation).where(Recommendation.share_token == share_token))
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Invalid or expired share link")
    if rec.expires_at and rec.expires_at < datetime.utcnow():
        raise HTTPException(status_code=410, detail="This link has expired")

    test_result = await db.execute(select(Test).where(Test.id == rec.test_id))
    test = test_result.scalar_one_or_none()

    dr_result = await db.execute(select(DoctorProfile).where(DoctorProfile.id == rec.doctor_id))
    doctor = dr_result.scalar_one_or_none()

    from app.models import User as UserModel
    dr_user = None
    if doctor:
        u_result = await db.execute(select(UserModel).where(UserModel.id == doctor.user_id))
        dr_user = u_result.scalar_one_or_none()

    mrp = test.mrp_cents / 100
    b2b = test.b2b_price_cents / 100
    discount = test.patient_discount_percent
    patient_price = round(b2b * (1 - discount / 100), 2)
    savings = round(mrp - patient_price, 2)

    if rec.status == "recommended":
        rec.status = "patient_viewed"
        await db.commit()

    return {
        "component": "PatientCheckout",
        "recommendation_id": rec.id,
        "share_token": share_token,
        "test": {
            "id": test.id,
            "name": test.name,
            "description": test.description,
            "category": test.category,
            "sample_type": test.sample_type,
            "turnaround_days": test.turnaround_days,
            "home_collection": test.home_collection,
            "biomarkers": test.biomarkers or [],
        },
        "pricing": {
            "mrp": mrp,
            "patient_price": patient_price,
            "discount_percent": discount,
            "savings": savings,
        },
        "doctor_name": dr_user.full_name if dr_user else "Your Doctor",
        "clinical_reasoning": rec.clinical_reasoning,
        "expires_at": rec.expires_at.isoformat() if rec.expires_at else None,
        "payment_methods": ["card", "upi", "wallet", "cod"],
        "stripe_publishable_key": settings.STRIPE_PUBLISHABLE_KEY,
    }


@router.post("/create")
async def create_order(req: CheckoutRequest, db: AsyncSession = Depends(get_db)):
    rec_result = await db.execute(select(Recommendation).where(Recommendation.share_token == req.share_token))
    rec = rec_result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Invalid share token")

    test_result = await db.execute(select(Test).where(Test.id == rec.test_id))
    test = test_result.scalar_one_or_none()

    mrp_cents = test.mrp_cents
    b2b_cents = test.b2b_price_cents
    discount = test.patient_discount_percent
    patient_price_cents = int(b2b_cents * (1 - discount / 100))

    promo_discount_cents = 0
    if req.promo_code:
        promo_result = await db.execute(
            select(PromoCode).where(PromoCode.code == req.promo_code.upper(), PromoCode.is_active == True)
        )
        promo = promo_result.scalar_one_or_none()
        if promo and promo.valid_until and promo.valid_until > datetime.utcnow():
            if promo.discount_type == "PERCENTAGE":
                promo_discount_cents = int(patient_price_cents * promo.discount_value / 100)
                if promo.maximum_discount_cents:
                    promo_discount_cents = min(promo_discount_cents, promo.maximum_discount_cents)
            else:
                promo_discount_cents = int(promo.discount_value)
            promo.used_count += 1

    wallet_used = min(req.wallet_amount_cents or 0, patient_price_cents - promo_discount_cents)
    final_amount_cents = max(0, patient_price_cents - promo_discount_cents - wallet_used)

    commission_percent = test.lab_commission_percent / 100
    doctor_commission = int(b2b_cents * commission_percent * 0.3)

    # ---  CRITICAL FIX: resolve patient_id from share token / logged-in user ---
    patient_id: Optional[str] = None

    # Try to find patient by phone number (from the recommendation)
    phone_to_search = req.patient_phone or rec.patient_phone
    if phone_to_search:
        digits = re.sub(r"\D", "", phone_to_search)
        u_result = await db.execute(select(User).where(User.phone == digits))
        u = u_result.scalar_one_or_none()
        if u:
            pp_result = await db.execute(select(PatientProfile).where(PatientProfile.user_id == u.id))
            pp = pp_result.scalar_one_or_none()
            if pp:
                patient_id = pp.id

    order = Order(
        id=str(uuid.uuid4()),
        recommendation_id=rec.id,
        doctor_id=rec.doctor_id,
        patient_id=patient_id,
        test_id=test.id,
        mrp_cents=mrp_cents,
        b2b_price_cents=b2b_cents,
        patient_discount_percent=discount,
        patient_price_cents=patient_price_cents,
        promo_discount_cents=promo_discount_cents,
        wallet_used_cents=wallet_used,
        final_amount_cents=final_amount_cents,
        payment_method=req.payment_method,
        payment_status="pending",
        order_status="pending",
        promo_code_used=req.promo_code,
        doctor_commission_cents=doctor_commission,
        collection_address=req.collection_address,
    )
    db.add(order)

    if req.payment_method == "cod":
        order.payment_status = "pending"
        order.order_status = "paid"

    # Update recommendation with patient contact if provided
    if req.patient_name and not rec.patient_name:
        rec.patient_name = req.patient_name
    if req.patient_phone and not rec.patient_phone:
        rec.patient_phone = re.sub(r"\D", "", req.patient_phone)

    rec.status = "patient_viewed"
    await db.commit()

    return {
        "order_id": order.id,
        "status": "created",
        "payment_status": order.payment_status,
        "final_amount": final_amount_cents / 100,
        "message": "Order placed successfully!",
    }


@router.get("/patient/my-orders")
async def get_patient_orders(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.user_type != "patient":
        raise HTTPException(status_code=403, detail="Patient access only")

    pp_result = await db.execute(select(PatientProfile).where(PatientProfile.user_id == current_user.id))
    patient = pp_result.scalar_one_or_none()

    orders = []

    if patient:
        # Orders linked by patient_id
        ords_result = await db.execute(
            select(Order).where(Order.patient_id == patient.id).order_by(Order.created_at.desc())
        )
        orders = ords_result.scalars().all()

    # Also look up orders via phone number (even if patient_id wasn't set)
    if current_user.phone:
        phone_digits = re.sub(r"\D", "", current_user.phone)
        rec_result = await db.execute(
            select(Recommendation).where(Recommendation.patient_phone == phone_digits)
        )
        recs = rec_result.scalars().all()
        rec_ids = {r.id for r in recs}

        if rec_ids:
            extra_result = await db.execute(
                select(Order).where(Order.recommendation_id.in_(rec_ids)).order_by(Order.created_at.desc())
            )
            extra_orders = extra_result.scalars().all()
            existing_ids = {o.id for o in orders}
            for o in extra_orders:
                if o.id not in existing_ids:
                    orders.append(o)

    # Deduplicate and sort
    seen = {}
    for o in orders:
        seen[o.id] = o
    orders = sorted(seen.values(), key=lambda x: x.created_at, reverse=True)

    result_list = []
    for o in orders:
        test_r = await db.execute(select(Test).where(Test.id == o.test_id))
        test = test_r.scalar_one_or_none()
        rec_r = await db.execute(select(Recommendation).where(Recommendation.id == o.recommendation_id))
        rec = rec_r.scalar_one_or_none()
        
        # FIX: Get lab_name from Lab table via test.lab_id
        lab_name = ""
        if test and test.lab_id:
            lab_r = await db.execute(select(Lab).where(Lab.id == test.lab_id))
            lab = lab_r.scalar_one_or_none()
            lab_name = lab.name if lab else ""
        
        result_list.append({
            "order_id": o.id,
            "test_name": test.name if test else "Unknown",
            "lab_name": lab_name,
            "final_amount": o.final_amount_cents / 100,
            "patient_price": o.patient_price_cents / 100,
            "payment_status": o.payment_status,
            "order_status": o.order_status,
            "payment_method": o.payment_method,
            "created_at": o.created_at.isoformat(),
            "turnaround_days": test.turnaround_days if test else None,
            "sample_type": test.sample_type if test else "",
            "clinical_reasoning": rec.clinical_reasoning if rec else "",
        })

    return {"orders": result_list, "total": len(result_list)}


@router.get("/patient/payment-history")
async def get_payment_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.user_type != "patient":
        raise HTTPException(status_code=403, detail="Patient access only")

    wallet_r = await db.execute(select(Wallet).where(Wallet.user_id == current_user.id))
    wallet = wallet_r.scalar_one_or_none()

    txns = []
    if wallet:
        txn_r = await db.execute(
            select(WalletTransaction)
            .where(WalletTransaction.wallet_id == wallet.id)
            .order_by(WalletTransaction.created_at.desc())
        )
        for t in txn_r.scalars().all():
            txns.append({
                "id": t.id,
                "type": t.transaction_type,
                "amount": t.amount_cents / 100,
                "description": t.description,
                "created_at": t.created_at.isoformat(),
            })

    return {
        "wallet_balance": (wallet.balance_cents / 100) if wallet else 0,
        "transactions": txns,
    }


@router.get("/track/{order_id}")
async def track_order(order_id: str, db: AsyncSession = Depends(get_db)):
    o_result = await db.execute(select(Order).where(Order.id == order_id))
    order = o_result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    test_r = await db.execute(select(Test).where(Test.id == order.test_id))
    test = test_r.scalar_one_or_none()

    # FIX: Get lab_name from Lab table via test.lab_id
    lab_name = ""
    if test and test.lab_id:
        lab_r = await db.execute(select(Lab).where(Lab.id == test.lab_id))
        lab = lab_r.scalar_one_or_none()
        lab_name = lab.name if lab else ""

    steps = [
        {"step": "Order Placed", "done": True, "icon": "📋"},
        {"step": "Payment Confirmed", "done": order.payment_status == "paid", "icon": "💳"},
        {"step": "Sample Collection", "done": order.order_status in ("processing", "completed"), "icon": "🧪"},
        {"step": "Lab Processing", "done": order.order_status in ("processing", "completed"), "icon": "🔬"},
        {"step": "Report Ready", "done": order.order_status == "completed", "icon": "📄"},
    ]

    return {
        "order_id": order.id,
        "test_name": test.name if test else "Unknown",
        "lab_name": lab_name,
        "order_status": order.order_status,
        "payment_status": order.payment_status,
        "final_amount": order.final_amount_cents / 100,
        "payment_method": order.payment_method,
        "created_at": order.created_at.isoformat(),
        "turnaround_days": test.turnaround_days if test else None,
        "steps": steps,
    }


@router.post("/{order_id}/pay")
async def confirm_payment(order_id: str, db: AsyncSession = Depends(get_db)):
    o_result = await db.execute(select(Order).where(Order.id == order_id))
    order = o_result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order.payment_status = "paid"
    order.order_status = "processing"

    rec_r = await db.execute(select(Recommendation).where(Recommendation.id == order.recommendation_id))
    rec = rec_r.scalar_one_or_none()
    if rec:
        rec.status = "paid"

    cashback_cents = int(order.final_amount_cents * settings.CASHBACK_PERCENT / 100)
    if order.patient_id and cashback_cents > 0:
        pp_r = await db.execute(select(PatientProfile).where(PatientProfile.id == order.patient_id))
        pp = pp_r.scalar_one_or_none()
        if pp:
            w_r = await db.execute(select(Wallet).where(Wallet.user_id == pp.user_id))
            wallet = w_r.scalar_one_or_none()
            if wallet:
                wallet.balance_cents += cashback_cents
                txn = WalletTransaction(
                    id=str(uuid.uuid4()),
                    wallet_id=wallet.id,
                    transaction_type="cashback",
                    amount_cents=cashback_cents,
                    description=f"{settings.CASHBACK_PERCENT}% cashback on order #{order_id[:8]}",
                )
                db.add(txn)

    await db.commit()
    return {"message": "Payment confirmed", "order_id": order_id}


@router.get("/doctor/export-csv")
async def export_recommendations_csv(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.user_type != "doctor":
        raise HTTPException(status_code=403, detail="Doctor access only")

    dr_result = await db.execute(select(DoctorProfile).where(DoctorProfile.user_id == current_user.id))
    doctor = dr_result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    recs_result = await db.execute(
        select(Recommendation).where(Recommendation.doctor_id == doctor.id).order_by(Recommendation.created_at.desc())
    )
    recs = recs_result.scalars().all()

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "Date", "Patient Name", "Patient Phone", "Test Name", "Lab",
        "Category", "MRP (₹)", "Patient Price (₹)", "Discount %",
        "Status", "Commission (₹)", "Clinical Reasoning", "Share Link",
    ])
    writer.writeheader()

    for r in recs:
        test_r = await db.execute(select(Test).where(Test.id == r.test_id))
        test = test_r.scalar_one_or_none()

        order_r = await db.execute(select(Order).where(Order.recommendation_id == r.id))
        order = order_r.scalar_one_or_none()

        # FIX: Get lab_name from Lab table via test.lab_id
        lab_name = ""
        if test and test.lab_id:
            lab_r = await db.execute(select(Lab).where(Lab.id == test.lab_id))
            lab = lab_r.scalar_one_or_none()
            lab_name = lab.name if lab else ""

        writer.writerow({
            "Date": r.created_at.strftime("%Y-%m-%d %H:%M"),
            "Patient Name": r.patient_name or "Anonymous",
            "Patient Phone": r.patient_phone or "",
            "Test Name": test.name if test else "Unknown",
            "Lab": lab_name,
            "Category": test.category if test else "",
            "MRP (₹)": round(test.mrp_cents / 100, 2) if test else 0,
            "Patient Price (₹)": round(test.b2b_price_cents / 100 * (1 - (test.patient_discount_percent or 0) / 100), 2) if test else 0,
            "Discount %": test.patient_discount_percent if test else 0,
            "Status": r.status,
            "Commission (₹)": round(order.doctor_commission_cents / 100, 2) if order else 0,
            "Clinical Reasoning": (r.clinical_reasoning or "")[:200],
            "Share Link": r.share_link or "",
        })

    from fastapi.responses import Response
    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=testzoo_recommendations_{datetime.utcnow().strftime('%Y%m%d')}.csv"},
    )
