import React, { useState, useEffect, useRef } from "react";
import {
  Radio,
  MapPin,
  Clock,
  Filter,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  Flame,
  Building2,
  Compass,
  AlertTriangle,
  RefreshCw,
  Satellite,
  X,
  Layers
} from "lucide-react";
import L from "leaflet";
import { apiService, HotspotItem, StatisticsData } from "../services/api";

interface DashboardPageProps {
  selectedHotspotProp?: HotspotItem | null;
  onSelectHotspot?: (hotspot: HotspotItem) => void;
  onInspectDetails?: (hotspot: HotspotItem) => void;
  onOpenTimeline?: (hotspot: HotspotItem) => void;
}

interface DemoScenarioOption {
  id: string;
  name: string;
  location: string;
  coords: [number, number];
  zoom: number;
  category: string;
  risk: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  insight: string;
  prefix: string;
}

const DEMO_SCENARIOS: DemoScenarioOption[] = [
  {
    id: "jamnagar",
    name: "Scenario 1: Jamnagar Refinery",
    location: "Gujarat",
    coords: [22.3591, 69.8652],
    zoom: 12,
    category: "Gas Flare / Petrochem",
    risk: "CRITICAL",
    insight: "Recurrent thermal flare within 300m of petrochemical infrastructure.",
    prefix: "jam"
  },
  {
    id: "hazira",
    name: "Scenario 1B: Hazira Petrochem",
    location: "Surat, Gujarat",
    coords: [21.1145, 72.6732],
    zoom: 12,
    category: "Industrial Fire vs Flare",
    risk: "CRITICAL",
    insight: "High FRP thermal burst in processing zone requiring emergency containment.",
    prefix: "haz"
  },
  {
    id: "punjab",
    name: "Scenario 2: Punjab Agricultural Belt",
    location: "Sangrur, Punjab",
    coords: [30.2451, 75.8341],
    zoom: 11,
    category: "Agricultural Stubble Burning",
    risk: "HIGH",
    insight: "Seasonal post-harvest cluster across intensive agricultural parcel.",
    prefix: "pnb"
  },
  {
    id: "simlipal",
    name: "Scenario 3: Simlipal Biosphere",
    location: "Mayurbhanj, Odisha",
    coords: [21.845, 86.321],
    zoom: 10,
    category: "Forest Wildfire Incident",
    risk: "HIGH",
    insight: "Dense forest thermal anomaly with zero industrial presence within 25km.",
    prefix: "sim"
  },
  {
    id: "korba",
    name: "Scenario 4: Korba Open-Cast Mine",
    location: "Chhattisgarh",
    coords: [22.3425, 82.5942],
    zoom: 12,
    category: "Active Mining & Coal Seam",
    risk: "MEDIUM",
    insight: "Moderate persistent thermal emissions in active open-cast extraction zone.",
    prefix: "krb"
  }
];

export const DashboardPage: React.FC<DashboardPageProps> = ({
  selectedHotspotProp,
  onSelectHotspot,
  onInspectDetails,
  onOpenTimeline
}) => {
  const [hotspots, setHotspots] = useState<HotspotItem[]>([]);
  const [stats, setStats] = useState<StatisticsData | null>(null);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotItem | null>(selectedHotspotProp || null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [selectedClass, setSelectedClass] = useState<string>("All");
  const [selectedRisk, setSelectedRisk] = useState<string>("All");
  const [activeScenario, setActiveScenario] = useState<DemoScenarioOption | null>(null);
  const [demoDropdownOpen, setDemoDropdownOpen] = useState<boolean>(false);

  // Map DOM references
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersGroupRef = useRef<any>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync prop changes
  useEffect(() => {
    if (selectedHotspotProp) {
      setSelectedHotspot(selectedHotspotProp);
    }
  }, [selectedHotspotProp]);

  // Set up global Leaflet popup action handlers
  useEffect(() => {
    (window as any).__tg_inspect = (id: string) => {
      const found = hotspots.find((h) => h.event.id === id);
      if (found && onInspectDetails) {
        onInspectDetails(found);
      }
    };
    (window as any).__tg_timeline = (id: string) => {
      const found = hotspots.find((h) => h.event.id === id);
      if (found && onOpenTimeline) {
        onOpenTimeline(found);
      }
    };
    (window as any).__tg_select = (id: string) => {
      const found = hotspots.find((h) => h.event.id === id);
      if (found) {
        setSelectedHotspot(found);
        if (onSelectHotspot) onSelectHotspot(found);
      }
    };
    return () => {
      delete (window as any).__tg_inspect;
      delete (window as any).__tg_timeline;
      delete (window as any).__tg_select;
    };
  }, [hotspots, onInspectDetails, onOpenTimeline, onSelectHotspot]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDemoDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Update selection locally and notify parent
  const handleSelectHotspotInternal = (h: HotspotItem) => {
    setSelectedHotspot(h);
    if (onSelectHotspot) onSelectHotspot(h);
  };

  // Load data from backend API
  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      const [hotspotsData, statsData] = await Promise.all([
        apiService.getHotspots(),
        apiService.getStatistics()
      ]);
      setHotspots(hotspotsData);
      setStats(statsData);
      if (hotspotsData.length > 0 && !selectedHotspot) {
        handleSelectHotspotInternal(hotspotsData[0]);
      }
    } catch (err) {
      console.error("Failed to load surveillance dashboard data", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [22.5, 78.5],
      zoom: 5,
      zoomControl: false,
      attributionControl: true
    });

    // Reliable OpenStreetMap public basemap
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    L.control.zoom({ position: "bottomright" }).addTo(map);

    markersGroupRef.current = L.featureGroup().addTo(map);
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers on Map when hotspots or filters change
  useEffect(() => {
    if (!mapInstanceRef.current || !markersGroupRef.current) return;

    const group = markersGroupRef.current;
    group.clearLayers();

    const filtered = hotspots.filter((h) => {
      const matchClass = selectedClass === "All" || h.classification.predicted_class === selectedClass;
      const matchRisk = selectedRisk === "All" || h.classification.risk_score === selectedRisk;
      return matchClass && matchRisk;
    });

    filtered.forEach((h) => {
      const isSelected = selectedHotspot?.event.id === h.event.id;
      const riskScore = h.classification.risk_score;
      const isCritical = riskScore === "CRITICAL";
      const isHigh = riskScore === "HIGH";
      const isMedium = riskScore === "MEDIUM";

      // Color mapping
      const markerColor = isCritical
        ? "#ef4444"
        : isHigh
        ? "#f97316"
        : isMedium
        ? "#f59e0b"
        : "#14b8a6";

      // Distinct CSS-based shape and muted pulsing animation based on operational risk level
      let markerHtml = "";
      if (isCritical) {
        markerHtml = `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; cursor: pointer;">
            ${
              isSelected
                ? `<div style="position: absolute; width: 32px; height: 32px; border: 1.5px dashed #38bdf8; border-radius: 50%; opacity: 0.95;"></div>`
                : ""
            }
            <div class="pulse-ring-critical" style="position: absolute; width: 24px; height: 24px; border-radius: 50%; border: 1.5px solid #ef4444; background: rgba(239, 68, 68, 0.15); pointer-events: none;"></div>
            <div style="position: absolute; width: 18px; height: 18px; transform: rotate(45deg); border-radius: 2px; background: rgba(239, 68, 68, 0.22);"></div>
            <div style="position: relative; width: 11px; height: 11px; transform: rotate(45deg); background: #ef4444; border: 1.5px solid #ffffff; border-radius: 1px; box-shadow: 0 0 6px rgba(239, 68, 68, 0.7);"></div>
          </div>
        `;
      } else if (isHigh) {
        markerHtml = `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px; cursor: pointer;">
            ${
              isSelected
                ? `<div style="position: absolute; width: 30px; height: 30px; border: 1.5px dashed #38bdf8; border-radius: 50%; opacity: 0.95;"></div>`
                : ""
            }
            <div class="pulse-ring-high" style="position: absolute; width: 22px; height: 22px; border-radius: 50%; border: 1.2px solid #f97316; background: rgba(249, 115, 22, 0.12); pointer-events: none;"></div>
            <div style="position: absolute; width: 16px; height: 16px; border-radius: 3px; background: rgba(249, 115, 22, 0.2);"></div>
            <div style="position: relative; width: 10px; height: 10px; border-radius: 2px; background: #f97316; border: 1.5px solid #ffffff; box-shadow: 0 0 5px rgba(249, 115, 22, 0.6);"></div>
          </div>
        `;
      } else if (isMedium) {
        markerHtml = `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; cursor: pointer;">
            ${
              isSelected
                ? `<div style="position: absolute; width: 26px; height: 26px; border: 1.5px dashed #38bdf8; border-radius: 50%; opacity: 0.95;"></div>`
                : ""
            }
            <div style="position: absolute; width: 16px; height: 16px; border-radius: 50%; background: rgba(245, 158, 11, 0.18);"></div>
            <div style="position: relative; width: 0; height: 0; border-left: 5.5px solid transparent; border-right: 5.5px solid transparent; border-bottom: 9.5px solid #f59e0b; filter: drop-shadow(0 0 2px rgba(245, 158, 11, 0.8));"></div>
          </div>
        `;
      } else {
        markerHtml = `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; cursor: pointer;">
            ${
              isSelected
                ? `<div style="position: absolute; width: 22px; height: 22px; border: 1.5px dashed #38bdf8; border-radius: 50%; opacity: 0.95;"></div>`
                : ""
            }
            <div style="position: absolute; width: 14px; height: 14px; border-radius: 50%; background: rgba(20, 184, 166, 0.2);"></div>
            <div style="position: relative; width: 8px; height: 8px; border-radius: 50%; background: #14b8a6; border: 1.2px solid #ffffff; box-shadow: 0 0 4px rgba(20, 184, 166, 0.5);"></div>
          </div>
        `;
      }

      const customIcon = L.divIcon({
        className: "custom-hotspot-marker",
        html: markerHtml,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      const marker = L.marker([h.event.latitude, h.event.longitude], { icon: customIcon });
      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        handleSelectHotspotInternal(h);
      });

      const isLiveSource = h.event.source === "NASA_FIRMS_LIVE";

      // GIS Popup with direct action buttons
      marker.bindPopup(`
        <div style="font-family: ui-sans-serif, system-ui, sans-serif; background: #0b1120; color: #f8fafc; padding: 10px 12px; border: 1px solid #1e293b; border-radius: 6px; min-width: 220px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <span style="font-size: 11px; font-family: ui-monospace, monospace; color: #94a3b8;">${h.event.id}</span>
            <span style="font-size: 10px; font-weight: 600; color: ${markerColor};">${h.classification.risk_score} RISK</span>
          </div>
          <div style="font-size: 13px; font-weight: 600; color: #38bdf8; margin-bottom: 4px;">${h.classification.predicted_class}</div>
          <div style="font-size: 10px; margin-bottom: 6px; color: ${isLiveSource ? '#34d399' : '#fbbf24'}; font-weight: 500;">
            ${isLiveSource ? '● LIVE NASA FIRMS' : '🧪 SIH DEMO SCENARIO'}
          </div>
          <div style="font-size: 11px; color: #cbd5e1; border-top: 1px solid #1e293b; padding-top: 6px; line-height: 1.6;">
            <div>FRP: <span style="color: #f59e0b; font-weight: 600;">${h.event.frp.toFixed(1)} MW</span></div>
            <div>Brightness: <span style="color: #f59e0b;">${h.event.brightness.toFixed(1)} K</span></div>
            <div>Facility: <span style="color: #94a3b8;">${h.geo_context.nearest_industrial_facility}</span></div>
            <div>Distance: <span style="color: #10b981; font-weight: 500;">${Math.round(h.geo_context.distance_to_industry)} m</span></div>
          </div>
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #1e293b; display: flex; gap: 6px;">
            <button onclick="window.__tg_inspect && window.__tg_inspect('${h.event.id}')" style="flex: 1; padding: 4px 6px; font-size: 10px; font-weight: 600; background: #0f172a; color: #38bdf8; border: 1px solid rgba(56,189,248,0.3); border-radius: 4px; cursor: pointer;">
              Dossier →
            </button>
            <button onclick="window.__tg_timeline && window.__tg_timeline('${h.event.id}')" style="flex: 1; padding: 4px 6px; font-size: 10px; font-weight: 500; background: #0f172a; color: #14b8a6; border: 1px solid rgba(20,184,166,0.3); border-radius: 4px; cursor: pointer;">
              Timeline →
            </button>
          </div>
        </div>
      `);

      group.addLayer(marker);
    });
  }, [hotspots, selectedClass, selectedRisk, selectedHotspot]);

  // Select Demo Scenario
  const handleSelectScenario = async (scenario: DemoScenarioOption) => {
    setActiveScenario(scenario);
    setDemoDropdownOpen(false);

    try {
      const targetMap: Record<string, string> = {
        jamnagar: "scenario-1-jamnagar",
        hazira: "scenario-1b-hazira",
        punjab: "scenario-2-punjab",
        simlipal: "scenario-3-simlipal",
        korba: "scenario-4-korba"
      };

      const scenarioApiId = targetMap[scenario.id];
      if (scenarioApiId) {
        await apiService.loadScenario(scenarioApiId);
        const updatedHotspots = await apiService.getHotspots();
        setHotspots(updatedHotspots);

        const target = updatedHotspots.find((h) => h.event.id.includes(scenario.prefix)) || updatedHotspots[0];
        if (target) {
          handleSelectHotspotInternal(target);
        }
      }
    } catch (err) {
      console.warn("Scenario API trigger fallback:", err);
      const target = hotspots.find((h) => h.event.id.includes(scenario.prefix));
      if (target) {
        handleSelectHotspotInternal(target);
      }
    }

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(scenario.coords, scenario.zoom, { duration: 1.0 });
    }
  };

  // Reset to Live Surveillance Mode
  const handleResetToLive = async () => {
    setActiveScenario(null);
    setDemoDropdownOpen(false);
    setSelectedClass("All");
    setSelectedRisk("All");

    try {
      const hotspotsData = await apiService.getHotspots();
      setHotspots(hotspotsData);
      if (hotspotsData.length > 0) {
        const liveHotspot = hotspotsData.find((h) => h.event.source === "NASA_FIRMS_LIVE") || hotspotsData[0];
        handleSelectHotspotInternal(liveHotspot);
      }
    } catch (err) {
      console.error("Failed to reset to live surveillance:", err);
    }

    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([22.5, 78.5], 5, { duration: 1.0 });
    }
  };

  // Quick KPI Click Filter Handlers
  const handleKpiClick = (filterType: "total" | "critical" | "persistent" | "industrial" | "wildfires") => {
    if (filterType === "total") {
      setSelectedClass("All");
      setSelectedRisk("All");
    } else if (filterType === "critical") {
      setSelectedRisk((prev) => (prev === "CRITICAL" ? "All" : "CRITICAL"));
    } else if (filterType === "persistent") {
      // Toggle to a persistent target if found
      const persistentItem = hotspots.find((h) => h.temporal_profile.is_persistent);
      if (persistentItem) {
        handleSelectHotspotInternal(persistentItem);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo([persistentItem.event.latitude, persistentItem.event.longitude], 11, { duration: 0.8 });
        }
      }
    } else if (filterType === "industrial") {
      setSelectedClass((prev) => (prev === "Industrial Fire" ? "All" : "Industrial Fire"));
    } else if (filterType === "wildfires") {
      setSelectedClass((prev) => (prev === "Wildfire" ? "All" : "Wildfire"));
    }
  };

  const isCritical = selectedHotspot?.classification.risk_score === "CRITICAL";
  const isHigh = selectedHotspot?.classification.risk_score === "HIGH";
  const isMedium = selectedHotspot?.classification.risk_score === "MEDIUM";
  const isSelectedLive = selectedHotspot?.event.source === "NASA_FIRMS_LIVE";
  const liveHotspotsCount = hotspots.filter((h) => h.event.source === "NASA_FIRMS_LIVE").length;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#070b14]">
      {/* 1. CLEAN HORIZONTAL KPI STRIP (INTERACTIVE FILTERS) */}
      <div className="h-12 px-4 border-b border-[#141d2e] bg-[#090e1a] flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-6 overflow-x-auto py-1">
          {/* KPI 1: Total Hotspots */}
          <button
            onClick={() => handleKpiClick("total")}
            title="Click to reset filters and view all hotspots"
            className="flex items-center gap-2 hover:bg-[#111c30] px-2 py-1 rounded transition-colors cursor-pointer text-left"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-semibold text-white font-mono">
                {stats?.total_hotspots || hotspots.length}
              </span>
              <span className="text-[11px] text-slate-400">Total Hotspots</span>
            </div>
          </button>

          <div className="h-4 w-px bg-[#141e30]" />

          {/* KPI 2: High / Critical Risk */}
          <button
            onClick={() => handleKpiClick("critical")}
            title="Click to filter Critical/High risk incidents"
            className={`flex items-center gap-2 hover:bg-[#111c30] px-2 py-1 rounded transition-colors cursor-pointer text-left ${
              selectedRisk === "CRITICAL" ? "bg-rose-950/40 border border-rose-500/40" : ""
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-semibold text-rose-400 font-mono">
                {stats?.high_risk_count ?? 0}
              </span>
              <span className="text-[11px] text-slate-400">High/Critical Risk</span>
            </div>
          </button>

          <div className="h-4 w-px bg-[#141e30]" />

          {/* KPI 3: Persistent Sources */}
          <button
            onClick={() => handleKpiClick("persistent")}
            title="Click to focus on persistent operational source"
            className="flex items-center gap-2 hover:bg-[#111c30] px-2 py-1 rounded transition-colors cursor-pointer text-left"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-semibold text-teal-400 font-mono">
                {stats?.persistent_sources ?? 0}
              </span>
              <span className="text-[11px] text-slate-400">Persistent Sources</span>
            </div>
          </button>

          <div className="h-4 w-px bg-[#141e30]" />

          {/* KPI 4: Industrial & Gas Flares */}
          <button
            onClick={() => handleKpiClick("industrial")}
            title="Click to filter Industrial Fire sources"
            className={`flex items-center gap-2 hover:bg-[#111c30] px-2 py-1 rounded transition-colors cursor-pointer text-left ${
              selectedClass === "Industrial Fire" ? "bg-amber-950/40 border border-amber-500/40" : ""
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-semibold text-amber-400 font-mono">
                {stats?.industrial_sources ?? 0}
              </span>
              <span className="text-[11px] text-slate-400">Industrial & Flares</span>
            </div>
          </button>

          <div className="h-4 w-px bg-[#141e30]" />

          {/* KPI 5: Wildfires & Stubble */}
          <button
            onClick={() => handleKpiClick("wildfires")}
            title="Click to filter Wildfire sources"
            className={`flex items-center gap-2 hover:bg-[#111c30] px-2 py-1 rounded transition-colors cursor-pointer text-left ${
              selectedClass === "Wildfire" ? "bg-orange-950/40 border border-orange-500/40" : ""
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-semibold text-orange-400 font-mono">
                {(stats?.wildfires || 0) + (stats?.agricultural_burns || 0)}
              </span>
              <span className="text-[11px] text-slate-400">Wildfires & Stubble</span>
            </div>
          </button>
        </div>

        {/* Live Satellite Feed Telemetry Tag */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0b1526] border border-cyan-500/20 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 font-medium">NASA FIRMS LIVE</span>
            <span className="text-slate-400 font-mono text-[10px]">
              ({liveHotspotsCount > 0 ? `${liveHotspotsCount} VIIRS NRT` : "VIIRS 375m"})
            </span>
          </div>

          <button
            onClick={loadDashboardData}
            title="Refresh satellite feed"
            className="p-1.5 rounded bg-[#0b1220] hover:bg-[#121c32] border border-[#18263f] text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-cyan-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* 2. SATELLITE COMMAND TOOLBAR (FILTERS & COMPACT SCENARIOS DROPDOWN) */}
      <div className="h-9 px-4 border-b border-[#141d2e] bg-[#070b14] flex items-center justify-between gap-4 text-xs flex-shrink-0 z-20">
        {/* Filters */}
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 text-slate-400 text-[11px]">
            <Filter className="w-3 h-3 text-slate-400" />
            <span>Filters:</span>
          </div>

          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-2 py-0.5 rounded bg-[#0b1220] border border-[#18263f] text-[11px] text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="All">All Classes ({hotspots.length})</option>
            <option value="Industrial Fire">Industrial Fire</option>
            <option value="Gas Flare">Gas Flare</option>
            <option value="Agricultural Burning">Agricultural Burning</option>
            <option value="Wildfire">Wildfire</option>
            <option value="Mining">Mining</option>
            <option value="Other">Other</option>
          </select>

          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            className="px-2 py-0.5 rounded bg-[#0b1220] border border-[#18263f] text-[11px] text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="All">All Risk Levels</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Reset Filters Action Button */}
          {(selectedClass !== "All" || selectedRisk !== "All") && (
            <button
              onClick={() => {
                setSelectedClass("All");
                setSelectedRisk("All");
              }}
              className="px-2 py-0.5 rounded bg-[#131d35] hover:bg-[#1a2947] text-cyan-300 border border-cyan-500/30 text-[10.5px] flex items-center gap-1 transition cursor-pointer"
              title="Reset all filters"
            >
              <X className="w-2.5 h-2.5" />
              <span>Reset Filters</span>
            </button>
          )}

          {/* Active Mode Tag */}
          {activeScenario ? (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-950/40 border border-amber-500/40 text-[11px] text-amber-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>Demo: {activeScenario.name.split(":")[1] || activeScenario.name}</span>
              <button
                onClick={handleResetToLive}
                title="Return to Live Feed"
                className="ml-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/30 border border-emerald-500/20 text-[10.5px] text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>Live Surveillance Mode</span>
            </div>
          )}
        </div>

        {/* Compact Demo Scenarios Dropdown & Live Reset */}
        <div className="relative flex items-center gap-2" ref={dropdownRef}>
          {activeScenario && (
            <button
              onClick={handleResetToLive}
              className="px-2.5 py-1 rounded bg-[#0f172a] hover:bg-[#15233c] text-cyan-300 border border-cyan-500/30 text-[11px] font-medium flex items-center gap-1.5 transition cursor-pointer"
            >
              <Satellite className="w-3 h-3 text-cyan-400" />
              <span>Live NASA View</span>
            </button>
          )}

          {/* Compact Dropdown Trigger */}
          <button
            onClick={() => setDemoDropdownOpen(!demoDropdownOpen)}
            className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1.5 border transition cursor-pointer ${
              activeScenario
                ? "bg-amber-500/15 text-amber-200 border-amber-500/50"
                : "bg-[#0b1220] hover:bg-[#121c32] text-slate-300 border-[#18263f]"
            }`}
          >
            <Compass className="w-3.5 h-3.5 text-amber-400" />
            <span>Demo Scenarios (SIH)</span>
            <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${demoDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {/* Floating Dropdown Popover */}
          {demoDropdownOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-96 rounded-lg bg-[#0a0f1c] border border-[#1c2a44] shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              {/* Dropdown Header */}
              <div className="p-3 bg-[#060a14] border-b border-[#141e30] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white">SIH 2026 Validation Scenarios</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      DEMO DATA
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Curated test cases for Hackathon judging (PS ID: SIH26162)
                  </p>
                </div>
                <button
                  onClick={() => setDemoDropdownOpen(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scenario Items */}
              <div className="max-h-72 overflow-y-auto p-1.5 space-y-1">
                {DEMO_SCENARIOS.map((sc) => {
                  const isSelected = activeScenario?.id === sc.id;
                  return (
                    <button
                      key={sc.id}
                      onClick={() => handleSelectScenario(sc)}
                      className={`w-full text-left p-2 rounded transition-colors flex items-start justify-between gap-2 cursor-pointer ${
                        isSelected
                          ? "bg-[#111e38] border border-cyan-500/40 text-white"
                          : "hover:bg-[#0f172a] border border-transparent text-slate-300"
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-slate-100 truncate">{sc.name}</span>
                        </div>
                        <div className="text-[10.5px] text-slate-400">
                          {sc.location} • <span className="text-slate-300">{sc.category}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-1 italic">
                          {sc.insight}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold border ${
                            sc.risk === "CRITICAL"
                              ? "bg-rose-950/50 text-rose-300 border-rose-500/40"
                              : sc.risk === "HIGH"
                              ? "bg-orange-950/50 text-orange-300 border-orange-500/40"
                              : "bg-amber-950/50 text-amber-300 border-amber-500/40"
                          }`}
                        >
                          {sc.risk}
                        </span>
                        {isSelected && (
                          <span className="text-[9px] text-cyan-400 font-medium flex items-center gap-0.5">
                            Active ✓
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Dropdown Footer: Live Feed Reset */}
              <div className="p-2 bg-[#060a14] border-t border-[#141e30] flex items-center justify-between">
                <button
                  onClick={handleResetToLive}
                  className="w-full py-1.5 px-2.5 rounded bg-[#0e1728] hover:bg-[#15233c] text-cyan-300 text-[11px] font-medium flex items-center justify-center gap-1.5 border border-cyan-500/20 transition cursor-pointer"
                >
                  <Satellite className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Return to Live NASA FIRMS View</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. MAIN WORKSPACE: PRIMARY GIS MAP (DOMINANT) + RIGHT INTELLIGENCE PANEL */}
      <div className="flex-1 flex overflow-hidden">
        {/* PRIMARY INTERACTIVE MAP */}
        <div className="flex-1 relative bg-[#070b14]">
          <div ref={mapContainerRef} className="absolute inset-0 z-0" />

          {/* Active Demo Scenario Floating Banner */}
          {activeScenario && (
            <div className="absolute top-3 left-3 z-10 flex items-center gap-2.5 px-3 py-1.5 rounded-md bg-[#090e1a]/95 border border-amber-500/40 shadow-xl backdrop-blur-sm text-xs">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <div className="flex items-center gap-1.5">
                <span className="text-amber-300 font-medium">Demo Scenario:</span>
                <span className="text-white font-semibold">{activeScenario.name}</span>
              </div>
              <div className="h-3 w-px bg-slate-700" />
              <button
                onClick={handleResetToLive}
                className="text-cyan-400 hover:text-cyan-300 hover:underline text-[11px] font-medium cursor-pointer"
              >
                Switch to Live NASA Feed
              </button>
            </div>
          )}

          {/* Clean Risk Legend (Bottom-Left) */}
          <div className="absolute bottom-3 left-3 z-10 px-2.5 py-2 rounded bg-[#090e1a]/95 border border-[#141e30] text-[10px] space-y-1.5 backdrop-blur-sm shadow-lg">
            <div className="text-slate-400 font-medium text-[9px] uppercase tracking-wider mb-1">
              Risk Level & Shape
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rotate-45 bg-rose-500 border border-white/80 flex-shrink-0" />
              <span className="text-slate-300">Critical (&gt;75) • Diamond</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-[2px] bg-orange-500 border border-white/80 flex-shrink-0" />
              <span className="text-slate-300">High (50-75) • Square</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-0 h-0 border-l-[3.5px] border-r-[3.5px] border-b-[6px] border-l-transparent border-r-transparent border-b-amber-500 flex-shrink-0" />
              <span className="text-slate-300">Medium (25-50) • Triangle</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400 border border-white/80 flex-shrink-0" />
              <span className="text-slate-300">Low (&lt;25) • Circle</span>
            </div>
          </div>

          {/* Map Attribution Tag (Bottom-Right, subtle) */}
          <div className="absolute bottom-1 right-12 z-10 text-[9px] text-slate-500 font-mono pointer-events-none">
            OpenStreetMap • NASA FIRMS
          </div>
        </div>

        {/* RIGHT-SIDE SOURCE INTELLIGENCE DOSSIER (Flat, Non-Card Layout) */}
        <div className="w-88 flex-shrink-0 border-l border-[#141d2e] bg-[#090e1a] flex flex-col overflow-y-auto z-10 text-xs">
          {selectedHotspot ? (
            <div className="p-4 space-y-3.5">
              {/* Dossier Header: Source Classification & Confidence */}
              <div className="pb-3 border-b border-[#141d2e]">
                {/* Data Provenance Badge */}
                <div className="mb-2">
                  {isSelectedLive ? (
                    <span className="inline-flex items-center gap-1.5 text-[9.5px] font-mono px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-300 border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      LIVE NASA FIRMS VIIRS NRT
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[9.5px] font-mono px-2 py-0.5 rounded bg-amber-950/50 text-amber-300 border border-amber-500/30">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      SIH CURATED DEMO SCENARIO
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-mono text-cyan-400 font-medium">
                    {selectedHotspot.event.id}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                      isCritical
                        ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                        : isHigh
                        ? "bg-orange-500/10 text-orange-400 border-orange-500/30"
                        : isMedium
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                        : "bg-teal-500/10 text-teal-400 border-teal-500/30"
                    }`}
                  >
                    {selectedHotspot.classification.risk_score} RISK ({Math.round(selectedHotspot.classification.risk_value)}/100)
                  </span>
                </div>

                <h2 className="text-base font-semibold text-white tracking-tight">
                  {selectedHotspot.classification.predicted_class}
                </h2>
                <div className="flex items-center gap-2 text-[11px] mt-0.5 text-slate-400">
                  <span>{(selectedHotspot.classification.confidence * 100).toFixed(1)}% confidence</span>
                  <span>•</span>
                  <span>Random Forest</span>
                </div>
              </div>

              {/* Section 1: Thermal Observations */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-200 font-medium text-xs">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>Thermal Observations</span>
                </div>

                <div className="space-y-1 text-slate-300 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">FRP:</span>
                    <span className="font-mono text-orange-400 font-medium">{selectedHotspot.event.frp.toFixed(1)} MW</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Brightness:</span>
                    <span className="font-mono text-amber-400 font-medium">{selectedHotspot.event.brightness.toFixed(1)} K</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Coordinates:</span>
                    <span className="font-mono text-slate-300">
                      {selectedHotspot.event.latitude.toFixed(4)}° N, {selectedHotspot.event.longitude.toFixed(4)}° E
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sensor:</span>
                    <span className="text-slate-300">{selectedHotspot.event.satellite}</span>
                  </div>
                </div>
              </div>

              {/* Section 2: Spatial Context */}
              <div className="pt-2.5 border-t border-[#141d2e] space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-200 font-medium text-xs">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Spatial Context</span>
                </div>

                <div className="space-y-1 text-slate-300 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Industrial Facility:</span>
                    <span className="font-mono text-teal-400 font-medium">
                      {selectedHotspot.geo_context.distance_to_industry < 1000
                        ? `${Math.round(selectedHotspot.geo_context.distance_to_industry)} m`
                        : `${(selectedHotspot.geo_context.distance_to_industry / 1000).toFixed(2)} km`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Nearest Unit:</span>
                    <span className="text-slate-200 truncate max-w-[160px] text-right" title={selectedHotspot.geo_context.nearest_industrial_facility}>
                      {selectedHotspot.geo_context.nearest_industrial_facility}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Land Cover:</span>
                    <span className="text-slate-300 capitalize">
                      {selectedHotspot.geo_context.land_cover.replace("_", " ")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 3: Temporal Behaviour */}
              <div className="pt-2.5 border-t border-[#141d2e] space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-200 font-medium text-xs">
                  <Clock className="w-3.5 h-3.5 text-teal-400" />
                  <span>Temporal Behaviour</span>
                </div>

                <div className="space-y-1 text-slate-300 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Signature:</span>
                    <span className={selectedHotspot.temporal_profile.is_persistent ? "text-teal-400 font-medium" : "text-slate-400"}>
                      {selectedHotspot.temporal_profile.is_persistent ? "Persistent Source" : "Transient Anomaly"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Active Duration:</span>
                    <span className="font-mono text-slate-200">{selectedHotspot.temporal_profile.persistence_days} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Observations:</span>
                    <span className="font-mono text-slate-200">{selectedHotspot.temporal_profile.observation_count} passes</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Recurrence:</span>
                    <span className="font-mono text-slate-200">{(selectedHotspot.temporal_profile.recurrence_ratio * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {/* Section 4: Supporting Evidence */}
              <div className="pt-2.5 border-t border-[#141d2e] space-y-1.5">
                <div className="flex items-center gap-1.5 text-slate-200 font-medium text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" />
                  <span>Supporting Evidence</span>
                </div>

                <div className="space-y-1 pt-0.5">
                  {selectedHotspot.classification.evidence.map((ev, i) => (
                    <div
                      key={i}
                      className="text-slate-300 text-[10.5px] flex items-start gap-1.5 leading-relaxed"
                    >
                      <span className="w-1 h-1 rounded-full bg-cyan-400 mt-1.5 flex-shrink-0" />
                      <span>{ev}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Operational Action Buttons */}
              <div className="pt-2.5 border-t border-[#141d2e] flex flex-col gap-1.5">
                <button
                  onClick={() => onInspectDetails && onInspectDetails(selectedHotspot)}
                  className="w-full py-1.5 px-3 rounded bg-[#0f182a] hover:bg-[#15233c] text-cyan-300 text-xs font-medium flex items-center justify-center gap-1.5 border border-cyan-500/20 transition-colors cursor-pointer"
                >
                  <span>Detailed Telemetry Dossier</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onOpenTimeline && onOpenTimeline(selectedHotspot)}
                  className="w-full py-1.5 px-3 rounded bg-[#0b1220] hover:bg-[#101a2e] text-slate-300 text-xs font-medium flex items-center justify-center gap-1.5 border border-[#141e30] transition-colors cursor-pointer"
                >
                  <Clock className="w-3 h-3 text-teal-400" />
                  <span>Revisit Timeline</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 text-xs">
              Select any hotspot on the surveillance map to inspect telemetry and classification.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

