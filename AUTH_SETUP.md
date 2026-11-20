# Firebase Authentication setup

## Firebase project

1. In Firebase Console, create or select the project and enable **Authentication → Sign-in method → Email/Password**.
2. Install the Firebase CLI if needed (`npm install -g firebase-tools`), then sign in with `firebase login`.
3. From `frontend`, install the FlutterFire CLI if needed with `dart pub global activate flutterfire_cli`, then run `flutterfire configure`.
4. Select the project and the platforms used by the app. The command generates `frontend/lib/firebase_options.dart`; it replaces the placeholder in this repository.
5. Email verification is sent by Firebase Authentication. Resend credentials are no longer used.

The current `frontend/lib/firebase_options.dart` is configured for Android from the matching `google-services.json` in `frontend/android/app`. Run `flutterfire configure` later if you add web, iOS, or other targets.

The app collects a mobile number during registration but does not verify it. Firebase phone authentication can be added later when SMS verification is ready.

## Backend credentials

The backend verifies Firebase ID tokens with the Firebase Admin SDK. Set these variables in local `backend/.env` and in the backend deployment environment:

- `FIREBASE_PROJECT_ID`: the same Firebase project ID selected by FlutterFire.
- `FIREBASE_SERVICE_ACCOUNT_JSON`: the full JSON contents of a service account key for that project.
- `MONGODB_URI`: the existing MongoDB connection string.

The Firebase Admin SDK requires Node.js 22 or later.

Create/download the service account key from Firebase Console → Project settings → Service accounts. Keep the private key secret; do not commit it. The server uses the credential only to verify Firebase ID tokens.

The app calls `POST /api/auth/profile` after registration to save the name and mobile number, and `GET /api/auth/profile` after verified login to load the user's profile. Both endpoints require an `Authorization: Bearer <Firebase ID token>` header.
