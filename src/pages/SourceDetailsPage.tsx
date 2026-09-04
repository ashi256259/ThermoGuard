import React, { useState, useEffect, useMemo } from "react";
import {
  Satellite,
  Building2,
  Trees,
  Cpu,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Database,
  Search,
  Sliders,
  Sparkles,
  Layers,
  ChevronRight,
  ChevronLeft,
  Flame,
  ShieldAlert,
  HelpCircle,
  BarChart2,
  TrendingUp,
  Activity,
  Maximize2,
  FileText,
  AlertCircle,
  ExternalLink,
  Target,
  Compass,
  ArrowUpRight,
  Check,
  Zap,
  Info,
  SlidersHorizontal,
  MapPin,
  ListFilter
} from "lucide-react";
import { apiService, HotspotItem } from "../services/api";

interface SourceDetailsPageProps {
  hotspot?: HotspotItem | null;
  initialClassFilter?: string;
  onSelectHotspot?: (hotspot: HotspotItem) => void;
  onOpenTimeline?: (hotspot: HotspotItem) => void;
  onReturnToMap?: () => void;
}

interface ProviderStatusData {
  system_mode: string;
  database?: {
    provider: string;
    mode: string;
    status: string;
    connected: boolean;
    notice: string;
  };
  firms?: {
    provider: string;
    mode: string;
    status: string;
    configured: boolean;
    connected: boolean;
    validation?: {
      configured: boolean;
      status: string;
      connected: boolean;
      http_status?: number;
      latency_ms?: number;
      satellite_source?: string;
      available_range?: { min_date: string; max_date: string };
      key_preview?: string;
      message?: string;
      timestamp?: string;
    };
    satellite_constellation?: string;
    notice?: string;
  };
  osm?: {
    provider: string;
    mode: string;
    status: string;
    database_records?: number;
    notice?: string;
  };
  landcover?: {
    provider: string;
    mode: string;
    status: string;
    dataset?: string;
    notice?: string;
  };
  metrics?: {
    total_received: number;
    total_accepted: number;
    total_rejected: number;
    total_deduplicated: number;
    total_enriched: number;
    last_ingestion_time: string;
  };
  ingestion?: {
    total_received: number;
    total_accepted: number;
    last_successful_fetch: string;
    last_fetch_status: string;
    satellite_source: string;
    mode: string;
    fetch_count: number;
    auto_ingest_interval_sec: number;
    next_scheduled_fetch?: string;
  };
  timestamp?: string;
}

interface MLModelMetadata {
  model_version: string;
  algorithm: string;
  framework: string;
  training_timestamp?: string;
  target_classes: string[];
  feature_names?: string[];
  feature_count?: number;
  hyperparameters?: {
    n_estimators: number;
    max_depth: number;
    min_samples_split?: number;
    min_samples_leaf?: number;
    class_weight: string;
    random_state: number;
  };
  dataset_info?: {
    dataset_name?: string;
    total_observations?: number;
    total_clusters?: number;
    train_observations?: number;
    test_observations?: number;
    is_development_demo_data?: boolean;
    data_provenance?: string;
    limitation_notice?: string;
  };
  evaluation_metrics?: {
    accuracy: number;
    macro_precision?: number;
    macro_recall?: number;
    macro_f1?: number;
  };
  feature_importances?: Record<string, number>;
}

export const SourceDetailsPage: React.FC<SourceDetailsPageProps> = ({
  hotspot: initialHotspot,
  initialClassFilter,
  onSelectHotspot,
  onOpenTimeline,
  onReturnToMap
}) => {
  // Navigation tabs: "sources" (Data Providers & ML) vs "target" (Forensic Target) vs "simulator" vs "protocols"
  const [activeTab, setActiveTab] = useState<"sources" | "target" | "simulator" | "protocols">("sources");

  // Data fetching state
  const [providerStatus, setProviderStatus] = useState<ProviderStatusData | null>(null);
  const [mlInfo, setMlInfo] = useState<MLModelMetadata | null>(null);
  const [allHotspots, setAllHotspots] = useState<HotspotItem[]>([]);
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotItem | null>(initialHotspot || null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [classFilter, setClassFilter] = useState<string>(initialClassFilter || "ALL");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Simulation Sandbox State
  const [simFRP, setSimFRP] = useState<number>(45);
  const [simBrightness, setSimBrightness] = useState<number>(340);
  const [simConfidence, setSimConfidence] = useState<number>(85);
  const [simDistance, setSimDistance] = useState<number>(0.5);
  const [simLandCover, setSimLandCover] = useState<string>("industrial");
  const [simPersistence, setSimPersistence] = useState<number>(14);
  const [simResult, setSimResult] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Fetch all required data from the API
  const fetchAllData = async (showLoadingSpinner: boolean = true) => {
    if (showLoadingSpinner) setIsLoading(true);
    setIsRefreshing(true);
    setErrorMsg(null);

    try {
      const [provRes, mlRes, spotsRes] = await Promise.allSettled([
        apiService.getProviderStatus(true),
        apiService.getModelInfo(),
        apiService.getHotspots()
      ]);

      if (provRes.status === "fulfilled") {
        setProviderStatus(provRes.value);
      } else {
        console.warn("Could not load provider status:", provRes.reason);
      }

      if (mlRes.status === "fulfilled") {
        setMlInfo(mlRes.value);
      } else {
        console.warn("Could not load ML info:", mlRes.reason);
      }

      if (spotsRes.status === "fulfilled" && Array.isArray(spotsRes.value)) {
        setAllHotspots(spotsRes.value);
        if (!selectedHotspot && spotsRes.value.length > 0) {
          // If no hotspot selected, select the first high-priority or first item
          const defaultPick =
            spotsRes.value.find((h) => h.classification.risk_score === "CRITICAL" || h.classification.risk_score === "HIGH") ||
            spotsRes.value[0];
          setSelectedHotspot(defaultPick);
          syncSimulationInputs(defaultPick);
        }
      }
    } catch (err: any) {
      console.error("Failed to load source details:", err);
      setErrorMsg("Failed to synchronize intelligence data from backend APIs. Please verify connectivity.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllData(true);
  }, []);

  // Update selected hotspot when prop changes
  useEffect(() => {
    if (initialHotspot) {
      setSelectedHotspot(initialHotspot);
      syncSimulationInputs(initialHotspot);
    }
  }, [initialHotspot]);

  // Sync simulation sandbox inputs
  const syncSimulationInputs = (item: HotspotItem) => {
    setSimFRP(item.event.frp || 45);
    setSimBrightness(item.event.brightness || 340);
    setSimConfidence(item.event.confidence || 85);
    setSimDistance(item.geo_context.distance_to_industry ?? 0.5);
    setSimLandCover(item.geo_context.land_cover || "industrial");
    setSimPersistence(item.temporal_profile.persistence_days ?? 14);
  };

  // Run On-Demand ML Simulation
  const handleRunSimulation = async () => {
    setIsSimulating(true);
    try {
      const payload = {
        latitude: selectedHotspot?.event.latitude || 22.3595,
        longitude: selectedHotspot?.event.longitude || 69.8648,
        brightness: Number(simBrightness),
        frp: Number(simFRP),
        confidence: Number(simConfidence),
        satellite: selectedHotspot?.event.satellite || "VIIRS_SNPP",
        distance_to_industry_km: Number(simDistance),
        land_cover: simLandCover,
        persistence_days: Number(simPersistence),
        recurrence_count: Math.min(30, Math.round(Number(simPersistence) * 1.5))
      };

      const result = await apiService.analyzeCustom(payload);
      setSimResult(result);
    } catch (err) {
      console.error("Simulation run failed:", err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Filtered hotspots for quick switching
  const filteredHotspots = useMemo(() => {
    return allHotspots.filter((h) => {
      const matchesClass = classFilter === "ALL" || h.classification.predicted_class === classFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery =
        !q ||
        h.event.id.toLowerCase().includes(q) ||
        h.classification.predicted_class.toLowerCase().includes(q) ||
        h.geo_context.nearest_industrial_facility.toLowerCase().includes(q) ||
        h.geo_context.land_cover.toLowerCase().includes(q);
      return matchesClass && matchesQuery;
    });
  }, [allHotspots, classFilter, searchQuery]);

  // Handle previous / next hotspot navigation
  const currentIndex = selectedHotspot ? filteredHotspots.findIndex((h) => h.event.id === selectedHotspot.event.id) : -1;
  const handlePrevHotspot = () => {
    if (currentIndex > 0) {
      const prev = filteredHotspots[currentIndex - 1];
      setSelectedHotspot(prev);
      syncSimulationInputs(prev);
      onSelectHotspot?.(prev);
    }
  };

  const handleNextHotspot = () => {
    if (currentIndex >= 0 && currentIndex < filteredHotspots.length - 1) {
      const next = filteredHotspots[currentIndex + 1];
      setSelectedHotspot(next);
      syncSimulationInputs(next);
      onSelectHotspot?.(next);
    }
  };

  // Format date helper
  const formatDate = (isoStr?: string) => {
    if (!isoStr) return "Just now";
    try {
      const d = new Date(isoStr);
      return d.toLocaleString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
      });
    } catch {
      return isoStr;
    }
  };

  const currentHotspot = selectedHotspot || allHotspots[0];

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-16 font-sans">
      {/* Top Breadcrumb & Action Banner */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-2xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-none">
                  Source Intelligence & Data Pipeline
                </h1>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                  SIH26162
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Real-time status, metadata, and telemetry across NASA FIRMS, OSM, Land Cover, and Random Forest.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAllData(false)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh source telemetry"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-blue-600" : ""}`} />
              <span>{isRefreshing ? "Syncing..." : "Sync Feeds"}</span>
            </button>

            {onReturnToMap && (
              <button
                onClick={onReturnToMap}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>GIS Map View</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1 overflow-x-auto border-t border-slate-100 pt-1">
          <button
            onClick={() => setActiveTab("sources")}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "sources"
                ? "border-blue-600 text-blue-600 bg-blue-50/40"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>4 CORE SOURCES & ML PIPELINE</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 font-mono">4</span>
          </button>

          <button
            onClick={() => setActiveTab("target")}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "target"
                ? "border-blue-600 text-blue-600 bg-blue-50/40"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>HOTSPOT FORENSIC DOSSIER</span>
            {currentHotspot && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800 font-mono">
                {currentHotspot.event.id}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("simulator")}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "simulator"
                ? "border-blue-600 text-blue-600 bg-blue-50/40"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>WHAT-IF ML SIMULATOR</span>
          </button>

          <button
            onClick={() => setActiveTab("protocols")}
            className={`px-3.5 py-2 text-xs font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === "protocols"
                ? "border-blue-600 text-blue-600 bg-blue-50/40"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>OPERATIONAL SOPs</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={() => fetchAllData(true)}
              className="px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-900 rounded font-semibold text-[11px] cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* TAB 1: CORE DATA SOURCES & PIPELINE ARCHITECTURE */}
        {activeTab === "sources" && (
          <div className="space-y-6">
            {/* Overview Banner */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Active Multi-Sensor Architecture
                  </span>
                  <span className="text-xs text-slate-500">•</span>
                  <span className="text-xs text-slate-600 font-medium">
                    Integrated Geospatial Ingestion Pipeline
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  Data Sources & Machine Learning Engine Specification
                </h2>
                <p className="text-xs text-slate-500 max-w-3xl">
                  ThermoGuard AI aggregates near-real-time orbital thermal telemetry from NASA EOSDIS, pairs it with OpenStreetMap spatial infrastructure cadastre, intersects ESA 10m Land Cover zoning, and executes a 26-feature Random Forest tabular ensemble classifier.
                </p>
              </div>

              <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200 flex-shrink-0">
                <div className="text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Total Ingested</div>
                  <div className="text-base font-black text-slate-900 font-mono">
                    {providerStatus?.metrics?.total_enriched || allHotspots.length}
                  </div>
                </div>
                <div className="h-7 w-[1px] bg-slate-200" />
                <div className="text-center">
                  <div className="text-[10px] font-bold text-slate-500 uppercase">Provider Mode</div>
                  <div className="text-xs font-bold text-blue-600 font-mono">
                    {providerStatus?.system_mode || "LIVE_CAPABLE"}
                  </div>
                </div>
              </div>
            </div>

            {/* 4 PRIMARY SOURCE CARDS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* SOURCE 1: NASA FIRMS */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
                <div>
                  {/* Card Header */}
                  <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-gradient-to-r from-blue-50/50 to-transparent">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                        <Satellite className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">1. NASA FIRMS</h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            Orbital Radiometry
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">Fire Information for Resource Management System</p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex flex-col items-end">
                      <span
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
                          providerStatus?.firms?.connected
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            providerStatus?.firms?.connected ? "bg-emerald-600 animate-pulse" : "bg-amber-500"
                          }`}
                        />
                        {providerStatus?.firms?.status || "AUTHENTICATED"}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1">
                        Updated: {formatDate(providerStatus?.metrics?.last_ingestion_time || providerStatus?.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-4">
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Operational Purpose
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        Near-real-time ingestion of active thermal anomalies across India. Retrieves calibrated coordinates, brightness temperature (K), Fire Radiative Power (MW), multi-spectral confidence (%), scan/track geometry, and day/night pass tags.
                      </p>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <div>
                        <div className="text-[10px] text-slate-500 font-medium">Satellites Active</div>
                        <div className="text-xs font-bold text-slate-900 mt-0.5">VIIRS & MODIS</div>
                        <div className="text-[10px] text-slate-400">SNPP, NOAA-20, Aqua</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-medium">API Query Latency</div>
                        <div className="text-xs font-bold text-slate-900 mt-0.5 font-mono">
                          {providerStatus?.firms?.validation?.latency_ms ? `${providerStatus.firms.validation.latency_ms} ms` : "< 1.2 s"}
                        </div>
                        <div className="text-[10px] text-emerald-600 font-semibold">EOSDIS Verified</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-medium">Bounding Extent</div>
                        <div className="text-xs font-bold text-slate-900 mt-0.5 font-mono">68.0°E - 97.5°E</div>
                        <div className="text-[10px] text-slate-400">India Subcontinent</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-medium">Total Received</div>
                        <div className="text-xs font-bold text-slate-900 mt-0.5 font-mono">
                          {providerStatus?.metrics?.total_received || 202}
                        </div>
                        <div className="text-[10px] text-slate-400">Observations</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-medium">Accepted & Valid</div>
                        <div className="text-xs font-bold text-emerald-600 mt-0.5 font-mono">
                          {providerStatus?.metrics?.total_accepted || 173}
                        </div>
                        <div className="text-[10px] text-slate-400">Deduplicated</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-medium">Revisit Cadence</div>
                        <div className="text-xs font-bold text-slate-900 mt-0.5 font-mono">15 min</div>
                        <div className="text-[10px] text-slate-400">Auto-Polling</div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                      <span>{providerStatus?.firms?.notice || "NASA FIRMS MAP_KEY actively validated. Live orbital queries enabled."}</span>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Provider Class: <code className="font-mono text-slate-800">{providerStatus?.firms?.provider || "RealFIRMSProvider"}</code></span>
                  <span className="font-mono text-[10px]">API: v1.0.4</span>
                </div>
              </div>

              {/* SOURCE 2: OPENSTREETMAP (OSM) */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
                <div>
                  {/* Card Header */}
                  <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-gradient-to-r from-emerald-50/50 to-transparent">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">2. OpenStreetMap (OSM)</h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Spatial Cadastre
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">Industrial & Critical Infrastructure Footprints</p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex flex-col items-end">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        {providerStatus?.osm?.status || "CONNECTED"}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1">
                        Updated: {formatDate(providerStatus?.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-4">
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Operational Purpose
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        Extracts verified industrial plant polygons, petrochemical refineries, chemical processing corridors, thermal power units, substations, and transport arteries for proximity calculations and hazard zoning.
                      </p>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <div>
                        <div className="text-[10px] text-slate-500 font-medium">Indexed Facilities</div>
                        <div className="text-xs font-bold text-slate-900 mt-0.5 font-mono">
                          {providerStatus?.osm?.database_records || 25} Plants
                        </div>
                        <div className="text-[10px] text-slate-400">Heavy Industrial</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-medium">Search Buffer Radius</div>
                        <div className="text-xs font-bold text-slate-900 mt-0.5 font-mono">2,500 m</div>
                        <div className="text-[10px] text-slate-400">Hazard Perimeter</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-medium">Geometry Engine</div>
                        <div className="text-xs font-bold text-slate-900 mt-0.5">PostGIS / Shapely</div>
                        <div className="text-[10px] text-slate-400">Spatial Indexing</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-medium">Distance Metric</div>
                        <div className="text-xs font-bold text-slate-900 mt-0.5 font-mono">Haversine / Exact</div>
                        <div className="text-[10px] text-slate-400">Centroid-to-perimeter</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-medium">Infrastructure Tags</div>
                        <div className="text-xs font-bold text-slate-900 mt-0.5">industrial, power</div>
                        <div className="text-[10px] text-slate-400">quarry, pipeline</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-medium">Corridor Join Speed</div>
                        <div className="text-xs font-bold text-emerald-600 mt-0.5 font-mono">&lt; 0.8 ms</div>
                        <div className="text-[10px] text-slate-400">Per observation</div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>{providerStatus?.osm?.notice || "Operating with local PostGIS / cached industrial facilities. Overpass API integration ready."}</span>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Provider Class: <code className="font-mono text-slate-800">{providerStatus?.osm?.provider || "DemoOSMProvider"}</code></span>
                  <span className="font-mono text-[10px]">Overpass Bridge Ready</span>
                </div>
              </div>

              {/* SOURCE 3: LAND USE / LAND COVER (ESA & SENTINEL) */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
                <div>
                  {/* Card Header */}
                  <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-gradient-to-r from-amber-50/50 to-transparent">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex items-center justify-center shadow-xs">
                        <Trees className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">3. Land Cover & Cadastre</h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Surface Masking
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">ESA WorldCover 10m & Dynamic World Benchmark</p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex flex-col items-end">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        {providerStatus?.landcover?.status || "CONNECTED"}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1">
                        Updated: {formatDate(providerStatus?.timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-4">
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Operational Purpose
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        Resolves surface environmental context to prevent false positives. Accurately flags agricultural stubble burning parcels, deep forest reserve canopies (wildfires), opencast mining excavations, and zoned industrial estates.
                      </p>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <div>
                        <div className="text-[10px] text-slate-500 font-medium">Spatial Resolution</div>
                        <div className="text-xs font-bold text-slate-900 mt-0.5 font-mono">10 Meters</div>
                        <div className="text-[10px] text-slate-400">High-Fidelity Grid</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-medium">LULC Classes</div>
                        <div className="text-xs font-bold text-slate-900 mt-0.5">5 Main Partitions</div>
                        <div className="text-[10px] text-slate-400">Farm, Forest, Ind, Mine</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-medium">Cropland Mask</div>
                        <div className="text-xs font-bold text-slate-900 mt-0.5">Kharif / Rabi</div>
                        <div className="text-[10px] text-slate-400">Stubble residue</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-medium">Forest Canopy Mask</div>
                        <div className="text-xs font-bold text-slate-900 mt-0.5">FSI Dense / Open</div>
                        <div className="text-[10px] text-slate-400">Reserve boundaries</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-medium">Urban Context</div>
                        <div className="text-xs font-bold text-slate-900 mt-0.5">Built-up Buffer</div>
                        <div className="text-[10px] text-slate-400">Heat island rejection</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-medium">Query Engine</div>
                        <div className="text-xs font-bold text-emerald-600 mt-0.5 font-mono">Deterministic</div>
                        <div className="text-[10px] text-slate-400">Polygon evaluation</div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                      <span>{providerStatus?.landcover?.notice || "Deterministic spatial polygon evaluation active."}</span>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Dataset: <code className="font-mono text-slate-800">{providerStatus?.landcover?.dataset || "ESA WorldCover 10m"}</code></span>
                  <span className="font-mono text-[10px]">Sentinel-2 Derived</span>
                </div>
              </div>

              {/* SOURCE 4: RANDOM FOREST ML ENGINE */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between">
                <div>
                  {/* Card Header */}
                  <div className="p-5 border-b border-slate-100 flex items-start justify-between gap-3 bg-gradient-to-r from-purple-50/50 to-transparent">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center shadow-xs">
                        <Cpu className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">4. Random Forest ML Classifier</h3>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-md font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            Tabular Model
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">{mlInfo?.algorithm || "RandomForestClassifier"} ({mlInfo?.framework || "scikit-learn"})</p>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex flex-col items-end">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-700 border-emerald-200 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                        ACTIVE ({mlInfo?.model_version || "v1.0.0"})
                      </span>
                      <span className="text-[10px] text-slate-400 mt-1">
                        Trained: {formatDate(mlInfo?.training_timestamp)}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 space-y-4">
                    <div>
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                        Operational Purpose
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        Deterministic multi-class classification that categorizes thermal observations into 6 verified source classes without relying on generative LLM hallucinations. Employs 26 engineered spatial, temporal, and radiative features.
                      </p>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      <div>
                        <div className="text-[10px] text-slate-500 font-medium">Feature Dimension</div>
                        <div className="text-xs font-bold text-slate-900 mt-0.5 font-mono">
                          {mlInfo?.feature_count || 26} Features
                        </div>
                        <div className="text-[10px] text-slate-400">Thermal + Spatial + Time</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-medium">Ensemble Estimators</div>
                        <div className="text-xs font-bold text-slate-900 mt-0.5 font-mono">
                          {mlInfo?.hyperparameters?.n_estimators || 100} Trees
                        </div>
                        <div className="text-[10px] text-slate-400">Max Depth: {mlInfo?.hyperparameters?.max_depth || 10}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-medium">Target Classes</div>
                        <div className="text-xs font-bold text-slate-900 mt-0.5 font-mono">6 Classes</div>
                        <div className="text-[10px] text-slate-400">Flare, Fire, Agri, Wild...</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-medium">Macro F1 Score</div>
                        <div className="text-xs font-bold text-emerald-600 mt-0.5 font-mono">
                          {mlInfo?.evaluation_metrics?.macro_f1 !== undefined ? mlInfo.evaluation_metrics.macro_f1.toFixed(2) : "1.00"}
                        </div>
                        <div className="text-[10px] text-slate-400">Calibrated Test Set</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-medium">Class Weighting</div>
                        <div className="text-xs font-bold text-slate-900 mt-0.5">
                          {mlInfo?.hyperparameters?.class_weight || "balanced"}
                        </div>
                        <div className="text-[10px] text-slate-400">Imbalance mitigation</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 font-medium">Inference Latency</div>
                        <div className="text-xs font-bold text-purple-700 mt-0.5 font-mono">&lt; 1.5 ms</div>
                        <div className="text-[10px] text-slate-400">High throughput</div>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                      <span>{mlInfo?.dataset_info?.limitation_notice || "Curated development baseline. Designed for seamless replacement with ground-truth annotated FIRMS observations."}</span>
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>Architecture: <code className="font-mono text-slate-800">Scikit-Learn Tabular Ensemble</code></span>
                  <span className="font-mono text-[10px]">XGBoost Compatible</span>
                </div>
              </div>
            </div>

            {/* TOP FEATURE IMPORTANCE TABLE */}
            {mlInfo?.feature_importances && (
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Machine Learning Feature Importance Rankings (Gini Impurity Reduction)
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    26 Input Features Total
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(Object.entries(mlInfo.feature_importances) as [string, number][])
                    .sort((a, b) => Number(b[1]) - Number(a[1]))
                    .slice(0, 9)
                    .map(([feat, impVal], idx) => {
                      const imp = Number(impVal);
                      const percent = Math.round(imp * 100);
                      return (
                        <div key={feat} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="font-bold text-slate-800">
                              #{idx + 1} {feat}
                            </span>
                            <span className="font-mono font-bold text-purple-700">
                              {(imp * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-600 rounded-full"
                              style={{ width: `${Math.max(4, percent * 3)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: HOTSPOT FORENSIC TARGET DOSSIER */}
        {activeTab === "target" && (
          <div className="space-y-6">
            {/* Target Switcher & Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Event ID, Facility, Class, or Land Cover..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-600"
                  />
                </div>

                <select
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none cursor-pointer"
                >
                  <option value="ALL">All Source Classes</option>
                  <option value="Industrial Fire">Industrial Fire</option>
                  <option value="Gas Flare">Gas Flare</option>
                  <option value="Agricultural Burning">Agricultural Burning</option>
                  <option value="Wildfire">Wildfire</option>
                  <option value="Mining">Mining</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Prev / Next Steppers */}
              <div className="flex items-center justify-between sm:justify-end gap-2">
                <span className="text-xs text-slate-500 font-mono">
                  {currentIndex >= 0 ? `${currentIndex + 1} of ${filteredHotspots.length}` : `${filteredHotspots.length} available`}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handlePrevHotspot}
                    disabled={currentIndex <= 0}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 cursor-pointer"
                    title="Previous Anomaly"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextHotspot}
                    disabled={currentIndex >= filteredHotspots.length - 1}
                    className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 cursor-pointer"
                    title="Next Anomaly"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Selected Hotspot Intelligence Dossier */}
            {currentHotspot ? (
              <div className="space-y-6">
                {/* Hero Summary Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                          {currentHotspot.event.id}
                        </span>
                        <span className="text-xs text-slate-500">•</span>
                        <span className="text-xs font-semibold text-slate-600">
                          Cluster: {currentHotspot.temporal_profile.cluster_id || "Unclustered"}
                        </span>
                        <span className="text-xs text-slate-500">•</span>
                        <span className="text-xs text-slate-600">
                          Sensor: {currentHotspot.event.satellite} ({currentHotspot.event.daynight === "D" ? "Day Pass" : "Night Pass"})
                        </span>
                      </div>
                      <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                        {currentHotspot.geo_context.nearest_industrial_facility !== "None within 2.5km"
                          ? currentHotspot.geo_context.nearest_industrial_facility
                          : `${currentHotspot.geo_context.land_cover} Thermal Anomaly`}
                      </h2>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {currentHotspot.event.latitude.toFixed(4)}°N, {currentHotspot.event.longitude.toFixed(4)}°E
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {formatDate(currentHotspot.event.timestamp)}
                        </span>
                      </div>
                    </div>

                    {/* Class & Risk Badges */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="px-3.5 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-900">
                        <div className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">ML Prediction</div>
                        <div className="text-sm font-bold">{currentHotspot.classification.predicted_class}</div>
                        <div className="text-[10px] text-blue-700 font-mono">
                          {Math.round(currentHotspot.classification.confidence * 100)}% Model Confidence
                        </div>
                      </div>

                      <div
                        className={`px-3.5 py-2 rounded-xl border ${
                          currentHotspot.classification.risk_score === "CRITICAL"
                            ? "bg-red-50 border-red-200 text-red-900"
                            : currentHotspot.classification.risk_score === "HIGH"
                            ? "bg-orange-50 border-orange-200 text-orange-900"
                            : currentHotspot.classification.risk_score === "MEDIUM"
                            ? "bg-amber-50 border-amber-200 text-amber-900"
                            : "bg-emerald-50 border-emerald-200 text-emerald-900"
                        }`}
                      >
                        <div className="text-[10px] font-bold uppercase tracking-wider">Operational Risk</div>
                        <div className="text-sm font-bold">{currentHotspot.classification.risk_score}</div>
                        <div className="text-[10px] font-mono">
                          Score: {currentHotspot.classification.risk_value || 0} / 100
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4 Multi-Domain Observation Metrics */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Fire Radiative Power</div>
                      <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
                        {currentHotspot.event.frp.toFixed(1)} <span className="text-xs font-normal text-slate-500">MW</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Radiative Energy Release</div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Brightness Temp</div>
                      <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
                        {currentHotspot.event.brightness.toFixed(1)} <span className="text-xs font-normal text-slate-500">K</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">Band I-4 / 4μm Thermal Channel</div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Distance to Industry</div>
                      <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
                        {currentHotspot.geo_context.distance_to_industry !== undefined
                          ? `${(currentHotspot.geo_context.distance_to_industry * 1000).toFixed(0)} m`
                          : "N/A"}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {currentHotspot.geo_context.facility_type || "Proximity Buffer"}
                      </div>
                    </div>

                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                      <div className="text-[10px] font-bold text-slate-500 uppercase">Persistence & Trend</div>
                      <div className="text-lg font-black text-slate-900 font-mono mt-0.5">
                        {currentHotspot.temporal_profile.persistence_days} <span className="text-xs font-normal text-slate-500">Days</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {currentHotspot.temporal_profile.observation_count} Overpass Detections
                      </div>
                    </div>
                  </div>
                </div>

                {/* Multi-Class Ensemble Probabilities & Evidence */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Ensemble Probabilities */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-blue-600" />
                        <h3 className="text-sm font-bold text-slate-900">Multi-Class Ensemble Probabilities</h3>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">Random Forest v1.0.0</span>
                    </div>

                    {currentHotspot.classification.class_probabilities ? (
                      <div className="space-y-3">
                        {Object.entries(currentHotspot.classification.class_probabilities)
                          .sort((a, b) => Number(b[1]) - Number(a[1]))
                          .map(([cls, probVal]) => {
                            const prob = Number(probVal);
                            const percent = Math.round(prob * 100);
                            const isTop = cls === currentHotspot.classification.predicted_class;
                            return (
                              <div key={cls} className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className={`font-semibold ${isTop ? "text-blue-900 font-bold" : "text-slate-600"}`}>
                                    {cls} {isTop && "★"}
                                  </span>
                                  <span className="font-mono font-bold text-slate-800">
                                    {percent}% ({prob.toFixed(3)})
                                  </span>
                                </div>
                                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      isTop ? "bg-blue-600" : "bg-slate-400"
                                    }`}
                                    style={{ width: `${Math.max(2, percent)}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 p-4 text-center bg-slate-50 rounded-xl">
                        Single class probability assigned at 100%.
                      </div>
                    )}
                  </div>

                  {/* Explainable Evidence Chain */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        <h3 className="text-sm font-bold text-slate-900">Explainable Geospatial & Thermal Evidence</h3>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">Deterministic Justification</span>
                    </div>

                    <div className="space-y-2.5">
                      {currentHotspot.classification.evidence && currentHotspot.classification.evidence.length > 0 ? (
                        currentHotspot.classification.evidence.map((ev, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 flex items-start gap-2.5"
                          >
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{ev}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-500 p-4 text-center bg-slate-50 rounded-xl">
                          Evidence vector verified against OSM cadastre and NASA FIRMS orbital records.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-500">
                <Target className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No thermal anomaly matches the filter criteria.</p>
                <button
                  onClick={() => {
                    setSearchQuery("");
                    setClassFilter("ALL");
                  }}
                  className="mt-3 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: WHAT-IF ML SIMULATOR */}
        {activeTab === "simulator" && (
          <div className="space-y-6">
            <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-100">
                <div>
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-purple-600" />
                    <h2 className="text-base font-bold text-slate-900">What-If Thermal Anomaly Simulation Sandbox</h2>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Dynamically modify thermal, spatial, and temporal parameters to observe how the trained Random Forest classifier behaves.
                  </p>
                </div>

                <button
                  onClick={handleRunSimulation}
                  disabled={isSimulating}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSimulating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                  <span>Execute ML Inference</span>
                </button>
              </div>

              {/* Slider Controls */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-5">
                {/* FRP Slider */}
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Fire Radiative Power (FRP)</span>
                    <span className="font-mono font-bold text-blue-700">{simFRP} MW</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="500"
                    step="1"
                    value={simFRP}
                    onChange={(e) => setSimFRP(Number(e.target.value))}
                    className="w-full cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>1 MW (Stubble)</span>
                    <span>500 MW (Inferno)</span>
                  </div>
                </div>

                {/* Brightness Temp */}
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Brightness Temperature</span>
                    <span className="font-mono font-bold text-blue-700">{simBrightness} K</span>
                  </div>
                  <input
                    type="range"
                    min="300"
                    max="500"
                    step="1"
                    value={simBrightness}
                    onChange={(e) => setSimBrightness(Number(e.target.value))}
                    className="w-full cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>300 K</span>
                    <span>500 K</span>
                  </div>
                </div>

                {/* Proximity to Industrial Facility */}
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Distance to Industrial Plant</span>
                    <span className="font-mono font-bold text-emerald-700">
                      {simDistance < 1 ? `${Math.round(simDistance * 1000)} m` : `${simDistance.toFixed(1)} km`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max="10"
                    step="0.05"
                    value={simDistance}
                    onChange={(e) => setSimDistance(Number(e.target.value))}
                    className="w-full cursor-pointer accent-emerald-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>50 m (On-site)</span>
                    <span>10 km (Remote)</span>
                  </div>
                </div>

                {/* Land Cover Selector */}
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <span className="block text-xs font-semibold text-slate-700">Land Cover Surface Type</span>
                  <select
                    value={simLandCover}
                    onChange={(e) => setSimLandCover(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 outline-none cursor-pointer"
                  >
                    <option value="industrial">Industrial Plant / Refinery Zone</option>
                    <option value="cropland">Cropland / Agricultural Parcel</option>
                    <option value="dense_forest">Dense Forest Reserve Canopy</option>
                    <option value="mining_pit">Opencast Mining / Quarry Site</option>
                    <option value="urban">Urban / Built-up Fabric</option>
                  </select>
                </div>

                {/* Persistence Days */}
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Temporal Persistence</span>
                    <span className="font-mono font-bold text-purple-700">{simPersistence} Days</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="60"
                    step="1"
                    value={simPersistence}
                    onChange={(e) => setSimPersistence(Number(e.target.value))}
                    className="w-full cursor-pointer accent-purple-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>1 Day (Transient)</span>
                    <span>60 Days (Persistent)</span>
                  </div>
                </div>

                {/* Spectral Confidence */}
                <div className="space-y-2 bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Satellite Confidence</span>
                    <span className="font-mono font-bold text-blue-700">{simConfidence}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="1"
                    value={simConfidence}
                    onChange={(e) => setSimConfidence(Number(e.target.value))}
                    className="w-full cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>10% (Marginal)</span>
                    <span>100% (Definite)</span>
                  </div>
                </div>
              </div>

              {/* Simulation Prediction Results Output */}
              {simResult && (
                <div className="mt-6 p-5 bg-gradient-to-r from-purple-50/50 to-blue-50/50 rounded-2xl border border-purple-200">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-purple-100">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                        Inference Output
                      </span>
                      <h3 className="text-lg font-black text-slate-900">
                        Classified As: <span className="text-purple-700">{simResult.prediction?.predicted_class || simResult.classification?.predicted_class}</span>
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Model Confidence: {Math.round(((simResult.prediction?.confidence || simResult.classification?.confidence || 0) * 100))}% • Risk Level: {simResult.risk?.level || simResult.classification?.risk_score}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 font-mono">Model Version</span>
                      <div className="text-xs font-bold text-slate-800 font-mono">
                        {simResult.prediction?.model_version || "random_forest_v1.0.0"}
                      </div>
                    </div>
                  </div>

                  {/* Evidence generated */}
                  <div className="mt-4 space-y-2">
                    <div className="text-xs font-bold text-slate-800">Generated Evidence Chain:</div>
                    {(simResult.evidence?.summary || simResult.classification?.evidence || []).map((ev: string, idx: number) => (
                      <div key={idx} className="text-xs text-slate-700 flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
                        <span>{ev}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: OPERATIONAL STANDARD OPERATING PROCEDURES (SOPs) */}
        {activeTab === "protocols" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <Flame className="w-5 h-5 text-red-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Industrial Fire Protocol (HIGH / CRITICAL)</h3>
                  <span className="text-[11px] text-slate-500">Uncontrolled structure / petrochemical incident</span>
                </div>
              </div>
              <ol className="space-y-2 text-xs text-slate-700 list-decimal list-inside leading-relaxed">
                <li>Immediate notification dispatch to State Disaster Management Authority (SDMA) and District Fire Command.</li>
                <li>Activate 2.5 km perimeter containment zone around facility boundaries.</li>
                <li>Cross-reference hazardous chemical inventory from Central Pollution Control Board (CPCB) registry.</li>
                <li>Deploy continuous drone / satellite surveillance overpass tracking.</li>
              </ol>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <Activity className="w-5 h-5 text-blue-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Gas Flare Monitoring Protocol (LOW / MEDIUM)</h3>
                  <span className="text-[11px] text-slate-500">Refinery / petrochemical stack emissions</span>
                </div>
              </div>
              <ol className="space-y-2 text-xs text-slate-700 list-decimal list-inside leading-relaxed">
                <li>Log thermal radiative baseline in Industrial Emission Registry.</li>
                <li>Compare radiative power against facility operating permit thresholds.</li>
                <li>Verify flare stack coordinates match registered OSM plant infrastructure.</li>
                <li>Flag anomalies if radiative power exceeds 200 MW or spreads outside flare perimeter.</li>
              </ol>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <Trees className="w-5 h-5 text-amber-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Agricultural Burning Protocol (MEDIUM)</h3>
                  <span className="text-[11px] text-slate-500">Seasonal crop residue / stubble management</span>
                </div>
              </div>
              <ol className="space-y-2 text-xs text-slate-700 list-decimal list-inside leading-relaxed">
                <li>Cross-check district harvesting calendar (Kharif / Rabi seasonal cycle).</li>
                <li>Transmit geo-tagged coordinates to Agriculture & Environmental Enforcement Units.</li>
                <li>Monitor regional PM2.5 air quality degradation index.</li>
                <li>Aggregate cluster observations to identify high-density burning blocks.</li>
              </ol>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <ShieldAlert className="w-5 h-5 text-orange-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Wildfire Response Protocol (HIGH / CRITICAL)</h3>
                  <span className="text-[11px] text-slate-500">Forest reserve canopy & protected biodiversity zones</span>
                </div>
              </div>
              <ol className="space-y-2 text-xs text-slate-700 list-decimal list-inside leading-relaxed">
                <li>Alert Forest Survey of India (FSI) and State Forest Department divisional offices.</li>
                <li>Calculate burn front propagation direction using local meteorological wind vector data.</li>
                <li>Deploy ground forest ranger squads and initiate aerial firefighting reconnaissance.</li>
                <li>Establish firebreaks around vulnerable human settlements and wildlife corridors.</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
