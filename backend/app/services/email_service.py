"""Email notification and verification service supporting institutional SMTP and Supabase Auth."""
import os
import smtplib
import json
import urllib.request
import urllib.error
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from flask import current_app


class EmailService:
    @staticmethod
    def send_verification_email(to_email: str, token: str, full_name: str = "") -> bool:
        """
        Dispatches account activation / email verification instructions.
        Integrates with configured institutional SMTP and Supabase endpoints.
        """
        frontend_url = os.getenv("FRONTEND_URL") or (f"https://{os.getenv('VERCEL_URL')}" if os.getenv("VERCEL_URL") else "http://localhost:5173")
        verification_link = f"{frontend_url}/verify-email?token={token}"

        subject = "Verify Your SmartAttend Account"
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; }}
            .container {{ max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }}
            .brand {{ font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 24px; display: flex; align-items: center; gap: 8px; }}
            .brand-accent {{ color: #4f46e5; }}
            .title {{ font-size: 18px; font-weight: 700; color: #1e293b; margin-bottom: 12px; }}
            .text {{ font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 24px; }}
            .btn {{ display: inline-block; background-color: #4f46e5; color: #ffffff !important; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 10px; }}
            .footer {{ font-size: 12px; color: #94a3b8; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }}
            .link-text {{ word-break: break-all; color: #64748b; font-size: 11px; margin-top: 16px; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="brand">Smart<span class="brand-accent">Attend</span></div>
            <div class="title">Confirm Your Email Address</div>
            <div class="text">
              Hello {full_name or 'there'},<br><br>
              Thank you for registering on the SmartAttend academic portal. Please confirm your institutional email address to activate your account and access your attendance records.
            </div>
            <a href="{verification_link}" class="btn" target="_blank">Verify Email Address</a>
            <div class="link-text">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="{verification_link}">{verification_link}</a>
            </div>
            <div class="footer">
              This verification link will expire in 24 hours. If you did not create an account, please disregard this email.
            </div>
          </div>
        </body>
        </html>
        """

        # Also trigger Supabase Auth registration if configured
        EmailService.trigger_supabase_auth_signup(to_email, full_name)

        return EmailService._dispatch_smtp_email(to_email, subject, html_body)

    @staticmethod
    def send_password_reset_email(to_email: str, token: str, full_name: str = "") -> bool:
        """Dispatches password reset instructions via SMTP."""
        frontend_url = os.getenv("FRONTEND_URL") or (f"https://{os.getenv('VERCEL_URL')}" if os.getenv("VERCEL_URL") else "http://localhost:5173")
        reset_link = f"{frontend_url}/login?reset_token={token}"

        subject = "Reset Your SmartAttend Password"
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; }}
            .container {{ max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; padding: 32px; }}
            .brand {{ font-size: 20px; font-weight: 800; color: #0f172a; margin-bottom: 24px; }}
            .brand-accent {{ color: #4f46e5; }}
            .btn {{ display: inline-block; background-color: #4f46e5; color: #ffffff !important; font-size: 14px; font-weight: 600; text-decoration: none; padding: 12px 28px; border-radius: 10px; }}
          </style>
        </head>
        <body>
          <div class="container">
            <div class="brand">Smart<span class="brand-accent">Attend</span></div>
            <p>Hello {full_name or 'there'},</p>
            <p>We received a request to reset your password. Click the link below to set a new password:</p>
            <p><a href="{reset_link}" class="btn" target="_blank">Reset Password</a></p>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 24px;">This link is valid for 1 hour. If you did not request a password reset, you can safely ignore this message.</p>
          </div>
        </body>
        </html>
        """
        return EmailService._dispatch_smtp_email(to_email, subject, html_body)

    @staticmethod
    def trigger_supabase_auth_signup(email: str, full_name: str = ""):
        """
        If Supabase credentials are provided, synchronizes user with Supabase Auth
        to trigger Supabase's native SMTP verification email service.
        """
        supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ANON_KEY")

        if not supabase_url or not supabase_key:
            return False

        try:
            req_url = f"{supabase_url}/auth/v1/signup"
            payload = json.dumps({
                "email": email,
                "password": os.urandom(16).hex(),  # Supabase internal auth password
                "data": {"full_name": full_name}
            }).encode("utf-8")

            req = urllib.request.Request(
                req_url,
                data=payload,
                headers={
                    "Content-Type": "application/json",
                    "apikey": supabase_key,
                    "Authorization": f"Bearer {supabase_key}",
                },
                method="POST"
            )
            with urllib.request.urlopen(req, timeout=5) as response:
                print(f"[Supabase Auth] Verification dispatched via Supabase SMTP for {email}")
                return True
        except Exception as e:
            print(f"[Supabase Auth] Notice: Supabase Auth sync skipped ({e})")
            return False

    @staticmethod
    def _dispatch_smtp_email(to_email: str, subject: str, html_body: str) -> bool:
        """Underlying helper to send MIME email using configured SMTP parameters."""
        mail_server = os.getenv("MAIL_SERVER", "smtp.gmail.com")
        mail_port = int(os.getenv("MAIL_PORT", 587))
        mail_username = os.getenv("MAIL_USERNAME", "")
        mail_password = os.getenv("MAIL_PASSWORD", "")
        mail_sender = os.getenv("MAIL_DEFAULT_SENDER", "SmartAttend <noreply@mitaoe.ac.in>")
        mail_use_tls = os.getenv("MAIL_USE_TLS", "True").lower() in ("true", "1", "yes")

        # If SMTP credentials not provided (development mode), log the verification link clearly
        if not mail_username or not mail_password:
            print(f"\n[EmailService Notice] SMTP credentials not set in .env. Email dispatch simulated:")
            print(f"  To: {to_email}")
            print(f"  Subject: {subject}")
            print(f"  (In production with Supabase / SMTP credentials, this is dispatched automatically)\n")
            return True

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = mail_sender
            msg["To"] = to_email

            part = MIMEText(html_body, "html")
            msg.attach(part)

            if mail_port == 465:
                server = smtplib.SMTP_SSL(mail_server, mail_port, timeout=10)
            else:
                server = smtplib.SMTP(mail_server, mail_port, timeout=10)
                if mail_use_tls:
                    server.starttls()

            server.login(mail_username, mail_password)
            server.sendmail(mail_sender, [to_email], msg.as_string())
            server.quit()
            print(f"[EmailService] Verification email dispatched successfully to {to_email}")
            return True
        except Exception as e:
            print(f"[EmailService Error] Failed to send email via SMTP ({mail_server}:{mail_port}): {e}")
            return False
