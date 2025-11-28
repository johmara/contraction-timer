import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { Login } from './login';

@NgModule({
  declarations: [Login],
  imports: [SharedModule],
  exports: [Login]
})
export class LoginModule { }
