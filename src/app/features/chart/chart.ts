import { Component, Input, OnChanges, SimpleChanges, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { ContractionSession } from '../../core/models/contraction.model';
import { RegressionService, Point } from '../../core/services/regression.service';

Chart.register(...registerables);

@Component({
  selector: 'app-chart',
  templateUrl: './chart.html',
  standalone: false,
  styleUrl: './chart.css'
})
export class ChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() session: ContractionSession | null = null;
  @ViewChild('chartCanvas') chartCanvas!: ElementRef<HTMLCanvasElement>;
  
  private chart: Chart | null = null;

  constructor(private regressionService: RegressionService) {}

  ngAfterViewInit(): void {
    this.createChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['session'] && !changes['session'].firstChange) {
      this.updateChart();
    }
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  private createChart(): void {
    if (!this.chartCanvas || !this.session) {
      return;
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      return;
    }

    const data = this.prepareChartData();

    const config: ChartConfiguration = {
      type: 'scatter',
      data: {
        datasets: [
          // 0: Trend envelope (smoothed line)
          {
            label: 'Trend Envelope',
            data: data.trendLine,
            type: 'line',
            borderColor: 'rgba(255, 193, 7, 0.0)', 
            backgroundColor: 'transparent',
            borderWidth: 0,
            fill: false,
            pointRadius: 0,
            tension: 0.5,
            order: 2
          },
          // 1: Upper confidence band
          {
            label: 'Upper Band',
            data: data.upperBand,
            type: 'line',
            borderColor: 'rgba(230, 180, 0, 0.8)',
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [], 
            fill: false,
            pointRadius: 0,
            tension: 0.5,
            order: 1
          },
          // 2: Lower confidence band
          {
            label: 'Lower Band',
            data: data.lowerBand,
            type: 'line',
            borderColor: 'rgba(230, 180, 0, 0.8)',
            borderWidth: 2,
            borderDash: [],
            fill: false,
            pointRadius: 0,
            tension: 0.5,
            order: 3
          },
          // 3: Scatter dots
          {
            label: 'Contractions',
            data: data.scatterPoints,
            backgroundColor: 'rgba(33, 150, 243, 0.8)',
            borderColor: 'rgba(21, 101, 192, 0.8)',
            borderWidth: 1,
            pointRadius: 4,
            pointHoverRadius: 6,
            order: 4
          },
          // 4: Projected Upper (Dashed)
          {
            label: 'Projected Upper',
            data: data.projectedUpper,
            type: 'line',
            borderColor: 'rgba(230, 180, 0, 0.5)',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0,
            tension: 0.5,
            order: 5
          },
          // 5: Projected Lower (Dashed)
          {
            label: 'Projected Lower',
            data: data.projectedLower,
            type: 'line',
            borderColor: 'rgba(230, 180, 0, 0.5)',
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0,
            tension: 0.5,
            order: 6
          },
          // 6: Intersection Prediction Point
          {
            label: 'Predicted Delivery',
            data: data.intersection,
            type: 'scatter',
            backgroundColor: 'rgba(255, 87, 34, 1)', // Red/Orange
            borderColor: 'rgba(255, 255, 255, 1)',
            borderWidth: 2,
            pointRadius: 6,
            pointHoverRadius: 8,
            order: 7
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1.6,
        interaction: {
          mode: 'point',
          intersect: false,
        },
        scales: {
          y: {
            beginAtZero: true,
            min: 0,
            max: 160, 
            grace: '5%',
            title: {
              display: true,
              text: 'LENGTH (MM:SS)',
              font: {
                size: 13,
                weight: 'bold'
              },
              color: '#546e7a'
            },
            grid: {
              color: 'rgba(33, 150, 243, 0.1)',
              lineWidth: 1
            },
            ticks: {
              color: '#546e7a',
              font: {
                size: 11
              },
              callback: (value: any) => {
                const seconds = Math.round(value);
                const mins = Math.floor(seconds / 60);
                const secs = seconds % 60;
                return `${mins}:${secs.toString().padStart(2, '0')}`;
              }
            }
          },
          x: {
            type: 'time',
            time: {
              displayFormats: {
                hour: 'HH:mm',
                minute: 'HH:mm'
              },
              tooltipFormat: 'HH:mm:ss'
            },
            title: {
              display: true,
              text: 'TIME',
              font: {
                size: 13,
                weight: 'bold'
              },
              color: '#546e7a'
            },
            grid: {
              color: 'rgba(33, 150, 243, 0.1)',
              lineWidth: 1
            },
            ticks: {
              color: '#546e7a',
              font: {
                size: 11
              },
              maxRotation: 45,
              minRotation: 0
            }
          }
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            backgroundColor: 'rgba(33, 48, 60, 0.95)',
            padding: 12,
            titleFont: {
              size: 13,
              weight: 'bold'
            },
            bodyFont: {
              size: 12
            },
            cornerRadius: 8,
            displayColors: true,
            titleColor: '#E8DCC8',
            bodyColor: '#E8DCC8',
            callbacks: {
              title: (context: any) => {
                if (context.length > 0) {
                  const timeMs = context[0].parsed.x;
                  const time = new Date(timeMs);
                  return time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                }
                return '';
              },
              label: (context: any) => {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  const secs = Math.round(context.parsed.y);
                  const mins = Math.floor(secs / 60);
                  const sec = secs % 60;
                  label += `${mins}:${sec.toString().padStart(2, '0')}`;
                }
                return label;
              }
            }
          }
        }
      }
    };

    this.chart = new Chart(ctx, config);
  }

  private updateChart(): void {
    if (!this.chart || !this.session) {
      if (this.chart) {
        this.chart.destroy();
        this.chart = null;
      }
      this.createChart();
      return;
    }

    const data = this.prepareChartData();
    this.chart.data.datasets[0].data = data.trendLine;
    this.chart.data.datasets[1].data = data.upperBand;
    this.chart.data.datasets[2].data = data.lowerBand;
    this.chart.data.datasets[3].data = data.scatterPoints;
    this.chart.data.datasets[4].data = data.projectedUpper;
    this.chart.data.datasets[5].data = data.projectedLower;
    this.chart.data.datasets[6].data = data.intersection;
    
    this.chart.update();
  }

  private prepareChartData(): { 
    scatterPoints: Point[], 
    trendLine: Point[],
    upperBand: Point[],
    lowerBand: Point[],
    projectedUpper: Point[],
    projectedLower: Point[],
    intersection: Point[]
  } {
    if (!this.session?.contractions.length) {
      return { 
        scatterPoints: [], 
        trendLine: [],
        upperBand: [],
        lowerBand: [],
        projectedUpper: [],
        projectedLower: [],
        intersection: []
      };
    }

    const scatterPoints: Point[] = [];

    // Collect scatter points (actual contractions)
    this.session.contractions.forEach((contraction: any) => {
      const x = contraction.startTime.getTime();
      if (contraction.duration) {
        scatterPoints.push({ x, y: contraction.duration });
      }
    });

    if (scatterPoints.length < 2) {
      return {
        scatterPoints,
        trendLine: [],
        upperBand: [],
        lowerBand: [],
        projectedUpper: [],
        projectedLower: [],
        intersection: []
      };
    }

    // Sort by x (time)
    scatterPoints.sort((a, b) => a.x - b.x);

    // --- 1. Detect Active Labor Start ---
    // Criteria: 3 consecutive contractions with frequency < 6 minutes (360s)
    let activeLaborStartIndex = 0;
    const FREQ_THRESHOLD_MS = 6 * 60 * 1000;
    let consistentCount = 0;

    for (let i = 1; i < scatterPoints.length; i++) {
      const freq = scatterPoints[i].x - scatterPoints[i-1].x;
      if (freq < FREQ_THRESHOLD_MS) {
        consistentCount++;
      } else {
        consistentCount = 0;
      }

      if (consistentCount >= 3) {
        activeLaborStartIndex = i - 3;
        break;
      }
    }
    
    if (activeLaborStartIndex <= 0) {
       activeLaborStartIndex = Math.floor(scatterPoints.length * 0.5); 
    }

    console.log('📊 Chart Analysis:', {
        totalPoints: scatterPoints.length,
        activeStartIndex: activeLaborStartIndex,
        activePointsCount: scatterPoints.length - activeLaborStartIndex,
        firstActiveTime: new Date(scatterPoints[activeLaborStartIndex].x).toLocaleTimeString()
    });

    // Subset of points for Regression (Active Phase only)
    const activePoints = scatterPoints.slice(activeLaborStartIndex);
    
    // --- 2. Calculate Statistics for Active Phase ---
    const windowSize = Math.max(3, Math.floor(activePoints.length / 5));
    const rawUpper: Point[] = [];
    const rawLower: Point[] = [];
    
    for (let i = 0; i < activePoints.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(activePoints.length - 1, i + Math.floor(windowSize / 2));
      
      let sum = 0;
      let sumSq = 0;
      
      for (let j = start; j <= end; j++) {
        sum += activePoints[j].y;
        sumSq += activePoints[j].y * activePoints[j].y;
      }
      
      const count = end - start + 1;
      const mean = sum / count;
      const variance = (sumSq / count) - (mean * mean);
      const sd = Math.sqrt(Math.max(0, variance));
      
      const currentX = activePoints[i].x;
      
      rawUpper.push({ x: currentX, y: mean + sd * 2.0 });
      rawLower.push({ x: currentX, y: mean - sd * 2.0 });
    }

    // --- 3. Fit Models on Active Data ---
    // Trend: Auto-detect Poly vs Exp based on best fit (Weighted)
    const trendFit = this.regressionService.fitBest(activePoints, true);
    // Smooth Envelope Fits
    const upperFit = this.regressionService.fitBest(rawUpper, true);
    const lowerFit = this.regressionService.fitBest(rawLower, true);

    console.log('📈 Model Selection:', {
        trend: trendFit.type,
        upper: upperFit.type,
        lower: lowerFit.type
    });

    const trendLine: Point[] = [];
    const upperBand: Point[] = [];
    const lowerBand: Point[] = [];

    // Generate points
    // Start generating points ONLY from activeLaborStartIndex
    for (let i = activeLaborStartIndex; i < scatterPoints.length; i++) {
      const p = scatterPoints[i];
      trendLine.push({ x: p.x, y: trendFit.predict(p.x) });
      upperBand.push({ x: p.x, y: Math.min(180, upperFit.predict(p.x)) });
      lowerBand.push({ x: p.x, y: Math.max(0, lowerFit.predict(p.x)) });
    }

    // --- 4. Prediction ---
    // Project the Polynomial curves forward until they intersect naturally
    const lastTime = scatterPoints[scatterPoints.length - 1].x;
    const maxProjectionTime = lastTime + 12 * 60 * 60 * 1000;
    const stepSize = 5 * 60 * 1000; 
    
    const projectedUpper: Point[] = [];
    const projectedLower: Point[] = [];
    
    // Start from last point to ensure connectivity
    projectedUpper.push({ x: lastTime, y: upperFit.predict(lastTime) });
    projectedLower.push({ x: lastTime, y: lowerFit.predict(lastTime) });

    let intersectionTime = -1;
    let intersectionY = -1;

    for (let t = lastTime + stepSize; t <= maxProjectionTime; t += stepSize) {
      // Use the SAME polynomial models as the envelope
      const uY = upperFit.predict(t);
      const lY = Math.max(0, lowerFit.predict(t)); 
      
      // Check for intersection (Funnel closed)
      if (uY <= lY) {
        intersectionTime = t;
        intersectionY = (uY + lY) / 2;
        
        projectedUpper.push({ x: intersectionTime, y: intersectionY });
        projectedLower.push({ x: intersectionTime, y: intersectionY });
        break;
      }
      
      projectedUpper.push({ x: t, y: uY });
      projectedLower.push({ x: t, y: lY });
    }
    
    const intersectionPoints = intersectionTime > 0 ? [{ x: intersectionTime, y: intersectionY }] : [];

    return { 
      scatterPoints, 
      trendLine,
      upperBand,
      lowerBand,
      projectedUpper,
      projectedLower,
      intersection: intersectionPoints
    };
  }
}
