import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, ScatterChart, Scatter,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Treemap, FunnelChart, Funnel, LabelList
} from "recharts";

const COLORS = ["#6d28d9","#0891b2","#059669","#d97706","#dc2626","#7c3aed","#db2777","#0284c7","#065f46","#92400e"];

export const ALL_CHART_TYPES = [
  { value:"bar", label:"Bar" }, { value:"stackedbar", label:"Stacked Bar" },
  { value:"line", label:"Line" }, { value:"area", label:"Area" },
  { value:"pie", label:"Pie" }, { value:"donut", label:"Donut" },
  { value:"scatter", label:"Scatter" }, { value:"radar", label:"Radar" },
  { value:"treemap", label:"Treemap" }, { value:"funnel", label:"Funnel" },
  { value:"table", label:"Table" },
];

const axis = { tick: { fontSize: 10, fill: "#9ca3af" } };
const tip = { contentStyle: { borderRadius: 8, border: "0.5px solid #eee", fontSize: 11, padding: "6px 10px" } };

export default function ChartCard({ chart, data, onDrillDown, accent = "#6d28d9" }) {
  const [type, setType] = useState(chart.type || "bar");
  const [editTitle, setEditTitle] = useState(false);
  const [title, setTitle] = useState(chart.title);
  const d = (data || []).slice(0, 60);

  function handleClick(payload) {
    if (payload?.activeLabel && onDrillDown) onDrillDown(chart.x_column, payload.activeLabel);
  }

  function render() {
    if (!chart.x_column || !chart.y_column) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 180, color: "#d1d5db", fontSize: 12 }}>No columns</div>;

    if (type === "table") return (
      <div style={{ overflowY: "auto", maxHeight: 180 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead><tr>{Object.keys(d[0] || {}).slice(0, 5).map(k => <th key={k} style={{ padding: "5px 8px", background: "#f9fafb", color: "#6b7280", fontWeight: 500, textAlign: "left", borderBottom: "0.5px solid #eee", fontSize: 10 }}>{k}</th>)}</tr></thead>
          <tbody>{d.slice(0, 8).map((row, i) => <tr key={i}>{Object.values(row).slice(0, 5).map((v, j) => <td key={j} style={{ padding: "5px 8px", color: "#374151", borderBottom: "0.5px solid #f9fafb", fontSize: 11 }}>{v !== null ? String(v).slice(0, 30) : "—"}</td>)}</tr>)}</tbody>
        </table>
      </div>
    );

    if (type === "treemap") return (
      <ResponsiveContainer width="100%" height={180}>
        <Treemap data={d.map(r => ({ name: r[chart.x_column], size: Number(r[chart.y_column]) || 1 }))} dataKey="size" stroke="#fff" fill={accent}>
          <Tooltip />
        </Treemap>
      </ResponsiveContainer>
    );

    if (type === "radar") return (
      <ResponsiveContainer width="100%" height={180}>
        <RadarChart data={d.slice(0, 7)}>
          <PolarGrid /><PolarAngleAxis dataKey={chart.x_column} tick={{ fontSize: 10 }} />
          <PolarRadiusAxis tick={{ fontSize: 9 }} />
          <Radar dataKey={chart.y_column} stroke={accent} fill={accent} fillOpacity={0.25} />
          <Tooltip {...tip} />
        </RadarChart>
      </ResponsiveContainer>
    );

    if (type === "funnel") return (
      <ResponsiveContainer width="100%" height={180}>
        <FunnelChart>
          <Tooltip {...tip} />
          <Funnel dataKey={chart.y_column} data={d.slice(0, 5)} isAnimationActive>
            {d.slice(0, 5).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            <LabelList position="right" fill="#374151" fontSize={10} dataKey={chart.x_column} />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    );

    if (type === "pie" || type === "donut") return (
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={d} dataKey={chart.y_column} nameKey={chart.x_column} cx="50%" cy="50%"
            outerRadius={70} innerRadius={type === "donut" ? 38 : 0} label={type === "pie" ? ({ name }) => name : false}>
            {d.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip {...tip} /><Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
        </PieChart>
      </ResponsiveContainer>
    );

    if (type === "scatter") return (
      <ResponsiveContainer width="100%" height={180}>
        <ScatterChart><CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey={chart.x_column} {...axis} /><YAxis dataKey={chart.y_column} {...axis} />
          <Tooltip {...tip} /><Scatter data={d} fill={accent} /></ScatterChart>
      </ResponsiveContainer>
    );

    if (type === "area" || type === "stackedarea") return (
      <ResponsiveContainer width="100%" height={180}>
        <AreaChart data={d} onClick={handleClick}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey={chart.x_column} {...axis} /><YAxis {...axis} />
          <Tooltip {...tip} /><Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
          <Area type="monotone" dataKey={chart.y_column} stroke={accent} fill={`${accent}22`} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    );

    if (type === "line") return (
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={d} onClick={handleClick}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey={chart.x_column} {...axis} /><YAxis {...axis} />
          <Tooltip {...tip} /><Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
          <Line type="monotone" dataKey={chart.y_column} stroke={accent} strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    );

    return (
      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={d} onClick={handleClick} style={{ cursor: "pointer" }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey={chart.x_column} {...axis} /><YAxis {...axis} />
          <Tooltip {...tip} /><Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
          <Bar dataKey={chart.y_column} radius={[3, 3, 0, 0]}>
            {d.map((_, i) => <Cell key={i} fill={type === "stackedbar" ? COLORS[i % COLORS.length] : accent} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "14px 16px", border: "0.5px solid #eee", display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {editTitle
          ? <input autoFocus value={title} onChange={e => setTitle(e.target.value)} onBlur={() => setEditTitle(false)} onKeyDown={e => e.key === "Enter" && setEditTitle(false)}
              style={{ flex: 1, fontSize: 12, fontWeight: 500, border: "none", borderBottom: "1.5px solid #6d28d9", outline: "none", background: "transparent", color: "#111" }} />
          : <div onClick={() => setEditTitle(true)} style={{ flex: 1, fontSize: 12, fontWeight: 500, color: "#111", cursor: "pointer" }} title="Click to rename">{title}</div>
        }
        <select value={type} onChange={e => setType(e.target.value)}
          style={{ fontSize: 10, border: "0.5px solid #eee", borderRadius: 6, padding: "2px 6px", color: "#6b7280", background: "#f9fafb", cursor: "pointer" }}>
          {ALL_CHART_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      {render()}
    </div>
  );
}