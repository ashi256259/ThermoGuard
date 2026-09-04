import React, { useState, useEffect } from "react";
import {
  FileSearch,
  CheckCircle2,
  Flame,
  Clock,
  Building2,
  AlertTriangle,
  ArrowLeft,
  MapPin,
  ChevronRight,
  ExternalLink
} from "lucide-react";
import { apiService, HotspotItem } from "../services/api";

interface SourceDetailsPageProps {
  hotspot: HotspotItem | null;
  onSelectHotspot?: (hotspot: HotspotItem) => void;
  onOpenTimeline?: (hotspot: HotspotItem) => void;
  onReturnToMap?: () => void;
}

export const SourceDetailsPage: React.FC<SourceDetailsPageProps> = ({
  hotspot,
  onSelectHotspot,
  onOpenTimeline,
  onReturnToMap
}) => {
  const [allHotspots, setAllHotspots] = useState<HotspotItem[]>([]);

  useEffect(() => {
    async function loadList() {
      try {
        const list = await apiService.getHotspots();
        setAllHotspots(list);
      } catch (e) {
        console.error("Failed to load hotspot list for switcher", e);
      }
    }
    loadList();
  }, []);

  if (!hotspot) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-slate-400 bg-[#070b14]">
        <FileSearch className="w-10 h-10 text-slate-600 mb-3" />
        <h3 className="text-sm font-semibold text-slate-200">No Thermal Target Selected</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm text-center">
          Select an observation from the Surveillance Map or Hotspot Catalog to inspect complete telemetry and forensic classification data.
        </p>
        <div className="mt-4 flex gap-2">
          {onReturnToMap && (
            <button
              onClick={onReturnToMap}
              className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Go to Surveillance Map</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  const { event, geo_context, temporal_profile, classification, alert } = hotspot;
  const isCritical = classification.risk_score === "CRITICAL";
  const isHigh = classification.risk_score === "HIGH";
  const isMedium = classification.risk_score === "MEDIUM";

  return (
    <div className="h-full overflow-y-auto p-5 bg-[#070b14] text-slate-100 space-y-5">
      {/* Top Navigation & Switcher Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded bg-[#090e1a] border border-[#152033]">
        <div className="flex items-center gap-3">
          {onReturnToMap && (
            <button
              onClick={onReturnToMap}
              className="px-2.5 py-1 rounded bg-[#0f172a] hover:bg-[#18263f] text-slate-300 hover:text-white border border-[#1e2d4a] text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-cyan-400" />
              <span>Surveillance Map</span>
            </button>
          )}

          {/* Quick Target Switcher Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Target:</span>
            <select
              value={hotspot.event.id}
              onChange={(e) => {
                const target = allHotspots.find((h) => h.event.id === e.target.value);
                if (target && onSelectHotspot) onSelectHotspot(target);
              }}
              className="px-2.5 py-1 rounded bg-[#0d1526] border border-[#1a2947] text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {allHotspots.map((h) => (
                <option key={h.event.id} value={h.event.id}>
                  {h.event.id} — {h.classification.predicted_class} ({h.classification.risk_score})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onOpenTimeline && (
            <button
              onClick={() => onOpenTimeline(hotspot)}
              className="px-3 py-1 rounded bg-[#0f172a] hover:bg-[#18263f] text-teal-300 border border-teal-500/30 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-teal-400" />
              <span>Revisit Timeline</span>
              <ChevronRight className="w-3 h-3 text-teal-400" />
            </button>
          )}
        </div>
      </div>

      {/* Title & Classification Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#152033] gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-white tracking-tight font-mono">{event.id}</h2>
            <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-[#0f172a] text-cyan-300 border border-cyan-500/30">
              {classification.predicted_class}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded text-xs font-medium border ${
                isCritical
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                  : isHigh
                  ? "bg-orange-500/10 text-orange-400 border-orange-500/30"
                  : isMedium
                  ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  : "bg-teal-500/10 text-teal-400 border-teal-500/30"
              }`}
            >
              {classification.risk_score} Risk ({Math.round(classification.risk_value)}/100)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Sensor Platform: <span className="text-slate-200">{event.satellite}</span> • Coordinates:{" "}
            <span className="font-mono text-slate-200">
              {event.latitude.toFixed(4)}° N, {event.longitude.toFixed(4)}° E
            </span>
          </p>
        </div>

        <div className="text-left md:text-right">
          <div className="text-[11px] text-slate-400">Classification Confidence</div>
          <div className="text-xl font-semibold text-teal-400 font-mono">
            {(classification.confidence * 100).toFixed(1)}%
          </div>
          <div className="text-[11px] text-slate-500 font-mono">Model: Random Forest Tabular v0.1</div>
        </div>
      </div>

      {/* 3 Telemetry Intelligence Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pillar 1: Thermal Attributes */}
        <div className="p-4 rounded bg-[#090e1a] border border-[#152033]">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 mb-3">
            <Flame className="w-4 h-4 text-amber-400" />
            <span>Thermal Telemetry</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[#121b2d]">
              <span className="text-slate-400">Brightness Temperature:</span>
              <span className="font-mono text-amber-400 font-medium">{event.brightness.toFixed(1)} K</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#121b2d]">
              <span className="text-slate-400">Fire Radiative Power:</span>
              <span className="font-mono text-orange-400 font-medium">{event.frp.toFixed(1)} MW</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#121b2d]">
              <span className="text-slate-400">FIRMS Detection Confidence:</span>
              <span className="font-mono text-teal-400 font-medium">{event.confidence}%</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#121b2d]">
              <span className="text-slate-400">Observation Timestamp:</span>
              <span className="font-mono text-slate-300">{new Date(event.timestamp).toUTCString()}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Sensor Product:</span>
              <span className="text-slate-300">VIIRS VNP14IMGTDL_NRT</span>
            </div>
          </div>
        </div>

        {/* Pillar 2: Spatial & Industrial Context */}
        <div className="p-4 rounded bg-[#090e1a] border border-[#152033]">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 mb-3">
            <Building2 className="w-4 h-4 text-cyan-400" />
            <span>Spatial & Land Cover Context</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[#121b2d]">
              <span className="text-slate-400">Nearest Industrial Facility:</span>
              <span className="text-slate-200 truncate max-w-[160px] font-medium" title={geo_context.nearest_industrial_facility}>
                {geo_context.nearest_industrial_facility}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#121b2d]">
              <span className="text-slate-400">Facility Distance:</span>
              <span className="font-mono text-teal-400 font-medium">
                {geo_context.distance_to_industry < 1000
                  ? `${Math.round(geo_context.distance_to_industry)} m`
                  : `${(geo_context.distance_to_industry / 1000).toFixed(2)} km`}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#121b2d]">
              <span className="text-slate-400">Land Cover Classification:</span>
              <span className="text-slate-300 capitalize">{geo_context.land_cover.replace("_", " ")}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#121b2d]">
              <span className="text-slate-400">OSM Infrastructure:</span>
              <span className="text-slate-300 truncate max-w-[160px]" title={geo_context.nearby_infrastructure}>
                {geo_context.nearby_infrastructure || "None recorded"}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Road Corridor Proximity:</span>
              <span className="font-mono text-slate-300">{Math.round(geo_context.distance_to_road || 0)} m</span>
            </div>
          </div>
        </div>

        {/* Pillar 3: Temporal Persistence */}
        <div className="p-4 rounded bg-[#090e1a] border border-[#152033]">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 mb-3">
            <Clock className="w-4 h-4 text-teal-400" />
            <span>Temporal Persistence</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-[#121b2d]">
              <span className="text-slate-400">Persistence Status:</span>
              <span className={temporal_profile.is_persistent ? "text-teal-400 font-medium" : "text-slate-400"}>
                {temporal_profile.is_persistent ? "Persistent Source" : "Transient Anomaly"}
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#121b2d]">
              <span className="text-slate-400">Cumulative Duration:</span>
              <span className="font-mono text-slate-200">{temporal_profile.persistence_days} days</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#121b2d]">
              <span className="text-slate-400">Total Satellite Passes:</span>
              <span className="font-mono text-slate-200">{temporal_profile.observation_count} revisits</span>
            </div>
            <div className="flex justify-between py-1 border-b border-[#121b2d]">
              <span className="text-slate-400">Revisit Frequency:</span>
              <span className="font-mono text-slate-200">{temporal_profile.frequency_per_week.toFixed(1)} / week</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Seasonal Index:</span>
              <span className="text-slate-300 capitalize">{temporal_profile.seasonal_pattern || "Non-seasonal"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Explainable Evidence */}
      <div className="p-4 rounded bg-[#090e1a] border border-[#152033]">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 mb-2">
          <CheckCircle2 className="w-4 h-4 text-teal-400" />
          <span>Explainable ML Evidence Chain</span>
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Verifiable features extracted from satellite telemetry, geospatial cadastre, and temporal persistence models.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {classification.evidence.map((ev, i) => (
            <div
              key={i}
              className="p-2.5 rounded bg-[#0c1322] border border-[#141e30] flex items-start gap-2.5 text-xs text-slate-300"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
              <span>{ev}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Alert & Emergency Response Section */}
      {alert && (
        <div className="p-4 rounded bg-[#090e1a] border border-[#152033]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Incident Response Protocol</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                alert.severity === "CRITICAL"
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                  : alert.severity === "HIGH"
                  ? "bg-orange-500/10 text-orange-400 border-orange-500/30"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30"
              }`}
            >
              Priority: {alert.severity}
            </span>
          </div>

          <div className="text-xs text-slate-300 space-y-1.5">
            <div>
              <span className="text-slate-400">Notification Title: </span>
              <span className="font-medium text-white">{alert.title}</span>
            </div>
            <div>
              <span className="text-slate-400">Description: </span>
              <span>{alert.description}</span>
            </div>
            <div>
              <span className="text-slate-400">Action Recommended: </span>
              <span className="text-cyan-300">{alert.action_recommended || "Verify site perimeter"}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
