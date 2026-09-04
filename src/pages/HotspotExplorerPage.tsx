import React, { useState, useEffect } from "react";
import { Search, AlertCircle, Radio, X, MapPin, FileText, Clock } from "lucide-react";
import { apiService, HotspotItem } from "../services/api";

interface HotspotExplorerProps {
  onSelectHotspot?: (hotspot: HotspotItem) => void;
  onViewOnMap?: (hotspot: HotspotItem) => void;
  onOpenTimeline?: (hotspot: HotspotItem) => void;
}

export const HotspotExplorerPage: React.FC<HotspotExplorerProps> = ({
  onSelectHotspot,
  onViewOnMap,
  onOpenTimeline
}) => {
  const [hotspots, setHotspots] = useState<HotspotItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("All");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await apiService.getHotspots();
        setHotspots(data);
        setError(null);
      } catch (err: any) {
        setError(err.message || "Failed to load hotspots catalog");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = hotspots.filter((h) => {
    const matchesSearch =
      h.event.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.geo_context.nearest_industrial_facility.toLowerCase().includes(searchQuery.toLowerCase()) ||
      h.classification.predicted_class.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = selectedClass === "All" || h.classification.predicted_class === selectedClass;
    return matchesSearch && matchesClass;
  });

  return (
    <div className="h-full flex flex-col p-5 overflow-y-auto bg-[#070b14] text-slate-100">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-[#152033] gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold text-white">
              Thermal Observation Catalog
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] text-teal-400 bg-teal-500/10 border border-teal-500/20">
              NASA FIRMS & SIH
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Registered thermal anomaly observations with contextual spatial and temporal attributes.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search ID, facility, or class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-7 py-1.5 rounded bg-[#0d1526] border border-[#1a2947] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 w-64"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-3 py-1.5 rounded bg-[#0d1526] border border-[#1a2947] text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="All">All Source Classes</option>
            <option value="Industrial Fire">Industrial Fire</option>
            <option value="Gas Flare">Gas Flare</option>
            <option value="Agricultural Burning">Agricultural Burning</option>
            <option value="Wildfire">Wildfire</option>
            <option value="Mining">Mining</option>
            <option value="Other">Other</option>
          </select>

          {(selectedClass !== "All" || searchQuery) && (
            <button
              onClick={() => {
                setSelectedClass("All");
                setSearchQuery("");
              }}
              className="px-2.5 py-1.5 rounded bg-[#131d35] hover:bg-[#1a2947] text-cyan-300 border border-cyan-500/30 text-xs flex items-center gap-1 transition cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Status Strip */}
      <div className="mt-3 p-2.5 rounded bg-[#090e1a] border border-[#152033] flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Radio className="w-3.5 h-3.5 text-cyan-400" />
          <span>
            Showing <span className="font-semibold text-white">{filtered.length}</span> of <span className="font-semibold text-white">{hotspots.length}</span> observations. Click any row or action to inspect intelligence dossier.
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
          Coordinate System: EPSG:4326 (WGS-84)
        </span>
      </div>

      {/* Catalog Table */}
      <div className="mt-3 flex-1 rounded border border-[#152033] bg-[#090e1a] overflow-hidden flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-xs">
            Loading observation records...
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center text-rose-400 text-xs gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0b1220] text-slate-400 font-medium text-[11px] border-b border-[#152033]">
                <tr>
                  <th className="px-3.5 py-2.5">Event ID</th>
                  <th className="px-3.5 py-2.5">Coordinates</th>
                  <th className="px-3.5 py-2.5">FRP / Temp</th>
                  <th className="px-3.5 py-2.5">Nearest Facility</th>
                  <th className="px-3.5 py-2.5">Distance</th>
                  <th className="px-3.5 py-2.5">Land Cover</th>
                  <th className="px-3.5 py-2.5">Predicted Class</th>
                  <th className="px-3.5 py-2.5">Risk Level</th>
                  <th className="px-3.5 py-2.5">Persistence</th>
                  <th className="px-3.5 py-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#131c2e] text-xs">
                {filtered.map((item) => {
                  const isCrit = item.classification.risk_score === "CRITICAL";
                  const isHigh = item.classification.risk_score === "HIGH";
                  const isMed = item.classification.risk_score === "MEDIUM";
                  return (
                    <tr
                      key={item.event.id}
                      className="hover:bg-[#0f182b] transition-colors"
                    >
                      <td
                        className="px-3.5 py-2.5 font-mono text-cyan-400 font-medium cursor-pointer hover:underline"
                        onClick={() => onSelectHotspot && onSelectHotspot(item)}
                      >
                        {item.event.id}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-slate-300">
                        {item.event.latitude.toFixed(4)}, {item.event.longitude.toFixed(4)}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono">
                        <span className="text-amber-400 font-medium">{item.event.frp.toFixed(1)} MW</span>
                        <span className="text-slate-500 ml-1">({item.event.brightness.toFixed(1)} K)</span>
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-300 truncate max-w-[180px]" title={item.geo_context.nearest_industrial_facility}>
                        {item.geo_context.nearest_industrial_facility}
                      </td>
                      <td className="px-3.5 py-2.5 font-mono text-teal-400">
                        {item.geo_context.distance_to_industry < 1000
                          ? `${Math.round(item.geo_context.distance_to_industry)} m`
                          : `${(item.geo_context.distance_to_industry / 1000).toFixed(2)} km`}
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-300 capitalize">
                        {item.geo_context.land_cover.replace("_", " ")}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className="text-white font-medium">
                          {item.classification.predicted_class}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-medium border ${
                            isCrit
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                              : isHigh
                              ? "bg-orange-500/10 text-orange-400 border-orange-500/30"
                              : isMed
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                              : "bg-teal-500/10 text-teal-400 border-teal-500/30"
                          }`}
                        >
                          {item.classification.risk_score}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-slate-400">
                        {item.temporal_profile.is_persistent ? (
                          <span className="text-teal-400">Persistent ({item.temporal_profile.persistence_days}d)</span>
                        ) : (
                          <span className="text-slate-400">Transient (1d)</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectHotspot && onSelectHotspot(item)}
                            title="Inspect Detailed Dossier"
                            className="p-1 rounded bg-[#0f172a] hover:bg-[#18263f] text-cyan-400 border border-cyan-500/20 cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onViewOnMap && onViewOnMap(item)}
                            title="View on Surveillance Map"
                            className="p-1 rounded bg-[#0f172a] hover:bg-[#18263f] text-emerald-400 border border-emerald-500/20 cursor-pointer"
                          >
                            <MapPin className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onOpenTimeline && onOpenTimeline(item)}
                            title="Temporal Timeline"
                            className="p-1 rounded bg-[#0f172a] hover:bg-[#18263f] text-teal-400 border border-teal-500/20 cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
