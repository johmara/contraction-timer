import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Contraction, ContractionSession, BirthPrediction } from '../models/contraction.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ContractionService {
  private readonly STORAGE_KEY = 'contraction_sessions';
  private currentSessionSubject = new BehaviorSubject<ContractionSession | null>(null);
  public currentSession$ = this.currentSessionSubject.asObservable();

  constructor() {
    console.log('🔧 ContractionService constructor called');
    console.log('🔧 Environment localMode:', environment.localMode);
    
    this.loadActiveSession();
    
    // In local mode, seed with realistic test data if no data exists
    if (environment.localMode) {
      console.log('🧪 Local Mode enabled - checking for test data');
      this.seedTestDataIfEmpty();
    }
  }

  startNewSession(): ContractionSession {
    const session: ContractionSession = {
      id: this.generateId(),
      startDate: new Date(),
      contractions: [],
      isActive: true
    };
    this.currentSessionSubject.next(session);
    this.saveSession(session);
    return session;
  }

  startContraction(): Contraction {
    const session = this.currentSessionSubject.value;
    if (!session) {
      throw new Error('No active session. Please start a session first.');
    }

    const contraction: Contraction = {
      id: this.generateId(),
      startTime: new Date()
    };

    // Calculate frequency from last contraction
    if (session.contractions.length > 0) {
      const lastContraction = session.contractions[session.contractions.length - 1];
      if (lastContraction.endTime) {
        contraction.frequency = Math.floor(
          (contraction.startTime.getTime() - lastContraction.endTime.getTime()) / 1000
        );
      }
    }

    session.contractions.push(contraction);
    this.currentSessionSubject.next(session);
    this.saveSession(session);
    return contraction;
  }

  endContraction(contractionId: string): void {
    const session = this.currentSessionSubject.value;
    if (!session) return;

    const contraction = session.contractions.find(c => c.id === contractionId);
    if (contraction && !contraction.endTime) {
      contraction.endTime = new Date();
      contraction.duration = Math.floor(
        (contraction.endTime.getTime() - contraction.startTime.getTime()) / 1000
      );
      this.currentSessionSubject.next(session);
      this.saveSession(session);
    }
  }

  deleteContraction(contractionId: string): void {
    const session = this.currentSessionSubject.value;
    if (!session) return;

    session.contractions = session.contractions.filter(c => c.id !== contractionId);
    
    // Recalculate frequencies
    for (let i = 1; i < session.contractions.length; i++) {
      const current = session.contractions[i];
      const previous = session.contractions[i - 1];
      if (previous.endTime) {
        current.frequency = Math.floor(
          (current.startTime.getTime() - previous.endTime.getTime()) / 1000
        );
      }
    }

    this.currentSessionSubject.next(session);
    this.saveSession(session);
  }

  endSession(): void {
    const session = this.currentSessionSubject.value;
    if (session) {
      session.isActive = false;
      this.saveSession(session);
      this.currentSessionSubject.next(null);
    }
  }

  getPrediction(): BirthPrediction | null {
    const session = this.currentSessionSubject.value;
    if (!session || session.contractions.length < 3) {
      return null;
    }

    const completedContractions = session.contractions.filter(c => c.endTime && c.duration);
    if (completedContractions.length < 3) {
      return null;
    }

    // Calculate statistics
    const durations = completedContractions.map(c => c.duration!);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    
    // Calculate frequency trend (minutes between contractions)
    const frequencies = completedContractions
      .filter(c => c.frequency)
      .map(c => c.frequency! / 60); // convert to minutes
    
    const avgFrequency = frequencies.length > 0 
      ? frequencies.reduce((sum, f) => sum + f, 0) / frequencies.length 
      : 0;

    // Analyze labor phase based on duration progression
    let laborPhase = this.determineLaborPhase(durations, avgDuration, avgFrequency);
    
    // Determine trend (are contractions getting closer and longer?)
    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    let progressionScore = 0;
    
    if (frequencies.length >= 3) {
      // Check frequency trend
      const recent = frequencies.slice(-3);
      const earlier = frequencies.slice(0, Math.min(3, frequencies.length - 3));
      if (earlier.length > 0) {
        const recentFreq = recent.reduce((a, b) => a + b, 0) / recent.length;
        const earlierFreq = earlier.reduce((a, b) => a + b, 0) / earlier.length;
        
        if (recentFreq < earlierFreq * 0.75) {
          trend = 'increasing'; // contractions getting much closer
          progressionScore += 3;
        } else if (recentFreq < earlierFreq * 0.9) {
          progressionScore += 1; // slight improvement
        } else if (recentFreq > earlierFreq * 1.2) {
          trend = 'decreasing'; // labor slowing
          progressionScore -= 2;
        }
      }
      
      // Check duration trend
      const recentDurations = durations.slice(-3);
      const earlierDurations = durations.slice(0, Math.min(3, durations.length - 3));
      if (earlierDurations.length > 0) {
        const recentDur = recentDurations.reduce((a, b) => a + b, 0) / recentDurations.length;
        const earlierDur = earlierDurations.reduce((a, b) => a + b, 0) / earlierDurations.length;
        
        if (recentDur > earlierDur * 1.1) {
          progressionScore += 2; // durations increasing
        }
      }
    }

    // Determine delivery time based on phase and trend
    let hoursToDelivery = 12;
    let confidence: 'low' | 'medium' | 'high' = 'low';
    let reasoning = '';

    // Classification based on Friedman labor curves
    if (avgFrequency <= 3 && avgDuration >= 45) {
      // ACTIVE PHASE: < 3 min between, > 45 sec duration
      confidence = 'high';
      hoursToDelivery = 1.5 + (avgDuration / 60); // ~1-2 hours
      reasoning = `🔥 ACTIVE PHASE: Contractions ${avgFrequency.toFixed(1)}min apart, ${avgDuration.toFixed(0)}s long. Birth typically within 1-2 hours.`;
    } else if (avgFrequency <= 5 && avgDuration >= 40) {
      // LATE ACTIVE: 3-5 min between, > 40 sec
      confidence = 'high';
      hoursToDelivery = 3 + (avgDuration / 60);
      reasoning = `⏱️ LATE ACTIVE PHASE: Contractions ${avgFrequency.toFixed(1)}min apart, ${avgDuration.toFixed(0)}s long. Birth typically within 2-4 hours.`;
    } else if (avgFrequency <= 8 && avgDuration >= 30) {
      // EARLY PHASE: 5-8 min between, > 30 sec
      confidence = 'medium';
      hoursToDelivery = 6 + (avgDuration / 30);
      reasoning = `📊 EARLY PHASE: Contractions ${avgFrequency.toFixed(1)}min apart, ${avgDuration.toFixed(0)}s long. Birth estimated in 6-10 hours.`;
    } else if (avgFrequency <= 12 && avgDuration >= 20) {
      // PRODROMAL: 8-12 min between, 20-30 sec
      confidence = 'low';
      hoursToDelivery = 8 + (avgDuration / 20);
      reasoning = `⏳ PRODROMAL PHASE: Contractions ${avgFrequency.toFixed(1)}min apart, ${avgDuration.toFixed(0)}s long. Continue monitoring, labor may take 8+ hours.`;
    } else {
      // VERY EARLY
      confidence = 'low';
      hoursToDelivery = 12;
      reasoning = `🌙 EARLY LABOR: Contractions are ${avgFrequency.toFixed(1)}min apart, ${avgDuration.toFixed(0)}s long. Continue monitoring patterns.`;
    }

    // Adjust based on progression
    if (trend === 'increasing' && progressionScore > 0) {
      const factor = 0.8 - (progressionScore * 0.1); // faster progression
      hoursToDelivery = Math.max(1, hoursToDelivery * factor);
      if (confidence !== 'high') confidence = 'medium';
      reasoning = '⚡ ' + reasoning + ' Labor progressing RAPIDLY.';
    } else if (trend === 'decreasing' && progressionScore < 0) {
      const factor = 1.2 + (Math.abs(progressionScore) * 0.1); // slower progression
      hoursToDelivery = hoursToDelivery * factor;
      if (confidence === 'high') confidence = 'medium';
      reasoning = '🐢 ' + reasoning + ' Labor progression has slowed.';
    }

    // Add variability assessment
    const variability = maxDuration - minDuration;
    if (variability > maxDuration * 0.5) {
      reasoning += ` ⚠️ High variability detected (${minDuration.toFixed(0)}-${maxDuration.toFixed(0)}s) - interpret estimate cautiously.`;
    }

    const estimatedTime = new Date(Date.now() + hoursToDelivery * 60 * 60 * 1000);

    return {
      estimatedTime,
      confidence,
      reasoning,
      avgFrequency,
      avgDuration,
      trend
    };
  }

  private determineLaborPhase(durations: number[], avgDuration: number, avgFrequency: number): string {
    if (avgFrequency <= 3 && avgDuration >= 45) return 'active';
    if (avgFrequency <= 5 && avgDuration >= 40) return 'late-active';
    if (avgFrequency <= 8 && avgDuration >= 30) return 'early';
    if (avgFrequency <= 12) return 'prodromal';
    return 'pre-labor';
  }

  getAllSessions(): ContractionSession[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored, this.dateReviver) : [];
  }

  private loadActiveSession(): void {
    const sessions = this.getAllSessions();
    const activeSession = sessions.find(s => s.isActive);
    if (activeSession) {
      this.currentSessionSubject.next(activeSession);
    }
  }

  private saveSession(session: ContractionSession): void {
    const sessions = this.getAllSessions();
    const index = sessions.findIndex(s => s.id === session.id);
    
    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.push(session);
    }
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private dateReviver(key: string, value: any): any {
    if (typeof value === 'string') {
      const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
      if (dateRegex.test(value)) {
        return new Date(value);
      }
    }
    return value;
  }

  getCurrentSession(): ContractionSession | null {
    return this.currentSessionSubject.value;
  }

  getActiveContraction(): Contraction | null {
    const session = this.currentSessionSubject.value;
    if (!session || session.contractions.length === 0) return null;
    
    const lastContraction = session.contractions[session.contractions.length - 1];
    return !lastContraction.endTime ? lastContraction : null;
  }

  deleteSession(sessionId: string): void {
    const sessions = this.getAllSessions();
    const updatedSessions = sessions.filter(s => s.id !== sessionId);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedSessions));
    
    // If the deleted session was the current session, clear it
    const currentSession = this.currentSessionSubject.value;
    if (currentSession && currentSession.id === sessionId) {
      this.currentSessionSubject.next(null);
    }
  }

  private seedTestDataIfEmpty(): void {
    const sessions = this.getAllSessions();
    console.log('🧪 Checking sessions count:', sessions.length);
    
    if (sessions.length === 0) {
      console.log('🧪 Local Mode: Seeding realistic test data');
      
      // Create a realistic labor progression session from 8 hours ago
      const sessionStart = new Date();
      sessionStart.setHours(sessionStart.getHours() - 8);
      
      const testSession: ContractionSession = {
        id: 'test-session-1',
        startDate: new Date(new Date().getTime() - 12 * 3600 * 1000), // Started 12 hours ago
        contractions: this.generateRealisticContractions(new Date()), // End now
        isActive: false
      };
      
      // Create another session from yesterday
      const yesterdayEnd = new Date();
      yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
      yesterdayEnd.setHours(20, 0, 0, 0);
      
      const testSession2: ContractionSession = {
        id: 'test-session-2',
        startDate: new Date(yesterdayEnd.getTime() - 8 * 3600 * 1000),
        contractions: this.generateRealisticContractions(yesterdayEnd),
        isActive: false
      };
      
      // Save both sessions
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify([testSession, testSession2]));
      console.log('🧪 Test data seeded! Created 2 sessions');
      console.log('🧪 Session 1:', testSession.contractions.length, 'contractions');
      console.log('🧪 Session 2:', testSession2.contractions.length, 'contractions');
    } else {
      console.log('🧪 Existing sessions found, skipping seed');
    }
  }

  private generateRealisticContractions(sessionEnd: Date): Contraction[] {
    const contractions: Contraction[] = [];
    
    // We build the session backwards from the end (Pushing -> Transition -> Active -> Latent)
    // to ensure we fit a realistic timeline ending at "now" (or sessionEnd).
    
    let currentTime = new Date(sessionEnd);
    
    // --- Phase 4: Second Stage (Pushing) ---
    // Duration: ~1-2 hours
    // Freq: 2-5 mins
    // Length: 60-90s
    const pushingDurationHours = 1 + Math.random(); // 1-2 hours
    const pushingEndTime = new Date(currentTime);
    const pushingStartTime = new Date(currentTime.getTime() - pushingDurationHours * 3600 * 1000);
    
    this.generatePhaseContractions(
      contractions, 
      pushingStartTime, 
      pushingEndTime, 
      { minFreq: 120, maxFreq: 300 }, // 2-5 min
      { minDur: 60, maxDur: 90 },     // 60-90s
      0.1 // Low variation
    );
    
    currentTime = pushingStartTime;

    // --- Phase 3: Transition ---
    // Duration: ~30 min - 1.5 hours (Shortest)
    // Freq: 2-3 mins
    // Length: 60-90s (Intense)
    const transitionDurationHours = 0.5 + Math.random(); // 0.5 - 1.5 hours
    const transitionStartTime = new Date(currentTime.getTime() - transitionDurationHours * 3600 * 1000);
    
    this.generatePhaseContractions(
      contractions,
      transitionStartTime,
      currentTime,
      { minFreq: 120, maxFreq: 180 }, // 2-3 min
      { minDur: 60, maxDur: 90 },     // 60-90s
      0.15 // Low variation
    );

    currentTime = transitionStartTime;

    // --- Phase 2: Active Labor ---
    // Duration: 4-8 hours
    // Freq: 3-5 mins
    // Length: 45-60s
    const activeDurationHours = 4 + Math.random() * 4; // 4-8 hours
    const activeStartTime = new Date(currentTime.getTime() - activeDurationHours * 3600 * 1000);
    
    this.generatePhaseContractions(
      contractions,
      activeStartTime,
      currentTime,
      { minFreq: 180, maxFreq: 300 }, // 3-5 min
      { minDur: 45, maxDur: 60 },     // 45-60s
      0.25 // Moderate variation
    );

    currentTime = activeStartTime;

    // --- Phase 1: Latent (Early) Labor ---
    // Duration: 6-12 hours (can be days, but we'll cap at ~12h for chart readability)
    // Freq: 15-30 mins
    // Length: 30-45s
    const latentDurationHours = 6 + Math.random() * 6; // 6-12 hours
    const latentStartTime = new Date(currentTime.getTime() - latentDurationHours * 3600 * 1000);
    
    this.generatePhaseContractions(
      contractions,
      latentStartTime,
      currentTime,
      { minFreq: 900, maxFreq: 1800 }, // 15-30 min
      { minDur: 30, maxDur: 45 },      // 30-45s
      0.4 // High variation
    );

    // Sort by time as we generated blocks that might be out of order if we just concat
    // (Though we pushed in reverse time block order, the array needs to be time-ascending for the chart)
    return contractions.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
                       .map((c, i) => ({ ...c, id: `contraction-${i + 1}` }));
  }

  private generatePhaseContractions(
    allContractions: Contraction[],
    phaseStart: Date,
    phaseEnd: Date,
    freqRange: { minFreq: number, maxFreq: number },
    durRange: { minDur: number, maxDur: number },
    variation: number
  ) {
    let timeCursor = new Date(phaseStart);
    
    while (timeCursor < phaseEnd) {
      // Interpolate progress within the phase (0 to 1)
      const progress = (timeCursor.getTime() - phaseStart.getTime()) / (phaseEnd.getTime() - phaseStart.getTime());
      
      // Linearly interpolate base parameters based on progress through the phase
      // e.g., Frequency gets tighter, Duration gets longer
      const currentBaseFreq = freqRange.maxFreq - (progress * (freqRange.maxFreq - freqRange.minFreq));
      const currentBaseDur = durRange.minDur + (progress * (durRange.maxDur - durRange.minDur));

      // Apply Randomness
      const freqNoise = (Math.random() - 0.5) * 2 * variation * currentBaseFreq;
      const durNoise = (Math.random() - 0.5) * 2 * variation * currentBaseDur;
      
      const frequency = Math.max(60, currentBaseFreq + freqNoise);
      const duration = Math.max(15, currentBaseDur + durNoise);
      
      // Start time of contraction
      const startTime = new Date(timeCursor);
      const endTime = new Date(startTime.getTime() + duration * 1000);
      
      allContractions.push({
        id: 'temp', // will replace later
        startTime: startTime,
        endTime: endTime,
        duration: Math.floor(duration),
        frequency: Math.floor(frequency)
      });
      
      // Advance time by frequency (interval + duration usually, but here freq is start-to-start)
      timeCursor = new Date(timeCursor.getTime() + frequency * 1000);
    }
  }

   /**
    * Export a session as CSV format
    * Format: Time (HH:mm:ss), Duration (MM:SS), Frequency (min:sec), Notes
    */
   exportSessionAsCSV(session: ContractionSession): string {
     const headers = ['#', 'Start Time', 'End Time', 'Duration (MM:SS)', 'Frequency (MM:SS)', 'Interval (seconds)'];
     const rows = [headers];

     session.contractions.forEach((c, index) => {
       const startTime = c.startTime.toLocaleTimeString('en-US', {
         hour: '2-digit',
         minute: '2-digit',
         second: '2-digit',
         hour12: false
       });

       const endTime = c.endTime?.toLocaleTimeString('en-US', {
         hour: '2-digit',
         minute: '2-digit',
         second: '2-digit',
         hour12: false
       }) || '—';

       // Format duration as MM:SS
       const durationMins = Math.floor(c.duration! / 60);
       const durationSecs = c.duration! % 60;
       const durationFormatted = `${durationMins}:${durationSecs.toString().padStart(2, '0')}`;

       // Format frequency as MM:SS
       const frequencyFormatted = c.frequency 
         ? (() => {
             const freqMins = Math.floor(c.frequency! / 60);
             const freqSecs = c.frequency! % 60;
             return `${freqMins}:${freqSecs.toString().padStart(2, '0')}`;
           })()
         : '—';

       rows.push([
         (index + 1).toString(),
         startTime,
         endTime,
         durationFormatted,
         frequencyFormatted,
         c.frequency?.toString() || '—'
       ]);
     });

     // Add summary section
     const prediction = this.getPrediction();
     if (prediction) {
       rows.push([]);
       rows.push(['PREDICTION SUMMARY']);
       rows.push(['Estimated Delivery Time', prediction.estimatedTime.toLocaleString()]);
       rows.push(['Confidence Level', prediction.confidence.toUpperCase()]);
       rows.push(['Average Duration', `${Math.floor(prediction.avgDuration / 60)}:${(prediction.avgDuration % 60).toString().padStart(2, '0')}`]);
       rows.push(['Average Frequency', prediction.avgFrequency.toFixed(1) + ' minutes']);
       rows.push(['Trend', prediction.trend.toUpperCase()]);
       rows.push(['Details', prediction.reasoning]);
     }

     // Convert to CSV
     return rows.map(row => 
       row.map(cell => {
         // Escape quotes and wrap in quotes if contains comma
         const escaped = String(cell).replace(/"/g, '""');
         return escaped.includes(',') || escaped.includes('"') ? `"${escaped}"` : escaped;
       }).join(',')
     ).join('\n');
   }

   /**
    * Trigger download of CSV file
    */
   downloadSessionCSV(session: ContractionSession): void {
     const csv = this.exportSessionAsCSV(session);
     const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
     const link = document.createElement('a');
     const url = URL.createObjectURL(blob);

     const dateStr = session.startDate.toLocaleDateString('en-US', {
       year: 'numeric',
       month: '2-digit',
       day: '2-digit',
       hour: '2-digit',
       minute: '2-digit'
     }).replace(/[/:]/g, '-');

     link.setAttribute('href', url);
     link.setAttribute('download', `contractions-${dateStr}.csv`);
     link.style.visibility = 'hidden';

     document.body.appendChild(link);
     link.click();
      document.body.removeChild(link);
    }

    /**
     * Export session(s) as JSON for backup/data analysis
     */
    exportSessionsAsJSON(sessions: ContractionSession[]): string {
      const data = {
        exportDate: new Date().toISOString(),
        appVersion: '1.0.0',
        sessions: sessions.map(session => ({
          id: session.id,
          startDate: session.startDate.toISOString(),
          isActive: session.isActive,
          contractions: session.contractions.map(c => ({
            id: c.id,
            startTime: c.startTime.toISOString(),
            endTime: c.endTime?.toISOString() || null,
            duration: c.duration || null,
            frequency: c.frequency || null
          }))
        }))
      };
      return JSON.stringify(data, null, 2);
    }

    /**
     * Download session(s) as JSON file for backup
     */
    downloadSessionsJSON(sessions: ContractionSession[]): void {
      const json = this.exportSessionsAsJSON(sessions);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      const dateStr = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).replace(/\//g, '-');

      link.setAttribute('href', url);
      link.setAttribute('download', `contractions-backup-${dateStr}.json`);
      link.style.visibility = 'hidden';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    /**
     * Import sessions from JSON backup file
     */
    importSessionsFromJSON(jsonData: string): ContractionSession[] {
      try {
        const data = JSON.parse(jsonData);
        
        if (!data.sessions || !Array.isArray(data.sessions)) {
          throw new Error('Invalid JSON format: missing sessions array');
        }

        const imported: ContractionSession[] = data.sessions.map((s: any) => ({
          id: s.id,
          startDate: new Date(s.startDate),
          isActive: s.isActive,
          contractions: s.contractions.map((c: any) => ({
            id: c.id,
            startTime: new Date(c.startTime),
            endTime: c.endTime ? new Date(c.endTime) : undefined,
            duration: c.duration,
            frequency: c.frequency
          }))
        }));

        // Merge with existing sessions
        const existing = this.getAllSessions();
        const merged = [...existing, ...imported];
        
        // Store merged sessions
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(merged));
        
        return imported;
      } catch (error: any) {
        console.error('Error importing sessions:', error);
        throw new Error(`Failed to import JSON: ${error.message}`);
      }
    }
}
