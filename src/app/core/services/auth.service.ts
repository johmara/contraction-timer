import { Injectable } from '@angular/core';
import { 
  Auth, 
  signInWithPopup, 
  signOut, 
  GithubAuthProvider,
  User,
  onAuthStateChanged,
  authState
} from '@angular/fire/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private githubProvider = new GithubAuthProvider();

  constructor(private auth: Auth) {
    // In local mode, auto-login with mock user
    if (environment.localMode) {
      console.log('🧪 Local Mode: Using mock authentication');
      const mockUser = {
        uid: 'local-user-id',
        displayName: 'Local Test User',
        email: 'test@local.dev',
        photoURL: 'https://via.placeholder.com/150',
      } as User;
      this.currentUserSubject.next(mockUser);
    } else {
      // Listen to auth state changes
      onAuthStateChanged(this.auth, (user) => {
        this.currentUserSubject.next(user);
        if (user) {
          console.log('User logged in:', user.displayName, user.email);
        } else {
          console.log('User logged out');
        }
      });
    }
  }

  async signInWithGitHub(): Promise<User> {
    if (environment.localMode) {
      console.log('🧪 Local Mode: Mock sign-in');
      return this.currentUserSubject.value!;
    }
    
    try {
      const result = await signInWithPopup(this.auth, this.githubProvider);
      return result.user;
    } catch (error: any) {
      console.error('Error signing in with GitHub:', error);
      throw error;
    }
  }

  async signOut(): Promise<void> {
    if (environment.localMode) {
      console.log('🧪 Local Mode: Mock sign-out (not allowed in local mode)');
      return;
    }
    
    try {
      await signOut(this.auth);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  getUserId(): string | null {
    return this.currentUserSubject.value?.uid || null;
  }

  getUserEmail(): string | null {
    return this.currentUserSubject.value?.email || null;
  }

  getUserDisplayName(): string | null {
    return this.currentUserSubject.value?.displayName || null;
  }

  getUserPhotoURL(): string | null {
    return this.currentUserSubject.value?.photoURL || null;
  }
}
