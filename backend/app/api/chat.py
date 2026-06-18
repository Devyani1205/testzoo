from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from app.database import get_db
from app.models import User, DoctorProfile, Test, Lab, ChatHistory, Recommendation
from app.api.auth import get_current_user
from app.services.llm_service import extract_clinical_intent, generate_recommendation_reasoning
from app.config import settings
import uuid, secrets
from datetime import datetime, timedelta
import json

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class TestCard(BaseModel):
    test_id: str
    name: str
    lab_name: str
    category: str
    mrp: float
    b2b_price: float
    patient_price: float
    discount_percent: float
    savings: float
    turnaround_days: int
    sample_type: str
    home_collection: bool
    biomarkers: list
    is_sponsored: bool
    description: str
    share_actions: list


@router.post("/query")
async def chat_query(
    req: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.user_type != "doctor":
        raise HTTPException(status_code=403, detail="Doctor access only")

    dr_result = await db.execute(select(DoctorProfile).where(DoctorProfile.user_id == current_user.id))
    doctor = dr_result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    intent = await extract_clinical_intent(req.message)
    query_text = intent.get("query", req.message).lower()
    cancer_type = intent.get("cancer_type", "").lower()
    biomarkers = intent.get("biomarkers", [])

    all_tests = await db.execute(select(Test).where(Test.is_active == True))
    tests = all_tests.scalars().all()

    scored = []
    for t in tests:
        score = 0
        t_name = t.name.lower()
        t_desc = (t.description or "").lower()
        t_keywords = [k.lower() for k in (t.sponsored_keywords or [])]

        if any(bm.lower() in t_name or bm.lower() in t_desc for bm in biomarkers):
            score += 40
        if cancer_type and (cancer_type in t_name or cancer_type in t_desc):
            score += 30
        if any(word in t_name or word in t_desc for word in query_text.split()):
            score += 10
        if t.is_sponsored and any(kw in query_text for kw in t_keywords):
            score += 50
        if t.is_sponsored:
            score += 20

        if score > 0 or len(scored) < 5:
            scored.append((score, t))

    scored.sort(key=lambda x: -x[0])
    top_tests = [t for _, t in scored[:8]]

    if not top_tests:
        top_tests = [t for _, t in sorted([(0, t) for t in tests[:6]], key=lambda x: -x[0])]

    cards = []
    for t in top_tests:
        lab_result = await db.execute(select(Lab).where(Lab.id == t.lab_id))
        lab = lab_result.scalar_one_or_none()
        lab_name = lab.name if lab else "Unknown Lab"

        b2b = t.b2b_price_cents / 100
        mrp = t.mrp_cents / 100
        discount = t.patient_discount_percent
        patient_price = round(b2b * (1 - discount / 100), 2)
        savings = round(mrp - patient_price, 2)

        cards.append({
            "test_id": t.id,
            "name": t.name,
            "lab_name": lab_name,
            "category": t.category or "Diagnostics",
            "mrp": mrp,
            "b2b_price": b2b,
            "patient_price": patient_price,
            "discount_percent": discount,
            "savings": savings,
            "turnaround_days": t.turnaround_days,
            "sample_type": t.sample_type or "Blood",
            "home_collection": t.home_collection,
            "biomarkers": t.biomarkers or [],
            "is_sponsored": t.is_sponsored,
            "description": (t.description or "")[:200],
            "actions": ["view_details", "share_whatsapp", "add_to_recommendation"],
        })

    session_id = req.session_id or str(uuid.uuid4())
    chat_entry = ChatHistory(
        id=str(uuid.uuid4()),
        doctor_id=doctor.id,
        session_id=session_id,
        user_message=req.message,
        assistant_response={"cards": cards, "intent": intent},
        pipeline_state=intent,
    )
    db.add(chat_entry)
    await db.commit()

    return {
        "session_id": session_id,
        "intent": intent,
        "clinical_summary": intent.get("clinical_summary", ""),
        "component": "RecommendationGrid",
        "total_results": len(cards),
        "sponsored_count": sum(1 for c in cards if c["is_sponsored"]),
        "cards": cards,
    }


@router.post("/share")
async def share_test(
    test_id: str,
    patient_phone: str,
    patient_name: Optional[str] = None,
    case_description: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if current_user.user_type != "doctor":
        raise HTTPException(status_code=403, detail="Doctor access only")

    dr_result = await db.execute(select(DoctorProfile).where(DoctorProfile.user_id == current_user.id))
    doctor = dr_result.scalar_one_or_none()

    test_result = await db.execute(select(Test).where(Test.id == test_id))
    test = test_result.scalar_one_or_none()
    if not test:
        raise HTTPException(status_code=404, detail="Test not found")

    share_token = secrets.token_urlsafe(24)
    share_link = f"{settings.FRONTEND_URL}/patient/checkout/{share_token}"
    expires_at = datetime.utcnow() + timedelta(days=7)

    reasoning = await generate_recommendation_reasoning(test.name, case_description or "Clinical evaluation")

    rec = Recommendation(
        id=str(uuid.uuid4()),
        doctor_id=doctor.id,
        test_id=test.id,
        patient_name=patient_name,
        patient_phone=patient_phone,
        case_description=case_description or "",
        clinical_reasoning=reasoning,
        status="sent",
        share_link=share_link,
        share_token=share_token,
        expires_at=expires_at,
        whatsapp_status="pending",
    )
    db.add(rec)

    doctor.total_recommendations = (doctor.total_recommendations or 0) + 1
    await db.commit()

    b2b = test.b2b_price_cents / 100
    patient_price = round(b2b * (1 - test.patient_discount_percent / 100), 2)

    from app.services.whatsapp_service import send_whatsapp_recommendation
    wa_result = await send_whatsapp_recommendation(
        patient_phone=patient_phone,
        doctor_name=current_user.full_name,
        test_name=test.name,
        patient_price=patient_price,
        share_link=share_link,
    )

    rec.whatsapp_status = wa_result.get("status", "sent")
    await db.commit()

    return {
        "component": "ShareConfirmationCard",
        "recommendation_id": rec.id,
        "share_link": share_link,
        "share_token": share_token,
        "expires_at": expires_at.isoformat(),
        "whatsapp_status": wa_result.get("status"),
        "test_name": test.name,
        "patient_phone": patient_phone,
        "patient_price": patient_price,
    }


@router.get("/history")
async def get_chat_history(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    dr_result = await db.execute(select(DoctorProfile).where(DoctorProfile.user_id == current_user.id))
    doctor = dr_result.scalar_one_or_none()
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor profile not found")

    result = await db.execute(
        select(ChatHistory)
        .where(ChatHistory.doctor_id == doctor.id)
        .order_by(ChatHistory.created_at.desc())
        .limit(50)
    )
    histories = result.scalars().all()
    return [{"id": h.id, "session_id": h.session_id, "message": h.user_message, "created_at": h.created_at} for h in histories]
