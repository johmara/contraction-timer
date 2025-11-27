import { Component, OnInit, OnDestroy } from '@angular/core';
import { ContractionService } from './services/contraction.service';
import { AuthService } from './services/auth.service';
import { Contraction, ContractionSession, BirthPrediction } from './models/contraction.model';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  standalone: false,
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy {
  currentSession: ContractionSession | null = null;
  activeContraction: Contraction | null = null;
  prediction: BirthPrediction | null = null;
  currentTime = new Date();
  isAuthenticated = false;
  userName: string | null = null;
  userPhotoURL: string | null = null;
  private subscriptions = new Subscription();

  constructor(
    public contractionService: ContractionService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    // Subscribe to auth state
    this.subscriptions.add(
      this.authService.currentUser$.subscribe(user => {
        this.isAuthenticated = !!user;
        this.userName = user?.displayName || null;
        this.userPhotoURL = user?.photoURL || null;
      })
    );

    this.subscriptions.add(
      this.contractionService.currentSession$.subscribe(session => {
        this.currentSession = session;
        this.updatePrediction();
      })
    );

    // Update current time every second for timer display
    this.subscriptions.add(
      interval(1000).subscribe(() => {
        this.currentTime = new Date();
        this.activeContraction = this.contractionService.getActiveContraction();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  async signOut(): Promise<void> {
    try {
      await this.authService.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  startSession(): void {
    this.contractionService.startNewSession();
  }

  startContraction(): void {
    this.contractionService.startContraction();
    this.activeContraction = this.contractionService.getActiveContraction();
  }

  endContraction(): void {
    if (this.activeContraction) {
      this.contractionService.endContraction(this.activeContraction.id);
      this.activeContraction = null;
      this.updatePrediction();
    }
  }

  deleteContraction(contractionId: string): void {
    if (confirm('Are you sure you want to delete this contraction?')) {
      this.contractionService.deleteContraction(contractionId);
      this.updatePrediction();
    }
  }

  endSession(): void {
    if (confirm('Are you sure you want to end this session?')) {
      this.contractionService.endSession();
      this.currentSession = null;
      this.activeContraction = null;
      this.prediction = null;
    }
  }

  updatePrediction(): void {
    this.prediction = this.contractionService.getPrediction();
  }

  getContractionDuration(contraction: Contraction): number {
    if (contraction.duration) {
      return contraction.duration;
    }
    if (!contraction.endTime) {
      return Math.floor((this.currentTime.getTime() - contraction.startTime.getTime()) / 1000);
    }
    return 0;
  }

  formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  formatFrequency(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}m ${secs}s`;
    }
    return `${secs}s`;
  }

  getReversedContractions(): Contraction[] {
    return this.currentSession ? [...this.currentSession.contractions].reverse() : [];
  }
}
