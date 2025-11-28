import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';

import { AppRoutingModule } from './app-routing-module';
import { CoreModule } from './core/core.module';
import { SharedModule } from './shared/shared.module';
import { LoginModule } from './features/login/login.module';
import { ChartModule } from './features/chart/chart.module';
import { App } from './app';
import { environment } from '../environments/environment';

// Log config at module load time
console.log('=== Module Loading - Firebase Config Check ===');
console.log('Full Firebase Config:', environment.firebase);

@NgModule({
  declarations: [App],
  imports: [
    BrowserModule,
    AppRoutingModule,
    CoreModule,
    SharedModule,
    LoginModule,
    ChartModule
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
    })
  ],
  bootstrap: [App]
})
export class AppModule { }
