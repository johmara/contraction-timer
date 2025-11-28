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

@Injectable({
  providedIn: 'root'
})
export class ContractionService {
  private firestore = inject(Firestore);
  private readonly STORAGE_KEY = 'contraction_sessions';
  private currentSessionSubject = new BehaviorSubject<ContractionSession | null>(null);
  public currentSession$ = this.currentSessionSubject.asObservable();
  private unsubscribe: (() => void) | null = null;

  constructor(private authService: AuthService) {
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

  getPrediction(): BirthPrediction | null {
    const session = this.currentSessionSubject.value;
    if (!session || session.contractions.length < 3) {
      return null;
    }

    const completedContractions = session.contractions.filter(c => c.endTime && c.duration);
    if (completedContractions.length < 3) {
      return null;
    }

    // Calculate average duration and frequency
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

    let confidence: 'low' | 'medium' | 'high' = 'low';
    let hoursToDelivery = 12;
    let reasoning = '';

    if (avgFrequency < 180 && avgDuration >= 45) {
      confidence = 'high';
      hoursToDelivery = 2;
      reasoning = 'Active labor phase detected. Contractions are frequent and strong.';
    } else if (avgFrequency < 300 && avgDuration >= 45) {
      confidence = 'medium';
      hoursToDelivery = 4;
      reasoning = 'Progressing well. Contractions are becoming more regular and intense.';
    } else if (avgFrequency < 600 && avgDuration >= 30) {
      confidence = 'medium';
      hoursToDelivery = 8;
      reasoning = 'Early labor phase. Contractions are establishing a pattern.';
    } else {
      confidence = 'low';
      hoursToDelivery = 12;
      reasoning = 'Early labor phase. Continue monitoring as patterns develop.';
    }

    if (trend === 'increasing') {
      hoursToDelivery *= 0.7;
      reasoning += ' Labor is progressing rapidly.';
    } else if (trend === 'decreasing') {
      hoursToDelivery *= 1.3;
      reasoning += ' Labor progression has slowed.';
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
      predictedBirthTime: session.predictedBirthTime ? Timestamp.fromDate(session.predictedBirthTime) : null
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
      predictedBirthTime: data.predictedBirthTime ? data.predictedBirthTime.toDate() : undefined
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
}
