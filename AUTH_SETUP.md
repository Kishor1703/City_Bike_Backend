# Authentication setup

The `/api/auth` endpoints use the existing MongoDB connection and require these environment variables:

- `AUTH_CODE_SECRET`: a long random secret used to hash registration codes.
- `RESEND_API_KEY` and `AUTH_FROM_EMAIL`: Resend credentials and a verified sender for email codes.
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_FROM_NUMBER`: Twilio credentials and sender for SMS codes.

Copy `.env.example` to `.env` for local development and set the values. Configure the same variables in the deployment environment. Registration asks for an international-format phone number (for example, `+919876543210`). Email and SMS codes expire after 10 minutes; verification is limited to five attempts. Passwords are stored as salted scrypt hashes.

Registration endpoints:

- `POST /api/auth/register/start` with `{ "name", "email", "mobile", "password" }` sends both codes.
- `POST /api/auth/register/verify` with `{ "email", "emailCode", "mobileCode" }` creates the verified account.
- `POST /api/auth/login` with `{ "email", "password" }` checks credentials.
