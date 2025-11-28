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
          trend = 'increasing'; // contractions getting closer = increasing intensity
        } else if (recentAvg > earlierAvg * 1.2) {
          trend = 'decreasing';
        }
      }
    }

    // Prediction logic based on the 5-1-1 rule (contractions 5 min apart, lasting 1 min, for 1 hour)
    // and active labor progression
    let confidence: 'low' | 'medium' | 'high' = 'low';
    let hoursToDelivery = 12; // default estimate
    let reasoning = '';

    if (avgFrequency < 180 && avgDuration >= 45) {
      // Active labor: contractions < 3 minutes apart, lasting 45+ seconds
      confidence = 'high';
      hoursToDelivery = 2;
      reasoning = 'Active labor phase detected. Contractions are frequent and strong.';
    } else if (avgFrequency < 300 && avgDuration >= 45) {
      // Late active labor approaching: 3-5 minutes apart, 45+ seconds
      confidence = 'medium';
      hoursToDelivery = 4;
      reasoning = 'Progressing well. Contractions are becoming more regular and intense.';
    } else if (avgFrequency < 600 && avgDuration >= 30) {
      // Early labor: 5-10 minutes apart, 30+ seconds
      confidence = 'medium';
      hoursToDelivery = 8;
      reasoning = 'Early labor phase. Contractions are establishing a pattern.';
    } else {
      // Very early or irregular labor
      confidence = 'low';
      hoursToDelivery = 12;
      reasoning = 'Early labor phase. Continue monitoring as patterns develop.';
    }

    // Adjust based on trend
    if (trend === 'increasing') {
      hoursToDelivery *= 0.7; // labor progressing faster
      reasoning += ' Labor is progressing rapidly.';
    } else if (trend === 'decreasing') {
      hoursToDelivery *= 1.3; // labor slowing
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
        startDate: sessionStart,
        contractions: this.generateRealisticContractions(sessionStart, 120), // 120 contractions over ~8 hours
        isActive: false
      };
      
      // Create another session from yesterday
      const yesterdayStart = new Date();
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);
      yesterdayStart.setHours(14, 30, 0, 0);
      
      const testSession2: ContractionSession = {
        id: 'test-session-2',
        startDate: yesterdayStart,
        contractions: this.generateRealisticContractions(yesterdayStart, 100), // 100 contractions
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

  private generateRealisticContractions(startTime: Date, count: number = 25): Contraction[] {
    const contractions: Contraction[] = [];
    let currentTime = new Date(startTime);
    
    // Simulate realistic labor progression with three phases:
    // Phase 1 (0-40%): Early labor - mild, irregular (20-45s, every 10-15 min)
    // Phase 2 (40-75%): Active labor - stronger, regular (45-70s, every 3-5 min)  
    // Phase 3 (75-100%): Transition - intense, frequent (60-90s, every 2-3 min)
    
    for (let i = 0; i < count; i++) {
      const progressRatio = i / count;
      
      // Determine phase and base parameters
      let baseDuration: number;
      let baseFrequency: number;
      let variationFactor: number;
      
      if (progressRatio < 0.4) {
        // Early labor: short durations, long intervals, high variation
        baseDuration = 20 + progressRatio * 62.5; // 20 -> 45 seconds
        baseFrequency = 900 - progressRatio * 500; // 15 min -> 10 min  
        variationFactor = 0.4; // High variation (±40%)
      } else if (progressRatio < 0.75) {
        // Active labor: moderate durations, shorter intervals, less variation
        const activeProgress = (progressRatio - 0.4) / 0.35;
        baseDuration = 45 + activeProgress * 25; // 45 -> 70 seconds
        baseFrequency = 300 - activeProgress * 120; // 5 min -> 3 min
        variationFactor = 0.25; // Moderate variation (±25%)
      } else {
        // Transition: long durations, very short intervals, low variation
        const transitionProgress = (progressRatio - 0.75) / 0.25;
        baseDuration = 70 + transitionProgress * 20; // 70 -> 90 seconds
        baseFrequency = 180 - transitionProgress * 60; // 3 min -> 2 min
        variationFactor = 0.15; // Low variation (±15%)
      }
      
      // Apply variation
      const durationVariation = (Math.random() - 0.5) * 2 * baseDuration * variationFactor;
      const duration = Math.max(15, Math.min(120, Math.floor(baseDuration + durationVariation)));
      
      const frequencyVariation = (Math.random() - 0.5) * 2 * baseFrequency * variationFactor;
      const frequency = Math.max(120, Math.floor(baseFrequency + frequencyVariation));
      
      // Add frequency time to current time (time between contractions)
      if (i > 0) {
        currentTime = new Date(currentTime.getTime() + frequency * 1000);
      }
      
      const contractionStart = new Date(currentTime);
      const endTime = new Date(contractionStart.getTime() + duration * 1000);
      
      contractions.push({
        id: `contraction-${i + 1}`,
        startTime: contractionStart,
        endTime: endTime,
        duration: duration,
        frequency: i > 0 ? Math.floor(frequency) : undefined
      });
      
      // Update currentTime to end of contraction
      currentTime = endTime;
    }
    
    return contractions;
  }
}
