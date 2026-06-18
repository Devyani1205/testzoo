"""SMTP email service for TestZoo (welcome + password reset)."""
import smtplib
import asyncio
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.config import settings


def _send_email_sync(to_email: str, subject: str, html_body: str, text_body: str = ""):
    """Blocking SMTP send — run in executor for async contexts."""
    if not settings.SMTP_HOST:
        print(f"[MOCK EMAIL] To: {to_email} | Subject: {subject}")
        print(f"  Body preview: {text_body[:120]}")
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"TestZoo <{settings.SMTP_FROM}>"
    msg["To"] = to_email

    if text_body:
        msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            if settings.SMTP_TLS:
                server.starttls()
            if settings.SMTP_USER and settings.SMTP_PASS:
                server.login(settings.SMTP_USER, settings.SMTP_PASS)
            server.sendmail(settings.SMTP_FROM, to_email, msg.as_string())
    except Exception as e:
        print(f"[EMAIL ERROR] Failed to send to {to_email}: {e}")


async def send_welcome_email(to_email: str, full_name: str):
    first = full_name.split()[0]
    subject = "Welcome to TestZoo 🔬"
    html = f"""
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:32px 16px">
      <div style="background:linear-gradient(135deg,#1e40af,#0891b2);border-radius:16px;padding:32px;text-align:center;margin-bottom:24px">
        <h1 style="color:white;margin:0;font-size:28px">🔬 TestZoo</h1>
        <p style="color:#bfdbfe;margin:8px 0 0">Diagnostic Test Marketplace</p>
      </div>
      <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <h2 style="color:#1e293b;margin:0 0 16px">Welcome, {first}! 👋</h2>
        <p style="color:#475569;line-height:1.6">Your TestZoo account is ready. Here's what you can do:</p>
        <ul style="color:#475569;line-height:2">
          <li>🤖 AI-powered diagnostic test search</li>
          <li>📱 Share tests to patients via WhatsApp</li>
          <li>💰 Earn commission on every conversion</li>
          <li>📊 Track analytics in your dashboard</li>
        </ul>
        <a href="{settings.FRONTEND_URL}/auth/login" style="display:inline-block;margin-top:16px;padding:12px 32px;background:#1e40af;color:white;border-radius:12px;text-decoration:none;font-weight:600">
          Get Started →
        </a>
      </div>
      <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:16px">
        © 2025 TestZoo · AI-powered diagnostic marketplace
      </p>
    </div>
    """
    text = f"Welcome to TestZoo, {first}! Log in at {settings.FRONTEND_URL}/auth/login"
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _send_email_sync, to_email, subject, html, text)


async def send_password_reset_email(to_email: str, full_name: str, reset_token: str):
    first = full_name.split()[0]
    reset_link = f"{settings.FRONTEND_URL}/auth/reset-password?token={reset_token}"
    subject = "TestZoo — Reset your password"
    html = f"""
    <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;background:#f8fafc;padding:32px 16px">
      <div style="background:linear-gradient(135deg,#1e40af,#0891b2);border-radius:16px;padding:32px;text-align:center;margin-bottom:24px">
        <h1 style="color:white;margin:0;font-size:28px">🔬 TestZoo</h1>
      </div>
      <div style="background:white;border-radius:16px;padding:32px;box-shadow:0 1px 3px rgba(0,0,0,0.1)">
        <h2 style="color:#1e293b;margin:0 0 16px">Reset your password</h2>
        <p style="color:#475569;line-height:1.6">Hi {first}, we received a request to reset your password.</p>
        <p style="color:#475569;line-height:1.6">Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
        <a href="{reset_link}" style="display:inline-block;margin-top:16px;padding:12px 32px;background:#dc2626;color:white;border-radius:12px;text-decoration:none;font-weight:600">
          Reset Password →
        </a>
        <p style="color:#94a3b8;font-size:12px;margin-top:24px">
          If you didn't request this, ignore this email. Your password won't change.
        </p>
        <p style="color:#94a3b8;font-size:11px;word-break:break-all">
          Link: {reset_link}
        </p>
      </div>
    </div>
    """
    text = f"Hi {first},\n\nReset your TestZoo password: {reset_link}\n\nExpires in 1 hour."
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _send_email_sync, to_email, subject, html, text)
