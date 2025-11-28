import { Component } from '@angular/core';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: false,
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  isLoading = false;
  errorMessage = '';

  constructor(private authService: AuthService) {}

  async signInWithGitHub(): Promise<void> {
    this.isLoading = true;
    this.errorMessage = '';
    
    try {
      await this.authService.signInWithGitHub();
    } catch (error: any) {
      console.error('Login error:', error);
      this.errorMessage = error.message || 'Failed to sign in with GitHub';
    } finally {
      this.isLoading = false;
    }
  }
}
