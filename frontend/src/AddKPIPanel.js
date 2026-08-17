
import { useState } from "react";
const AGG_OPTIONS = [
  { value:"sum",   label:"Sum — Total of all values" },
  { value:"mean",  label:"Average — Mean value" },
  { value:"count", label:"Count — Number of rows" },
  { value:"max",   label:"Max — Highest value" },
  { value:"min",   label:"Min — Lowest value" },
];
const ICON_OPTIONS = ["💰","📦","👥","🎯","⚡","📊","🔥","💎","📈","🏭","🛒","💳","🌍","⚙","📋"];
const COLOR_OPTIONS = ["#E8590C","#3B82F6","#8B5CF6","#10B981","#F59E0B","#EF4444","#06B6D4","#84CC16","#EC4899","#F97316"];
export default function AddKPIPanel({ db, onAdd, onClose }) {
  const numCols = db && Array.isArray(db.col_info)
    ? db.col_info.filter(c=>c.type.includes("int")||c.type.includes("float")).map(c=>c.name)
    : db?.columns || [];
  const [label, setLabel]   = useState("");
  const [column, setColumn] = useState(numCols[0]||"");
  const [agg, setAgg]       = useState("sum");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [icon, setIcon]     = useState("📊");
  const [color, setColor]   = useState("#3B82F6");
  // Live preview value
  function previewValue() {
    if (!db?.data || !column) return "—";
    const vals = db.data.map(r=>Number(r[column])).filter(v=>!isNaN(v)&&isFinite(v));
    if (!vals.length) return "—";
    let v;
    switch(agg) {
      case "sum":   v=vals.reduce((a,b)=>a+b,0); break;
      case "mean":  v=vals.reduce((a,b)=>a+b,0)/vals.length; break;
      case "count": v=vals.length; break;
      case "max":   v=Math.max(...vals); break;
      case "min":   v=Math.min(...vals); break;
      default:      v=vals.length;
    }
    const fmt = v>=1e9?`${(v/1e9).toFixed(1)}B`:v>=1e6?`${(v/1e6).toFixed(1)}M`:v>=1e3?`${(v/1e3).toFixed(1)}K`:parseFloat(v.toFixed(1)).toLocaleString("en-IN");
    return `${prefix}${fmt}${suffix}`;
  }
  function handleAdd() {
    if (!column) return alert("Please select a column");
    onAdd({
      label: label || column,
      column,
      aggregation: agg,
      prefix,
      suffix,
      icon,
      color
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
        background:"#1A1F2E", borderRadius:16, width:"100%", maxWidth:560,
        border:"1px solid #2D3547", boxShadow:"0 20px 60px rgba(0,0,0,0.5)",
        overflow:"hidden"
      }}>
        {/* Header */}
        <div style={{ padding:"16px 20px", background:"#111827", borderBottom:"1px solid #2D3547", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"#F9FAFB" }}>+ Add KPI Card</div>
            <div style={{ fontSize:11, color:"#6B7280", marginTop:2 }}>Configure and preview your KPI before adding</div>
          </div>
          <button onClick={onClose} style={{ background:"#1F2937", border:"1px solid #2D3547", borderRadius:8, padding:"5px 10px", color:"#6B7280", cursor:"pointer", fontSize:13 }}>✕</button>
        </div>
        <div style={{ padding:20 }}>
          {/* LIVE PREVIEW */}
          <div style={{ background:"#111827", borderRadius:12, padding:"16px 18px", border:`2px solid ${color}`, marginBottom:20, position:"relative", overflow:"hidden" }}>
            <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:color }}/>
            <div style={{ fontSize:10, color:"#6B7280", textTransform:"uppercase", letterSpacing:"0.6px", marginBottom:8, display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:18 }}>{icon}</span>
              <span>{label || column || "KPI Label"}</span>
            </div>
            <div style={{ fontSize:30, fontWeight:700, color:color, marginBottom:6 }}>{previewValue()}</div>
            <span style={{ fontSize:10, color:"#10B981", background:"#10B98120", padding:"2px 8px", borderRadius:20, fontWeight:600 }}>▲ Live · {agg}</span>
            <div style={{ position:"absolute", top:10, right:14, fontSize:10, color:"#4B5563", fontWeight:600 }}>PREVIEW</div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
            {/* Column */}
            <div>
              <label style={lbl}>Data Column *</label>
              <select value={column} onChange={e=>setColumn(e.target.value)} style={inp}>
                {numCols.map(c=><option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {/* Aggregation */}
            <div>
              <label style={lbl}>Calculation Type *</label>
              <select value={agg} onChange={e=>setAgg(e.target.value)} style={inp}>
                {AGG_OPTIONS.map(a=><option key={a.value} value={a.value}>{a.label}</option>)}
              </select>
            </div>
            {/* Label */}
            <div>
              <label style={lbl}>KPI Label</label>
              <input value={label} onChange={e=>setLabel(e.target.value)} placeholder={column||"e.g. Total Revenue"} style={inp}/>
            </div>
            {/* Prefix + Suffix */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              <div>
                <label style={lbl}>Prefix</label>
                <input value={prefix} onChange={e=>setPrefix(e.target.value)} placeholder="₹ or $" style={inp}/>
              </div>
              <div>
                <label style={lbl}>Suffix</label>
                <input value={suffix} onChange={e=>setSuffix(e.target.value)} placeholder="% or K" style={inp}/>
              </div>
            </div>
          </div>
          {/* Color picker */}
          <div style={{ marginBottom:14 }}>
            <label style={lbl}>Card Color</label>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {COLOR_OPTIONS.map(c=>(
                <div key={c} onClick={()=>setColor(c)} style={{
                  width:28, height:28, borderRadius:"50%", background:c, cursor:"pointer",
                  border:color===c?"3px solid #fff":"2px solid transparent",
                  boxShadow:color===c?`0 0 0 2px ${c}`:"none", transition:"all 0.15s"
                }}/>
              ))}
              <input type="color" value={color} onChange={e=>setColor(e.target.value)}
                style={{ width:28, height:28, borderRadius:"50%", border:"none", cursor:"pointer", padding:0, background:"transparent" }}
                title="Custom color"/>
            </div>
          </div>
          {/* Icon picker */}
          <div style={{ marginBottom:20 }}>
            <label style={lbl}>Icon</label>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {ICON_OPTIONS.map(ic=>(
                <div key={ic} onClick={()=>setIcon(ic)} style={{
                  width:36, height:36, borderRadius:8, cursor:"pointer", fontSize:18,
                  display:"flex", alignItems:"center", justifyContent:"center",
                  background:icon===ic?`${color}30`:"#111827",
                  border:`1px solid ${icon===ic?color:"#2D3547"}`,
                  transition:"all 0.15s"
                }}>{ic}</div>
              ))}
            </div>
          </div>
          {/* Buttons */}
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={handleAdd} style={{
              flex:1, background:"#3B82F6", color:"#fff", border:"none",
              borderRadius:10, padding:"12px", fontSize:14, fontWeight:700,
              cursor:"pointer", boxShadow:"0 4px 16px #3B82F640"
            }}>
              ✅ Add KPI to Dashboard
            </button>
            <button onClick={onClose} style={{
              background:"#1F2937", color:"#6B7280", border:"1px solid #2D3547",
              borderRadius:10, padding:"12px 20px", fontSize:13, cursor:"pointer"
            }}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
