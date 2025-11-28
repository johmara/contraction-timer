import { Component, Input, OnChanges, SimpleChanges, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
import { ContractionSession } from '../../models/contraction.model';
import { RegressionService, Point } from '../../services/regression.service';

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

    // 1. Calculate raw Moving Average statistics first
    const windowSize = Math.max(3, Math.floor(scatterPoints.length / 5)); // Smaller window for more responsiveness
    const rawUpper: Point[] = [];
    const rawLower: Point[] = [];
    
    for (let i = 0; i < scatterPoints.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(scatterPoints.length - 1, i + Math.floor(windowSize / 2));
      
      let sum = 0;
      let sumSq = 0;
      
      for (let j = start; j <= end; j++) {
        sum += scatterPoints[j].y;
        sumSq += scatterPoints[j].y * scatterPoints[j].y;
      }
      
      const count = end - start + 1;
      const mean = sum / count;
      const variance = (sumSq / count) - (mean * mean);
      const sd = Math.sqrt(Math.max(0, variance));
      
      const currentX = scatterPoints[i].x;
      
      // Raw envelope points (2 SD)
      rawUpper.push({ x: currentX, y: mean + sd * 2.0 });
      rawLower.push({ x: currentX, y: mean - sd * 2.0 });
    }

    // 2. Use Regression Service to fit smooth curves to these raw statistical bounds
    // This creates the "Smooth Enveloping Lines" requested
    const upperFit = this.regressionService.fitPolynomial(rawUpper, 2);
    const lowerFit = this.regressionService.fitPolynomial(rawLower, 2);
    const trendFit = this.regressionService.fitPolynomial(scatterPoints, 2);

    const trendLine: Point[] = [];
    const upperBand: Point[] = [];
    const lowerBand: Point[] = [];

    // Generate points for the smooth curves
    scatterPoints.forEach(p => {
      trendLine.push({ x: p.x, y: trendFit.predict(p.x) });
      upperBand.push({ x: p.x, y: Math.min(180, upperFit.predict(p.x)) });
      lowerBand.push({ x: p.x, y: Math.max(0, lowerFit.predict(p.x)) });
    });

    // 3. Prediction: Project forward to find "Intersection"
    // The "Funnel" narrows as labor becomes regular (Variance decreases).
    // We project the Upper and Lower bands forward to find where they intersect (Zero Variance).
    // This theoretical point of "Perfect Regularity" is our Delivery Prediction.
    
    const lastTime = scatterPoints[scatterPoints.length - 1].x;
    // Cap projection at 6 hours to avoid infinite lines if they don't converge
    const maxProjection = 6 * 60 * 60 * 1000; 
    const stepSize = 5 * 60 * 1000; // Check every 5 mins
    
    let intersectionX = -1;
    let intersectionY = -1;

    const projectedUpper: Point[] = [];
    const projectedLower: Point[] = [];

    // Start projection from the last actual point
    projectedUpper.push({ x: lastTime, y: upperFit.predict(lastTime) });
    projectedLower.push({ x: lastTime, y: lowerFit.predict(lastTime) });

    for (let t = lastTime + stepSize; t <= lastTime + maxProjection; t += stepSize) {
      const uY = upperFit.predict(t);
      const lY = lowerFit.predict(t);
      
      // If bands cross (Upper goes below Lower), we found intersection
      if (uY <= lY) {
        intersectionX = t;
        intersectionY = (uY + lY) / 2; // Midpoint
        projectedUpper.push({ x: intersectionX, y: intersectionY });
        projectedLower.push({ x: intersectionX, y: intersectionY });
        break;
      }
      
      projectedUpper.push({ x: t, y: uY });
      projectedLower.push({ x: t, y: lY });
    }

    return { 
      scatterPoints, 
      trendLine,
      upperBand,
      lowerBand,
      projectedUpper,
      projectedLower,
      intersection: intersectionX > 0 ? [{ x: intersectionX, y: intersectionY }] : []
    };
  }
}
