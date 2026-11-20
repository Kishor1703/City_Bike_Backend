# Authentication setup

The `/api/auth` endpoints use the existing MongoDB connection and require these environment variables:

- `AUTH_CODE_SECRET`: a long random secret used to hash registration codes.
- `RESEND_API_KEY` and `AUTH_FROM_EMAIL`: Resend credentials and a verified sender for email codes.

Set these values in `.env` for local development and in the deployment environment. Registration collects a mobile number in international format (for example, `+919876543210`) but does not verify it. Email codes expire after 10 minutes; verification is limited to five attempts. Passwords are stored as salted scrypt hashes.

Registration endpoints:

- `POST /api/auth/register/start` with `{ "name", "email", "mobile", "password" }` sends an email code.
- `POST /api/auth/register/verify` with `{ "email", "emailCode" }` creates the email-verified account.
- `POST /api/auth/login` with `{ "email", "password" }` checks credentials.
