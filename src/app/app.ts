import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { ContractionService } from './core/services/contraction.service';
import { AuthService } from './core/services/auth.service';
import { Contraction, ContractionSession, BirthPrediction } from './core/models/contraction.model';
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
  isPredictionExpanded = false;
  isLandscape = false;
  showAllContractions = false;
  private previousTab: TabType = 'current';
  private subscriptions = new Subscription();
  
  @ViewChild('restoreFileInput') restoreFileInput!: ElementRef<HTMLInputElement>;
  @ViewChild('importCSVFileInput') importCSVFileInput!: ElementRef<HTMLInputElement>;

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

    // Handle screen orientation changes
    this.handleOrientationChange();
    window.addEventListener('resize', this.handleOrientationChange.bind(this));
    if (screen.orientation) {
      screen.orientation.addEventListener('change', this.handleOrientationChange.bind(this));
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    window.removeEventListener('resize', this.handleOrientationChange.bind(this));
    if (screen.orientation) {
      screen.orientation.removeEventListener('change', this.handleOrientationChange.bind(this));
    }
  }

  handleOrientationChange(): void {
    // Only apply on mobile/tablet devices (max width 1024px)
    const isMobileOrTablet = window.innerWidth <= 1024;
    const isCurrentlyLandscape = window.innerWidth > window.innerHeight;
    
    // Only switch tabs if orientation actually changed and on mobile/tablet
    if (isMobileOrTablet && isCurrentlyLandscape !== this.isLandscape) {
      this.isLandscape = isCurrentlyLandscape;
      
      if (this.isLandscape && this.currentSession && this.currentSession.contractions.length > 0) {
        // Entering landscape mode with active session - switch to chart (only if on current tab)
        if (this.activeTab === 'current') {
          this.previousTab = this.activeTab;
          this.activeTab = 'chart';
        }
      } else if (!this.isLandscape && this.activeTab === 'chart' && this.previousTab === 'current') {
        // Exiting landscape mode - return to previous tab only if we auto-switched from current
        this.activeTab = this.previousTab;
      }
    }
  }

  async loadAllSessions(): Promise<void> {
    const sessions = await this.contractionService.getAllSessions();
    this.allSessions = sessions.sort((a: ContractionSession, b: ContractionSession) => 
      b.startDate.getTime() - a.startDate.getTime()
    );
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

  async startSession(): Promise<void> {
    await this.contractionService.startNewSession();
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

  async deleteSession(sessionId: string): Promise<void> {
    if (confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      await this.contractionService.deleteSession(sessionId);
      await this.loadAllSessions();
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
    const rounded = Math.round(seconds);
    const mins = Math.floor(rounded / 60);
    const secs = rounded % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  formatFrequency(seconds: number): string {
    const rounded = Math.round(seconds);
    const mins = Math.floor(rounded / 60);
    const secs = rounded % 60;
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

  getContractionsList(): Contraction[] {
    const reversed = this.getReversedContractions();
    return this.showAllContractions ? reversed : reversed.slice(0, 5);
  }

  toggleShowAllContractions(): void {
    this.showAllContractions = !this.showAllContractions;
  }

  editContraction(contraction: Contraction): void {
    if (!this.currentSession) return;

    const currentDuration = contraction.duration ? this.formatDuration(contraction.duration) : '';
    const newDuration = prompt(
      'Enter duration in MM:SS format:',
      currentDuration
    );

    if (newDuration === null) return; // User cancelled

    // Parse MM:SS format
    const match = newDuration.match(/^(\d+):(\d{2})$/);
    if (!match) {
      alert('Invalid format. Please use MM:SS format (e.g., 1:30 for 1 minute 30 seconds)');
      return;
    }

    const minutes = parseInt(match[1], 10);
    const seconds = parseInt(match[2], 10);
    const totalSeconds = minutes * 60 + seconds;

    if (totalSeconds <= 0) {
      alert('Duration must be greater than 0 seconds');
      return;
    }

    // Update the contraction
    this.contractionService.updateContractionDuration(contraction.id, totalSeconds);
    this.updatePrediction();
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

  exportCurrentSessionCSV(): void {
    if (this.currentSession) {
      this.contractionService.downloadSessionCSV(this.currentSession);
    }
  }

  exportSessionCSV(session: ContractionSession): void {
    this.contractionService.downloadSessionCSV(session);
  }

  async backupAllSessions(): Promise<void> {
    const allSessions = await this.contractionService.getAllSessions();
    if (allSessions.length > 0) {
      this.contractionService.downloadSessionsJSON(allSessions);
    }
  }

  triggerRestoreFileInput(): void {
    this.restoreFileInput.nativeElement.click();
  }

  restoreFromFile(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const jsonData = e.target?.result as string;
        const imported = await this.contractionService.importSessionsFromJSON(jsonData);
        alert(`Successfully imported ${imported.length} session(s)`);
        await this.loadAllSessions();
      } catch (error: any) {
        alert(`Error importing file: ${error.message}`);
      }
    };
    reader.readAsText(file);
  }

  triggerImportCSVInput(): void {
    this.importCSVFileInput.nativeElement.click();
  }

  importCSVFile(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!this.currentSession) {
      alert('Please start a session first before importing contractions.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csvData = e.target?.result as string;
        
        // Detect if CSV has time-only format
        const lines = csvData.trim().split('\n');
        let sessionDate: Date | undefined;
        
        if (lines.length >= 2) {
          const firstDataLine = lines[1];
          const timeOnlyMatch = firstDataLine.match(/^\d+,(\d{1,2}:\d{2}:\d{2})/);
          
          if (timeOnlyMatch) {
            // CSV has time-only format - prompt for date
            const dateInput = prompt(
              'This CSV contains time-only data. Please enter the session date (MM/DD/YYYY):',
              new Date().toLocaleDateString('en-US')
            );
            
            if (!dateInput) {
              alert('Import cancelled - date is required for time-only CSV files.');
              return;
            }
            
            sessionDate = new Date(dateInput);
            if (isNaN(sessionDate.getTime())) {
              alert('Invalid date format. Please use MM/DD/YYYY format.');
              return;
            }
          }
        }
        
        const importedCount = this.contractionService.importContractionsFromCSV(csvData, sessionDate);
        alert(`Successfully imported ${importedCount} contraction(s)`);
        this.updatePrediction();
      } catch (error: any) {
        alert(`Error importing CSV: ${error.message}`);
      } finally {
        // Reset file input so the same file can be imported again if needed
        this.importCSVFileInput.nativeElement.value = '';
      }
    };
    reader.readAsText(file);
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
  }

  togglePrediction(): void {
    this.isPredictionExpanded = !this.isPredictionExpanded;
  }

  exitLandscapeChart(): void {
    // Return to previous tab when user manually exits landscape chart
    this.activeTab = this.previousTab;
  }

  async markBirthTime(): Promise<void> {
    if (!this.currentSession) return;

    const timeInput = prompt(
      'Enter birth time (HH:MM) or leave blank for current time:',
      new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
    );

    if (timeInput === null) return; // User cancelled

    let birthTime: Date;
    if (timeInput.trim() === '') {
      birthTime = new Date();
    } else {
      // Parse time input
      const timeMatch = timeInput.match(/(\d{1,2}):(\d{2})/);
      if (!timeMatch) {
        alert('Invalid time format. Please use HH:MM format.');
        return;
      }
      
      birthTime = new Date();
      birthTime.setHours(parseInt(timeMatch[1], 10), parseInt(timeMatch[2], 10), 0, 0);
    }

    await this.contractionService.markBirthTime(birthTime);
    alert('Birth time marked! 🎉');
  }

  async clearBirthTime(): Promise<void> {
    if (!this.currentSession) return;
    
    if (confirm('Are you sure you want to clear the birth time?')) {
      await this.contractionService.markBirthTime(undefined);
    }
  }

  isPredictionAccurate(): boolean {
    if (!this.currentSession?.actualBirthTime || !this.prediction) return false;
    
    const diffMs = Math.abs(
      this.currentSession.actualBirthTime.getTime() - this.prediction.estimatedTime.getTime()
    );
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return diffHours <= 1; // Accurate if within 1 hour
  }

  getPredictionDifference(): string {
    if (!this.currentSession?.actualBirthTime || !this.prediction) return '';
    
    const diffMs = this.currentSession.actualBirthTime.getTime() - this.prediction.estimatedTime.getTime();
    const diffMinutes = Math.round(Math.abs(diffMs) / (1000 * 60));
    
    if (diffMinutes < 60) {
      return diffMs > 0 
        ? `${diffMinutes} min late` 
        : `${diffMinutes} min early`;
    }
    
    const diffHours = Math.floor(diffMinutes / 60);
    const remainingMinutes = diffMinutes % 60;
    
    return diffMs > 0
      ? `${diffHours}h ${remainingMinutes}m late`
      : `${diffHours}h ${remainingMinutes}m early`;
  }
}
