import 'zone.js';
import { platformBrowser } from '@angular/platform-browser';
import { AppModule } from './app/app-module';

console.log('=== Starting Bootstrap ===');

platformBrowser().bootstrapModule(AppModule, {
  
})
  .then(() => console.log('✅ Bootstrap successful'))
  .catch(err => {
    console.error('❌ Bootstrap failed');
    console.error('Error:', err);
    console.error('Error name:', err?.name);
    console.error('Error message:', err?.message);
    console.error('Error code:', err?.code);
    console.error('Full error object:', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    console.error('Error stack:', err?.stack);
    
    // Try to get more details from Angular error
    if (err.ngDebugContext) {
      console.error('Angular Debug Context:', err.ngDebugContext);
    }
    if (err.ngErrorCode) {
      console.error('Angular Error Code:', err.ngErrorCode);
    }
    
    alert(`Bootstrap Error: ${err?.message}\n\nCheck console for full details`);
  });
