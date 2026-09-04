import React, { useState, useEffect } from "react";
import { ShieldAlert, CheckCircle, AlertTriangle, ShieldCheck, Filter, ArrowUpRight, Clock, Building2, Check, RefreshCw, MapPin, History, Lock } from "lucide-react";
import { apiService, HotspotItem } from "../services/api";
import { useAuth } from "../context/AuthContext";

interface AlertsPageProps {
  onSelectHotspot?: (hotspot: HotspotItem) => void;
  onViewOnMap?: (hotspot: HotspotItem) => void;
  onOpenTimeline?: (hotspot: HotspotItem) => void;
}

export const AlertsPage: React.FC<AlertsPageProps> = ({
  onSelectHotspot,
  onViewOnMap,
  onOpenTimeline
}) => {
  const { user, canResolveAlerts } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSeverity, setSelectedSeverity] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const data = await apiService.getAlerts({
        severity: selectedSeverity !== "All" ? selectedSeverity : undefined,
        status: selectedStatus !== "All" ? selectedStatus : undefined
      });
      setAlerts(data);
    } catch (err) {
      console.error("Failed to load alerts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [selectedSeverity, selectedStatus]);

  const handleUpdateStatus = async (alertId: string, newStatus: "ACTIVE" | "ACKNOWLEDGED" | "RESOLVED") => {
    try {
      setActionLoadingId(alertId);
      await apiService.updateAlertStatus(alertId, newStatus);
      // Update local state immediately
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: newStatus, updated_at: new Date().toISOString() } : a))
      );
    } catch (err) {
      console.error("Failed to update alert status", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleInspect = async (eventId: string) => {
    if (!onSelectHotspot) return;
    try {
      const hotspot = await apiService.getHotspotById(eventId);
      onSelectHotspot(hotspot);
    } catch (err) {
      console.error("Failed to fetch hotspot for inspection", err);
    }
  };

  const handleShowOnMap = async (eventId: string) => {
    if (!onViewOnMap) return;
    try {
      const hotspot = await apiService.getHotspotById(eventId);
      onViewOnMap(hotspot);
    } catch (err) {
      console.error("Failed to fetch hotspot for map view", err);
    }
  };

  const handleShowTimeline = async (eventId: string) => {
    if (!onOpenTimeline) return;
    try {
      const hotspot = await apiService.getHotspotById(eventId);
      onOpenTimeline(hotspot);
    } catch (err) {
      console.error("Failed to fetch hotspot for timeline", err);
    }
  };

  // Aggregated alert counts
  const totalCount = alerts.length;
  const criticalCount = alerts.filter((a) => a.severity === "CRITICAL").length;
  const highCount = alerts.filter((a) => a.severity === "HIGH").length;
  const activeCount = alerts.filter((a) => a.status === "ACTIVE").length;
  const resolvedCount = alerts.filter((a) => a.status === "RESOLVED").length;

  return (
    <div className="h-full overflow-y-auto p-4 bg-[#0b1120] text-slate-100 space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-3.5 border-b border-[#1e293b] gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xs font-semibold text-white">
              Incident Alert & Operational Dispatch Center
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] text-rose-400 bg-rose-500/10 border border-rose-500/20">
              Risk Intelligence Active
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Deterministic incident alerts generated from multi-factor thermal intensity, industrial proximity, hazard type, and persistence metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAlerts}
            className="px-3 py-1.5 rounded bg-[#0f172a] hover:bg-[#131d35] border border-[#1e293b] text-xs text-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-cyan-400" : "text-slate-400"}`} />
            <span>Refresh Dispatches</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded bg-[#0f172a] border border-[#1e293b]">
          <div className="text-[11px] text-slate-400">Total Registered Alerts</div>
          <div className="text-sm font-bold font-mono text-white mt-0.5">{totalCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Deduplicated incidents</div>
        </div>
        <div className="p-3.5 rounded bg-[#0f172a] border border-[#1e293b]">
          <div className="text-[11px] text-slate-400">Critical Priority</div>
          <div className="text-sm font-bold font-mono text-rose-400 mt-0.5">{criticalCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Immediate Tier-3 escalation</div>
        </div>
        <div className="p-3.5 rounded bg-[#0f172a] border border-[#1e293b]">
          <div className="text-[11px] text-slate-400">High Priority</div>
          <div className="text-sm font-bold font-mono text-orange-400 mt-0.5">{highCount}</div>
          <div className="text-[10px] text-slate-400 mt-0.5">Priority field surveillance</div>
        </div>
        <div className="p-3.5 rounded bg-[#0f172a] border border-[#1e293b]">
          <div className="text-[11px] text-slate-400">Active vs Resolved</div>
          <div className="text-sm font-bold font-mono text-teal-400 mt-0.5">
            {activeCount} <span className="text-xs text-slate-400 font-normal">/ {resolvedCount} resolved</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-0.5">Operational resolution status</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3 rounded bg-[#0f172a] border border-[#1e293b] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Filter Severity:</span>
          </div>
          <div className="flex items-center gap-1 bg-[#131d35] p-0.5 rounded border border-[#1e293b]">
            {["All", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => (
              <button
                key={sev}
                onClick={() => setSelectedSeverity(sev)}
                className={`px-2 py-1 rounded text-[11px] transition-colors ${
                  selectedSeverity === sev
                    ? "bg-cyan-500/20 text-cyan-300 font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {sev}
              </button>
            ))}
          </div>

          <div className="h-4 w-px bg-[#1e293b] hidden sm:block" />

          <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
            <span>Status:</span>
          </div>
          <div className="flex items-center gap-1 bg-[#131d35] p-0.5 rounded border border-[#1e293b]">
            {["All", "ACTIVE", "ACKNOWLEDGED", "RESOLVED"].map((st) => (
              <button
                key={st}
                onClick={() => setSelectedStatus(st)}
                className={`px-2 py-1 rounded text-[11px] transition-colors ${
                  selectedStatus === st
                    ? "bg-teal-500/20 text-teal-300 font-semibold"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        <span className="text-[11px] text-slate-400 font-mono">
          Showing {alerts.length} incident records
        </span>
      </div>

      {/* Alert Feed */}
      {loading ? (
        <div className="flex items-center justify-center p-12 text-slate-400 text-xs">
          Loading incident dispatches...
        </div>
      ) : alerts.length === 0 ? (
        <div className="p-12 rounded bg-[#0f172a] border border-[#1e293b] text-center text-slate-400 text-xs space-y-2">
          <CheckCircle className="w-8 h-8 text-teal-400 mx-auto" />
          <p className="text-slate-200 font-medium">No alerts matching current filters</p>
          <p className="text-slate-400">All registered thermal anomaly sectors are clear or under routine monitoring.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert, index) => {
            const isCrit = alert.severity === "CRITICAL";
            const isHigh = alert.severity === "HIGH";
            const isResolved = alert.status === "RESOLVED";
            const isAck = alert.status === "ACKNOWLEDGED";

            const severityBorder = isCrit
              ? "border-rose-500/30 bg-rose-500/5"
              : isHigh
              ? "border-orange-500/30 bg-orange-500/5"
              : "border-amber-500/30 bg-amber-500/5";

            return (
              <div
                key={alert.id || index}
                className={`p-3.5 rounded border transition-all ${severityBorder} ${
                  isResolved ? "opacity-60" : "opacity-100"
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2.5 border-b border-[#1e293b]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <ShieldAlert className={`w-4 h-4 flex-shrink-0 ${isCrit ? "text-rose-400" : isHigh ? "text-orange-400" : "text-amber-400"}`} />
                    <span className="font-semibold text-white text-xs">{alert.title}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                        isCrit
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                          : isHigh
                          ? "bg-orange-500/10 text-orange-400 border-orange-500/30"
                          : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      }`}
                    >
                      {alert.severity} Severity
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                        isResolved
                          ? "bg-teal-500/10 text-teal-400 border-teal-500/30"
                          : isAck
                          ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                          : "bg-rose-500/10 text-rose-300 border-rose-500/30"
                      }`}
                    >
                      Status: {alert.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{alert.created_at ? new Date(alert.created_at).toLocaleString() : "Live Detection"}</span>
                  </div>
                </div>

                <div className="mt-2 text-xs text-slate-300 leading-relaxed">
                  {alert.description}
                </div>

                {alert.facility_name && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-400">
                    <Building2 className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                    <span>Target Perimeter: <span className="text-slate-200 font-medium">{alert.facility_name}</span></span>
                  </div>
                )}

                {alert.action_recommended && (
                  <div className="mt-2.5 p-2.5 rounded bg-[#131d35] border border-[#1e293b] text-xs text-slate-200">
                    <span className="font-semibold text-amber-400">Emergency Protocol: </span>
                    <span>{alert.action_recommended}</span>
                  </div>
                )}

                {/* Interactive Action Bar */}
                <div className="mt-2.5 pt-2.5 border-t border-[#1e293b] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {canResolveAlerts ? (
                      <>
                        {alert.status !== "ACKNOWLEDGED" && alert.status !== "RESOLVED" && (
                          <button
                            onClick={() => handleUpdateStatus(alert.id, "ACKNOWLEDGED")}
                            disabled={actionLoadingId === alert.id}
                            className="px-2.5 py-1 rounded bg-[#0f172a] hover:bg-[#131d35] border border-cyan-500/30 text-cyan-300 text-[11px] font-medium flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            <span>Acknowledge Incident</span>
                          </button>
                        )}
                        {alert.status !== "RESOLVED" && (
                          <button
                            onClick={() => handleUpdateStatus(alert.id, "RESOLVED")}
                            disabled={actionLoadingId === alert.id}
                            className="px-2.5 py-1 rounded bg-[#0f172a] hover:bg-[#131d35] border border-teal-500/30 text-teal-300 text-[11px] font-medium flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>Mark Resolved</span>
                          </button>
                        )}
                        {alert.status === "RESOLVED" && (
                          <button
                            onClick={() => handleUpdateStatus(alert.id, "ACTIVE")}
                            disabled={actionLoadingId === alert.id}
                            className="px-2.5 py-1 rounded bg-[#0f172a] hover:bg-[#131d35] border border-rose-500/30 text-rose-300 text-[11px] font-medium flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <span>Reopen Incident</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#090f1b] border border-[#182640] text-[10px] text-slate-400">
                        <Lock className="w-2.5 h-2.5 text-slate-500" />
                        <span>Analyst Clearance (Inspect & Dossier Only)</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {alert.event_id && onSelectHotspot && (
                      <button
                        onClick={() => handleInspect(alert.event_id)}
                        className="px-2.5 py-1 rounded bg-[#0f172a] hover:bg-[#131d35] border border-cyan-500/20 text-cyan-300 text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <span>Dossier</span>
                        <ArrowUpRight className="w-3 h-3 text-cyan-400" />
                      </button>
                    )}
                    {alert.event_id && onViewOnMap && (
                      <button
                        onClick={() => handleShowOnMap(alert.event_id)}
                        className="px-2.5 py-1 rounded bg-[#0f172a] hover:bg-[#131d35] border border-emerald-500/20 text-emerald-300 text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <MapPin className="w-3 h-3 text-emerald-400" />
                        <span>Map</span>
                      </button>
                    )}
                    {alert.event_id && onOpenTimeline && (
                      <button
                        onClick={() => handleShowTimeline(alert.event_id)}
                        className="px-2.5 py-1 rounded bg-[#0f172a] hover:bg-[#131d35] border border-teal-500/20 text-teal-300 text-[11px] flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <History className="w-3 h-3 text-teal-400" />
                        <span>Timeline</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
