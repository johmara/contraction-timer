# Firebase Setup Guide for Contraction Timer

This guide will walk you through setting up Firebase Authentication (with GitHub OAuth) and Firestore for your Contraction Timer app.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name (e.g., "contraction-timer")
4. Disable Google Analytics (optional)
5. Click "Create project"

## Step 2: Register Your Web App

1. In your Firebase project, click the **Web** icon (`</>`)
2. Register app with nickname (e.g., "Contraction Timer Web")
3. Do NOT check "Set up Firebase Hosting" (we're using GitHub Pages)
4. Click "Register app"
5. Copy the Firebase configuration object - you'll need these values

## Step 3: Configure Firebase in Your App

Open `src/environments/environment.ts` and `src/environments/environment.prod.ts` and replace the placeholder values with your Firebase config:

```typescript
export const environment = {
  production: false, // true in environment.prod.ts
  firebase: {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "your-project-id.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project-id.appspot.com",
    messagingSenderId: "1234567890",
    appId: "1:1234567890:web:abcdef1234567890"
  }
};
```

## Step 4: Enable Firestore Database

1. In Firebase Console, go to **Build** → **Firestore Database**
2. Click "Create database"
3. Select "Start in test mode" (we'll add security rules later)
4. Choose your location (e.g., `us-central1`)
5. Click "Enable"

### Set up Firestore Security Rules

Go to the "Rules" tab and replace with these production-ready rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Allow users to read and write their own sessions
      match /sessions/{sessionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

Click "Publish" to save the rules.

## Step 5: Create a GitHub OAuth App

### A. Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click "OAuth Apps" → "New OAuth App"
3. Fill in the details:
   - **Application name**: Contraction Timer
   - **Homepage URL**: `https://YOUR-USERNAME.github.io/contraction-timer/`
   - **Authorization callback URL**: (Get this from Firebase - see step B)
4. Click "Register application"
5. Note your **Client ID**
6. Click "Generate a new client secret" and note the **Client Secret**

### B. Get Firebase Auth Domain

1. In Firebase Console, go to **Build** → **Authentication**
2. Click "Get Started"
3. In the "Sign-in method" tab, you'll see your auth domain: 
   `your-project-id.firebaseapp.com`

### C. Update GitHub OAuth App Callback URL

Go back to your GitHub OAuth App settings and set:
- **Authorization callback URL**: `https://your-project-id.firebaseapp.com/__/auth/handler`

## Step 6: Enable GitHub Authentication in Firebase

1. In Firebase Console, go to **Build** → **Authentication**
2. Click the "Sign-in method" tab
3. Click "GitHub" from the list of providers
4. Toggle "Enable"
5. Enter your GitHub OAuth **Client ID** and **Client Secret**
6. Copy the **authorization callback URL** (should match what you set in GitHub)
7. Click "Save"

## Step 7: Add Firebase Config to GitHub Secrets (For GitHub Pages)

If you want to keep your Firebase config secure:

1. Go to your GitHub repository settings
2. Navigate to **Secrets and variables** → **Actions**
3. Add these secrets:
   - `FIREBASE_API_KEY`
   - `FIREBASE_AUTH_DOMAIN`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_STORAGE_BUCKET`
   - `FIREBASE_MESSAGING_SENDER_ID`
   - `FIREBASE_APP_ID`

4. Update `.github/workflows/deploy.yml` to inject these during build:

```yaml
- name: Build
  run: |
    npm run build -- --base-href=/contraction-timer/
  env:
    FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
    FIREBASE_AUTH_DOMAIN: ${{ secrets.FIREBASE_AUTH_DOMAIN }}
    FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
    FIREBASE_STORAGE_BUCKET: ${{ secrets.FIREBASE_STORAGE_BUCKET }}
    FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.FIREBASE_MESSAGING_SENDER_ID }}
    FIREBASE_APP_ID: ${{ secrets.FIREBASE_APP_ID }}
```

## Step 8: Update Authorized Domains

1. In Firebase Console, go to **Build** → **Authentication**
2. Click the "Settings" tab
3. Scroll to "Authorized domains"
4. Add your GitHub Pages domain:
   - `your-username.github.io`
5. Click "Add domain"

## Step 9: Test Locally

```bash
cd contraction-timer
npm start
```

Navigate to `http://localhost:4200` and try:
1. Click "Sign in with GitHub"
2. Authorize the app
3. You should be signed in and see the timer interface

## Step 10: Deploy to GitHub Pages

```bash
git add .
git commit -m "Add Firebase authentication with GitHub OAuth"
git push origin main
```

Your app will automatically deploy to: `https://YOUR-USERNAME.github.io/contraction-timer/`

## Troubleshooting

### Error: "Auth domain is not configured"
- Make sure you added your GitHub Pages domain to Firebase Authorized domains

### Error: "redirect_uri_mismatch"
- Check that your GitHub OAuth app callback URL matches Firebase's auth domain exactly
- Format: `https://your-project-id.firebaseapp.com/__/auth/handler`

### Error: "Configuration object is invalid"
- Verify all Firebase config values are correct in `environment.ts` and `environment.prod.ts`

### Popup Blocked
- Make sure pop-ups are enabled for your site
- Try using `signInWithRedirect` instead of `signInWithPopup` for better mobile support

### Data Not Syncing
- Check Firestore security rules are properly configured
- Open browser console and check for any Firebase errors
- Verify user is authenticated before writing data

## Data Structure

Your Firestore data will be organized as:

```
users/
  {userId}/
    sessions/
      {sessionId}/
        - startDate: timestamp
        - isActive: boolean
        - contractions: array
        - predictedBirthTime: timestamp
```

## Security Notes

✅ **What's Secure:**
- Each user can only access their own data
- GitHub authentication ensures user identity
- Firestore rules prevent unauthorized access

⚠️ **Best Practices:**
- Never commit Firebase config with real values to public repos
- Use GitHub Secrets for sensitive data
- Keep Firebase security rules restrictive
- Regularly review Firebase usage and security

## Support

If you need help:
1. Check Firebase Console for errors
2. Review browser console for JavaScript errors
3. Check GitHub Actions logs for deployment issues
4. Verify all URLs and domains are correctly configured
