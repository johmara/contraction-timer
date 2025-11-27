# Contraction Timer

A web application for tracking contractions during labor and predicting birth timing, with **GitHub authentication** and **cloud sync**.

## Features

- **Tabbed Interface**: Navigate between Current Session, History, and Chart views
- **Session History**: Review past contraction sessions
- **Chart Visualization**: Visual representation of contraction patterns using Chart.js
- **GitHub Authentication**: Sign in with your GitHub account (optional - see Local Mode below)
- **Real-time Cloud Sync**: Your data syncs across all devices via Firebase Firestore
- **Contraction Tracking**: Start and stop contractions with precise timing
- **Automatic Calculations**: Tracks duration and frequency of contractions
- **Birth Prediction Algorithm**: Uses established labor patterns (5-1-1 rule) to estimate birth timing
- **Responsive Design**: Works on mobile, tablet, and desktop
- **Session Management**: Start/end sessions and maintain history
- **Privacy**: Your data is private and only accessible to you
- **Local Development Mode**: Test the app without Firebase (see below)

## How It Works

### Authentication
- Sign in with your GitHub account
- Your contraction data is tied to your account
- Access your data from any device

### Tracking Contractions
1. Sign in with GitHub
2. Start a new session
3. Press "Start Contraction" when a contraction begins
4. Press "End Contraction" when it ends
5. The app automatically calculates duration and frequency

### Birth Prediction
The app uses medical guidelines to predict birth timing:

- **Active Labor**: Contractions < 3 min apart, 45+ seconds → High confidence, ~2 hours
- **Late Active Labor**: Contractions 3-5 min apart, 45+ seconds → Medium confidence, ~4 hours
- **Early Labor**: Contractions 5-10 min apart, 30+ seconds → Medium confidence, ~8 hours
- **Very Early Labor**: Less frequent contractions → Low confidence, ~12 hours

The algorithm also considers trends (whether contractions are getting closer together) to adjust predictions.

### Data Storage
- **Primary**: Firebase Firestore (cloud database)
- **Fallback**: Browser localStorage (if not signed in)
- Data syncs in real-time across devices
- Secure and private - only you can access your data

## Development

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.0.1.

### Prerequisites
- Node.js 20+
- npm
- Firebase account (free)
- GitHub account

### Setup

1. **Clone and Install**
```bash
npm install
```

2. **Local Development Mode (No Firebase Required)**
   
   For testing the UI and basic functionality without setting up Firebase:
   
   ```bash
   # The app is already configured for local mode by default
   npm start
   # or
   ng serve
   ```
   
   Navigate to `http://localhost:4200/`
   
   - You'll see a banner indicating "Local Development Mode"
   - You'll be automatically logged in as "Local Test User"
   - Data is stored in browser localStorage
   - No Firebase or GitHub OAuth required
   - Perfect for UI testing and development
   
   **To disable local mode**, edit `scripts/set-env.js` and set `localMode: false` in the development environment.

3. **Set up Firebase** (Required for production and authentication)
   
   Follow the detailed guide in [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)
   
   Quick steps:
   - Create a Firebase project
   - Enable Firestore Database
   - Enable GitHub Authentication
   - Create GitHub OAuth App
   - Update `src/environments/environment.ts` with your Firebase config

4. **Development Server**
```bash
ng serve
```
Navigate to `http://localhost:4200/`

5. **Build**
```bash
ng build
```

6. **Run Tests**
```bash
ng test
```

## Deployment to GitHub Pages

This project is configured to automatically deploy to GitHub Pages when you push to the main branch.

### Setup Instructions:

1. **Complete Firebase Setup** (See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md))

2. **Create a GitHub repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Contraction timer with GitHub auth"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/contraction-timer.git
   git push -u origin main
   ```

3. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Set Source to "GitHub Actions"
   - The app will auto-deploy!

4. **Configure GitHub OAuth App**
   - Set Homepage URL: `https://YOUR-USERNAME.github.io/contraction-timer/`
   - Set Authorization callback: `https://YOUR-PROJECT-ID.firebaseapp.com/__/auth/handler`

5. **Add Authorized Domain in Firebase**
   - Go to Firebase Console → Authentication → Settings
   - Add `your-username.github.io` to Authorized domains

6. **Access your app at:**
   `https://YOUR-USERNAME.github.io/contraction-timer/`

## Architecture

### Frontend
- **Angular 21**: Modern framework with TypeScript
- **RxJS**: Reactive state management
- **Responsive CSS**: Mobile-first design

### Backend & Database
- **Firebase Authentication**: GitHub OAuth integration
- **Firebase Firestore**: Real-time NoSQL database
- **Security Rules**: User-specific data isolation

### Data Flow
```
User → GitHub OAuth → Firebase Auth → Firestore
                                    ↓
                              ContractionService
                                    ↓
                              Angular Components
```

## Security

- ✅ GitHub OAuth for secure authentication
- ✅ Firestore security rules ensure users can only access their own data
- ✅ HTTPS enforced on GitHub Pages
- ✅ No sensitive data in client code
- ✅ API keys are public but restricted by Firebase security rules

## Medical Disclaimer

⚠️ **Important**: This app is for informational purposes only and should not replace professional medical advice. Always consult with your healthcare provider and follow their guidance for when to go to the hospital. This prediction algorithm is based on general patterns and may not apply to all situations.

## Project Structure

```
contraction-timer/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   └── login/              # GitHub login component
│   │   ├── models/
│   │   │   └── contraction.model.ts # Data models
│   │   ├── services/
│   │   │   ├── auth.service.ts      # GitHub authentication
│   │   │   ├── contraction.service.ts         # Business logic (localStorage)
│   │   │   └── contraction-firestore.service.ts # Business logic (Firestore)
│   │   ├── app.ts                   # Main component
│   │   ├── app.html                 # Main template
│   │   └── app.css                  # Styles
│   └── environments/
│       ├── environment.ts            # Dev Firebase config
│       └── environment.prod.ts       # Prod Firebase config
├── .github/workflows/
│   └── deploy.yml                    # GitHub Pages deployment
├── FIREBASE_SETUP.md                 # Detailed Firebase setup guide
└── README.md                         # This file
```

## Technologies Used

- Angular 21
- TypeScript
- RxJS
- Firebase Authentication (GitHub OAuth)
- Firebase Firestore
- GitHub Pages
- GitHub Actions

## License

MIT

## Support

For setup help, see [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)

For issues, please check:
- Firebase Console for authentication/database errors
- Browser console for JavaScript errors
- GitHub Actions logs for deployment issues

