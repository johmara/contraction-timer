import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';

import { AppRoutingModule } from './app-routing-module';
import { App } from './app';
import { ContractionService } from './services/contraction.service';
import { AuthService } from './services/auth.service';
import { Login } from './components/login/login';
import { ChartComponent } from './components/chart/chart';
import { environment } from '../environments/environment';

// Log config at module load time
console.log('=== Module Loading - Firebase Config Check ===');
console.log('Full Firebase Config:', environment.firebase);

@NgModule({
  declarations: [
    App,
    Login,
    ChartComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    AppRoutingModule
  ],
  providers: [
    provideFirebaseApp(() => {
      console.log('=== Initializing Firebase App ===');
      console.log('Config:', environment.firebase);
      const app = initializeApp(environment.firebase);
      console.log('✅ Firebase App initialized');
      return app;
    }),
    provideAuth(() => {
      console.log('=== Initializing Firebase Auth ===');
      const auth = getAuth();
      console.log('✅ Auth initialized');
      return auth;
    }),
    provideFirestore(() => {
      console.log('=== Initializing Firestore ===');
      const firestore = getFirestore();
      console.log('✅ Firestore initialized');
      return firestore;
    })
  ],
  bootstrap: [App]
})
export class AppModule { }
