# Booking email notifications with Gmail

Firebase Authentication continues to handle app sign-in and email
verification. Booking notifications are sent through Gmail SMTP using
Nodemailer; Resend is not used.

## Gmail setup

1. Turn on 2-Step Verification for the Gmail account that will send the ride
   notifications.
2. Create an app password from the Google Account's App passwords page. Google
   requires 2-Step Verification for app passwords. Use that generated password
   here, not the account's regular password. [Google's instructions](https://support.google.com/accounts/answer/185833)
3. Add these variables to the Vercel project that deploys the backend:

   - `SMTP_HOST=smtp.gmail.com`
   - `SMTP_PORT=465`
   - `SMTP_USER=your-sending-gmail-address`
   - `SMTP_APP_PASSWORD=your-generated-app-password`
   - `SMTP_FROM_EMAIL=your-sending-gmail-address` 

Use the same Gmail address for `SMTP_USER` and `SMTP_FROM_EMAIL`. Keep the app
password in Vercel's environment variables and do not commit it to the repo.

The booking is saved even if email delivery is not configured or fails. The API
response includes `emailSent` and `emailNotice`, and the app tells the passenger
whether the rider notification was sent.
