import React from "react";
import { Shield, Flame, AlertTriangle, Radio, Activity, Compass, Info } from "lucide-react";
import { StatisticsData } from "../types";

interface HeaderProps {
  stats: StatisticsData | null;
  onOpenAnalyze: () => void;
  onOpenScenarios: () => void;
  onOpenAbout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  stats,
  onOpenAnalyze,
  onOpenScenarios,
  onOpenAbout,
}) => {
  return (
    <header className="bg-[#0a0c10] border-b border-slate-800 text-slate-200 px-4 lg:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 sticky top-0 z-30 shadow-2xl">
      {/* Brand & Project Identity */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-orange-600 rounded flex items-center justify-center shadow-[0_0_15px_rgba(234,88,12,0.4)] transition-transform hover:scale-105">
          <Flame className="w-6 h-6 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>THERMOGUARD</span>
              <span className="text-orange-500">AI</span>
            </h1>
            <span className="hidden md:inline-block text-[10px] text-slate-400 font-mono font-medium px-2 py-0.5 bg-[#050608] border border-slate-800 rounded">
              SIH26162
            </span>
          </div>
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
            SIH26162 • NTRO GEOSPATIAL INTELLIGENCE
          </p>
        </div>
      </div>

      {/* Center Operational Status */}
      <div className="hidden lg:flex items-center gap-4 text-xs font-mono bg-[#050608] px-3.5 py-1.5 rounded border border-slate-800 shadow-inner">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-emerald-400 font-bold uppercase tracking-wider text-[11px]">GIS PIPELINE NOMINAL</span>
        </div>
        <span className="text-slate-800">|</span>
        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
          <Radio className="w-3.5 h-3.5 text-orange-500" />
          <span>DATA: <span className="text-slate-200 font-semibold">CALIBRATED DEMO</span></span>
        </div>
        <span className="text-slate-800">|</span>
        <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>ML: <span className="text-cyan-300 font-semibold">RANDOM FOREST v1.2</span></span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2.5">
        <button
          onClick={onOpenScenarios}
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider bg-[#050608] hover:bg-slate-900 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 px-3 py-1.5 rounded transition shadow-sm"
          title="Explore 5 SIH Validation Scenarios"
        >
          <Compass className="w-3.5 h-3.5 text-orange-500" />
          <span>Scenarios</span>
        </button>

        <button
          onClick={onOpenAnalyze}
          className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-orange-600 hover:bg-orange-500 text-white px-3.5 py-1.5 rounded transition shadow-[0_0_15px_rgba(234,88,12,0.3)] cursor-pointer"
        >
          <Flame className="w-3.5 h-3.5" />
          <span>Analyze Hotspot</span>
        </button>

        <button
          onClick={onOpenAbout}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-900 bg-[#050608] border border-slate-800 rounded transition"
          title="System Architecture & SIH Problem Statement"
        >
          <Info className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
