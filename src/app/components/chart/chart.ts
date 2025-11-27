import { Component, Input, OnChanges, SimpleChanges, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { ContractionSession } from '../../models/contraction.model';

Chart.register(...registerables);

interface Point {
  x: number;
  y: number;
}

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
          {
            label: 'Duration (sec)',
            data: data.durationPoints,
            backgroundColor: 'rgba(255, 182, 193, 0.8)',
            borderColor: 'rgba(255, 159, 181, 1)',
            borderWidth: 3,
            pointRadius: 8,
            pointHoverRadius: 10
          },
          {
            label: 'Frequency (sec)',
            data: data.frequencyPoints,
            backgroundColor: 'rgba(180, 215, 255, 0.8)',
            borderColor: 'rgba(139, 195, 255, 1)',
            borderWidth: 3,
            pointRadius: 8,
            pointHoverRadius: 10
          },
          {
            label: 'Duration Trend',
            data: data.durationTrendLine,
            type: 'line',
            borderColor: 'rgba(255, 159, 181, 0.6)',
            borderWidth: 3,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0,
            tension: 0.4
          },
          {
            label: 'Frequency Trend',
            data: data.frequencyTrendLine,
            type: 'line',
            borderColor: 'rgba(139, 195, 255, 0.6)',
            borderWidth: 3,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0,
            tension: 0.4
          },
          ...(data.intersectionPoint ? [{
            label: 'Predicted Birth',
            data: [data.intersectionPoint],
            backgroundColor: 'rgba(184, 230, 184, 1)',
            borderColor: 'rgba(158, 217, 158, 1)',
            borderWidth: 4,
            pointRadius: 12,
            pointHoverRadius: 14,
            pointStyle: 'star'
          }] : [])
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1.5,
        interaction: {
          mode: 'point',
          intersect: false,
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Time (seconds)',
              font: {
                size: 13,
                weight: 'bold'
              },
              color: '#7A7A7A'
            },
            grid: {
              color: 'rgba(232, 232, 232, 0.5)',
              lineWidth: 1
            },
            ticks: {
              color: '#7A7A7A',
              font: {
                size: 12
              }
            }
          },
          x: {
            type: 'linear',
            title: {
              display: true,
              text: 'Contraction Number',
              font: {
                size: 13,
                weight: 'bold'
              },
              color: '#7A7A7A'
            },
            grid: {
              color: 'rgba(232, 232, 232, 0.3)',
              lineWidth: 1
            },
            ticks: {
              color: '#7A7A7A',
              font: {
                size: 12
              },
              stepSize: 1
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: {
                size: 12,
                weight: 'bold'
              },
              padding: 12,
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 8,
              boxHeight: 8,
              color: '#3D3D3D',
              filter: (item) => {
                // Hide trend lines from legend to reduce clutter
                return !item.text.includes('Trend');
              }
            }
          },
          tooltip: {
            backgroundColor: 'rgba(61, 61, 61, 0.95)',
            padding: 14,
            titleFont: {
              size: 14,
              weight: 'bold'
            },
            bodyFont: {
              size: 13
            },
            cornerRadius: 12,
            displayColors: true,
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.parsed.y ?? 0;
                const mins = Math.floor(value / 60);
                const secs = Math.floor(value % 60);
                
                if (label === 'Predicted Birth') {
                  const contractionNum = Math.round(context.parsed.x ?? 0);
                  return [`Predicted at contraction #${contractionNum}`, `Time: ${mins}:${secs.toString().padStart(2, '0')}`];
                }
                
                return `${label}: ${mins}:${secs.toString().padStart(2, '0')}`;
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
    this.chart.data.datasets[0].data = data.durationPoints;
    this.chart.data.datasets[1].data = data.frequencyPoints;
    this.chart.data.datasets[2].data = data.durationTrendLine;
    this.chart.data.datasets[3].data = data.frequencyTrendLine;
    
    // Update intersection point if exists
    if (data.intersectionPoint) {
      if (this.chart.data.datasets.length > 4) {
        this.chart.data.datasets[4].data = [data.intersectionPoint];
      } else {
        this.chart.data.datasets.push({
          type: 'scatter',
          label: 'Predicted Birth',
          data: [data.intersectionPoint],
          backgroundColor: 'rgba(184, 230, 184, 1)',
          borderColor: 'rgba(158, 217, 158, 1)',
          borderWidth: 4,
          pointRadius: 12,
          pointHoverRadius: 14,
          pointStyle: 'star' as const
        });
      }
    } else if (this.chart.data.datasets.length > 4) {
      this.chart.data.datasets.pop();
    }
    
    this.chart.update();
  }

  private prepareChartData(): { 
    durationPoints: Point[], 
    frequencyPoints: Point[], 
    durationTrendLine: Point[],
    frequencyTrendLine: Point[],
    intersectionPoint: Point | null
  } {
    if (!this.session || !this.session.contractions.length) {
      return { 
        durationPoints: [], 
        frequencyPoints: [], 
        durationTrendLine: [],
        frequencyTrendLine: [],
        intersectionPoint: null
      };
    }

    const durationPoints: Point[] = [];
    const frequencyPoints: Point[] = [];

    this.session.contractions.forEach((contraction, index) => {
      const x = index + 1;
      
      if (contraction.duration) {
        durationPoints.push({ x, y: contraction.duration });
      }
      
      if (contraction.frequency) {
        frequencyPoints.push({ x, y: contraction.frequency });
      }
    });

    // Calculate trend lines using polynomial regression
    const durationTrendLine = this.calculateTrendLine(durationPoints, this.session.contractions.length + 10);
    const frequencyTrendLine = this.calculateTrendLine(frequencyPoints, this.session.contractions.length + 10);

    // Find intersection point
    const intersectionPoint = this.findIntersection(durationTrendLine, frequencyTrendLine);

    return { durationPoints, frequencyPoints, durationTrendLine, frequencyTrendLine, intersectionPoint };
  }

  private calculateTrendLine(points: Point[], extendToX: number): Point[] {
    if (points.length < 2) {
      return [];
    }

    // Use polynomial regression (quadratic) for better curve fitting
    const regression = this.polynomialRegression(points);
    
    const startX = Math.min(...points.map(p => p.x));
    const trendLine: Point[] = [];
    
    // Generate curve points
    for (let x = startX; x <= extendToX; x += 0.5) {
      const y = regression.predict(x);
      if (y >= 0) { // Only positive values make sense for time
        trendLine.push({ x, y });
      }
    }
    
    return trendLine;
  }

  private polynomialRegression(points: Point[]): { predict: (x: number) => number } {
    const n = points.length;
    
    // For simplicity, use quadratic fit: y = ax² + bx + c
    // This gives us curves that can model labor progression
    
    let sumX = 0, sumX2 = 0, sumX3 = 0, sumX4 = 0;
    let sumY = 0, sumXY = 0, sumX2Y = 0;
    
    points.forEach(p => {
      sumX += p.x;
      sumX2 += p.x * p.x;
      sumX3 += p.x * p.x * p.x;
      sumX4 += p.x * p.x * p.x * p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumX2Y += p.x * p.x * p.y;
    });
    
    // Solve system of equations using matrix operations
    // For quadratic: [n, sumX, sumX2] [c]   [sumY]
    //                [sumX, sumX2, sumX3] [b] = [sumXY]
    //                [sumX2, sumX3, sumX4] [a]   [sumX2Y]
    
    const denominator = n * (sumX2 * sumX4 - sumX3 * sumX3) 
                       - sumX * (sumX * sumX4 - sumX2 * sumX3) 
                       + sumX2 * (sumX * sumX3 - sumX2 * sumX2);
    
    if (Math.abs(denominator) < 0.0001) {
      // Fallback to linear regression
      const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
      const intercept = (sumY - slope * sumX) / n;
      return { predict: (x: number) => slope * x + intercept };
    }
    
    const a = ((sumX2Y * (sumX2 * n - sumX * sumX) - sumXY * (sumX3 * n - sumX * sumX2) + sumY * (sumX3 * sumX - sumX2 * sumX2)) / denominator);
    const b = ((n * (sumX3 * sumXY - sumX2 * sumX2Y) - sumX * (sumX * sumX2Y - sumX2 * sumXY) + sumX2 * (sumX * sumXY - sumX2 * sumY)) / denominator);
    const c = ((sumX2 * (sumX2 * sumX2Y - sumX3 * sumXY) - sumX3 * (sumX * sumX2Y - sumX2 * sumXY) + sumX4 * (sumX * sumXY - sumX2 * sumY)) / denominator);
    
    return {
      predict: (x: number) => a * x * x + b * x + c
    };
  }

  private findIntersection(line1: Point[], line2: Point[]): Point | null {
    if (line1.length === 0 || line2.length === 0) {
      return null;
    }

    // Find where duration trend rises above frequency trend (contractions getting longer and more frequent)
    // This indicates active labor approaching delivery
    for (let i = 1; i < Math.min(line1.length, line2.length); i++) {
      const prev1 = line1[i - 1];
      const curr1 = line1[i];
      const prev2 = line2[i - 1];
      const curr2 = line2[i];

      // Check if lines cross (duration increasing, frequency decreasing, and they meet)
      if (prev1.y <= prev2.y && curr1.y >= curr2.y) {
        // Linear interpolation for more accurate intersection
        const t = (prev2.y - prev1.y) / ((curr1.y - prev1.y) - (curr2.y - prev2.y));
        const x = prev1.x + t * (curr1.x - prev1.x);
        const y = prev1.y + t * (curr1.y - prev1.y);
        
        return { x, y };
      }
    }

    return null;
  }
}
