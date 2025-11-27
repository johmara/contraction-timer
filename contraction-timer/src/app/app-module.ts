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
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    ContractionService,
    AuthService
  ],
  bootstrap: [App]
})
export class AppModule { }
