import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Contraction, ContractionSession, BirthPrediction } from '../models/contraction.model';

@Injectable({
  providedIn: 'root'
})
export class ContractionService {
  private readonly STORAGE_KEY = 'contraction_sessions';
  private currentSessionSubject = new BehaviorSubject<ContractionSession | null>(null);
  public currentSession$ = this.currentSessionSubject.asObservable();

  constructor() {
    this.loadActiveSession();
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
}
