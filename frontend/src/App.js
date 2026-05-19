import { useState, useRef } from "react";
import axios from "axios";
import Login from "./Login";
import UploadModal from "./UploadModal";
import { renderChart, CHART_TYPES } from "./Charts";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import * as XLSX from "xlsx";

const api = axios.create({ baseURL: "http://localhost:8000" });
api.interceptors.request.use(cfg => {
  const t = localStorage.getItem("token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

function computeKPI(kpi, data) {
  const vals = data.map(r => Number(r[kpi.column])).filter(v => !isNaN(v) && isFinite(v));
  if (!vals.length) return "—";
  let v;
  switch (kpi.aggregation) {
    case "sum": v = vals.reduce((a, b) => a + b, 0); break;
    case "mean": v = vals.reduce((a, b) => a + b, 0) / vals.length; break;
    case "count": v = vals.length; break;
    case "max": v = Math.max(...vals); break;
    case "min": v = Math.min(...vals); break;
    default: v = vals.length;
  }
  const fmt = kpi.aggregation === "mean"
    ? parseFloat(v.toFixed(1)).toLocaleString("en-IN")
    : Math.round(v).toLocaleString("en-IN");
  return `${kpi.prefix || ""}${fmt}${kpi.suffix || ""}`;
}

function KPICard({ kpi, data, accent, onRemove, index }) {
  const value = computeKPI(kpi, data);
  const COLORS = ["#6d28d9", "#0891b2", "#059669", "#d97706", "#dc2626", "#7c3aed"];
  const color = kpi.color || COLORS[index % 6];
  const vals = data.map(r => Number(r[kpi.column])).filter(v => !isNaN(v) && isFinite(v));
  const prev = vals.length > 1 ? vals[0] : null;
  const curr = vals.length > 1 ? vals[vals.length - 1] : null;
  const pct = prev && curr && prev !== 0 ? ((curr - prev) / Math.abs(prev) * 100).toFixed(1) : null;

  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", border: "0.5px solid #eee", position: "relative", overflow: "hidden", minWidth: 0 }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 4, background: color, borderRadius: "4px 0 0 4px" }} />
      {onRemove && (
        <button onClick={onRemove} style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer", color: "#e5e7ef", fontSize: 14, lineHeight: 1, padding: "2px 4px", borderRadius: 4 }}>✕</button>
      )}
      <div style={{ fontSize: 10, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600, marginBottom: 7, marginLeft: 6 }}>{kpi.label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: "#111", marginLeft: 6, marginBottom: 4 }}>{value}</div>
      {pct !== null && (
        <div style={{ fontSize: 11, marginLeft: 6, color: parseFloat(pct) >= 0 ? "#059669" : "#dc2626" }}>
          {parseFloat(pct) >= 0 ? "▲" : "▼"} {Math.abs(pct)}%
        </div>
      )}
    </div>
  );
}

function ChartWidget({ chart, data, accent, onRemove, numCols, catCols }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(chart.title);
  const [type, setType] = useState(chart.type);
  const [xCol, setXCol] = useState(chart.x_column);
  const [yCol, setYCol] = useState(chart.y_column);
  const [showMenu, setShowMenu] = useState(false);
  const allCols = [...new Set([...catCols, ...numCols])];
  const h = chart.size === "large" ? 240 : chart.size === "small" ? 160 : 200;

  return (
    <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #eee", overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "10px 14px", borderBottom: "0.5px solid #fafafa", display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
        {editing
          ? <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
              onBlur={() => setEditing(false)} onKeyDown={e => e.key === "Enter" && setEditing(false)}
              style={{ flex: 1, fontSize: 12, fontWeight: 500, border: "none", borderBottom: `1.5px solid ${accent}`, outline: "none", background: "transparent", color: "#111" }} />
          : <div onClick={() => setEditing(true)} title="Click to rename"
              style={{ flex: 1, fontSize: 12, fontWeight: 500, color: "#111", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {title}
            </div>
        }
        <div style={{ display: "flex", gap: 4, alignItems: "center", flexShrink: 0 }}>
          <select value={type} onChange={e => setType(e.target.value)}
            style={{ fontSize: 10, border: "0.5px solid #eee", borderRadius: 5, padding: "2px 5px", color: "#6b7280", background: "#f9fafb", cursor: "pointer", maxWidth: 90 }}>
            {CHART_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <button onClick={() => setShowMenu(s => !s)}
            style={{ background: "none", border: "0.5px solid #eee", borderRadius: 5, padding: "2px 7px", fontSize: 11, cursor: "pointer", color: "#9ca3af" }}>⚙</button>
          {onRemove && (
            <button onClick={onRemove}
              style={{ background: "none", border: "0.5px solid #fee2e2", borderRadius: 5, padding: "2px 7px", fontSize: 11, cursor: "pointer", color: "#ef4444" }}>✕</button>
          )}
        </div>
      </div>

      {showMenu && (
        <div style={{ padding: "10px 14px", background: "#fafafa", borderBottom: "0.5px solid #f0f0f0", display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600 }}>X:</span>
            <select value={xCol} onChange={e => setXCol(e.target.value)}
              style={{ fontSize: 10, border: "0.5px solid #eee", borderRadius: 5, padding: "2px 5px", background: "#fff" }}>
              {allCols.map(c => <option key={c} value={c}>{c.slice(0, 22)}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600 }}>Y:</span>
            <select value={yCol} onChange={e => setYCol(e.target.value)}
              style={{ fontSize: 10, border: "0.5px solid #eee", borderRadius: 5, padding: "2px 5px", background: "#fff" }}>
              {allCols.map(c => <option key={c} value={c}>{c.slice(0, 22)}</option>)}
            </select>
          </div>
          <button onClick={() => setShowMenu(false)}
            style={{ background: accent, color: "#fff", border: "none", borderRadius: 5, padding: "3px 10px", fontSize: 10, cursor: "pointer" }}>Apply</button>
        </div>
      )}

      <div style={{ padding: "10px 14px", flex: 1 }}>
        {renderChart(type, data, xCol, yCol, accent, h)}
      </div>
    </div>
  );
}

function AddVisualPanel({ onAdd, cols, numCols, catCols, onClose, accent }) {
  const [type, setType] = useState("bar");
  const [xCol, setXCol] = useState(catCols[0] || cols[0] || "");
  const [yCol, setYCol] = useState(numCols[0] || cols[0] || "");
  const [title, setTitle] = useState("New Chart");
  const [size, setSize] = useState("medium");
  const allCols = [...new Set([...catCols, ...numCols])];

  return (
    <div style={{ background: "#fff", borderRadius: 12, border: `1.5px solid ${accent}`, padding: "16px 18px", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>+ Add Visual to Dashboard</div>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#9ca3af", fontSize: 18, cursor: "pointer" }}>✕</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>Chart Type</div>
          <select value={type} onChange={e => setType(e.target.value)}
            style={{ width: "100%", padding: "7px 10px", border: "0.5px solid #eee", borderRadius: 7, fontSize: 12 }}>
            {CHART_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>Size</div>
          <select value={size} onChange={e => setSize(e.target.value)}
            style={{ width: "100%", padding: "7px 10px", border: "0.5px solid #eee", borderRadius: 7, fontSize: 12 }}>
            <option value="small">Small</option>
            <option value="medium">Medium</option>
            <option value="large">Large</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>X Axis Column</div>
          <select value={xCol} onChange={e => setXCol(e.target.value)}
            style={{ width: "100%", padding: "7px 10px", border: "0.5px solid #eee", borderRadius: 7, fontSize: 12 }}>
            {allCols.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>Y Axis Column</div>
          <select value={yCol} onChange={e => setYCol(e.target.value)}
            style={{ width: "100%", padding: "7px 10px", border: "0.5px solid #eee", borderRadius: 7, fontSize: 12 }}>
            {allCols.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 10, color: "#9ca3af", fontWeight: 600, marginBottom: 4, textTransform: "uppercase" }}>Chart Title</div>
        <input value={title} onChange={e => setTitle(e.target.value)}
          style={{ width: "100%", padding: "7px 10px", border: "0.5px solid #eee", borderRadius: 7, fontSize: 12, outline: "none" }} />
      </div>
      <button
        onClick={() => { onAdd({ id: `c${Date.now()}`, type, title, x_column: xCol, y_column: yCol, size }); onClose(); }}
        style={{ background: accent, color: "#fff", border: "none", borderRadius: 8, padding: "9px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
        Add to Dashboard
      </button>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user")); } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [page, setPage] = useState("dashboard");
  const [db, setDb] = useState(null);
  const [showUpload, setShowUpload] = useState(false);
  const [showAddVisual, setShowAddVisual] = useState(false);
  const [filters, setFilters] = useState({});
  const [drills, setDrills] = useState([]);
  const [dashName, setDashName] = useState("My Dashboard");
  const [editName, setEditName] = useState(false);
  const [charts, setCharts] = useState([]);
  const [kpis, setKpis] = useState([]);
  const [sources, setSources] = useState([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [searchText, setSearchText] = useState("");
  const [activePage, setActivePage] = useState(0);
  const [pages, setPages] = useState(["Page 1"]);
  const dashRef = useRef(null);

  function handleLogin(u) {
    setUser(u);
    setToken(localStorage.getItem("token") || "");
  }

  function handleLogout() {
    localStorage.clear();
    setUser(null);
    setDb(null);
    setToken("");
    setCharts([]);
    setKpis([]);
    setSources([]);
  }

  function handleData(data) {
    setDb(data);
    setCharts(data.config?.charts || []);
    setKpis(data.config?.kpis || []);
    setDashName(data.config?.dashboard_title || data.filename || "Dashboard");
    setFilters({});
    setDrills([]);
    window.__rawData = data.data;
    setSources(prev => {
      const exists = prev.find(s => s.filename === data.filename);
      if (exists) return prev.map(s => s.filename === data.filename ? { ...s, ...data } : s);
      return [...prev, {
        filename: data.filename,
        source_type: data.source_type,
        rows: data.row_count,
        cols: data.col_count,
        domain: data.domain,
        theme: data.theme
      }];
    });
    setPage("dashboard");
  }

  function filteredData() {
    if (!db) return [];
    let d = db.data;
    drills.forEach(({ col, val }) => { if (val) d = d.filter(r => String(r[col]) === val); });
    d = d.filter(row => Object.entries(filters).every(([col, val]) => !val || String(row[col]) === val));
    if (dateFrom || dateTo) {
      const dateCols = db.columns.filter(c => {
        const s = (db.data[0] || {})[c];
        return typeof s === "string" && /^\d{4}-\d{2}-\d{2}/.test(s);
      });
      if (dateCols.length > 0) {
        const dc = dateCols[0];
        if (dateFrom) d = d.filter(r => r[dc] >= dateFrom);
        if (dateTo) d = d.filter(r => r[dc] <= dateTo);
      }
    }
    if (searchText.trim()) {
      const q = searchText.toLowerCase();
      d = d.filter(row => Object.values(row).some(v => String(v).toLowerCase().includes(q)));
    }
    return d;
  }

  async function exportPDF() {
    if (!dashRef.current) return alert("No dashboard to export");
    const canvas = await html2canvas(dashRef.current, { scale: 1.5, useCORS: true, logging: false });
    const pdf = new jsPDF("l", "mm", "a4");
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 5, 5, 287, 190);
    pdf.save(`${dashName}.pdf`);
  }

  function exportExcel() {
    const d = filteredData();
    if (!d.length) return alert("No data to export");
    const ws = XLSX.utils.json_to_sheet(d);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Data");
    XLSX.writeFile(wb, `${dashName}.xlsx`);
  }

  const data = filteredData();
  const T = db?.theme || { sidebar: "#0f0f1a", accent: "#6d28d9", bg: "#f5f5fb" };
  const accent = T.accent || "#6d28d9";

  const numCols = db ? db.col_info.filter(c => c.type.includes("int") || c.type.includes("float")).map(c => c.name) : [];
  const catCols = db ? db.col_info.filter(c => c.type === "object").map(c => c.name) : [];
  const filterCols = db?.config?.filters || catCols.slice(0, 4);
  const tableCols = db?.config?.table_columns || db?.columns?.slice(0, 6) || [];

  const NAV = [
    { id: "dashboard", icon: "⊞", label: "Dashboard" },
    { id: "analytics", icon: "📊", label: "Analytics" },
    { id: "files", icon: "📁", label: "My Files" },
    { id: "export", icon: "⬇", label: "Export" },
    { id: "settings", icon: "⚙", label: "Settings" },
  ];

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "Inter, sans-serif" }}>

      {showUpload && (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onData={handleData}
          token={token}
        />
      )}

      {/* SIDEBAR */}
      <div style={{ width: 215, background: T.sidebar || "#0f0f1a", display: "flex", flexDirection: "column", flexShrink: 0, borderRight: "0.5px solid rgba(255,255,255,0.04)" }}>
        <div style={{ padding: "18px 16px 14px", borderBottom: "0.5px solid rgba(255,255,255,0.06)" }}>
          <div style={{ color: "#fff", fontSize: 16, fontWeight: 600 }}>DataDash</div>
          <div style={{ color: "rgba(255,255,255,0.28)", fontSize: 11, marginTop: 2 }}>Production BI Platform</div>
        </div>

        <nav style={{ padding: "10px 8px", flex: 1, overflowY: "auto" }}>
          {NAV.map(n => (
            <div key={n.id} onClick={() => setPage(n.id)} style={{
              display: "flex", alignItems: "center", gap: 9,
              padding: "8px 10px", borderRadius: 8, marginBottom: 2, cursor: "pointer",
              background: page === n.id ? "rgba(255,255,255,0.09)" : "transparent",
              color: page === n.id ? "#c4b5fd" : "rgba(255,255,255,0.38)",
              fontSize: 12, fontWeight: page === n.id ? 500 : 400, transition: "all 0.15s"
            }}>
              <span style={{ fontSize: 14 }}>{n.icon}</span>{n.label}
            </div>
          ))}

          {sources.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.7px", padding: "0 10px 6px", fontWeight: 600 }}>
                Connected Sources
              </div>
              {sources.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 10px", borderRadius: 7, cursor: "pointer", marginBottom: 1 }}>
                  <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#6ee7b7", flexShrink: 0 }} />
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.filename}</span>
                  <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 9, marginLeft: "auto", flexShrink: 0 }}>{s.rows?.toLocaleString()}</span>
                </div>
              ))}
            </div>
          )}
        </nav>

        <div style={{ padding: "12px 14px", borderTop: "0.5px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: accent, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 600, flexShrink: 0 }}>
              {user?.name?.split(" ").map(n => n[0]).join("").slice(0, 2)}
            </div>
            <div>
              <div style={{ color: "#fff", fontSize: 12, fontWeight: 500 }}>{user?.name}</div>
              <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>{user?.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} style={{ width: "100%", background: "transparent", border: "0.5px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.3)", borderRadius: 6, padding: "5px", fontSize: 11, cursor: "pointer" }}>
            Sign out
          </button>
        </div>
      </div>

      {/* MAIN AREA */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

        {/* TOP BAR */}
        <div style={{ height: 50, background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", borderBottom: "0.5px solid #eee", flexShrink: 0, gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
            {page === "dashboard" ? (
              editName
                ? <input autoFocus value={dashName} onChange={e => setDashName(e.target.value)}
                    onBlur={() => setEditName(false)} onKeyDown={e => e.key === "Enter" && setEditName(false)}
                    style={{ fontSize: 14, fontWeight: 600, color: "#111", border: "none", borderBottom: `2px solid ${accent}`, outline: "none", background: "transparent", minWidth: 200 }} />
                : <span onClick={() => setEditName(true)} title="Click to rename"
                    style={{ fontSize: 14, fontWeight: 600, color: "#111", cursor: "pointer" }}>
                    {dashName || "Dashboard"}
                  </span>
            ) : (
              <span style={{ fontSize: 14, fontWeight: 600, color: "#111" }}>{NAV.find(n => n.id === page)?.label}</span>
            )}

            {db && page === "dashboard" && (
              <span style={{ background: "#ede9fe", color: "#5b21b6", fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 600, flexShrink: 0 }}>
                {db.domain?.charAt(0).toUpperCase() + db.domain?.slice(1)} · Live
              </span>
            )}

            {drills.map((d, i) => (
              <span key={i} onClick={() => setDrills(p => p.slice(0, i))}
                style={{ background: "#fff7ed", color: "#92400e", fontSize: 10, padding: "2px 8px", borderRadius: 20, cursor: "pointer", flexShrink: 0 }}>
                {d.col}: {d.val} ✕
              </span>
            ))}
          </div>

          {page === "dashboard" && db && (
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              {pages.map((pg, i) => (
                <button key={i} onClick={() => setActivePage(i)}
                  style={{ padding: "3px 10px", borderRadius: 6, border: "0.5px solid #eee", background: activePage === i ? accent : "#f9fafb", color: activePage === i ? "#fff" : "#6b7280", fontSize: 11, cursor: "pointer" }}>
                  {pg}
                </button>
              ))}
              <button
                onClick={() => { setPages(p => [...p, `Page ${p.length + 1}`]); setActivePage(pages.length); }}
                style={{ padding: "3px 8px", borderRadius: 6, border: "0.5px dashed #d1d5db", background: "transparent", color: "#9ca3af", fontSize: 11, cursor: "pointer" }}>
                +
              </button>
            </div>
          )}

          <div style={{ display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
            {db && page === "dashboard" && (
              <button onClick={() => setShowAddVisual(s => !s)}
                style={{ background: showAddVisual ? "#fef2f2" : "#f5f3ff", color: showAddVisual ? "#dc2626" : "#6d28d9", border: `0.5px solid ${showAddVisual ? "#fecaca" : "#ddd6fe"}`, borderRadius: 7, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontWeight: 500 }}>
                {showAddVisual ? "Cancel" : "+ Visual"}
              </button>
            )}
            <button onClick={exportPDF} style={{ background: "#fef2f2", color: "#dc2626", border: "0.5px solid #fecaca", borderRadius: 7, padding: "5px 11px", fontSize: 11, cursor: "pointer", fontWeight: 500 }}>PDF</button>
            <button onClick={exportExcel} style={{ background: "#f0fdf4", color: "#16a34a", border: "0.5px solid #bbf7d0", borderRadius: 7, padding: "5px 11px", fontSize: 11, cursor: "pointer", fontWeight: 500 }}>Excel</button>
            <button onClick={() => setShowUpload(true)}
              style={{ background: accent, color: "#fff", border: "none", borderRadius: 7, padding: "6px 14px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}>
              + Data Source
            </button>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div style={{ flex: 1, overflowY: "auto", background: T.bg || "#f5f5fb", backgroundImage: `radial-gradient(circle, ${accent}11 1px, transparent 1px)`, backgroundSize: "22px 22px" }}>

          {/* ==================== DASHBOARD PAGE ==================== */}
          {page === "dashboard" && (
            <div ref={dashRef} style={{ padding: 14 }}>

              {/* EMPTY STATE */}
              {!db && (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "75vh" }}>
                  <div style={{ background: "#fff", borderRadius: 20, padding: "52px 72px", border: "2px dashed #c4b5fd", textAlign: "center", maxWidth: 520 }}>
                    <div style={{ fontSize: 52, marginBottom: 16 }}>📊</div>
                    <div style={{ fontSize: 20, fontWeight: 600, color: "#111", marginBottom: 6 }}>Connect your data source</div>
                    <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 4 }}>Excel · CSV · MySQL · PostgreSQL · SQL Server · SAP · SharePoint</div>
                    <div style={{ fontSize: 12, color: accent, marginBottom: 8 }}>AI auto-detects domain · cleans data · builds full dashboard</div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 24 }}>
                      {["Finance", "Healthcare", "Retail", "HR", "Procurement", "Tech"].map(d => (
                        <span key={d} style={{ background: "#f5f3ff", color: "#6d28d9", fontSize: 11, padding: "3px 10px", borderRadius: 20 }}>{d}</span>
                      ))}
                    </div>
                    <button onClick={() => setShowUpload(true)}
                      style={{ background: accent, color: "#fff", border: "none", borderRadius: 10, padding: "12px 32px", fontSize: 14, cursor: "pointer", fontWeight: 600 }}>
                      Connect Data Source
                    </button>
                  </div>
                </div>
              )}

              {/* DASHBOARD CONTENT */}
              {db && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

                  {/* ADD VISUAL PANEL */}
                  {showAddVisual && (
                    <AddVisualPanel
                      onAdd={chart => setCharts(p => [...p, chart])}
                      cols={db.columns}
                      numCols={numCols}
                      catCols={catCols}
                      onClose={() => setShowAddVisual(false)}
                      accent={accent}
                    />
                  )}

                  {/* AI INSIGHTS */}
                  <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #eee", overflow: "hidden" }}>
                    <div style={{ padding: "10px 16px", background: `${accent}0d`, borderBottom: "0.5px solid #eee", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: accent }}>
                        🤖 AI Insights — {db.filename} · {db.row_count?.toLocaleString()} rows · {db.col_count} columns
                      </div>
                      <span style={{ fontSize: 10, color: "#9ca3af" }}>{db.domain} domain detected</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 0 }}>
                      {[
                        { label: "Summary", value: db.insights?.summary, color: accent },
                        { label: "Trend", value: db.insights?.trend, color: "#0891b2" },
                        { label: "Key Insight", value: db.insights?.insight1, color: "#059669" },
                        { label: "Finding", value: db.insights?.insight2, color: "#d97706" },
                        { label: "Recommendation", value: db.insights?.recommendation, color: "#dc2626" },
                        { label: "Performance", value: db.insights?.performance, color: "#7c3aed" },
                      ].map((item, i) => (
                        <div key={i} style={{ padding: "12px 14px", borderRight: i % 2 === 0 ? "0.5px solid #f5f5f5" : "none", borderBottom: "0.5px solid #f5f5f5" }}>
                          <div style={{ fontSize: 9, fontWeight: 600, color: item.color, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>{item.label}</div>
                          <div style={{ fontSize: 11, color: "#374151", lineHeight: 1.5 }}>{item.value || "Analyzing..."}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* FILTERS + PARAMETERS */}
                  <div style={{ background: "#fff", borderRadius: 12, padding: "10px 16px", border: "0.5px solid #eee", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 9, fontWeight: 600, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.5px", flexShrink: 0 }}>
                      Filters & Parameters
                    </span>

                    {filterCols.map(col => {
                      const vals = [...new Set(db.data.map(r => r[col]))].filter(Boolean).slice(0, 25);
                      return (
                        <div key={col} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <span style={{ fontSize: 11, color: "#374151", fontWeight: 500 }}>{col}:</span>
                          <select value={filters[col] || ""} onChange={e => setFilters(p => ({ ...p, [col]: e.target.value }))}
                            style={{ border: "0.5px solid #eee", borderRadius: 6, padding: "3px 6px", fontSize: 11, background: "#f9fafb", cursor: "pointer", maxWidth: 130 }}>
                            <option value="">All</option>
                            {vals.map(v => <option key={v} value={v}>{String(v).slice(0, 22)}</option>)}
                          </select>
                        </div>
                      );
                    })}

                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 11, color: "#374151" }}>From:</span>
                      <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                        style={{ border: "0.5px solid #eee", borderRadius: 6, padding: "3px 6px", fontSize: 11, background: "#f9fafb" }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 11, color: "#374151" }}>To:</span>
                      <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                        style={{ border: "0.5px solid #eee", borderRadius: 6, padding: "3px 6px", fontSize: 11, background: "#f9fafb" }} />
                    </div>

                    <input placeholder="Search data..."
                      value={searchText} onChange={e => setSearchText(e.target.value)}
                      style={{ border: "0.5px solid #eee", borderRadius: 6, padding: "3px 9px", fontSize: 11, background: "#f9fafb", outline: "none", width: 120 }} />

                    <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 11, color: "#9ca3af" }}>{data.length.toLocaleString()} rows</span>
                      <button
                        onClick={() => { setFilters({}); setDrills([]); setDateFrom(""); setDateTo(""); setSearchText(""); }}
                        style={{ background: "transparent", border: "0.5px solid #eee", borderRadius: 6, padding: "3px 10px", fontSize: 11, color: "#6b7280", cursor: "pointer" }}>
                        Reset
                      </button>
                    </div>
                  </div>

                  {/* KPI CARDS */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                    {kpis.map((kpi, i) => (
                      <KPICard key={i} kpi={kpi} data={data} accent={accent} index={i}
                        onRemove={() => setKpis(p => p.filter((_, j) => j !== i))} />
                    ))}
                    <button
                      onClick={() => { if (numCols.length > 0) setKpis(p => [...p, { label: "New KPI", column: numCols[0], aggregation: "sum", prefix: "", suffix: "", color: accent }]); }}
                      style={{ background: "#f9fafb", border: "1px dashed #e5e7ef", borderRadius: 12, padding: "16px 18px", cursor: "pointer", color: "#9ca3af", fontSize: 12, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                      + Add KPI
                    </button>
                  </div>

                  {/* CHARTS GRID */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 12 }}>
                    {charts.map((chart, i) => (
                      <ChartWidget
                        key={chart.id || i}
                        chart={chart}
                        data={data}
                        accent={accent}
                        numCols={numCols}
                        catCols={catCols}
                        onRemove={() => setCharts(p => p.filter((_, j) => j !== i))}
                        onUpdate={updated => setCharts(p => p.map((c, j) => j === i ? { ...c, ...updated } : c))}
                      />
                    ))}
                  </div>

                  {/* DATA TABLE */}
                  <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #eee", overflow: "hidden" }}>
                    <div style={{ padding: "11px 16px", borderBottom: "0.5px solid #fafafa", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "#111" }}>
                        Data Table — {data.length.toLocaleString()} of {db.row_count?.toLocaleString()} rows
                        {drills.length > 0 && <span style={{ color: accent, marginLeft: 8, fontSize: 11 }}>· Drill down active</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "#9ca3af" }}>{tableCols.length} columns · click cell to drill down</div>
                    </div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                        <thead>
                          <tr style={{ background: "#fafafa" }}>
                            {tableCols.map(col => (
                              <th key={col} style={{ padding: "8px 12px", textAlign: "left", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", fontSize: 9, borderBottom: "0.5px solid #eee", whiteSpace: "nowrap", cursor: "pointer" }}>
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {data.slice(0, 20).map((row, i) => (
                            <tr key={i} style={{ borderBottom: "0.5px solid #f9fafb" }}>
                              {tableCols.map(col => (
                                <td key={col}
                                  onClick={() => { const v = String(row[col]); if (v && v !== "null" && v !== "undefined") setDrills(p => [...p, { col, val: v }]); }}
                                  style={{ padding: "7px 12px", color: "#374151", cursor: "pointer", whiteSpace: "nowrap" }}>
                                  {row[col] !== null && row[col] !== undefined ? String(row[col]).slice(0, 32) : "—"}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {data.length > 20 && (
                      <div style={{ padding: "8px 16px", fontSize: 11, color: "#9ca3af", textAlign: "center", borderTop: "0.5px solid #fafafa" }}>
                        Showing 20 of {data.length.toLocaleString()} rows · Use Excel export for full data
                      </div>
                    )}
                  </div>

                  {/* STATS SUMMARY TABLE */}
                  {db.num_stats && Object.keys(db.num_stats).length > 0 && (
                    <div style={{ background: "#fff", borderRadius: 12, border: "0.5px solid #eee", overflow: "hidden" }}>
                      <div style={{ padding: "11px 16px", borderBottom: "0.5px solid #fafafa" }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#111" }}>Statistical Summary</div>
                      </div>
                      <div style={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                          <thead>
                            <tr style={{ background: "#fafafa" }}>
                              {["Column", "Sum", "Mean", "Max", "Min", "Count"].map(h => (
                                <th key={h} style={{ padding: "7px 12px", textAlign: "left", color: "#6b7280", fontWeight: 600, textTransform: "uppercase", fontSize: 9, letterSpacing: "0.4px", borderBottom: "0.5px solid #eee" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(db.num_stats).slice(0, 10).map(([col, s]) => (
                              <tr key={col} style={{ borderBottom: "0.5px solid #f9fafb" }}>
                                <td style={{ padding: "6px 12px", color: "#374151", fontWeight: 500 }}>{col}</td>
                                <td style={{ padding: "6px 12px", color: "#374151" }}>{s.sum?.toLocaleString("en-IN")}</td>
                                <td style={{ padding: "6px 12px", color: "#374151" }}>{s.mean?.toLocaleString("en-IN")}</td>
                                <td style={{ padding: "6px 12px", color: "#059669", fontWeight: 500 }}>{s.max?.toLocaleString("en-IN")}</td>
                                <td style={{ padding: "6px 12px", color: "#dc2626", fontWeight: 500 }}>{s.min?.toLocaleString("en-IN")}</td>
                                <td style={{ padding: "6px 12px", color: "#374151" }}>{s.count?.toLocaleString()}</td>
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

          {/* ==================== ANALYTICS PAGE ==================== */}
          {page === "analytics" && (
            <div style={{ padding: 14 }}>
              {!db ? (
                <div style={{ background: "#fff", borderRadius: 12, padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                  Connect a data source first to see analytics
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", border: "0.5px solid #eee" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#111", marginBottom: 12 }}>All Numeric Columns — Area Distribution</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
                      {numCols.slice(0, 6).map(col => (
                        <ChartWidget key={col}
                          chart={{ id: col, type: "area", title: `${col}`, x_column: catCols[0] || db.columns[0], y_column: col, size: "medium" }}
                          data={data} accent={accent} numCols={numCols} catCols={catCols} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ==================== MY FILES PAGE ==================== */}
          {page === "files" && (
            <div style={{ padding: 14 }}>
              <button onClick={() => setShowUpload(true)}
                style={{ background: accent, color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, cursor: "pointer", fontWeight: 500, marginBottom: 14 }}>
                + Connect New Data Source
              </button>
              {sources.length === 0 ? (
                <div style={{ background: "#fff", borderRadius: 12, padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 13 }}>
                  No data sources connected yet
                </div>
              ) : sources.map((s, i) => (
                <div key={i} style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", border: "0.5px solid #eee", marginBottom: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${accent}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                      {s.source_type === "csv" ? "📄" : s.source_type === "mysql" ? "🐬" : s.source_type === "sqlserver" ? "🖥" : "📊"}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#111" }}>{s.filename}</div>
                      <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
                        {s.rows?.toLocaleString()} rows · {s.cols} columns · {s.domain} domain
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ background: `${accent}15`, color: accent, fontSize: 10, padding: "3px 10px", borderRadius: 20, fontWeight: 500 }}>
                      {s.source_type?.toUpperCase()}
                    </span>
                    <button onClick={() => setPage("dashboard")}
                      style={{ background: accent, color: "#fff", border: "none", borderRadius: 7, padding: "5px 14px", fontSize: 11, cursor: "pointer", fontWeight: 500 }}>
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ==================== EXPORT PAGE ==================== */}
          {page === "export" && (
            <div style={{ padding: 14, maxWidth: 560 }}>
              <div style={{ background: "#fff", borderRadius: 12, padding: "18px 22px", border: "0.5px solid #eee", marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111", marginBottom: 14 }}>Export Options</div>
                {[
                  { label: "Export as PDF", desc: "Full dashboard screenshot — A4 Landscape", action: exportPDF, color: "#dc2626", bg: "#fef2f2", icon: "📄" },
                  { label: "Export as Excel", desc: "Current filtered data as .xlsx file", action: exportExcel, color: "#16a34a", bg: "#f0fdf4", icon: "📊" },
                ].map((item, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: i === 0 ? "0.5px solid #f5f5f5" : "none" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 40, height: 40, background: item.bg, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{item.icon}</div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: "#111" }}>{item.label}</div>
                        <div style={{ fontSize: 11, color: "#9ca3af" }}>{item.desc}</div>
                      </div>
                    </div>
                    <button onClick={item.action}
                      style={{ background: item.color, color: "#fff", border: "none", borderRadius: 8, padding: "7px 16px", fontSize: 12, fontWeight: 500, cursor: "pointer" }}>
                      Download
                    </button>
                  </div>
                ))}
              </div>

              {db && (
                <div style={{ background: "#fff", borderRadius: 12, padding: "14px 18px", border: "0.5px solid #eee" }}>
                  <div style={{ fontSize: 12, fontWeight: 500, color: "#111", marginBottom: 8 }}>Current Dashboard Info</div>
                  {[
                    ["Data Source", db.filename],
                    ["Domain", db.domain],
                    ["Total Rows", db.row_count?.toLocaleString()],
                    ["Total Columns", db.col_count],
                    ["Filtered Rows", data.length.toLocaleString()],
                    ["Active Charts", charts.length],
                    ["KPI Cards", kpis.length],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "0.5px solid #f9fafb", fontSize: 12 }}>
                      <span style={{ color: "#9ca3af" }}>{k}</span>
                      <span style={{ color: "#111", fontWeight: 500 }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ==================== SETTINGS PAGE ==================== */}
          {page === "settings" && (
            <div style={{ padding: 14, maxWidth: 560 }}>
              <div style={{ background: "#fff", borderRadius: 12, padding: "18px 22px", border: "0.5px solid #eee", marginBottom: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111", marginBottom: 14 }}>Profile</div>
                {[["Name", user?.name], ["Email", user?.email], ["Role", user?.role]].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "0.5px solid #f9fafb", fontSize: 13 }}>
                    <span style={{ color: "#9ca3af" }}>{k}</span>
                    <span style={{ color: "#111", fontWeight: 500 }}>{v}</span>
                  </div>
                ))}
              </div>
              <div style={{ background: "#fff", borderRadius: 12, padding: "18px 22px", border: "0.5px solid #eee" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#111", marginBottom: 10 }}>Dashboard Name</div>
                <input value={dashName} onChange={e => setDashName(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", border: "0.5px solid #eee", borderRadius: 8, fontSize: 13, outline: "none", marginBottom: 8 }} />
                <div style={{ fontSize: 11, color: "#9ca3af" }}>You can also click the title in the top bar to rename directly</div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}