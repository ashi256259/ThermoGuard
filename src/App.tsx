import React, { useState } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { MainLayout, NavPage } from "./layouts/MainLayout";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { HotspotExplorerPage } from "./pages/HotspotExplorerPage";
import { SourceDetailsPage } from "./pages/SourceDetailsPage";
import { TimelinePage } from "./pages/TimelinePage";
import { AlertsPage } from "./pages/AlertsPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { HotspotItem } from "./services/api";
import { Satellite, Activity } from "lucide-react";

function AuthenticatedApp() {
  const { isAuthenticated, isLoading } = useAuth();
  const [currentPage, setCurrentPage] = useState<NavPage>("dashboard");
  const [selectedHotspot, setSelectedHotspot] = useState<HotspotItem | null>(null);

  const handleInspectDetails = (hotspot: HotspotItem) => {
    setSelectedHotspot(hotspot);
    setCurrentPage("details");
  };

  const handleOpenTimeline = (hotspot: HotspotItem) => {
    setSelectedHotspot(hotspot);
    setCurrentPage("timeline");
  };

  const handleViewOnMap = (hotspot?: HotspotItem) => {
    if (hotspot) {
      setSelectedHotspot(hotspot);
    }
    setCurrentPage("dashboard");
  };

  // Initial Auth Loading Screen
  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#070b14] flex flex-col items-center justify-center text-slate-100 font-sans">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-xl bg-[#0f172a] border border-[#1e293b] flex items-center justify-center text-cyan-400 shadow-xl shadow-cyan-950/40">
              <Satellite className="w-6 h-6 animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-teal-400 border-2 border-[#070b14] flex items-center justify-center">
              <Activity className="w-2.5 h-2.5 text-black animate-spin" />
            </div>
          </div>
          <div className="text-center">
            <h2 className="text-sm font-semibold tracking-tight text-white">ThermoGuard AI</h2>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Verifying satellite intelligence clearance & security tokens...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Unauthenticated -> Show Login Page
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  // Authenticated -> Show Protected Surveillance Console
  return (
    <MainLayout currentPage={currentPage} onSelectPage={setCurrentPage}>
      {currentPage === "dashboard" && (
        <DashboardPage
          selectedHotspotProp={selectedHotspot}
          onSelectHotspot={setSelectedHotspot}
          onInspectDetails={handleInspectDetails}
          onOpenTimeline={handleOpenTimeline}
        />
      )}

      {currentPage === "explorer" && (
        <HotspotExplorerPage
          onSelectHotspot={handleInspectDetails}
          onViewOnMap={handleViewOnMap}
          onOpenTimeline={handleOpenTimeline}
        />
      )}

      {currentPage === "details" && (
        <SourceDetailsPage
          hotspot={selectedHotspot}
          onSelectHotspot={setSelectedHotspot}
          onOpenTimeline={handleOpenTimeline}
          onReturnToMap={() => handleViewOnMap(selectedHotspot || undefined)}
        />
      )}

      {currentPage === "timeline" && (
        <TimelinePage
          selectedHotspot={selectedHotspot}
          onSelectHotspot={setSelectedHotspot}
          onInspectDetails={handleInspectDetails}
          onReturnToMap={() => handleViewOnMap(selectedHotspot || undefined)}
        />
      )}

      {currentPage === "alerts" && (
        <AlertsPage
          onSelectHotspot={handleInspectDetails}
          onViewOnMap={handleViewOnMap}
          onOpenTimeline={handleOpenTimeline}
        />
      )}

      {currentPage === "analytics" && (
        <AnalyticsPage
          onNavigate={(page) => setCurrentPage(page)}
          onViewOnMap={() => handleViewOnMap()}
        />
      )}

      {currentPage === "admin" && (
        <AdminDashboardPage
          onSelectHotspot={handleInspectDetails}
          onViewOnMap={handleViewOnMap}
          onOpenTimeline={handleOpenTimeline}
        />
      )}
    </MainLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}
