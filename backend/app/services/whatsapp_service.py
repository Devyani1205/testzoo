"""WhatsApp messaging via Twilio sandbox."""
from app.config import settings
import httpx


async def send_whatsapp_recommendation(
    patient_phone: str,
    doctor_name: str,
    test_name: str,
    patient_price: float,
    share_link: str,
) -> dict:
    if not (settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN):
        print(f"[MOCK WhatsApp] → {patient_phone}: {test_name} @ ₹{patient_price} | {share_link}")
        return {"sid": "mock_sid", "status": "queued"}

    try:
        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        body = (
            f"🔬 *TestZoo Diagnostic Recommendation*\n\n"
            f"Dr. {doctor_name} has recommended a test for you:\n"
            f"*{test_name}*\n\n"
            f"💰 Your price: ₹{patient_price:.0f} (discounted)\n\n"
            f"🔗 Click to view & pay:\n{share_link}\n\n"
            f"_This link expires in 7 days. Pay securely online._"
        )
        to_number = patient_phone if patient_phone.startswith("whatsapp:") else f"whatsapp:{patient_phone}"
        message = client.messages.create(
            body=body,
            from_=settings.TWILIO_WHATSAPP_NUMBER,
            to=to_number,
        )
        return {"sid": message.sid, "status": message.status}
    except Exception as e:
        print(f"WhatsApp send failed: {e}")
        return {"sid": None, "status": "failed", "error": str(e)}


async def send_order_status_update(patient_phone: str, test_name: str, status: str) -> dict:
    status_messages = {
        "paid": "✅ Payment confirmed! Your sample collection will be scheduled shortly.",
        "sample_collected": "🧪 Sample collected! Your test is being processed.",
        "processing": "⚗️ Lab is processing your sample. Results expected soon.",
        "report_ready": "📋 Your test report is ready! Log in to view and download.",
        "completed": "🎉 Your order is complete. Thank you for choosing TestZoo!",
    }
    msg = status_messages.get(status, f"Your order status has been updated to: {status}")
    body = f"🔬 *TestZoo Update* - {test_name}\n\n{msg}"

    if not (settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN):
        print(f"[MOCK WhatsApp] Status update → {patient_phone}: {body}")
        return {"sid": "mock_sid", "status": "queued"}

    try:
        from twilio.rest import Client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        to_number = patient_phone if patient_phone.startswith("whatsapp:") else f"whatsapp:{patient_phone}"
        message = client.messages.create(body=body, from_=settings.TWILIO_WHATSAPP_NUMBER, to=to_number)
        return {"sid": message.sid, "status": message.status}
    except Exception as e:
        return {"sid": None, "status": "failed", "error": str(e)}
