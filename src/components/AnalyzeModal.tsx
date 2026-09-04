import React, { useState } from "react";
import { X, Flame, ShieldAlert, Sparkles, Navigation } from "lucide-react";
import { HotspotRecord } from "../types";

interface AnalyzeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHotspotCreated: (newHotspot: HotspotRecord) => void;
}

export const AnalyzeModal: React.FC<AnalyzeModalProps> = ({
  isOpen,
  onClose,
  onHotspotCreated,
}) => {
  const [lat, setLat] = useState<string>("22.3595");
  const [lon, setLon] = useState<string>("69.8648");
  const [brightness, setBrightness] = useState<string>("372.0");
  const [frp, setFrp] = useState<string>("65.0");
  const [confidence, setConfidence] = useState<string>("95.0");
  const [satellite, setSatellite] = useState<string>("VIIRS_SNPP");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: parseFloat(lat),
          longitude: parseFloat(lon),
          brightness: parseFloat(brightness),
          frp: parseFloat(frp),
          confidence: parseFloat(confidence),
          satellite,
        }),
      });

      if (!res.ok) {
        throw new Error(`Pipeline execution failed: ${res.statusText}`);
      }

      const analyzedHotspot: HotspotRecord = await res.json();
      onHotspotCreated(analyzedHotspot);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to analyze thermal event");
    } finally {
      setIsSubmitting(false);
    }
  };

  const applyPreset = (pLat: string, pLon: string, pB: string, pF: string) => {
    setLat(pLat);
    setLon(pLon);
    setBrightness(pB);
    setFrp(pF);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0a0c10] border border-slate-800 rounded w-full max-w-lg shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="p-4 bg-[#050608] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Flame className="w-5 h-5 text-orange-500" />
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                On-Demand Hotspot Classification
              </h2>
              <p className="text-[11px] text-slate-500">
                Execute geospatial + temporal + Random Forest pipeline on custom coordinates.
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {/* Presets Bar */}
          <div>
            <span className="text-[11px] font-mono text-slate-500 block mb-1.5 font-bold uppercase tracking-wider">Quick Test Presets:</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset("22.3591", "69.8652", "375.0", "58.0")}
                className="px-2.5 py-1 bg-[#050608] hover:bg-[#0d1117] text-orange-400 rounded border border-slate-800 hover:border-slate-700 text-[11px] font-mono transition cursor-pointer"
              >
                Jamnagar Flare
              </button>
              <button
                type="button"
                onClick={() => applyPreset("21.1145", "72.6732", "398.0", "155.0")}
                className="px-2.5 py-1 bg-[#050608] hover:bg-[#0d1117] text-red-400 rounded border border-slate-800 hover:border-slate-700 text-[11px] font-mono transition cursor-pointer"
              >
                Hazira Explosion
              </button>
              <button
                type="button"
                onClick={() => applyPreset("30.2451", "75.8341", "330.0", "26.0")}
                className="px-2.5 py-1 bg-[#050608] hover:bg-[#0d1117] text-yellow-400 rounded border border-slate-800 hover:border-slate-700 text-[11px] font-mono transition cursor-pointer"
              >
                Punjab Crop Field
              </button>
              <button
                type="button"
                onClick={() => applyPreset("21.8450", "86.3210", "360.0", "95.0")}
                className="px-2.5 py-1 bg-[#050608] hover:bg-[#0d1117] text-emerald-400 rounded border border-slate-800 hover:border-slate-700 text-[11px] font-mono transition cursor-pointer"
              >
                Simlipal Forest
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-mono mb-1 text-[11px]">Latitude (°N)</label>
              <input
                type="number"
                step="0.0001"
                required
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                className="w-full bg-[#050608] border border-slate-800 text-white px-3 py-1.5 rounded focus:border-orange-500 font-mono transition"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-mono mb-1 text-[11px]">Longitude (°E)</label>
              <input
                type="number"
                step="0.0001"
                required
                value={lon}
                onChange={(e) => setLon(e.target.value)}
                className="w-full bg-[#050608] border border-slate-800 text-white px-3 py-1.5 rounded focus:border-orange-500 font-mono transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-400 font-mono mb-1 text-[11px]">Brightness (K)</label>
              <input
                type="number"
                step="0.1"
                required
                value={brightness}
                onChange={(e) => setBrightness(e.target.value)}
                className="w-full bg-[#050608] border border-slate-800 text-white px-3 py-1.5 rounded focus:border-orange-500 font-mono transition"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-mono mb-1 text-[11px]">FRP (MW)</label>
              <input
                type="number"
                step="0.1"
                required
                value={frp}
                onChange={(e) => setFrp(e.target.value)}
                className="w-full bg-[#050608] border border-slate-800 text-white px-3 py-1.5 rounded focus:border-orange-500 font-mono transition"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-mono mb-1 text-[11px]">Confidence (%)</label>
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                value={confidence}
                onChange={(e) => setConfidence(e.target.value)}
                className="w-full bg-[#050608] border border-slate-800 text-white px-3 py-1.5 rounded focus:border-orange-500 font-mono transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-400 font-mono mb-1 text-[11px]">Sensor / Satellite</label>
            <select
              value={satellite}
              onChange={(e) => setSatellite(e.target.value)}
              className="w-full bg-[#050608] border border-slate-800 text-white px-3 py-1.5 rounded focus:border-orange-500 font-mono transition"
            >
              <option value="VIIRS_SNPP">VIIRS SNPP (375m high-res I-band)</option>
              <option value="VIIRS_NOAA20">VIIRS NOAA-20 (375m)</option>
              <option value="MODIS_Aqua">MODIS Aqua (1km)</option>
              <option value="MODIS_Terra">MODIS Terra (1km)</option>
            </select>
          </div>

          {errorMsg && (
            <div className="p-2.5 bg-red-950/40 border border-red-500/50 text-red-300 rounded text-[11px]">
              {errorMsg}
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-medium cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded font-semibold flex items-center gap-1.5 shadow-lg shadow-orange-950/30 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{isSubmitting ? "Running Pipeline..." : "Execute ML Analysis"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
