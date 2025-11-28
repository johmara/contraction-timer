import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ContractionService } from './contraction.service';
import { Contraction, ContractionSession } from '../models/contraction.model';

describe('ContractionService', () => {
  let service: ContractionService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ContractionService);
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('Session Management', () => {
    it('should start a new session', () => {
      const session = service.startNewSession();
      
      expect(session).toBeTruthy();
      expect(session.id).toBeTruthy();
      expect(session.isActive).toBe(true);
      expect(session.contractions).toEqual([]);
    });

    it('should save session to localStorage', () => {
      const session = service.startNewSession();
      const sessions = service.getAllSessions();
      
      expect(sessions.length).toBe(1);
      expect(sessions[0].id).toBe(session.id);
    });

    it('should load active session on initialization', () => {
      const session = service.startNewSession();
      
      // Create new service instance
      const newService = new ContractionService();
      const currentSession = newService.getCurrentSession();
      
      expect(currentSession).toBeTruthy();
      expect(currentSession?.id).toBe(session.id);
    });

    it('should end session', () => {
      service.startNewSession();
      service.endSession();
      
      const currentSession = service.getCurrentSession();
      expect(currentSession).toBeNull();
    });
  });

  describe('Contraction Tracking', () => {
    beforeEach(() => {
      service.startNewSession();
    });

    it('should start a contraction', () => {
      const contraction = service.startContraction();
      
      expect(contraction).toBeTruthy();
      expect(contraction.id).toBeTruthy();
      expect(contraction.startTime).toBeInstanceOf(Date);
      expect(contraction.endTime).toBeUndefined();
    });

    it('should throw error when starting contraction without active session', () => {
      service.endSession();
      
      expect(() => service.startContraction()).toThrow();
    });

    it('should end a contraction', async () => {
      const contraction = service.startContraction();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      service.endContraction(contraction.id);
      const session = service.getCurrentSession();
      const endedContraction = session?.contractions[0];
      
      expect(endedContraction?.endTime).toBeInstanceOf(Date);
      expect(endedContraction?.duration).toBeGreaterThan(0);
    });

    it('should calculate frequency between contractions', async () => {
      const contraction1 = service.startContraction();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      service.endContraction(contraction1.id);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      const contraction2 = service.startContraction();
      
      expect(contraction2.frequency).toBeTruthy();
      expect(contraction2.frequency).toBeGreaterThan(0);
    });

    it('should delete a contraction', () => {
      const contraction = service.startContraction();
      service.deleteContraction(contraction.id);
      
      const session = service.getCurrentSession();
      expect(session?.contractions.length).toBe(0);
    });

    it('should recalculate frequencies after deletion', async () => {
      const c1 = service.startContraction();
      await new Promise(resolve => setTimeout(resolve, 50));
      service.endContraction(c1.id);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      const c2 = service.startContraction();
      await new Promise(resolve => setTimeout(resolve, 50));
      service.endContraction(c2.id);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      const c3 = service.startContraction();
      service.endContraction(c3.id);
      
      // Delete middle contraction
      service.deleteContraction(c2.id);
      
      const session = service.getCurrentSession();
      expect(session?.contractions.length).toBe(2);
    });

    it('should get active contraction', () => {
      service.startContraction();
      const activeContraction = service.getActiveContraction();
      
      expect(activeContraction).toBeTruthy();
      expect(activeContraction?.endTime).toBeUndefined();
    });

    it('should return null when no active contraction', () => {
      const contraction = service.startContraction();
      service.endContraction(contraction.id);
      
      const activeContraction = service.getActiveContraction();
      expect(activeContraction).toBeNull();
    });
  });

  describe('Birth Prediction', () => {
    beforeEach(() => {
      service.startNewSession();
    });

    it('should return null with less than 3 contractions', () => {
      service.startContraction();
      const prediction = service.getPrediction();
      
      expect(prediction).toBeNull();
    });

    it('should return null with incomplete contractions', () => {
      service.startContraction();
      service.startContraction();
      service.startContraction();
      
      const prediction = service.getPrediction();
      expect(prediction).toBeNull();
    });

    it('should generate prediction with sufficient data', async () => {
      // Add 3 complete contractions with realistic timing
      const c1 = service.startContraction();
      await new Promise(resolve => setTimeout(resolve, 50));
      service.endContraction(c1.id);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      const c2 = service.startContraction();
      await new Promise(resolve => setTimeout(resolve, 50));
      service.endContraction(c2.id);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      const c3 = service.startContraction();
      await new Promise(resolve => setTimeout(resolve, 50));
      service.endContraction(c3.id);
      
      const prediction = service.getPrediction();
      
      expect(prediction).toBeTruthy();
      expect(prediction?.estimatedTime).toBeInstanceOf(Date);
      expect(prediction?.confidence).toBeTruthy();
      expect(['low', 'medium', 'high']).toContain(prediction?.confidence);
      expect(prediction?.avgDuration).toBeGreaterThan(0);
      expect(prediction?.avgFrequency).toBeGreaterThan(0);
      expect(['increasing', 'stable', 'decreasing']).toContain(prediction?.trend);
    });

    it('should detect active labor with frequent contractions', () => {
      // Simulate active labor: contractions every 2 minutes, lasting 60 seconds
      const session = service.getCurrentSession()!;
      
      // Manually create contractions to simulate active labor pattern
      const now = new Date();
      for (let i = 0; i < 5; i++) {
        const contraction: Contraction = {
          id: `test-${i}`,
          startTime: new Date(now.getTime() - (i * 180000)), // 3 minutes apart
          endTime: new Date(now.getTime() - (i * 180000) + 60000), // 60 seconds duration
          duration: 60,
          frequency: i > 0 ? 120 : undefined // 2 minutes frequency
        };
        session.contractions.unshift(contraction);
      }

      const prediction = service.getPrediction();
      
      expect(prediction).toBeTruthy();
      expect(prediction?.confidence).toBe('high');
      expect(prediction?.reasoning).toContain('Active labor');
    });

    it('should detect early labor with infrequent contractions', () => {
      const session = service.getCurrentSession()!;
      
      // Simulate early labor: contractions every 8 minutes, lasting 30 seconds
      const now = new Date();
      for (let i = 0; i < 4; i++) {
        const contraction: Contraction = {
          id: `test-${i}`,
          startTime: new Date(now.getTime() - (i * 510000)), // 8.5 minutes apart
          endTime: new Date(now.getTime() - (i * 510000) + 30000), // 30 seconds duration
          duration: 30,
          frequency: i > 0 ? 480 : undefined // 8 minutes frequency
        };
        session.contractions.unshift(contraction);
      }

      const prediction = service.getPrediction();
      
      expect(prediction).toBeTruthy();
      expect(prediction?.confidence).toBe('medium');
    });
  });

  describe('Data Persistence', () => {
    it('should persist multiple sessions', () => {
      const session1 = service.startNewSession();
      service.endSession();
      
      const session2 = service.startNewSession();
      
      const allSessions = service.getAllSessions();
      expect(allSessions.length).toBe(2);
    });

    it('should restore dates correctly from localStorage', () => {
      const session = service.startNewSession();
      const contraction = service.startContraction();
      service.endContraction(contraction.id);
      
      // Create new service instance to test restoration
      const newService = new ContractionService();
      const restoredSession = newService.getCurrentSession();
      
      expect(restoredSession).toBeTruthy();
      expect(restoredSession?.startDate).toBeInstanceOf(Date);
      expect(restoredSession?.contractions[0].startTime).toBeInstanceOf(Date);
      expect(restoredSession?.contractions[0].endTime).toBeInstanceOf(Date);
    });
  });
});

