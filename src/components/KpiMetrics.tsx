import React from "react";
import { Flame, AlertTriangle, Clock, Factory, Trees, BellRing } from "lucide-react";
import { StatisticsData } from "../types";

interface KpiMetricsProps {
  stats: StatisticsData | null;
  onFilterByRisk?: (risk: string) => void;
  onFilterByClass?: (cls: string) => void;
  onFilterByPersistent?: () => void;
}

export const KpiMetrics: React.FC<KpiMetricsProps> = ({
  stats,
  onFilterByRisk,
  onFilterByClass,
  onFilterByPersistent,
}) => {
  if (!stats) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 p-3 bg-[#0a0c10] border-b border-slate-800">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-16 bg-[#050608] animate-pulse rounded border border-slate-800/80" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 px-4 lg:px-6 py-2.5 bg-[#0a0c10] border-b border-slate-800">
      {/* 1. Total Hotspots */}
      <div className="bg-[#050608] hover:bg-[#0d1117] border border-slate-800 hover:border-slate-700 p-3 rounded transition group">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Hotspots</span>
          <Flame className="w-3.5 h-3.5 text-orange-500" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold font-mono text-white">{stats.total_hotspots}</span>
          <span className="text-[10px] text-slate-500 font-mono">FIRMS Ingested</span>
        </div>
      </div>

      {/* 2. High & Critical Risk */}
      <div
        onClick={() => onFilterByRisk && onFilterByRisk("HIGH")}
        className="bg-[#050608] hover:bg-red-950/20 border border-slate-800 hover:border-red-500/40 p-3 rounded transition cursor-pointer group"
      >
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">High / Critical</span>
          <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold font-mono text-red-500">{stats.high_risk_count}</span>
          <span className="text-[10px] text-red-500/70 font-mono">Priority Action</span>
        </div>
      </div>

      {/* 3. Persistent Sources */}
      <div
        onClick={() => onFilterByPersistent && onFilterByPersistent()}
        className="bg-[#050608] hover:bg-cyan-950/20 border border-slate-800 hover:border-cyan-500/40 p-3 rounded transition cursor-pointer group"
      >
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">Persistent Sources</span>
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold font-mono text-cyan-300">{stats.persistent_sources}</span>
          <span className="text-[10px] text-slate-500 font-mono">&gt;14d Multi-seen</span>
        </div>
      </div>

      {/* 4. Industrial Sources */}
      <div
        onClick={() => onFilterByClass && onFilterByClass("Gas Flare")}
        className="bg-[#050608] hover:bg-orange-950/20 border border-slate-800 hover:border-orange-500/40 p-3 rounded transition cursor-pointer group"
      >
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[10px] font-bold text-orange-400 uppercase tracking-wider">Industrial / Flares</span>
          <Factory className="w-3.5 h-3.5 text-orange-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold font-mono text-orange-400">{stats.industrial_sources}</span>
          <span className="text-[10px] text-slate-500 font-mono">Refinery / Chemical</span>
        </div>
      </div>

      {/* 5. Wildfires */}
      <div
        onClick={() => onFilterByClass && onFilterByClass("Wildfire")}
        className="bg-[#050608] hover:bg-emerald-950/20 border border-slate-800 hover:border-emerald-500/40 p-3 rounded transition cursor-pointer group"
      >
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Wildfires</span>
          <Trees className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold font-mono text-emerald-400">{stats.wildfires}</span>
          <span className="text-[10px] text-slate-500 font-mono">Forest Biomass</span>
        </div>
      </div>

      {/* 6. Active Emergency Alerts */}
      <div className="bg-[#050608] border border-slate-800 p-3 rounded transition">
        <div className="flex items-center justify-between text-slate-400 mb-1">
          <span className="text-[10px] font-bold text-orange-500 uppercase tracking-wider">Active Alerts</span>
          <BellRing className={`w-3.5 h-3.5 ${stats.active_alerts > 0 ? "text-orange-500 animate-bounce" : "text-slate-600"}`} />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-bold font-mono text-orange-400">{stats.active_alerts}</span>
          <span className="text-[10px] text-slate-500 font-mono">Disaster Advisory</span>
        </div>
      </div>
    </div>
  );
};
