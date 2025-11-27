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

## Step 3: Configure Firebase Using GitHub Secrets (Recommended)

For security, we'll use GitHub Secrets to store Firebase configuration. The app will automatically inject these during the build.

### Option A: Using GitHub Secrets (Recommended for production)

1. Go to your GitHub repository settings
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** and add each of these:
   - `FIREBASE_API_KEY` - Your Firebase API key
   - `FIREBASE_AUTH_DOMAIN` - Your Firebase auth domain (e.g., `your-project-id.firebaseapp.com`)
   - `FIREBASE_PROJECT_ID` - Your Firebase project ID
   - `FIREBASE_STORAGE_BUCKET` - Your storage bucket (e.g., `your-project-id.appspot.com`)
   - `FIREBASE_MESSAGING_SENDER_ID` - Your messaging sender ID
   - `FIREBASE_APP_ID` - Your Firebase app ID

The deployment workflow will automatically inject these values during build.

### Option B: Local Development

For local development, create a file `src/environments/environment.local.ts` (this file is gitignored):

```typescript
export const environment = {
  production: false,
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

Then set environment variables before running locally:

```bash
export FIREBASE_API_KEY="your-api-key"
export FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
export FIREBASE_PROJECT_ID="your-project-id"
export FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
export FIREBASE_MESSAGING_SENDER_ID="123456789"
export FIREBASE_APP_ID="1:123456789:web:abc123"

npm start
```

Or create a `.env.local` file (gitignored) and source it before running.

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

## Step 7: How the Build Process Works

The project uses GitHub Secrets to keep Firebase configuration secure:

1. **GitHub Actions**: When you push code, the deployment workflow reads the secrets you configured in Step 3
2. **Build Script**: The `scripts/set-env.js` script automatically generates the environment files with your Firebase config
3. **Angular Build**: The app is built with the injected configuration
4. **Deployment**: The built app is deployed to GitHub Pages

You **do not** need to manually edit environment files - they are generated automatically during build.

### Security Best Practices

✅ **What's Secure:**
- Firebase config is stored in GitHub Secrets (encrypted)
- Environment files with placeholders can be safely committed
- Each user can only access their own data (via Firestore rules)
- GitHub authentication ensures user identity

⚠️ **Note on Firebase API Keys:**
- Firebase client API keys are actually safe to expose publicly
- They only identify your Firebase project
- True security comes from Firebase Security Rules and authentication
- However, using GitHub Secrets is still a best practice for configuration management

## Step 8: Update Authorized Domains

1. In Firebase Console, go to **Build** → **Authentication**
2. Click the "Settings" tab
3. Scroll to "Authorized domains"
4. Add your GitHub Pages domain:
   - `your-username.github.io`
5. Click "Add domain"

## Step 9: Test Locally

Set up your local environment variables:

```bash
# Option 1: Export environment variables
export FIREBASE_API_KEY="your-api-key"
export FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
export FIREBASE_PROJECT_ID="your-project-id"
export FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
export FIREBASE_MESSAGING_SENDER_ID="123456789"
export FIREBASE_APP_ID="1:123456789:web:abc123"

# Generate environment files and start dev server
node scripts/set-env.js
npm start

# Option 2: Create a local script (add to .gitignore)
# Create start-local.sh with the exports above, then:
chmod +x start-local.sh
./start-local.sh
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
- Firebase config stored in encrypted GitHub Secrets
- Environment files in repository only contain placeholders
- Each user can only access their own data
- GitHub authentication ensures user identity
- Firestore rules prevent unauthorized access

⚠️ **Best Practices:**
- Never commit real Firebase values to the repository
- Use GitHub Secrets for all environments
- Keep Firebase security rules restrictive
- Regularly review Firebase usage and security
- Consider adding additional Firebase App Check for production

📝 **Important Note:**
Firebase client-side API keys are not "secret" in the traditional sense - they identify your project but don't authorize access. Security is enforced through Firebase Security Rules, not by hiding the API key. However, using environment variables is still recommended for configuration management and preventing key sprawl.

## Support

If you need help:
1. Check Firebase Console for errors
2. Review browser console for JavaScript errors
3. Check GitHub Actions logs for deployment issues
4. Verify all URLs and domains are correctly configured
