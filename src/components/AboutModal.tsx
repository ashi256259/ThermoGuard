import React from "react";
import { X, Shield, Cpu, Database, Satellite, Layers, CheckCircle2 } from "lucide-react";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in text-slate-200">
      <div className="bg-[#0a0c10] border border-slate-800 rounded w-full max-w-3xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 bg-[#050608] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-orange-500/10 border border-orange-500/30 rounded">
              <Shield className="w-5 h-5 text-orange-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                ThermoGuard AI • Architecture & System Dossier
              </h2>
              <p className="text-[11px] text-slate-500 font-mono">
                Smart India Hackathon 2026 | NTRO | PS ID: SIH26162
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

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Core Problem Statement */}
          <div className="bg-[#050608] p-3.5 rounded border border-slate-800">
            <h3 className="text-xs font-bold text-orange-400 uppercase font-mono mb-1.5 tracking-wide">
              The SIH 2026 Problem Statement
            </h3>
            <p className="text-slate-300 leading-relaxed">
              NASA FIRMS detects raw satellite thermal anomalies (FRP, brightness temperature). However, 
              <strong> a thermal hotspot is not automatically an industrial fire</strong>.
              Routine flaring at petrochemical refineries emits high thermal signatures continuously, while true industrial disasters (e.g. chemical tank breaches) require immediate crisis response. 
              ThermoGuard AI fuses satellite detections with OpenStreetMap infrastructure, ESA land-cover, and multi-temporal tracking to distinguish benign flaring, agricultural stubble burning, and wildfires from real industrial emergencies.
            </p>
          </div>

          {/* 4 Pillars Architecture */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="bg-[#050608] p-3 rounded border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-cyan-400 font-mono font-bold text-[11px]">
                <Satellite className="w-4 h-4" />
                <span>1. Multi-Sensor FIRMS Ingestion</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Integrates VIIRS 375m I-band and MODIS 1km satellite observations with calibrated FRP and brightness temperature.
              </p>
            </div>

            <div className="bg-[#050608] p-3 rounded border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-orange-400 font-mono font-bold text-[11px]">
                <Layers className="w-4 h-4" />
                <span>2. Geospatial Context Engine</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Computes geodesic distances to OSM industrial facilities (refineries, chemical tanks, mines) and ESA WorldCover land-cover classes.
              </p>
            </div>

            <div className="bg-[#050608] p-3 rounded border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-mono font-bold text-[11px]">
                <Database className="w-4 h-4" />
                <span>3. Temporal Behavior Engine</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Tracks multi-day persistence, satellite revisit recurrence ratios, and sudden thermal onset vs long-duration flaring signatures.
              </p>
            </div>

            <div className="bg-[#050608] p-3 rounded border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-red-400 font-mono font-bold text-[11px]">
                <Cpu className="w-4 h-4" />
                <span>4. Random Forest & Risk Scorer</span>
              </div>
              <p className="text-slate-400 text-[11px]">
                Multi-class classification across 6 categories paired with transparent, explainable, non-hallucinatory physical evidence bullets.
              </p>
            </div>
          </div>

          {/* Target Classification Classes */}
          <div className="bg-[#050608] p-3.5 rounded border border-slate-800 space-y-2">
            <span className="font-mono font-bold text-slate-400 uppercase text-[10px] tracking-wider block">
              Classification Hierarchy
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
              <div className="bg-[#0a0c10] p-2 rounded border border-red-500/40 text-red-400">
                <strong>Industrial Fire:</strong> Uncontrolled emergency event
              </div>
              <div className="bg-[#0a0c10] p-2 rounded border border-orange-500/40 text-orange-400">
                <strong>Gas Flare:</strong> Routine refinery / petro flaring
              </div>
              <div className="bg-[#0a0c10] p-2 rounded border border-yellow-500/40 text-yellow-300">
                <strong>Agri Burning:</strong> Cropland post-harvest stubble
              </div>
              <div className="bg-[#0a0c10] p-2 rounded border border-emerald-500/40 text-emerald-400">
                <strong>Wildfire:</strong> Canopy forest biomass fire
              </div>
              <div className="bg-[#0a0c10] p-2 rounded border border-sky-500/40 text-sky-400">
                <strong>Mining:</strong> Coal seam spontaneous oxidation
              </div>
              <div className="bg-[#0a0c10] p-2 rounded border border-slate-800 text-slate-400">
                <strong>Other:</strong> Transient urban / brick kiln heat
              </div>
            </div>
          </div>

          {/* Data Mode & Real-time Integration Statement */}
          <div className="p-3 bg-[#050608] border border-orange-500/40 rounded text-orange-200 text-[11px] space-y-1">
            <strong className="text-orange-400 font-mono uppercase tracking-wider block text-[10px]">Data Provenance Notice:</strong>
            <p className="text-slate-300">
              The current live dashboard runs on <strong>Calibrated Demo Data</strong> tailored to real coordinates (Jamnagar, Hazira, Sangrur, Simlipal, Korba).
              The backend architecture is built with abstract base classes (<code>FIRMSDataProvider</code>, <code>OSMDataProvider</code>) and can switch to live NASA FIRMS API key queries anytime via <code>.env</code>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#050608] border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 font-mono">
          <span>National Technical Research Organisation (NTRO)</span>
          <button
            onClick={onClose}
            className="px-3.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
