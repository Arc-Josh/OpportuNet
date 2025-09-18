import aiosmtplib
import asyncio
from email.message import EmailMessage

MT_HOST = "sandbox.smtp.mailtrap.io"
MT_PORT = "2525"
MT_USERNAME = "920563a36ad963"
MT_PASSWORD = "fec1a1375d0d56"

SENDER_EMAIL = "test-opportunet@mail.com"

API_KEY = "58bf9b7803dc409b2865caf187be0133"

async def send_test_email(recipient):
    message = EmailMessage()
    message["From"]=SENDER_EMAIL
    message["To"]=recipient
    message["Subject"]="Email notifications test"
    message.set_content("This is an email notifcations test message")

    try:
        await aiosmtplib.send(
            message,
            hostname=MT_HOST,
            port=MT_PORT,
            username=MT_USERNAME,
            password=MT_PASSWORD,
            start_tls=True
        )
        print(f"EMAIL TEST SUCCESSFUL TO {recipient}")
    except Exception as e:
        print(f"EMAIL TEST UNSUCCESSFUL: {e}")

