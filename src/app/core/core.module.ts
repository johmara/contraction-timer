import { NgModule, Optional, SkipSelf } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuthService } from './services/auth.service';
import { ContractionService } from './services/contraction.service';
import { RegressionService } from './services/regression.service';

@NgModule({
  imports: [CommonModule],
  providers: [
    AuthService,
    ContractionService,
    RegressionService
  ]
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    if (parentModule) {
      throw new Error('CoreModule is already loaded. Import it in the AppModule only.');
    }
  }
}
