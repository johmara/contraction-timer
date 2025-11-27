import { Component, Input, OnChanges, SimpleChanges, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { ContractionSession } from '../../models/contraction.model';

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
      type: 'bar',
      data: {
        labels: data.labels,
        datasets: [
          {
            label: 'Duration (sec)',
            data: data.durations,
            backgroundColor: 'rgba(255, 182, 193, 0.7)', // Soft pink
            borderColor: 'rgba(255, 159, 181, 1)',
            borderWidth: 3,
            borderRadius: 12,
            barThickness: 'flex',
            maxBarThickness: 50
          },
          {
            label: 'Frequency (sec)',
            data: data.frequencies,
            backgroundColor: 'rgba(180, 215, 255, 0.7)', // Soft blue
            borderColor: 'rgba(139, 195, 255, 1)',
            borderWidth: 3,
            borderRadius: 12,
            barThickness: 'flex',
            maxBarThickness: 50
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1.8,
        interaction: {
          mode: 'index',
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
            title: {
              display: true,
              text: 'Contraction #',
              font: {
                size: 13,
                weight: 'bold'
              },
              color: '#7A7A7A'
            },
            grid: {
              display: false
            },
            ticks: {
              color: '#7A7A7A',
              font: {
                size: 12
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
                size: 13,
                weight: 'bold'
              },
              padding: 16,
              usePointStyle: true,
              pointStyle: 'circle',
              boxWidth: 8,
              boxHeight: 8,
              color: '#3D3D3D'
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
    this.chart.data.labels = data.labels;
    this.chart.data.datasets[0].data = data.durations;
    this.chart.data.datasets[1].data = data.frequencies;
    this.chart.update();
  }

  private prepareChartData(): { labels: string[], durations: number[], frequencies: number[] } {
    if (!this.session || !this.session.contractions.length) {
      return { labels: [], durations: [], frequencies: [] };
    }

    const labels: string[] = [];
    const durations: number[] = [];
    const frequencies: number[] = [];

    this.session.contractions.forEach((contraction, index) => {
      labels.push(`#${index + 1}`);
      durations.push(contraction.duration ?? 0);
      frequencies.push(contraction.frequency ?? 0);
    });

    return { labels, durations, frequencies };
  }
}
