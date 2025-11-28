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
            label: 'Upper Envelope (Min/Max)',
            data: data.upperEnvelope,
            type: 'line',
            borderColor: 'rgba(232, 220, 200, 0.9)',
            backgroundColor: 'rgba(232, 220, 200, 0.15)',
            borderWidth: 2,
            fill: '+1',
            pointRadius: 0,
            tension: 0.4,
            order: 1
          },
          {
            label: 'Lower Envelope (Min/Max)',
            data: data.lowerEnvelope,
            type: 'line',
            borderColor: 'rgba(232, 220, 200, 0.9)',
            borderWidth: 2,
            fill: false,
            pointRadius: 0,
            tension: 0.4,
            order: 2
          },
          {
            label: 'Upper SD Band (±1σ)',
            data: data.upperSDEnvelope,
            type: 'line',
            borderColor: 'rgba(198, 123, 92, 0.6)',
            borderWidth: 1.5,
            borderDash: [4, 4],
            fill: false,
            pointRadius: 0,
            tension: 0.4,
            order: 3
          },
          {
            label: 'Lower SD Band (±1σ)',
            data: data.lowerSDEnvelope,
            type: 'line',
            borderColor: 'rgba(198, 123, 92, 0.6)',
            borderWidth: 1.5,
            borderDash: [4, 4],
            fill: false,
            pointRadius: 0,
            tension: 0.4,
            order: 4
          },
          {
            label: 'Duration',
            data: data.durationPoints,
            backgroundColor: 'rgba(74, 63, 92, 0.8)',
            borderColor: 'rgba(74, 63, 92, 1)',
            borderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
            order: 5
          }
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
            min: 0,
            max: 120,
            grace: '10%',
            title: {
              display: true,
              text: 'LENGTH (seconds)',
              font: {
                size: 13,
                weight: 'bold'
              },
              color: '#E8DCC8'
            },
            grid: {
              color: 'rgba(232, 220, 200, 0.2)',
              lineWidth: 1
            },
            ticks: {
              color: '#E8DCC8',
              font: {
                size: 12
              }
            }
          },
          x: {
            type: 'linear',
            title: {
              display: true,
              text: 'TIME (minutes from start)',
              font: {
                size: 13,
                weight: 'bold'
              },
              color: '#E8DCC8'
            },
            grid: {
              color: 'rgba(232, 220, 200, 0.2)',
              lineWidth: 1
            },
            ticks: {
              color: '#E8DCC8',
              font: {
                size: 11
              }
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top',
            labels: {
              font: {
                size: 11,
                weight: 'bold'
              },
              padding: 15,
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 8,
              boxHeight: 8,
              color: '#E8DCC8'
            }
          },
          tooltip: {
            backgroundColor: 'rgba(45, 42, 50, 0.95)',
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
            titleColor: '#E8DCC8',
            bodyColor: '#E8DCC8',
            callbacks: {
              label: (context: any) => {
                let label = context.dataset.label || '';
                if (label) {
                  label += ': ';
                }
                if (context.parsed.y !== null) {
                  label += context.parsed.y.toFixed(1) + 's';
                }
                if (context.parsed.x !== null) {
                  label += ` @ ${context.parsed.x.toFixed(1)}min`;
                }
                return label;
              }
            }
          }
        }
      },
      plugins: [{
        id: 'customAnnotations',
        afterDatasetsDraw(chart: any) {
          const ctx = chart.ctx;
          const xScale = chart.scales.x;
          const yScale = chart.scales.y;
          
          // Find the critical point (highest value)
          const data = chart.data.datasets[4].data as any[];
          if (!data || data.length === 0) return;
          
          const maxPoint = data.reduce((max, p) => (p.y > max.y ? p : max));
          const xPixel = xScale.getPixelForValue(maxPoint.x);
          const yPixel = yScale.getPixelForValue(maxPoint.y);
          
          // Draw vertical line to critical point
          ctx.save();
          ctx.strokeStyle = 'rgba(232, 220, 200, 0.6)';
          ctx.lineWidth = 2;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          ctx.moveTo(xPixel, yScale.getPixelForValue(0));
          ctx.lineTo(xPixel, yPixel);
          ctx.stroke();
          ctx.restore();
          
          // Draw annotation label
          ctx.save();
          ctx.font = 'bold 12px sans-serif';
          ctx.fillStyle = '#E8DCC8';
          ctx.textAlign = 'center';
          ctx.fillText(`Peak: ${maxPoint.y.toFixed(0)}s @ ${maxPoint.x.toFixed(1)}min`, xPixel, yPixel - 20);
          ctx.restore();
          
          // Draw legend for envelope types
          const lastXPixel = chart.chartArea.right - 10;
          ctx.save();
          ctx.font = '11px sans-serif';
          ctx.fillStyle = '#E8DCC8';
          ctx.textAlign = 'right';
          ctx.fillText('Solid: Min/Max | Dashed: ±1σ', lastXPixel, chart.chartArea.top + 20);
          ctx.restore();
        }
      }]
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
    this.chart.data.datasets[0].data = data.upperEnvelope;
    this.chart.data.datasets[1].data = data.lowerEnvelope;
    this.chart.data.datasets[2].data = data.upperSDEnvelope;
    this.chart.data.datasets[3].data = data.lowerSDEnvelope;
    this.chart.data.datasets[4].data = data.durationPoints;
    
    this.chart.update();
  }

  private prepareChartData(): { 
    durationPoints: Point[], 
    upperEnvelope: Point[],
    lowerEnvelope: Point[],
    upperSDEnvelope: Point[],
    lowerSDEnvelope: Point[]
  } {
    if (!this.session?.contractions.length) {
      return { 
        durationPoints: [], 
        upperEnvelope: [],
        lowerEnvelope: [],
        upperSDEnvelope: [],
        lowerSDEnvelope: []
      };
    }

    const durationPoints: Point[] = [];
    const startTime = this.session.contractions[0].startTime.getTime();

    this.session.contractions.forEach((contraction: any) => {
      const minutesFromStart = (contraction.startTime.getTime() - startTime) / 60000;
      if (contraction.duration) {
        durationPoints.push({ x: minutesFromStart, y: contraction.duration });
      }
    });

    if (durationPoints.length < 2) {
      return {
        durationPoints,
        upperEnvelope: [],
        lowerEnvelope: [],
        upperSDEnvelope: [],
        lowerSDEnvelope: []
      };
    }

    // Sort by x (time)
    durationPoints.sort((a, b) => a.x - b.x);

    // Calculate moving window envelopes (min/max)
    const windowSize = Math.max(3, Math.floor(durationPoints.length / 10)); // 10% of data
    const upperEnvelope: Point[] = [];
    const lowerEnvelope: Point[] = [];

    for (let i = 0; i < durationPoints.length; i++) {
      // Define window around current point
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(durationPoints.length - 1, i + Math.floor(windowSize / 2));
      
      // Find max and min in window
      let maxY = durationPoints[start].y;
      let minY = durationPoints[start].y;
      
      for (let j = start; j <= end; j++) {
        maxY = Math.max(maxY, durationPoints[j].y);
        minY = Math.min(minY, durationPoints[j].y);
      }
      
      const currentX = durationPoints[i].x;
      upperEnvelope.push({ x: currentX, y: maxY });
      lowerEnvelope.push({ x: currentX, y: Math.max(0, minY) });
    }

    // Calculate SD-based envelopes using sliding window
    const sdWindowSize = Math.max(5, Math.floor(durationPoints.length / 8)); // 12.5% of data
    const upperSDEnvelope: Point[] = [];
    const lowerSDEnvelope: Point[] = [];

    for (let i = 0; i < durationPoints.length; i++) {
      // Define window for SD calculation
      const start = Math.max(0, i - Math.floor(sdWindowSize / 2));
      const end = Math.min(durationPoints.length - 1, i + Math.floor(sdWindowSize / 2));
      
      // Calculate mean and SD in window
      const windowValues = [];
      for (let j = start; j <= end; j++) {
        windowValues.push(durationPoints[j].y);
      }
      
      const mean = windowValues.reduce((a, b) => a + b, 0) / windowValues.length;
      const variance = windowValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / windowValues.length;
      const sd = Math.sqrt(variance);
      
      const currentX = durationPoints[i].x;
      upperSDEnvelope.push({ x: currentX, y: Math.min(120, mean + sd) });
      lowerSDEnvelope.push({ x: currentX, y: Math.max(0, mean - sd) });
    }

    console.log('Dual Envelope Visualization:', {
      windowSize,
      sdWindowSize,
      points: durationPoints.length,
      maxDuration: Math.max(...durationPoints.map(p => p.y)),
      minDuration: Math.min(...durationPoints.map(p => p.y))
    });

    return { 
      durationPoints, 
      upperEnvelope,
      lowerEnvelope,
      upperSDEnvelope,
      lowerSDEnvelope
    };
  }
}
