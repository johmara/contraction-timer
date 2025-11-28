import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { 
  Firestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs,
  query,
  where,
  onSnapshot,
  deleteDoc,
  Timestamp
} from '@angular/fire/firestore';
import { Contraction, ContractionSession, BirthPrediction } from '../models/contraction.model';
import { AuthService } from './auth.service';
import { RegressionService } from './regression.service';

@Injectable({
  providedIn: 'root'
})
export class ContractionService {
  private firestore = inject(Firestore);
  private readonly STORAGE_KEY = 'contraction_sessions';
  private currentSessionSubject = new BehaviorSubject<ContractionSession | null>(null);
  public currentSession$ = this.currentSessionSubject.asObservable();
  private unsubscribe: (() => void) | null = null;

  constructor(private authService: AuthService, private regressionService: RegressionService) {
    // Subscribe to auth changes and load user's data
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.loadActiveSessionFromFirestore(user.uid);
      } else {
        this.loadActiveSessionFromLocalStorage();
      }
    });
  }

  private async loadActiveSessionFromFirestore(userId: string): Promise<void> {
    try {
      // Query for active sessions
      const sessionsRef = collection(this.firestore, `users/${userId}/sessions`);
      const q = query(sessionsRef, where('isActive', '==', true));
      
      // Set up real-time listener
      this.unsubscribe = onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const doc = snapshot.docs[0];
          const data = doc.data();
          const session = this.convertFirestoreToSession(doc.id, data);
          this.currentSessionSubject.next(session);
        } else {
          this.currentSessionSubject.next(null);
        }
      });
    } catch (error) {
      console.error('Error loading session from Firestore:', error);
      this.loadActiveSessionFromLocalStorage();
    }
  }

  private loadActiveSessionFromLocalStorage(): void {
    const sessions = this.getAllSessionsFromLocalStorage();
    const activeSession = sessions.find(s => s.isActive);
    if (activeSession) {
      this.currentSessionSubject.next(activeSession);
    }
  }

  async startNewSession(): Promise<ContractionSession> {
    const session: ContractionSession = {
      id: this.generateId(),
      startDate: new Date(),
      contractions: [],
      isActive: true
    };
    
    this.currentSessionSubject.next(session);
    await this.saveSession(session);
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

  async endSession(): Promise<void> {
    const session = this.currentSessionSubject.value;
    if (session) {
      session.isActive = false;
      await this.saveSession(session);
      this.currentSessionSubject.next(null);
    }
  }

  async markBirthTime(birthTime?: Date): Promise<void> {
    const session = this.currentSessionSubject.value;
    if (session) {
      session.actualBirthTime = birthTime || new Date();
      await this.saveSession(session);
      this.currentSessionSubject.next(session);
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

    // Use RegressionService to calculate prediction (same as chart)
    const prediction = this.regressionService.predictDeliveryTime(completedContractions);

    // Calculate average duration and frequency for display
    const avgDuration = completedContractions.reduce((sum, c) => sum + (c.duration || 0), 0) / completedContractions.length;
    
    const frequencies = completedContractions.filter(c => c.frequency).map(c => c.frequency!);
    const avgFrequency = frequencies.length > 0 
      ? frequencies.reduce((sum, f) => sum + f, 0) / frequencies.length 
      : 0;

    // Determine trend (are contractions getting closer together?)
    let trend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    if (frequencies.length >= 3) {
      const recent = frequencies.slice(-3);
      const earlier = frequencies.slice(0, Math.min(3, frequencies.length - 3));
      if (earlier.length > 0) {
        const recentAvg = recent.reduce((sum, f) => sum + f, 0) / recent.length;
        const earlierAvg = earlier.reduce((sum, f) => sum + f, 0) / earlier.length;
        if (recentAvg < earlierAvg * 0.8) {
          trend = 'increasing';
        } else if (recentAvg > earlierAvg * 1.2) {
          trend = 'decreasing';
        }
      }
    }

    // Build reasoning message
    let reasoning = '';
    if (!prediction.time) {
      reasoning = 'Continue monitoring. Unable to calculate delivery prediction yet.';
      return {
        estimatedTime: new Date(Date.now() + 12 * 60 * 60 * 1000),
        confidence: 'low',
        reasoning,
        avgFrequency,
        avgDuration,
        trend
      };
    }

    if (prediction.confidence === 'high') {
      reasoning = 'Active labor phase detected. Contractions are frequent and strong.';
    } else if (prediction.confidence === 'medium') {
      reasoning = 'Labor is progressing. Contractions are becoming more regular.';
    } else {
      reasoning = 'Early labor phase. Continue monitoring as patterns develop.';
    }

    if (trend === 'increasing') {
      reasoning += ' Labor is progressing rapidly.';
    } else if (trend === 'decreasing') {
      reasoning += ' Labor progression has slowed.';
    }

    return {
      estimatedTime: prediction.time,
      confidence: prediction.confidence,
      reasoning,
      avgFrequency,
      avgDuration,
      trend
    };
  }

  private async saveSession(session: ContractionSession): Promise<void> {
    const userId = this.authService.getUserId();
    
    if (userId) {
      // Save to Firestore
      try {
        const sessionRef = doc(this.firestore, `users/${userId}/sessions`, session.id);
        const sessionData = this.convertSessionToFirestore(session);
        await setDoc(sessionRef, sessionData);
      } catch (error) {
        console.error('Error saving to Firestore:', error);
        // Fall back to localStorage
        this.saveToLocalStorage(session);
      }
    } else {
      // Save to localStorage if not authenticated
      this.saveToLocalStorage(session);
    }
  }

  private saveToLocalStorage(session: ContractionSession): void {
    const sessions = this.getAllSessionsFromLocalStorage();
    const index = sessions.findIndex(s => s.id === session.id);
    
    if (index >= 0) {
      sessions[index] = session;
    } else {
      sessions.push(session);
    }
    
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(sessions));
  }

  private getAllSessionsFromLocalStorage(): ContractionSession[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored, this.dateReviver) : [];
  }

  async getAllSessions(): Promise<ContractionSession[]> {
    const userId = this.authService.getUserId();
    
    if (userId) {
      try {
        const sessionsRef = collection(this.firestore, `users/${userId}/sessions`);
        const snapshot = await getDocs(sessionsRef);
        return snapshot.docs.map(doc => this.convertFirestoreToSession(doc.id, doc.data()));
      } catch (error) {
        console.error('Error loading sessions from Firestore:', error);
        return this.getAllSessionsFromLocalStorage();
      }
    } else {
      return this.getAllSessionsFromLocalStorage();
    }
  }

  private convertSessionToFirestore(session: ContractionSession): any {
    return {
      startDate: Timestamp.fromDate(session.startDate),
      isActive: session.isActive,
      contractions: session.contractions.map(c => ({
        id: c.id,
        startTime: Timestamp.fromDate(c.startTime),
        endTime: c.endTime ? Timestamp.fromDate(c.endTime) : null,
        duration: c.duration || null,
        frequency: c.frequency || null
      })),
      predictedBirthTime: session.predictedBirthTime ? Timestamp.fromDate(session.predictedBirthTime) : null,
      actualBirthTime: session.actualBirthTime ? Timestamp.fromDate(session.actualBirthTime) : null
    };
  }

  private convertFirestoreToSession(id: string, data: any): ContractionSession {
    return {
      id,
      startDate: data.startDate.toDate(),
      isActive: data.isActive,
      contractions: (data.contractions || []).map((c: any) => ({
        id: c.id,
        startTime: c.startTime.toDate(),
        endTime: c.endTime ? c.endTime.toDate() : undefined,
        duration: c.duration,
        frequency: c.frequency
      })),
      predictedBirthTime: data.predictedBirthTime ? data.predictedBirthTime.toDate() : undefined,
      actualBirthTime: data.actualBirthTime ? data.actualBirthTime.toDate() : undefined
    };
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

  ngOnDestroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }

  // ============= CSV Export/Import Methods =============
  
  async deleteSession(sessionId: string): Promise<void> {
    const user = this.authService.getCurrentUser();
    
    if (user) {
      // Delete from Firestore
      try {
        const sessionRef = doc(this.firestore, `users/${user.uid}/sessions/${sessionId}`);
        await deleteDoc(sessionRef);
      } catch (error) {
        console.error('Error deleting session from Firestore:', error);
      }
    }
    
    // Also delete from localStorage
    const sessions = this.getAllSessionsFromLocalStorage();
    const updatedSessions = sessions.filter(s => s.id !== sessionId);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updatedSessions));
    
    // If the deleted session was the current session, clear it
    const currentSession = this.currentSessionSubject.value;
    if (currentSession && currentSession.id === sessionId) {
      this.currentSessionSubject.next(null);
    }
  }

  exportSessionAsCSV(session: ContractionSession): string {
    const headers = ['#', 'Start Time', 'End Time', 'Duration (MM:SS)', 'Frequency (MM:SS)', 'Interval (seconds)'];
    const rows = [headers.join(',')];

    session.contractions.forEach((contraction, index) => {
      const startTime = contraction.startTime.toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      });

      const endTime = contraction.endTime
        ? contraction.endTime.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
          })
        : 'N/A';

      const duration = contraction.duration
        ? `${Math.floor(contraction.duration / 60)}:${(contraction.duration % 60).toString().padStart(2, '0')}`
        : 'N/A';

      const frequency = contraction.frequency
        ? `${Math.floor(contraction.frequency / 60)}:${(contraction.frequency % 60).toString().padStart(2, '0')}`
        : 'N/A';

      const interval = contraction.frequency || 'N/A';

      rows.push([index + 1, startTime, endTime, duration, frequency, interval].join(','));
    });

    // Add prediction summary if available
    const prediction = this.getPrediction();
    if (prediction) {
      rows.push('');
      rows.push('Prediction Summary');
      rows.push(`Estimated Birth Time,${prediction.estimatedTime.toLocaleString()}`);
      rows.push(`Confidence,${prediction.confidence}`);
      rows.push(`Average Frequency,${prediction.avgFrequency.toFixed(2)} minutes`);
      rows.push(`Average Duration,${prediction.avgDuration} seconds`);
      rows.push(`Trend,${prediction.trend}`);
      rows.push(`Reasoning,"${prediction.reasoning}"`);
    }

    return rows.join('\n');
  }

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

  async importSessionsFromJSON(jsonData: string): Promise<ContractionSession[]> {
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

      const user = this.authService.getCurrentUser();
      
      // Save to Firestore if authenticated
      if (user) {
        for (const session of imported) {
          await this.saveSession(session);
        }
      }

      // Also save to localStorage
      const existing = this.getAllSessionsFromLocalStorage();
      const merged = [...existing, ...imported];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(merged));
      
      return imported;
    } catch (error: any) {
      console.error('Error importing sessions:', error);
      throw new Error(`Failed to import JSON: ${error.message}`);
    }
  }

  importContractionsFromCSV(csvData: string, sessionDate?: Date): number {
    const session = this.currentSessionSubject.value;
    if (!session) {
      throw new Error('No active session. Please start a session first.');
    }

    try {
      const lines = csvData.trim().split('\n');
      
      if (lines.length < 2) {
        throw new Error('CSV file is empty or invalid');
      }

      // Skip header row
      const dataLines = lines.slice(1);
      let importedCount = 0;

      // Detect if CSV has time-only format by checking first data line
      if (dataLines.length > 0) {
        const firstLine = dataLines[0];
        const fields = this.parseCSVLine(firstLine);
        if (fields.length >= 2) {
          const startTimeStr = fields[1].trim();
          // Check if it's time-only format (HH:MM:SS without date)
          const isTimeOnly = /^\d{1,2}:\d{2}:\d{2}$/.test(startTimeStr);
          
          if (isTimeOnly && sessionDate) {
            // Update session start date to match CSV date
            session.startDate = new Date(sessionDate);
            this.currentSessionSubject.next(session);
            this.saveSession(session);
          }
        }
      }

      for (const line of dataLines) {
        if (!line.trim()) continue;

        // Parse CSV line (handle quoted fields)
        const fields = this.parseCSVLine(line);
        
        if (fields.length < 6) {
          console.warn('Skipping invalid line:', line);
          continue;
        }

        try {
          const startTimeStr = fields[1].trim();
          const endTimeStr = fields[2].trim();
          const durationStr = fields[3].trim();

          // Parse start time
          const startTime = this.parseTimeString(startTimeStr);
          if (!startTime) {
            console.warn('Invalid start time:', startTimeStr);
            continue;
          }

          // Parse end time (if available)
          let endTime: Date | undefined;
          if (endTimeStr && endTimeStr !== '—' && endTimeStr !== '-' && endTimeStr !== 'N/A') {
            const parsedEndTime = this.parseTimeString(endTimeStr);
            if (parsedEndTime) {
              endTime = parsedEndTime;
            }
          }

          // Parse duration (MM:SS format)
          let duration: number | undefined;
          if (durationStr && durationStr !== '—' && durationStr !== '-' && durationStr !== 'N/A') {
            const durationMatch = durationStr.match(/(\d+):(\d+)/);
            if (durationMatch) {
              const mins = parseInt(durationMatch[1], 10);
              const secs = parseInt(durationMatch[2], 10);
              duration = mins * 60 + secs;
            }
          }

          // Parse frequency (MM:SS format or seconds)
          const frequencyStr = fields[4].trim();
          let frequency: number | undefined;
          if (frequencyStr && frequencyStr !== '—' && frequencyStr !== '-' && frequencyStr !== 'N/A') {
            const freqMatch = frequencyStr.match(/(\d+):(\d+)/);
            if (freqMatch) {
              const mins = parseInt(freqMatch[1], 10);
              const secs = parseInt(freqMatch[2], 10);
              frequency = mins * 60 + secs;
            } else {
              // Try parsing as plain number
              const freqNum = parseFloat(frequencyStr);
              if (!isNaN(freqNum)) {
                frequency = Math.floor(freqNum);
              }
            }
          }

          // Create contraction
          const contraction: Contraction = {
            id: this.generateId(),
            startTime,
            endTime,
            duration,
            frequency
          };

          session.contractions.push(contraction);
          importedCount++;
        } catch (err) {
          console.warn('Error parsing contraction line:', line, err);
        }
      }

      if (importedCount === 0) {
        throw new Error('No valid contractions found in CSV file');
      }

      // Sort contractions by start time
      session.contractions.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      this.currentSessionSubject.next(session);
      this.saveSession(session);

      return importedCount;
    } catch (error: any) {
      console.error('Error importing CSV:', error);
      throw new Error(`Failed to import CSV: ${error.message}`);
    }
  }

  private parseCSVLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    fields.push(current);
    return fields;
  }

  private parseTimeString(timeStr: string): Date | null {
    try {
      // Try parsing as ISO date
      const date = new Date(timeStr);
      if (!isNaN(date.getTime())) {
        return date;
      }

      // Try parsing MM/DD/YYYY, HH:MM:SS format
      const fullDateMatch = timeStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4}),?\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
      if (fullDateMatch) {
        const [, month, day, year, hour, minute, second] = fullDateMatch;
        return new Date(+year, +month - 1, +day, +hour, +minute, +second);
      }

      // Parse time-only format (HH:MM:SS) - use current session date
      const timeMatch = timeStr.match(/(\d{1,2}):(\d{2}):(\d{2})/);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1], 10);
        const minutes = parseInt(timeMatch[2], 10);
        const seconds = parseInt(timeMatch[3], 10);

        // Use the current session's start date as the base
        const session = this.currentSessionSubject.value;
        const baseDate = session ? new Date(session.startDate) : new Date();
        baseDate.setHours(hours, minutes, seconds, 0);
        return baseDate;
      }

      return null;
    } catch (error) {
      return null;
    }
  }
}
