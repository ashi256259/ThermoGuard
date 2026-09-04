import React from "react";
import { Filter, RotateCcw, MapPin, Sliders } from "lucide-react";

interface FilterBarProps {
  selectedClass: string;
  onSelectClass: (cls: string) => void;
  selectedRisk: string;
  onSelectRisk: (risk: string) => void;
  isPersistentOnly: boolean;
  onTogglePersistentOnly: () => void;
  minConfidence: number;
  onChangeMinConfidence: (conf: number) => void;
  selectedRegion: string;
  onSelectRegion: (regId: string) => void;
  onResetFilters: () => void;
  totalFilteredCount: number;
  totalCount: number;
}

const REGION_OPTIONS = [
  { id: "all_india", name: "All India Overview" },
  { id: "jamnagar_petro", name: "Gujarat Petro Corridor" },
  { id: "punjab_agri", name: "Punjab Agri Belt" },
  { id: "simlipal_forest", name: "Simlipal Forest Reserve" },
  { id: "korba_mining", name: "Korba Mining Basin" },
];

const CLASS_OPTIONS = [
  "All",
  "Industrial Fire",
  "Gas Flare",
  "Agricultural Burning",
  "Wildfire",
  "Mining",
  "Other"
];

const RISK_OPTIONS = ["All", "LOW", "MEDIUM", "HIGH", "CRITICAL"];

export const FilterBar: React.FC<FilterBarProps> = ({
  selectedClass,
  onSelectClass,
  selectedRisk,
  onSelectRisk,
  isPersistentOnly,
  onTogglePersistentOnly,
  minConfidence,
  onChangeMinConfidence,
  selectedRegion,
  onSelectRegion,
  onResetFilters,
  totalFilteredCount,
  totalCount,
}) => {
  return (
    <div className="bg-[#07090d] border-b border-slate-800 px-4 lg:px-6 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex flex-wrap items-center gap-3">
        {/* Region Quick Selector */}
        <div className="flex items-center gap-1.5 text-slate-300">
          <MapPin className="w-3.5 h-3.5 text-orange-500" />
          <span className="text-slate-400 font-medium">Region:</span>
          <select
            value={selectedRegion}
            onChange={(e) => onSelectRegion(e.target.value)}
            className="bg-[#050608] border border-slate-800 hover:border-slate-700 text-slate-200 px-2.5 py-1 rounded focus:outline-none focus:border-orange-500 font-mono text-xs transition"
          >
            {REGION_OPTIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div className="hidden md:block w-px h-4 bg-slate-800" />

        {/* Source Class Filter */}
        <div className="flex items-center gap-1.5 text-slate-300">
          <span className="text-slate-400 font-medium">Class:</span>
          <select
            value={selectedClass}
            onChange={(e) => onSelectClass(e.target.value)}
            className="bg-[#050608] border border-slate-800 hover:border-slate-700 text-slate-200 px-2.5 py-1 rounded focus:outline-none focus:border-orange-500 font-mono text-xs transition"
          >
            {CLASS_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Risk Level Filter */}
        <div className="flex items-center gap-1.5 text-slate-300">
          <span className="text-slate-400 font-medium">Risk:</span>
          <select
            value={selectedRisk}
            onChange={(e) => onSelectRisk(e.target.value)}
            className="bg-[#050608] border border-slate-800 hover:border-slate-700 text-slate-200 px-2.5 py-1 rounded focus:outline-none focus:border-orange-500 font-mono text-xs transition"
          >
            {RISK_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        {/* Persistent Only Toggle */}
        <button
          onClick={onTogglePersistentOnly}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition font-mono ${
            isPersistentOnly
              ? "bg-cyan-950/40 text-cyan-300 border-cyan-500/60 font-semibold shadow-sm"
              : "bg-[#050608] text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200"
          }`}
        >
          <span>Persistent Only</span>
        </button>

        {/* Confidence Slider */}
        <div className="hidden lg:flex items-center gap-2 text-slate-400">
          <Sliders className="w-3.5 h-3.5 text-slate-500" />
          <span>Min Conf:</span>
          <input
            type="range"
            min="0"
            max="100"
            value={minConfidence}
            onChange={(e) => onChangeMinConfidence(Number(e.target.value))}
            className="w-20 accent-orange-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
          />
          <span className="font-mono text-orange-400 w-8">{minConfidence}%</span>
        </div>
      </div>

      {/* Result Count and Reset Button */}
      <div className="flex items-center gap-3">
        <span className="text-slate-400 font-mono">
          Showing <strong className="text-white">{totalFilteredCount}</strong> of{" "}
          <span className="text-slate-500">{totalCount}</span> Hotspots
        </span>
        <button
          onClick={onResetFilters}
          className="flex items-center gap-1 text-slate-400 hover:text-white hover:bg-slate-900 px-2.5 py-1 rounded border border-slate-800 transition cursor-pointer"
          title="Reset Filters to Default"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
};
