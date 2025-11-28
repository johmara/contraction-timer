import { Injectable } from '@angular/core';

export interface Point {
  x: number;
  y: number;
}

@Injectable({
  providedIn: 'root'
})
export class RegressionService {

  /**
   * Fits a 2nd degree polynomial (Parabola) to the data: y = ax^2 + bx + c
   * Useful for modeling the accelerating nature of labor contractions.
   * @param weighted If true, assigns higher weight to recent data points (linear ramp 1->10)
   */
  fitPolynomial(points: Point[], degree: number = 2, weighted: boolean = false): { predict: (x: number) => number, coefficients: number[] } {
    if (points.length < degree + 1) {
      return { predict: () => 0, coefficients: [] };
    }

    // Normalized X to avoid huge numbers (timestamps)
    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    const rangeX = maxX - minX || 1;
    
    const normalizedPoints = points.map(p => ({
      x: (p.x - minX) / rangeX,
      y: p.y
    }));

    // Weighted Least Squares for Quadratic (Degree 2)
    // Matrix equation: X^T * W * X * B = X^T * W * Y
    
    let sumW = 0;
    let sumWX = 0, sumWX2 = 0, sumWX3 = 0, sumWX4 = 0;
    let sumWY = 0, sumWXY = 0, sumWX2Y = 0;

    for (let i = 0; i < normalizedPoints.length; i++) {
      const p = normalizedPoints[i];
      const x = p.x;
      const x2 = x * x;
      
      // Weighting: Linear ramp from 1 to 10 for recent points
      const weight = weighted ? (1 + 9 * (i / (normalizedPoints.length - 1 || 1))) : 1;
      
      sumW += weight;
      sumWX += weight * x;
      sumWX2 += weight * x2;
      sumWX3 += weight * x2 * x;
      sumWX4 += weight * x2 * x2;
      
      sumWY += weight * p.y;
      sumWXY += weight * x * p.y;
      sumWX2Y += weight * x2 * p.y;
    }

    // Solving 3x3 linear system
    // [ sumW     sumWX    sumWX2 ] [ a ]   [ sumWY   ]
    // [ sumWX    sumWX2   sumWX3 ] [ b ] = [ sumWXY  ]
    // [ sumWX2   sumWX3   sumWX4 ] [ c ]   [ sumWX2Y ]

    const matrix = [
      [sumW, sumWX, sumWX2],
      [sumWX, sumWX2, sumWX3],
      [sumWX2, sumWX3, sumWX4]
    ];
    
    const right = [sumWY, sumWXY, sumWX2Y];
    
    const coeffs = this.solveLinearSystem(matrix, right); // [a, b, c]
    
    return {
      predict: (timestamp: number) => {
        const normX = (timestamp - minX) / rangeX;
        // y = a + bx + cx^2
        return coeffs[0] + coeffs[1] * normX + coeffs[2] * normX * normX;
      },
      coefficients: coeffs
    };
  }

  /**
   * Fits an exponential curve: y = a * e^(bx)
   * Linearized as: ln(y) = ln(a) + bx
   */
  fitExponential(points: Point[], weighted: boolean = false): { predict: (x: number) => number, coefficients: number[] } {
    if (points.length < 2) {
      return { predict: () => 0, coefficients: [] };
    }

    // Normalized X
    const minX = Math.min(...points.map(p => p.x));
    const maxX = Math.max(...points.map(p => p.x));
    const rangeX = maxX - minX || 1;

    // Filter out y <= 0 for log
    const validPoints = points.filter(p => p.y > 0);
    if (validPoints.length < 2) return { predict: () => 0, coefficients: [] };

    // Prepare for Linear Fit on (x, ln(y))
    const linearizedPoints = validPoints.map(p => ({
      x: (p.x - minX) / rangeX,
      y: Math.log(p.y)
    }));

    // Reuse fitLinear logic manually or call it if refactored, but here we inline for WLS support
    let sumW = 0;
    let sumWX = 0, sumWY = 0, sumWXY = 0, sumWXX = 0;

    for (let i = 0; i < linearizedPoints.length; i++) {
      const p = linearizedPoints[i];
      const weight = weighted ? (1 + 9 * (i / (linearizedPoints.length - 1 || 1))) : 1;

      sumW += weight;
      sumWX += weight * p.x;
      sumWY += weight * p.y;
      sumWXY += weight * p.x * p.y;
      sumWXX += weight * p.x * p.x;
    }

    const denominator = sumW * sumWXX - sumWX * sumWX;
    if (Math.abs(denominator) < 1e-9) return { predict: () => 0, coefficients: [] };

    const slope = (sumW * sumWXY - sumWX * sumWY) / denominator;
    const intercept = (sumWY - slope * sumWX) / sumW;

    const a = Math.exp(intercept);
    const b = slope;

    return {
      predict: (timestamp: number) => {
        const normX = (timestamp - minX) / rangeX;
        return a * Math.exp(b * normX);
      },
      coefficients: [a, b]
    };
  }

  /**
   * Automatically selects the best fit (Polynomial vs Exponential) based on RMSE.
   */
  fitBest(points: Point[], weighted: boolean = false): { predict: (x: number) => number, type: 'poly' | 'exp' } {
    const poly = this.fitPolynomial(points, 2, weighted);
    const exp = this.fitExponential(points, weighted);

    const rmsePoly = this.calculateRMSE(points, poly.predict, weighted);
    const rmseExp = this.calculateRMSE(points, exp.predict, weighted);

    // Prefer Exponential if it's significantly better (e.g., > 5% improvement) to capture rapid onset
    // Otherwise stick to Polynomial as it's more stable
    if (rmseExp < rmsePoly * 0.95) {
      return { predict: exp.predict, type: 'exp' };
    }
    return { predict: poly.predict, type: 'poly' };
  }

  private calculateRMSE(points: Point[], predictFn: (x: number) => number, weighted: boolean): number {
    let sumSqErr = 0;
    let sumW = 0;
    
    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      const weight = weighted ? (1 + 9 * (i / (points.length - 1 || 1))) : 1;
      const err = p.y - predictFn(p.x);
      sumSqErr += weight * err * err;
      sumW += weight;
    }
    
    return Math.sqrt(sumSqErr / sumW);
  }

  /**
   * Fits a simple line: y = mx + c
   * Useful for predicting linear trends like variance decay.
   */
  fitLinear(points: Point[]): { predict: (x: number) => number, coefficients: number[], zeroCrossing: number | null } {
    if (points.length < 2) {
      return { predict: () => 0, coefficients: [0, 0], zeroCrossing: null };
    }

    const n = points.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
      sumXY += p.x * p.y;
      sumXX += p.x * p.x;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return {
      predict: (x: number) => slope * x + intercept,
      coefficients: [intercept, slope],
      // Find x where y = 0  =>  0 = mx + c  =>  x = -c/m
      // Only valid if slope is negative (decaying to zero)
      zeroCrossing: slope < 0 ? -intercept / slope : null
    };
  }

  /**
   * Calculates predicted delivery time by finding where upper and lower confidence bands intersect.
   * This is the same algorithm used by the chart visualization.
   */
  predictDeliveryTime(contractions: { startTime: Date, duration?: number }[]): { time: Date | null, confidence: 'low' | 'medium' | 'high' } {
    // Need completed contractions with duration
    const points: Point[] = contractions
      .filter(c => c.duration)
      .map(c => ({ x: c.startTime.getTime(), y: c.duration! }));

    if (points.length < 3) {
      return { time: null, confidence: 'low' };
    }

    // Sort by time
    points.sort((a, b) => a.x - b.x);

    // Detect active labor start (3 consecutive contractions < 6 minutes apart)
    let activeLaborStartIndex = 0;
    const FREQ_THRESHOLD_MS = 6 * 60 * 1000;
    let consistentCount = 0;

    for (let i = 1; i < points.length; i++) {
      const freq = points[i].x - points[i - 1].x;
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
      activeLaborStartIndex = Math.floor(points.length * 0.5);
    }

    // Use active phase points
    const activePoints = points.slice(activeLaborStartIndex);

    if (activePoints.length < 3) {
      return { time: null, confidence: 'low' };
    }

    // Calculate rolling statistics for confidence bands
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

    // Fit models for upper and lower bands
    const upperFit = this.fitBest(rawUpper, true);
    const lowerFit = this.fitBest(rawLower, true);

    // Project forward to find intersection
    const lastTime = points[points.length - 1].x;
    const maxProjectionTime = lastTime + 12 * 60 * 60 * 1000; // 12 hours
    const stepSize = 5 * 60 * 1000; // 5 minutes

    for (let t = lastTime + stepSize; t <= maxProjectionTime; t += stepSize) {
      const uY = upperFit.predict(t);
      const lY = Math.max(0, lowerFit.predict(t));

      // Check for intersection (bands converge)
      if (uY <= lY) {
        // Determine confidence based on active phase characteristics
        const avgFrequency = activePoints.length > 1
          ? activePoints.slice(1).reduce((sum, p, i) => sum + (p.x - activePoints[i].x), 0) / (activePoints.length - 1)
          : 0;

        const avgDuration = activePoints.reduce((sum, p) => sum + p.y, 0) / activePoints.length;

        let confidence: 'low' | 'medium' | 'high' = 'low';
        if (avgFrequency < 180000 && avgDuration >= 45) { // < 3 min, >= 45 sec
          confidence = 'high';
        } else if (avgFrequency < 300000 && avgDuration >= 45) { // < 5 min
          confidence = 'medium';
        } else if (activePoints.length >= 10) {
          confidence = 'medium';
        }

        return { time: new Date(t), confidence };
      }
    }

    // No intersection found within 12 hours
    return { time: null, confidence: 'low' };
  }

  /**
   * Gaussian elimination to solve Ax = B
   */
  private solveLinearSystem(A: number[][], B: number[]): number[] {
    const n = B.length;

    for (let i = 0; i < n; i++) {
      // Pivot
      let maxEl = Math.abs(A[i][i]);
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(A[k][i]) > maxEl) {
          maxEl = Math.abs(A[k][i]);
          maxRow = k;
        }
      }

      // Swap rows
      for (let k = i; k < n; k++) {
        const tmp = A[maxRow][k];
        A[maxRow][k] = A[i][k];
        A[i][k] = tmp;
      }
      const tmp = B[maxRow];
      B[maxRow] = B[i];
      B[i] = tmp;

      // Eliminate
      for (let k = i + 1; k < n; k++) {
        const c = -A[k][i] / A[i][i];
        for (let j = i; j < n; j++) {
          if (i === j) {
            A[k][j] = 0;
          } else {
            A[k][j] += c * A[i][j];
          }
        }
        B[k] += c * B[i];
      }
    }

    // Back substitution
    const x = new Array(n).fill(0);
    for (let i = n - 1; i > -1; i--) {
      let sum = 0;
      for (let j = i + 1; j < n; j++) {
        sum += A[i][j] * x[j];
      }
      x[i] = (B[i] - sum) / A[i][i];
    }
    return x;
  }
}
