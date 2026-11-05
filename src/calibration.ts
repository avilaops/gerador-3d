import type { EquipmentCalibration } from './spec/schema';

export interface CalibrationReport {
  status: 'not_provided' | 'insufficient_landmarks' | 'calibrated';
  landmarks: number;
  rmsePx: number;
  maxErrorPx: number;
}

/**
 * Avalia uma calibração por landmarks usando uma projeção afim 3D→2D.
 * O resultado mede fidelidade da referência; não altera a geometria sozinho.
 */
export function evaluateCalibration(calibration?: EquipmentCalibration): CalibrationReport {
  if (!calibration?.landmarks?.length) return { status: 'not_provided', landmarks: 0, rmsePx: 0, maxErrorPx: 0 };
  const points = calibration.landmarks;
  if (points.length < 4) return { status: 'insufficient_landmarks', landmarks: points.length, rmsePx: 0, maxErrorPx: 0 };
  const rows = points.map((point) => [point.model[0], point.model[1], point.model[2], 1]);
  const u = points.map((point) => point.image[0]);
  const v = points.map((point) => point.image[1]);
  const au = solveLeastSquares(rows, u);
  const av = solveLeastSquares(rows, v);
  if (!au || !av) return { status: 'insufficient_landmarks', landmarks: points.length, rmsePx: 0, maxErrorPx: 0 };
  const errors = rows.map((row, i) => {
    const du = dot(row, au) - u[i];
    const dv = dot(row, av) - v[i];
    return Math.hypot(du, dv);
  });
  return {
    status: 'calibrated',
    landmarks: points.length,
    rmsePx: Math.sqrt(errors.reduce((sum, value) => sum + value * value, 0) / errors.length),
    maxErrorPx: Math.max(...errors),
  };
}

function solveLeastSquares(rows: number[][], values: number[]): number[] | undefined {
  const n = 4;
  const matrix = Array.from({ length: n }, () => Array(n + 1).fill(0));
  for (let r = 0; r < rows.length; r++) {
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) matrix[i][j] += rows[r][i] * rows[r][j];
      matrix[i][n] += rows[r][i] * values[r];
    }
  }
  for (let pivot = 0; pivot < n; pivot++) {
    let best = pivot;
    for (let r = pivot + 1; r < n; r++) if (Math.abs(matrix[r][pivot]) > Math.abs(matrix[best][pivot])) best = r;
    if (Math.abs(matrix[best][pivot]) < 1e-10) return undefined;
    [matrix[pivot], matrix[best]] = [matrix[best], matrix[pivot]];
    const divisor = matrix[pivot][pivot];
    for (let c = pivot; c <= n; c++) matrix[pivot][c] /= divisor;
    for (let r = 0; r < n; r++) {
      if (r === pivot) continue;
      const factor = matrix[r][pivot];
      for (let c = pivot; c <= n; c++) matrix[r][c] -= factor * matrix[pivot][c];
    }
  }
  return matrix.map((row) => row[n]);
}

function dot(a: number[], b: number[]): number {
  return a.reduce((sum, value, i) => sum + value * b[i], 0);
}
