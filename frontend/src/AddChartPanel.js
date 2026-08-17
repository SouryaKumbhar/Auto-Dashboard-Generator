
import { useState } from "react";
const CHART_TYPES = [
  { value:"bar",     label:"Bar Chart",    icon:"📊", desc:"Compare values across categories" },
  { value:"line",    label:"Line Chart",   icon:"📈", desc:"Show trends over time" },
  { value:"area",    label:"Area Chart",   icon:"🌊", desc:"Filled line chart for volume trends" },
  { value:"pie",     label:"Pie Chart",    icon:"🥧", desc:"Show parts of a whole" },
  { value:"donut",   label:"Donut Chart",  icon:"⭕", desc:"Pie with center value" },
  { value:"scatter", label:"Scatter Plot", icon:"✦",  desc:"Show correlation between two values" },
  { value:"radar",   label:"Radar Chart",  icon:"🕸", desc:"Compare multiple categories" },
  { value:"treemap", label:"Treemap",      icon:"🗂", desc:"Hierarchical data visualization" },
  { value:"table",   label:"Data Table",   icon:"📋", desc:"Tabular view of data" },
];
export default function AddChartPanel({ db, onAdd, onClose }) {
  const numCols = db && Array.isArray(db.col_info)
    ? db.col_info.filter(c=>c.type.includes("int")||c.type.includes("float")).map(c=>c.name)
    : [];
  const catCols = db && Array.isArray(db.col_info)
    ? db.col_info.filter(c=>c.type==="object").map(c=>c.name)
    : [];
  const allCols = db?.columns || [];
  const [step, setStep]     = useState(1);
  const [type, setType]     = useState("bar");
  const [xCol, setXCol]     = useState(catCols[0]||allCols[0]||"");
  const [yCol, setYCol]     = useState(numCols[0]||allCols[0]||"");
  const [title, setTitle]   = useState("");
  const [size, setSize]     = useState("medium");
  const selectedType = CHART_TYPES.find(t=>t.value===type);
  function handleAdd() {
    if (!xCol || !yCol) return alert("Please select both columns");
    onAdd({
      id: `c${Date.now()}`,
      type,
      title: title || `${selectedType?.label} — ${yCol} by ${xCol}`,
      x_column: xCol,
      y_column: yCol,
      size
    });
    onClose();
  }
  const inp = {
    width:"100%", padding:"9px 12px", borderRadius:8,
    border:"1px solid #2D3547", fontSize:13, outline:"none",
    background:"#111827", color:"#F9FAFB", boxSizing:"border-box"
  };
  const lbl = {
    fontSize:10, color:"#6B7280", display:"block",
    marginBottom:5, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.5px"
  };
  return (
    <div style={{
      position:"fixed", inset:0, background:"rgba(0,0,0,0.7)",
      display:"flex", alignItems:"center", justifyContent:"center",
      zIndex:3000, padding:20
    }}>
      <div style={{
        background:"#1A1F2E", borderRadius:16, width:"100%", maxWidth:640,
        border:"1px solid #2D3547", boxShadow:"0 20px 60px rgba(0,0,0,0.5)",
        overflow:"hidden"
      }}>
        {/* Header */}
        <div style={{ padding:"16px 20px", background:"#111827", borderBottom:"1px solid #2D3547", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"#F9FAFB" }}>+ Add Visual</div>
            <div style={{ fontSize:11, color:"#6B7280", marginTop:2 }}>
              Step {step} of 2 — {step===1?"Choose chart type":"Configure columns"}
            </div>
          </div>
          <button onClick={onClose} style={{ background:"#1F2937", border:"1px solid #2D3547", borderRadius:8, padding:"5px 10px", color:"#6B7280", cursor:"pointer", fontSize:13 }}>✕</button>
        </div>
        <div style={{ padding:20 }}>
          {/* STEP 1 — Choose chart type */}
          {step===1 && (
            <>
              <div style={{ marginBottom:16, fontSize:12, color:"#9CA3AF" }}>Select the type of visual you want to add:</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:20 }}>
                {CHART_TYPES.map(ct=>(
                  <div key={ct.value} onClick={()=>setType(ct.value)} style={{
                    padding:"14px 12px", borderRadius:10, cursor:"pointer",
                    background:type===ct.value?"#1F2937":"#111827",
                    border:`1px solid ${type===ct.value?"#3B82F6":"#2D3547"}`,
                    transition:"all 0.15s"
                  }}>
                    <div style={{ fontSize:22, marginBottom:6 }}>{ct.icon}</div>
                    <div style={{ fontSize:12, fontWeight:600, color:type===ct.value?"#3B82F6":"#D1D5DB", marginBottom:3 }}>{ct.label}</div>
                    <div style={{ fontSize:10, color:"#6B7280", lineHeight:1.4 }}>{ct.desc}</div>
                  </div>
                ))}
              </div>
              <button onClick={()=>setStep(2)} style={{
                width:"100%", background:"#3B82F6", color:"#fff", border:"none",
                borderRadius:10, padding:"12px", fontSize:14, fontWeight:700, cursor:"pointer"
              }}>
                Next → Configure Columns
              </button>
            </>
          )}
          {/* STEP 2 — Configure */}
          {step===2 && (
            <>
              {/* Selected type preview */}
              <div style={{ background:"#111827", borderRadius:10, padding:"12px 14px", border:"1px solid #2D3547", marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
                <span style={{ fontSize:24 }}>{selectedType?.icon}</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#F9FAFB" }}>{selectedType?.label}</div>
                  <div style={{ fontSize:11, color:"#6B7280" }}>{selectedType?.desc}</div>
                </div>
                <button onClick={()=>setStep(1)} style={{ marginLeft:"auto", fontSize:11, color:"#3B82F6", background:"none", border:"1px solid #2D3547", borderRadius:6, padding:"3px 10px", cursor:"pointer" }}>Change</button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
                <div>
                  <label style={lbl}>X Axis Column (Category) *</label>
                  <select value={xCol} onChange={e=>setXCol(e.target.value)} style={inp}>
                    {allCols.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                  <div style={{ fontSize:10, color:"#4B5563", marginTop:4 }}>Usually a text/category column</div>
                </div>
                <div>
                  <label style={lbl}>Y Axis Column (Value) *</label>
                  <select value={yCol} onChange={e=>setYCol(e.target.value)} style={inp}>
                    {allCols.map(c=><option key={c} value={c}>{c}</option>)}
                  </select>
                  <div style={{ fontSize:10, color:"#4B5563", marginTop:4 }}>Usually a numeric column</div>
                </div>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:14, marginBottom:20 }}>
                <div>
                  <label style={lbl}>Chart Title (optional)</label>
                  <input value={title} onChange={e=>setTitle(e.target.value)}
                    placeholder={`${selectedType?.label} — ${yCol} by ${xCol}`} style={inp}/>
                </div>
                <div>
                  <label style={lbl}>Size</label>
                  <select value={size} onChange={e=>setSize(e.target.value)} style={inp}>
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large (Full Width)</option>
                  </select>
                </div>
              </div>
              {/* Column guide */}
              <div style={{ background:"#111827", borderRadius:8, padding:"10px 12px", marginBottom:16, border:"1px solid #1F2937" }}>
                <div style={{ fontSize:10, color:"#4B5563", fontWeight:700, marginBottom:6, textTransform:"uppercase" }}>Available Columns</div>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {numCols.map(c=>(
                    <span key={c} style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background:"#3B82F620", color:"#3B82F6", border:"1px solid #3B82F640" }}>📊 {c}</span>
                  ))}
                  {catCols.map(c=>(
                    <span key={c} style={{ fontSize:10, padding:"2px 8px", borderRadius:20, background:"#8B5CF620", color:"#8B5CF6", border:"1px solid #8B5CF640" }}>🏷 {c}</span>
                  ))}
                </div>
                <div style={{ fontSize:9, color:"#374151", marginTop:6 }}>📊 Blue = numeric (use for Y axis) · 🏷 Purple = category (use for X axis)</div>
              </div>
              <div style={{ display:"flex", gap:10 }}>
                <button onClick={()=>setStep(1)} style={{ background:"#1F2937", color:"#6B7280", border:"1px solid #2D3547", borderRadius:10, padding:"12px 20px", fontSize:13, cursor:"pointer" }}>← Back</button>
                <button onClick={handleAdd} style={{
                  flex:1, background:"#3B82F6", color:"#fff", border:"none",
                  borderRadius:10, padding:"12px", fontSize:14, fontWeight:700,
                  cursor:"pointer", boxShadow:"0 4px 16px #3B82F640"
                }}>
                  ✅ Add Visual to Dashboard
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
