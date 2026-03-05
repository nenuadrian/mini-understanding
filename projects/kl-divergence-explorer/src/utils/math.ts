/**
 * Math utilities for KL Divergence Explorer
 */

export interface GaussianParams {
  mean: number;
  variance: number;
  weight?: number;
}

export const gaussianPdf = (x: number, mean: number, variance: number): number => {
  const stdDev = Math.sqrt(variance);
  if (stdDev === 0) return x === mean ? 1 : 0;
  const exponent = -Math.pow(x - mean, 2) / (2 * variance);
  return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
};

export const mixturePdf = (x: number, components: GaussianParams[]): number => {
  return components.reduce((acc, comp) => {
    return acc + (comp.weight || 0) * gaussianPdf(x, comp.mean, comp.variance);
  }, 0);
};

export const calculateEntropy = (
  pdf: (x: number) => number,
  range: [number, number],
  steps: number = 200
): number => {
  const [min, max] = range;
  const dx = (max - min) / steps;
  let entropy = 0;

  for (let i = 0; i < steps; i++) {
    const x = min + i * dx;
    const p = pdf(x);
    if (p > 1e-10) {
      entropy -= p * Math.log(p) * dx;
    }
  }
  return entropy;
};

export const calculateVariance = (
  pdf: (x: number) => number,
  mean: number,
  range: [number, number],
  steps: number = 200
): number => {
  const [min, max] = range;
  const dx = (max - min) / steps;
  let variance = 0;

  for (let i = 0; i < steps; i++) {
    const x = min + i * dx;
    const p = pdf(x);
    variance += p * Math.pow(x - mean, 2) * dx;
  }
  return variance;
};

export const calculateMean = (
  pdf: (x: number) => number,
  range: [number, number],
  steps: number = 200
): number => {
  const [min, max] = range;
  const dx = (max - min) / steps;
  let mean = 0;

  for (let i = 0; i < steps; i++) {
    const x = min + i * dx;
    const p = pdf(x);
    mean += x * p * dx;
  }
  return mean;
};

export const calculateKL = (
  pPdf: (x: number) => number,
  qPdf: (x: number) => number,
  range: [number, number],
  steps: number = 200
): number => {
  const [min, max] = range;
  const dx = (max - min) / steps;
  let kl = 0;

  for (let i = 0; i < steps; i++) {
    const x = min + i * dx;
    const p = pPdf(x);
    const q = qPdf(x);
    
    if (p > 1e-10 && q > 1e-10) {
      kl += p * Math.log(p / q) * dx;
    } else if (p > 1e-10 && q <= 1e-10) {
      // In theory KL is infinite if P > 0 and Q = 0
      // For visualization, we'll cap it or handle it gracefully
      kl += p * 10 * dx; 
    }
  }
  return Math.max(0, kl);
};
