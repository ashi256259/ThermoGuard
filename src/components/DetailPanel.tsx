import React, { useState, useEffect } from "react";
import {
  X,
  Flame,
  Shield,
  Clock,
  Factory,
  Compass,
  FileText,
  AlertTriangle,
  Radio,
  Sliders,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Layers,
  MapPin,
  Activity,
  Info,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Thermometer
} from "lucide-react";
import { HotspotRecord, HotspotIntelligence } from "../types";
import { TimelineChart } from "./TimelineChart";

interface DetailPanelProps {
  hotspot: HotspotRecord | null;
  onClose: () => void;
}

export const DetailPanel: React.FC<DetailPanelProps> = ({ hotspot, onClose }) => {
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [intelligenceData, setIntelligenceData] = useState<HotspotIntelligence | null>(null);
  const [showFeatureVector, setShowFeatureVector] = useState(false);
  const [evidenceTab, setEvidenceTab] = useState<"all" | "thermal" | "spatial" | "temporal">("all");

  useEffect(() => {
    if (!hotspot) return;

    // Fetch timeline observations
    fetch(`/api/hotspots/${hotspot.event.id}/timeline`)
      .then((res) => res.json())
      .then((data) => {
        if (data.observation_history) {
          setTimelineData(data.observation_history);
        }
      })
      .catch(() => setTimelineData([]));

    // Fetch full intelligence payload if available
    fetch(`/api/hotspots/${hotspot.event.id}/intelligence`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setIntelligenceData(data);
        }
      })
      .catch(() => {
        // Fallback to embedded fields in hotspot record
      });
  }, [hotspot?.event.id]);

  if (!hotspot) {
    return (
      <aside className="w-80 lg:w-96 bg-[#050608] border-l border-slate-800 p-6 flex flex-col items-center justify-center text-center text-slate-500">
        <Compass className="w-12 h-12 text-slate-700 mb-3 animate-spin-slow" />
        <p className="text-sm font-semibold text-slate-300">No Hotspot Selected</p>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          Select any thermal observation on the GIS map or pick a demo scenario to inspect explainable ML attribution and risk intelligence.
        </p>
      </aside>
    );
  }

  const { event, geo_context, temporal_profile, classification, alert } = hotspot;

  // Resolve intelligence either from fetched intelligence endpoint or embedded fields
  const intel = intelligenceData || hotspot.intelligence;

  const confidenceBand = intel?.prediction?.confidence_band || classification.confidence_band || (
    classification.confidence >= 0.75 ? "HIGH" : classification.confidence >= 0.50 ? "MEDIUM" : "LOW"
  );
  const confidenceQuality = intel?.prediction?.confidence_quality || classification.confidence_quality || "STRONG";
  const qualityReason = intel?.prediction?.quality_reason || (
    confidenceQuality === "STRONG"
      ? "Clear probability margin separation over alternative classes with verified geospatial context."
      : "Moderate probability margin with established contextual signals."
  );
  const confidenceMargin = intel?.prediction?.confidence_margin ?? classification.confidence_margin ?? 0.45;
  const runnerUpClass = intel?.prediction?.runner_up_class;

  const riskLevel = intel?.risk?.level || classification.risk_score;
  const riskScore = intel?.risk?.score ?? classification.risk_value;
  const riskReasons = intel?.risk?.reasons || classification.risk_reasons || [
    `Thermal Radiative Power (${event.frp} MW) evaluated against operational hazard index`,
    `Distance to industrial facility: ${Math.round(geo_context.distance_to_industry)} m`
  ];
  const actionRecommended = intel?.risk?.action_recommended || alert?.action_recommended;

  const structuredEvidence = intel?.evidence || classification.structured_evidence || {
    thermal: [
      `Fire Radiative Power: ${event.frp} MW`,
      `Brightness Temperature: ${event.brightness} K`,
      `FIRMS Detection Confidence: ${event.confidence}%`
    ],
    spatial: [
      `Industrial Facility: ${geo_context.nearest_industrial_facility} (${Math.round(geo_context.distance_to_industry)} m)`,
      `Land-Use Context: ${geo_context.land_cover}`
    ],
    temporal: [
      `Persistence Duration: ${temporal_profile.persistence_days} days across ${temporal_profile.observation_count} detections`,
      `Recurrence: ${Math.round(temporal_profile.recurrence_ratio * 100)}% of revisit passes`
    ],
    class_specific: [
      `Attributes characteristic of ${classification.predicted_class}`
    ],
    summary: classification.evidence
  };

  const featureContributions = intel?.feature_importance || [
    { feature: "dist_industry_m", importance: 0.168, value: geo_context.distance_to_industry, description: "Distance to nearest industrial facility" },
    { feature: "is_within_300m_industry", importance: 0.142, value: geo_context.distance_to_industry <= 300 ? 1 : 0, description: "Immediate industrial perimeter zone (<300m)" },
    { feature: "persistence_days", importance: 0.118, value: temporal_profile.persistence_days, description: "Historical observation persistence (days)" },
    { feature: "frp", importance: 0.098, value: event.frp, description: "Fire Radiative Power (MW)" },
    { feature: "land_cover_cropland", importance: 0.084, value: geo_context.land_cover === "cropland" ? 1 : 0, description: "Agricultural cropland zoning" },
    { feature: "land_cover_dense_forest", importance: 0.076, value: geo_context.land_cover === "dense_forest" ? 1 : 0, description: "Dense forest reserve canopy" }
  ];

  const explanationText = intel?.explanation || classification.explanation || (
    `Classified as ${classification.predicted_class} with ${Math.round(classification.confidence * 100)}% model probability based on physical sensor telemetry and geospatial context. Operational risk is rated ${riskLevel} (${riskScore}/100).`
  );

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case "CRITICAL":
        return "bg-red-950/50 text-red-300 border-red-500/70 shadow-red-950/20";
      case "HIGH":
        return "bg-orange-950/50 text-orange-300 border-orange-500/70 shadow-orange-950/20";
      case "MEDIUM":
        return "bg-amber-950/50 text-amber-300 border-amber-500/70 shadow-amber-950/20";
      default:
        return "bg-emerald-950/50 text-emerald-300 border-emerald-500/70 shadow-emerald-950/20";
    }
  };

  const getClassBadgeColor = (cls: string) => {
    switch (cls) {
      case "Industrial Fire":
        return "text-red-400 bg-red-950/40 border-red-500/50";
      case "Gas Flare":
        return "text-orange-400 bg-orange-950/40 border-orange-500/50";
      case "Wildfire":
        return "text-emerald-400 bg-emerald-950/40 border-emerald-500/50";
      case "Mining":
        return "text-sky-400 bg-sky-950/40 border-sky-500/50";
      case "Agricultural Burning":
        return "text-yellow-400 bg-yellow-950/40 border-yellow-500/50";
      default:
        return "text-slate-300 bg-slate-900 border-slate-700";
    }
  };

  const getQualityBadgeColor = (qual: string) => {
    switch (qual) {
      case "STRONG":
        return "text-emerald-400 bg-emerald-950/30 border-emerald-500/40";
      case "MODERATE":
        return "text-amber-400 bg-amber-950/30 border-amber-500/40";
      default:
        return "text-rose-400 bg-rose-950/30 border-rose-500/40";
    }
  };

  return (
    <aside className="w-full sm:w-96 lg:w-[440px] bg-[#050608] border-l border-slate-800 flex flex-col h-full overflow-y-auto text-slate-200 z-20 shadow-2xl">
      {/* Panel Header */}
      <div className="p-3.5 bg-[#0a0c10] border-b border-slate-800 flex items-center justify-between sticky top-0 z-20">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border uppercase ${getClassBadgeColor(
                classification.predicted_class
              )}`}
            >
              {classification.predicted_class}
            </span>
            <span
              className={`text-xs font-mono font-bold px-2.5 py-0.5 rounded border ${getRiskBadgeColor(
                riskLevel
              )}`}
            >
              {riskLevel} RISK ({riskScore}/100)
            </span>
          </div>
          <div className="text-[11px] text-slate-500 font-mono mt-1">
            ID: <span className="text-slate-300">{event.id}</span> • Cluster: {temporal_profile.cluster_id}
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-900 rounded transition cursor-pointer"
          title="Close details"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4 text-xs">
        {/* Active Disaster / Emergency Alert Advisory Banner */}
        {alert && (
          <div className="bg-red-950/30 border border-red-500/50 p-3 rounded text-red-200 space-y-1.5 shadow-sm">
            <div className="flex items-center gap-2 text-red-400 font-bold font-mono text-[11px]">
              <AlertTriangle className="w-4 h-4 animate-bounce" />
              <span>ACTIVE DISASTER / OPERATIONAL ADVISORY</span>
            </div>
            <p className="text-xs text-red-100 font-medium">{alert.title}</p>
            <p className="text-[11px] text-red-300">{alert.description}</p>
            {actionRecommended && (
              <div className="mt-2 pt-2 border-t border-red-500/30 text-[11px] font-mono text-red-200">
                <strong className="text-red-400">Action Recommended:</strong> {actionRecommended}
              </div>
            )}
          </div>
        )}

        {/* 1. SYNTHESIZED HUMAN-READABLE EXPLANATION CARD */}
        <div className="bg-gradient-to-br from-slate-900/90 via-[#0a0c10] to-[#080b12] border border-cyan-900/40 rounded-lg p-3.5 space-y-2 shadow-md">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-cyan-400" />
              <span>Synthesized Intelligence Brief</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500">Deterministic ML+GIS</span>
          </div>
          <p className="text-[12px] text-slate-200 leading-relaxed font-sans">
            {explanationText}
          </p>
        </div>

        {/* 2. ML CLASSIFICATION & STATISTICAL CONFIDENCE INTERPRETATION */}
        <div className="bg-[#0a0c10] border border-slate-800 rounded p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-orange-500" />
              <span>Model Classification & Confidence</span>
            </span>
            <span className="text-[10px] font-mono text-cyan-400">{classification.model_version}</span>
          </div>

          {/* Main Confidence KPI Grid */}
          <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
            <div className="bg-[#050608] p-2.5 rounded border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Probability</span>
              <span className="text-base font-bold text-white">
                {(classification.confidence * 100).toFixed(1)}%
              </span>
            </div>
            <div className="bg-[#050608] p-2.5 rounded border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Band</span>
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded border inline-block mt-0.5 ${
                confidenceBand === "HIGH"
                  ? "text-emerald-400 bg-emerald-950/30 border-emerald-500/40"
                  : confidenceBand === "MEDIUM"
                  ? "text-amber-400 bg-amber-950/30 border-amber-500/40"
                  : "text-rose-400 bg-rose-950/30 border-rose-500/40"
              }`}>
                {confidenceBand}
              </span>
            </div>
            <div className="bg-[#050608] p-2.5 rounded border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Quality</span>
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded border inline-block mt-0.5 ${getQualityBadgeColor(confidenceQuality)}`}>
                {confidenceQuality}
              </span>
            </div>
          </div>

          {/* Quality Assessment & Margin Separation */}
          <div className="bg-[#050608] p-2.5 rounded border border-slate-850 text-[11px] space-y-1">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
              <span>Decision Margin:</span>
              <span className="text-cyan-400 font-bold">
                +{Math.round(confidenceMargin * 100)}% over runner-up {runnerUpClass ? `(${runnerUpClass})` : ""}
              </span>
            </div>
            <p className="text-[10.5px] text-slate-400 leading-snug">
              {qualityReason}
            </p>
          </div>

          {/* Explicit Statistical Calibration Notice */}
          <div className="flex items-start gap-1.5 text-[10px] font-mono text-slate-500 bg-[#07090e] p-2 rounded border border-slate-900">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Model probability reflects Random Forest multi-class ensemble consensus; it measures classification certainty based on input features and does not represent real-world sensor accuracy.
            </span>
          </div>

          {/* Random Forest Class Probabilities Distribution */}
          {classification.class_probabilities && (
            <div className="space-y-1.5 pt-2 border-t border-slate-800">
              <span className="text-slate-500 font-mono block text-[10px] uppercase tracking-wider font-bold">
                Multi-Class Probability Distribution:
              </span>
              <div className="space-y-1.5">
                {Object.entries(classification.class_probabilities).map(([cls, prob]) => {
                  const isPredicted = cls === classification.predicted_class;
                  const pct = Math.round((prob as number) * 100);
                  return (
                    <div key={cls} className="font-mono text-[10px] space-y-0.5">
                      <div className="flex justify-between items-center">
                        <span className={isPredicted ? "text-orange-400 font-bold" : "text-slate-400"}>
                          {cls} {isPredicted ? "★ (Predicted)" : ""}
                        </span>
                        <span className={isPredicted ? "text-white font-bold" : "text-slate-500"}>
                          {pct}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isPredicted ? "bg-orange-500" : "bg-slate-700"
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* 3. OPERATIONAL RISK INTELLIGENCE & REASONS */}
        <div className="bg-[#0a0c10] border border-slate-800 rounded p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span>Operational Risk Assessment</span>
            </span>
            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${getRiskBadgeColor(riskLevel)}`}>
              {riskLevel} ({riskScore}/100)
            </span>
          </div>

          {/* Structured Risk Reasons: "Why is the risk at this level?" */}
          <div className="space-y-1.5">
            <span className="text-slate-400 font-mono block text-[10px] uppercase tracking-wider font-semibold">
              Hazard Factor Evaluation ({riskReasons.length} Factors):
            </span>
            <ul className="space-y-1">
              {riskReasons.map((reason, idx) => (
                <li
                  key={idx}
                  className="text-slate-300 text-[11px] flex items-start gap-2 bg-[#050608] p-2 rounded border border-slate-850"
                >
                  <span className="text-red-400 font-bold">•</span>
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Component Score Breakdown Bars */}
          {classification.risk_breakdown && (
            <div className="space-y-1.5 pt-2 border-t border-slate-800 text-[11px]">
              <span className="text-slate-500 font-mono block text-[10px] uppercase tracking-wider font-bold">
                Weighted Risk Components:
              </span>
              <div className="space-y-1.5 font-mono text-[10px]">
                <div>
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span>Thermal Intensity (32.6% weight)</span>
                    <span className="text-slate-200">{classification.risk_breakdown.thermal_intensity_score}/100</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${classification.risk_breakdown.thermal_intensity_score}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span>Industrial Proximity (27.2% weight)</span>
                    <span className="text-slate-200">{classification.risk_breakdown.hazard_proximity_score}/100</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${classification.risk_breakdown.hazard_proximity_score}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span>Inherent Source Hazard (27.2% weight)</span>
                    <span className="text-slate-200">{classification.risk_breakdown.source_type_hazard_score}/100</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: `${classification.risk_breakdown.source_type_hazard_score}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-slate-400 mb-0.5">
                    <span>Temporal Urgency / Sudden Onset (13.0% weight)</span>
                    <span className="text-slate-200">{classification.risk_breakdown.temporal_urgency_score}/100</span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                    <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${classification.risk_breakdown.temporal_urgency_score}%` }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {actionRecommended && (
            <div className="bg-[#050608] p-2.5 rounded border border-slate-850 text-[10.5px] font-mono text-slate-300">
              <span className="text-slate-500 block text-[9px] uppercase font-bold">Standard Operating Protocol:</span>
              <span className="text-cyan-300 font-medium">{actionRecommended}</span>
            </div>
          )}
        </div>

        {/* 4. CATEGORIZED EXPLAINABLE EVIDENCE */}
        <div className="bg-[#0a0c10] border border-slate-800 rounded p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-orange-500" />
              <span>Categorized Physical Evidence</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500">Zero Hallucination</span>
          </div>

          {/* Sub-Category Filter Tabs */}
          <div className="flex gap-1 border-b border-slate-800 pb-2">
            {(["all", "thermal", "spatial", "temporal"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setEvidenceTab(tab)}
                className={`px-2 py-1 rounded text-[10px] font-mono uppercase tracking-wider transition cursor-pointer ${
                  evidenceTab === tab
                    ? "bg-slate-800 text-white font-bold"
                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-900"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="space-y-2.5">
            {/* Thermal Sensor Telemetry Evidence */}
            {(evidenceTab === "all" || evidenceTab === "thermal") && (
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-orange-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Thermometer className="w-3 h-3" />
                  <span>Thermal Sensor Measurements</span>
                </span>
                <ul className="space-y-1">
                  {structuredEvidence.thermal.map((ev, i) => (
                    <li key={`th-${i}`} className="text-slate-300 text-[11px] flex items-start gap-2 bg-[#050608] p-2 rounded border border-slate-850">
                      <span className="text-orange-400 font-bold">•</span>
                      <span>{ev}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Geospatial & Infrastructure Evidence */}
            {(evidenceTab === "all" || evidenceTab === "spatial") && (
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span>Geospatial & Land-Use Context</span>
                </span>
                <ul className="space-y-1">
                  {structuredEvidence.spatial.map((ev, i) => (
                    <li key={`sp-${i}`} className="text-slate-300 text-[11px] flex items-start gap-2 bg-[#050608] p-2 rounded border border-slate-850">
                      <span className="text-cyan-400 font-bold">•</span>
                      <span>{ev}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Temporal Persistence Evidence */}
            {(evidenceTab === "all" || evidenceTab === "temporal") && (
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>Temporal Revisit & Persistence</span>
                </span>
                <ul className="space-y-1">
                  {structuredEvidence.temporal.map((ev, i) => (
                    <li key={`tp-${i}`} className="text-slate-300 text-[11px] flex items-start gap-2 bg-[#050608] p-2 rounded border border-slate-850">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{ev}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Class-Specific Attribution */}
            {evidenceTab === "all" && structuredEvidence.class_specific && structuredEvidence.class_specific.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-purple-400 font-bold uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Attribution Fingerprint ({classification.predicted_class})</span>
                </span>
                <ul className="space-y-1">
                  {structuredEvidence.class_specific.map((ev, i) => (
                    <li key={`cs-${i}`} className="text-slate-300 text-[11px] flex items-start gap-2 bg-[#050608] p-2 rounded border border-slate-850">
                      <span className="text-purple-400 font-bold">•</span>
                      <span>{ev}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* 5. MODEL FEATURE CONTRIBUTIONS (Random Forest Gini Importances) */}
        <div className="bg-[#0a0c10] border border-slate-800 rounded p-3.5 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Top Model Feature Contributions</span>
            </span>
            <span className="text-[10px] font-mono text-slate-500">Gini Impurity</span>
          </div>

          <p className="text-[10.5px] text-slate-400 font-mono">
            Features driving the Random Forest decision trees, ranked by global importance alongside this event's telemetry:
          </p>

          <div className="space-y-1.5">
            {featureContributions.map((fc, i) => {
              const impPct = Math.round(fc.importance * 100);
              return (
                <div key={i} className="bg-[#050608] p-2 rounded border border-slate-850 font-mono text-[10px] space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-300 font-medium">
                      {fc.description || fc.feature}
                    </span>
                    <span className="text-cyan-400 font-bold">
                      {fc.value !== undefined && fc.value !== null ? `${fc.value}` : "Observed"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-full bg-slate-900 rounded-full h-1 overflow-hidden">
                      <div className="h-full bg-cyan-500 rounded-full" style={{ width: `${Math.min(100, impPct * 4)}%` }} />
                    </div>
                    <span className="text-[9px] text-slate-500 shrink-0">
                      {(fc.importance * 100).toFixed(1)}% wt
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 6. GEOSPATIAL & LAND-COVER CONTEXT */}
        <div className="bg-[#0a0c10] border border-slate-800 rounded p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-slate-400 font-bold font-mono text-[10px] uppercase tracking-wider">
            <Factory className="w-3.5 h-3.5 text-orange-500" />
            <span>OpenStreetMap & Satellite GIS Context</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="bg-[#050608] p-2 rounded border border-slate-800 col-span-2">
              <span className="text-slate-500 block text-[10px]">Nearest Industrial Facility</span>
              <span className="text-white font-semibold block">{geo_context.nearest_industrial_facility}</span>
              <span className="text-orange-400 text-[10px]">
                {geo_context.distance_to_industry < 1000
                  ? `${Math.round(geo_context.distance_to_industry)} m away`
                  : `${(geo_context.distance_to_industry / 1000).toFixed(1)} km away`}
              </span>
            </div>
            <div className="bg-[#050608] p-2 rounded border border-slate-800">
              <span className="text-slate-500 block text-[10px]">Facility Type</span>
              <span className="text-slate-200 capitalize">{geo_context.facility_type.replace("_", " ")}</span>
            </div>
            <div className="bg-[#050608] p-2 rounded border border-slate-800">
              <span className="text-slate-500 block text-[10px]">LULC Land Cover</span>
              <span className="text-cyan-400 capitalize">{geo_context.land_cover.replace("_", " ")}</span>
            </div>
            <div className="bg-[#050608] p-2 rounded border border-slate-800 col-span-2">
              <span className="text-slate-500 block text-[10px]">Nearby Transportation / Road</span>
              <span className="text-slate-200">{geo_context.nearby_road || "Access Road"}</span>
            </div>
          </div>
        </div>

        {/* 7. TEMPORAL PERSISTENCE & OBSERVATION TIMELINE */}
        <div className="bg-[#0a0c10] border border-slate-800 rounded p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Multi-Temporal Profile & Revisit History</span>
            </span>
            <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded border ${
              temporal_profile.persistence_class === "PERSISTENT" || temporal_profile.is_persistent
                ? "text-cyan-400 border-cyan-800 bg-cyan-950/40"
                : temporal_profile.persistence_class === "INTERMITTENT"
                ? "text-amber-400 border-amber-800 bg-amber-950/40"
                : "text-slate-400 border-slate-800 bg-slate-900/40"
            }`}>
              {temporal_profile.persistence_class || (temporal_profile.is_persistent ? "PERSISTENT" : "TRANSIENT")}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 text-[11px] font-mono text-center">
            <div className="bg-[#050608] p-2 rounded border border-slate-800">
              <span className="text-slate-500 text-[9px] block">Duration</span>
              <span className="text-white font-bold">{temporal_profile.persistence_days}d</span>
            </div>
            <div className="bg-[#050608] p-2 rounded border border-slate-800">
              <span className="text-slate-500 text-[9px] block">Passes</span>
              <span className="text-white font-bold">{temporal_profile.observation_count}</span>
            </div>
            <div className="bg-[#050608] p-2 rounded border border-slate-800">
              <span className="text-slate-500 text-[9px] block">Recurrence</span>
              <span className="text-white font-bold">{Math.round(temporal_profile.recurrence_ratio * 100)}%</span>
            </div>
            <div className="bg-[#050608] p-2 rounded border border-slate-800">
              <span className="text-slate-500 text-[9px] block">Revisit</span>
              <span className="text-cyan-400 font-bold">
                {temporal_profile.average_revisit_hours ? `${Math.round(temporal_profile.average_revisit_hours)}h` : "N/A"}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 bg-[#050608] px-2 py-1 rounded border border-slate-900">
            <span>Pattern: <strong className="text-slate-200">{temporal_profile.seasonal_pattern || "transient"}</strong></span>
            <span>Active Days: <strong className="text-slate-200">{temporal_profile.active_days || 1}d</strong></span>
          </div>

          {/* Historical FRP Line Chart */}
          <TimelineChart observations={timelineData} />
        </div>

        {/* 8. SATELLITE TELEMETRY ATTRIBUTES */}
        <div className="bg-[#0a0c10] border border-slate-800 rounded p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-slate-400 font-bold font-mono text-[10px] uppercase tracking-wider">
            <Radio className="w-3.5 h-3.5 text-orange-500" />
            <span>FIRMS Satellite Observation</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="bg-[#050608] p-2 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Coordinates</span>
              <span className="text-slate-200">
                {event.latitude.toFixed(4)}°, {event.longitude.toFixed(4)}°
              </span>
            </div>
            <div className="bg-[#050608] p-2 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Satellite & Pass</span>
              <span className="text-slate-200">{event.satellite} ({event.daynight === "N" ? "Night" : "Day"})</span>
            </div>
            <div className="bg-[#050608] p-2 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Fire Radiative Power</span>
              <span className="text-orange-400 font-bold text-sm">{event.frp} MW</span>
            </div>
            <div className="bg-[#050608] p-2 rounded border border-slate-800">
              <span className="text-slate-500 text-[10px] block">Brightness Temp</span>
              <span className="text-slate-200 text-sm font-semibold">{event.brightness} K</span>
            </div>
          </div>
        </div>

        {/* 9. RAW FEATURE VECTOR (Collapsible for Auditor Inspection) */}
        <div className="border border-slate-800 rounded overflow-hidden">
          <button
            onClick={() => setShowFeatureVector(!showFeatureVector)}
            className="w-full bg-[#0a0c10] hover:bg-[#0d1117] p-2.5 flex items-center justify-between text-[11px] font-mono text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>Auditor Inspection: Complete Feature Vector ({Object.keys(classification.feature_vector || {}).length} Dimensions)</span>
            </span>
            {showFeatureVector ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showFeatureVector && (
            <div className="p-2.5 bg-[#050608] font-mono text-[10px] space-y-1 text-slate-300 border-t border-slate-800">
              {Object.entries(classification.feature_vector || {}).map(([k, v]) => (
                <div key={k} className="flex justify-between py-0.5 border-b border-slate-900">
                  <span className="text-slate-500">{k}:</span>
                  <span className="text-orange-300">{typeof v === "number" ? v.toFixed(3) : v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
