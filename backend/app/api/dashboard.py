from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from app.database import get_db
from app.models import User, DoctorProfile, Recommendation, Order, Test
from app.api.auth import get_current_user
import csv, io

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/doctor/stats")
async def get_doctor_stats(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.user_type != "doctor":
        raise HTTPException(status_code=403, detail="Doctor access only")

    dr_result = await db.execute(select(DoctorProfile).where(DoctorProfile.user_id == current_user.id))
    doctor = dr_result.scalar_one_or_none()

    recs_result = await db.execute(
        select(Recommendation).where(Recommendation.doctor_id == doctor.id).order_by(Recommendation.created_at.desc())
    )
    recs = recs_result.scalars().all()

    total_recs = len(recs)
    paid_recs = [r for r in recs if r.status == "paid"]
    conversion_rate = (len(paid_recs) / total_recs * 100) if total_recs > 0 else 0

    orders_result = await db.execute(
        select(Order).where(Order.doctor_id == doctor.id, Order.payment_status == "paid")
    )
    paid_orders = orders_result.scalars().all()
    total_commission = sum(o.doctor_commission_cents for o in paid_orders) / 100
    total_revenue = sum(o.final_amount_cents for o in paid_orders) / 100

    status_counts = {}
    for r in recs:
        status_counts[r.status] = status_counts.get(r.status, 0) + 1

    rec_details = []
    for r in recs[:50]:
        test_result = await db.execute(select(Test).where(Test.id == r.test_id))
        test = test_result.scalar_one_or_none()
        rec_details.append({
            "id": r.id,
            "test_name": test.name if test else "Unknown",
            "patient_name": r.patient_name or "Anonymous",
            "patient_phone": r.patient_phone,
            "status": r.status,
            "share_link": r.share_link,
            "created_at": r.created_at.isoformat(),
            "clinical_reasoning": (r.clinical_reasoning or "")[:100],
        })

    monthly_data = {}
    for r in recs:
        key = r.created_at.strftime("%Y-%m")
        if key not in monthly_data:
            monthly_data[key] = {"month": key, "recommendations": 0, "conversions": 0}
        monthly_data[key]["recommendations"] += 1
        if r.status == "paid":
            monthly_data[key]["conversions"] += 1

    top_tests = {}
    for r in recs:
        top_tests[r.test_id] = top_tests.get(r.test_id, 0) + 1

    top_test_details = []
    for test_id, count in sorted(top_tests.items(), key=lambda x: -x[1])[:5]:
        test_result = await db.execute(select(Test).where(Test.id == test_id))
        test = test_result.scalar_one_or_none()
        if test:
            top_test_details.append({"test_name": test.name, "count": count, "category": test.category})

    return {
        "kpis": {
            "total_recommendations": total_recs,
            "paid_conversions": len(paid_recs),
            "conversion_rate": round(conversion_rate, 1),
            "total_commission_earned": total_commission,
            "total_revenue_generated": total_revenue,
        },
        "status_breakdown": status_counts,
        "monthly_trend": list(monthly_data.values())[-6:],
        "top_tests": top_test_details,
        "recent_recommendations": rec_details,
    }


@router.post("/doctor/remind/{recommendation_id}")
async def remind_patient(
    recommendation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.user_type != "doctor":
        raise HTTPException(status_code=403, detail="Doctor access only")

    result = await db.execute(select(Recommendation).where(Recommendation.id == recommendation_id))
    rec = result.scalar_one_or_none()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    test_result = await db.execute(select(Test).where(Test.id == rec.test_id))
    test = test_result.scalar_one_or_none()

    b2b = test.b2b_price_cents / 100
    patient_price = round(b2b * (1 - test.patient_discount_percent / 100), 2)

    from app.services.whatsapp_service import send_whatsapp_recommendation
    wa_result = await send_whatsapp_recommendation(
        patient_phone=rec.patient_phone,
        doctor_name=current_user.full_name,
        test_name=test.name,
        patient_price=patient_price,
        share_link=rec.share_link,
    )

    return {"status": "reminder_sent", "whatsapp_status": wa_result.get("status")}


@router.get("/doctor/export-csv")
async def export_recommendations_csv(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.user_type != "doctor":
        raise HTTPException(status_code=403, detail="Doctor access only")

    dr_result = await db.execute(select(DoctorProfile).where(DoctorProfile.user_id == current_user.id))
    doctor = dr_result.scalar_one_or_none()

    recs_result = await db.execute(
        select(Recommendation).where(Recommendation.doctor_id == doctor.id)
    )
    recs = recs_result.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Patient", "Phone", "Status", "Share Link", "Clinical Notes"])
    for r in recs:
        writer.writerow([
            r.created_at.strftime("%Y-%m-%d"),
            r.patient_name or "Anonymous",
            r.patient_phone or "",
            r.status,
            r.share_link or "",
            (r.clinical_reasoning or "")[:100],
        ])

    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=recommendations.csv"},
    )
