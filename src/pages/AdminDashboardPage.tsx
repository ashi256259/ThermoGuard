import React, { useState, useEffect } from "react";
import {
  ShieldAlert,
  Server,
  Users,
  Activity,
  Radio,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sliders,
  ShieldCheck,
  Key,
  UserPlus,
  Trash2,
  Power,
  Clock,
  Database,
  Layers,
  FileText,
  AlertCircle,
  Check,
  Lock,
  ChevronDown,
  ChevronUp,
  History,
  Cpu,
  Zap,
  Globe,
  Satellite,
  Search,
  ExternalLink
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { apiService, HotspotItem } from "../services/api";

type AdminTab = "overview" | "alerts" | "providers" | "users" | "sessions" | "config";

interface AdminDashboardPageProps {
  onSelectHotspot?: (hotspot: HotspotItem) => void;
  onViewOnMap?: (hotspot: HotspotItem) => void;
  onOpenTimeline?: (hotspot: HotspotItem) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  onSelectHotspot,
  onViewOnMap,
  onOpenTimeline
}) => {
  const { user, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);

  // Telemetry data
  const [overviewData, setOverviewData] = useState<any>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [sessionsList, setSessionsList] = useState<any[]>([]);
  const [adminConfig, setAdminConfig] = useState<any>(null);

  // Action states
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [selectedAlertForAction, setSelectedAlertForAction] = useState<any | null>(null);
  const [actionNotes, setActionNotes] = useState<string>("");
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);

  // New User Form State
  const [showAddUserModal, setShowAddUserModal] = useState<boolean>(false);
  const [newUsername, setNewUsername] = useState<string>("");
  const [newName, setNewName] = useState<string>("");
  const [newEmail, setNewEmail] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [newRole, setNewRole] = useState<string>("ANALYST");
  const [newDepartment, setNewDepartment] = useState<string>("Thermal Geospatial Unit");

  // Config Form State
  const [configForm, setConfigForm] = useState<any>({});
  const [testingProvider, setTestingProvider] = useState<boolean>(false);
  const [providerTestResult, setProviderTestResult] = useState<any>(null);

  const showNotification = (type: "success" | "error" | "info", text: string) => {
    setActionMessage({ type, text });
    setTimeout(() => {
      setActionMessage(null);
    }, 5000);
  };

  const loadAllAdminData = async () => {
    try {
      setRefreshing(true);
      const [overview, health, alertsData, usersRes, sessionsRes, configRes] = await Promise.all([
        apiService.getAdminOverview().catch(() => null),
        apiService.getAdminSystemHealth().catch(() => null),
        apiService.getAlerts().catch(() => []),
        apiService.getAdminUsers().catch(() => ({ users: [] })),
        apiService.getAdminSessions().catch(() => ({ sessions: [] })),
        apiService.getAdminConfig().catch(() => ({ config: {} }))
      ]);

      setOverviewData(overview);
      setSystemHealth(health);
      setAlerts(alertsData);
      setUsersList(usersRes.users || []);
      setSessionsList(sessionsRes.sessions || []);
      if (configRes && configRes.config) {
        setAdminConfig(configRes);
        setConfigForm(configRes.config);
      }
    } catch (err: any) {
      console.error("Failed to load admin data", err);
      showNotification("error", err.message || "Failed to load administrative telemetry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, []);

  const handleToggleDataMode = async () => {
    try {
      setActionLoadingId("mode-toggle");
      const res = await apiService.toggleAdminDataMode();
      showNotification("success", res.message || "Data mode updated.");
      await loadAllAdminData();
    } catch (err: any) {
      showNotification("error", err.message || "Failed to toggle data mode.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleExecuteAlertAction = async (alertId: string, action: "ACKNOWLEDGE" | "RESOLVE" | "REOPEN" | "ESCALATE") => {
    try {
      setActionLoadingId(`alert-${alertId}`);
      const res = await apiService.executeAlertAction(alertId, action, actionNotes || undefined);
      showNotification("success", res.message || `Alert ${action} successfully.`);
      setSelectedAlertForAction(null);
      setActionNotes("");
      await loadAllAdminData();
    } catch (err: any) {
      showNotification("error", err.message || "Failed to execute alert action.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newName || !newEmail || !newPassword) {
      showNotification("error", "All fields are required.");
      return;
    }
    try {
      setActionLoadingId("create-user");
      await apiService.createAdminUser({
        username: newUsername,
        name: newName,
        email: newEmail,
        password: newPassword,
        role: newRole,
        department: newDepartment
      });
      showNotification("success", `Account created for ${newName} [${newRole}].`);
      setShowAddUserModal(false);
      setNewUsername("");
      setNewName("");
      setNewEmail("");
      setNewPassword("");
      await loadAllAdminData();
    } catch (err: any) {
      showNotification("error", err.message || "Failed to create user account.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUpdateRole = async (userId: string, targetRole: string) => {
    try {
      setActionLoadingId(`user-role-${userId}`);
      await apiService.updateAdminUserRole(userId, targetRole);
      showNotification("success", `User role updated to ${targetRole}.`);
      await loadAllAdminData();
    } catch (err: any) {
      showNotification("error", err.message || "Failed to update role.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`Are you sure you want to permanently revoke credentials for ${userName}?`)) {
      return;
    }
    try {
      setActionLoadingId(`delete-${userId}`);
      await apiService.deleteAdminUser(userId);
      showNotification("success", `Credentials for ${userName} revoked.`);
      await loadAllAdminData();
    } catch (err: any) {
      showNotification("error", err.message || "Failed to delete user.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRevokeSession = async (token: string) => {
    try {
      setActionLoadingId(`session-${token.substring(0, 8)}`);
      await apiService.revokeAdminSession(token);
      showNotification("success", "Active session invalidated.");
      await loadAllAdminData();
    } catch (err: any) {
      showNotification("error", err.message || "Failed to revoke session.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoadingId("save-config");
      await apiService.updateAdminConfig(configForm);
      showNotification("success", "Administrative system configuration updated.");
      await loadAllAdminData();
    } catch (err: any) {
      showNotification("error", err.message || "Failed to save configuration.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleTestProvider = async (provider: string) => {
    try {
      setTestingProvider(true);
      const res = await apiService.testAdminProvider(provider);
      setProviderTestResult(res);
      showNotification("success", `${provider} connectivity test completed.`);
    } catch (err: any) {
      showNotification("error", err.message || "Provider test failed.");
    } finally {
      setTestingProvider(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="h-full flex items-center justify-center p-6 bg-[#070b14] text-slate-100">
        <div className="max-w-md w-full p-6 rounded-xl bg-[#0b1220] border border-rose-500/30 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-white">Restricted Command Authorization</h2>
            <p className="text-xs text-slate-400 mt-1">
              Your active clearance role ({user?.role || "ANALYST"}) is designated for intelligence analysis and does not have administrative command privileges.
            </p>
          </div>
          <div className="p-3 rounded bg-[#090f1b] border border-[#172238] text-[11px] font-mono text-slate-400">
            Required Clearance: Level 4 Restricted (Command Authority / Administrator)
          </div>
        </div>
      </div>
    );
  }

  const isLive = overviewData?.system?.data_mode === "LIVE_SATELLITE_API";

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#070b14] text-slate-100 font-sans">
      {/* 1. TOP COMMAND BAR */}
      <header className="flex-shrink-0 px-4 py-3 bg-[#090e1a] border-b border-[#152033] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-semibold text-white tracking-tight">
                Command Authority & Administration Console
              </h1>
              <span className="px-2 py-0.5 rounded font-mono text-[9px] bg-rose-500/10 text-rose-300 border border-rose-500/30">
                L4 RESTRICTED
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              National Technical Research Organisation (NTRO) • SIH26162
            </p>
          </div>
        </div>

        {/* Global Action & Status Strip */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Data Mode Switcher */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#0c1424] border border-[#182640]">
            <span className="text-[10px] text-slate-400">Data Feed:</span>
            <span className={`text-[10px] font-mono font-medium px-1.5 py-0.5 rounded ${
              isLive
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                : "bg-teal-500/20 text-teal-300 border border-teal-500/40"
            }`}>
              {isLive ? "LIVE NASA SATELLITE" : "CALIBRATED DEMO FEED"}
            </span>

            <button
              onClick={handleToggleDataMode}
              disabled={actionLoadingId === "mode-toggle"}
              className="px-2 py-0.5 rounded bg-[#131f36] hover:bg-[#1a2b4a] border border-[#23375c] text-[10px] text-cyan-300 transition-colors cursor-pointer flex items-center gap-1 disabled:opacity-50"
            >
              <Power className="w-2.5 h-2.5" />
              <span>{isLive ? "Switch to Demo" : "Switch to Live"}</span>
            </button>
          </div>

          <button
            onClick={loadAllAdminData}
            disabled={refreshing}
            className="px-2.5 py-1 rounded bg-[#0f172a] hover:bg-[#15233e] border border-[#1e2f4f] text-xs text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-cyan-400" : "text-slate-400"}`} />
            <span>Refresh Telemetry</span>
          </button>
        </div>
      </header>

      {/* Action Notification Toast */}
      {actionMessage && (
        <div className={`px-4 py-2 text-xs flex items-center justify-between border-b ${
          actionMessage.type === "success"
            ? "bg-emerald-950/60 text-emerald-300 border-emerald-800/60"
            : actionMessage.type === "error"
            ? "bg-rose-950/60 text-rose-300 border-rose-800/60"
            : "bg-cyan-950/60 text-cyan-300 border-cyan-800/60"
        }`}>
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" && <CheckCircle2 className="w-3.5 h-3.5" />}
            {actionMessage.type === "error" && <AlertTriangle className="w-3.5 h-3.5" />}
            {actionMessage.type === "info" && <Activity className="w-3.5 h-3.5" />}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-white">
            <XCircle className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. TAB NAVIGATION BAR */}
      <div className="flex-shrink-0 px-4 bg-[#090e1a] border-b border-[#152033] flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === "overview"
              ? "border-cyan-400 text-cyan-300 bg-[#0f182c]"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>System Overview</span>
        </button>

        <button
          onClick={() => setActiveTab("alerts")}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === "alerts"
              ? "border-cyan-400 text-cyan-300 bg-[#0f182c]"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Incident Alert Authority</span>
          {alerts.filter(a => a.status === "ACTIVE").length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full font-mono text-[9px] bg-rose-500 text-white font-bold">
              {alerts.filter(a => a.status === "ACTIVE").length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("providers")}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === "providers"
              ? "border-cyan-400 text-cyan-300 bg-[#0f182c]"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Radio className="w-3.5 h-3.5" />
          <span>Provider Ingestion</span>
        </button>

        <button
          onClick={() => setActiveTab("users")}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === "users"
              ? "border-cyan-400 text-cyan-300 bg-[#0f182c]"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>User & Clearance Roles</span>
          <span className="px-1.5 py-0.2 rounded font-mono text-[9px] bg-slate-800 text-slate-300">
            {usersList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("sessions")}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === "sessions"
              ? "border-cyan-400 text-cyan-300 bg-[#0f182c]"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Active Sessions</span>
          <span className="px-1.5 py-0.2 rounded font-mono text-[9px] bg-emerald-500/20 text-emerald-300">
            {sessionsList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("config")}
          className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
            activeTab === "config"
              ? "border-cyan-400 text-cyan-300 bg-[#0f182c]"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>System Parameters</span>
        </button>
      </div>

      {/* 3. TAB CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ========================================== */}
        {/* TAB 1: SYSTEM OVERVIEW                     */}
        {/* ========================================== */}
        {activeTab === "overview" && (
          <div className="space-y-4">
            {/* KPI Summary Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-lg bg-[#0c1424] border border-[#182640]">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Total Hotspots Ingested</span>
                  <Database className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="text-xl font-bold font-mono text-white mt-1">
                  {overviewData?.counts?.total_hotspots || 0}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                  <span className="text-emerald-400 font-mono">{overviewData?.counts?.live_hotspots || 0} Live</span>
                  <span>•</span>
                  <span className="text-teal-400 font-mono">{overviewData?.counts?.demo_hotspots || 0} Demo</span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#0c1424] border border-[#182640]">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Incident Alerts</span>
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                </div>
                <div className="text-xl font-bold font-mono text-rose-400 mt-1">
                  {overviewData?.counts?.alerts?.active || 0}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {overviewData?.counts?.alerts?.resolved || 0} Resolved • {overviewData?.counts?.alerts?.acknowledged || 0} In Progress
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#0c1424] border border-[#182640]">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Registered Accounts</span>
                  <Users className="w-3.5 h-3.5 text-teal-400" />
                </div>
                <div className="text-xl font-bold font-mono text-teal-300 mt-1">
                  {overviewData?.counts?.registered_users || 0}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                  {overviewData?.counts?.active_sessions || 0} Active JWT Sessions
                </div>
              </div>

              <div className="p-3.5 rounded-lg bg-[#0c1424] border border-[#182640]">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>System Uptime</span>
                  <Clock className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div className="text-xl font-bold font-mono text-emerald-400 mt-1 truncate">
                  {overviewData?.system?.uptime_formatted || "Nominal"}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">
                  Node.js {overviewData?.system?.node_version || "Unknown"}
                </div>
              </div>
            </div>

            {/* Telemetry Architecture Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Process & Memory Telemetry */}
              <div className="p-4 rounded-lg bg-[#0c1424] border border-[#182640] space-y-3">
                <div className="flex items-center justify-between border-b border-[#182640] pb-2">
                  <div className="flex items-center gap-2">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs font-semibold text-white">Runtime & Memory Diagnostics</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded font-mono text-[9px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                    STATUS: NOMINAL
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400">RSS Resident Memory:</span>
                    <span className="font-mono text-cyan-300">{overviewData?.system?.memory_mb?.rss || 0} MB</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400">Heap Total Allocated:</span>
                    <span className="font-mono text-slate-200">{overviewData?.system?.memory_mb?.heap_total || 0} MB</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400">Heap In-Use:</span>
                    <span className="font-mono text-emerald-300">{overviewData?.system?.memory_mb?.heap_used || 0} MB</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400">Host Architecture:</span>
                    <span className="font-mono text-slate-300">{systemHealth?.telemetry?.cpu?.arch || "x64"} ({systemHealth?.telemetry?.cpu?.platform || "linux"})</span>
                  </div>
                </div>
              </div>

              {/* Spatial PostGIS Engine Telemetry */}
              <div className="p-4 rounded-lg bg-[#0c1424] border border-[#182640] space-y-3">
                <div className="flex items-center justify-between border-b border-[#182640] pb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-teal-400" />
                    <h3 className="text-xs font-semibold text-white">PostGIS & Machine Learning Subsystem</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded font-mono text-[9px] bg-teal-500/10 text-teal-300 border border-teal-500/30">
                    INDEX: GIST ACTIVE
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400">PostGIS Geometry Index:</span>
                    <span className="font-mono text-emerald-400">geometry_gist_idx (Spatial Tree)</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400">ML Classifier Architecture:</span>
                    <span className="font-mono text-cyan-300">Random Forest Ensemble (100 Trees)</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400">Feature Engineering Pipeline:</span>
                    <span className="font-mono text-slate-200">14 Thermal, Spatial & Temporal Features</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400">Model Version:</span>
                    <span className="font-mono text-amber-300">random_forest_v1.0.0</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Provider Connectivity Grid */}
            <div className="p-4 rounded-lg bg-[#0c1424] border border-[#182640] space-y-3">
              <div className="flex items-center justify-between border-b border-[#182640] pb-2">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-xs font-semibold text-white">Geospatial Data Provider Interfaces</h3>
                </div>
                <button
                  onClick={() => setActiveTab("providers")}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  <span>Manage Ingestion</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="p-3 rounded bg-[#090f1b] border border-[#152238] space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">NASA FIRMS API</span>
                    <span className={`px-1.5 py-0.2 rounded font-mono text-[9px] ${
                      isLive ? "bg-emerald-500/20 text-emerald-300" : "bg-teal-500/20 text-teal-300"
                    }`}>
                      {isLive ? "LIVE NRT" : "CALIBRATED FEED"}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Thermal observations from VIIRS (SNPP/NOAA-20) & MODIS sensors.
                  </p>
                </div>

                <div className="p-3 rounded bg-[#090f1b] border border-[#152238] space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">OpenStreetMap (OSM)</span>
                    <span className="px-1.5 py-0.2 rounded font-mono text-[9px] bg-emerald-500/20 text-emerald-300">
                      POSTGIS SPATIAL
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Industrial refinery, gas flare stack, petrochemical & power plant cadastre.
                  </p>
                </div>

                <div className="p-3 rounded bg-[#090f1b] border border-[#152238] space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-white">ESA WorldCover 10m</span>
                    <span className="px-1.5 py-0.2 rounded font-mono text-[9px] bg-emerald-500/20 text-emerald-300">
                      LAND COVER 10M
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    High-resolution cropland, dense forest reserve, cropland, and built-up land-use context.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 2: INCIDENT ALERT AUTHORITY             */}
        {/* ========================================== */}
        {activeTab === "alerts" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#182640] gap-2">
              <div>
                <h2 className="text-xs font-semibold text-white">
                  Incident Alert Management & Command Audit Trail
                </h2>
                <p className="text-xs text-slate-400">
                  Command-level triage, officer acknowledgement, hazard resolution, and timestamped forensic trail.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Total Alerts: {alerts.length}</span>
              </div>
            </div>

            {/* Alerts List with Audit Logs */}
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <div className="p-8 text-center bg-[#0c1424] border border-[#182640] rounded-lg text-slate-400 text-xs">
                  No incident alerts logged. All thermal perimeters nominal.
                </div>
              ) : (
                alerts.map((alert) => {
                  const isAck = alert.status === "ACKNOWLEDGED";
                  const isResolved = alert.status === "RESOLVED";
                  const isExpanded = expandedAlertId === alert.id;

                  return (
                    <div
                      key={alert.id}
                      className={`p-3.5 rounded-lg border transition-all ${
                        isResolved
                          ? "bg-[#090f1b] border-[#182640] opacity-85"
                          : alert.severity === "CRITICAL"
                          ? "bg-[#140c17] border-rose-500/40 shadow-sm"
                          : "bg-[#0c1424] border-amber-500/30"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold border ${
                              alert.severity === "CRITICAL"
                                ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                                : "bg-amber-500/20 text-amber-300 border-amber-500/40"
                            }`}>
                              {alert.severity} HAZARD
                            </span>

                            <span className={`px-2 py-0.5 rounded font-mono text-[9px] border ${
                              isResolved
                                ? "bg-teal-500/20 text-teal-300 border-teal-500/40"
                                : isAck
                                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                                : "bg-rose-500/20 text-rose-300 border-rose-500/40"
                            }`}>
                              STATUS: {alert.status}
                            </span>

                            <span className="text-xs font-semibold text-white">
                              {alert.title}
                            </span>
                          </div>

                          <p className="text-xs text-slate-300">
                            {alert.description}
                          </p>

                          {alert.facility_name && (
                            <div className="text-[11px] text-cyan-300 font-mono">
                              Perimeter Target: {alert.facility_name}
                            </div>
                          )}

                          {alert.action_recommended && (
                            <div className="text-[11px] text-amber-300 bg-amber-950/30 border border-amber-800/40 px-2 py-1 rounded">
                              <span className="font-semibold">Recommended Protocol: </span>
                              {alert.action_recommended}
                            </div>
                          )}
                        </div>

                        {/* Officer Action Buttons */}
                        <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
                          {!isAck && !isResolved && (
                            <button
                              onClick={() => {
                                setSelectedAlertForAction(alert);
                                setActionNotes("");
                              }}
                              disabled={actionLoadingId === `alert-${alert.id}`}
                              className="px-2.5 py-1 rounded bg-[#0f172a] hover:bg-[#131d35] border border-cyan-500/40 text-cyan-300 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              <span>Acknowledge</span>
                            </button>
                          )}

                          {!isResolved && (
                            <button
                              onClick={() => {
                                setSelectedAlertForAction({ ...alert, _targetAction: "RESOLVE" });
                                setActionNotes("");
                              }}
                              disabled={actionLoadingId === `alert-${alert.id}`}
                              className="px-2.5 py-1 rounded bg-[#0f172a] hover:bg-[#131d35] border border-teal-500/40 text-teal-300 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              <span>Resolve</span>
                            </button>
                          )}

                          {isResolved && (
                            <button
                              onClick={() => handleExecuteAlertAction(alert.id, "REOPEN")}
                              disabled={actionLoadingId === `alert-${alert.id}`}
                              className="px-2.5 py-1 rounded bg-[#0f172a] hover:bg-[#131d35] border border-rose-500/40 text-rose-300 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                            >
                              <span>Reopen</span>
                            </button>
                          )}

                          <button
                            onClick={() => setExpandedAlertId(isExpanded ? null : alert.id)}
                            className="px-2 py-1 rounded bg-[#090f1b] border border-[#1c2a44] text-slate-400 hover:text-slate-200 text-[11px] flex items-center gap-1 cursor-pointer"
                          >
                            <History className="w-3 h-3" />
                            <span>Audit Trail</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>

                      {/* Expandable Forensic Audit Trail */}
                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-[#182640] space-y-2 bg-[#080d17] p-3 rounded-lg">
                          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-300">
                            <span className="flex items-center gap-1.5">
                              <History className="w-3.5 h-3.5 text-cyan-400" />
                              <span>Forensic Operational Audit Trail</span>
                            </span>
                            <span className="font-mono text-slate-400 text-[10px]">Alert ID: {alert.id}</span>
                          </div>

                          <div className="space-y-1.5 text-xs">
                            {alert.audit_trail && alert.audit_trail.length > 0 ? (
                              alert.audit_trail.map((log: any, idx: number) => (
                                <div key={idx} className="p-2 rounded bg-[#0c1424] border border-[#162238] flex items-start justify-between gap-2">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5 font-mono text-[10px]">
                                      <span className="text-cyan-400 font-bold">[{log.action}]</span>
                                      <span className="text-slate-300 font-semibold">{log.performed_by}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-300">{log.notes}</p>
                                  </div>
                                  <span className="text-[9px] font-mono text-slate-400 whitespace-nowrap">
                                    {new Date(log.timestamp).toLocaleString()}
                                  </span>
                                </div>
                              ))
                            ) : (
                              <div className="text-[11px] text-slate-400 font-mono">
                                System triggered alert logged on {new Date(alert.created_at).toLocaleString()}.
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Alert Action Modal */}
            {selectedAlertForAction && (
              <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="max-w-md w-full rounded-xl bg-[#0c1424] border border-[#1e2f4f] p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#182640] pb-2">
                    <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-cyan-400" />
                      <span>Execute Command Authority Action</span>
                    </h3>
                    <button onClick={() => setSelectedAlertForAction(null)} className="text-slate-400 hover:text-white">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="text-xs text-slate-300">
                    <span className="font-semibold text-white">Target Hazard: </span>
                    <span>{selectedAlertForAction.title}</span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Command Operational Notes / Dispatch Action:
                    </label>
                    <textarea
                      value={actionNotes}
                      onChange={(e) => setActionNotes(e.target.value)}
                      placeholder="Enter verification notes, field team dispatch orders, or perimeter resolution details..."
                      rows={3}
                      className="w-full px-3 py-2 rounded bg-[#090f1b] border border-[#1c2a44] text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-cyan-500"
                    />
                  </div>

                  <div className="pt-2 flex justify-end gap-2">
                    <button
                      onClick={() => setSelectedAlertForAction(null)}
                      className="px-3 py-1.5 rounded bg-[#090f1b] hover:bg-[#111c30] border border-[#1c2a44] text-xs text-slate-300 cursor-pointer"
                    >
                      Cancel
                    </button>

                    {selectedAlertForAction._targetAction === "RESOLVE" ? (
                      <button
                        onClick={() => handleExecuteAlertAction(selectedAlertForAction.id, "RESOLVE")}
                        disabled={actionLoadingId === `alert-${selectedAlertForAction.id}`}
                        className="px-3 py-1.5 rounded bg-teal-600 hover:bg-teal-500 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Confirm Resolution</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleExecuteAlertAction(selectedAlertForAction.id, "ACKNOWLEDGE")}
                        disabled={actionLoadingId === `alert-${selectedAlertForAction.id}`}
                        className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm Acknowledgment</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 3: PROVIDERS & INGESTION MONITORING     */}
        {/* ========================================== */}
        {activeTab === "providers" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#182640] gap-2">
              <div>
                <h2 className="text-xs font-semibold text-white">
                  Provider Status & Ingestion Telemetry
                </h2>
                <p className="text-xs text-slate-400">
                  Real-time status of NASA FIRMS API, OpenStreetMap cadastre, ESA WorldCover, and pipeline throughput.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleTestProvider("NASA_FIRMS")}
                  disabled={testingProvider}
                  className="px-2.5 py-1 rounded bg-[#0f172a] hover:bg-[#15233e] border border-cyan-500/30 text-xs text-cyan-300 flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap className={`w-3.5 h-3.5 ${testingProvider ? "animate-spin text-cyan-400" : "text-cyan-400"}`} />
                  <span>Test FIRMS Connectivity</span>
                </button>
              </div>
            </div>

            {/* Provider Test Result Display */}
            {providerTestResult && (
              <div className="p-3 rounded-lg bg-[#0c1424] border border-cyan-500/40 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-cyan-300">Diagnostic Test Result: {providerTestResult.provider}</span>
                  <button onClick={() => setProviderTestResult(null)} className="text-slate-400 hover:text-white">
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                </div>
                <pre className="p-2 rounded bg-[#070b14] font-mono text-[11px] text-slate-300 overflow-x-auto">
                  {JSON.stringify(providerTestResult.result || providerTestResult, null, 2)}
                </pre>
              </div>
            )}

            {/* Provider Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* NASA FIRMS Provider */}
              <div className="p-4 rounded-lg bg-[#0c1424] border border-[#182640] space-y-3">
                <div className="flex items-center justify-between border-b border-[#182640] pb-2">
                  <div className="flex items-center gap-2">
                    <Satellite className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-xs font-semibold text-white">NASA FIRMS API</h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded font-mono text-[9px] ${
                    isLive ? "bg-emerald-500/20 text-emerald-300" : "bg-teal-500/20 text-teal-300"
                  }`}>
                    {isLive ? "LIVE SATELLITE API" : "DEMO SAMPLE DATA"}
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400">Endpoint:</span>
                    <span className="font-mono text-cyan-300">firms.modaps.eosdis.nasa.gov</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400">Key Security:</span>
                    <span className="font-mono text-emerald-400">
                      {adminConfig?.firms_key_configured ? "Configured Server-Side" : "Demo Mode Only"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400">Supported Satellites:</span>
                    <span className="font-mono text-slate-200">VIIRS (SNPP/NOAA-20), MODIS</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400">Default BBox:</span>
                    <span className="font-mono text-slate-300">68.0, 6.5, 97.5, 37.5 (India)</span>
                  </div>
                </div>
              </div>

              {/* OpenStreetMap PostGIS Provider */}
              <div className="p-4 rounded-lg bg-[#0c1424] border border-[#182640] space-y-3">
                <div className="flex items-center justify-between border-b border-[#182640] pb-2">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-teal-400" />
                    <h3 className="text-xs font-semibold text-white">OpenStreetMap Cadastre</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded font-mono text-[9px] bg-emerald-500/20 text-emerald-300">
                    ONLINE
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400">Infrastructure Layer:</span>
                    <span className="font-mono text-teal-300">Refineries, Power Plants, Mines</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400">Spatial Index:</span>
                    <span className="font-mono text-emerald-400">PostGIS GIST Tree</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400">Industrial POIs Indexed:</span>
                    <span className="font-mono text-slate-200">12 Primary Facilities</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400">Query Mode:</span>
                    <span className="font-mono text-slate-300">Sub-millisecond Spatial Joins</span>
                  </div>
                </div>
              </div>

              {/* ESA WorldCover LandCover Provider */}
              <div className="p-4 rounded-lg bg-[#0c1424] border border-[#182640] space-y-3">
                <div className="flex items-center justify-between border-b border-[#182640] pb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-semibold text-white">ESA WorldCover 10m</h3>
                  </div>
                  <span className="px-2 py-0.5 rounded font-mono text-[9px] bg-emerald-500/20 text-emerald-300">
                    ONLINE
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400">Resolution:</span>
                    <span className="font-mono text-cyan-300">10-meter Ground Resolution</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400">Classifications:</span>
                    <span className="font-mono text-slate-200">Cropland, Forest, Industrial, Built-up</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400">Temporal Coverage:</span>
                    <span className="font-mono text-slate-300">Annual Dynamic Benchmark</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-300">
                    <span className="text-slate-400">Context Engine:</span>
                    <span className="font-mono text-emerald-400">Instant Vector Extraction</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ingestion Pipeline Metrics */}
            <div className="p-4 rounded-lg bg-[#0c1424] border border-[#182640] space-y-3">
              <h3 className="text-xs font-semibold text-white">Ingestion Pipeline Performance</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded bg-[#090f1b] border border-[#152238]">
                  <div className="text-slate-400 text-[11px]">Total Raw Ingested</div>
                  <div className="text-lg font-mono font-bold text-white mt-1">
                    {overviewData?.ingestion_metrics?.total_ingested || 0}
                  </div>
                </div>
                <div className="p-3 rounded bg-[#090f1b] border border-[#152238]">
                  <div className="text-slate-400 text-[11px]">Valid Cleaned Hotspots</div>
                  <div className="text-lg font-mono font-bold text-emerald-400 mt-1">
                    {overviewData?.ingestion_metrics?.valid_hotspots || 0}
                  </div>
                </div>
                <div className="p-3 rounded bg-[#090f1b] border border-[#152238]">
                  <div className="text-slate-400 text-[11px]">Rejected Bad Coordinates</div>
                  <div className="text-lg font-mono font-bold text-slate-400 mt-1">
                    {overviewData?.ingestion_metrics?.rejected_duplicates || 0}
                  </div>
                </div>
                <div className="p-3 rounded bg-[#090f1b] border border-[#152238]">
                  <div className="text-slate-400 text-[11px]">Enriched & Classified</div>
                  <div className="text-lg font-mono font-bold text-cyan-400 mt-1">
                    {overviewData?.ingestion_metrics?.enriched_records || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 4: USER & ROLE ADMINISTRATION          */}
        {/* ========================================== */}
        {activeTab === "users" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#182640] gap-2">
              <div>
                <h2 className="text-xs font-semibold text-white">
                  User Account & Role-Based Clearance Administration
                </h2>
                <p className="text-xs text-slate-400">
                  Manage surveillance personnel, analysts, commanding officers, and role-based permissions.
                </p>
              </div>

              <button
                onClick={() => setShowAddUserModal(true)}
                className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Officer / Analyst</span>
              </button>
            </div>

            {/* Users Table */}
            <div className="overflow-x-auto rounded-lg border border-[#182640] bg-[#0c1424]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#090f1b] text-slate-400 text-[11px] border-b border-[#182640]">
                  <tr>
                    <th className="px-3.5 py-2.5">Personnel</th>
                    <th className="px-3.5 py-2.5">Username / Email</th>
                    <th className="px-3.5 py-2.5">Role & Clearance</th>
                    <th className="px-3.5 py-2.5">Department</th>
                    <th className="px-3.5 py-2.5">Sessions</th>
                    <th className="px-3.5 py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#182640]">
                  {usersList.map((u) => {
                    const isChief = u.role === "CHIEF_SURVEILLANCE_OFFICER" || u.role === "ADMIN" || u.role === "admin";
                    const isAnalystRole = u.role === "ANALYST" || u.role === "SENIOR_GIS_ANALYST";

                    return (
                      <tr key={u.id} className="hover:bg-[#0f1a2e] transition-colors">
                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-[10px]">
                              {u.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-white">{u.name}</div>
                              <div className="text-[10px] text-cyan-400 font-mono">{u.badge_number || "SYS-001"}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-3.5 py-2.5">
                          <div className="text-slate-200 font-mono">{u.username}</div>
                          <div className="text-[10px] text-slate-400">{u.email}</div>
                        </td>

                        <td className="px-3.5 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <select
                              value={u.role}
                              onChange={(e) => handleUpdateRole(u.id, e.target.value)}
                              disabled={actionLoadingId === `user-role-${u.id}`}
                              className="px-2 py-1 rounded bg-[#090f1b] border border-[#1c2a44] text-xs text-slate-200 focus:outline-hidden focus:border-cyan-500 cursor-pointer"
                            >
                              <option value="ADMIN">ADMIN (Level 4 Restricted)</option>
                              <option value="CHIEF_SURVEILLANCE_OFFICER">Chief Surveillance Officer (L4)</option>
                              <option value="SENIOR_GIS_ANALYST">Senior GIS Analyst (L3)</option>
                              <option value="ANALYST">GIS Intelligence Analyst (L2)</option>
                              <option value="FIELD_OPERATIONS_OFFICER">Field Operations Officer (L3)</option>
                            </select>
                          </div>
                        </td>

                        <td className="px-3.5 py-2.5 text-slate-300">
                          {u.department || "Surveillance Command"}
                        </td>

                        <td className="px-3.5 py-2.5 font-mono text-cyan-300">
                          {u.session_count || 0} active
                        </td>

                        <td className="px-3.5 py-2.5 text-right">
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            disabled={actionLoadingId === `delete-${u.id}` || u.username === "admin" || u.username === "ntro.officer"}
                            title={u.username === "admin" ? "Default admin account cannot be deleted" : "Revoke credentials"}
                            className="p-1.5 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors disabled:opacity-30 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Add User Modal */}
            {showAddUserModal && (
              <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="max-w-md w-full rounded-xl bg-[#0c1424] border border-[#1e2f4f] p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-[#182640] pb-2">
                    <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-cyan-400" />
                      <span>Register New Personnel Account</span>
                    </h3>
                    <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-white">
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>

                  <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="e.g. Dr. Rajesh Khanna"
                        required
                        className="w-full px-3 py-1.5 rounded bg-[#090f1b] border border-[#1c2a44] text-white focus:outline-hidden focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Username</label>
                      <input
                        type="text"
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="e.g. rajesh.gis"
                        required
                        className="w-full px-3 py-1.5 rounded bg-[#090f1b] border border-[#1c2a44] text-white focus:outline-hidden focus:border-cyan-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Official Email Address</label>
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="e.g. rajesh@thermoguard.gov.in"
                        required
                        className="w-full px-3 py-1.5 rounded bg-[#090f1b] border border-[#1c2a44] text-white focus:outline-hidden focus:border-cyan-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Initial Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••••••"
                        required
                        className="w-full px-3 py-1.5 rounded bg-[#090f1b] border border-[#1c2a44] text-white focus:outline-hidden focus:border-cyan-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Clearance Role</label>
                      <select
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        className="w-full px-3 py-1.5 rounded bg-[#090f1b] border border-[#1c2a44] text-white focus:outline-hidden focus:border-cyan-500"
                      >
                        <option value="ANALYST">GIS Intelligence Analyst (Level 2)</option>
                        <option value="SENIOR_GIS_ANALYST">Senior GIS Analyst (Level 3)</option>
                        <option value="CHIEF_SURVEILLANCE_OFFICER">Chief Surveillance Officer (Level 4)</option>
                        <option value="FIELD_OPERATIONS_OFFICER">Field Operations Officer (Level 3)</option>
                        <option value="ADMIN">System Administrator (Level 4)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Department / Division</label>
                      <input
                        type="text"
                        value={newDepartment}
                        onChange={(e) => setNewDepartment(e.target.value)}
                        placeholder="e.g. Thermal Satellite Division"
                        className="w-full px-3 py-1.5 rounded bg-[#090f1b] border border-[#1c2a44] text-white focus:outline-hidden focus:border-cyan-500"
                      />
                    </div>

                    <div className="pt-2 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAddUserModal(false)}
                        className="px-3 py-1.5 rounded bg-[#090f1b] hover:bg-[#111c30] border border-[#1c2a44] text-xs text-slate-300 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={actionLoadingId === "create-user"}
                        className="px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Create Account</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 5: ACTIVE SESSIONS & SECURITY          */}
        {/* ========================================== */}
        {activeTab === "sessions" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#182640] gap-2">
              <div>
                <h2 className="text-xs font-semibold text-white">
                  Active Authentication Sessions & Token Invalidation
                </h2>
                <p className="text-xs text-slate-400">
                  Real-time inspection of active JWT tokens, login origin timestamps, and emergency session revocation.
                </p>
              </div>

              <div className="text-xs font-mono text-cyan-300">
                Active Sessions: {sessionsList.length}
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg border border-[#182640] bg-[#0c1424]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#090f1b] text-slate-400 text-[11px] border-b border-[#182640]">
                  <tr>
                    <th className="px-3.5 py-2.5">User Profile</th>
                    <th className="px-3.5 py-2.5">Clearance Level</th>
                    <th className="px-3.5 py-2.5">Token Fingerprint</th>
                    <th className="px-3.5 py-2.5">Login Time</th>
                    <th className="px-3.5 py-2.5">Session Expiry</th>
                    <th className="px-3.5 py-2.5 text-right">Revocation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#182640]">
                  {sessionsList.map((s) => (
                    <tr key={s.token} className="hover:bg-[#0f1a2e] transition-colors">
                      <td className="px-3.5 py-2.5">
                        <div className="font-semibold text-white">{s.name || s.username}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{s.email}</div>
                      </td>

                      <td className="px-3.5 py-2.5">
                        <span className="px-2 py-0.5 rounded font-mono text-[9px] bg-slate-800 text-cyan-300 border border-[#1e2f4f]">
                          {s.role}
                        </span>
                      </td>

                      <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-400">
                        {s.token.substring(0, 16)}...
                      </td>

                      <td className="px-3.5 py-2.5 text-[11px] text-slate-300 font-mono">
                        {new Date(s.created_at).toLocaleString()}
                      </td>

                      <td className="px-3.5 py-2.5 text-[11px] text-slate-400 font-mono">
                        {new Date(s.expires_at).toLocaleString()}
                      </td>

                      <td className="px-3.5 py-2.5 text-right">
                        <button
                          onClick={() => handleRevokeSession(s.token)}
                          disabled={actionLoadingId === `session-${s.token.substring(0, 8)}`}
                          className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ml-auto"
                        >
                          <Power className="w-3 h-3" />
                          <span>Revoke</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ========================================== */}
        {/* TAB 6: SYSTEM PARAMETERS & CONFIG          */}
        {/* ========================================== */}
        {activeTab === "config" && (
          <div className="space-y-4 max-w-2xl">
            <div className="pb-2 border-b border-[#182640]">
              <h2 className="text-xs font-semibold text-white">
                Administrative System Parameters & Thresholds
              </h2>
              <p className="text-xs text-slate-400">
                Configure operational thresholds for Fire Radiative Power (FRP), industrial proximity radius, and auto-sync intervals.
              </p>
            </div>

            <form onSubmit={handleSaveConfig} className="p-4 rounded-lg bg-[#0c1424] border border-[#182640] space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Critical FRP Threshold (MW)
                  </label>
                  <input
                    type="number"
                    value={configForm.critical_frp_threshold ?? 100}
                    onChange={(e) => setConfigForm({ ...configForm, critical_frp_threshold: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 rounded bg-[#090f1b] border border-[#1c2a44] text-white focus:outline-hidden focus:border-cyan-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Surges above this value trigger Critical Tier-3 alert.</p>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    High FRP Threshold (MW)
                  </label>
                  <input
                    type="number"
                    value={configForm.high_frp_threshold ?? 45}
                    onChange={(e) => setConfigForm({ ...configForm, high_frp_threshold: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 rounded bg-[#090f1b] border border-[#1c2a44] text-white focus:outline-hidden focus:border-cyan-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Surges above this trigger High priority dispatch.</p>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Industrial Proximity Radius (Meters)
                  </label>
                  <input
                    type="number"
                    value={configForm.industrial_proximity_radius_m ?? 1000}
                    onChange={(e) => setConfigForm({ ...configForm, industrial_proximity_radius_m: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 rounded bg-[#090f1b] border border-[#1c2a44] text-white focus:outline-hidden focus:border-cyan-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Max spatial distance to associate hotspot with facility.</p>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Minimum FIRMS Confidence Filter (%)
                  </label>
                  <input
                    type="number"
                    value={configForm.min_confidence_filter ?? 50}
                    onChange={(e) => setConfigForm({ ...configForm, min_confidence_filter: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 rounded bg-[#090f1b] border border-[#1c2a44] text-white focus:outline-hidden focus:border-cyan-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Observations below this confidence are filtered out.</p>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    FIRMS Auto-Sync Interval (Minutes)
                  </label>
                  <input
                    type="number"
                    value={configForm.sync_interval_mins ?? 15}
                    onChange={(e) => setConfigForm({ ...configForm, sync_interval_mins: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 rounded bg-[#090f1b] border border-[#1c2a44] text-white focus:outline-hidden focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Default FIRMS Bounding Box (minLon, minLat, maxLon, maxLat)
                  </label>
                  <input
                    type="text"
                    value={configForm.firms_default_bbox ?? "68.0,6.5,97.5,37.5"}
                    onChange={(e) => setConfigForm({ ...configForm, firms_default_bbox: e.target.value })}
                    className="w-full px-3 py-1.5 rounded bg-[#090f1b] border border-[#1c2a44] text-white focus:outline-hidden focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#182640] flex justify-end">
                <button
                  type="submit"
                  disabled={actionLoadingId === "save-config"}
                  className="px-4 py-2 rounded bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Save Configuration</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
};
