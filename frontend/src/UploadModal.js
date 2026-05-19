import { useState } from "react";
import axios from "axios";

export default function UploadModal({ onClose, onData, token }) {
  const [tab, setTab] = useState("excel");
  const [db, setDb] = useState({ host:"localhost", port:3306, database:"", username:"", password:"", query:"SELECT * FROM table_name LIMIT 5000", server:"" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const api = axios.create({ baseURL:"http://localhost:8000", headers:{ Authorization:`Bearer ${token}` } });

  async function uploadFile(e, type) {
    const file = e.target.files[0]; if (!file) return;
    setLoading(true); setError("");
    const form = new FormData(); form.append("file", file);
    try { const r = await api.post(type==="csv"?"/upload-csv":"/upload", form); onData(r.data); onClose(); }
    catch(err) { setError(err.response?.data?.detail||"Upload failed"); }
    setLoading(false);
  }

  async function connectDB() {
    setLoading(true); setError("");
    try { const r = await api.post("/connect-db", { ...db, db_type:tab }); onData(r.data); onClose(); }
    catch(err) { setError(err.response?.data?.detail||"Connection failed"); }
    setLoading(false);
  }

  const TABS = [
    { id:"excel", label:"Excel", icon:"📊" },
    { id:"csv", label:"CSV", icon:"📄" },
    { id:"mysql", label:"MySQL", icon:"🐬" },
    { id:"postgresql", label:"PostgreSQL", icon:"🐘" },
    { id:"sqlserver", label:"SQL Server", icon:"🖥" },
    { id:"sap", label:"SAP", icon:"🔷" },
    { id:"sharepoint", label:"SharePoint", icon:"📎" },
  ];

  const inp = { width:"100%", padding:"9px 12px", borderRadius:7, border:"0.5px solid #e5e7ef", fontSize:13, outline:"none", marginBottom:10, background:"#fafafa" };
  const lbl = { fontSize:10, color:"#9ca3af", display:"block", marginBottom:4, fontWeight:600, textTransform:"uppercase", letterSpacing:"0.4px" };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }}>
      <div style={{ background:"#fff", borderRadius:16, width:600, maxHeight:"90vh", overflow:"hidden", display:"flex", flexDirection:"column" }}>
        <div style={{ padding:"18px 22px 14px", borderBottom:"0.5px solid #f0f0f0", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:15, fontWeight:600, color:"#111" }}>Connect Data Source</div>
            <div style={{ fontSize:12, color:"#9ca3af", marginTop:2 }}>AI will auto-detect data type, clean, transform and build your dashboard</div>
          </div>
          <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"#9ca3af" }}>✕</button>
        </div>

        <div style={{ display:"flex", overflowX:"auto", borderBottom:"0.5px solid #f0f0f0", flexShrink:0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setError(""); }}
              style={{ padding:"10px 15px", border:"none", background:tab===t.id?"#f5f3ff":"transparent", color:tab===t.id?"#6d28d9":"#9ca3af", fontSize:12, cursor:"pointer", borderBottom:`2px solid ${tab===t.id?"#6d28d9":"transparent"}`, fontWeight:tab===t.id?600:400, whiteSpace:"nowrap", gap:5, display:"flex", alignItems:"center" }}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding:22, overflowY:"auto", flex:1 }}>
          {error && <div style={{ background:"#fef2f2", border:"0.5px solid #fecaca", color:"#991b1b", padding:"9px 13px", borderRadius:8, marginBottom:14, fontSize:12 }}>{error}</div>}

          {(tab==="excel"||tab==="csv") && (
            <div style={{ textAlign:"center", padding:"30px 0" }}>
              <div style={{ fontSize:52, marginBottom:16 }}>{tab==="excel"?"📊":"📄"}</div>
              <div style={{ fontSize:16, fontWeight:600, color:"#111", marginBottom:6 }}>Upload {tab==="excel"?"Excel (.xlsx, .xls)":"CSV (.csv)"}</div>
              <div style={{ fontSize:12, color:"#9ca3af", marginBottom:4 }}>AI auto-detects domain, cleans data, and builds a full dashboard</div>
              <div style={{ display:"inline-block", background:"#f5f3ff", color:"#7c3aed", fontSize:11, padding:"4px 12px", borderRadius:20, marginBottom:24 }}>Supports up to 500,000 rows</div>
              <br/>
              <label style={{ background:"#6d28d9", color:"#fff", padding:"12px 32px", borderRadius:10, fontSize:13, cursor:"pointer", fontWeight:600 }}>
                {loading?"Analyzing with AI...":"Choose File"}
                <input type="file" accept={tab==="excel"?".xlsx,.xls":".csv"} style={{ display:"none" }} onChange={e=>uploadFile(e,tab)} disabled={loading} />
              </label>
            </div>
          )}

          {(tab==="mysql"||tab==="postgresql") && (
            <div>
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:10 }}>
                <div><label style={lbl}>Host</label><input style={inp} placeholder="localhost" value={db.host} onChange={e=>setDb(p=>({...p,host:e.target.value}))} /></div>
                <div><label style={lbl}>Port</label><input style={inp} placeholder={tab==="mysql"?"3306":"5432"} value={db.port} onChange={e=>setDb(p=>({...p,port:parseInt(e.target.value)||3306}))} /></div>
              </div>
              <label style={lbl}>Database Name</label><input style={inp} placeholder="my_database" value={db.database} onChange={e=>setDb(p=>({...p,database:e.target.value}))} />
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div><label style={lbl}>Username</label><input style={inp} placeholder="root" value={db.username} onChange={e=>setDb(p=>({...p,username:e.target.value}))} /></div>
                <div><label style={lbl}>Password</label><input type="password" style={inp} value={db.password} onChange={e=>setDb(p=>({...p,password:e.target.value}))} /></div>
              </div>
              <label style={lbl}>SQL Query</label>
              <textarea style={{...inp,height:80,resize:"vertical",fontFamily:"monospace",fontSize:12}} value={db.query} onChange={e=>setDb(p=>({...p,query:e.target.value}))} />
              <button onClick={connectDB} disabled={loading} style={{ width:"100%", background:"#6d28d9", color:"#fff", border:"none", borderRadius:8, padding:11, fontSize:13, fontWeight:600, cursor:"pointer" }}>
                {loading?"Connecting...":"Connect & Build Dashboard"}
              </button>
            </div>
          )}

          {tab==="sqlserver" && (
            <div>
              <label style={lbl}>Server Name or IP</label><input style={inp} placeholder="DESKTOP\\SQLEXPRESS or 192.168.1.100" value={db.server} onChange={e=>setDb(p=>({...p,server:e.target.value}))} />
              <label style={lbl}>Database Name</label><input style={inp} placeholder="my_database" value={db.database} onChange={e=>setDb(p=>({...p,database:e.target.value}))} />
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div><label style={lbl}>Username</label><input style={inp} placeholder="sa" value={db.username} onChange={e=>setDb(p=>({...p,username:e.target.value}))} /></div>
                <div><label style={lbl}>Password</label><input type="password" style={inp} value={db.password} onChange={e=>setDb(p=>({...p,password:e.target.value}))} /></div>
              </div>
              <label style={lbl}>SQL Query</label>
              <textarea style={{...inp,height:75,resize:"vertical",fontFamily:"monospace",fontSize:12}} value={db.query} onChange={e=>setDb(p=>({...p,query:e.target.value}))} />
              <div style={{ background:"#fffbeb", border:"0.5px solid #fde68a", borderRadius:7, padding:"8px 12px", fontSize:11, color:"#92400e", marginBottom:10 }}>
                Requires ODBC Driver 17 for SQL Server on this machine
              </div>
              <button onClick={connectDB} disabled={loading} style={{ width:"100%", background:"#6d28d9", color:"#fff", border:"none", borderRadius:8, padding:11, fontSize:13, fontWeight:600, cursor:"pointer" }}>
                {loading?"Connecting...":"Connect & Build Dashboard"}
              </button>
            </div>
          )}

          {tab==="sap" && (
            <div>
              <div style={{ background:"#f0fdf4", border:"0.5px solid #bbf7d0", borderRadius:10, padding:"16px 18px", marginBottom:16 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#166534", marginBottom:8 }}>SAP Data Export Steps</div>
                <div style={{ fontSize:12, color:"#166534", lineHeight:1.9 }}>
                  1. Open SAP GUI → Run your transaction (SE16, ME2M, MB51, MM60, etc.)<br/>
                  2. Click <b>List → Export → Local File → Spreadsheet</b><br/>
                  3. Save as .xlsx and upload below<br/>
                  4. For OData: export from Fiori and upload CSV
                </div>
              </div>
              <label style={{ background:"#6d28d9", color:"#fff", padding:"11px 28px", borderRadius:10, fontSize:13, cursor:"pointer", fontWeight:600, display:"inline-block" }}>
                Upload SAP Export File
                <input type="file" accept=".xlsx,.xls,.csv" style={{ display:"none" }} onChange={e=>uploadFile(e,"excel")} />
              </label>
            </div>
          )}

          {tab==="sharepoint" && (
            <div>
              <div style={{ background:"#eff6ff", border:"0.5px solid #bfdbfe", borderRadius:10, padding:"16px 18px", marginBottom:16 }}>
                <div style={{ fontSize:13, fontWeight:600, color:"#1e40af", marginBottom:8 }}>SharePoint File Steps</div>
                <div style={{ fontSize:12, color:"#1e40af", lineHeight:1.9 }}>
                  1. Open your SharePoint site in browser<br/>
                  2. Navigate to the document library<br/>
                  3. Click the file → Download (or Open in Excel → Save)<br/>
                  4. Upload the downloaded file here
                </div>
              </div>
              <label style={{ background:"#6d28d9", color:"#fff", padding:"11px 28px", borderRadius:10, fontSize:13, cursor:"pointer", fontWeight:600, display:"inline-block" }}>
                Upload SharePoint File
                <input type="file" accept=".xlsx,.xls,.csv" style={{ display:"none" }} onChange={e=>uploadFile(e,"excel")} />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}