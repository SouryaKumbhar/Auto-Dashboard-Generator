import { useState } from "react";
import axios from "axios";

export default function DataSourceModal({ onClose, onData, token }) {
  const [tab, setTab] = useState("excel");
  const [db, setDb] = useState({ db_type: "mysql", host: "localhost", port: 3306, database: "", username: "", password: "", query: "SELECT * FROM your_table LIMIT 5000", server: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const api = axios.create({ baseURL: "http://localhost:8000", headers: { Authorization: `Bearer ${token}` } });

  async function uploadFile(e, type) {
    const file = e.target.files[0]; if (!file) return;
    setLoading(true); setError("");
    const form = new FormData(); form.append("file", file);
    try { const res = await api.post(type === "csv" ? "/upload-csv" : "/upload", form); onData(res.data); onClose(); }
    catch (err) { setError(err.response?.data?.detail || "Upload failed"); }
    setLoading(false);
  }

  async function connectDB() {
    setLoading(true); setError("");
    try { const res = await api.post("/connect-db", { ...db, db_type: tab }); onData(res.data); onClose(); }
    catch (err) { setError(err.response?.data?.detail || "Connection failed. Check credentials."); }
    setLoading(false);
  }

  const TABS = [
    { id: "excel", label: "Excel", icon: "📊" },
    { id: "csv", label: "CSV", icon: "📄" },
    { id: "mysql", label: "MySQL", icon: "🐬" },
    { id: "postgresql", label: "PostgreSQL", icon: "🐘" },
    { id: "sqlserver", label: "SQL Server", icon: "🖥" },
    { id: "sap", label: "SAP", icon: "🔷" },
    { id: "sharepoint", label: "SharePoint", icon: "📎" },
  ];

  const inp = { width: "100%", padding: "9px 12px", borderRadius: 8, border: "0.5px solid #e5e7ef", fontSize: 13, outline: "none", marginBottom: 10, background: "#fafafa", color: "#111" };
  const lbl = { fontSize: 11, color: "#6b7280", display: "block", marginBottom: 4, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
      <div style={{ background: "#fff", borderRadius: 16, width: 580, maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column", border: "0.5px solid #e5e7ef" }}>
        <div style={{ padding: "18px 22px", borderBottom: "0.5px solid #f0f0f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#111" }}>Connect Data Source</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>Excel, CSV, SQL Server, MySQL, PostgreSQL, SAP, SharePoint</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#9ca3af", lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ display: "flex", overflowX: "auto", borderBottom: "0.5px solid #f0f0f0", flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setError(""); }}
              style={{ padding: "10px 16px", border: "none", background: tab === t.id ? "#f5f3ff" : "transparent", color: tab === t.id ? "#6d28d9" : "#6b7280", fontSize: 12, cursor: "pointer", borderBottom: `2px solid ${tab === t.id ? "#6d28d9" : "transparent"}`, fontWeight: tab === t.id ? 600 : 400, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: 5 }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding: 22, overflowY: "auto", flex: 1 }}>
          {error && <div style={{ background: "#fef2f2", border: "0.5px solid #fecaca", color: "#991b1b", padding: "10px 14px", borderRadius: 8, marginBottom: 14, fontSize: 12 }}>{error}</div>}

          {(tab === "excel" || tab === "csv") && (
            <div style={{ textAlign: "center", padding: "32px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>{tab === "excel" ? "📊" : "📄"}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#111", marginBottom: 6 }}>Upload {tab === "excel" ? "Excel (.xlsx, .xls)" : "CSV (.csv)"}</div>
              <div style={{ fontSize: 12, color: "#9ca3af", marginBottom: 6 }}>AI will auto-detect columns, clean data, and build dashboard</div>
              <div style={{ fontSize: 11, color: "#c4b5fd", background: "#f5f3ff", padding: "6px 14px", borderRadius: 6, display: "inline-block", marginBottom: 22 }}>Supports up to 100,000 rows</div>
              <br />
              <label style={{ background: "#6d28d9", color: "#fff", padding: "11px 30px", borderRadius: 10, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                {loading ? "Analyzing..." : "Choose File"}
                <input type="file" accept={tab === "excel" ? ".xlsx,.xls" : ".csv"} style={{ display: "none" }} onChange={e => uploadFile(e, tab)} disabled={loading} />
              </label>
            </div>
          )}

          {(tab === "mysql" || tab === "postgresql") && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                <div><label style={lbl}>Host</label><input style={inp} placeholder="localhost" value={db.host} onChange={e => setDb(p => ({ ...p, host: e.target.value }))} /></div>
                <div><label style={lbl}>Port</label><input style={inp} placeholder={tab === "mysql" ? "3306" : "5432"} value={db.port} onChange={e => setDb(p => ({ ...p, port: parseInt(e.target.value) || 3306 }))} /></div>
              </div>
              <label style={lbl}>Database</label><input style={inp} placeholder="database_name" value={db.database} onChange={e => setDb(p => ({ ...p, database: e.target.value }))} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={lbl}>Username</label><input style={inp} placeholder="root" value={db.username} onChange={e => setDb(p => ({ ...p, username: e.target.value }))} /></div>
                <div><label style={lbl}>Password</label><input type="password" style={inp} value={db.password} onChange={e => setDb(p => ({ ...p, password: e.target.value }))} /></div>
              </div>
              <label style={lbl}>SQL Query</label>
              <textarea style={{ ...inp, height: 70, resize: "vertical", fontFamily: "monospace", fontSize: 12 }} value={db.query} onChange={e => setDb(p => ({ ...p, query: e.target.value }))} />
              <button onClick={connectDB} disabled={loading} style={{ width: "100%", background: "#6d28d9", color: "#fff", border: "none", borderRadius: 8, padding: 11, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {loading ? "Connecting..." : "Connect & Build Dashboard"}
              </button>
            </div>
          )}

          {tab === "sqlserver" && (
            <div>
              <label style={lbl}>Server Name or IP</label><input style={inp} placeholder="DESKTOP\\SQLEXPRESS or 192.168.1.1" value={db.server} onChange={e => setDb(p => ({ ...p, server: e.target.value }))} />
              <label style={lbl}>Database</label><input style={inp} placeholder="database_name" value={db.database} onChange={e => setDb(p => ({ ...p, database: e.target.value }))} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><label style={lbl}>Username</label><input style={inp} placeholder="sa" value={db.username} onChange={e => setDb(p => ({ ...p, username: e.target.value }))} /></div>
                <div><label style={lbl}>Password</label><input type="password" style={inp} value={db.password} onChange={e => setDb(p => ({ ...p, password: e.target.value }))} /></div>
              </div>
              <label style={lbl}>SQL Query</label>
              <textarea style={{ ...inp, height: 70, resize: "vertical", fontFamily: "monospace", fontSize: 12 }} value={db.query} onChange={e => setDb(p => ({ ...p, query: e.target.value }))} />
              <div style={{ background: "#fff7ed", border: "0.5px solid #fed7aa", borderRadius: 8, padding: "8px 12px", fontSize: 11, color: "#92400e", marginBottom: 10 }}>
                Requires ODBC Driver 17 for SQL Server installed on this machine
              </div>
              <button onClick={connectDB} disabled={loading} style={{ width: "100%", background: "#6d28d9", color: "#fff", border: "none", borderRadius: 8, padding: 11, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                {loading ? "Connecting..." : "Connect & Build Dashboard"}
              </button>
            </div>
          )}

          {tab === "sap" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>🔷</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#111", marginBottom: 10 }}>SAP Integration</div>
              <div style={{ background: "#f0fdf4", border: "0.5px solid #bbf7d0", borderRadius: 10, padding: "14px 18px", fontSize: 12, color: "#166534", textAlign: "left", marginBottom: 16, lineHeight: 1.8 }}>
                <b>Option 1 — Export from SAP GUI:</b><br />
                1. Run your report (SE16, ME2M, MB52, etc.)<br />
                2. Click List → Export → Local File → Spreadsheet<br />
                3. Upload that Excel file using the Excel tab above<br /><br />
                <b>Option 2 — SAP OData API (advanced):</b><br />
                Contact your SAP admin for the OData service URL and credentials
              </div>
              <label style={{ background: "#6d28d9", color: "#fff", padding: "10px 28px", borderRadius: 10, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                Upload SAP Export (Excel)
                <input type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={e => uploadFile(e, "excel")} />
              </label>
            </div>
          )}

          {tab === "sharepoint" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 44, marginBottom: 14 }}>📎</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "#111", marginBottom: 10 }}>SharePoint Files</div>
              <div style={{ background: "#eff6ff", border: "0.5px solid #bfdbfe", borderRadius: 10, padding: "14px 18px", fontSize: 12, color: "#1e40af", textAlign: "left", marginBottom: 16, lineHeight: 1.8 }}>
                <b>How to get your SharePoint file:</b><br />
                1. Open SharePoint in browser<br />
                2. Find your Excel or CSV file<br />
                3. Click the 3 dots → Download<br />
                4. Upload the downloaded file here
              </div>
              <label style={{ background: "#6d28d9", color: "#fff", padding: "10px 28px", borderRadius: 10, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                Upload SharePoint File
                <input type="file" accept=".xlsx,.xls,.csv" style={{ display: "none" }} onChange={e => uploadFile(e, "excel")} />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}