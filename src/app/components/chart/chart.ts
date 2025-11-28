import { Component, Input, OnChanges, SimpleChanges, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import 'chartjs-adapter-date-fns';
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
          // Trend envelope (smoothed line)
          {
            label: 'Trend Envelope',
            data: data.trendLine,
            type: 'line',
            borderColor: 'rgba(255, 193, 7, 0.0)', // Transparent, we focus on the funnel
            backgroundColor: 'transparent',
            borderWidth: 0,
            fill: false,
            pointRadius: 0,
            tension: 0.5,
            order: 2
          },
          // Upper confidence band (Yellow Funnel Top)
          {
            label: 'Upper Band',
            data: data.upperBand,
            type: 'line',
            borderColor: 'rgba(230, 180, 0, 0.8)', // Clinical Yellow/Gold
            backgroundColor: 'transparent',
            borderWidth: 2,
            borderDash: [], // Solid line
            fill: false,
            pointRadius: 0,
            tension: 0.5,
            order: 1
          },
          // Lower confidence band (Yellow Funnel Bottom)
          {
            label: 'Lower Band',
            data: data.lowerBand,
            type: 'line',
            borderColor: 'rgba(230, 180, 0, 0.8)', // Clinical Yellow/Gold
            borderWidth: 2,
            borderDash: [], // Solid line
            fill: false,
            pointRadius: 0,
            tension: 0.5,
            order: 3
          },
          // Scatter dots (Clinical Blue)
          {
            label: 'Contractions',
            data: data.scatterPoints,
            backgroundColor: 'rgba(33, 150, 243, 0.8)', // Bright Blue
            borderColor: 'rgba(21, 101, 192, 0.8)', // Darker Blue border
            borderWidth: 1,
            pointRadius: 4,
            pointHoverRadius: 6,
            order: 4
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
            max: 160, // Accommodate up to 2:40 for extreme intensity
            grace: '5%',
            title: {
              display: true,
              text: 'LENGTH (MM:SS)',
              font: {
                size: 13,
                weight: 'bold'
              },
              color: '#546e7a' // Blue-grey
            },
            grid: {
              color: 'rgba(33, 150, 243, 0.1)', // Faint blue grid
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
              color: '#546e7a' // Blue-grey
            },
            grid: {
              color: 'rgba(33, 150, 243, 0.1)', // Faint blue grid
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
            display: false, // Hide legend to match clean look
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
    
    this.chart.update();
  }

  private prepareChartData(): { 
    scatterPoints: Point[], 
    trendLine: Point[],
    upperBand: Point[],
    lowerBand: Point[]
  } {
    if (!this.session?.contractions.length) {
      return { 
        scatterPoints: [], 
        trendLine: [],
        upperBand: [],
        lowerBand: []
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
        lowerBand: []
      };
    }

    // Sort by x (time)
    scatterPoints.sort((a, b) => a.x - b.x);

    // Calculate trend line using moving average
    const windowSize = Math.max(3, Math.floor(scatterPoints.length / 4));
    const trendLine: Point[] = [];
    const upperBand: Point[] = [];
    const lowerBand: Point[] = [];

    for (let i = 0; i < scatterPoints.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(scatterPoints.length - 1, i + Math.floor(windowSize / 2));
      
      // Calculate mean
      let sum = 0;
      let sumSq = 0;
      const windowValues = [];
      
      for (let j = start; j <= end; j++) {
        windowValues.push(scatterPoints[j].y);
        sum += scatterPoints[j].y;
        sumSq += scatterPoints[j].y * scatterPoints[j].y;
      }
      
      const count = end - start + 1;
      const mean = sum / count;
      const variance = (sumSq / count) - (mean * mean);
      const sd = Math.sqrt(Math.max(0, variance));
      
      const currentX = scatterPoints[i].x;
      trendLine.push({ x: currentX, y: mean });
      // Use 2 SD to create a wider "clinical range" funnel
      // This mimics the reference graph where the envelope captures most points
      upperBand.push({ x: currentX, y: Math.min(180, mean + sd * 2.0) });
      lowerBand.push({ x: currentX, y: Math.max(0, mean - sd * 2.0) });
    }

    console.log('Chart Data Summary:', {
      dataPoints: scatterPoints.length,
      windowSize,
      maxDuration: Math.max(...scatterPoints.map(p => p.y)),
      minDuration: Math.min(...scatterPoints.map(p => p.y)),
      avgDuration: (scatterPoints.reduce((a, p) => a + p.y, 0) / scatterPoints.length).toFixed(1)
    });

    return { 
      scatterPoints, 
      trendLine,
      upperBand,
      lowerBand
    };
  }
}
