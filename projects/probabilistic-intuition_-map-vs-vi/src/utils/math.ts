
export interface Distribution {
  pdf: (x: number) => number;
  logPdf: (x: number) => number;
}

export class GaussianMixture implements Distribution {
  constructor(
    public means: number[],
    public sigmas: number[],
    public weights: number[]
  ) {}

  pdf(x: number): number {
    let sum = 0;
    for (let i = 0; i < this.means.length; i++) {
      const diff = x - this.means[i];
      const exponent = -0.5 * (diff * diff) / (this.sigmas[i] * this.sigmas[i]);
      const norm = 1 / (this.sigmas[i] * Math.sqrt(2 * Math.PI));
      sum += this.weights[i] * norm * Math.exp(exponent);
    }
    return sum;
  }

  logPdf(x: number): number {
    return Math.log(Math.max(this.pdf(x), 1e-10));
  }

  // Gradient of log-pdf for MAP
  gradLogPdf(x: number): number {
    const h = 0.001;
    return (this.logPdf(x + h) - this.logPdf(x - h)) / (2 * h);
  }
}

export class Gaussian implements Distribution {
  constructor(public mu: number, public sigma: number) {}

  pdf(x: number): number {
    const diff = x - this.mu;
    const exponent = -0.5 * (diff * diff) / (this.sigma * this.sigma);
    const norm = 1 / (this.sigma * Math.sqrt(2 * Math.PI));
    return norm * Math.exp(exponent);
  }

  logPdf(x: number): number {
    const diff = x - this.mu;
    return -0.5 * Math.log(2 * Math.PI) - Math.log(this.sigma) - 0.5 * (diff * diff) / (this.sigma * this.sigma);
  }
}

// Simple gradient ascent for MAP
export function optimizeMAP(dist: GaussianMixture, startX: number, lr = 0.1, steps = 100): number {
  let x = startX;
  for (let i = 0; i < steps; i++) {
    const grad = dist.gradLogPdf(x);
    x += lr * grad;
  }
  return x;
}

// Simple ELBO optimization for VI (Gaussian q)
// ELBO = E_q[log p(x, z)] - E_q[log q(z)]
// Since we only have p(z|x) (the posterior), we approximate KL(q||p)
// Minimizing KL(q||p) is equivalent to maximizing ELBO
export function optimizeVI(
  target: GaussianMixture,
  initialMu: number,
  initialSigma: number,
  lr = 0.05,
  steps = 200
): { mu: number; sigma: number } {
  let mu = initialMu;
  let logSigma = Math.log(initialSigma);

  // Use reparameterization trick for gradients if we were doing stochastic VI
  // But for 1D we can just use numerical integration or sampling
  const numSamples = 50;

  for (let i = 0; i < steps; i++) {
    let gradMu = 0;
    let gradLogSigma = 0;

    const sigma = Math.exp(logSigma);

    for (let s = 0; s < numSamples; s++) {
      // Sample epsilon ~ N(0, 1)
      const eps = boxMuller();
      const z = mu + eps * sigma;

      // Gradient of log q(z) wrt mu and logSigma
      // log q(z) = -0.5 log(2pi) - log sigma - 0.5 (z-mu)^2 / sigma^2
      // d/dmu log q(z) = (z-mu) / sigma^2
      // d/dlogSigma log q(z) = -1 + (z-mu)^2 / sigma^2

      const scoreMu = (z - mu) / (sigma * sigma);
      const scoreLogSigma = -1 + ((z - mu) * (z - mu)) / (sigma * sigma);

      // Gradient of (log p(z) - log q(z)) * log q(z) is not quite right for black box
      // We use the pathwise gradient (reparameterization)
      // d/dmu [log p(mu + eps*sigma) - log q(mu + eps*sigma)]
      // d/dmu log p(z) = target.gradLogPdf(z)
      // d/dmu log q(z) = 0 (because the entropy of Gaussian depends only on sigma)
      // Wait, E_q[log q] = -0.5 log(2pi e sigma^2)
      // d/dmu Entropy = 0
      // d/dlogSigma Entropy = 1

      gradMu += target.gradLogPdf(z);
      gradLogSigma += target.gradLogPdf(z) * eps * sigma + 1;
    }

    mu += lr * (gradMu / numSamples);
    logSigma += lr * (gradLogSigma / numSamples);
  }

  return { mu, sigma: Math.exp(logSigma) };
}

function boxMuller(): number {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
