
import WhatIf from "./WhatIf";
import { useState, useRef } from "react";
import axios from "axios";
import Login from "./Login";
import UploadModal from "./UploadModal";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, LabelList,
  ResponsiveContainer
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";
const BACKEND = "https://autodash-backend-oqq2.onrender.com";
const api = axios.create({ baseURL: BACKEND });
api.interceptors.request.use(cfg => {
  const t = localStorage.getItem("token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});
const PALETTES = {
  default: { name:"Default", sidebar:"#06090D", accent:"#7C3AED", accentLight:"#1e1040", bg:"#0A0B18", card:"#0F1020", text:"#F0F2FF", sub:"#6B7A99", border:"#1E2340" },
};
const P_DARK = PALETTES.default;
function computeKPI(kpi, data) {
  const vals = data.map(r => Number(r[kpi.column])).filter(v => !isNaN(v) && isFinite(v));
  if (!vals.length) return { value: "—", raw: 0 };
  let v;
  switch(kpi.aggregation) {
    case "sum":   v = vals.reduce((a,b)=>a+b,0); break;
    case "mean":  v = vals.reduce((a,b)=>a+b,0)/vals.length; break;
    case "count": v = vals.length; break;
    case "max":   v = Math.max(...vals); break;
    case "min":   v = Math.min(...vals); break;
    default:      v = vals.length;
  }
  const fmt = v >= 1e9 ? `${(v/1e9).toFixed(1)}B`
    : v >= 1e6 ? `${(v/1e6).toFixed(1)}M`
    : v >= 1e3 ? `${(v/1e3).toFixed(1)}K`
    : kpi.aggregation === "mean" ? parseFloat(v.toFixed(1)).toLocaleString("en-IN")
    : Math.round(v).toLocaleString("en-IN");
  return { value: `${kpi.prefix||""}${fmt}${kpi.suffix||""}`, raw: v };
}
function KPICard({ kpi, data, palette, onRemove, index }) {
  // eslint-disable-next-line no-unused-vars
  const { value } = computeKPI(kpi, data);
  const colors = [palette.accent,"#2563EB","#059669","#D97706","#DC2626","#DB2777"];
  const color = kpi.color || colors[index % colors.length];
  const icons = ["📈","💰","👥","🎯","⚡","📊","🔥","💎"];
  const icon = icons[index % icons.length];
  return (
    <div style={{
      background: palette.card,
      borderRadius: 16,
      padding: "20px 22px",
      border: `1px solid ${palette.border}`,
      position: "relative",
      overflow: "hidden",
      cursor: "pointer",
      transition: "all 0.25s",
      minWidth: 0,
      boxShadow: `0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.04)`
    }}>
      {/* Top colored bar */}
      <div style={{ position:"absolute", top:0, left:0, right:0, height:4, background:`linear-gradient(90deg, ${color}, ${color}88)` }}/>
      {/* Remove button */}
      {onRemove && (
        <button onClick={onRemove} style={{ position:"absolute", top:10, right:10, background:"none", border:"none", color:palette.sub, cursor:"pointer", fontSize:14, opacity:0.5 }}>✕</button>
      )}
      {/* Icon + label */}
      <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:12, marginTop:4 }}>
        <div style={{ width:32, height:32, borderRadius:8, background:`${color}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{icon}</div>
        <div style={{ fontSize:11, color:palette.sub, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>{kpi.label}</div>
      </div>
      {/* Value */}
      <div style={{ fontSize:28, fontWeight:700, color:palette.text, letterSpacing:"-0.5px", marginBottom:8 }}>{value}</div>
      {/* Trend indicator */}
      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
        <span style={{ fontSize:11, color:"#4ADE80", background:"rgba(16,185,129,0.15)", padding:"2px 8px", borderRadius:20, fontWeight:600, border:"1px solid rgba(16,185,129,0.25)" }}>▲ Live</span>
        <span style={{ fontSize:11, color:palette.sub }}>{kpi.aggregation}</span>
      </div>
    </div>
  );
}
/* ── per-chart accent palette — each chart gets its own color ── */
const CHART_ACCENTS = [
  { stroke:"#7C3AED", a:"#7C3AED", b:"#19B6FF" },   // 0 violet→cyan
  { stroke:"#10B981", a:"#10B981", b:"#06B6D4" },   // 1 emerald→teal
  { stroke:"#F59E0B", a:"#F59E0B", b:"#EF4444" },   // 2 amber→red
  { stroke:"#EC4899", a:"#EC4899", b:"#8B5CF6" },   // 3 pink→violet
  { stroke:"#19B6FF", a:"#19B6FF", b:"#7C3AED" },   // 4 cyan→violet
];
const FIXED_CHART_TYPES = ["gradientBar","smoothArea","donut","glowLine","scatter"];

/* ── data-aware type resolver ──
   Inspects actual column values before assigning chart type
   so we never render a scatter with string x-axis or an empty donut */
function smartType(chart, index, data) {
  const premiumTypes = ["gradientBar","smoothArea","donut","glowLine","scatter","radar"];
  const requested = chart.type && premiumTypes.includes(chart.type) ? chart.type
                  : FIXED_CHART_TYPES[index % FIXED_CHART_TYPES.length];

  if (!data || data.length === 0 || !chart.x_column || !chart.y_column) return requested;

  const sample = data.slice(0, 30);
  const xVals = sample.map(r => r[chart.x_column]);

  // Check if x is numeric (needed for scatter)
  const xIsNumeric = xVals.filter(v => v != null && v !== "").every(v => !isNaN(Number(v)));

  if (requested === "scatter") {
    // Scatter needs both axes numeric — if x is categorical, use bar instead
    if (!xIsNumeric) return "gradientBar";
    return "scatter";
  }

  if (requested === "donut") {
    // Donut works by grouping x and summing/counting y — always usable
    return "donut";
  }

  return requested;
}

function ChartCard({ chart, data, palette, onRemove, index }) {
  const [editTitle, setEditTitle] = useState(false);
  const [title, setTitle] = useState(chart.title);
  const d = (data||[]).slice(0, 50);
  const ci = (index ?? 0) % CHART_ACCENTS.length;
  const { a, b } = CHART_ACCENTS[ci];
  // Pass data to smartType so it can inspect column values
  const type = smartType(chart, index ?? 0, d);

  const gid = `g${ci}_${(chart.id||index).toString().replace(/\W/g,"_")}`;

  const ax = {
    tick:{ fontSize:10, fill:palette.sub, fontFamily:"Inter,sans-serif" },
    axisLine:false, tickLine:false
  };
  const fmtY = v => v>=1e6?`${(v/1e6).toFixed(1)}M`:v>=1e3?`${(v/1e3).toFixed(0)}K`:Number.isInteger(v)?v:parseFloat(v).toFixed(1);
  const tp = {
    contentStyle:{
      borderRadius:12, border:`1px solid rgba(255,255,255,0.08)`,
      fontSize:11, background:"rgba(8,9,20,0.96)",
      color:palette.text, boxShadow:`0 8px 40px rgba(0,0,0,0.7)`,
      backdropFilter:"blur(16px)", padding:"10px 14px"
    },
    cursor:{ fill:`${a}10` }
  };
  const gridStroke = "rgba(255,255,255,0.05)";

  function render() {
    if (!chart.x_column || !chart.y_column) return (
      <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:10 }}>
        <div style={{ width:44, height:44, borderRadius:12, background:`${a}18`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>📊</div>
        <span style={{ fontSize:12, color:palette.sub }}>No columns configured</span>
      </div>
    );

    /* ── SMART DATA PREPARATION ── */
    const allRows = (data || []);
    const sample30 = allRows.slice(0, 30);
    const xVals = sample30.map(r => r[chart.x_column]);
    const xIsNumeric = xVals.filter(v => v != null && v !== "").every(v => !isNaN(Number(v)));
    const looksLikeTime = (col) => {
      const lower = String(col).toLowerCase();
      return lower.includes("date") || lower.includes("month") || lower.includes("year") ||
             lower.includes("week") || lower.includes("day") || lower.includes("time") ||
             lower.includes("period") || lower.includes("quarter") || lower.includes("trend");
    };
    const xIsTimeSeries = looksLikeTime(chart.x_column) || looksLikeTime(chart.title||"");

    function aggregate(rows, maxGroups=20) {
      const map = {};
      rows.forEach(r => {
        const k = String(r[chart.x_column] ?? "").trim().slice(0, 24);
        if (!k || k === "undefined" || k === "null") return;
        const raw = Number(r[chart.y_column]);
        const val = (!isNaN(raw) && raw !== 0) ? Math.abs(raw) : 1;
        map[k] = (map[k] || 0) + val;
      });
      return Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, maxGroups)
        .map(([k, v]) => ({ [chart.x_column]: k, [chart.y_column]: parseFloat(v.toFixed(2)) }));
    }

    function timeSeries(rows, maxPts=60) {
      const valid = rows.filter(r => {
        const v = Number(r[chart.y_column]);
        return !isNaN(v) && isFinite(v);
      });
      if (valid.length === 0) return rows.slice(0, maxPts);
      if (valid.length <= maxPts) return valid;
      const step = Math.ceil(valid.length / maxPts);
      return valid.filter((_, i) => i % step === 0).slice(0, maxPts);
    }

    /* ── GRADIENT BAR ── */
    if (type === "gradientBar") {
      const finalData = xIsTimeSeries
        ? timeSeries(allRows, 20)
        : aggregate(allRows, 18);
      const showLabels = finalData.length <= 12;
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={finalData} barCategoryGap="28%"
            margin={{top: showLabels ? 26 : 8, right:16, bottom: finalData.length > 10 ? 56 : 20, left:4}}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={a} stopOpacity={1}/>
                <stop offset="100%" stopColor={b} stopOpacity={0.55}/>
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={gridStroke}/>
            <XAxis dataKey={chart.x_column} {...ax} interval={0}
              tickFormatter={v => String(v).slice(0, 10)}
              angle={finalData.length > 10 ? -40 : 0}
              textAnchor={finalData.length > 10 ? "end" : "middle"}
              height={finalData.length > 10 ? 62 : 28}/>
            <YAxis {...ax} width={44} tickFormatter={fmtY}/>
            <Tooltip {...tp} formatter={(v) => [fmtY(v), chart.y_column]}/>
            <Bar dataKey={chart.y_column} fill={`url(#${gid})`} radius={[6,6,0,0]} maxBarSize={48}
              isAnimationActive={true} animationDuration={900} animationEasing="ease-out">
              {showLabels && (
                <LabelList dataKey={chart.y_column} position="top"
                  style={{ fontSize:9, fill:a, fontWeight:700 }} formatter={fmtY}/>
              )}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }

    /* ── SMOOTH AREA ── */
    if (type === "smoothArea") {
      const areaData = xIsTimeSeries || !xIsNumeric
        ? timeSeries(allRows, 60)
        : aggregate(allRows, 30);
      if (areaData.length === 0) return (
        <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:palette.sub, fontSize:12 }}>No numeric data available</div>
      );
      const vals = areaData.map(r => Number(r[chart.y_column])).filter(v => !isNaN(v));
      const maxV = Math.max(...vals); const minV = Math.min(...vals);
      return (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={areaData} margin={{top:28, right:16, bottom:20, left:4}}>
            <defs>
              <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={a} stopOpacity={0.45}/>
                <stop offset="90%" stopColor={a} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id={`${gid}s`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={a}/>
                <stop offset="100%" stopColor={b}/>
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} stroke={gridStroke}/>
            <XAxis dataKey={chart.x_column} {...ax} interval="preserveStartEnd"
              tickFormatter={v => String(v).slice(0, 10)} height={28}/>
            <YAxis {...ax} width={44} tickFormatter={fmtY}/>
            <Tooltip {...tp} formatter={(v) => [fmtY(v), chart.y_column]}/>
            <Area type="monotoneX" dataKey={chart.y_column}
              stroke={`url(#${gid}s)`} strokeWidth={2.5}
              fill={`url(#${gid})`} dot={false}
              activeDot={{ r:6, fill:a, stroke:"#0A0B18", strokeWidth:2.5 }}
              isAnimationActive={true} animationDuration={1000} animationEasing="ease-out">
              <LabelList dataKey={chart.y_column} position="top"
                content={({ x, y, value }) => {
                  const v = Number(value);
                  if (isNaN(v) || (v !== maxV && v !== minV)) return null;
                  const isMax = v === maxV;
                  return (
                    <g>
                      <rect x={Number(x)-22} y={isMax ? Number(y)-22 : Number(y)+6} width={44} height={14} rx={4}
                        fill={isMax ? a : b} fillOpacity={0.92}/>
                      <text x={Number(x)} y={isMax ? Number(y)-12 : Number(y)+16}
                        textAnchor="middle" fontSize={9} fill="#fff" fontWeight={700}>{fmtY(v)}</text>
                    </g>
                  );
                }}/>
            </Area>
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    /* ── DONUT ── */
    if (type === "donut") {
      const DONUT_COLORS = [a, b, "#10B981","#F59E0B","#EC4899","#06B6D4","#A78BFA","#34D399"];
      const grouped = {};
      allRows.forEach(r => {
        const key = String(r[chart.x_column] ?? "Other").trim().slice(0, 24);
        if (!key || key === "undefined" || key === "null") return;
        const raw = Number(r[chart.y_column]);
        const val = (!isNaN(raw) && raw !== 0) ? Math.abs(raw) : 1;
        grouped[key] = (grouped[key] || 0) + val;
      });
      const pieData = Object.entries(grouped)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 7)
        .map(([name, value]) => ({ name, value: parseFloat(value.toFixed(2)) }))
        .filter(r => r.value > 0);
      const total = pieData.reduce((s, r) => s + r.value, 0);
      if (pieData.length === 0) return (
        <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:palette.sub, fontSize:12 }}>No groupable data</div>
      );
      const renderLabel = ({ cx, cy, midAngle, outerRadius, name, percent }) => {
        if (percent < 0.04) return null;
        const RAD = Math.PI / 180;
        const r1 = outerRadius + 8, r2 = outerRadius + 22, r3 = outerRadius + 30;
        const cos = Math.cos(-midAngle * RAD), sin = Math.sin(-midAngle * RAD);
        const anchor = cos > 0 ? "start" : "end";
        return (
          <g>
            <line x1={cx+r1*cos} y1={cy+r1*sin} x2={cx+r2*cos} y2={cy+r2*sin}
              stroke={palette.sub} strokeWidth={1} opacity={0.5}/>
            <text x={cx+r3*cos} y={cy+r3*sin - 5} textAnchor={anchor}
              fontSize={9} fill={palette.text} fontWeight={600}>{String(name).slice(0,16)}</text>
            <text x={cx+r3*cos} y={cy+r3*sin + 7} textAnchor={anchor}
              fontSize={9} fill={palette.sub}>{(percent*100).toFixed(1)}%</text>
          </g>
        );
      };
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{top:20, right:44, bottom:20, left:44}}>
            <defs>
              {DONUT_COLORS.map((c,i) => (
                <radialGradient key={i} id={`${gid}d${i}`} cx="50%" cy="50%" r="60%">
                  <stop offset="0%" stopColor={c} stopOpacity={1}/>
                  <stop offset="100%" stopColor={c} stopOpacity={0.65}/>
                </radialGradient>
              ))}
            </defs>
            <Pie data={pieData} dataKey="value" nameKey="name"
              cx="50%" cy="50%" outerRadius="55%" innerRadius="36%"
              paddingAngle={3} strokeWidth={0}
              labelLine={false} label={renderLabel}
              isAnimationActive={true} animationDuration={900} animationBegin={100}>
              {pieData.map((_, i) => <Cell key={i} fill={`url(#${gid}d${i})`}/>)}
            </Pie>
            <Tooltip {...tp} formatter={(v) => [`${fmtY(v)} (${total ? ((v/total)*100).toFixed(1) : 0}%)`, chart.x_column]}/>
          </PieChart>
        </ResponsiveContainer>
      );
    }

    /* ── GLOW LINE ── */
    if (type === "glowLine") {
      const lineData = xIsTimeSeries || !xIsNumeric
        ? timeSeries(allRows, 60)
        : aggregate(allRows, 30);
      if (lineData.length === 0) return (
        <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:palette.sub, fontSize:12 }}>No numeric data available</div>
      );
      const vals = lineData.map(r => Number(r[chart.y_column])).filter(v => !isNaN(v));
      const maxV = Math.max(...vals); const minV = Math.min(...vals);
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={lineData} margin={{top:28, right:16, bottom:20, left:4}}>
            <defs>
              <filter id={`${gid}glow`} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
                <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>
            <CartesianGrid vertical={false} stroke={gridStroke}/>
            <XAxis dataKey={chart.x_column} {...ax} interval="preserveStartEnd"
              tickFormatter={v => String(v).slice(0, 10)} height={28}/>
            <YAxis {...ax} width={44} tickFormatter={fmtY}/>
            <Tooltip {...tp} formatter={(v) => [fmtY(v), chart.y_column]}/>
            <Line type="monotoneX" dataKey={chart.y_column}
              stroke={a} strokeWidth={2.5} dot={false}
              activeDot={{ r:6, fill:a, stroke:"#0A0B18", strokeWidth:2.5 }}
              filter={`url(#${gid}glow)`}
              isAnimationActive={true} animationDuration={1100} animationEasing="ease-out">
              <LabelList dataKey={chart.y_column} position="top"
                content={({ x, y, value }) => {
                  const v = Number(value);
                  if (isNaN(v) || (v !== maxV && v !== minV)) return null;
                  const isMax = v === maxV;
                  return (
                    <g>
                      <rect x={Number(x)-22} y={isMax ? Number(y)-22 : Number(y)+6} width={44} height={14} rx={4}
                        fill={isMax ? a : b} fillOpacity={0.92}/>
                      <text x={Number(x)} y={isMax ? Number(y)-12 : Number(y)+16}
                        textAnchor="middle" fontSize={9} fill="#fff" fontWeight={700}>{fmtY(v)}</text>
                    </g>
                  );
                }}/>
            </Line>
          </LineChart>
        </ResponsiveContainer>
      );
    }

    /* ── SCATTER — numeric pairs only, fallback to aggregated bar ── */
    if (type === "scatter") {
      const scatterData = allRows
        .map(r => ({ x: Number(r[chart.x_column]), y: Number(r[chart.y_column]) }))
        .filter(p => !isNaN(p.x) && !isNaN(p.y) && isFinite(p.x) && isFinite(p.y))
        .slice(0, 80);
      if (scatterData.length < 4) {
        const fbData = aggregate(allRows, 16);
        const showL = fbData.length <= 12;
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={fbData} barCategoryGap="28%"
              margin={{top: showL ? 26 : 8, right:16, bottom: fbData.length>10 ? 56 : 20, left:4}}>
              <defs><linearGradient id={`${gid}sc`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={a} stopOpacity={1}/>
                <stop offset="100%" stopColor={b} stopOpacity={0.55}/>
              </linearGradient></defs>
              <CartesianGrid vertical={false} stroke={gridStroke}/>
              <XAxis dataKey={chart.x_column} {...ax} interval={0}
                tickFormatter={v=>String(v).slice(0,10)}
                angle={fbData.length>10?-40:0} textAnchor={fbData.length>10?"end":"middle"}
                height={fbData.length>10?62:28}/>
              <YAxis {...ax} width={44} tickFormatter={fmtY}/>
              <Tooltip {...tp} formatter={(v)=>[fmtY(v), chart.y_column]}/>
              <Bar dataKey={chart.y_column} fill={`url(#${gid}sc)`} radius={[6,6,0,0]} maxBarSize={48}
                isAnimationActive={true} animationDuration={900}>
                {showL && <LabelList dataKey={chart.y_column} position="top"
                  style={{fontSize:9,fill:a,fontWeight:700}} formatter={fmtY}/>}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        );
      }
      const maxPt = scatterData.reduce((m,p) => p.y > m.y ? p : m, scatterData[0]);
      const minPt = scatterData.reduce((m,p) => p.y < m.y ? p : m, scatterData[0]);
      return (
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{top:8, right:16, bottom:20, left:4}}>
            <defs>
              <radialGradient id={`${gid}dot`} cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor={a} stopOpacity={1}/>
                <stop offset="100%" stopColor={b} stopOpacity={0.5}/>
              </radialGradient>
            </defs>
            <CartesianGrid stroke={gridStroke}/>
            <XAxis dataKey="x" type="number" name={chart.x_column} {...ax} tickFormatter={fmtY} height={28}
              label={{ value:chart.x_column, position:"insideBottomRight", offset:-4, fontSize:9, fill:palette.sub }}/>
            <YAxis dataKey="y" type="number" name={chart.y_column} {...ax} width={44} tickFormatter={fmtY}
              label={{ value:chart.y_column, angle:-90, position:"insideLeft", offset:8, fontSize:9, fill:palette.sub }}/>
            <Tooltip {...tp} cursor={{ strokeDasharray:"4 4", stroke:palette.border }}
              formatter={(v,n) => [fmtY(v), n]}/>
            <Scatter data={scatterData} fill={`url(#${gid}dot`} isAnimationActive={true} animationDuration={800}>
              <LabelList content={({ x, y, index }) => {
                const pt = scatterData[index];
                if (!pt) return null;
                const isMax = pt.x===maxPt.x && pt.y===maxPt.y;
                const isMin = pt.x===minPt.x && pt.y===minPt.y;
                if (!isMax && !isMin) return null;
                return (
                  <g>
                    <rect x={Number(x)-20} y={Number(y)-20} width={40} height={13} rx={3}
                      fill={isMax?a:b} fillOpacity={0.9}/>
                    <text x={Number(x)} y={Number(y)-11} textAnchor="middle"
                      fontSize={8} fill="#fff" fontWeight={700}>{fmtY(pt.y)}</text>
                  </g>
                );
              }}/>
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      );
    }

    /* fallback → aggregated bar */
    const fbData = aggregate(allRows, 16);
    const showL = fbData.length <= 12;
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={fbData} barCategoryGap="28%"
          margin={{top: showL ? 26 : 8, right:16, bottom: fbData.length>10 ? 56 : 20, left:4}}>
          <defs><linearGradient id={`${gid}fb`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={a} stopOpacity={1}/>
            <stop offset="100%" stopColor={b} stopOpacity={0.6}/>
          </linearGradient></defs>
          <CartesianGrid vertical={false} stroke={gridStroke}/>
          <XAxis dataKey={chart.x_column} {...ax} interval={0}
            tickFormatter={v=>String(v).slice(0,10)}
            angle={fbData.length>10?-40:0} textAnchor={fbData.length>10?"end":"middle"}
            height={fbData.length>10?62:28}/>
          <YAxis {...ax} width={44} tickFormatter={fmtY}/>
          <Tooltip {...tp}/>
          <Bar dataKey={chart.y_column} fill={`url(#${gid}fb)`} radius={[6,6,0,0]} maxBarSize={48}
            isAnimationActive={true} animationDuration={900}>
            {showL && <LabelList dataKey={chart.y_column} position="top"
              style={{fontSize:9,fill:a,fontWeight:700}} formatter={fmtY}/>}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  const TYPE_META = {
    gradientBar:{ label:"Bar Chart",   icon:"▌" },
    smoothArea: { label:"Area Chart",  icon:"◠" },
    donut:      { label:"Donut Chart", icon:"◎" },
    glowLine:   { label:"Line Chart",  icon:"∿" },
    scatter:    { label:"Scatter Plot",icon:"⁘" },
    radar:      { label:"Radar",       icon:"⬡" },
  };
  const meta = TYPE_META[type] || { label:type, icon:"◈" };

  return (
    <div style={{
      background:palette.card, borderRadius:18,
      border:`1px solid rgba(255,255,255,0.06)`,
      overflow:"hidden", display:"flex", flexDirection:"column", height:"100%",
      boxShadow:`0 2px 20px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)`,
      animation:"chartFadeIn 0.45s ease-out both",
      animationDelay:`${(index??0)*80}ms`
    }}>
      {/* Colored top accent line */}
      <div style={{ height:3, background:`linear-gradient(90deg,${a},${b})`, flexShrink:0 }}/>
      {/* Header */}
      <div style={{
        padding:"11px 14px 10px", display:"flex", alignItems:"center",
        gap:8, flexShrink:0, borderBottom:`1px solid rgba(255,255,255,0.05)`
      }}>
        <span style={{ fontSize:13, lineHeight:1, color:a, flexShrink:0 }}>{meta.icon}</span>
        {editTitle
          ? <input autoFocus value={title} onChange={e=>setTitle(e.target.value)}
              onBlur={()=>setEditTitle(false)} onKeyDown={e=>e.key==="Enter"&&setEditTitle(false)}
              style={{ flex:1, fontSize:12, fontWeight:600, border:"none", borderBottom:`1.5px solid ${a}`, outline:"none", background:"transparent", color:palette.text }}/>
          : <div onClick={()=>setEditTitle(true)}
              style={{ flex:1, fontSize:12, fontWeight:600, color:palette.text, cursor:"text", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}
              title="Click to rename">{title}</div>
        }
        <span style={{
          fontSize:9, fontWeight:700, color:a, letterSpacing:"0.7px",
          background:`${a}14`, border:`1px solid ${a}28`,
          borderRadius:5, padding:"2px 6px", textTransform:"uppercase", flexShrink:0
        }}>{meta.label}</span>
        {onRemove && (
          <button onClick={onRemove} title="Remove chart"
            style={{ background:"none", border:"none", color:palette.sub, cursor:"pointer", fontSize:13, padding:0, flexShrink:0, opacity:0.4, lineHeight:1, transition:"opacity 0.15s" }}
            onMouseEnter={e=>e.currentTarget.style.opacity=1}
            onMouseLeave={e=>e.currentTarget.style.opacity=0.4}>✕</button>
        )}
      </div>
      {/* Body */}
      <div style={{ flex:1, padding:"10px 8px 10px 4px", minHeight:0 }}>{render()}</div>
    </div>
  );
}
function AddVisualPanel({ onAdd, cols, numCols, catCols, palette, onClose, existingCount }) {
  const [xCol, setXCol] = useState(catCols[0]||cols[0]||"");
  const [yCol, setYCol] = useState(numCols[0]||cols[0]||"");
  const [title, setTitle] = useState("");
  const allCols = [...new Set([...catCols,...numCols])];
  const accent = palette.accent;
  const inp = { width:"100%", padding:"9px 12px", borderRadius:10, border:`1px solid ${palette.border}`, fontSize:13, outline:"none", background:palette.bg, color:palette.text };
  const lbl = { fontSize:11, color:palette.sub, display:"block", marginBottom:5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.4px" };
  // Auto-assign type by rotation so new charts are varied
  const AUTO_TYPES = ["gradientBar","smoothArea","donut","glowLine","scatter","radar"];
  const autoType = AUTO_TYPES[(existingCount||0) % AUTO_TYPES.length];
  const TYPE_LABEL = { gradientBar:"Bar", smoothArea:"Area", donut:"Donut", glowLine:"Line", scatter:"Scatter", radar:"Radar" };
  return (
    <div style={{ background:palette.card, borderRadius:16, border:`1px solid ${accent}40`, boxShadow:`0 0 0 1px ${accent}20`, padding:20, marginBottom:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ fontSize:14, fontWeight:700, color:palette.text }}>+ Add Visual</div>
          <span style={{ fontSize:10, background:`${accent}15`, color:accent, border:`1px solid ${accent}25`, borderRadius:6, padding:"2px 8px", fontWeight:700 }}>
            Auto · {TYPE_LABEL[autoType]}
          </span>
        </div>
        <button onClick={onClose} style={{ background:"none", border:"none", color:palette.sub, fontSize:18, cursor:"pointer", opacity:0.6 }}>✕</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:14 }}>
        <div>
          <label style={lbl}>X Axis / Category</label>
          <select value={xCol} onChange={e=>setXCol(e.target.value)} style={inp}>
            {allCols.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Y Axis / Metric</label>
          <select value={yCol} onChange={e=>setYCol(e.target.value)} style={inp}>
            {allCols.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginBottom:16 }}>
        <label style={lbl}>Chart Title</label>
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder={`${yCol} by ${xCol}`} style={inp}/>
      </div>
      <button onClick={()=>{ onAdd({ id:`c${Date.now()}`, type:autoType, title:title||`${yCol} by ${xCol}`, x_column:xCol, y_column:yCol }); onClose(); }}
        style={{ background:`linear-gradient(135deg,${accent},#19B6FF)`, color:"#fff", border:"none", borderRadius:10, padding:"10px 24px", fontSize:13, fontWeight:600, cursor:"pointer", boxShadow:`0 4px 20px ${accent}40` }}>
        Add to Dashboard
      </button>
    </div>
  );
}
function AIChatbot({ db, accent, palette, onCommand }) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState([{ role:"ai", text:"Hi! I'm your AI assistant. Try: 'Add a bar chart' or 'Change theme to dark'" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const quickCommands = [
    "Add a bar chart", "Add a line chart", "Add a pie chart",
    "Change theme to dark", "Change theme to finance", "Add a KPI card"
  ];
  async function send(text) {
    const msg = text || input.trim();
    if (!msg) return;
    setInput("");
    setMsgs(p=>[...p, { role:"user", text:msg }]);
    setLoading(true);
    try {
      const columns = db?.columns || [];
      const numCols = db?.col_info ? Object.entries(db.col_info).filter(([,v])=>v.dtype?.includes("int")||v.dtype?.includes("float")).map(([k])=>k) : [];
      const catCols = db?.col_info ? Object.entries(db.col_info).filter(([,v])=>v.dtype==="object").map(([k])=>k) : [];
      const res = await api.post("/ai-chat", {
        message: msg,
        columns,
        domain: db?.domain || "general"
      });
      const reply = res.data.reply || "Done!";
      const action = res.data.action;
      setMsgs(p=>[...p, { role:"ai", text:reply }]);
      if (action && onCommand) onCommand(action, { numCols, catCols });
    } catch {
      setMsgs(p=>[...p, { role:"ai", text:"I'll help! Try asking me to add charts, change themes, or modify the dashboard." }]);
    }
    setLoading(false);
    setTimeout(()=>bottomRef.current?.scrollIntoView({ behavior:"smooth" }), 100);
  }
  return (
    <>
      <button onClick={()=>setOpen(o=>!o)} style={{
        position:"fixed", bottom:28, right:28, zIndex:1000,
        width:56, height:56, borderRadius:"50%", background:accent,
        border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
        fontSize:24, boxShadow:`0 4px 24px ${accent}60`, transition:"all 0.2s"
      }}>
        {open ? "✕" : "🤖"}
      </button>
      {open && (
        <div style={{
          position:"fixed", bottom:96, right:28, zIndex:999,
          width:360, height:500, background:palette.card, borderRadius:20,
          border:`1px solid ${palette.border}`, boxShadow:"0 16px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)",
          backdropFilter:"blur(16px)",
          display:"flex", flexDirection:"column", overflow:"hidden"
        }}>
          <div style={{ padding:"16px 18px", background:accent, color:"#fff", flexShrink:0 }}>
            <div style={{ fontSize:14, fontWeight:700 }}>🤖 AI Dashboard Assistant</div>
            <div style={{ fontSize:11, opacity:0.8, marginTop:2 }}>Ask me to modify your dashboard</div>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:14, display:"flex", flexDirection:"column", gap:8 }}>
            {msgs.map((m,i) => (
              <div key={i} style={{ alignSelf:m.role==="user"?"flex-end":"flex-start", maxWidth:"88%" }}>
                <div style={{
                  padding:"9px 14px", borderRadius:m.role==="user"?"14px 14px 4px 14px":"14px 14px 14px 4px",
                  background:m.role==="user"?accent:palette.bg,
                  color:m.role==="user"?"#fff":palette.text, fontSize:12, lineHeight:1.5
                }}>{m.text}</div>
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf:"flex-start" }}>
                <div style={{ padding:"9px 14px", borderRadius:"14px 14px 14px 4px", background:palette.bg, fontSize:12, color:palette.sub }}>Thinking...</div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>
          <div style={{ padding:"8px 12px", borderTop:`1px solid ${palette.border}`, flexShrink:0 }}>
            <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginBottom:8 }}>
              {quickCommands.slice(0,3).map(cmd => (
                <button key={cmd} onClick={()=>send(cmd)}
                  style={{ fontSize:10, padding:"3px 8px", borderRadius:20, border:`1px solid ${palette.border}`, background:palette.bg, color:palette.sub, cursor:"pointer" }}>
                  {cmd}
                </button>
              ))}
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}
                placeholder="Ask AI to modify dashboard..."
                style={{ flex:1, padding:"8px 12px", borderRadius:10, border:`1px solid ${palette.border}`, fontSize:12, outline:"none", background:palette.bg, color:palette.text }}/>
              <button onClick={()=>send()} disabled={loading}
                style={{ background:accent, color:"#fff", border:"none", borderRadius:10, padding:"8px 14px", fontSize:12, cursor:"pointer", fontWeight:600 }}>→</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
export default function App() {
  const [user, setUser] = useState(()=>{ try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }});
  const [token, setToken] = useState(()=>localStorage.getItem("token")||"");
  const [page, setPage] = useState("dashboard");
  const [db, setDb] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showAddVisual, setShowAddVisual] = useState(false);
  const [showWhatIf, setShowWhatIf] = useState(false);
  const [filters, setFilters] = useState({});
  const [drills, setDrills] = useState([]);
  const [dashName, setDashName] = useState("My Dashboard");
  const [editName, setEditName] = useState(false);
  const [charts, setCharts] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [sources, setSources] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [pages, setPages] = useState(["Page 1"]);
  const [activePage, setActivePage] = useState(0);
  const [showInsights, setShowInsights] = useState(true);
  const [sidebarHover, setSidebarHover] = useState(false);
  const [topbarHover, setTopbarHover] = useState(false);
  const dashRef = useRef(null);
  const P = P_DARK;
  const accent = P.accent;
  function handleLogin(u) { setUser(u); setToken(localStorage.getItem("token")||""); }
  function handleLogout() { localStorage.clear(); setUser(null); setDb(null); setToken(""); }
  function handleData(data) {
    setDb(data);
    setCharts(data.config?.charts || []);
    setKpis(data.config?.kpis || []);
    setDashName(data.config?.dashboard_title || data.filename || "Dashboard");
    setFilters({}); setDrills([]);
    window.__rawData = data.data;
    setSources(prev => {
      const exists = prev.find(s=>s.filename===data.filename);
      if (exists) return prev.map(s=>s.filename===data.filename?{...s,...data}:s);
      return [...prev, { filename:data.filename, source_type:data.source_type, rows:data.row_count, cols:data.col_count, domain:data.domain }];
    });
    // Single dark theme — no palette switching needed
    setPage("dashboard");
  }
  function filteredData() {
    if (!db) return [];
    let d = db.data;
    drills.forEach(({col,val})=>{ if(val) d=d.filter(r=>String(r[col])===val); });
    d = d.filter(row=>Object.entries(filters).every(([col,val])=>!val||String(row[col])===val));
    if (searchText.trim()) { const q=searchText.toLowerCase(); d=d.filter(row=>Object.values(row).some(v=>String(v).toLowerCase().includes(q))); }
    return d;
  }
  async function exportPDF() {
    if (!dashRef.current) return alert("No dashboard to export");
    const canvas = await html2canvas(dashRef.current,{scale:1.5,useCORS:true,logging:false});
    const pdf = new jsPDF("l","mm","a4");
    pdf.addImage(canvas.toDataURL("image/png"),"PNG",5,5,287,190);
    pdf.save(`${dashName}.pdf`);
  }
  function exportExcel() {
    const d = filteredData();
    if (!d.length) return alert("No data");
    const ws = XLSX.utils.json_to_sheet(d);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,"Data");
    XLSX.writeFile(wb,`${dashName}.xlsx`);
  }
  function handleAICommand(action, { numCols=[], catCols=[] }={}) {
    if (!action) return;
    if (action.type === "add_widget") {
      setCharts(p=>[...p,{
        id:`c${Date.now()}`, type:action.widget_type||"bar",
        title:action.title||"New Chart",
        x_column:action.x_column||catCols[0]||"",
        y_column:action.y_column||numCols[0]||""
      }]);
    }
    // theme switching removed — dark is the only theme
  }
  const data = filteredData();
  const numCols = db?.col_info ? Object.entries(db.col_info).filter(([,v])=>v.dtype?.includes("int")||v.dtype?.includes("float")).map(([k])=>k) : [];
  const catCols = db?.col_info ? Object.entries(db.col_info).filter(([,v])=>v.dtype==="object").map(([k])=>k) : [];
  const filterCols = db?.config?.filters || catCols.slice(0,4);
  const tableCols = db?.config?.table_columns || db?.columns?.slice(0,6) || [];
  const NAV = [
    { id:"dashboard", icon:"⊞", label:"Dashboard" },
    { id:"analytics", icon:"📊", label:"Analytics" },
    { id:"files", icon:"📁", label:"My Files" },
    { id:"export", icon:"⬇", label:"Export" },
    { id:"settings", icon:"⚙", label:"Settings" },
  ];
  if (!user) return <Login onLogin={handleLogin}/>;
  return (
    <div style={{ display:"flex", height:"100vh", overflow:"hidden", fontFamily:"Inter, -apple-system, sans-serif", background:P.bg }}>
      {showUpload && <UploadModal onClose={()=>setShowUpload(false)} onData={handleData} token={token}/>}
      {showWhatIf && (
        <WhatIf db={db} data={data} kpis={kpis} accent={accent} palette={P} onClose={() => setShowWhatIf(false)}/>
      )}

      {/* SIDEBAR HOVER TRIGGER ZONE — invisible 8px strip on the left edge */}
      <div
        onMouseEnter={()=>setSidebarHover(true)}
        onMouseLeave={()=>setSidebarHover(false)}
        style={{ position:"fixed", top:0, left:0, width: sidebarHover ? 220 : 8, height:"100vh", zIndex:200, display:"flex" }}
      >
        {/* SIDEBAR PANEL */}
        <div style={{
          width:220, background:P.sidebar, display:"flex", flexDirection:"column", flexShrink:0,
          borderRight:`1px solid ${P.border}`,
          boxShadow: sidebarHover ? `4px 0 40px rgba(0,0,0,0.7)` : "none",
          transform: sidebarHover ? "translateX(0)" : "translateX(-220px)",
          transition:"transform 0.28s cubic-bezier(0.4,0,0.2,1), box-shadow 0.28s ease",
          willChange:"transform"
        }}>
        {/* Logo */}
        <div style={{ padding:"20px 18px 16px", borderBottom:`1px solid ${P.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:10, background:"linear-gradient(135deg,#7C3AED,#19B6FF)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, boxShadow:`0 4px 16px ${accent}50` }}>📊</div>
            <div>
              <div style={{ color:"#fff", fontSize:15, fontWeight:700, letterSpacing:"-0.3px" }}>Data<span style={{ color:accent }}>Dash</span></div>
              <div style={{ color:"rgba(255,255,255,0.28)", fontSize:10, marginTop:1 }}>Production BI Platform</div>
            </div>
          </div>
        </div>
        {/* Navigation */}
        <nav style={{ padding:"12px 10px", flex:1 }}>
          {NAV.map(n=>(
            <div key={n.id} onClick={()=>setPage(n.id)} style={{
              display:"flex", alignItems:"center", gap:10, padding:"9px 12px",
              borderRadius:10, marginBottom:2, cursor:"pointer",
              background:page===n.id?`${accent}20`:"transparent",
              color:page===n.id?accent:"rgba(255,255,255,0.38)",
              fontSize:13, fontWeight:page===n.id?600:400, transition:"all 0.15s",
              borderLeft:page===n.id?`3px solid ${accent}`:"3px solid transparent"
            }}>
              <span style={{ fontSize:15 }}>{n.icon}</span>{n.label}
            </div>
          ))}
          {/* Connected Sources */}
          {sources.length > 0 && (
            <div style={{ marginTop:20 }}>
              <div style={{ fontSize:9, color:"rgba(255,255,255,0.22)", textTransform:"uppercase", letterSpacing:"1px", padding:"0 12px 8px", fontWeight:700 }}>Connected Sources</div>
              {sources.map((s,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 12px", borderRadius:8, marginBottom:2 }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:"#10B981", flexShrink:0 }}/>
                  <span style={{ color:"rgba(255,255,255,0.40)", fontSize:11, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.filename}</span>
                  <span style={{ color:"rgba(255,255,255,0.18)", fontSize:9, marginLeft:"auto", flexShrink:0 }}>{s.rows?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </nav>
        {/* User */}
        <div style={{ padding:"14px 16px", borderTop:`1px solid ${P.border}` }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:accent, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:11, fontWeight:700, flexShrink:0 }}>
              {user?.name?.split(" ").map(n=>n[0]).join("").slice(0,2)}
            </div>
            <div>
              <div style={{ color:"#fff", fontSize:12, fontWeight:500 }}>{user?.name}</div>
              <div style={{ color:"rgba(255,255,255,0.3)", fontSize:10 }}>{user?.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ width:"100%", background:`${P.border}`, border:`1px solid ${P.border}`, color:"rgba(255,255,255,0.30)", borderRadius:8, padding:"6px", fontSize:11, cursor:"pointer", transition:"all 0.2s" }}>Sign out</button>
        </div>
        </div>{/* end sidebar panel */}
      </div>{/* end sidebar trigger zone */}

      {/* MAIN — full width, no sidebar offset */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden", width:"100%" }}>

        {/* TOPBAR HOVER TRIGGER ZONE — invisible strip at top */}
        <div
          onMouseEnter={()=>setTopbarHover(true)}
          onMouseLeave={()=>setTopbarHover(false)}
          style={{ position:"fixed", top:0, left:0, right:0, height: topbarHover ? 54 : 6, zIndex:100 }}
        >
          {/* TOP BAR */}
          <div style={{
            height:54, background:P.sidebar, display:"flex", alignItems:"center",
            justifyContent:"space-between", padding:"0 18px",
            borderBottom:`1px solid ${P.border}`, flexShrink:0, gap:10,
            backdropFilter:"blur(12px)",
            transform: topbarHover ? "translateY(0)" : "translateY(-54px)",
            transition:"transform 0.25s cubic-bezier(0.4,0,0.2,1)",
            willChange:"transform",
            boxShadow: topbarHover ? `0 4px 32px rgba(0,0,0,0.6)` : "none"
          }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0 }}>
            {page==="dashboard" ? (
              editName
                ? <input autoFocus value={dashName} onChange={e=>setDashName(e.target.value)} onBlur={()=>setEditName(false)} onKeyDown={e=>e.key==="Enter"&&setEditName(false)}
                    style={{ fontSize:15, fontWeight:700, color:P.text, border:"none", borderBottom:`2px solid ${accent}`, outline:"none", background:"transparent", minWidth:200 }}/>
                : <span onClick={()=>setEditName(true)} title="Click to rename" style={{ fontSize:15, fontWeight:700, color:P.text, cursor:"pointer" }}>{dashName}</span>
            ) : (
              <span style={{ fontSize:15, fontWeight:700, color:P.text }}>{NAV.find(n=>n.id===page)?.label}</span>
            )}
            {db && page==="dashboard" && (
              <span style={{ background:`${accent}15`, color:accent, fontSize:10, padding:"3px 10px", borderRadius:20, fontWeight:600, flexShrink:0, border:`1px solid ${accent}30` }}>
                {db.domain?.charAt(0).toUpperCase()+db.domain?.slice(1)} · Live
              </span>
            )}
            {drills.map((d,i) => (
              <span key={i} onClick={()=>setDrills(p=>p.slice(0,i))} style={{ background:"#FEF3C7", color:"#92400E", fontSize:10, padding:"3px 10px", borderRadius:20, cursor:"pointer", flexShrink:0 }}>
                🔍 {d.col}: {d.val} ✕
              </span>
            ))}
          </div>
          {/* Page tabs */}
          {page==="dashboard" && db && (
            <div style={{ display:"flex", gap:3, alignItems:"center" }}>
              {pages.map((pg,i) => (
                <button key={i} onClick={()=>setActivePage(i)}
                  onDoubleClick={()=>{ const n=prompt("Rename:",pg); if(n) setPages(p=>p.map((x,j)=>j===i?n:x)); }}
                  style={{ padding:"4px 12px", borderRadius:8, border:`1px solid ${i===activePage?accent:P.border}`, background:i===activePage?accent:"transparent", color:i===activePage?"#fff":P.sub, fontSize:11, cursor:"pointer", fontWeight:i===activePage?600:400 }}>
                  {pg}
                </button>
              ))}
              <button onClick={()=>{ setPages(p=>[...p,`Page ${p.length+1}`]); setActivePage(pages.length); }}
                style={{ padding:"4px 8px", borderRadius:8, border:`1px dashed ${P.border}`, background:"transparent", color:P.sub, fontSize:12, cursor:"pointer" }}>+</button>
            </div>
          )}
          {/* Action buttons */}
          <div style={{ display:"flex", gap:6, alignItems:"center", flexShrink:0 }}>
            {db && page==="dashboard" && (
              <button onClick={()=>setShowAddVisual(s=>!s)}
                style={{ background:showAddVisual?`${accent}20`:`${accent}15`, color:accent, border:`1px solid ${accent}30`, borderRadius:9, padding:"6px 14px", fontSize:12, cursor:"pointer", fontWeight:600 }}>
                {showAddVisual?"✕ Cancel":"+ Visual"}
                
              </button>
            )}
            {db && page === "dashboard" && (
              <button onClick={() => setShowWhatIf(true)}
                style={{ background:"rgba(245,158,11,0.12)", color:"#FCD34D", border:"1px solid rgba(245,158,11,0.25)", borderRadius:9, padding:"6px 14px", fontSize:12, cursor:"pointer", fontWeight:600 }}>
                🔮 What-If
              </button>
)}
            <button onClick={exportPDF} style={{ background:"rgba(220,38,38,0.12)", color:"#F87171", border:"1px solid rgba(220,38,38,0.25)", borderRadius:9, padding:"6px 12px", fontSize:11, cursor:"pointer", fontWeight:500 }}>PDF</button>
            <button onClick={exportExcel} style={{ background:"rgba(22,163,74,0.12)", color:"#4ADE80", border:"1px solid rgba(22,163,74,0.25)", borderRadius:9, padding:"6px 12px", fontSize:11, cursor:"pointer", fontWeight:500 }}>Excel</button>
            <button onClick={()=>setShowUpload(true)}
              style={{ background:accent, color:"#fff", border:"none", borderRadius:9, padding:"7px 16px", fontSize:12, cursor:"pointer", fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
              + Data Source
            </button>
          </div>
          </div>{/* end TOP BAR */}
        </div>{/* end topbar trigger zone */}

        {/* CONTENT — padded top so content starts below where topbar would be */}
        <div style={{ flex:1, overflowY:"auto", background:P.bg, paddingTop:0 }}>
          {/* DASHBOARD PAGE */}
          {page==="dashboard" && (
            <div ref={dashRef} style={{ padding:18 }}>
              {/* Empty State */}
              {!db && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"75vh" }}>
                  <div style={{ textAlign:"center", maxWidth:480 }}>
                    {/* Glowing icon */}
                    <div style={{
                      width:80, height:80, borderRadius:22, margin:"0 auto 24px",
                      background:"linear-gradient(135deg,#7C3AED,#19B6FF)",
                      display:"flex", alignItems:"center", justifyContent:"center",
                      fontSize:36,
                      boxShadow:"0 0 60px rgba(124,58,237,0.35), 0 12px 40px rgba(0,0,0,0.5)"
                    }}>📊</div>
                    <div style={{ fontSize:26, fontWeight:700, color:P.text, marginBottom:8, letterSpacing:"-0.5px" }}>Connect your data</div>
                    <div style={{ fontSize:14, color:P.sub, marginBottom:16, letterSpacing:"0.2px" }}>Excel · CSV · MySQL · PostgreSQL · SQL Server</div>
                    <div style={{
                      fontSize:12, color:accent, marginBottom:32,
                      padding:"7px 18px",
                      background:`${accent}15`,
                      border:`1px solid ${accent}30`,
                      borderRadius:24,
                      display:"inline-block",
                      backdropFilter:"blur(8px)"
                    }}>
                      AI auto-detects domain · cleans data · builds dashboard in 15 seconds
                    </div>
                    <br/>
                    <button onClick={()=>setShowUpload(true)}
                      style={{
                        background:`linear-gradient(135deg, ${accent}, #19B6FF)`,
                        color:"#fff", border:"none", borderRadius:14,
                        padding:"14px 40px", fontSize:15, cursor:"pointer", fontWeight:700,
                        boxShadow:`0 8px 32px ${accent}50, 0 2px 8px rgba(0,0,0,0.4)`,
                        transition:"all 0.2s", letterSpacing:"0.2px"
                      }}
                      onMouseEnter={e=>{ e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 12px 40px ${accent}60, 0 4px 12px rgba(0,0,0,0.5)`; }}
                      onMouseLeave={e=>{ e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow=`0 8px 32px ${accent}50, 0 2px 8px rgba(0,0,0,0.4)`; }}>
                      Connect Data Source
                    </button>
                  </div>
                </div>
              )}
              {db && (
                <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
                  {/* Add Visual Panel */}
                  {showAddVisual && (
                    <AddVisualPanel onAdd={chart=>setCharts(p=>[...p,chart])} cols={db.columns} numCols={numCols} catCols={catCols} palette={P} onClose={()=>setShowAddVisual(false)} existingCount={charts.length}/>
                  )}
                  {/* Filters Bar */}
                  <div style={{ background:P.card, borderRadius:14, padding:"12px 16px", border:`1px solid ${P.border}`, display:"flex", alignItems:"center", gap:14, flexWrap:"wrap" }}>
                    <span style={{ fontSize:10, fontWeight:700, color:P.sub, textTransform:"uppercase", letterSpacing:"0.6px", flexShrink:0 }}>FILTERS & PARAMETERS</span>
                    {filterCols.map(col => {
                      const vals = [...new Set(db.data.map(r=>r[col]))].filter(Boolean).slice(0,25);
                      return (
                        <div key={col} style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <span style={{ fontSize:11, color:P.sub, fontWeight:500 }}>{col}:</span>
                          <select value={filters[col]||""} onChange={e=>setFilters(p=>({...p,[col]:e.target.value}))}
                            style={{ border:`1px solid ${P.border}`, borderRadius:8, padding:"4px 8px", fontSize:11, background:P.bg, color:P.text, cursor:"pointer" }}>
                            <option value="">All</option>
                            {vals.map(v=><option key={v} value={v}>{String(v).slice(0,22)}</option>)}
                          </select>
                        </div>
                      );
                    })}
                    <input placeholder="🔍 Search data..." value={searchText} onChange={e=>setSearchText(e.target.value)}
                      style={{ border:`1px solid ${P.border}`, borderRadius:8, padding:"4px 10px", fontSize:11, background:P.bg, color:P.text, outline:"none", width:140 }}/>
                    <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:10 }}>
                      <span style={{ fontSize:11, color:P.sub }}>{data.length.toLocaleString()} rows</span>
                      <button onClick={()=>{ setFilters({}); setDrills([]); setSearchText(""); }}
                        style={{ background:"transparent", border:`1px solid ${P.border}`, borderRadius:8, padding:"4px 12px", fontSize:11, color:P.sub, cursor:"pointer" }}>Reset</button>
                    </div>
                  </div>
                  {/* AI Insights */}
                  {db.insights && (
                    <div style={{ background:P.card, borderRadius:14, border:`1px solid ${P.border}`, overflow:"hidden" }}>
                      <div onClick={()=>setShowInsights(s=>!s)} style={{ padding:"12px 16px", background:`${accent}08`, borderBottom:`1px solid ${P.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", cursor:"pointer" }}>
                        <div style={{ fontSize:12, fontWeight:700, color:accent }}>🤖 AI Insights — {db.filename} · {db.row_count?.toLocaleString()} rows · {db.col_count} columns</div>
                        <div style={{ fontSize:11, color:P.sub }}>{showInsights?"▲ Hide":"▼ Show"}</div>
                      </div>
                      {showInsights && (
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:0 }}>
                          {[
                            { label:"Summary", value:db.insights.summary, color:accent },
                            { label:"Trend", value:db.insights.trend, color:"#2563EB" },
                            { label:"Recommendation", value:db.insights.recommendation, color:"#059669" },
                            { label:"Highlight", value:db.insights.highlight, color:"#D97706" },
                          ].map((item,i) => (
                            <div key={i} style={{ padding:"14px 16px", borderRight:i%2===0?`1px solid ${P.border}`:"none", borderBottom:`1px solid ${P.border}` }}>
                              <div style={{ fontSize:9, fontWeight:700, color:item.color, textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:5 }}>{item.label}</div>
                              <div style={{ fontSize:12, color:P.text, lineHeight:1.6 }}>{item.value}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  {/* KPI Cards — no orphan Add KPI ghost cell */}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))", gap:12 }}>
                    {kpis.map((kpi,i) => (
                      <KPICard key={i} kpi={kpi} data={data} palette={P} index={i} onRemove={()=>setKpis(p=>p.filter((_,j)=>j!==i))}/>
                    ))}
                  </div>
                  {/* Charts Grid — capped at 5, 2-column top row + 3-column bottom row */}
                  {charts.length > 0 && (() => {
                    const visible = charts.slice(0,5);
                    const top = visible.slice(0,2);
                    const bot = visible.slice(2,5);
                    return (
                      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                        {/* Row 1: 2 wide charts */}
                        {top.length > 0 && (
                          <div style={{ display:"grid", gridTemplateColumns:`repeat(${top.length},1fr)`, gap:14 }}>
                            {top.map((chart,i) => (
                              <div key={chart.id||i} style={{ height:420 }}>
                                <ChartCard chart={chart} data={data} palette={P} index={i} onRemove={()=>setCharts(p=>p.filter((_,j)=>j!==i))}/>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* Row 2: up to 3 charts */}
                        {bot.length > 0 && (
                          <div style={{ display:"grid", gridTemplateColumns:`repeat(${bot.length},1fr)`, gap:14 }}>
                            {bot.map((chart,i) => (
                              <div key={chart.id||(i+2)} style={{ height:380 }}>
                                <ChartCard chart={chart} data={data} palette={P} index={i+2} onRemove={()=>setCharts(p=>p.filter((_,j)=>j!==i+2))}/>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  {/* ── Premium Data Table ── */}
                  <div style={{ background:P.card, borderRadius:18, border:`1px solid rgba(255,255,255,0.06)`, overflow:"hidden", boxShadow:`0 4px 24px rgba(0,0,0,0.4)` }}>
                    {/* Table header bar */}
                    <div style={{ padding:"14px 18px", borderBottom:`1px solid rgba(255,255,255,0.06)`, display:"flex", alignItems:"center", justifyContent:"space-between", background:`linear-gradient(90deg,${accent}0A,transparent)` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:3, height:16, borderRadius:2, background:`linear-gradient(180deg,${accent},#19B6FF)` }}/>
                        <span style={{ fontSize:13, fontWeight:700, color:P.text }}>
                          Data Table
                        </span>
                        <span style={{ fontSize:10, color:P.sub, background:"rgba(255,255,255,0.05)", border:`1px solid rgba(255,255,255,0.08)`, borderRadius:20, padding:"2px 10px" }}>
                          {data.length.toLocaleString()} of {db.row_count?.toLocaleString()} rows
                        </span>
                        {drills.length>0 && <span style={{ color:accent, fontSize:10, background:`${accent}15`, border:`1px solid ${accent}30`, borderRadius:20, padding:"2px 10px" }}>⬡ Drill active</span>}
                      </div>
                      <span style={{ fontSize:10, color:P.sub, opacity:0.6 }}>Click any cell to drill down</span>
                    </div>
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                        <thead>
                          <tr style={{ background:"rgba(255,255,255,0.03)" }}>
                            <th style={{ padding:"9px 14px", textAlign:"left", color:P.sub, fontWeight:700, fontSize:9, letterSpacing:"0.8px", textTransform:"uppercase", borderBottom:`1px solid rgba(255,255,255,0.06)`, whiteSpace:"nowrap", width:32 }}>#</th>
                            {tableCols.map(col => (
                              <th key={col} style={{ padding:"9px 14px", textAlign:"left", color:P.sub, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.6px", fontSize:9, borderBottom:`1px solid rgba(255,255,255,0.06)`, whiteSpace:"nowrap" }}>{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data.slice(0,20).map((row,i) => {
                            const isEven = i%2===0;
                            return (
                              <tr key={i}
                                style={{ background:isEven?"transparent":"rgba(255,255,255,0.015)", borderBottom:`1px solid rgba(255,255,255,0.04)`, transition:"background 0.15s" }}
                                onMouseEnter={e=>e.currentTarget.style.background=`${accent}12`}
                                onMouseLeave={e=>e.currentTarget.style.background=isEven?"transparent":"rgba(255,255,255,0.015)"}>
                                <td style={{ padding:"9px 14px", color:"rgba(255,255,255,0.2)", fontSize:10, fontWeight:500 }}>{i+1}</td>
                                {tableCols.map((col,ci) => {
                                  const raw = row[col];
                                  const val = raw!==null&&raw!==undefined ? String(raw).slice(0,38) : "—";
                                  const isNum = !isNaN(Number(raw)) && raw!==null && raw!=="";
                                  const isStatus = col.toLowerCase().includes("status") || col.toLowerCase().includes("class") || col.toLowerCase().includes("type");
                                  const statusColors = {
                                    "active":   { bg:"rgba(16,185,129,0.15)", color:"#4ADE80", border:"rgba(16,185,129,0.3)" },
                                    "inactive": { bg:"rgba(239,68,68,0.12)",  color:"#F87171", border:"rgba(239,68,68,0.25)" },
                                    "phase-out":{ bg:"rgba(245,158,11,0.12)", color:"#FCD34D", border:"rgba(245,158,11,0.25)" },
                                    "pending":  { bg:"rgba(59,130,246,0.12)", color:"#93C5FD", border:"rgba(59,130,246,0.25)" },
                                    "a":        { bg:"rgba(16,185,129,0.15)", color:"#4ADE80", border:"rgba(16,185,129,0.3)" },
                                    "b":        { bg:"rgba(59,130,246,0.12)", color:"#93C5FD", border:"rgba(59,130,246,0.25)" },
                                    "c":        { bg:"rgba(245,158,11,0.12)", color:"#FCD34D", border:"rgba(245,158,11,0.25)" },
                                  };
                                  const sc = statusColors[val.toLowerCase()];
                                  return (
                                    <td key={col} onClick={()=>{ if(val&&val!=="—") setDrills(p=>[...p,{col,val:String(raw)}]); }}
                                      style={{ padding:"9px 14px", cursor:"pointer", whiteSpace:"nowrap" }}>
                                      {isStatus && sc ? (
                                        <span style={{ fontSize:10, fontWeight:700, color:sc.color, background:sc.bg, border:`1px solid ${sc.border}`, borderRadius:20, padding:"2px 10px", letterSpacing:"0.3px" }}>{val}</span>
                                      ) : isNum ? (
                                        <span style={{ color: ci===0 ? P.text : accent, fontWeight:isNum?600:400, fontVariantNumeric:"tabular-nums" }}>{Number(raw).toLocaleString("en-IN")}</span>
                                      ) : (
                                        <span style={{ color:P.text }}>{val}</span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {data.length>20 && (
                      <div style={{ padding:"10px 18px", fontSize:10, color:P.sub, textAlign:"center", borderTop:`1px solid rgba(255,255,255,0.05)`, background:"rgba(255,255,255,0.01)", letterSpacing:"0.3px" }}>
                        Showing <strong style={{ color:P.text }}>20</strong> of <strong style={{ color:P.text }}>{data.length.toLocaleString()}</strong> rows · Use Excel export for the full dataset
                      </div>
                    )}
                  </div>
                  {/* ── Premium Stats Summary ── */}
                  {db.num_stats && Object.keys(db.num_stats).length>0 && (
                    <div style={{ background:P.card, borderRadius:18, border:`1px solid rgba(255,255,255,0.06)`, overflow:"hidden", boxShadow:`0 4px 24px rgba(0,0,0,0.4)` }}>
                      <div style={{ padding:"14px 18px", borderBottom:`1px solid rgba(255,255,255,0.06)`, display:"flex", alignItems:"center", gap:10, background:`linear-gradient(90deg,rgba(25,182,255,0.06),transparent)` }}>
                        <div style={{ width:3, height:16, borderRadius:2, background:"linear-gradient(180deg,#19B6FF,#10B981)" }}/>
                        <span style={{ fontSize:13, fontWeight:700, color:P.text }}>Statistical Summary</span>
                        <span style={{ fontSize:10, color:P.sub, background:"rgba(255,255,255,0.05)", border:`1px solid rgba(255,255,255,0.08)`, borderRadius:20, padding:"2px 10px" }}>{Object.keys(db.num_stats).length} metrics</span>
                      </div>
                      <div style={{ overflowX:"auto" }}>
                        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                          <thead>
                            <tr style={{ background:"rgba(255,255,255,0.03)" }}>
                              {["Column","Sum","Mean","Max","Min","Count"].map(h=>(
                                <th key={h} style={{ padding:"9px 14px", textAlign:"left", color:P.sub, fontWeight:700, textTransform:"uppercase", fontSize:9, letterSpacing:"0.7px", borderBottom:`1px solid rgba(255,255,255,0.06)` }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(db.num_stats).slice(0,8).map(([col,s],i)=>(
                              <tr key={col} style={{ background:i%2===0?"transparent":"rgba(255,255,255,0.015)", borderBottom:`1px solid rgba(255,255,255,0.04)`, transition:"background 0.15s" }}
                                onMouseEnter={e=>e.currentTarget.style.background=`rgba(124,58,237,0.08)`}
                                onMouseLeave={e=>e.currentTarget.style.background=i%2===0?"transparent":"rgba(255,255,255,0.015)"}>
                                <td style={{ padding:"9px 14px", color:P.text, fontWeight:600, whiteSpace:"nowrap" }}>{col}</td>
                                <td style={{ padding:"9px 14px", color:"#A78BFA", fontWeight:600, fontVariantNumeric:"tabular-nums" }}>{s.sum!=null?Number(s.sum).toLocaleString("en-IN"):"—"}</td>
                                <td style={{ padding:"9px 14px", color:"#93C5FD", fontVariantNumeric:"tabular-nums" }}>{s.mean!=null?Number(s.mean.toFixed(2)).toLocaleString("en-IN"):"—"}</td>
                                <td style={{ padding:"9px 14px", fontWeight:700, fontVariantNumeric:"tabular-nums" }}>
                                  <span style={{ color:"#4ADE80", background:"rgba(16,185,129,0.12)", border:"1px solid rgba(16,185,129,0.25)", borderRadius:6, padding:"2px 8px" }}>
                                    {s.max!=null?Number(s.max).toLocaleString("en-IN"):"—"}
                                  </span>
                                </td>
                                <td style={{ padding:"9px 14px", fontWeight:700, fontVariantNumeric:"tabular-nums" }}>
                                  <span style={{ color:"#F87171", background:"rgba(239,68,68,0.10)", border:"1px solid rgba(239,68,68,0.22)", borderRadius:6, padding:"2px 8px" }}>
                                    {s.min!=null?Number(s.min).toLocaleString("en-IN"):"—"}
                                  </span>
                                </td>
                                <td style={{ padding:"9px 14px", color:P.sub, fontVariantNumeric:"tabular-nums" }}>{s.count!=null?Number(s.count).toLocaleString():"—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          {/* ANALYTICS PAGE */}
          {page==="analytics" && (
            <div style={{ padding:18 }}>
              {!db ? <div style={{ background:P.card, borderRadius:14, padding:40, textAlign:"center", color:P.sub, border:`1px solid ${P.border}` }}>Connect a data source first</div>
              : <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(360px,1fr))", gap:14 }}>
                  {charts.map((chart,i) => (
                    <div key={i} style={{ height:300 }}>
                      <ChartCard chart={{ ...chart, type:"smoothArea" }} data={data} palette={P} index={i}/>
                    </div>
                  ))}
                </div>
              }
            </div>
          )}
          {/* MY FILES */}
          {page==="files" && (
            <div style={{ padding:18 }}>
              <button onClick={()=>setShowUpload(true)} style={{ background:`linear-gradient(135deg,${accent},#19B6FF)`, color:"#fff", border:"none", borderRadius:10, padding:"9px 18px", fontSize:12, cursor:"pointer", fontWeight:600, marginBottom:16, boxShadow:`0 4px 20px ${accent}40` }}>+ Connect New Data Source</button>
              {sources.length===0
                ? <div style={{ background:P.card, borderRadius:14, padding:40, textAlign:"center", color:P.sub, border:`1px solid ${P.border}` }}>No data sources connected yet</div>
                : sources.map((s,i) => (
                  <div key={i} style={{ background:P.card, borderRadius:14, padding:"16px 20px", border:`1px solid ${P.border}`, marginBottom:10, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                      <div style={{ width:42, height:42, borderRadius:12, background:`${accent}15`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>
                        {s.source_type==="csv"?"📄":s.source_type==="mysql"?"🐬":s.source_type==="sqlserver"?"🖥":"📊"}
                      </div>
                      <div>
                        <div style={{ fontSize:14, fontWeight:600, color:P.text }}>{s.filename}</div>
                        <div style={{ fontSize:11, color:P.sub, marginTop:2 }}>{s.rows?.toLocaleString()} rows · {s.cols} columns · {s.domain} domain</div>
                      </div>
                    </div>
                    <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                      <span style={{ background:`${accent}15`, color:accent, fontSize:10, padding:"3px 10px", borderRadius:20, fontWeight:600 }}>{s.source_type?.toUpperCase()}</span>
                      <button onClick={()=>setPage("dashboard")} style={{ background:accent, color:"#fff", border:"none", borderRadius:9, padding:"6px 16px", fontSize:11, cursor:"pointer", fontWeight:600 }}>View</button>
                    </div>
                  </div>
                ))
              }
            </div>
          )}
          {/* EXPORT */}
          {page==="export" && (
            <div style={{ padding:18, maxWidth:580 }}>
              <div style={{ background:P.card, borderRadius:14, padding:"22px 24px", border:`1px solid ${P.border}`, marginBottom:12 }}>
                <div style={{ fontSize:14, fontWeight:700, color:P.text, marginBottom:18 }}>Export Options</div>
                {[
                  { label:"Export as PDF", desc:"Full dashboard screenshot — A4 Landscape", action:exportPDF, color:"#F87171", bg:"rgba(220,38,38,0.10)", border:"rgba(220,38,38,0.20)", icon:"📄" },
                  { label:"Export as Excel", desc:"Current filtered data as .xlsx spreadsheet", action:exportExcel, color:"#4ADE80", bg:"rgba(22,163,74,0.10)", border:"rgba(22,163,74,0.20)", icon:"📊" },
                ].map((item,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 0", borderBottom:i===0?`1px solid ${P.border}`:"none" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:14 }}>
                      <div style={{ width:44, height:44, background:item.bg, borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22, border:`1px solid ${item.border}` }}>{item.icon}</div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:600, color:P.text }}>{item.label}</div>
                        <div style={{ fontSize:11, color:P.sub, marginTop:2 }}>{item.desc}</div>
                      </div>
                    </div>
                    <button onClick={item.action} style={{ background:item.color, color:"#fff", border:"none", borderRadius:10, padding:"8px 18px", fontSize:12, fontWeight:600, cursor:"pointer" }}>Download</button>
                  </div>
                ))}
              </div>
              {db && (
                <div style={{ background:P.card, borderRadius:14, padding:"18px 24px", border:`1px solid ${P.border}` }}>
                  <div style={{ fontSize:13, fontWeight:600, color:P.text, marginBottom:12 }}>Dashboard Stats</div>
                  {[["Source",db.filename],["Domain",db.domain],["Total Rows",db.row_count?.toLocaleString()],["Columns",db.col_count],["Filtered",data.length.toLocaleString()],["Charts",charts.length],["KPIs",kpis.length]].map(([k,v])=>(
                    <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${P.border}80`, fontSize:12 }}>
                      <span style={{ color:P.sub }}>{k}</span>
                      <span style={{ color:P.text, fontWeight:600 }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* SETTINGS */}
          {page==="settings" && (
            <div style={{ padding:18, maxWidth:580 }}>
              <div style={{ background:P.card, borderRadius:14, padding:"22px 24px", border:`1px solid ${P.border}`, marginBottom:12 }}>
                <div style={{ fontSize:14, fontWeight:700, color:P.text, marginBottom:14 }}>Dashboard Name</div>
                <input value={dashName} onChange={e=>setDashName(e.target.value)}
                  style={{ width:"100%", padding:"10px 14px", border:`1px solid ${P.border}`, borderRadius:10, fontSize:13, outline:"none", background:P.bg, color:P.text }}/>
                <div style={{ fontSize:11, color:P.sub, marginTop:6 }}>You can also click the title in the top bar to rename directly</div>
              </div>
              <div style={{ background:P.card, borderRadius:14, padding:"22px 24px", border:`1px solid ${P.border}` }}>
                <div style={{ fontSize:14, fontWeight:700, color:P.text, marginBottom:12 }}>Profile</div>
                {[["Name",user?.name],["Email",user?.email],["Role",user?.role]].map(([k,v])=>(
                  <div key={k} style={{ display:"flex", justifyContent:"space-between", padding:"8px 0", borderBottom:`1px solid ${P.border}80`, fontSize:13 }}>
                    <span style={{ color:P.sub }}>{k}</span>
                    <span style={{ color:P.text, fontWeight:600 }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        {/* BOTTOM PAGE TABS */}
        {db && page==="dashboard" && (
          <div style={{ height:36, background:P.sidebar, borderTop:`1px solid ${P.border}`, display:"flex", alignItems:"center", padding:"0 10px", gap:3, flexShrink:0 }}>
            {pages.map((pg,i)=>(
              <div key={i} onDoubleClick={()=>{ const n=prompt("Rename page:",pg); if(n) setPages(p=>p.map((x,j)=>j===i?n:x)); }} onClick={()=>setActivePage(i)}
                style={{ padding:"3px 14px", borderRadius:"6px 6px 0 0", cursor:"pointer", fontSize:11, fontWeight:activePage===i?600:400, background:activePage===i?accent:"transparent", color:activePage===i?"#fff":P.sub, border:`1px solid ${activePage===i?accent:P.border}`, borderBottom:"none", userSelect:"none" }}>
                {pg}
              </div>
            ))}
            <button onClick={()=>{ setPages(p=>[...p,`Page ${p.length+1}`]); setActivePage(pages.length); }}
              style={{ padding:"3px 10px", borderRadius:"6px 6px 0 0", cursor:"pointer", fontSize:13, background:"transparent", border:`1px dashed ${P.border}`, borderBottom:"none", color:P.sub, lineHeight:1 }}>+</button>
            {pages.length>1 && (
              <button onClick={()=>{ setPages(p=>p.filter((_,j)=>j!==activePage)); setActivePage(0); }}
                style={{ marginLeft:"auto", padding:"3px 10px", borderRadius:6, cursor:"pointer", fontSize:10, background:"#FEF2F2", border:"1px solid #FECACA", color:"#DC2626" }}>
                Delete Page
              </button>
            )}
          </div>
        )}
      </div>
      {/* AI CHATBOT */}
      <AIChatbot db={db} accent={accent} palette={P} onCommand={handleAICommand}/>
    </div>
  );
}
