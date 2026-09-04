import React, { useState, useEffect } from "react";
import {
  Radio,
  Compass,
  FileSearch,
  History,
  BellRing,
  BarChart3,
  Wifi,
  WifiOff,
  RefreshCw,
  Clock,
  Satellite,
  LogOut,
  UserCheck,
  ShieldAlert
} from "lucide-react";
import { useHealthStatus } from "../hooks/useHealthStatus";
import { useAuth } from "../context/AuthContext";
import { APP_CONFIG } from "../config/constants";

export type NavPage =
  | "dashboard"
  | "explorer"
  | "details"
  | "timeline"
  | "alerts"
  | "analytics"
  | "admin";

interface MainLayoutProps {
  currentPage: NavPage;
  onSelectPage: (page: NavPage) => void;
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({
  currentPage,
  onSelectPage,
  children
}) => {
  const { user, logout, canAccessAdminDashboard, isAdmin } = useAuth();
  const { connectionState, healthData, errorMessage, refresh } = useHealthStatus();
  const [utcTime, setUtcTime] = useState<string>("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().replace("GMT", "UTC"));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navItems: Array<{ id: NavPage; label: string; icon: React.ReactNode; adminOnly?: boolean }> = [
    {
      id: "dashboard",
      label: "Surveillance Map",
      icon: <Radio className="w-4 h-4" />
    },
    {
      id: "explorer",
      label: "Hotspot Catalog",
      icon: <Compass className="w-4 h-4" />
    },
    {
      id: "details",
      label: "Source Telemetry",
      icon: <FileSearch className="w-4 h-4" />
    },
    {
      id: "timeline",
      label: "Temporal Analysis",
      icon: <History className="w-4 h-4" />
    },
    {
      id: "alerts",
      label: "Incident Alerts",
      icon: <BellRing className="w-4 h-4" />
    },
    {
      id: "analytics",
      label: "Analytics & ML",
      icon: <BarChart3 className="w-4 h-4" />
    },
    ...(canAccessAdminDashboard || isAdmin
      ? [
          {
            id: "admin" as NavPage,
            label: "Admin Command",
            icon: <ShieldAlert className="w-4 h-4" />,
            adminOnly: true
          }
        ]
      : [])
  ];

  const getPageTitle = (page: NavPage): string => {
    switch (page) {
      case "dashboard":
        return "Thermal Source Intelligence";
      case "explorer":
        return "Hotspot Observation Catalog";
      case "details":
        return "Source Telemetry & Forensic Audit";
      case "timeline":
        return "Temporal Persistence & Revisit Analysis";
      case "alerts":
        return "Incident Alert Center";
      case "analytics":
        return "Geospatial & Machine Learning Analytics";
      case "admin":
        return "Command Authority & Administration Console";
      default:
        return "Thermal Source Intelligence";
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#070b14] text-slate-100 font-sans select-none antialiased">
      {/* 1. OPERATIONS SIDEBAR */}
      <aside className="w-60 flex-shrink-0 flex flex-col border-r border-[#152033] bg-[#090e1a] z-30">
        {/* Brand Header */}
        <div className="px-3.5 py-3 border-b border-[#141d2e]">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded bg-[#0f172a] border border-[#1e293b] text-cyan-400">
              <Satellite className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold tracking-tight text-white text-xs">ThermoGuard AI</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">
                Detect • Classify • Protect
              </p>
            </div>
          </div>

          {/* Project & Operational Identity */}
          <div className="mt-2.5 pt-2 border-t border-[#141d2e] flex items-center justify-between text-[10px] text-slate-400">
            <span>SIH26162 • NTRO</span>
            <span className="font-mono text-slate-300">v0.1</span>
          </div>
        </div>

        {/* Operational Navigation List */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          <div className="px-2 pb-1.5 text-[9px] tracking-wider text-slate-500 uppercase font-medium">
            Operational Views
          </div>

          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                id={`nav-btn-${item.id}`}
                onClick={() => onSelectPage(item.id)}
                className={`w-full text-left flex items-center justify-between px-2.5 py-1.5 rounded text-xs transition-colors cursor-pointer ${
                  isActive
                    ? "bg-[#111c30] text-cyan-300 font-medium border-l-2 border-cyan-400"
                    : "text-slate-400 hover:text-slate-200 hover:bg-[#0c1322] border-l-2 border-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={isActive ? "text-cyan-400" : "text-slate-500"}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </div>
                {item.adminOnly && (
                  <span className="px-1.5 py-0.2 rounded font-mono text-[8px] bg-rose-500/10 text-rose-300 border border-rose-500/30">
                    L4
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Active Officer Identity Card */}
        {user && (
          <div className="mx-2 mb-2 p-2.5 rounded-lg bg-[#0c1424] border border-[#182640] text-xs">
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-[10px] flex-shrink-0">
                  {user.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-white truncate leading-tight">
                    {user.name}
                  </div>
                  <div className="text-[9px] text-cyan-400 font-mono truncate leading-tight">
                    {user.badge_number || "NTRO-AUTH"}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowLogoutConfirm(true)}
                title="Sign Out Session"
                className="p-1 rounded hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition-colors cursor-pointer flex-shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="mt-2 pt-1.5 border-t border-[#141f33] flex items-center justify-between text-[9px]">
              <span className="text-slate-400 truncate max-w-[100px]">{user.role.replace(/_/g, " ")}</span>
              <span className={`px-1.5 py-0.2 rounded font-mono text-[8px] border ${
                user.clearance_level === "LEVEL_4_RESTRICTED"
                  ? "bg-rose-500/10 text-rose-300 border-rose-500/30"
                  : user.clearance_level === "LEVEL_3_CONFIDENTIAL"
                  ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                  : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
              }`}>
                {user.clearance_level === "LEVEL_4_RESTRICTED"
                  ? "L4 COMMAND"
                  : user.clearance_level === "LEVEL_3_CONFIDENTIAL"
                  ? "L3 CONFIDENTIAL"
                  : "L2 ANALYST"}
              </span>
            </div>
          </div>
        )}

        {/* Provider Engine Status - Compact */}
        <div className="px-3 py-2 mx-2 mb-2 rounded bg-[#0a101d] border border-[#141e30] text-[10px] space-y-1">
          <div className="flex items-center justify-between text-slate-300 font-medium">
            <span>Data Engine</span>
            <span className={healthData?.data_provider_mode === "LIVE_SATELLITE_API" ? "text-emerald-400 font-mono" : "text-teal-400 font-mono"}>
              {healthData?.data_provider_mode === "LIVE_SATELLITE_API" ? "NASA Live" : "Demo Mode"}
            </span>
          </div>
          <div className="space-y-0.5 text-slate-400 font-mono text-[9px]">
            <div className="flex justify-between">
              <span>FIRMS:</span>
              <span className={healthData?.data_provider_mode === "LIVE_SATELLITE_API" ? "text-emerald-300" : "text-slate-300"}>
                {healthData?.data_provider_mode === "LIVE_SATELLITE_API" ? "VIIRS NRT Live" : "Calibrated Feed"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Cadastre:</span>
              <span className="text-slate-300">OpenStreetMap</span>
            </div>
          </div>
        </div>

        {/* System Health Status */}
        <div className="px-3 py-2 border-t border-[#141d2e] bg-[#070b14] text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {connectionState === "connected" && (
                <div className="flex items-center gap-1.5 text-slate-300 text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>Backend Nominal</span>
                </div>
              )}
              {connectionState === "loading" && (
                <div className="flex items-center gap-1.5 text-amber-400 text-[10px]">
                  <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                  <span>Connecting...</span>
                </div>
              )}
              {connectionState === "error" && (
                <div className="flex items-center gap-1.5 text-rose-400 text-[10px]">
                  <WifiOff className="w-2.5 h-2.5" />
                  <span>Offline</span>
                </div>
              )}
            </div>

            <button
              onClick={() => refresh()}
              title="Refresh Health Status"
              className="p-1 rounded hover:bg-[#121c33] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-12 border-b border-[#152033] bg-[#090e1a] px-5 flex items-center justify-between flex-shrink-0 z-20">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-semibold text-white tracking-tight">
              {getPageTitle(currentPage)}
            </h1>
          </div>

          {/* Secondary Telemetry Information */}
          <div className="flex items-center gap-3 text-xs text-slate-400">
            {/* Classifier model info */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0e1628] border border-[#17233c] text-[11px]">
              <span className="text-slate-400">Classifier:</span>
              <span className="text-slate-200 font-medium">Random Forest</span>
            </div>

            {/* Data Source status */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0e1628] border border-[#17233c] text-[11px] text-slate-300">
              <span className={`w-1.5 h-1.5 rounded-full ${healthData?.data_provider_mode === "LIVE_SATELLITE_API" ? "bg-emerald-400 animate-pulse" : "bg-teal-400"}`} />
              <span>{healthData?.data_provider_mode === "LIVE_SATELLITE_API" ? "NASA Live VIIRS" : "Demo Data"}</span>
            </div>

            {/* UTC Clock */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0e1628] border border-[#17233c] text-slate-400 font-mono text-[11px]">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>{utcTime || "UTC"}</span>
            </div>

            {/* Officer Quick Logout in Header */}
            {user && (
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0e1628] hover:bg-rose-500/10 border border-[#17233c] hover:border-rose-500/30 text-slate-300 hover:text-rose-300 text-[11px] transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden md:inline">Sign Out</span>
              </button>
            )}
          </div>
        </header>

        {/* Page Content Surface */}
        <main className="flex-1 overflow-hidden relative bg-[#070b14]">
          {children}
        </main>
      </div>

      {/* Logout Confirmation Dialog */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-xl bg-[#0a101d] border border-[#1e2a42] p-5 shadow-2xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <LogOut className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Sign Out of Session</h3>
                <p className="text-xs text-slate-400">NTRO Geospatial Intelligence Wing</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to end your active surveillance session? Your access token will be invalidated.
            </p>

            <div className="mt-4 pt-3 border-t border-[#162238] flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-[#0f172a] hover:bg-[#152038] border border-[#1e293b] text-xs text-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  logout();
                }}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-xs text-white font-medium shadow-md shadow-rose-950/40 transition-colors cursor-pointer"
              >
                Confirm Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
