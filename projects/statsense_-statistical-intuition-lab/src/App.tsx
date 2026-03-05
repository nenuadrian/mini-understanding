/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, AreaChart, Area
} from 'recharts';
import { 
  Activity, 
  TrendingUp, 
  Hash, 
  RefreshCw, 
  Info, 
  Zap,
  Layers,
  Dices
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface CoinFlipResult {
  trial: number;
  value: number;
  runningAverage: number;
}

interface DistributionPoint {
  sum: number;
  count: number;
}

// --- Main App ---
export default function App() {
  const [activeTab, setActiveTab] = useState<'convergence' | 'distribution' | 'variance' | 'intuition'>('convergence');
  
  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0] relative overflow-x-hidden">
      {/* Background Grid */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]" 
           style={{ backgroundImage: 'radial-gradient(#141414 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
      
      {/* Header */}
      <header className="border-b border-[#141414] p-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4 relative z-10">
        <div>
          <h1 className="text-4xl font-bold tracking-tighter uppercase italic font-serif">StatSense</h1>
          <p className="text-xs font-mono opacity-60 mt-1 uppercase tracking-widest">Statistical Intuition Lab // v1.0.0</p>
        </div>
        <nav className="flex flex-wrap gap-x-8 gap-y-2">
          {(['convergence', 'distribution', 'variance', 'intuition'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "text-xs font-mono uppercase tracking-widest transition-all pb-1 border-b-2",
                activeTab === tab ? "border-[#141414] opacity-100" : "border-transparent opacity-40 hover:opacity-70"
              )}
            >
              {tab}
            </button>
          ))}
        </nav>
      </header>

      <main className="p-6 max-w-7xl mx-auto relative z-10 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'convergence' && <ConvergenceLab key="convergence" />}
          {activeTab === 'distribution' && <DistributionLab key="distribution" />}
          {activeTab === 'variance' && <VarianceLab key="variance" />}
          {activeTab === 'intuition' && <IntuitionLab key="intuition" />}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 border-t border-[#141414] bg-[#E4E3E0]/80 backdrop-blur-sm p-4 flex justify-between items-center px-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-mono uppercase tracking-widest opacity-60">Engine Active</span>
          </div>
          <div className="h-4 w-px bg-[#141414]/20" />
          <span className="text-[10px] font-mono uppercase tracking-widest opacity-40 italic">Expectation is the root of all statistical heartbreak</span>
        </div>
        <div className="text-[10px] font-mono uppercase tracking-widest opacity-40">
          © 2026 StatSense Research
        </div>
      </footer>
    </div>
  );
}

// --- Convergence Lab (Law of Large Numbers) ---
function ConvergenceLab() {
  const [flips, setFlips] = useState<CoinFlipResult[]>([]);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const addFlip = () => {
    setFlips(prev => {
      const nextTrial = prev.length + 1;
      const newValue = Math.random() > 0.5 ? 1 : 0;
      const newTotal = prev.reduce((acc, curr) => acc + curr.value, 0) + newValue;
      const newAvg = newTotal / nextTrial;
      
      return [...prev, { trial: nextTrial, value: newValue, runningAverage: newAvg }].slice(-1000);
    });
  };

  const reset = () => {
    setFlips([]);
    setIsAutoRunning(false);
  };

  useEffect(() => {
    if (isAutoRunning) {
      timerRef.current = setInterval(addFlip, 50);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isAutoRunning]);

  const currentAvg = flips.length > 0 ? flips[flips.length - 1].runningAverage : 0.5;
  const deviation = Math.abs(currentAvg - 0.5);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      {/* Control Panel */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white/40 border border-[#141414] p-6 rounded-sm shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5" />
            <h2 className="text-xl font-serif italic font-bold">The Convergence Lab</h2>
          </div>
          <p className="text-sm opacity-70 mb-6 leading-relaxed">
            Witness the <span className="font-bold underline">Law of Large Numbers</span>. As the number of trials increases, the sample mean converges to the expected value (0.5).
          </p>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={addFlip}
                className="flex items-center justify-center gap-2 bg-[#141414] text-[#E4E3E0] py-3 px-4 text-xs font-mono uppercase tracking-widest hover:bg-[#333] transition-colors"
              >
                <Zap className="w-4 h-4" /> Single Trial
              </button>
              <button 
                onClick={() => setIsAutoRunning(!isAutoRunning)}
                className={cn(
                  "flex items-center justify-center gap-2 py-3 px-4 text-xs font-mono uppercase tracking-widest border border-[#141414] transition-colors",
                  isAutoRunning ? "bg-red-500 text-white border-red-500" : "bg-transparent hover:bg-[#141414]/5"
                )}
              >
                {isAutoRunning ? <Activity className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
                {isAutoRunning ? "Stop" : "Auto Run"}
              </button>
            </div>
            <button 
              onClick={reset}
              className="w-full py-2 text-[10px] font-mono uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
            >
              Reset Simulation
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Total Trials" value={flips.length.toString()} icon={<Hash className="w-4 h-4" />} />
          <StatCard 
            label="Current Mean" 
            value={currentAvg.toFixed(4)} 
            icon={<Activity className="w-4 h-4" />} 
            subValue={`Δ ${deviation.toFixed(4)}`}
          />
        </div>

        <div className="bg-[#141414] text-[#E4E3E0] p-6 rounded-sm">
          <h3 className="text-xs font-mono uppercase tracking-widest mb-4 opacity-60">Intuition Check</h3>
          <p className="text-sm italic font-serif leading-relaxed">
            "We often expect small samples to represent the whole. This is the 'Law of Small Numbers'—a cognitive bias that leads to overconfidence in early results."
          </p>
        </div>
      </div>

      {/* Chart Area */}
      <div className="lg:col-span-2 bg-white/40 border border-[#141414] p-6 rounded-sm min-h-[500px] flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xs font-mono uppercase tracking-widest opacity-60">Running Average vs. Expected Value (0.5)</h3>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-[#141414]" />
              <span className="text-[10px] font-mono opacity-60">Sample Mean</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-red-500 border-dashed" />
              <span className="text-[10px] font-mono opacity-60">Expected</span>
            </div>
          </div>
        </div>
        
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={flips} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#141414" strokeOpacity={0.1} vertical={false} />
              <XAxis 
                dataKey="trial" 
                hide 
              />
              <YAxis 
                domain={[0, 1]} 
                ticks={[0, 0.25, 0.5, 0.75, 1]}
                tick={{ fontSize: 10, fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-[#141414] text-[#E4E3E0] p-3 text-xs font-mono border border-[#E4E3E0]/20">
                        <p>Trial: {payload[0].payload.trial}</p>
                        <p>Value: {payload[0].payload.value === 1 ? 'Heads' : 'Tails'}</p>
                        <p className="text-emerald-400">Mean: {payload[0].value?.toString()}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line 
                type="monotone" 
                dataKey="runningAverage" 
                stroke="#141414" 
                strokeWidth={2} 
                dot={false} 
                isAnimationActive={false}
              />
              <Line 
                type="step" 
                dataKey={() => 0.5} 
                stroke="#ef4444" 
                strokeWidth={1} 
                strokeDasharray="5 5" 
                dot={false} 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

// --- Distribution Lab (Central Limit Theorem) ---
function DistributionLab() {
  const [diceCount, setDiceCount] = useState(2);
  const [rolls, setRolls] = useState<number[]>([]);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const rollDice = () => {
    let sum = 0;
    for (let i = 0; i < diceCount; i++) {
      sum += Math.floor(Math.random() * 6) + 1;
    }
    setRolls(prev => [...prev, sum]);
  };

  const reset = () => {
    setRolls([]);
    setIsAutoRunning(false);
  };

  useEffect(() => {
    if (isAutoRunning) {
      timerRef.current = setInterval(rollDice, 10);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [isAutoRunning, diceCount]);

  const distributionData = useMemo(() => {
    const counts: Record<number, number> = {};
    const min = diceCount;
    const max = diceCount * 6;
    
    for (let i = min; i <= max; i++) counts[i] = 0;
    rolls.forEach(r => { if (counts[r] !== undefined) counts[r]++; });

    return Object.entries(counts).map(([sum, count]) => ({
      sum: parseInt(sum),
      count
    }));
  }, [rolls, diceCount]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white/40 border border-[#141414] p-6 rounded-sm shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
          <div className="flex items-center gap-2 mb-4">
            <Layers className="w-5 h-5" />
            <h2 className="text-xl font-serif italic font-bold">The Bell Curve</h2>
          </div>
          <p className="text-sm opacity-70 mb-6 leading-relaxed">
            The <span className="font-bold underline">Central Limit Theorem</span> states that the sum of independent random variables tends toward a normal distribution, regardless of the original distribution.
          </p>
          
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-mono uppercase tracking-widest opacity-60 block mb-2">Number of Dice: {diceCount}</label>
              <input 
                type="range" 
                min="1" 
                max="10" 
                value={diceCount} 
                onChange={(e) => {
                  setDiceCount(parseInt(e.target.value));
                  reset();
                }}
                className="w-full accent-[#141414]"
              />
              <div className="flex justify-between text-[10px] font-mono opacity-40 mt-1">
                <span>1 (Uniform)</span>
                <span>10 (Normal)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={rollDice}
                className="flex items-center justify-center gap-2 bg-[#141414] text-[#E4E3E0] py-3 px-4 text-xs font-mono uppercase tracking-widest hover:bg-[#333] transition-colors"
              >
                <Dices className="w-4 h-4" /> Roll
              </button>
              <button 
                onClick={() => setIsAutoRunning(!isAutoRunning)}
                className={cn(
                  "flex items-center justify-center gap-2 py-3 px-4 text-xs font-mono uppercase tracking-widest border border-[#141414] transition-colors",
                  isAutoRunning ? "bg-red-500 text-white border-red-500" : "bg-transparent hover:bg-[#141414]/5"
                )}
              >
                {isAutoRunning ? "Stop" : "Auto Roll"}
              </button>
            </div>
            <button 
              onClick={reset}
              className="w-full py-2 text-[10px] font-mono uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity"
            >
              Clear Data
            </button>
          </div>
        </div>

        <StatCard label="Total Rolls" value={rolls.length.toLocaleString()} icon={<Hash className="w-4 h-4" />} />
        
        <div className="bg-[#141414] text-[#E4E3E0] p-6 rounded-sm">
          <h3 className="text-xs font-mono uppercase tracking-widest mb-4 opacity-60">The CLT in Nature</h3>
          <p className="text-sm italic font-serif leading-relaxed">
            "The Central Limit Theorem is why so many things in the world follow a bell curve—from heights and test scores to the errors in scientific measurements. It is the 'Normal' in Normal Distribution."
          </p>
        </div>
      </div>

      <div className="lg:col-span-2 bg-white/40 border border-[#141414] p-6 rounded-sm min-h-[500px] flex flex-col">
        <h3 className="text-xs font-mono uppercase tracking-widest opacity-60 mb-6">Sum Distribution (Histogram)</h3>
        <div className="flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distributionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#141414" strokeOpacity={0.1} vertical={false} />
              <XAxis 
                dataKey="sum" 
                tick={{ fontSize: 10, fontFamily: 'monospace' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis 
                hide
              />
              <Tooltip 
                cursor={{ fill: '#141414', fillOpacity: 0.05 }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-[#141414] text-[#E4E3E0] p-3 text-xs font-mono border border-[#E4E3E0]/20">
                        <p>Sum: {payload[0].payload.sum}</p>
                        <p className="text-emerald-400">Frequency: {payload[0].value}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="count" fill="#141414" isAnimationActive={false}>
                {distributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fillOpacity={0.4 + (entry.count / Math.max(...distributionData.map(d => d.count || 1))) * 0.6} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </motion.div>
  );
}

// --- Variance Lab (Standard Deviation) ---
function VarianceLab() {
  const [stdDev, setStdDev] = useState(1);
  const [points, setPoints] = useState<{x: number, y: number}[]>([]);

  useEffect(() => {
    const newPoints = [];
    for (let i = 0; i < 500; i++) {
      // Box-Muller transform for normal distribution
      const u1 = Math.random();
      const u2 = Math.random();
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      newPoints.push({ x: z0 * stdDev, y: Math.random() });
    }
    setPoints(newPoints);
  }, [stdDev]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white/40 border border-[#141414] p-6 rounded-sm shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5" />
            <h2 className="text-xl font-serif italic font-bold">Variance Explorer</h2>
          </div>
          <p className="text-sm opacity-70 mb-6 leading-relaxed">
            Understand <span className="font-bold underline">Standard Deviation (σ)</span>. It measures how spread out numbers are from the average.
          </p>
          
          <div className="space-y-6">
            <div>
              <label className="text-[10px] font-mono uppercase tracking-widest opacity-60 block mb-2">Standard Deviation (σ): {stdDev.toFixed(2)}</label>
              <input 
                type="range" 
                min="0.1" 
                max="3" 
                step="0.1"
                value={stdDev} 
                onChange={(e) => setStdDev(parseFloat(e.target.value))}
                className="w-full accent-[#141414]"
              />
              <div className="flex justify-between text-[10px] font-mono opacity-40 mt-1">
                <span>Tight (0.1)</span>
                <span>Spread (3.0)</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#141414] text-[#E4E3E0] p-6 rounded-sm">
          <h3 className="text-xs font-mono uppercase tracking-widest mb-4 opacity-60">The 68-95-99.7 Rule</h3>
          <ul className="text-xs font-mono space-y-2 opacity-80">
            <li>• 68% within 1σ</li>
            <li>• 95% within 2σ</li>
            <li>• 99.7% within 3σ</li>
          </ul>
        </div>

        <div className="bg-[#141414] text-[#E4E3E0] p-6 rounded-sm mt-6">
          <h3 className="text-xs font-mono uppercase tracking-widest mb-4 opacity-60">Why σ Matters</h3>
          <p className="text-sm italic font-serif leading-relaxed">
            "In finance, variance is risk. In manufacturing, it's quality control. A low standard deviation means consistency; a high one means unpredictability."
          </p>
        </div>
      </div>

      <div className="lg:col-span-2 bg-white/40 border border-[#141414] p-6 rounded-sm min-h-[500px] flex flex-col relative overflow-hidden">
        <h3 className="text-xs font-mono uppercase tracking-widest opacity-60 mb-6">Data Spread Visualization</h3>
        
        <div className="flex-1 relative border-x border-b border-[#141414]/10">
          {/* Center Line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-red-500/30 z-0" />
          
          {/* Sigma Markers */}
          {[-3, -2, -1, 1, 2, 3].map(s => (
            <div 
              key={s}
              className="absolute top-0 bottom-0 w-px bg-[#141414]/10 z-0"
              style={{ left: `${50 + (s * stdDev * 10)}%` }}
            >
              <span className="absolute bottom-2 left-1 text-[8px] font-mono opacity-40">{s}σ</span>
            </div>
          ))}

          {/* Points */}
          <div className="absolute inset-0">
            {points.map((p, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1, x: `${50 + (p.x * 10)}%`, y: `${p.y * 100}%` }}
                className="absolute w-1.5 h-1.5 rounded-full bg-[#141414]"
                style={{ opacity: 0.4 }}
              />
            ))}
          </div>
        </div>
        
        <div className="mt-4 flex justify-center">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#141414] opacity-40" />
              <span className="text-[10px] font-mono opacity-60">Random Sample</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-px h-3 bg-red-500" />
              <span className="text-[10px] font-mono opacity-60">Mean (μ = 0)</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// --- Intuition Lab (Gambler's Fallacy) ---
function IntuitionLab() {
  const [streak, setStreak] = useState<number[]>([]); // 1 for heads, 0 for tails
  const [userGuess, setUserGuess] = useState<number | null>(null);
  const [history, setHistory] = useState<{guess: number, actual: number, correct: boolean}[]>([]);

  const handleGuess = (guess: number) => {
    const actual = Math.random() > 0.5 ? 1 : 0;
    setHistory(prev => [{ guess, actual, correct: guess === actual }, ...prev].slice(0, 10));
    setStreak(prev => [...prev, actual].slice(-6));
    setUserGuess(guess);
  };

  const headsInARow = streak.length > 0 && streak.every(s => s === 1);
  const tailsInARow = streak.length > 0 && streak.every(s => s === 0);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white/40 border border-[#141414] p-6 rounded-sm shadow-[4px_4px_0px_0px_rgba(20,20,20,1)]">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-5 h-5" />
            <h2 className="text-xl font-serif italic font-bold">The Gambler's Fallacy</h2>
          </div>
          <p className="text-sm opacity-70 mb-6 leading-relaxed">
            If a coin lands on heads 5 times in a row, is it "due" to land on tails? <span className="font-bold underline">No.</span> Each flip is independent.
          </p>
          
          <div className="bg-[#141414] text-[#E4E3E0] p-4 rounded-sm mb-6">
            <h3 className="text-[10px] font-mono uppercase tracking-widest mb-3 opacity-60">Current Sequence</h3>
            <div className="flex gap-2">
              {streak.length === 0 && <span className="text-xs opacity-40 italic">Start flipping...</span>}
              {streak.map((s, i) => (
                <div key={i} className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border",
                  s === 1 ? "bg-emerald-500 border-emerald-600 text-white" : "bg-white text-[#141414] border-[#141414]"
                )}>
                  {s === 1 ? 'H' : 'T'}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-xs font-mono uppercase tracking-widest opacity-60">What's next?</p>
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleGuess(1)}
                className="bg-white border border-[#141414] py-3 px-4 text-xs font-mono uppercase tracking-widest hover:bg-[#141414] hover:text-white transition-all"
              >
                Heads
              </button>
              <button 
                onClick={() => handleGuess(0)}
                className="bg-white border border-[#141414] py-3 px-4 text-xs font-mono uppercase tracking-widest hover:bg-[#141414] hover:text-white transition-all"
              >
                Tails
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white/40 border border-[#141414] p-6 rounded-sm">
          <h3 className="text-xs font-mono uppercase tracking-widest mb-4 opacity-60">Recent History</h3>
          <div className="space-y-2">
            {history.map((h, i) => (
              <div key={i} className="flex justify-between items-center text-xs font-mono border-b border-[#141414]/5 pb-1">
                <span className="opacity-60">Guess: {h.guess === 1 ? 'H' : 'T'}</span>
                <span className="font-bold">Actual: {h.actual === 1 ? 'H' : 'T'}</span>
                <span className={h.correct ? "text-emerald-600" : "text-red-500"}>
                  {h.correct ? "✓" : "✗"}
                </span>
              </div>
            ))}
            {history.length === 0 && <p className="text-xs italic opacity-40">No trials yet</p>}
          </div>
        </div>
      </div>

      <div className="lg:col-span-2 bg-white/40 border border-[#141414] p-12 rounded-sm flex flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          {streak.length >= 3 && (headsInARow || tailsInARow) ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="max-w-md"
            >
              <div className="mb-6 inline-block p-3 bg-red-100 text-red-600 rounded-full">
                <Zap className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-serif italic font-bold mb-4">The "Due" Delusion</h3>
              <p className="text-sm opacity-70 leading-relaxed mb-6">
                You've seen {streak.length} {headsInARow ? 'Heads' : 'Tails'} in a row. Your brain is screaming that a {headsInARow ? 'Tail' : 'Head'} is "due". 
                <br /><br />
                But the coin has no memory. The probability of the next flip remains exactly <span className="font-bold">50%</span>.
              </p>
              <div className="p-4 border border-dashed border-[#141414]/20 rounded-sm">
                <p className="text-[10px] font-mono uppercase tracking-widest opacity-40">Probability of current streak</p>
                <p className="text-xl font-mono font-bold">{(1 / Math.pow(2, streak.length) * 100).toFixed(2)}%</p>
              </div>
            </motion.div>
          ) : (
            <div className="max-w-md opacity-40">
              <RefreshCw className="w-12 h-12 mx-auto mb-6 animate-spin-slow" />
              <h3 className="text-xl font-serif italic font-bold mb-2">Awaiting Patterns</h3>
              <p className="text-sm leading-relaxed">
                Flip the coin several times. When a streak emerges, we'll analyze the cognitive friction it creates.
              </p>
            </div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// --- Helper Components ---
function StatCard({ label, value, icon, subValue }: { label: string, value: string, icon: React.ReactNode, subValue?: string }) {
  return (
    <div className="bg-white/40 border border-[#141414] p-4 rounded-sm">
      <div className="flex items-center gap-2 opacity-40 mb-2">
        {icon}
        <span className="text-[10px] font-mono uppercase tracking-widest">{label}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-mono font-bold tracking-tighter">{value}</span>
        {subValue && <span className="text-[10px] font-mono opacity-40">{subValue}</span>}
      </div>
    </div>
  );
}
