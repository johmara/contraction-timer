const fs = require('fs');
const path = require('path');

// Determine if we're building for production
const isProduction = process.argv.includes('--prod') || process.env.NODE_ENV === 'production';

// Select the appropriate environment file
const envFile = isProduction ? 'environment.prod.ts' : 'environment.ts';
const envPath = path.join(__dirname, '../src/environments', envFile);

// Read environment variables
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || 'YOUR_API_KEY',
  authDomain: process.env.FIREBASE_AUTH_DOMAIN || 'YOUR_PROJECT_ID.firebaseapp.com',
  projectId: process.env.FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || 'YOUR_PROJECT_ID.appspot.com',
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || 'YOUR_MESSAGING_SENDER_ID',
  appId: process.env.FIREBASE_APP_ID || 'YOUR_APP_ID'
};

// Generate the environment file content
const envFileContent = `export const environment = {
  production: ${isProduction},
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

// Write the environment file
fs.writeFileSync(envPath, envFileContent, { encoding: 'utf8' });

console.log(`Environment file generated: ${envFile}`);
console.log(`Production mode: ${isProduction}`);
console.log(`Firebase Project ID: ${firebaseConfig.projectId}`);
