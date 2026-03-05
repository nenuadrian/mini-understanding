import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  Swords, 
  History as HistoryIcon, 
  Plus, 
  Trophy, 
  UserPlus,
  ArrowRightLeft,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { cn } from './lib/utils';
import { 
  Player, 
  MatchResult, 
  calculateExpectedScore, 
  calculateRatingChange, 
  K_FACTOR 
} from './lib/elo';

const INITIAL_PLAYERS: Player[] = [
  { id: '1', name: 'Alice', rating: 1500, history: [1500], matches: 0 },
  { id: '2', name: 'Bob', rating: 1500, history: [1500], matches: 0 },
  { id: '3', name: 'Charlie', rating: 1200, history: [1200], matches: 0 },
  { id: '4', name: 'Diana', rating: 1800, history: [1800], matches: 0 },
];

export default function App() {
  const [players, setPlayers] = useState<Player[]>(INITIAL_PLAYERS);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [playerAId, setPlayerAId] = useState<string | null>(null);
  const [playerBId, setPlayerBId] = useState<string | null>(null);
  const [newPlayerName, setNewPlayerName] = useState('');

  const playerA = useMemo(() => players.find(p => p.id === playerAId), [players, playerAId]);
  const playerB = useMemo(() => players.find(p => p.id === playerBId), [players, playerBId]);

  const predictions = useMemo(() => {
    if (!playerA || !playerB) return null;

    const expectedA = calculateExpectedScore(playerA.rating, playerB.rating);
    const expectedB = 1 - expectedA;

    return {
      winA: calculateRatingChange(playerA.rating, expectedA, 1),
      drawA: calculateRatingChange(playerA.rating, expectedA, 0.5),
      lossA: calculateRatingChange(playerA.rating, expectedA, 0),
      winB: calculateRatingChange(playerB.rating, expectedB, 1),
      drawB: calculateRatingChange(playerB.rating, expectedB, 0.5),
      lossB: calculateRatingChange(playerB.rating, expectedB, 0),
      expectedA,
      expectedB
    };
  }, [playerA, playerB]);

  const handleAddPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlayerName.trim()) return;
    
    const newPlayer: Player = {
      id: Math.random().toString(36).substr(2, 9),
      name: newPlayerName.trim(),
      rating: 1500,
      history: [1500],
      matches: 0
    };
    
    setPlayers(prev => [...prev, newPlayer]);
    setNewPlayerName('');
  };

  const recordMatch = (scoreA: number) => {
    if (!playerA || !playerB || !predictions) return;

    const scoreB = 1 - scoreA;
    let changeA = 0;
    let changeB = 0;

    if (scoreA === 1) {
      changeA = predictions.winA;
      changeB = predictions.lossB;
    } else if (scoreA === 0.5) {
      changeA = predictions.drawA;
      changeB = predictions.drawB;
    } else {
      changeA = predictions.lossA;
      changeB = predictions.winB;
    }

    const newMatch: MatchResult = {
      playerAId: playerA.id,
      playerBId: playerB.id,
      scoreA,
      scoreB,
      changeA,
      changeB,
      timestamp: Date.now()
    };

    setMatches(prev => [newMatch, ...prev]);
    setPlayers(prev => prev.map(p => {
      if (p.id === playerA.id) {
        const newRating = p.rating + changeA;
        return { ...p, rating: newRating, history: [...p.history, newRating], matches: p.matches + 1 };
      }
      if (p.id === playerB.id) {
        const newRating = p.rating + changeB;
        return { ...p, rating: newRating, history: [...p.history, newRating], matches: p.matches + 1 };
      }
      return p;
    }));

    // Reset selection
    setPlayerAId(null);
    setPlayerBId(null);
  };

  const sortedPlayers = [...players].sort((a, b) => b.rating - a.rating);

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Header & Stats */}
        <header className="lg:col-span-12 flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-zinc-900 flex items-center gap-3">
              <Trophy className="w-10 h-10 text-amber-500" />
              Elo Simulator
            </h1>
            <p className="text-zinc-500 mt-1">Interactive ranking system visualization</p>
          </div>
          
          <div className="flex items-center gap-4">
            <form onSubmit={handleAddPlayer} className="flex gap-2">
              <input 
                type="text" 
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                placeholder="New player name..."
                className="px-4 py-2 bg-white border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all text-sm"
              />
              <button 
                type="submit"
                className="p-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
              >
                <UserPlus className="w-5 h-5" />
              </button>
            </form>
          </div>
        </header>

        {/* Player Pool */}
        <section className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="p-4 border-bottom border-zinc-100 bg-zinc-50/50 flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-zinc-400" />
                Player Pool
              </h2>
              <span className="text-xs font-mono text-zinc-400 uppercase tracking-wider">Ranked</span>
            </div>
            <div className="divide-y divide-zinc-100">
              <AnimatePresence mode="popLayout">
                {sortedPlayers.map((player, index) => (
                  <motion.div 
                    layout
                    key={player.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={cn(
                      "p-4 flex items-center justify-between transition-colors group",
                      (playerAId === player.id || playerBId === player.id) ? "bg-amber-50" : "hover:bg-zinc-50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center text-xs font-bold text-zinc-500">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900">{player.name}</p>
                        <p className="text-xs text-zinc-400">{player.matches} matches played</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-mono font-bold text-zinc-900">{player.rating}</p>
                        <div className="flex items-center justify-end gap-1">
                          {player.history.length > 1 && (
                            <span className={cn(
                              "text-[10px] font-bold",
                              player.rating > player.history[player.history.length - 2] ? "text-emerald-500" : 
                              player.rating < player.history[player.history.length - 2] ? "text-rose-500" : "text-zinc-400"
                            )}>
                              {player.rating > player.history[player.history.length - 2] ? '+' : ''}
                              {player.rating - player.history[player.history.length - 2]}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => setPlayerAId(player.id)}
                          disabled={playerBId === player.id}
                          className={cn(
                            "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter transition-all",
                            playerAId === player.id ? "bg-amber-500 text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 disabled:opacity-30"
                          )}
                        >
                          P1
                        </button>
                        <button 
                          onClick={() => setPlayerBId(player.id)}
                          disabled={playerAId === player.id}
                          className={cn(
                            "px-2 py-1 rounded text-[10px] font-bold uppercase tracking-tighter transition-all",
                            playerBId === player.id ? "bg-amber-500 text-white" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 disabled:opacity-30"
                          )}
                        >
                          P2
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Match Simulator */}
        <section className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Swords className="w-6 h-6 text-amber-500" />
                Match Simulator
              </h2>
              {playerA && playerB && (
                <button 
                  onClick={() => { setPlayerAId(null); setPlayerBId(null); }}
                  className="text-xs text-zinc-400 hover:text-zinc-600 underline underline-offset-4"
                >
                  Reset Selection
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-8 relative">
              {/* Player A */}
              <div className={cn(
                "p-6 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-4",
                playerA ? "border-amber-200 bg-amber-50/30" : "border-dashed border-zinc-200 bg-zinc-50/50"
              )}>
                <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center border border-zinc-100">
                  <Users className={cn("w-8 h-8", playerA ? "text-amber-500" : "text-zinc-300")} />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-400 uppercase tracking-widest mb-1">Player 1</p>
                  <h3 className="text-xl font-bold text-zinc-900">{playerA?.name || "Select Player"}</h3>
                  {playerA && <p className="font-mono text-zinc-500">{playerA.rating} Elo</p>}
                </div>
              </div>

              {/* VS Divider */}
              <div className="flex flex-col items-center justify-center gap-2">
                <div className="w-12 h-12 rounded-full bg-zinc-900 text-white flex items-center justify-center font-bold italic shadow-lg z-10">
                  VS
                </div>
                <div className="h-px w-full bg-zinc-200 absolute top-1/2 left-0 -z-0 hidden md:block"></div>
              </div>

              {/* Player B */}
              <div className={cn(
                "p-6 rounded-2xl border-2 transition-all flex flex-col items-center text-center gap-4",
                playerB ? "border-amber-200 bg-amber-50/30" : "border-dashed border-zinc-200 bg-zinc-50/50"
              )}>
                <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center border border-zinc-100">
                  <Users className={cn("w-8 h-8", playerB ? "text-amber-500" : "text-zinc-300")} />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-400 uppercase tracking-widest mb-1">Player 2</p>
                  <h3 className="text-xl font-bold text-zinc-900">{playerB?.name || "Select Player"}</h3>
                  {playerB && <p className="font-mono text-zinc-500">{playerB.rating} Elo</p>}
                </div>
              </div>
            </div>

            {/* Outcome Preview & Actions */}
            <AnimatePresence>
              {playerA && playerB && predictions && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="mt-12 space-y-8"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Win A */}
                    <button 
                      onClick={() => recordMatch(1)}
                      className="group relative p-4 rounded-xl border border-zinc-200 hover:border-amber-500 hover:bg-amber-50 transition-all text-left"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-amber-600">Outcome</span>
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                      </div>
                      <p className="font-bold text-zinc-900 mb-1">{playerA.name} Wins</p>
                      <div className="flex items-center gap-4 text-xs font-mono">
                        <span className="text-emerald-600">+{predictions.winA} pts</span>
                        <span className="text-rose-600">{predictions.lossB} pts</span>
                      </div>
                    </button>

                    {/* Draw */}
                    <button 
                      onClick={() => recordMatch(0.5)}
                      className="group relative p-4 rounded-xl border border-zinc-200 hover:border-amber-500 hover:bg-amber-50 transition-all text-left"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-amber-600">Outcome</span>
                        <Minus className="w-4 h-4 text-zinc-400" />
                      </div>
                      <p className="font-bold text-zinc-900 mb-1">Draw</p>
                      <div className="flex items-center gap-4 text-xs font-mono">
                        <span className={cn(predictions.drawA >= 0 ? "text-emerald-600" : "text-rose-600")}>
                          {predictions.drawA >= 0 ? '+' : ''}{predictions.drawA} pts
                        </span>
                        <span className={cn(predictions.drawB >= 0 ? "text-emerald-600" : "text-rose-600")}>
                          {predictions.drawB >= 0 ? '+' : ''}{predictions.drawB} pts
                        </span>
                      </div>
                    </button>

                    {/* Win B */}
                    <button 
                      onClick={() => recordMatch(0)}
                      className="group relative p-4 rounded-xl border border-zinc-200 hover:border-amber-500 hover:bg-amber-50 transition-all text-left"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 group-hover:text-amber-600">Outcome</span>
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                      </div>
                      <p className="font-bold text-zinc-900 mb-1">{playerB.name} Wins</p>
                      <div className="flex items-center gap-4 text-xs font-mono">
                        <span className="text-rose-600">{predictions.lossA} pts</span>
                        <span className="text-emerald-600">+{predictions.winB} pts</span>
                      </div>
                    </button>
                  </div>

                  <div className="bg-zinc-50 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="text-center md:text-left">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Win Probability</p>
                        <p className="text-sm font-mono font-bold text-zinc-600">
                          {playerA.name}: {(predictions.expectedA * 100).toFixed(1)}%
                        </p>
                      </div>
                      <div className="h-8 w-px bg-zinc-200 hidden md:block"></div>
                      <div className="text-center md:text-left">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Win Probability</p>
                        <p className="text-sm font-mono font-bold text-zinc-600">
                          {playerB.name}: {(predictions.expectedB * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                    <p className="text-[10px] text-zinc-400 italic max-w-xs text-center md:text-right">
                      Calculated using standard Elo formula with K={K_FACTOR}. Higher rated players gain fewer points for winning against lower rated ones.
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Charts & History */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Rating History Chart */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
              <h3 className="font-bold flex items-center gap-2 mb-6">
                <TrendingUp className="w-4 h-4 text-zinc-400" />
                Rating Progression
              </h3>
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis hide />
                    <YAxis domain={['dataMin - 100', 'dataMax + 100']} tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e4e4e7', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      labelStyle={{ display: 'none' }}
                    />
                    {players.map((player, idx) => (
                      <Line 
                        key={player.id}
                        type="monotone"
                        data={player.history.map((val, i) => ({ val, i }))}
                        dataKey="val"
                        stroke={['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'][idx % 5]}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                        name={player.name}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Match History List */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
              <div className="p-4 border-bottom border-zinc-100 bg-zinc-50/50">
                <h3 className="font-bold flex items-center gap-2">
                  <HistoryIcon className="w-4 h-4 text-zinc-400" />
                  Recent Matches
                </h3>
              </div>
              <div className="max-h-[240px] overflow-y-auto divide-y divide-zinc-100">
                {matches.length === 0 ? (
                  <div className="p-8 text-center text-zinc-400 text-sm italic">
                    No matches recorded yet.
                  </div>
                ) : (
                  matches.map((match, idx) => {
                    const pA = players.find(p => p.id === match.playerAId);
                    const pB = players.find(p => p.id === match.playerBId);
                    return (
                      <div key={idx} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="text-xs font-mono text-zinc-400">
                            {new Date(match.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div className="text-sm">
                            <span className={cn("font-bold", match.scoreA === 1 ? "text-emerald-600" : "text-zinc-900")}>
                              {pA?.name}
                            </span>
                            <span className="mx-2 text-zinc-300">vs</span>
                            <span className={cn("font-bold", match.scoreB === 1 ? "text-emerald-600" : "text-zinc-900")}>
                              {pB?.name}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <span className={cn(
                            "px-2 py-0.5 rounded text-[10px] font-bold",
                            match.scoreA === 1 ? "bg-emerald-100 text-emerald-700" : 
                            match.scoreA === 0.5 ? "bg-zinc-100 text-zinc-700" : "bg-rose-100 text-rose-700"
                          )}>
                            {match.scoreA === 1 ? 'WIN' : match.scoreA === 0.5 ? 'DRAW' : 'LOSS'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
