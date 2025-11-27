import { NgModule, provideBrowserGlobalErrorListeners } from '@angular/core';
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
import { environment } from '../environments/environment';

@NgModule({
  declarations: [
    App,
    Login
  ],
  imports: [
    BrowserModule,
    CommonModule,
    AppRoutingModule
  ],
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideFirebaseApp(() => {
      console.log('Initializing Firebase with config:', {
        ...environment.firebase,
        apiKey: environment.firebase.apiKey?.substring(0, 10) + '...',
        appId: environment.firebase.appId?.substring(0, 10) + '...'
      });
      try {
        return initializeApp(environment.firebase);
      } catch (error) {
        console.error('Firebase initialization error:', error);
        throw error;
      }
    }),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    ContractionService,
    AuthService
  ],
  bootstrap: [App]
})
export class AppModule { }
