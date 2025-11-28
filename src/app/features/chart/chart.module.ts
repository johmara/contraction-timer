import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { ChartComponent } from './chart';

@NgModule({
  declarations: [ChartComponent],
  imports: [SharedModule],
  exports: [ChartComponent]
})
export class ChartModule { }
