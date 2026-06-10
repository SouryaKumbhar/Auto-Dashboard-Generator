import Plot from "react-plotly.js";
import { CircularProgressbar, buildStyles } from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";

const COLORS = ["#6d28d9","#0891b2","#059669","#d97706","#dc2626","#7c3aed","#db2777","#0284c7"];

function getPlotData(type, data, xCol, yCol, accent) {
  const d = (data || []).slice(0, 100);
  if (!xCol || !yCol || !d.length) return null;

  const x = d.map(r => r[xCol]);
  const y = d.map(r => Number(r[yCol])).filter(v => !isNaN(v));
  const xFiltered = x.slice(0, y.length);

  const layout = {
    paper_bgcolor: "transparent",
    plot_bgcolor: "transparent",
    font: { family: "Inter, sans-serif", size: 10, color: "#6b7280" },
    margin: { t: 10, b: 40, l: 40, r: 10 },
    showlegend: false,
    xaxis: { gridcolor: "#f3f4f6", linecolor: "#e5e7ef" },
    yaxis: { gridcolor: "#f3f4f6", linecolor: "#e5e7ef" },
    autosize: true,
  };

  const config = {
    displayModeBar: false,
    responsive: true
  };

  switch (type) {
    case "bar":
      return { data:[{ type:"bar", x:xFiltered, y, marker:{ color: COLORS }, name: yCol }], layout, config };
    case "line":
      return { data:[{ type:"scatter", mode:"lines+markers", x:xFiltered, y, line:{ color:accent, width:2 }, name:yCol }], layout, config };
    case "area":
      return { data:[{ type:"scatter", mode:"lines", x:xFiltered, y, fill:"tozeroy", line:{ color:accent }, fillcolor:`${accent}20`, name:yCol }], layout, config };
    case "pie":
      return { data:[{ type:"pie", labels:xFiltered, values:y, marker:{ colors:COLORS }, textinfo:"label+percent" }],
        layout:{ ...layout, margin:{ t:10, b:10, l:10, r:10 } }, config };
    case "donut":
      return { data:[{ type:"pie", labels:xFiltered, values:y, hole:0.5, marker:{ colors:COLORS }, textinfo:"label+percent" }],
        layout:{ ...layout, margin:{ t:10, b:10, l:10, r:10 } }, config };
    case "scatter":
      return { data:[{ type:"scatter", mode:"markers", x:xFiltered, y, marker:{ color:accent, size:8 }, name:yCol }], layout, config };
    case "heatmap":
      return { data:[{ type:"heatmap", z:[y], x:xFiltered, colorscale:"Viridis" }],
        layout:{ ...layout, margin:{ t:10, b:60, l:60, r:10 } }, config };
    case "histogram":
      return { data:[{ type:"histogram", x:y, marker:{ color:accent } }], layout, config };
    case "waterfall":
      return { data:[{ type:"waterfall", x:xFiltered, y, connector:{ line:{ color:accent } } }], layout, config };
    case "funnel":
      return { data:[{ type:"funnel", y:xFiltered, x:y, marker:{ color:COLORS } }],
        layout:{ ...layout, margin:{ t:10, b:10, l:100, r:10 } }, config };
    default:
      return { data:[{ type:"bar", x:xFiltered, y, marker:{ color:COLORS } }], layout, config };
  }
}

export function renderWidget(widget, data, accent, onDrillDown) {
  const { type, config } = widget;

  if (type === "kpi") {
    const vals = (data||[]).map(r => Number(r[config?.column])).filter(v => !isNaN(v));
    const value = vals.length ? vals.reduce((a,b)=>a+b,0) : 0;
    const formatted = value >= 1e6 ? `${(value/1e6).toFixed(1)}M`
      : value >= 1e3 ? `${(value/1e3).toFixed(1)}K`
      : value.toLocaleString("en-IN");
    const color = config?.color || accent;
    return (
      <div style={{ height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"8px 16px" }}>
        <div style={{ fontSize:10, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.5px", fontWeight:600, marginBottom:8, textAlign:"center" }}>
          {config?.label || "KPI"}
        </div>
        <div style={{ fontSize:32, fontWeight:700, color, letterSpacing:"-0.5px" }}>{config?.prefix||""}{formatted}{config?.suffix||""}</div>
        {config?.target && (
          <div style={{ marginTop:8, width:"100%" }}>
            <div style={{ height:4, background:"#f0f0f0", borderRadius:2, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${Math.min((value/config.target)*100,100)}%`, background:color, borderRadius:2, transition:"width 0.5s" }}/>
            </div>
            <div style={{ fontSize:10, color:"#9ca3af", marginTop:4, textAlign:"center" }}>
              {((value/config.target)*100).toFixed(1)}% of target
            </div>
          </div>
        )}
      </div>
    );
  }

  if (type === "gauge") {
    const vals = (data||[]).map(r => Number(r[config?.column])).filter(v => !isNaN(v));
    const value = vals.length ? vals[0] : 0;
    const max = config?.max || 100;
    const pct = Math.min((value/max)*100, 100);
    const color = config?.color || accent;
    return (
      <div style={{ height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:12 }}>
        <div style={{ width:120, height:120 }}>
          <CircularProgressbar
            value={pct}
            text={`${pct.toFixed(0)}%`}
            styles={buildStyles({
              pathColor: color,
              textColor: color,
              trailColor: "#f0f0f0",
              textSize: "16px"
            })}
          />
        </div>
        <div style={{ fontSize:11, color:"#9ca3af", marginTop:8, fontWeight:500 }}>{config?.label||"Gauge"}</div>
      </div>
    );
  }

  if (type === "table") {
    const cols = config?.columns || Object.keys((data||[])[0]||{}).slice(0,5);
    return (
      <div style={{ height:"100%", overflowAuto:"auto", fontSize:11 }}>
        <table style={{ width:"100%", borderCollapse:"collapse" }}>
          <thead>
            <tr style={{ background:"#fafafa" }}>
              {cols.map(c => (
                <th key={c} style={{ padding:"6px 10px", textAlign:"left", color:"#6b7280", fontWeight:600, textTransform:"uppercase", fontSize:9, letterSpacing:"0.4px", borderBottom:"0.5px solid #eee" }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data||[]).slice(0,10).map((row,i) => (
              <tr key={i} style={{ borderBottom:"0.5px solid #f9fafb", cursor:"pointer" }}
                onClick={() => onDrillDown && onDrillDown(row)}>
                {cols.map(c => (
                  <td key={c} style={{ padding:"6px 10px", color:"#374151" }}>
                    {row[c] !== null && row[c] !== undefined ? String(row[c]).slice(0,25) : "—"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === "card") {
    return (
      <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center", background:`${config?.color||accent}10`, borderRadius:8, padding:16 }}>
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:36 }}>{config?.icon||"📊"}</div>
          <div style={{ fontSize:18, fontWeight:700, color:config?.color||accent, marginTop:8 }}>{config?.value||"—"}</div>
          <div style={{ fontSize:11, color:"#9ca3af", marginTop:4 }}>{config?.label||"Card"}</div>
        </div>
      </div>
    );
  }

  // Default: Plotly chart
  const plotData = getPlotData(type, data, config?.x_column, config?.y_column, accent);
  if (!plotData) {
    return (
      <div style={{ height:"100%", display:"flex", alignItems:"center", justifyContent:"center", color:"#d1d5db", flexDirection:"column", gap:6 }}>
        <span style={{ fontSize:24 }}>📊</span>
        <span style={{ fontSize:11 }}>No data configured</span>
      </div>
    );
  }

  return (
    <Plot
      data={plotData.data}
      layout={plotData.layout}
      config={plotData.config}
      style={{ width:"100%", height:"100%" }}
      useResizeHandler
    />
  );
}