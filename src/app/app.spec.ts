import { TestBed, ComponentFixture } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { vi } from 'vitest';
import { App } from './app';
import { ContractionService } from './core/services/contraction.service';

describe('App', () => {
  let component: App;
  let fixture: ComponentFixture<App>;
  let service: ContractionService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        RouterModule.forRoot([]),
        CommonModule
      ],
      declarations: [
        App
      ],
      providers: [ContractionService]
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    component = fixture.componentInstance;
    service = TestBed.inject(ContractionService);
    localStorage.clear();
    fixture.detectChanges(); // Initialize component
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should render title', async () => {
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Contraction Timer');
  });

  it('should display welcome message when no session', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.welcome')).toBeTruthy();
    expect(compiled.textContent).toContain('Start a new session');
  });

  it('should start a new session', () => {
    component.startSession();
    expect(component.currentSession).toBeTruthy();
    expect(component.currentSession?.isActive).toBe(true);
  });

  it('should display session controls after starting session', () => {
    component.startSession();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.session-active')).toBeTruthy();
    expect(compiled.querySelector('.btn-start')).toBeTruthy();
  });

  it('should start and end a contraction', async () => {
    component.startSession();
    component.startContraction();
    
    expect(component.activeContraction).toBeTruthy();
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    component.endContraction();
    expect(component.activeContraction).toBeNull();
    expect(component.currentSession?.contractions.length).toBe(1);
    expect(component.currentSession?.contractions[0].duration).toBeGreaterThan(0);
  });

  it('should format duration correctly', () => {
    expect(component.formatDuration(65)).toBe('1:05');
    expect(component.formatDuration(120)).toBe('2:00');
    expect(component.formatDuration(5)).toBe('0:05');
  });

  it('should format frequency correctly', () => {
    expect(component.formatFrequency(65)).toBe('1m 5s');
    expect(component.formatFrequency(120)).toBe('2m 0s');
    expect(component.formatFrequency(5)).toBe('5s');
  });

  it('should calculate contraction duration in real-time', () => {
    component.startSession();
    const contraction = service.startContraction();
    component.activeContraction = contraction;
    component.currentTime = new Date(contraction.startTime.getTime() + 5000);
    
    const duration = component.getContractionDuration(contraction);
    expect(duration).toBe(5);
  });

  it('should delete a contraction', () => {
    component.startSession();
    const contraction = service.startContraction();
    service.endContraction(contraction.id);
    
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    component.deleteContraction(contraction.id);
    
    expect(component.currentSession?.contractions.length).toBe(0);
  });

  it('should end session', () => {
    component.startSession();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    
    component.endSession();
    
    expect(component.currentSession).toBeNull();
  });

  it('should update prediction after contractions', () => {
    component.startSession();
    
    // Manually add contractions for testing
    const session = component.currentSession!;
    const now = new Date();
    for (let i = 0; i < 4; i++) {
      session.contractions.push({
        id: `test-${i}`,
        startTime: new Date(now.getTime() - (i * 300000)),
        endTime: new Date(now.getTime() - (i * 300000) + 60000),
        duration: 60,
        frequency: i > 0 ? 240 : undefined
      });
    }
    
    component.updatePrediction();
    
    expect(component.prediction).toBeTruthy();
    expect(component.prediction?.estimatedTime).toBeInstanceOf(Date);
  });

  it('should get reversed contractions for display', () => {
    component.startSession();
    service.startContraction();
    service.startContraction();
    
    const reversed = component.getReversedContractions();
    expect(reversed.length).toBe(2);
    expect(reversed[0]).toBe(component.currentSession?.contractions[1]);
  });
});
