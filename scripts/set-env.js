const fs = require('fs');
const path = require('path');

// Load .env file if it exists (for local development)
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value && !process.env[key]) {
      process.env[key] = value.trim();
    }
  });
  console.log('Loaded environment variables from .env file');
}

// Read environment variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || 'YOUR_API_KEY',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: process.env.FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || 'YOUR_MESSAGING_SENDER_ID',
  appId: process.env.FIREBASE_APP_ID || 'YOUR_APP_ID'
};

// Generate environment.ts (development) with localMode enabled
const devEnvContent = `export const environment = {
  production: false,
  localMode: true, // Set to true to bypass Firebase and test locally
  firebase: {
    apiKey: '${firebaseConfig.apiKey}',
    authDomain: '${firebaseConfig.authDomain}',
    projectId: '${firebaseConfig.projectId}',
    storageBucket: '${firebaseConfig.storageBucket}',
    messagingSenderId: '${firebaseConfig.messagingSenderId}',
    appId: '${firebaseConfig.appId}'
  }
};
`;

// Generate environment.prod.ts (production) with localMode disabled
const prodEnvContent = `export const environment = {
  production: true,
  localMode: false, // Always false in production
  firebase: {
    apiKey: '${firebaseConfig.apiKey}',
    authDomain: '${firebaseConfig.authDomain}',
    projectId: '${firebaseConfig.projectId}',
    storageBucket: '${firebaseConfig.storageBucket}',
    messagingSenderId: '${firebaseConfig.messagingSenderId}',
    appId: '${firebaseConfig.appId}'
  }
};
`;

// Write environment.ts
const devEnvPath = path.join(__dirname, '../src/environments/environment.ts');
fs.writeFileSync(devEnvPath, devEnvContent, { encoding: 'utf8' });
console.log('Environment file generated: environment.ts');

// Write environment.prod.ts
const prodEnvPath = path.join(__dirname, '../src/environments/environment.prod.ts');
fs.writeFileSync(prodEnvPath, prodEnvContent, { encoding: 'utf8' });
console.log('Environment file generated: environment.prod.ts');

console.log(`Firebase Project ID: ${firebaseConfig.projectId}`);
