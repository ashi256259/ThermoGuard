import React, { useState, useEffect } from "react";
import { X, Play, Compass, CheckCircle2, ChevronRight, AlertTriangle } from "lucide-react";
import { DemoScenario } from "../types";

interface ScenarioDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectScenario: (scenario: DemoScenario) => void;
  activeScenarioId?: string;
}

export const ScenarioDrawer: React.FC<ScenarioDrawerProps> = ({
  isOpen,
  onClose,
  onSelectScenario,
  activeScenarioId,
}) => {
  const [scenarios, setScenarios] = useState<DemoScenario[]>([]);

  useEffect(() => {
    fetch("/api/scenarios")
      .then((res) => res.json())
      .then((data) => setScenarios(data))
      .catch(() => setScenarios([]));
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0a0c10] border border-slate-800 rounded w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 bg-[#050608] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-orange-500" />
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Smart India Hackathon 2026 Validation Scenarios
              </h2>
              <p className="text-[11px] text-slate-500">
                Problem Statement SIH26162: Distinguishing industrial fires from routine flares and biomass burns.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scenarios List */}
        <div className="p-4 overflow-y-auto space-y-3">
          {scenarios.map((sc) => {
            const isActive = activeScenarioId === sc.id;
            return (
              <div
                key={sc.id}
                className={`p-3.5 rounded border transition cursor-pointer ${
                  isActive
                    ? "bg-[#0d1117] border-orange-500/80 shadow-md shadow-orange-950/20"
                    : "bg-[#050608] border-slate-800 hover:border-slate-700 hover:bg-[#0d1117]"
                }`}
                onClick={() => {
                  onSelectScenario(sc);
                  onClose();
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-white">{sc.name}</span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                          sc.risk === "CRITICAL"
                            ? "bg-red-950/40 text-red-300 border-red-500/50"
                            : sc.risk === "HIGH"
                            ? "bg-orange-950/40 text-orange-300 border-orange-500/50"
                            : sc.risk === "MEDIUM"
                            ? "bg-amber-950/40 text-amber-300 border-amber-500/50"
                            : "bg-emerald-950/40 text-emerald-300 border-emerald-500/50"
                        }`}
                      >
                        {sc.risk} RISK
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{sc.description}</p>
                    <div className="bg-[#0a0c10] p-2 rounded text-[11px] text-orange-300/90 border border-slate-800">
                      <strong className="text-orange-400">Key Insight:</strong> {sc.key_insight}
                    </div>
                  </div>

                  <button className="flex items-center gap-1 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white px-2.5 py-1.5 rounded transition shrink-0 mt-1 cursor-pointer">
                    <Play className="w-3 h-3 fill-current" />
                    <span>Run</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#050608] border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>NTRO Evaluation Suite</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
