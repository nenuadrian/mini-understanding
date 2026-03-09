import React, { useState, useEffect, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, Legend, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { 
  Info, Play, RotateCcw, Plus, Trash2, Calculator, 
  TrendingUp, BarChart2, BookOpen, ChevronRight, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// --- Types ---

interface Item {
  id: string;
  name: string;
  trueStrength: number; // Log-strength (beta)
  estimatedStrength: number;
}

interface Match {
  id: string;
  winnerId: string;
  loserId: string;
}

// --- Bradley-Terry Logic ---

/**
 * Probability that item i beats item j
 * P(i > j) = exp(beta_i) / (exp(beta_i) + exp(beta_j))
 */
const calculateWinProbability = (betaI: number, betaJ: number) => {
  const lambdaI = Math.exp(betaI);
  const lambdaJ = Math.exp(betaJ);
  return lambdaI / (lambdaI + lambdaJ);
};

/**
 * Simple MM algorithm for Maximum Likelihood Estimation of Bradley-Terry parameters
 * beta_i is the log-strength.
 */
const estimateStrengths = (items: Item[], matches: Match[], iterations = 100) => {
  const n = items.length;
  if (n === 0) return items;

  // Initialize lambdas (exp(beta))
  let lambdas = items.map(() => 1.0);
  
  // Count wins for each item
  const wins = items.map(item => matches.filter(m => m.winnerId === item.id).length);
  
  // Count total games for each pair (i, j)
  const pairGames = Array.from({ length: n }, () => Array(n).fill(0));
  matches.forEach(m => {
    const i = items.findIndex(item => item.id === m.winnerId);
    const j = items.findIndex(item => item.id === m.loserId);
    if (i !== -1 && j !== -1) {
      pairGames[i][j]++;
      pairGames[j][i]++;
    }
  });

  // Iterative update: lambda_i = W_i / sum_{j != i} (N_ij / (lambda_i + lambda_j))
  for (let iter = 0; iter < iterations; iter++) {
    const nextLambdas = [...lambdas];
    for (let i = 0; i < n; i++) {
      if (wins[i] === 0) {
        nextLambdas[i] = 0.001; // Avoid zero
        continue;
      }
      
      let denominator = 0;
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        if (pairGames[i][j] > 0) {
          denominator += pairGames[i][j] / (lambdas[i] + lambdas[j]);
        }
      }
      
      if (denominator > 0) {
        nextLambdas[i] = wins[i] / denominator;
      }
    }
    
    // Normalize lambdas to prevent drift (geometric mean = 1)
    const logSum = nextLambdas.reduce((acc, l) => acc + Math.log(l), 0);
    const meanLog = logSum / n;
    lambdas = nextLambdas.map(l => Math.exp(Math.log(l) - meanLog));
  }

  return items.map((item, idx) => ({
    ...item,
    estimatedStrength: Math.log(lambdas[idx])
  }));
};

// --- Components ---

const MathBlock = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 my-4 font-mono text-sm overflow-x-auto">
    {children}
  </div>
);

export default function BradleyTerryExplorer() {
  const [items, setItems] = useState<Item[]>([
    { id: '1', name: 'Alpha', trueStrength: 1.5, estimatedStrength: 0 },
    { id: '2', name: 'Bravo', trueStrength: 0.5, estimatedStrength: 0 },
    { id: '3', name: 'Charlie', trueStrength: -0.5, estimatedStrength: 0 },
    { id: '4', name: 'Delta', trueStrength: -1.5, estimatedStrength: 0 },
  ]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [activeTab, setActiveTab] = useState<'intro' | 'sim' | 'math'>('intro');

  // Auto-estimate when matches change
  useEffect(() => {
    if (matches.length > 0) {
      setItems(prev => estimateStrengths(prev, matches));
    }
  }, [matches]);

  const addMatch = (winnerId: string, loserId: string) => {
    setMatches(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), winnerId, loserId }]);
  };

  const simulateBatch = (count: number) => {
    const newMatches: Match[] = [];
    for (let k = 0; k < count; k++) {
      // Pick two random items
      const iIdx = Math.floor(Math.random() * items.length);
      let jIdx = Math.floor(Math.random() * items.length);
      while (iIdx === jIdx) jIdx = Math.floor(Math.random() * items.length);

      const itemI = items[iIdx];
      const itemJ = items[jIdx];

      const probIWin = calculateWinProbability(itemI.trueStrength, itemJ.trueStrength);
      if (Math.random() < probIWin) {
        newMatches.push({ id: Math.random().toString(36).substr(2, 9), winnerId: itemI.id, loserId: itemJ.id });
      } else {
        newMatches.push({ id: Math.random().toString(36).substr(2, 9), winnerId: itemJ.id, loserId: itemI.id });
      }
    }
    setMatches(prev => [...prev, ...newMatches]);
  };

  const reset = () => {
    setMatches([]);
    setItems(prev => prev.map(item => ({ ...item, estimatedStrength: 0 })));
  };

  const addItem = () => {
    const names = ['Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliet'];
    const usedNames = items.map(i => i.name);
    const nextName = names.find(n => !usedNames.includes(n)) || `Item ${items.length + 1}`;
    
    setItems(prev => [
      ...prev, 
      { 
        id: Math.random().toString(36).substr(2, 9), 
        name: nextName, 
        trueStrength: (Math.random() * 4) - 2, 
        estimatedStrength: 0 
      }
    ]);
  };

  const removeItem = (id: string) => {
    if (items.length <= 2) return;
    setItems(prev => prev.filter(i => i.id !== id));
    setMatches(prev => prev.filter(m => m.winnerId !== id && m.loserId !== id));
  };

  const updateTrueStrength = (id: string, val: number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, trueStrength: val } : i));
  };

  // Chart Data
  const scatterData = useMemo(() => {
    return items.map(item => ({
      name: item.name,
      true: item.trueStrength,
      est: item.estimatedStrength,
    }));
  }, [items]);

  const probCurveData = useMemo(() => {
    const data = [];
    for (let diff = -5; diff <= 5; diff += 0.2) {
      data.push({
        diff: diff.toFixed(1),
        prob: 1 / (1 + Math.exp(-diff))
      });
    }
    return data;
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Calculator className="w-5 h-5 text-zinc-950" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Bradley-Terry Explorer</h1>
          </div>
          <nav className="flex gap-1 bg-zinc-800/50 p-1 rounded-xl border border-zinc-700/50">
            {[
              { id: 'intro', label: 'Overview', icon: BookOpen },
              { id: 'sim', label: 'Simulation', icon: Play },
              { id: 'math', label: 'The Math', icon: Calculator },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  "flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium transition-all",
                  activeTab === tab.id 
                    ? "bg-emerald-500 text-zinc-950 shadow-sm" 
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {activeTab === 'intro' && (
            <motion.div
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <section className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-6">
                  <h2 className="text-4xl font-bold tracking-tight text-emerald-400">
                    Ranking the Unrankable.
                  </h2>
                  <p className="text-lg text-zinc-400 leading-relaxed">
                    The Bradley-Terry model is a probabilistic model that predicts the outcome of a comparison between two items. 
                    It transforms a series of pairwise wins and losses into a unified ranking of "strength."
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
                      <div className="p-2 bg-blue-500/10 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Sports & Chess</p>
                        <p className="text-xs text-zinc-500">Elo is a variation of BT.</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 p-4 rounded-2xl">
                      <div className="p-2 bg-purple-500/10 rounded-lg">
                        <BarChart2 className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">LLM Evaluation</p>
                        <p className="text-xs text-zinc-500">Used in LMSYS Chatbot Arena.</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-8 shadow-2xl">
                  <h3 className="text-sm font-mono text-zinc-500 uppercase tracking-widest mb-6">The Core Probability Curve</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={probCurveData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                        <XAxis 
                          dataKey="diff" 
                          label={{ value: 'Strength Difference (βi - βj)', position: 'bottom', offset: 0, fill: '#71717a', fontSize: 12 }} 
                          stroke="#71717a"
                          fontSize={10}
                        />
                        <YAxis 
                          domain={[0, 1]} 
                          label={{ value: 'P(i beats j)', angle: -90, position: 'insideLeft', fill: '#71717a', fontSize: 12 }} 
                          stroke="#71717a"
                          fontSize={10}
                        />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                          itemStyle={{ color: '#10b981' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="prob" 
                          stroke="#10b981" 
                          strokeWidth={3} 
                          dot={false} 
                          animationDuration={2000}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-xs text-center text-zinc-500 mt-4 italic">
                    As the difference in strength increases, the probability of the stronger item winning approaches 100%.
                  </p>
                </div>
              </section>

              <section className="grid md:grid-cols-3 gap-6">
                {[
                  { title: "Pairwise Matches", desc: "Data comes from direct comparisons. 'A beats B' is a single observation.", icon: RotateCcw },
                  { title: "Latent Strength", desc: "Every item has a hidden 'true' strength parameter (β) that determines its win rate.", icon: Info },
                  { title: "MLE Estimation", desc: "We use Maximum Likelihood to find the strengths that best explain the observed matches.", icon: Calculator },
                ].map((card, i) => (
                  <div key={i} className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl hover:border-emerald-500/50 transition-colors group">
                    <card.icon className="w-8 h-8 text-emerald-500 mb-4 group-hover:scale-110 transition-transform" />
                    <h4 className="text-lg font-semibold mb-2">{card.title}</h4>
                    <p className="text-sm text-zinc-400 leading-relaxed">{card.desc}</p>
                  </div>
                ))}
              </section>
            </motion.div>
          )}

          {activeTab === 'sim' && (
            <motion.div
              key="sim"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div className="flex flex-col lg:flex-row gap-8">
                {/* Controls & Items */}
                <div className="lg:w-1/3 space-y-6">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-emerald-400" />
                        Population
                      </h3>
                      <button 
                        onClick={addItem}
                        className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg hover:bg-emerald-500/20 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                      {items.map((item) => (
                        <div key={item.id} className="p-4 bg-zinc-800/50 rounded-xl border border-zinc-700/50 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{item.name}</span>
                            <button onClick={() => removeItem(item.id)} className="text-zinc-500 hover:text-red-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-zinc-500 uppercase tracking-wider">
                              <span>True Strength (β)</span>
                              <span className="text-emerald-400 font-mono">{item.trueStrength.toFixed(2)}</span>
                            </div>
                            <input 
                              type="range" 
                              min="-3" 
                              max="3" 
                              step="0.1" 
                              value={item.trueStrength}
                              onChange={(e) => updateTrueStrength(item.id, parseFloat(e.target.value))}
                              className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-zinc-500 uppercase tracking-wider">
                            <span>Estimated</span>
                            <span className="text-blue-400 font-mono">{item.estimatedStrength.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
                    <h3 className="font-semibold">Simulation Controls</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        onClick={() => simulateBatch(1)}
                        className="flex items-center justify-center gap-2 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-medium transition-colors"
                      >
                        <Play className="w-4 h-4" /> +1 Match
                      </button>
                      <button 
                        onClick={() => simulateBatch(10)}
                        className="flex items-center justify-center gap-2 py-2.5 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-medium transition-colors"
                      >
                        <Play className="w-4 h-4" /> +10
                      </button>
                      <button 
                        onClick={() => simulateBatch(100)}
                        className="flex items-center justify-center gap-2 py-2.5 bg-emerald-500 text-zinc-950 hover:bg-emerald-400 rounded-xl text-sm font-bold transition-colors col-span-2"
                      >
                        <Play className="w-4 h-4" /> Run 100 Matches
                      </button>
                      <button 
                        onClick={reset}
                        className="flex items-center justify-center gap-2 py-2.5 border border-zinc-800 hover:bg-zinc-900 rounded-xl text-sm font-medium transition-colors col-span-2 text-zinc-500"
                      >
                        <RotateCcw className="w-4 h-4" /> Reset Data
                      </button>
                    </div>
                    <div className="pt-4 border-t border-zinc-800">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-zinc-500">Total Matches:</span>
                        <span className="font-mono text-emerald-400 font-bold">{matches.length}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Visualization */}
                <div className="lg:w-2/3 space-y-8">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-xl">
                    <div className="flex items-center justify-between mb-8">
                      <div>
                        <h3 className="text-xl font-bold">Estimation Accuracy</h3>
                        <p className="text-sm text-zinc-500">How well the model recovers the true hidden strengths.</p>
                      </div>
                      <div className="flex gap-4 text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-emerald-500" />
                          <span>True</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500" />
                          <span>Estimated</span>
                        </div>
                      </div>
                    </div>

                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={scatterData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                          <XAxis dataKey="name" stroke="#71717a" fontSize={12} />
                          <YAxis stroke="#71717a" fontSize={12} />
                          <Tooltip 
                            cursor={{ fill: '#27272a' }}
                            contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }}
                          />
                          <Bar dataKey="true" fill="#10b981" radius={[4, 4, 0, 0]} name="True Strength" />
                          <Bar dataKey="est" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Estimated Strength" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8">
                    <h3 className="text-lg font-bold mb-6">True vs. Estimated Correlation</h3>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                          <XAxis type="number" dataKey="true" name="True" unit="" stroke="#71717a" label={{ value: 'True Strength', position: 'bottom', fill: '#71717a', fontSize: 12 }} />
                          <YAxis type="number" dataKey="est" name="Estimated" unit="" stroke="#71717a" label={{ value: 'Estimated Strength', angle: -90, position: 'left', fill: '#71717a', fontSize: 12 }} />
                          <ZAxis type="category" dataKey="name" name="Item" />
                          <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#18181b', border: '1px solid #3f3f46', borderRadius: '8px' }} />
                          <Scatter name="Items" data={scatterData} fill="#10b981">
                            {scatterData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.true > 0 ? '#10b981' : '#ef4444'} />
                            ))}
                          </Scatter>
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-sm text-zinc-500 mt-4 text-center">
                      As you run more matches, the dots will align closer to a diagonal line, indicating higher accuracy.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'math' && (
            <motion.div
              key="math"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-3xl mx-auto space-y-12"
            >
              <section className="space-y-6">
                <h2 className="text-3xl font-bold">The Mathematical Foundation</h2>
                <p className="text-zinc-400 leading-relaxed">
                  The Bradley-Terry model assumes that for any two items $i$ and $j$, the probability that $i$ is preferred over $j$ is determined by their positive "worth" parameters $\lambda_i$ and $\lambda_j$.
                </p>
                
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-emerald-400">1. The Probability Formula</h3>
                  <p className="text-zinc-400">The basic form uses worth parameters λ:</p>
                  <MathBlock>
                    {"P(i > j) = λ_i / (λ_i + λ_j)"}
                  </MathBlock>
                  <p className="text-zinc-400">In practice, we often work with log-strengths β_i = ln(λ_i) to ensure positivity and simplify calculations:</p>
                  <MathBlock>
                    {"P(i > j) = exp(β_i) / (exp(β_i) + exp(β_j)) = 1 / (1 + exp(-(β_i - β_j)))"}
                  </MathBlock>
                  <p className="text-sm text-zinc-500 italic">
                    Notice this is the standard Logistic (Sigmoid) function of the difference in strengths.
                  </p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-emerald-400">2. The Likelihood Function</h3>
                  <p className="text-zinc-400">Given a set of match results, we want to find the parameters β that maximize the probability of observing those results. The log-likelihood is:</p>
                  <MathBlock>
                    {"L(β) = Σ_{matches (i,j)} [ w_{ij} ln(P(i > j)) + w_{ji} ln(P(j > i)) ]"}
                  </MathBlock>
                  <p className="text-zinc-400">Where w_ij is the number of times i beat j.</p>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-emerald-400">3. Solving via MM Algorithm</h3>
                  <p className="text-zinc-400">Since there is no closed-form solution for the maximum, we use iterative methods. The Minorization-Maximization (MM) algorithm updates the worth parameters as follows:</p>
                  <MathBlock>
                    {"λ_i^{(new)} = W_i / Σ_{j ≠ i} [ N_{ij} / (λ_i^{(old)} + λ_j^{(old)}) ]"}
                  </MathBlock>
                  <ul className="list-disc list-inside space-y-2 text-zinc-400 text-sm ml-4">
                    <li>W_i: Total wins for item i.</li>
                    <li>N_ij: Total matches between i and j.</li>
                    <li>The algorithm is guaranteed to converge to the unique MLE if the comparison graph is strongly connected.</li>
                  </ul>
                </div>
              </section>

              <section className="p-8 bg-emerald-500/5 border border-emerald-500/20 rounded-3xl">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-emerald-400" />
                  Why use Bradley-Terry?
                </h3>
                <div className="grid md:grid-cols-2 gap-6 text-sm text-zinc-300">
                  <div className="space-y-2">
                    <p className="font-semibold text-emerald-400">Transitivity</p>
                    <p>It handles "A beats B" and "B beats C" to infer that A is likely better than C, even if they never played.</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-semibold text-emerald-400">Uncertainty</p>
                    <p>It provides a probabilistic framework, allowing us to calculate confidence intervals for our rankings.</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-semibold text-emerald-400">Scalability</p>
                    <p>It works with sparse data where not every item has been compared to every other item.</p>
                  </div>
                  <div className="space-y-2">
                    <p className="font-semibold text-emerald-400">Flexibility</p>
                    <p>Extensions can account for home-field advantage, ties, or time-varying strengths (Elo).</p>
                  </div>
                </div>
              </section>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-zinc-900 py-12 px-6 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <Calculator className="w-4 h-4" />
            <span>Bradley-Terry Model Deep Dive</span>
          </div>
          <div className="flex gap-8 text-xs text-zinc-600 uppercase tracking-widest font-medium">
            <a href="#" className="hover:text-emerald-400 transition-colors">Documentation</a>
            <a href="#" className="hover:text-emerald-400 transition-colors">Source Code</a>
            <a href="#" className="hover:text-emerald-400 transition-colors">LMSYS Arena</a>
          </div>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #3f3f46;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #52525b;
        }
      `}</style>
    </div>
  );
}
