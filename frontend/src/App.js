import WhatIf from "./WhatIf";
import { useState, useRef } from "react";
import axios from "axios";
import Login from "./Login";
import UploadModal from "./UploadModal";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, ScatterChart, Scatter,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Treemap, ComposedChart
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
  default:  { name:"Default",    sidebar:"#111827", accent:"#7C3AED", accentLight:"#EDE9FE", bg:"#F9FAFB", card:"#FFFFFF", text:"#111827", sub:"#6B7280", border:"#E5E7EB" },
  finance:  { name:"Finance",    sidebar:"#0F172A", accent:"#2563EB", accentLight:"#DBEAFE", bg:"#F0F4FF", card:"#FFFFFF", text:"#0F172A", sub:"#64748B", border:"#E2E8F0" },
  dark:     { name:"Dark",       sidebar:"#0A0A0F", accent:"#8B5CF6", accentLight:"#2D1B69", bg:"#0F0F1A", card:"#1A1A2E", text:"#F9FAFB", sub:"#9CA3AF", border:"#374151" },
  healthcare:{ name:"Healthcare",sidebar:"#064E3B", accent:"#059669", accentLight:"#D1FAE5", bg:"#F0FDF4", card:"#FFFFFF", text:"#064E3B", sub:"#6B7280", border:"#D1FAE5" },
  retail:   { name:"Retail",     sidebar:"#431407", accent:"#EA580C", accentLight:"#FED7AA", bg:"#FFF7ED", card:"#FFFFFF", text:"#431407", sub:"#78716C", border:"#FED7AA" },
};

const CHART_COLORS = ["#7C3AED","#2563EB","#059669","#D97706","#DC2626","#DB2777","#0891B2","#65A30D"];

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
      transition: "all 0.2s",
      minWidth: 0
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
        <span style={{ fontSize:11, color:"#059669", background:"#D1FAE5", padding:"2px 8px", borderRadius:20, fontWeight:600 }}>▲ Live</span>
        <span style={{ fontSize:11, color:palette.sub }}>{kpi.aggregation}</span>
      </div>
    </div>
  );
}

function ChartCard({ chart, data, palette, onRemove }) {
  const [type, setType] = useState(chart.type || "bar");
  const [editTitle, setEditTitle] = useState(false);
  const [title, setTitle] = useState(chart.title);
  const d = (data||[]).slice(0, 60);
  const accent = palette.accent;

  const TYPES = ["bar","line","area","pie","donut","scatter","radar","treemap","composed","table"];
  const ax = { tick:{ fontSize:10, fill:palette.sub }, axisLine:{ stroke:palette.border }, tickLine:false };
  const tp = { contentStyle:{ borderRadius:10, border:`1px solid ${palette.border}`, fontSize:11, background:palette.card, color:palette.text, boxShadow:"0 4px 20px rgba(0,0,0,0.1)" } };

  function render() {
    if (!chart.x_column || !chart.y_column) return (
      <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:8, color:palette.sub }}>
        <span style={{ fontSize:32, opacity:0.3 }}>📊</span>
        <span style={{ fontSize:12 }}>No columns configured</span>
      </div>
    );

    if (type === "table") return (
      <div style={{ overflowY:"auto", height:"100%" }}>
        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
          <thead><tr style={{ background:palette.bg }}>
            {[chart.x_column, chart.y_column].map(k => (
              <th key={k} style={{ padding:"8px 12px", textAlign:"left", color:palette.sub, fontWeight:600, textTransform:"uppercase", fontSize:9, letterSpacing:"0.5px", borderBottom:`1px solid ${palette.border}` }}>{k}</th>
            ))}
          </tr></thead>
          <tbody>{d.slice(0,12).map((row,i) => (
            <tr key={i} style={{ borderBottom:`1px solid ${palette.border}88` }}>
              {[chart.x_column, chart.y_column].map(k => (
                <td key={k} style={{ padding:"7px 12px", color:palette.text, fontSize:11 }}>{row[k]!==null?String(row[k]).slice(0,30):"—"}</td>
              ))}
            </tr>
          ))}</tbody>
        </table>
      </div>
    );

    if (type === "treemap") return (
      <ResponsiveContainer width="100%" height="100%">
        <Treemap data={d.map(r=>({ name:String(r[chart.x_column]), size:Math.abs(Number(r[chart.y_column]))||1 }))} dataKey="size" stroke={palette.card} fill={accent}>
          <Tooltip {...tp}/>
        </Treemap>
      </ResponsiveContainer>
    );

    if (type === "radar") return (
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={d.slice(0,8)}>
          <PolarGrid stroke={palette.border}/><PolarAngleAxis dataKey={chart.x_column} tick={{fontSize:10, fill:palette.sub}}/>
          <PolarRadiusAxis tick={{fontSize:9, fill:palette.sub}}/>
          <Radar dataKey={chart.y_column} stroke={accent} fill={accent} fillOpacity={0.2}/>
          <Tooltip {...tp}/>
        </RadarChart>
      </ResponsiveContainer>
    );

    if (type === "pie" || type === "donut") return (
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={d.slice(0,10)} dataKey={chart.y_column} nameKey={chart.x_column}
            cx="50%" cy="50%" outerRadius="70%" innerRadius={type==="donut"?"40%":"0%"}
            label={({name, percent}) => `${String(name).slice(0,8)} ${(percent*100).toFixed(0)}%`}
            labelLine={{ stroke:palette.sub, strokeWidth:1 }}>
            {d.slice(0,10).map((_,i) => <Cell key={i} fill={CHART_COLORS[i%CHART_COLORS.length]}/>)}
          </Pie>
          <Tooltip {...tp}/><Legend iconSize={8} wrapperStyle={{ fontSize:10, color:palette.sub }}/>
        </PieChart>
      </ResponsiveContainer>
    );

    if (type === "scatter") return (
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart><CartesianGrid strokeDasharray="3 3" stroke={`${palette.border}80`}/>
          <XAxis dataKey={chart.x_column} {...ax}/><YAxis dataKey={chart.y_column} {...ax}/>
          <Tooltip {...tp}/><Scatter data={d} fill={accent} opacity={0.7} r={4}/>
        </ScatterChart>
      </ResponsiveContainer>
    );

    if (type === "composed") return (
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={d}>
          <CartesianGrid strokeDasharray="3 3" stroke={`${palette.border}80`}/>
          <XAxis dataKey={chart.x_column} {...ax}/><YAxis {...ax}/>
          <Tooltip {...tp}/><Legend iconSize={8} wrapperStyle={{ fontSize:10 }}/>
          <Bar dataKey={chart.y_column} fill={accent} radius={[4,4,0,0]} opacity={0.8}/>
          <Line type="monotone" dataKey={chart.y_column} stroke="#D97706" strokeWidth={2} dot={false}/>
        </ComposedChart>
      </ResponsiveContainer>
    );

    if (type === "area") return (
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={d}>
          <defs><linearGradient id={`grad_${chart.title}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={accent} stopOpacity={0.3}/>
            <stop offset="95%" stopColor={accent} stopOpacity={0}/>
          </linearGradient></defs>
          <CartesianGrid strokeDasharray="3 3" stroke={`${palette.border}80`}/>
          <XAxis dataKey={chart.x_column} {...ax}/><YAxis {...ax}/>
          <Tooltip {...tp}/><Legend iconSize={8} wrapperStyle={{ fontSize:10 }}/>
          <Area type="monotone" dataKey={chart.y_column} stroke={accent} strokeWidth={2.5} fill={`url(#grad_${chart.title})`}/>
        </AreaChart>
      </ResponsiveContainer>
    );

    if (type === "line") return (
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={d}>
          <CartesianGrid strokeDasharray="3 3" stroke={`${palette.border}80`}/>
          <XAxis dataKey={chart.x_column} {...ax}/><YAxis {...ax}/>
          <Tooltip {...tp}/><Legend iconSize={8} wrapperStyle={{ fontSize:10 }}/>
          <Line type="monotone" dataKey={chart.y_column} stroke={accent} strokeWidth={2.5} dot={false} activeDot={{ r:5, fill:accent }}/>
        </LineChart>
      </ResponsiveContainer>
    );

    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={d}>
          <CartesianGrid strokeDasharray="3 3" stroke={`${palette.border}80`}/>
          <XAxis dataKey={chart.x_column} {...ax}/><YAxis {...ax}/>
          <Tooltip {...tp}/><Legend iconSize={8} wrapperStyle={{ fontSize:10 }}/>
          <Bar dataKey={chart.y_column} radius={[6,6,0,0]}>
            {d.map((_,i) => <Cell key={i} fill={type==="bar" ? accent : CHART_COLORS[i%CHART_COLORS.length]}/>)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <div style={{ background:palette.card, borderRadius:16, border:`1px solid ${palette.border}`, overflow:"hidden", display:"flex", flexDirection:"column", height:"100%" }}>
      {/* Chart Header */}
      <div style={{ padding:"14px 16px 10px", display:"flex", alignItems:"center", gap:8, flexShrink:0, borderBottom:`1px solid ${palette.border}80` }}>
        <div style={{ width:4, height:18, borderRadius:2, background:accent, flexShrink:0 }}/>
        {editTitle
          ? <input autoFocus value={title} onChange={e=>setTitle(e.target.value)} onBlur={()=>setEditTitle(false)} onKeyDown={e=>e.key==="Enter"&&setEditTitle(false)}
              style={{ flex:1, fontSize:13, fontWeight:600, border:"none", borderBottom:`2px solid ${accent}`, outline:"none", background:"transparent", color:palette.text }}/>
          : <div onClick={()=>setEditTitle(true)} style={{ flex:1, fontSize:13, fontWeight:600, color:palette.text, cursor:"pointer", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }} title="Click to rename">{title}</div>
        }
        <select value={type} onChange={e=>setType(e.target.value)}
          style={{ fontSize:10, border:`1px solid ${palette.border}`, borderRadius:8, padding:"3px 8px", color:palette.sub, background:palette.bg, cursor:"pointer" }}>
          {TYPES.map(t=><option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
        </select>
        {onRemove && <button onClick={onRemove} style={{ background:"none", border:"none", color:palette.sub, cursor:"pointer", fontSize:14, opacity:0.5, padding:0 }}>✕</button>}
      </div>

      {/* Chart Body */}
      <div style={{ flex:1, padding:"8px 8px 12px", minHeight:0 }}>{render()}</div>
    </div>
  );
}

function AddVisualPanel({ onAdd, cols, numCols, catCols, palette, onClose }) {
  const [type, setType] = useState("bar");
  const [xCol, setXCol] = useState(catCols[0]||cols[0]||"");
  const [yCol, setYCol] = useState(numCols[0]||cols[0]||"");
  const [title, setTitle] = useState("");
  const [size, setSize] = useState("medium");
  const allCols = [...new Set([...catCols,...numCols])];
  const accent = palette.accent;

  const CHART_TYPES = [
    {v:"bar",l:"📊 Bar"},{v:"line",l:"📈 Line"},{v:"area",l:"🌊 Area"},
    {v:"pie",l:"🥧 Pie"},{v:"donut",l:"⭕ Donut"},{v:"scatter",l:"✦ Scatter"},
    {v:"radar",l:"🕸 Radar"},{v:"treemap",l:"🗂 Treemap"},{v:"composed",l:"📉 Composed"},{v:"table",l:"📋 Table"}
  ];

  const inp = { width:"100%", padding:"9px 12px", borderRadius:10, border:`1px solid ${palette.border}`, fontSize:13, outline:"none", background:palette.bg, color:palette.text, marginBottom:12 };
  const lbl = { fontSize:11, color:palette.sub, display:"block", marginBottom:5, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.4px" };

  return (
    <div style={{ background:palette.card, borderRadius:16, border:`2px solid ${accent}`, padding:20, marginBottom:16 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ fontSize:14, fontWeight:700, color:palette.text }}>+ Add Visual</div>
        <button onClick={onClose} style={{ background:"none", border:"none", color:palette.sub, fontSize:18, cursor:"pointer" }}>✕</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
        <div>
          <label style={lbl}>Chart Type</label>
          <select value={type} onChange={e=>setType(e.target.value)} style={{...inp, marginBottom:0}}>
            {CHART_TYPES.map(t=><option key={t.v} value={t.v}>{t.l}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Size</label>
          <select value={size} onChange={e=>setSize(e.target.value)} style={{...inp, marginBottom:0}}>
            <option value="small">Small</option><option value="medium">Medium</option><option value="large">Large (Full Width)</option>
          </select>
        </div>
        <div>
          <label style={lbl}>X Axis Column</label>
          <select value={xCol} onChange={e=>setXCol(e.target.value)} style={{...inp, marginBottom:0}}>
            {allCols.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Y Axis Column</label>
          <select value={yCol} onChange={e=>setYCol(e.target.value)} style={{...inp, marginBottom:0}}>
            {allCols.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginBottom:14 }}>
        <label style={lbl}>Chart Title</label>
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Enter chart title..." style={inp}/>
      </div>
      <button onClick={()=>{ onAdd({ id:`c${Date.now()}`, type, title:title||`${type} chart`, x_column:xCol, y_column:yCol, size }); onClose(); }}
        style={{ background:accent, color:"#fff", border:"none", borderRadius:10, padding:"10px 24px", fontSize:13, fontWeight:600, cursor:"pointer" }}>
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
          border:`1px solid ${palette.border}`, boxShadow:"0 12px 48px rgba(0,0,0,0.15)",
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
  const [paletteKey, setPaletteKey] = useState("default");
  const [pages, setPages] = useState(["Page 1"]);
  const [activePage, setActivePage] = useState(0);
  const [showInsights, setShowInsights] = useState(true);
  const dashRef = useRef(null);
  const P = PALETTES[paletteKey];
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
    // Auto-set palette based on domain
    const domainMap = { finance:"finance", healthcare:"healthcare", retail:"retail" };
    if (domainMap[data.domain]) setPaletteKey(domainMap[data.domain]);
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
    if (action.type === "change_theme") {
      const map = { dark:"dark", finance:"finance", healthcare:"healthcare", retail:"retail", default:"default", light:"default" };
      if (map[action.theme]) setPaletteKey(map[action.theme]);
    }
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
  <WhatIf
    db={db}
    data={data}
    kpis={kpis}
    accent={accent}
    palette={P}
    onClose={() => setShowWhatIf(false)}
  />
)}

      {/* SIDEBAR */}
      <div style={{ width:220, background:P.sidebar, display:"flex", flexDirection:"column", flexShrink:0, borderRight:"1px solid rgba(255,255,255,0.05)" }}>
        {/* Logo */}
        <div style={{ padding:"20px 18px 16px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:10, background:accent, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>📊</div>
            <div>
              <div style={{ color:"#fff", fontSize:15, fontWeight:700 }}>DataDash</div>
              <div style={{ color:"rgba(255,255,255,0.35)", fontSize:10, marginTop:1 }}>Production BI Platform</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding:"12px 10px", flex:1 }}>
          {NAV.map(n=>(
            <div key={n.id} onClick={()=>setPage(n.id)} style={{
              display:"flex", alignItems:"center", gap:10, padding:"9px 12px",
              borderRadius:10, marginBottom:2, cursor:"pointer",
              background:page===n.id?`${accent}25`:"transparent",
              color:page===n.id?accent:"rgba(255,255,255,0.4)",
              fontSize:13, fontWeight:page===n.id?600:400, transition:"all 0.15s",
              borderLeft:page===n.id?`3px solid ${accent}`:"3px solid transparent"
            }}>
              <span style={{ fontSize:15 }}>{n.icon}</span>{n.label}
            </div>
          ))}

          {/* Connected Sources */}
          {sources.length > 0 && (
            <div style={{ marginTop:20 }}>
              <div style={{ fontSize:9, color:"rgba(255,255,255,0.25)", textTransform:"uppercase", letterSpacing:"0.8px", padding:"0 12px 8px", fontWeight:600 }}>Connected Sources</div>
              {sources.map((s,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:8, padding:"5px 12px", borderRadius:8, marginBottom:2 }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:"#10B981", flexShrink:0 }}/>
                  <span style={{ color:"rgba(255,255,255,0.45)", fontSize:11, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{s.filename}</span>
                  <span style={{ color:"rgba(255,255,255,0.2)", fontSize:9, marginLeft:"auto", flexShrink:0 }}>{s.rows?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </nav>

        {/* User */}
        <div style={{ padding:"14px 16px", borderTop:"1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
            <div style={{ width:32, height:32, borderRadius:"50%", background:accent, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:11, fontWeight:700, flexShrink:0 }}>
              {user?.name?.split(" ").map(n=>n[0]).join("").slice(0,2)}
            </div>
            <div>
              <div style={{ color:"#fff", fontSize:12, fontWeight:500 }}>{user?.name}</div>
              <div style={{ color:"rgba(255,255,255,0.3)", fontSize:10 }}>{user?.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ width:"100%", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.08)", color:"rgba(255,255,255,0.35)", borderRadius:8, padding:"6px", fontSize:11, cursor:"pointer" }}>Sign out</button>
        </div>
      </div>

      {/* MAIN */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>

        {/* TOP BAR */}
        <div style={{ height:54, background:P.card, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 18px", borderBottom:`1px solid ${P.border}`, flexShrink:0, gap:10 }}>
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
                style={{background: "#FEF3C7", color: "#92400E",border: "1px solid #FDE68A", borderRadius: 9,padding: "6px 14px", fontSize: 12,cursor: "pointer", fontWeight: 600
         }}>
         🔮 What-If
  </button>
)}
            <button onClick={exportPDF} style={{ background:"#FEF2F2", color:"#DC2626", border:"1px solid #FECACA", borderRadius:9, padding:"6px 12px", fontSize:11, cursor:"pointer", fontWeight:500 }}>PDF</button>
            <button onClick={exportExcel} style={{ background:"#F0FDF4", color:"#16A34A", border:"1px solid #BBF7D0", borderRadius:9, padding:"6px 12px", fontSize:11, cursor:"pointer", fontWeight:500 }}>Excel</button>
            <button onClick={()=>setShowUpload(true)}
              style={{ background:accent, color:"#fff", border:"none", borderRadius:9, padding:"7px 16px", fontSize:12, cursor:"pointer", fontWeight:600, display:"flex", alignItems:"center", gap:6 }}>
              + Data Source
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div style={{ flex:1, overflowY:"auto", background:P.bg }}>

          {/* DASHBOARD PAGE */}
          {page==="dashboard" && (
            <div ref={dashRef} style={{ padding:18 }}>

              {/* Empty State */}
              {!db && (
                <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"75vh" }}>
                  <div style={{ textAlign:"center", maxWidth:480 }}>
                    <div style={{ fontSize:64, marginBottom:20 }}>📊</div>
                    <div style={{ fontSize:24, fontWeight:700, color:P.text, marginBottom:8 }}>Connect your data</div>
                    <div style={{ fontSize:14, color:P.sub, marginBottom:6 }}>Excel · CSV · MySQL · PostgreSQL · SQL Server</div>
                    <div style={{ fontSize:12, color:accent, marginBottom:28, padding:"6px 16px", background:`${accent}10`, borderRadius:20, display:"inline-block" }}>
                      AI auto-detects domain · cleans data · builds dashboard in 15 seconds
                    </div>
                    <br/>
                    <button onClick={()=>setShowUpload(true)}
                      style={{ background:accent, color:"#fff", border:"none", borderRadius:12, padding:"14px 36px", fontSize:15, cursor:"pointer", fontWeight:700, boxShadow:`0 4px 20px ${accent}40` }}>
                      Connect Data Source
                    </button>
                  </div>
                </div>
              )}

              {db && (
                <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

                  {/* Add Visual Panel */}
                  {showAddVisual && (
                    <AddVisualPanel onAdd={chart=>setCharts(p=>[...p,chart])} cols={db.columns} numCols={numCols} catCols={catCols} palette={P} onClose={()=>setShowAddVisual(false)}/>
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

                  {/* KPI Cards */}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))", gap:12 }}>
                    {kpis.map((kpi,i) => (
                      <KPICard key={i} kpi={kpi} data={data} palette={P} index={i} onRemove={()=>setKpis(p=>p.filter((_,j)=>j!==i))}/>
                    ))}
                    <button onClick={()=>{ if(numCols.length>0) setKpis(p=>[...p,{ label:"New KPI", column:numCols[0], aggregation:"sum", prefix:"", suffix:"" }]); }}
                      style={{ background:"transparent", border:`2px dashed ${P.border}`, borderRadius:16, padding:"20px 18px", cursor:"pointer", color:P.sub, fontSize:12, fontWeight:500, display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all 0.2s" }}>
                      + Add KPI
                    </button>
                  </div>

                  {/* Charts Grid */}
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(360px,1fr))", gap:14 }}>
                    {charts.map((chart,i) => (
                      <div key={chart.id||i} style={{ height:320 }}>
                        <ChartCard chart={chart} data={data} palette={P} onRemove={()=>setCharts(p=>p.filter((_,j)=>j!==i))}/>
                      </div>
                    ))}
                  </div>

                  {/* Data Table */}
                  <div style={{ background:P.card, borderRadius:14, border:`1px solid ${P.border}`, overflow:"hidden" }}>
                    <div style={{ padding:"13px 16px", borderBottom:`1px solid ${P.border}`, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                      <div style={{ fontSize:13, fontWeight:700, color:P.text }}>
                        Data Table — {data.length.toLocaleString()} of {db.row_count?.toLocaleString()} rows
                        {drills.length>0 && <span style={{ color:accent, marginLeft:8, fontSize:11 }}>· Drill active</span>}
                      </div>
                      <div style={{ fontSize:11, color:P.sub }}>Click cell to drill down</div>
                    </div>
                    <div style={{ overflowX:"auto" }}>
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                        <thead>
                          <tr style={{ background:P.bg }}>
                            {tableCols.map(col => (
                              <th key={col} style={{ padding:"10px 14px", textAlign:"left", color:P.sub, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.4px", fontSize:10, borderBottom:`1px solid ${P.border}`, whiteSpace:"nowrap" }}>{col}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data.slice(0,20).map((row,i) => (
                            <tr key={i} style={{ borderBottom:`1px solid ${P.border}80`, transition:"background 0.1s" }}
                              onMouseEnter={e=>e.currentTarget.style.background=`${accent}08`}
                              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                              {tableCols.map(col => (
                                <td key={col} onClick={()=>{ const v=String(row[col]); if(v&&v!=="null") setDrills(p=>[...p,{col,val:v}]); }}
                                  style={{ padding:"9px 14px", color:P.text, cursor:"pointer", whiteSpace:"nowrap" }}>
                                  {row[col]!==null&&row[col]!==undefined?String(row[col]).slice(0,35):"—"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {data.length>20 && (
                      <div style={{ padding:"10px 16px", fontSize:11, color:P.sub, textAlign:"center", borderTop:`1px solid ${P.border}80` }}>
                        Showing 20 of {data.length.toLocaleString()} rows · Export Excel for full data
                      </div>
                    )}
                  </div>

                  {/* Stats Summary */}
                  {db.num_stats && Object.keys(db.num_stats).length>0 && (
                    <div style={{ background:P.card, borderRadius:14, border:`1px solid ${P.border}`, overflow:"hidden" }}>
                      <div style={{ padding:"13px 16px", borderBottom:`1px solid ${P.border}` }}>
                        <div style={{ fontSize:13, fontWeight:700, color:P.text }}>Statistical Summary</div>
                      </div>
                      <div style={{ overflowX:"auto" }}>
                        <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                          <thead>
                            <tr style={{ background:P.bg }}>
                              {["Column","Sum","Mean","Max","Min","Count"].map(h=>(
                                <th key={h} style={{ padding:"9px 14px", textAlign:"left", color:P.sub, fontWeight:600, textTransform:"uppercase", fontSize:10, letterSpacing:"0.4px", borderBottom:`1px solid ${P.border}` }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(db.num_stats).slice(0,8).map(([col,s])=>(
                              <tr key={col} style={{ borderBottom:`1px solid ${P.border}80` }}>
                                <td style={{ padding:"8px 14px", color:P.text, fontWeight:600 }}>{col}</td>
                                <td style={{ padding:"8px 14px", color:P.text }}>{s.sum?.toLocaleString("en-IN")}</td>
                                <td style={{ padding:"8px 14px", color:P.text }}>{s.mean?.toLocaleString("en-IN")}</td>
                                <td style={{ padding:"8px 14px", color:"#059669", fontWeight:600 }}>{s.max?.toLocaleString("en-IN")}</td>
                                <td style={{ padding:"8px 14px", color:"#DC2626", fontWeight:600 }}>{s.min?.toLocaleString("en-IN")}</td>
                                <td style={{ padding:"8px 14px", color:P.text }}>{s.count?.toLocaleString()}</td>
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
                      <ChartCard chart={{ ...chart, type:"area" }} data={data} palette={P}/>
                    </div>
                  ))}
                </div>
              }
            </div>
          )}

          {/* MY FILES */}
          {page==="files" && (
            <div style={{ padding:18 }}>
              <button onClick={()=>setShowUpload(true)} style={{ background:accent, color:"#fff", border:"none", borderRadius:10, padding:"9px 18px", fontSize:12, cursor:"pointer", fontWeight:600, marginBottom:16 }}>+ Connect New Data Source</button>
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
                  { label:"Export as PDF", desc:"Full dashboard screenshot — A4 Landscape", action:exportPDF, color:"#DC2626", bg:"#FEF2F2", border:"#FECACA", icon:"📄" },
                  { label:"Export as Excel", desc:"Current filtered data as .xlsx spreadsheet", action:exportExcel, color:"#16A34A", bg:"#F0FDF4", border:"#BBF7D0", icon:"📊" },
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
                <div style={{ fontSize:14, fontWeight:700, color:P.text, marginBottom:16 }}>Theme</div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))", gap:10 }}>
                  {Object.entries(PALETTES).map(([key,pal])=>(
                    <div key={key} onClick={()=>setPaletteKey(key)} style={{
                      padding:"12px 14px", borderRadius:12, cursor:"pointer",
                      border:paletteKey===key?`2px solid ${pal.accent}`:`1px solid ${P.border}`,
                      background:paletteKey===key?`${pal.accent}10`:P.bg,
                      display:"flex", alignItems:"center", gap:10, transition:"all 0.2s"
                    }}>
                      <div style={{ width:18, height:18, borderRadius:6, background:pal.accent, flexShrink:0 }}/>
                      <span style={{ fontSize:12, fontWeight:500, color:P.text }}>{pal.name}</span>
                      {paletteKey===key && <span style={{ fontSize:10, color:pal.accent, marginLeft:"auto" }}>✓</span>}
                    </div>
                  ))}
                </div>
              </div>
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
          <div style={{ height:36, background:P.card, borderTop:`1px solid ${P.border}`, display:"flex", alignItems:"center", padding:"0 10px", gap:3, flexShrink:0 }}>
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