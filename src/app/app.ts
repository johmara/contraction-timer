import { Component, OnInit, OnDestroy } from '@angular/core';
import { ContractionService } from './services/contraction.service';
import { AuthService } from './services/auth.service';
import { Contraction, ContractionSession, BirthPrediction } from './models/contraction.model';
import { Subscription, interval } from 'rxjs';
import { environment } from '../environments/environment';

type TabType = 'current' | 'history' | 'chart';

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
  activeTab: TabType = 'current';
  allSessions: ContractionSession[] = [];
  isLocalMode = environment.localMode;
  chartSession: ContractionSession | null = null;
  showUserMenu = false;
  private subscriptions = new Subscription();

  constructor(
    public contractionService: ContractionService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    console.log('🔧 App ngOnInit called');
    console.log('🔧 Local Mode:', this.isLocalMode);
    
    // Subscribe to auth state
    this.subscriptions.add(
      this.authService.currentUser$.subscribe(user => {
        this.isAuthenticated = !!user;
        this.userName = user?.displayName || null;
        this.userPhotoURL = user?.photoURL || null;
        console.log('🔧 Auth state changed:', { isAuthenticated: this.isAuthenticated, userName: this.userName });
      })
    );

    this.subscriptions.add(
      this.contractionService.currentSession$.subscribe(session => {
        this.currentSession = session;
        this.updatePrediction();
        this.loadAllSessions();
      })
    );

    // Update current time every second for timer display
    this.subscriptions.add(
      interval(1000).subscribe(() => {
        this.currentTime = new Date();
        this.activeContraction = this.contractionService.getActiveContraction();
      })
    );

    // Load all sessions on init
    this.loadAllSessions();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  loadAllSessions(): void {
    this.allSessions = this.contractionService.getAllSessions()
      .sort((a, b) => b.startDate.getTime() - a.startDate.getTime());
    console.log('🔧 Loaded sessions:', this.allSessions.length);
    console.log('🔧 Session history (inactive):', this.sessionHistory.length);
  }

  setActiveTab(tab: TabType): void {
    this.activeTab = tab;
    // Reset chartSession when switching to chart tab to show current session
    if (tab === 'chart' && !this.chartSession) {
      this.chartSession = this.currentSession;
    }
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
    this.activeTab = 'current';
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

  deleteSession(sessionId: string): void {
    if (confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      this.contractionService.deleteSession(sessionId);
      this.loadAllSessions();
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

  getHoursUntilDelivery(prediction: BirthPrediction): number {
    const now = Date.now();
    const deliveryTime = prediction.estimatedTime.getTime();
    const ms = deliveryTime - now;
    return Math.round((ms / (1000 * 60 * 60)) * 10) / 10; // round to 1 decimal
  }

  getReversedContractions(): Contraction[] {
    return this.currentSession ? [...this.currentSession.contractions].reverse() : [];
  }

  get sessionHistory(): ContractionSession[] {
    return this.allSessions.filter(s => !s.isActive);
  }

  getInactiveSessionsSortedByDate(): ContractionSession[] {
    return this.allSessions.filter(s => !s.isActive);
  }

  getSessionDuration(session: ContractionSession): string {
    if (!session.contractions.length) return 'No contractions';
    
    const first = session.contractions[0];
    const last = session.contractions[session.contractions.length - 1];
    const endTime = last.endTime || last.startTime;
    
    const durationMs = endTime.getTime() - first.startTime.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  }

  viewSessionChart(session: ContractionSession): void {
    // Toggle chart visibility for the session
    if (this.chartSession?.id === session.id) {
      this.chartSession = null; // Hide chart if clicking the same session
    } else {
      this.chartSession = session; // Show chart for this session
    }
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }
}
