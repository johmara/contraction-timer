# Contraction Timer - Clinical Labor Tracking

A **production-ready clinical-grade web application** for tracking uterine contractions during labor with advanced delivery time prediction, visual analytics, and comprehensive data export/import capabilities.

## 🎯 Key Features

### Core Functionality
- ⏱️ **Precision Contraction Tracking**: Real-time duration and frequency measurement
- 📊 **Visual Analytics**: Interactive scatter plot with polynomial regression and prediction bands
- 🤰 **Clinical Prediction Algorithm**: Friedman curve-based labor phase classification with delivery time estimates
- 💾 **Multi-Format Import/Export**: CSV and JSON formats for medical records and data portability
- 📱 **Progressive Web App**: Installable on iOS/Android with offline support
- 🔒 **Data Privacy**: Optional GitHub authentication, all data stored locally in browser

### User Experience
- **Mobile-First Design**: Responsive interface optimized for clinical bedside use with landscape mode
- **Landscape Mode**: Automatic chart display with immersive full-screen visualization on mobile/tablet
- **Real-Time Statistics**: Live frequency, duration, and trend metrics
- **Session History**: Archive and review past labor patterns with inline charts
- **Backup/Restore**: Complete session backup and restoration in JSON format
- **CSV Import/Export**: Import existing contraction data or export for external analysis
- **Automatic Calculations**: Frequency and duration computed instantly with visual feedback

## 📋 Clinical Algorithm

### Labor Phase Classification
The app classifies labor into four evidence-based phases using the **Friedman curve model**:

| Phase | Frequency | Duration | Confidence | Estimated Time |
|-------|-----------|----------|------------|-----------------|
| **Active Labor** | < 3 min | > 45 sec | High | ~1.5-2 hours |
| **Late Active** | 3-5 min | > 40 sec | High | ~2-4 hours |
| **Early Phase** | 5-8 min | > 30 sec | Medium | ~6-10 hours |
| **Prodromal** | 8-12 min | 20-30 sec | Low | > 8 hours |

### Trend Analysis
- **Increasing**: Contractions getting closer & longer → labor accelerating
- **Stable**: Consistent pattern → steady progression  
- **Decreasing**: Contractions spacing out → labor slowing

### Prediction Confidence
- **High**: Clear labor progression with consistent metrics
- **Medium**: Transitional phase or variable pattern
- **Low**: Early labor with significant variability

## 🚀 Getting Started

### Quick Start (Local Mode)
```bash
git clone <repo>
cd contraction-timer
npm install
npm start
```

Visit `http://localhost:4200` - app starts with test data automatically loaded in local mode.

### Production Deployment

#### Option 1: GitHub Pages (Recommended for Clinical Settings)
1. Fork the repository
2. Enable GitHub Pages in Settings
3. CI/CD automatically deploys on every commit
4. App runs entirely in browser - no server needed

#### Option 2: Install as Mobile App
1. Visit the deployed URL in mobile browser
2. Browser → Share → Add to Home Screen
3. App works offline and syncs locally

## 📊 How to Use

### Starting a Session
1. **Sign In**: GitHub authentication (optional in local mode)
2. **New Session**: Click "Start Session"
3. **Begin Tracking**: Press "Start" when contraction begins

### Recording Contractions
1. **Start**: Press "Start" button at contraction onset
2. **Stop**: Press "Stop" button when contraction ends
3. **Automatic**: Duration and frequency calculated
4. **Review**: Scroll down to see recent contractions

### Analyzing Results
- **Statistics Card**: Shows total count, frequency, and average duration
- **Prediction Card**: Displays phase, estimated time, and confidence level (tap to expand details)
- **Chart Tab**: Visual scatter plot with polynomial regression, confidence bands, and delivery prediction
- **Landscape Mode**: Rotate device to landscape for immersive full-screen chart (auto-switches on mobile)
- **Export**: Download data for medical records (CSV or JSON)

### Data Management
- **Backup**: History tab → "Backup All" → JSON file downloaded
- **Restore**: History tab → "Restore" → Select JSON file
- **CSV Export**: Per-session export for spreadsheet analysis
- **CSV Import**: Import existing contraction data into active session
- **Delete**: Individual sessions or contractions can be removed

## 📈 Visual Analytics

### Advanced Chart Features
- **X-Axis**: Time-of-day (HH:mm format)
- **Y-Axis**: Contraction duration (MM:SS format)
- **Blue Dots**: Individual contractions
- **Golden Bands**: Statistical confidence envelope (±2σ variability)
- **Projected Lines**: Forward prediction showing labor progression pattern
- **Delivery Prediction**: Red dot indicating estimated time when contractions converge
- **Smart Detection**: Automatically identifies active labor phase onset
- **Polynomial Regression**: Best-fit model selection (auto-weighted for recent data)

### Landscape Mode (Mobile/Tablet)
- **Auto-Switch**: Automatically displays chart when rotating to landscape from Current tab
- **Full-Screen**: Immersive view with hidden navigation and headers
- **Exit Button**: Tap X in top-left corner to return to previous view
- **No Scrolling**: Chart fits perfectly to viewport without overflow

### Interpretation
- **Ascending trend**: Contractions getting longer/closer → labor accelerating
- **Horizontal trend**: Stable pattern → steady progression
- **Descending trend**: Labor potentially slowing
- **Funnel narrowing**: Prediction bands converging indicates approaching delivery

## 🔒 Security & Privacy

✅ **Client-Side Only**: All data stored in browser localStorage
✅ **No Cloud Database**: Firebase Auth optional - works completely offline
✅ **No Tracking**: Privacy-first architecture
✅ **HTTPS**: All deployments use secure connections
✅ **GitHub Auth**: Optional - app works without authentication

## 📱 PWA (Progressive Web App)

The app is fully Progressive Web App (PWA) enabled:

### Installation
- **iOS**: Safari → Share → Add to Home Screen
- **Android**: Chrome → Menu → Install App
- **Windows/Mac**: Desktop browsers → Install option

### Offline Features
- Works completely offline after first load
- Service worker caches all assets
- Data stays in browser localStorage
- Automatic cache updates when online

### Home Screen Shortcuts
- Quick access to Start Session
- Direct link to History
- Chart analysis shortcut

## 💾 Data Export Formats

### CSV Export
Perfect for:
- Medical records
- Spreadsheet analysis
- Easy sharing with healthcare providers
- Data portability between devices

**Columns**: Time, Duration (MM:SS), Frequency, Interval, Prediction Data

### CSV Import
Perfect for:
- Migrating data from other apps
- Importing manually recorded contractions
- Restoring from backup spreadsheets
- Continuing sessions across devices

**Format**: Same as CSV export - Time, Duration, Frequency columns

### JSON Export
Perfect for:
- Complete backup/restore
- Data analysis
- Research purposes
- Multi-device sync

**Includes**: Session metadata, all contractions, timestamps, frequencies

## 🏥 Clinical Use Cases

### Labor Management
- Triage assessment in delivery unit
- Home monitoring before hospital admission
- Progress tracking during latent phase

### Data Documentation
- Export CSV for medical chart
- Backup JSON for personal records
- Share with midwife/OB provider

### Research
- Collect anonymized session data
- Validate prediction algorithms
- Labor pattern analysis

## ⚠️ Medical Disclaimers

**IMPORTANT - READ BEFORE USE:**

1. **Not a Medical Device**: This app is a tracking tool only and is NOT a substitute for professional medical assessment
2. **Professional Consultation**: Always consult your healthcare provider about when to seek hospital care
3. **Emergency**: Call 911 or go to emergency room for:
   - Vaginal bleeding
   - Severe abdominal/back pain
   - Fever
   - Rupture of membranes (fluid leakage)
   - Decreased fetal movement

4. **Prediction Accuracy**: Birth timing predictions are estimates based on population data and may not apply to your specific situation
5. **Evidence-Based**: Algorithm based on Friedman labor curves and established obstetric guidelines

## 🛠️ Technical Stack

| Component | Technology |
|-----------|-----------|
| **Frontend** | Angular 20.3, TypeScript 5.8 |
| **Charts** | Chart.js 4.5 with date-fns adapter |
| **Regression** | Custom polynomial & exponential curve fitting |
| **Auth** | Firebase Auth (GitHub OAuth) - Optional |
| **Storage** | Browser localStorage (no backend) |
| **PWA** | @angular/service-worker |
| **Build** | Angular CLI with production optimization |
| **Deployment** | GitHub Pages + GitHub Actions CI/CD |
| **Testing** | Vitest with Angular testing utilities |

### Bundle Size
- **Main Bundle**: ~717 KB (~193 KB gzipped)
- **Styles**: ~2 KB (730 bytes gzipped)
- **Total**: ~719 KB (~194 KB gzipped)
- **Compression**: Optimized for 3G/4G networks
- **Offline**: Service worker caching
- **Performance**: LCP < 2s on modern devices

## 📦 Package Dependencies

### Production
- `@angular/*` - Web framework (v20.3)
- `@angular/fire` - Firebase integration
- `chart.js` - Charting library (v4.5)
- `chartjs-adapter-date-fns` - Time axis support
- `date-fns` - Date manipulation
- `firebase` - Authentication (optional)
- `rxjs` - Reactive programming
- `tslib` - TypeScript runtime helpers

## 🚀 Deployment Guide

### GitHub Pages (Recommended)

1. **Enable Pages**:
   - Settings → Pages → Source: GitHub Actions
   
2. **Deploy**:
   ```bash
   git push origin main  # Automatic deployment
   ```

3. **Access**:
   ```
   https://username.github.io/contraction-timer/
   ```

### Custom Domain

Edit `.github/workflows/deploy.yml` to set your domain in the build output.

### Self-Hosted

```bash
npm run build
# Deploy dist/contraction-timer/browser/ to your server
# Ensure HTTPS is enabled
```

## 📋 Project Structure

```
src/
├── app/
│   ├── core/                    # Core module (singleton services)
│   │   ├── models/
│   │   │   └── contraction.model.ts  # TypeScript interfaces
│   │   ├── services/
│   │   │   ├── auth.service.ts       # GitHub authentication
│   │   │   ├── contraction.service.ts # Business logic & storage
│   │   │   └── regression.service.ts  # Polynomial/exponential fitting
│   │   └── core.module.ts
│   ├── features/                # Feature modules
│   │   ├── chart/              # Chart visualization component
│   │   │   ├── chart.ts
│   │   │   ├── chart.html
│   │   │   ├── chart.css
│   │   │   └── chart.module.ts
│   │   └── login/              # GitHub auth component
│   │       ├── login.ts
│   │       ├── login.html
│   │       ├── login.css
│   │       └── login.module.ts
│   ├── shared/                 # Shared module
│   │   └── shared.module.ts
│   ├── app.ts                  # Main component
│   ├── app.html                # Main template
│   ├── app.css                 # Styles
│   ├── app-module.ts           # Root module
│   └── app-routing-module.ts   # Routing (future use)
├── environments/
│   ├── environment.ts          # Development config
│   └── environment.prod.ts     # Production config
├── index.html                  # PWA meta tags
├── main.ts                     # Bootstrap
└── styles.css                  # Global styles
public/
├── manifest.json               # PWA manifest
└── favicon.ico                 # App icon
.github/
└── workflows/
    └── deploy.yml              # CI/CD pipeline
```

## 🧪 Development

### Local Development
```bash
npm start
# Starts on http://localhost:4200 with test data
```

### Build for Production
```bash
npm run build
# Output: dist/contraction-timer/browser/
```

### Run Tests
```bash
npm test
# Runs Vitest test suite via Angular CLI
```

### Test Single File
```bash
npx vitest run src/app/core/services/contraction.service.spec.ts
```

### Type Checking
```bash
npx tsc --noEmit
```

### Code Formatting
```bash
npx prettier --write .
# Uses configuration from package.json
```

## 📊 Prediction Algorithm Details

### Calculation Method
1. **Gather Data**: Last 3-10 contractions
2. **Calculate Metrics**: Average frequency and duration
3. **Classify Phase**: Compare to Friedman curve thresholds
4. **Assess Trend**: Recent vs. earlier contractions
5. **Estimate Time**: Base estimate + trend adjustment
6. **Assess Confidence**: Based on data consistency and labor regularity

### Chart Analysis Algorithm
1. **Active Labor Detection**: Identifies when contractions reach < 6 min frequency for 3+ consecutive events
2. **Statistical Modeling**: Calculates rolling mean and standard deviation (±2σ bands)
3. **Regression Fitting**: Auto-selects best model (polynomial vs exponential) with weighted recent data
4. **Forward Projection**: Extends confidence bands up to 12 hours ahead
5. **Delivery Prediction**: Calculates intersection point where bands converge (funnel closes)
6. **Visual Representation**: Displays actual data, confidence envelope, and projected delivery time

### Adjustments
- **High Variability**: Reduces confidence level
- **Accelerating Trend**: Reduces estimated time by 20-30%
- **Decelerating Trend**: Increases estimated time by 20-30%
- **Limited Data**: Conservative estimates with low confidence
- **Weighted Regression**: More recent contractions have higher influence on predictions

## 🤝 Contributing

This is an open-source project. Contributions are welcome:

1. Fork the repository
2. Create a feature branch
3. Commit changes with clear messages
4. Submit pull request

## 📞 Support & Issues

- **Bug Reports**: GitHub Issues
- **Documentation**: See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)
- **Questions**: Check existing issues first

## 📄 License

MIT License - See LICENSE file

## 🙏 Acknowledgments

- **Friedman Labor Curves**: Based on established obstetric evidence
- **Medical Guidelines**: WHO, ACOG recommendations
- **UI/UX**: Designed for clinical bedside use
- **Testing**: Built with healthcare provider feedback

---

**Built with ❤️ for expecting parents and healthcare professionals**

*This app helps you track labor patterns. Always follow your healthcare provider's guidance.*
