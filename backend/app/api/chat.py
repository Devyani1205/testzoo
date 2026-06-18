from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
import requests
from app.database import get_db
from app.models import Recommendation, Test, DoctorProfile, ChatHistory
from app.api.auth import get_current_user
from app.config import settings
from datetime import datetime, timedelta
import uuid

router = APIRouter(prefix="/chat", tags=["chat"])


class ShareViaWhatsAppRequest(BaseModel):
    test_id: str
    patient_phone: str
    patient_name: str
    case_description: str


@router.post("/share")
async def share_via_whatsapp(
    test_id: str = Query(...),
    patient_phone: str = Query(...),
    patient_name: str = Query(...),
    case_description: str = Query(...),
    current_user = Depends(None),  # Optional authentication
    db: AsyncSession = Depends(get_db),
):
    """
    Share test recommendation via WhatsApp
    FIX: Only update recommendation status to 'sent' AFTER successful WhatsApp delivery
    """
    
    try:
        # Get test details
        test_r = await db.execute(select(Test).where(Test.id == test_id))
        test = test_r.scalar_one_or_none()
        if not test:
            raise HTTPException(status_code=404, detail="Test not found")
        
        # Get doctor profile if authenticated
        doctor_id = None
        if current_user and hasattr(current_user, 'id'):
            dr_result = await db.execute(
                select(DoctorProfile).where(DoctorProfile.user_id == current_user.id)
            )
            doctor = dr_result.scalar_one_or_none()
            if doctor:
                doctor_id = doctor.id
        
        # Normalize phone number
        import re
        phone_digits = re.sub(r"\D", "", patient_phone)
        if len(phone_digits) == 10:
            phone_digits = f"+91{phone_digits}"
        elif not phone_digits.startswith("+"):
            phone_digits = f"+{phone_digits}"
        
        # Create share token
        share_token = str(uuid.uuid4())
        share_link = f"{settings.FRONTEND_URL}/checkout/{share_token}"
        
        # Create recommendation record FIRST with status 'recommended'
        recommendation = Recommendation(
            id=str(uuid.uuid4()),
            doctor_id=doctor_id,
            test_id=test_id,
            patient_name=patient_name,
            patient_phone=phone_digits,
            case_description=case_description,
            clinical_reasoning=case_description,
            status="recommended",  # Start as recommended
            share_token=share_token,
            share_link=share_link,
            whatsapp_status="pending",
            expires_at=datetime.utcnow() + timedelta(days=7),
        )
        db.add(recommendation)
        await db.commit()
        
        # NOW try to send WhatsApp message
        whatsapp_sent = False
        whatsapp_error = None
        
        try:
            # Use Twilio or your WhatsApp provider
            whatsapp_response = send_whatsapp_message(
                phone_number=phone_digits,
                patient_name=patient_name,
                test_name=test.name,
                share_link=share_link,
            )
            
            if whatsapp_response.status_code == 200:
                whatsapp_sent = True
                recommendation.whatsapp_status = "sent"
                recommendation.status = "sent"  # Only update to 'sent' if WhatsApp succeeds
            else:
                whatsapp_error = f"WhatsApp API returned {whatsapp_response.status_code}"
                recommendation.whatsapp_status = "failed"
        except Exception as e:
            whatsapp_error = str(e)
            recommendation.whatsapp_status = "failed"
        
        await db.commit()
        
        return {
            "recommendation_id": recommendation.id,
            "share_token": share_token,
            "share_link": share_link,
            "whatsapp_sent": whatsapp_sent,
            "whatsapp_status": recommendation.whatsapp_status,
            "status": recommendation.status,
            "error": whatsapp_error,
            "message": "Recommendation created. WhatsApp delivery status shown above."
        }
    
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating recommendation: {str(e)}")


def send_whatsapp_message(phone_number: str, patient_name: str, test_name: str, share_link: str):
    """
    Send WhatsApp message via provider (Twilio, Vonage, etc.)
    Update this based on your WhatsApp provider
    """
    try:
        # Example: Using Twilio WhatsApp
        import requests
        
        message_body = f"""
Hi {patient_name},

Your doctor has recommended the {test_name} test.

Click here to view details and book: {share_link}

Best regards,
TestZoo Team
        """.strip()
        
        # Replace with your actual WhatsApp API endpoint
        response = requests.post(
            f"{settings.WHATSAPP_API_URL}/messages",
            json={
                "to": phone_number,
                "body": message_body,
                "from": settings.WHATSAPP_PHONE_NUMBER,
            },
            headers={"Authorization": f"Bearer {settings.WHATSAPP_API_TOKEN}"},
            timeout=10,
        )
        
        return response
    
    except Exception as e:
        print(f"WhatsApp send error: {e}")
        raise
