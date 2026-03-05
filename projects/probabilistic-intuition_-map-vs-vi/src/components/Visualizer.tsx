
import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { GaussianMixture, Gaussian, optimizeMAP, optimizeVI } from '../utils/math';
import { Play, RotateCcw, Info, Settings2, Target, Sparkles } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Visualizer() {
  const svgRef = useRef<SVGSVGElement>(null);
  
  // State for the true posterior (mixture of 2 gaussians)
  const [m1, setM1] = useState(-2);
  const [s1, setS1] = useState(0.8);
  const [w1, setW1] = useState(0.6);
  
  const [m2, setM2] = useState(2);
  const [s2, setS2] = useState(1.2);
  const [w2, setW2] = useState(0.4);

  // State for optimization
  const [mapResult, setMapResult] = useState<number | null>(null);
  const [viResult, setViResult] = useState<{ mu: number; sigma: number } | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [startPoint, setStartPoint] = useState(0);

  const trueDist = useMemo(() => {
    const totalWeight = w1 + w2 || 1;
    return new GaussianMixture([m1, m2], [s1, s2], [w1 / totalWeight, w2 / totalWeight]);
  }, [m1, s1, w1, m2, s2, w2]);

  const handleOptimize = () => {
    setIsOptimizing(true);
    // Add a small delay for visual effect
    setTimeout(() => {
      const map = optimizeMAP(trueDist, startPoint);
      const vi = optimizeVI(trueDist, startPoint, 1.0);
      setMapResult(map);
      setViResult(vi);
      setIsOptimizing(false);
    }, 300);
  };

  const handleReset = () => {
    setMapResult(null);
    setViResult(null);
  };

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 400;
    const margin = { top: 40, right: 40, bottom: 40, left: 60 };

    const xDomain = [-8, 8];
    const yDomain = [0, 0.5];

    const xScale = d3.scaleLinear().domain(xDomain).range([margin.left, width - margin.right]);
    const yScale = d3.scaleLinear().domain(yDomain).range([height - margin.bottom, margin.top]);

    // Axes
    svg.append("g")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale).ticks(10))
      .attr("class", "text-zinc-500");

    svg.append("g")
      .attr("transform", `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale).ticks(5))
      .attr("class", "text-zinc-500");

    // Grid lines
    svg.append("g")
      .attr("class", "grid opacity-10")
      .attr("transform", `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale).ticks(10).tickSize(-height + margin.top + margin.bottom).tickFormat(() => ""));

    // True Posterior Curve
    const line = d3.line<[number, number]>()
      .x(d => xScale(d[0]))
      .y(d => yScale(d[1]))
      .curve(d3.curveBasis);

    const points: [number, number][] = d3.range(xDomain[0], xDomain[1], 0.1).map(x => [x, trueDist.pdf(x)]);

    svg.append("path")
      .datum(points)
      .attr("fill", "none")
      .attr("stroke", "#18181b")
      .attr("stroke-width", 3)
      .attr("d", line);

    // Area under true posterior
    const area = d3.area<[number, number]>()
      .x(d => xScale(d[0]))
      .y0(yScale(0))
      .y1(d => yScale(d[1]))
      .curve(d3.curveBasis);

    svg.append("path")
      .datum(points)
      .attr("fill", "#18181b")
      .attr("fill-opacity", 0.05)
      .attr("d", area);

    // Start Point Marker
    svg.append("circle")
      .attr("cx", xScale(startPoint))
      .attr("cy", height - margin.bottom)
      .attr("r", 6)
      .attr("fill", "#3b82f6")
      .attr("class", "cursor-pointer hover:scale-125 transition-transform")
      .call(d3.drag<SVGCircleElement, unknown>()
        .on("drag", (event) => {
          const newX = xScale.invert(event.x);
          setStartPoint(Math.max(xDomain[0], Math.min(xDomain[1], newX)));
        })
      );

    svg.append("text")
      .attr("x", xScale(startPoint))
      .attr("y", height - margin.bottom + 25)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("class", "fill-blue-500 font-medium")
      .text("START POINT");

    // MAP Result
    if (mapResult !== null) {
      svg.append("line")
        .attr("x1", xScale(mapResult))
        .attr("x2", xScale(mapResult))
        .attr("y1", height - margin.bottom)
        .attr("y2", yScale(trueDist.pdf(mapResult)))
        .attr("stroke", "#ef4444")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4,2");

      svg.append("circle")
        .attr("cx", xScale(mapResult))
        .attr("cy", yScale(trueDist.pdf(mapResult)))
        .attr("r", 5)
        .attr("fill", "#ef4444");

      svg.append("text")
        .attr("x", xScale(mapResult))
        .attr("y", yScale(trueDist.pdf(mapResult)) - 10)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("class", "fill-red-500 font-bold")
        .text("MAP");
    }

    // VI Result
    if (viResult !== null) {
      const viDist = new Gaussian(viResult.mu, viResult.sigma);
      const viPoints: [number, number][] = d3.range(xDomain[0], xDomain[1], 0.1).map(x => [x, viDist.pdf(x)]);

      svg.append("path")
        .datum(viPoints)
        .attr("fill", "none")
        .attr("stroke", "#10b981")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "6,3")
        .attr("d", line);

      svg.append("path")
        .datum(viPoints)
        .attr("fill", "#10b981")
        .attr("fill-opacity", 0.1)
        .attr("d", area);

      svg.append("text")
        .attr("x", xScale(viResult.mu))
        .attr("y", yScale(viDist.pdf(viResult.mu)) - 10)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("class", "fill-emerald-500 font-bold")
        .text("VI (q)");
    }

  }, [trueDist, mapResult, viResult, startPoint]);

  return (
    <div className="flex flex-col gap-8 p-8 max-w-6xl mx-auto">
      <header className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900">
          Probabilistic Intuition
        </h1>
        <p className="text-zinc-500 max-w-2xl italic">
          Compare Maximum A Posteriori (MAP) and Variational Inference (VI) in approximating a complex posterior distribution.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Visualization Area */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="relative bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
            <div className="absolute top-4 left-6 flex items-center gap-4">
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full bg-zinc-900" />
                 <span className="text-xs font-medium text-zinc-600 uppercase tracking-wider">True Posterior p(z|x)</span>
               </div>
               {mapResult !== null && (
                 <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-red-500" />
                   <span className="text-xs font-medium text-zinc-600 uppercase tracking-wider">MAP (Point)</span>
                 </div>
               )}
               {viResult !== null && (
                 <div className="flex items-center gap-2">
                   <div className="w-3 h-3 rounded-full bg-emerald-500" />
                   <span className="text-xs font-medium text-zinc-600 uppercase tracking-wider">VI (Distribution q)</span>
                 </div>
               )}
            </div>
            <svg 
              ref={svgRef} 
              viewBox="0 0 800 400" 
              className="w-full h-auto"
            />
            <div className="absolute bottom-4 right-6 text-[10px] text-zinc-400 uppercase tracking-widest">
              Drag blue dot to set initial guess
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
              <div className="flex items-center gap-2 mb-2 text-red-600">
                <Target size={18} />
                <h3 className="font-bold text-sm uppercase tracking-wider">MAP Optimization</h3>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Finds the <strong>mode</strong> (highest peak) of the posterior. It's a point estimate and ignores the rest of the distribution's shape.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200">
              <div className="flex items-center gap-2 mb-2 text-emerald-600">
                <Sparkles size={18} />
                <h3 className="font-bold text-sm uppercase tracking-wider">Variational Inference</h3>
              </div>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Approximates the whole distribution with a simpler one (e.g., Gaussian). It captures <strong>uncertainty</strong> but might be biased by the choice of q.
              </p>
            </div>
          </div>
        </div>

        {/* Controls Panel */}
        <div className="flex flex-col gap-6 p-6 bg-white rounded-2xl border border-zinc-200 shadow-sm h-fit">
          <div className="flex items-center gap-2 border-b border-zinc-100 pb-4">
            <Settings2 size={20} className="text-zinc-400" />
            <h2 className="font-bold text-zinc-900 uppercase tracking-widest text-sm">Parameters</h2>
          </div>

          <div className="space-y-6">
            <section>
              <h3 className="text-xs font-bold text-zinc-400 uppercase mb-4 flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-zinc-400" />
                Gaussian Mode 1
              </h3>
              <div className="space-y-4">
                <ControlGroup label="Mean" value={m1} min={-5} max={5} step={0.1} onChange={setM1} />
                <ControlGroup label="Width" value={s1} min={0.5} max={2} step={0.1} onChange={setS1} />
                <ControlGroup label="Weight" value={w1} min={0} max={1} step={0.05} onChange={setW1} />
              </div>
            </section>

            <section>
              <h3 className="text-xs font-bold text-zinc-400 uppercase mb-4 flex items-center gap-2">
                <div className="w-1 h-1 rounded-full bg-zinc-400" />
                Gaussian Mode 2
              </h3>
              <div className="space-y-4">
                <ControlGroup label="Mean" value={m2} min={-5} max={5} step={0.1} onChange={setM2} />
                <ControlGroup label="Width" value={s2} min={0.5} max={2} step={0.1} onChange={setS2} />
                <ControlGroup label="Weight" value={w2} min={0} max={1} step={0.05} onChange={setW2} />
              </div>
            </section>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              onClick={handleOptimize}
              disabled={isOptimizing}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all",
                "bg-zinc-900 text-white hover:bg-zinc-800 active:scale-95 disabled:opacity-50"
              )}
            >
              {isOptimizing ? "Optimizing..." : <><Play size={16} fill="currentColor" /> RUN OPTIMIZATION</>}
            </button>
            <button
              onClick={handleReset}
              className="p-3 rounded-xl border border-zinc-200 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 transition-all"
            >
              <RotateCcw size={20} />
            </button>
          </div>
        </div>
      </div>

      <footer className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8 pt-8 border-t border-zinc-100">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center shrink-0">
            <Info size={20} className="text-zinc-400" />
          </div>
          <div>
            <h4 className="font-bold text-zinc-900 mb-1">Why does this matter?</h4>
            <p className="text-sm text-zinc-500 leading-relaxed">
              In high-dimensional Bayesian modeling, the true posterior is often intractable. 
              <strong> MAP</strong> is fast but can be misleading if the distribution is bimodal or has heavy tails. 
              <strong> VI</strong> turns integration into optimization, providing a scalable way to estimate uncertainty.
            </p>
          </div>
        </div>
        <div className="bg-zinc-900 rounded-2xl p-6 text-zinc-400">
          <h4 className="font-bold text-white mb-2 text-sm uppercase tracking-widest">Intuition Check</h4>
          <ul className="text-xs space-y-2 list-disc pl-4">
            <li>Try setting the weights to be equal and observe where VI lands.</li>
            <li>Move the start point close to the smaller peak; see if MAP gets "stuck".</li>
            <li>Observe how VI tries to balance between the two modes when they are close.</li>
          </ul>
        </div>
      </footer>
    </div>
  );
}

function ControlGroup({ label, value, min, max, step, onChange }: { 
  label: string; 
  value: number; 
  min: number; 
  max: number; 
  step: number; 
  onChange: (v: number) => void 
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between items-center text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">
        <span>{label}</span>
        <span className="text-zinc-900">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 bg-zinc-100 rounded-lg appearance-none cursor-pointer accent-zinc-900"
      />
    </div>
  );
}
