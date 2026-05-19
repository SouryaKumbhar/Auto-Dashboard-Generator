import { useState } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, ScatterChart, Scatter,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  FunnelChart, Funnel, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Treemap
} from "recharts";

const COLORS = ["#6d28d9","#0891b2","#059669","#d97706","#dc2626","#7c3aed","#0284c7","#db2777","#065f46","#92400e"];

export const CHART_TYPES = [
  { value: "bar", label: "Bar Chart" },
  { value: "stackedbar", label: "Stacked Bar" },
  { value: "line", label: "Line Chart" },
  { value: "multiline", label: "Multi Line" },
  { value: "area", label: "Area Chart" },
  { value: "stackedarea", label: "Stacked Area" },
  { value: "pie", label: "Pie Chart" },
  { value: "donut", label: "Donut Chart" },
  { value: "scatter", label: "Scatter Plot" },
  { value: "radar", label: "Radar Chart" },
  { value: "funnel", label: "Funnel Chart" },
  { value: "treemap", label: "Treemap" },
  { value: "table", label: "Data Table" },
];

function DonutLabel({ viewBox, value }) {
  const { cx, cy } = viewBox;
  return <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" style={{ fontSize: 18, fontWeight: 700, fill: "#1a1a2e" }}>{value}</text>;
}

export default function ChartWidget({ chart, data, height = 220, onDrillDown, drillPath = [], onDrillUp }) {
  const [currentType, setCurrentType] = useState(chart.type || "bar");
  const chartData = (data || []).slice(0, 50);
  const axisStyle = { tick: { fontSize: 11, fill: "#9ca3af" } };
  const tooltipStyle = { contentStyle: { borderRadius: 8, border: "0.5px solid #e5e7ef", fontSize: 12 } };

  function handleBarClick(barData) {
    if (onDrillDown && barData && barData.activeLabel) {
      onDrillDown(chart.x_column, barData.activeLabel);
    }
  }

  function renderChart() {
    if (!chart.x_column || !chart.y_column) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height, color: "#9ca3af", fontSize: 13 }}>No data columns configured</div>;

    if (currentType === "table") return (
      <div style={{ overflowY: "auto", maxHeight: height }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr>{Object.keys(chartData[0] || {}).slice(0, 6).map(k => (
              <th key={k} style={{ padding: "6px 10px", background: "#f9fafb", color: "#6b7280", fontWeight: 600, textAlign: "left", borderBottom: "0.5px solid #e5e7ef", fontSize: 10, textTransform: "uppercase" }}>{k}</th>
            ))}</tr>
          </thead>
          <tbody>{chartData.slice(0, 10).map((row, i) => (
            <tr key={i} style={{ borderBottom: "0.5px solid #f3f4f6" }}>
              {Object.values(row).slice(0, 6).map((v, j) => (
                <td key={j} style={{ padding: "6px 10px", color: "#374151", fontSize: 11 }}>{v !== null ? String(v) : "—"}</td>
              ))}
            </tr>
          ))}</tbody>
        </table>
      </div>
    );

    if (currentType === "treemap") return (
      <ResponsiveContainer width="100%" height={height}>
        <Treemap data={chartData.map(d => ({ name: d[chart.x_column], size: Number(d[chart.y_column]) || 1 }))} dataKey="size" ratio={4/3} stroke="#fff" fill="#6d28d9">
          <Tooltip />
        </Treemap>
      </ResponsiveContainer>
    );

    if (currentType === "radar") return (
      <ResponsiveContainer width="100%" height={height}>
        <RadarChart data={chartData.slice(0, 8)}>
          <PolarGrid /><PolarAngleAxis dataKey={chart.x_column} tick={{ fontSize: 11 }} />
          <PolarRadiusAxis tick={{ fontSize: 10 }} />
          <Radar name={chart.y_column} dataKey={chart.y_column} stroke="#6d28d9" fill="#6d28d9" fillOpacity={0.3} />
          <Tooltip {...tooltipStyle} /><Legend />
        </RadarChart>
      </ResponsiveContainer>
    );

    if (currentType === "funnel") return (
      <ResponsiveContainer width="100%" height={height}>
        <FunnelChart>
          <Tooltip {...tooltipStyle} />
          <Funnel dataKey={chart.y_column} data={chartData.slice(0, 6)} isAnimationActive>
            {chartData.slice(0, 6).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            <LabelList position="right" fill="#374151" fontSize={11} dataKey={chart.x_column} />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    );

    if (currentType === "pie" || currentType === "donut") return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={chartData} dataKey={chart.y_column} nameKey={chart.x_column} cx="50%" cy="50%"
            outerRadius={currentType === "donut" ? 80 : 80} innerRadius={currentType === "donut" ? 45 : 0} label={currentType === "pie"}>
            {chartData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            {currentType === "donut" && <DonutLabel value={chartData.reduce((s, d) => s + (Number(d[chart.y_column]) || 0), 0).toLocaleString()} viewBox={{ cx: 0, cy: 0 }} />}
          </Pie>
          <Tooltip {...tooltipStyle} /><Legend />
        </PieChart>
      </ResponsiveContainer>
    );

    if (currentType === "scatter") return (
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey={chart.x_column} {...axisStyle} /><YAxis dataKey={chart.y_column} {...axisStyle} />
          <Tooltip {...tooltipStyle} />
          <Scatter data={chartData} fill="#6d28d9" />
        </ScatterChart>
      </ResponsiveContainer>
    );

    if (currentType === "area" || currentType === "stackedarea") return (
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData} onClick={handleBarClick}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey={chart.x_column} {...axisStyle} /><YAxis {...axisStyle} />
          <Tooltip {...tooltipStyle} /><Legend />
          <Area type="monotone" dataKey={chart.y_column} stroke="#6d28d9" fill="#ede9fe" strokeWidth={2} stackId={currentType === "stackedarea" ? "1" : undefined} />
        </AreaChart>
      </ResponsiveContainer>
    );

    if (currentType === "line" || currentType === "multiline") return (
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} onClick={handleBarClick}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey={chart.x_column} {...axisStyle} /><YAxis {...axisStyle} />
          <Tooltip {...tooltipStyle} /><Legend />
          <Line type="monotone" dataKey={chart.y_column} stroke="#6d28d9" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    );

    return (
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={chartData} onClick={handleBarClick} style={{ cursor: "pointer" }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis dataKey={chart.x_column} {...axisStyle} /><YAxis {...axisStyle} />
          <Tooltip {...tooltipStyle} contentStyle={{ ...tooltipStyle.contentStyle, cursor: "pointer" }} /><Legend />
          <Bar dataKey={chart.y_column} radius={[4, 4, 0, 0]}>
            {chartData.map((_, i) => <Cell key={i} fill={currentType === "stackedbar" ? COLORS[i % COLORS.length] : "#6d28d9"} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8, flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", flex: 1 }}>{chart.title}</div>
        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
          {drillPath.length > 0 && (
            <button onClick={onDrillUp} style={{ fontSize: 11, background: "#fef3c7", color: "#92400e", border: "0.5px solid #fde68a", borderRadius: 6, padding: "2px 8px", cursor: "pointer" }}>
              ← Back
            </button>
          )}
          <select value={currentType} onChange={e => setCurrentType(e.target.value)}
            style={{ fontSize: 11, border: "0.5px solid #e5e7ef", borderRadius: 6, padding: "3px 6px", color: "#6b7280", background: "#f9fafb", cursor: "pointer" }}>
            {CHART_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
      </div>
      <div style={{ flex: 1 }}>{renderChart()}</div>
    </div>
  );
}