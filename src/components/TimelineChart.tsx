import React from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

interface ObservationItem {
  date: string;
  timestamp?: string;
  frp: number;
  brightness: number;
  satellite: string;
}

interface TimelineChartProps {
  observations: ObservationItem[];
}

export const TimelineChart: React.FC<TimelineChartProps> = ({ observations }) => {
  if (!observations || observations.length === 0) {
    return (
      <div className="h-28 flex items-center justify-center text-slate-500 text-xs font-mono">
        No multi-temporal observation passes available
      </div>
    );
  }

  // Ensure chronologically sorted left-to-right (earliest observation on left, latest on right)
  const data = [...observations].sort((a, b) => {
    const timeA = a.timestamp ? new Date(a.timestamp).getTime() : new Date(a.date).getTime();
    const timeB = b.timestamp ? new Date(b.timestamp).getTime() : new Date(b.date).getTime();
    return timeA - timeB;
  });

  return (
    <div className="w-full h-36 bg-[#050608] p-2.5 rounded border border-slate-800">
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1">
        <span>Historical Radiative Power (MW)</span>
        <span className="text-orange-400 font-bold">● VIIRS / MODIS Passes</span>
      </div>
      <ResponsiveContainer width="100%" height={110}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="date"
            stroke="#64748b"
            tick={{ fontSize: 9, fill: "#94a3b8" }}
            tickFormatter={(v) => v.slice(5)}
          />
          <YAxis stroke="#64748b" tick={{ fontSize: 9, fill: "#94a3b8" }} />
          <Tooltip
            content={({ active, payload, label }) => {
              if (active && payload && payload.length) {
                const p = payload[0].payload as ObservationItem;
                return (
                  <div className="bg-[#0a0c10] border border-slate-800 p-2.5 rounded shadow-2xl text-xs font-mono text-slate-200">
                    <p className="font-semibold text-orange-400">{label}</p>
                    <p>FRP: <span className="text-white font-bold">{p.frp} MW</span></p>
                    <p>Brightness: <span className="text-slate-300">{p.brightness} K</span></p>
                    <p className="text-[10px] text-slate-500">{p.satellite}</p>
                  </div>
                );
              }
              return null;
            }}
          />
          <Line
            type="monotone"
            dataKey="frp"
            stroke="#f97316"
            strokeWidth={2}
            dot={{ fill: "#f97316", r: 3 }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
