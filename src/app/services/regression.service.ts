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
   */
  fitPolynomial(points: Point[], degree: number = 2): { predict: (x: number) => number, coefficients: number[] } {
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

    // Simple Least Squares for Quadratic (Degree 2)
    // Matrix equation: X^T * X * B = X^T * Y
    // For degree 2: y = a + bx + cx^2
    
    let n = normalizedPoints.length;
    let sumX = 0, sumX2 = 0, sumX3 = 0, sumX4 = 0;
    let sumY = 0, sumXY = 0, sumX2Y = 0;

    for (const p of normalizedPoints) {
      const x = p.x;
      const x2 = x * x;
      sumX += x;
      sumX2 += x2;
      sumX3 += x2 * x;
      sumX4 += x2 * x2;
      sumY += p.y;
      sumXY += x * p.y;
      sumX2Y += x2 * p.y;
    }

    // Solving 3x3 linear system using Cramer's rule or Gaussian elimination
    // [ n      sumX    sumX2 ] [ a ]   [ sumY   ]
    // [ sumX   sumX2   sumX3 ] [ b ] = [ sumXY  ]
    // [ sumX2  sumX3   sumX4 ] [ c ]   [ sumX2Y ]

    const matrix = [
      [n, sumX, sumX2],
      [sumX, sumX2, sumX3],
      [sumX2, sumX3, sumX4]
    ];
    
    const right = [sumY, sumXY, sumX2Y];
    
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
