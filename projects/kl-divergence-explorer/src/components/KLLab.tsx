import React, { useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { 
  Settings2, 
  Info, 
  TrendingUp, 
  Activity, 
  Layers,
  Zap,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  gaussianPdf, 
  mixturePdf, 
  calculateKL, 
  calculateEntropy, 
  calculateVariance,
  calculateMean,
  GaussianParams 
} from '../utils/math';

const RANGE: [number, number] = [-8, 8];
const STEPS = 150;

export default function KLLab() {
  // Target Distribution P (Mixture of 2 Gaussians)
  const [p1, setP1] = useState<GaussianParams>({ mean: -2, variance: 1, weight: 0.5 });
  const [p2, setP2] = useState<GaussianParams>({ mean: 2, variance: 1, weight: 0.5 });
  
  // Approximating Distribution Q (Single Gaussian)
  const [q, setQ] = useState<GaussianParams>({ mean: 0, variance: 2 });

  const [showExplanation, setShowExplanation] = useState(false);

  // Generate data for the chart
  const chartData = useMemo(() => {
    const data = [];
    const dx = (RANGE[1] - RANGE[0]) / STEPS;
    for (let i = 0; i <= STEPS; i++) {
      const x = RANGE[0] + i * dx;
      const pVal = mixturePdf(x, [p1, p2]);
      const qVal = gaussianPdf(x, q.mean, q.variance);
      data.push({
        x: Number(x.toFixed(2)),
        P: pVal,
        Q: qVal,
        diff: Math.abs(pVal - qVal),
      });
    }
    return data;
  }, [p1, p2, q]);

  // Calculate Metrics
  const metrics = useMemo(() => {
    const pPdf = (x: number) => mixturePdf(x, [p1, p2]);
    const qPdf = (x: number) => gaussianPdf(x, q.mean, q.variance);

    const forwardKL = calculateKL(pPdf, qPdf, RANGE, STEPS);
    const reverseKL = calculateKL(qPdf, pPdf, RANGE, STEPS);
    
    const pEntropy = calculateEntropy(pPdf, RANGE, STEPS);
    const qEntropy = calculateEntropy(qPdf, RANGE, STEPS);
    
    const pMean = calculateMean(pPdf, RANGE, STEPS);
    const pVar = calculateVariance(pPdf, pMean, RANGE, STEPS);
    const qVar = q.variance;

    return {
      forwardKL,
      reverseKL,
      pEntropy,
      qEntropy,
      pVar,
      qVar
    };
  }, [p1, p2, q]);

  const updateP1 = (updates: Partial<GaussianParams>) => setP1(prev => ({ ...prev, ...updates }));
  const updateP2 = (updates: Partial<GaussianParams>) => setP2(prev => ({ ...prev, ...updates }));
  const updateQ = (updates: Partial<GaussianParams>) => setQ(prev => ({ ...prev, ...updates }));

  // Presets
  const setModeSeeking = () => {
    setQ({ mean: p1.mean, variance: p1.variance * 0.8 });
  };

  const setMeanSeeking = () => {
    const pMean = (p1.mean * (p1.weight || 0.5) + p2.mean * (p2.weight || 0.5));
    // Approximate variance of mixture
    const pVar = metrics.pVar;
    setQ({ mean: pMean, variance: pVar });
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Header Section */}
        <header className="lg:col-span-12 mb-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#141414] pb-6">
            <div>
              <h1 className="text-5xl md:text-7xl font-bold tracking-tighter uppercase leading-none">
                KL Divergence <span className="italic font-serif font-light lowercase">Explorer</span>
              </h1>
              <p className="mt-4 text-sm font-mono opacity-60 uppercase tracking-widest">
                Forward (Mean-Seeking) vs Reverse (Mode-Seeking)
              </p>
            </div>
            <button 
              onClick={() => setShowExplanation(!showExplanation)}
              className="flex items-center gap-2 px-4 py-2 border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors text-xs font-mono uppercase tracking-wider"
            >
              {showExplanation ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              Explanation
            </button>
          </div>
        </header>

        {/* Explanation Panel */}
        <AnimatePresence>
          {showExplanation && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="lg:col-span-12 overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-white/50 border border-[#141414] mb-8">
                <div>
                  <h3 className="font-serif italic text-xl mb-3">Forward KL: D(P || Q)</h3>
                  <p className="text-sm leading-relaxed opacity-80">
                    The "Mean-Seeking" divergence. It forces Q to cover all areas where P has high probability. 
                    If P is multi-modal, Q will often stretch to cover all modes, resulting in a high-variance approximation 
                    that puts mass in the "valleys" between modes.
                  </p>
                  <div className="mt-4 font-mono text-xs bg-[#141414] text-[#E4E3E0] p-3 rounded">
                    ∫ P(x) log(P(x)/Q(x)) dx
                  </div>
                </div>
                <div>
                  <h3 className="font-serif italic text-xl mb-3">Reverse KL: D(Q || P)</h3>
                  <p className="text-sm leading-relaxed opacity-80">
                    The "Mode-Seeking" divergence. It forces Q to be zero wherever P is zero. 
                    Q will typically "collapse" onto one of the modes of P to avoid putting mass in areas where P is low. 
                    This is commonly used in Variational Inference.
                  </p>
                  <div className="mt-4 font-mono text-xs bg-[#141414] text-[#E4E3E0] p-3 rounded">
                    ∫ Q(x) log(Q(x)/P(x)) dx
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sidebar: Controls */}
        <aside className="lg:col-span-4 space-y-6">
          
          {/* Distribution P Controls */}
          <section className="border border-[#141414] p-6 bg-white/30">
            <div className="flex items-center gap-2 mb-6 border-b border-[#141414] pb-2">
              <Layers size={18} />
              <h2 className="font-mono text-xs uppercase tracking-widest font-bold">Target Distribution P (Mixture)</h2>
            </div>
            
            <div className="space-y-8">
              {/* Component 1 */}
              <div>
                <div className="flex justify-between text-[10px] font-mono uppercase opacity-50 mb-2">
                  <span>Mode 1 Mean</span>
                  <span>{p1.mean.toFixed(1)}</span>
                </div>
                <input 
                  type="range" min="-5" max="5" step="0.1" value={p1.mean}
                  onChange={(e) => updateP1({ mean: parseFloat(e.target.value) })}
                  className="w-full accent-[#141414]"
                />
                <div className="flex justify-between text-[10px] font-mono uppercase opacity-50 mt-4 mb-2">
                  <span>Mode 1 Variance</span>
                  <span>{p1.variance.toFixed(1)}</span>
                </div>
                <input 
                  type="range" min="0.1" max="4" step="0.1" value={p1.variance}
                  onChange={(e) => updateP1({ variance: parseFloat(e.target.value) })}
                  className="w-full accent-[#141414]"
                />
              </div>

              {/* Component 2 */}
              <div className="pt-4 border-t border-[#141414]/10">
                <div className="flex justify-between text-[10px] font-mono uppercase opacity-50 mb-2">
                  <span>Mode 2 Mean</span>
                  <span>{p2.mean.toFixed(1)}</span>
                </div>
                <input 
                  type="range" min="-5" max="5" step="0.1" value={p2.mean}
                  onChange={(e) => updateP2({ mean: parseFloat(e.target.value) })}
                  className="w-full accent-[#141414]"
                />
                <div className="flex justify-between text-[10px] font-mono uppercase opacity-50 mt-4 mb-2">
                  <span>Mode 2 Variance</span>
                  <span>{p2.variance.toFixed(1)}</span>
                </div>
                <input 
                  type="range" min="0.1" max="4" step="0.1" value={p2.variance}
                  onChange={(e) => updateP2({ variance: parseFloat(e.target.value) })}
                  className="w-full accent-[#141414]"
                />
              </div>
            </div>
          </section>

          {/* Distribution Q Controls */}
          <section className="border border-[#141414] p-6 bg-white">
            <div className="flex items-center gap-2 mb-6 border-b border-[#141414] pb-2">
              <Settings2 size={18} />
              <h2 className="font-mono text-xs uppercase tracking-widest font-bold">Approximation Q (Gaussian)</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-[10px] font-mono uppercase opacity-50 mb-2">
                  <span>Mean (μ)</span>
                  <span>{q.mean.toFixed(1)}</span>
                </div>
                <input 
                  type="range" min="-5" max="5" step="0.1" value={q.mean}
                  onChange={(e) => updateQ({ mean: parseFloat(e.target.value) })}
                  className="w-full accent-[#141414]"
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-mono uppercase opacity-50 mb-2">
                  <span>Variance (σ²)</span>
                  <span>{q.variance.toFixed(1)}</span>
                </div>
                <input 
                  type="range" min="0.1" max="10" step="0.1" value={q.variance}
                  onChange={(e) => updateQ({ variance: parseFloat(e.target.value) })}
                  className="w-full accent-[#141414]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-4">
                <button 
                  onClick={setMeanSeeking}
                  className="px-3 py-2 border border-[#141414] text-[10px] font-mono uppercase hover:bg-[#141414] hover:text-white transition-all"
                >
                  Fit Forward KL
                </button>
                <button 
                  onClick={setModeSeeking}
                  className="px-3 py-2 border border-[#141414] text-[10px] font-mono uppercase hover:bg-[#141414] hover:text-white transition-all"
                >
                  Fit Reverse KL
                </button>
              </div>
            </div>
          </section>
        </aside>

        {/* Main Content: Visualization & Metrics */}
        <main className="lg:col-span-8 space-y-8">
          
          {/* Chart Area */}
          <div className="border border-[#141414] p-6 bg-white h-[450px] relative">
            <div className="absolute top-4 left-6 z-10">
              <h3 className="font-serif italic text-2xl">Probability Density</h3>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 60, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#141414" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#141414" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorQ" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F27D26" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#F27D26" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                <XAxis 
                  dataKey="x" 
                  axisLine={{ stroke: '#141414' }} 
                  tick={{ fontSize: 10, fontFamily: 'monospace' }}
                />
                <YAxis 
                  axisLine={{ stroke: '#141414' }} 
                  tick={{ fontSize: 10, fontFamily: 'monospace' }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#141414', 
                    color: '#E4E3E0', 
                    border: 'none',
                    fontFamily: 'monospace',
                    fontSize: '10px'
                  }}
                  itemStyle={{ color: '#E4E3E0' }}
                />
                <Legend 
                  verticalAlign="top" 
                  align="right" 
                  iconType="circle"
                  wrapperStyle={{ 
                    paddingBottom: '20px', 
                    fontSize: '10px', 
                    fontFamily: 'monospace',
                    textTransform: 'uppercase'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="P" 
                  stroke="#141414" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorP)" 
                  name="Target P"
                />
                <Area 
                  type="monotone" 
                  dataKey="Q" 
                  stroke="#F27D26" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorQ)" 
                  name="Approximation Q"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* KL Divergences */}
            <div className="md:col-span-2 border border-[#141414] p-6 bg-[#141414] text-[#E4E3E0]">
              <div className="flex items-center gap-2 mb-6 border-b border-white/20 pb-2">
                <Zap size={16} className="text-[#F27D26]" />
                <h2 className="font-mono text-[10px] uppercase tracking-widest font-bold">Divergence Metrics</h2>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <div className="text-[10px] font-mono uppercase opacity-50 mb-1">Forward KL D(P||Q)</div>
                  <div className="text-4xl font-bold tracking-tighter">{metrics.forwardKL.toFixed(4)}</div>
                  <div className="mt-2 text-[10px] font-mono uppercase text-[#F27D26]">
                    {metrics.forwardKL < metrics.reverseKL ? "Lower (Mean-Seeking)" : ""}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase opacity-50 mb-1">Reverse KL D(Q||P)</div>
                  <div className="text-4xl font-bold tracking-tighter">{metrics.reverseKL.toFixed(4)}</div>
                  <div className="mt-2 text-[10px] font-mono uppercase text-[#F27D26]">
                    {metrics.reverseKL < metrics.forwardKL ? "Lower (Mode-Seeking)" : ""}
                  </div>
                </div>
              </div>
            </div>

            {/* Entropy & Variance */}
            <div className="border border-[#141414] p-6 bg-white">
              <div className="flex items-center gap-2 mb-6 border-b border-[#141414] pb-2">
                <Activity size={16} />
                <h2 className="font-mono text-[10px] uppercase tracking-widest font-bold">System Stats</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-[10px] font-mono uppercase opacity-50">
                    <span>H(P) Entropy</span>
                    <span>{metrics.pEntropy.toFixed(2)}</span>
                  </div>
                  <div className="h-1 bg-[#141414]/10 mt-1">
                    <div className="h-full bg-[#141414]" style={{ width: `${Math.min(100, metrics.pEntropy * 20)}%` }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-mono uppercase opacity-50">
                    <span>H(Q) Entropy</span>
                    <span>{metrics.qEntropy.toFixed(2)}</span>
                  </div>
                  <div className="h-1 bg-[#141414]/10 mt-1">
                    <div className="h-full bg-[#F27D26]" style={{ width: `${Math.min(100, metrics.qEntropy * 20)}%` }} />
                  </div>
                </div>
                <div className="pt-2 border-t border-[#141414]/10">
                  <div className="flex justify-between text-[10px] font-mono uppercase opacity-50">
                    <span>Var(P)</span>
                    <span>{metrics.pVar.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-mono uppercase opacity-50">
                    <span>Var(Q)</span>
                    <span>{metrics.qVar.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Footer Info */}
          <footer className="border-t border-[#141414] pt-6 flex flex-col md:flex-row justify-between gap-4 opacity-40 text-[10px] font-mono uppercase tracking-widest">
            <div>Numerical Integration: Trapezoidal Rule (N={STEPS})</div>
            <div>Range: [{RANGE[0]}, {RANGE[1]}]</div>
          </footer>

        </main>
      </div>
    </div>
  );
}
