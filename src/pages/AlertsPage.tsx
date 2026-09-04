import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  CheckCircle, 
  AlertTriangle, 
  ShieldCheck, 
  Filter, 
  ArrowUpRight, 
  Clock, 
  Building2, 
  Check, 
  RefreshCw, 
  MapPin, 
  History, 
  Lock,
  Satellite,
  BrainCircuit,
  Siren,
  UserCheck,
  Users,
  CheckCircle2
} from "lucide-react";
import { apiService, HotspotItem } from "../services/api";
import { useAuth } from "../context/AuthContext";

interface AlertsPageProps {
  onSelectHotspot?: (hotspot: HotspotItem) => void;
  onViewOnMap?: (hotspot: HotspotItem) => void;
  onOpenTimeline?: (hotspot: HotspotItem) => void;
  initialSeverity?: string;
}

const ResponseWorkflow = () => {
  const steps = [
    { id: 1, label: "Detection", icon: <Satellite className="w-4 h-4" /> },
    { id: 2, label: "Classification", icon: <BrainCircuit className="w-4 h-4" /> },
    { id: 3, label: "Assessment", icon: <ShieldAlert className="w-4 h-4" /> },
    { id: 4, label: "Alert Generated", icon: <Siren className="w-4 h-4" /> },
    { id: 5, label: "Verification", icon: <UserCheck className="w-4 h-4" /> },
    { id: 6, label: "Assignment", icon: <Users className="w-4 h-4" /> },
    { id: 7, label: "Investigation", icon: <MapPin className="w-4 h-4" /> },
    { id: 8, label: "Resolution", icon: <CheckCircle2 className="w-4 h-4" /> }
  ];
  return (
    <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs mb-4 overflow-hidden">
      <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4">Operational Response Workflow</h3>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center overflow-x-auto pb-2 custom-scrollbar">
        {steps.map((s, idx) => (
          <React.Fragment key={s.id}>
             <div className="flex items-center gap-2 flex-shrink-0 z-10">
               <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-600 border border-slate-200 shadow-sm">
                 {s.icon}
               </div>
               <span className="text-[10px] sm:text-xs font-semibold text-slate-700 whitespace-nowrap">{s.label}</span>
             </div>
             {idx < steps.length - 1 && (
                <div className="hidden sm:block flex-1 h-px bg-slate-200 mx-2 flex-shrink-0 min-w-[16px]" />
             )}
             {idx < steps.length - 1 && (
                <div className="sm:hidden w-px h-4 bg-slate-200 ml-4 flex-shrink-0" />
             )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

const IncidentStatusTracker = ({ status }: { status: string }) => {
  const statusSteps = [
    { id: "NEW", label: "New" },
    { id: "ACKNOWLEDGED", label: "Ack" },
    { id: "ASSIGNED", label: "Assigned" },
    { id: "INVESTIGATING", label: "Investigating" },
    { id: "RESOLVED", label: "Resolved" }
  ];
  
  const curStatus = status || "NEW";
  
  const getIndex = (st: string) => {
    if (st === "ACTIVE") return 0;
    const idx = statusSteps.findIndex(s => s.id === st);
    return idx > -1 ? idx : 0;
  };
  
  const curIndex = getIndex(curStatus);
  
  return (
    <div className="mt-4 mb-3 flex items-center justify-between w-full max-w-md gap-1">
       {statusSteps.map((st, i) => (
          <React.Fragment key={st.id}>
             <div className={`flex flex-col items-center gap-1.5 ${i <= curIndex ? 'text-blue-700' : 'text-slate-400'}`}>
                <div className={`w-3.5 h-3.5 rounded-full border-2 z-10 ${i <= curIndex ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`} />
                <span className="text-[9px] font-bold uppercase tracking-wider">{st.label}</span>
             </div>
             {i < statusSteps.length - 1 && (
                <div className={`flex-1 h-px -mt-4 ${i < curIndex ? 'bg-blue-600' : 'bg-slate-200'}`} />
             )}
          </React.Fragment>
       ))}
    </div>
  );
};

export const AlertsPage: React.FC<AlertsPageProps> = ({
  onSelectHotspot,
  onViewOnMap,
  onOpenTimeline,
  initialSeverity
}) => {
  const { user, canResolveAlerts } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSeverity, setSelectedSeverity] = useState<string>(initialSeverity || "All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (initialSeverity) {
      setSelectedSeverity(initialSeverity);
    }
  }, [initialSeverity]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const isHighCritical = selectedSeverity === "HIGH_CRITICAL";
      const data = await apiService.getAlerts({
        severity: selectedSeverity !== "All" && !isHighCritical ? selectedSeverity : undefined,
        status: selectedStatus !== "All" ? selectedStatus : undefined
      });
      if (isHighCritical) {
        setAlerts(data.filter((a: any) => a.severity === "CRITICAL" || a.severity === "HIGH"));
      } else {
        setAlerts(data);
      }
    } catch (err) {
      console.error("Failed to load alerts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, [selectedSeverity, selectedStatus]);

  const handleUpdateStatus = async (alertId: string, newStatus: string) => {
    try {
      setActionLoadingId(alertId);
      await apiService.updateAlertStatus(alertId, newStatus);
      // Update local state immediately
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: newStatus, incident_status: newStatus, updated_at: new Date().toISOString() } : a))
      );
    } catch (err) {
      console.error("Failed to update alert status", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleAssignTeam = async (alertId: string, team: string) => {
    if (!canResolveAlerts || !team) return;
    try {
      setActionLoadingId(alertId);
      await apiService.assignAlertTeam(alertId, team);
      
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: "ASSIGNED", incident_status: "ASSIGNED", assigned_team: team, updated_at: new Date().toISOString() } : a))
      );
    } catch (err) {
      console.error("Failed to assign team", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleIncidentAction = async (alertId: string, action: string, expectedStatus: string) => {
    if (!canResolveAlerts) return;
    try {
      setActionLoadingId(alertId);
      await apiService.executeAlertAction(alertId, action);
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: expectedStatus, incident_status: expectedStatus, updated_at: new Date().toISOString() } : a))
      );
    } catch (err) {
      console.error("Failed to update status via action", err);
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
    <div className="h-full overflow-y-auto p-3.5 sm:p-6 bg-slate-50 text-slate-800 space-y-4 sm:space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Incident Alert & Dispatch Center
            </h2>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-bold text-red-700 bg-red-50 border border-red-200 uppercase">
              Risk Intelligence Active
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Deterministic incident alerts generated from multi-factor thermal intensity, industrial proximity, hazard type, and persistence metrics.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadAlerts}
            className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer min-h-[38px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-blue-600" : "text-slate-500"}`} />
            <span>Refresh Dispatches</span>
          </button>
        </div>
      </div>

      {/* KPI Metrics Strip */}
      <ResponseWorkflow />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Alerts</div>
          <div className="text-xl sm:text-2xl font-black font-mono text-slate-900 mt-0.5 sm:mt-1">{totalCount}</div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">Deduplicated</div>
        </div>
        <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Critical Priority</div>
          <div className="text-xl sm:text-2xl font-black font-mono text-red-600 mt-0.5 sm:mt-1">{criticalCount}</div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">Tier-3 escalation</div>
        </div>
        <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider">High Priority</div>
          <div className="text-xl sm:text-2xl font-black font-mono text-orange-600 mt-0.5 sm:mt-1">{highCount}</div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">Field surveillance</div>
        </div>
        <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs">
          <div className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active / Resolved</div>
          <div className="text-xl sm:text-2xl font-black font-mono text-teal-700 mt-0.5 sm:mt-1">
            {activeCount} <span className="text-xs text-slate-400 font-normal">/ {resolvedCount}</span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">Resolution status</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 max-w-full overflow-x-auto pb-1 sm:pb-0">
            <Filter className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-700 flex-shrink-0">Severity:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
              {[
                { id: "All", label: "All" },
                { id: "HIGH_CRITICAL", label: "High & Crit" },
                { id: "CRITICAL", label: "Critical" },
                { id: "HIGH", label: "High" },
                { id: "MEDIUM", label: "Medium" },
                { id: "LOW", label: "Low" }
              ].map((sev) => (
                <button
                  key={sev.id}
                  onClick={() => setSelectedSeverity(sev.id)}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap min-h-[32px] ${
                    selectedSeverity === sev.id
                      ? "bg-white text-blue-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {sev.label}
                </button>
              ))}
            </div>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden md:block" />

          <div className="flex items-center gap-2 max-w-full overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs font-semibold text-slate-700 flex-shrink-0">Status:</span>
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl overflow-x-auto">
              {["All", "ACTIVE", "ACKNOWLEDGED", "RESOLVED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStatus(st)}
                  className={`px-2 sm:px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap min-h-[32px] ${
                    selectedStatus === st
                      ? "bg-white text-teal-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        <span className="text-[11px] sm:text-xs text-slate-500 font-mono font-medium">
          {alerts.length} incident records
        </span>
      </div>

      {/* Alert Feed */}
      {loading ? (
        <div className="flex items-center justify-center p-12 text-slate-400 text-xs">
          Loading incident dispatches...
        </div>
      ) : alerts.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white border border-slate-200/80 text-center text-slate-500 text-xs space-y-2 shadow-sm">
          <CheckCircle className="w-8 h-8 text-emerald-600 mx-auto" />
          <p className="text-slate-900 font-bold text-sm">No alerts matching current filters</p>
          <p className="text-slate-500">All registered thermal anomaly sectors are clear or under routine monitoring.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert, index) => {
            const isCrit = alert.severity === "CRITICAL";
            const isHigh = alert.severity === "HIGH";
            const isResolved = alert.status === "RESOLVED";
            const isAck = alert.status === "ACKNOWLEDGED";

            const severityStyle = isResolved
              ? "border-slate-200 bg-white opacity-60"
              : isCrit
              ? "border-red-200 bg-red-50/30"
              : isHigh
              ? "border-orange-200 bg-orange-50/30"
              : "border-amber-200 bg-amber-50/30";

            return (
              <div
                key={alert.id ? `${alert.id}-${index}` : `alert-${index}`}
                className={`p-5 rounded-2xl border transition-all shadow-xs ${severityStyle}`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200/60">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <ShieldAlert className={`w-4 h-4 flex-shrink-0 ${isCrit ? "text-red-600" : isHigh ? "text-orange-600" : "text-amber-600"}`} />
                    <span className="font-bold text-slate-900 text-sm tracking-tight">{alert.title}</span>
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded font-bold border uppercase ${
                        isCrit
                          ? "bg-red-50 text-red-700 border-red-200"
                          : isHigh
                          ? "bg-orange-50 text-orange-700 border-orange-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {alert.severity} Severity
                    </span>
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded font-bold border uppercase ${
                        isResolved
                          ? "bg-teal-50 text-teal-700 border-teal-200"
                          : isAck
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}
                    >
                      Status: {alert.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{alert.created_at ? new Date(alert.created_at).toLocaleString() : "Live Detection"}</span>
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-700 leading-relaxed font-medium">
                  {alert.description}
                </div>

                {alert.facility_name && (
                  <div className="mt-2.5 flex items-center gap-2 text-xs text-slate-600">
                    <Building2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    <span>Target Perimeter: <strong className="text-slate-900 font-semibold">{alert.facility_name}</strong></span>
                  </div>
                )}

                {alert.action_recommended && (
                  <div className="mt-3 p-3 rounded-xl bg-white border border-slate-200/80 text-xs text-slate-700 shadow-2xs">
                    <span className="font-bold text-amber-700">Emergency Protocol: </span>
                    <span className="font-medium">{alert.action_recommended}</span>
                  </div>
                )}
                
                <IncidentStatusTracker status={alert.incident_status || alert.status} />
                
                {canResolveAlerts && (isCrit || isHigh) && alert.status !== "RESOLVED" && (
                  <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row gap-3">
                    <select
                      onChange={(e) => handleAssignTeam(alert.id, e.target.value)}
                      value={alert.assigned_team || ""}
                      className="flex-1 px-3 py-1.5 bg-white text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-xs cursor-pointer outline-none"
                    >
                      <option value="" disabled>Assign Response Team...</option>
                      <option value="Industrial Emergency Response">Industrial Emergency Response</option>
                      <option value="Forest Fire Response">Forest Fire Response</option>
                      <option value="Field Inspection">Field Inspection</option>
                      <option value="GIS Verification">GIS Verification</option>
                    </select>
                    <select
                      onChange={(e) => handleIncidentAction(alert.id, e.target.value, e.target.value === "INVESTIGATE" ? "INVESTIGATING" : e.target.value)}
                      value=""
                      className="px-3 py-1.5 bg-white text-blue-700 text-xs font-bold rounded-lg border border-blue-300 shadow-xs cursor-pointer outline-none"
                    >
                      <option value="" disabled>Update Status...</option>
                      <option value="ACKNOWLEDGE">Acknowledge</option>
                      <option value="INVESTIGATE">Investigating</option>
                      <option value="RESOLVE">Mark Resolved</option>
                      <option value="ESCALATE">Escalate to Critical</option>
                    </select>
                  </div>
                )}

                {/* Interactive Action Bar */}
                <div className="mt-4 pt-3 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {canResolveAlerts ? (
                      <>
                        {alert.status !== "ACKNOWLEDGED" && alert.status !== "RESOLVED" && (
                          <button
                            onClick={() => handleUpdateStatus(alert.id, "ACKNOWLEDGED")}
                            disabled={actionLoadingId === alert.id}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Acknowledge Incident</span>
                          </button>
                        )}
                        {alert.status !== "RESOLVED" && (
                          <button
                            onClick={() => handleUpdateStatus(alert.id, "RESOLVED")}
                            disabled={actionLoadingId === alert.id}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Mark Resolved</span>
                          </button>
                        )}
                        {alert.status === "RESOLVED" && (
                          <button
                            onClick={() => handleUpdateStatus(alert.id, "ACTIVE")}
                            disabled={actionLoadingId === alert.id}
                            className="px-3 py-1.5 rounded-xl bg-white hover:bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
                          >
                            <span>Reopen Incident</span>
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-100 border border-slate-200 text-[11px] font-medium text-slate-500">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>Analyst Clearance (Inspect & Dossier Only)</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {alert.event_id && onSelectHotspot && (
                      <button
                        onClick={() => handleInspect(alert.event_id)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-blue-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      >
                        <span>View Evidence</span>
                        <ArrowUpRight className="w-3.5 h-3.5 text-blue-600" />
                      </button>
                    )}
                    {alert.event_id && onViewOnMap && (
                      <button
                        onClick={() => handleShowOnMap(alert.event_id)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-emerald-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      >
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Map</span>
                      </button>
                    )}
                    {alert.event_id && onOpenTimeline && (
                      <button
                        onClick={() => handleShowTimeline(alert.event_id)}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-teal-700 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      >
                        <History className="w-3.5 h-3.5 text-teal-600" />
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
