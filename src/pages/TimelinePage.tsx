import React, { useState, useEffect } from "react";
import { History, Calendar, Clock, Flame, BarChart2, TrendingUp, Layers, RefreshCw, ArrowLeft, FileText, ChevronRight } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from "recharts";
import { apiService, HotspotItem } from "../services/api";

interface TimelinePageProps {
  selectedHotspot?: HotspotItem | null;
  onSelectHotspot?: (hotspot: HotspotItem) => void;
  onInspectDetails?: (hotspot: HotspotItem) => void;
  onReturnToMap?: () => void;
}

interface TimelineObservation {
  date?: string;
  timestamp?: string;
  frp: number;
  brightness: number;
  satellite: string;
  confidence?: number;
}

export const TimelinePage: React.FC<TimelinePageProps> = ({
  selectedHotspot,
  onSelectHotspot,
  onInspectDetails,
  onReturnToMap
}) => {
  const [hotspots, setHotspots] = useState<HotspotItem[]>([]);
  const [activeHotspot, setActiveHotspot] = useState<HotspotItem | null>(selectedHotspot || null);
  const [timelineData, setTimelineData] = useState<TimelineObservation[]>([]);
  const [loadingTimeline, setLoadingTimeline] = useState<boolean>(false);

  useEffect(() => {
    async function loadHotspots() {
      try {
        const data = await apiService.getHotspots();
        setHotspots(data);
        if (!activeHotspot && data.length > 0) {
          setActiveHotspot(data[0]);
        }
      } catch (err) {
        console.error("Failed to load hotspots for timeline", err);
      }
    }
    loadHotspots();
  }, []);

  useEffect(() => {
    if (selectedHotspot) {
      setActiveHotspot(selectedHotspot);
    }
  }, [selectedHotspot]);

  const fetchTimeline = async (hotspotToLoad: HotspotItem) => {
    try {
      setLoadingTimeline(true);
      const res = await apiService.getHotspotTimeline(hotspotToLoad.event.id);
      const history: TimelineObservation[] = Array.isArray(res)
        ? res
        : Array.isArray(res?.observation_history)
        ? res.observation_history
        : [];
      setTimelineData(history);
    } catch (err) {
      console.error("Failed to load timeline passes", err);
      setTimelineData([]);
    } finally {
      setLoadingTimeline(false);
    }
  };

  useEffect(() => {
    if (activeHotspot) {
      fetchTimeline(activeHotspot);
    }
  }, [activeHotspot]);

  const handleSelectTarget = (target: HotspotItem) => {
    setActiveHotspot(target);
    if (onSelectHotspot) onSelectHotspot(target);
  };

  const passesToRender: TimelineObservation[] =
    timelineData.length > 0
      ? timelineData
      : activeHotspot
      ? [
          {
            date: activeHotspot.event.timestamp ? activeHotspot.event.timestamp.split("T")[0] : "Current",
            timestamp: activeHotspot.event.timestamp,
            frp: activeHotspot.event.frp,
            brightness: activeHotspot.event.brightness,
            satellite: activeHotspot.event.satellite,
            confidence: activeHotspot.event.confidence
          }
        ]
      : [];

  const chartSeries = passesToRender.map((item, idx) => ({
    timestamp: item.date || (item.timestamp ? item.timestamp.split("T")[0] : `Pass ${idx + 1}`),
    time: item.timestamp ? item.timestamp.slice(11, 16) : "",
    frp: Number(item.frp?.toFixed(1) || 0),
    brightness: Number(item.brightness?.toFixed(1) || 0),
    satellite: item.satellite || "VIIRS",
    confidence: item.confidence || activeHotspot?.event.confidence || 90
  }));

  return (
    <div className="h-full overflow-y-auto p-5 bg-[#070b14] text-slate-100 space-y-5">
      {/* Top Navigation Bar */}
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

          {/* Target Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Target:</span>
            <select
              value={activeHotspot?.event.id || ""}
              onChange={(e) => {
                const found = hotspots.find((h) => h.event.id === e.target.value);
                if (found) handleSelectTarget(found);
              }}
              className="px-2.5 py-1 rounded bg-[#0d1526] border border-[#1a2947] text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              {hotspots.map((h) => (
                <option key={h.event.id} value={h.event.id}>
                  {h.event.id} — {h.classification.predicted_class} ({h.geo_context.nearest_industrial_facility})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {activeHotspot && onInspectDetails && (
            <button
              onClick={() => onInspectDetails(activeHotspot)}
              className="px-3 py-1 rounded bg-[#0f172a] hover:bg-[#18263f] text-cyan-300 border border-cyan-500/30 text-xs font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Detailed Dossier</span>
              <ChevronRight className="w-3 h-3 text-cyan-400" />
            </button>
          )}

          {activeHotspot && (
            <button
              onClick={() => fetchTimeline(activeHotspot)}
              title="Refresh orbit trajectory passes"
              className="p-1 rounded bg-[#0f172a] hover:bg-[#18263f] text-slate-400 hover:text-white border border-[#1e2d4a] cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingTimeline ? "animate-spin text-cyan-400" : ""}`} />
            </button>
          )}
        </div>
      </div>

      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#152033] gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold text-white">
              Temporal Persistence & Multi-Pass Revisit Timeline
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] text-teal-400 bg-teal-500/10 border border-teal-500/20">
              Temporal Intelligence Active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Differentiates transient biomass burning from continuous industrial infrastructure across historical satellite revisits.
          </p>
        </div>
      </div>

      {activeHotspot && (
        <div className="space-y-4">
          {/* Metrics summary row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded bg-[#090e1a] border border-[#152033]">
              <div className="text-[11px] text-slate-400">Temporal Signature</div>
              <div className="text-sm font-semibold text-white mt-1">
                {activeHotspot.temporal_profile.is_persistent ? (
                  <span className="text-teal-400 font-semibold">Persistent Source</span>
                ) : (
                  <span className="text-slate-400 font-semibold">Transient Anomaly</span>
                )}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                Cluster: {activeHotspot.temporal_profile.cluster_id}
              </div>
            </div>

            <div className="p-3.5 rounded bg-[#090e1a] border border-[#152033]">
              <div className="text-[11px] text-slate-400">Persistence Duration</div>
              <div className="text-base font-bold text-cyan-400 font-mono mt-1">
                {activeHotspot.temporal_profile.persistence_days} <span className="text-xs text-slate-400 font-normal">days active</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                First observed {activeHotspot.temporal_profile.first_seen}
              </div>
            </div>

            <div className="p-3.5 rounded bg-[#090e1a] border border-[#152033]">
              <div className="text-[11px] text-slate-400">Total Satellite Passes</div>
              <div className="text-base font-bold text-amber-400 font-mono mt-1">
                {activeHotspot.temporal_profile.observation_count} <span className="text-xs text-slate-400 font-normal">detections</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                ~{activeHotspot.temporal_profile.frequency_per_week} passes / week
              </div>
            </div>

            <div className="p-3.5 rounded bg-[#090e1a] border border-[#152033]">
              <div className="text-[11px] text-slate-400">Observation Recurrence</div>
              <div className="text-base font-bold text-teal-400 font-mono mt-1">
                {(activeHotspot.temporal_profile.recurrence_ratio * 100).toFixed(1)}%
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                Seasonality: {activeHotspot.temporal_profile.seasonal_pattern || "Continuous"}
              </div>
            </div>
          </div>

          {/* Interactive Time-Series Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Chart 1: Fire Radiative Power (MW) Over Time */}
            <div className="p-4 rounded bg-[#090e1a] border border-[#152033] flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <Flame className="w-4 h-4 text-orange-400" />
                  <span>Fire Radiative Power (FRP) Trajectory</span>
                </div>
                <span className="text-[10px] font-mono text-orange-400">Units: Megawatts (MW)</span>
              </div>

              <div className="h-56 w-full">
                {loadingTimeline ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">Loading trajectory...</div>
                ) : chartSeries.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartSeries} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#172236" />
                      <XAxis dataKey="timestamp" stroke="#64748b" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 10, fill: "#94a3b8" }} unit=" MW" />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#090e1a", borderColor: "#1e293b", fontSize: "11px", color: "#f8fafc" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="frp"
                        name="FRP (MW)"
                        stroke="#f97316"
                        strokeWidth={2}
                        dot={{ r: 4, fill: "#f97316" }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">No historical orbit passes recorded</div>
                )}
              </div>
            </div>

            {/* Chart 2: Brightness Temperature (K) Over Time */}
            <div className="p-4 rounded bg-[#090e1a] border border-[#152033] flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  <span>Brightness Temperature (K) Trajectory</span>
                </div>
                <span className="text-[10px] font-mono text-amber-400">Units: Kelvin (K)</span>
              </div>

              <div className="h-56 w-full">
                {loadingTimeline ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">Loading trajectory...</div>
                ) : chartSeries.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartSeries} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#172236" />
                      <XAxis dataKey="timestamp" stroke="#64748b" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                      <YAxis
                        stroke="#64748b"
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                        domain={["dataMin - 10", "dataMax + 10"]}
                        unit=" K"
                      />
                      <Tooltip
                        contentStyle={{ backgroundColor: "#090e1a", borderColor: "#1e293b", fontSize: "11px", color: "#f8fafc" }}
                      />
                      <Line
                        type="monotone"
                        dataKey="brightness"
                        name="Brightness (K)"
                        stroke="#f59e0b"
                        strokeWidth={2}
                        dot={{ r: 4, fill: "#f59e0b" }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">No historical orbit passes recorded</div>
                )}
              </div>
            </div>
          </div>

          {/* Temporal Reasoning Assessment Box */}
          <div className="p-4 rounded bg-[#090e1a] border border-[#152033]">
            <h3 className="text-xs font-semibold text-slate-200 mb-1.5 flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" />
              <span>Multi-Pass Temporal Assessment</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              The temporal engine clusters satellite passes within 500 meters of this coordinate across historical orbits.
              {activeHotspot.temporal_profile.is_persistent
                ? ` With ${activeHotspot.temporal_profile.observation_count} distinct detections over ${activeHotspot.temporal_profile.persistence_days} days and ${Math.round(activeHotspot.temporal_profile.recurrence_ratio * 100)}% recurrence, this source displays the persistent signature characteristic of continuous operational infrastructure rather than transient biomass burning.`
                : ` With only single-epoch or low recurrence observations (${activeHotspot.temporal_profile.observation_count} pass), this source displays transient thermal behavior characteristic of short-lived fire events.`}
            </p>
          </div>

          {/* Chronological Pass Orbit Log */}
          <div className="p-4 rounded bg-[#090e1a] border border-[#152033]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-400" />
                <span>Historical Satellite Orbit Passes ({passesToRender.length} Records)</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">VIIRS Day/Night Band & MODIS</span>
            </div>

            <div className="space-y-2 text-xs">
              {passesToRender.map((pass, idx) => {
                const passDate = pass.date || pass.timestamp || activeHotspot.event.timestamp || new Date().toISOString();
                const frpValue = pass.frp ?? activeHotspot.event.frp;
                const brightnessValue = pass.brightness ?? activeHotspot.event.brightness;
                const satName = pass.satellite || activeHotspot.event.satellite || "VIIRS-SNPP";

                return (
                  <div
                    key={idx}
                    className="p-2.5 rounded bg-[#0c1322] border border-[#141e30] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="font-mono text-slate-200">
                        {passDate.replace("T", " ").replace("Z", "")} UTC
                      </span>
                      <span className="text-slate-400 font-mono">Sensor: {satName}</span>
                    </div>

                    <div className="flex items-center gap-4 font-mono">
                      <div>
                        <span className="text-slate-500 text-[10px] mr-1">FRP:</span>
                        <span className="text-orange-400 font-semibold">{frpValue.toFixed(1)} MW</span>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] mr-1">Temp:</span>
                        <span className="text-amber-400 font-semibold">{brightnessValue.toFixed(1)} K</span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-teal-500/10 text-teal-400 border border-teal-500/20">
                        Confidence {pass.confidence || activeHotspot.event.confidence}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

