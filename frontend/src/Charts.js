import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, ScatterChart, Scatter,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Treemap, FunnelChart, Funnel, LabelList,
  ComposedChart
} from "recharts";

export const CHART_TYPES = [
  {value:"bar",label:"Bar Chart"},
  {value:"stackedbar",label:"Stacked Bar"},
  {value:"line",label:"Line Chart"},
  {value:"area",label:"Area Chart"},
  {value:"stackedarea",label:"Stacked Area"},
  {value:"pie",label:"Pie Chart"},
  {value:"donut",label:"Donut Chart"},
  {value:"scatter",label:"Scatter Plot"},
  {value:"radar",label:"Radar Chart"},
  {value:"treemap",label:"Treemap"},
  {value:"funnel",label:"Funnel"},
  {value:"composed",label:"Bar + Line"},
  {value:"table",label:"Data Table"},
];

const PALETTE = ["#6d28d9","#0891b2","#059669","#d97706","#dc2626","#7c3aed","#db2777","#0284c7","#065f46","#92400e","#1d4ed8","#b45309"];

const ax = { tick:{fontSize:10,fill:"#9ca3af"} };
const tp = { contentStyle:{borderRadius:8,border:"0.5px solid #eee",fontSize:11,padding:"6px 10px",background:"#fff"} };

export function renderChart(type, data, xCol, yCol, accent="#6d28d9", height=200) {
  const d = (data||[]).slice(0,60);
  if (!xCol||!yCol||!d.length) return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height,color:"#e5e7ef",fontSize:12,flexDirection:"column",gap:6}}>
      <span style={{fontSize:24}}>📊</span>No data
    </div>
  );

  if (type==="table") return (
    <div style={{overflowY:"auto",maxHeight:height}}>
      <table style={{width:"100%",borderCollapse:"collapse",fontSize:11}}>
        <thead><tr>
          {[xCol,yCol].map(k=><th key={k} style={{padding:"5px 8px",background:"#f9fafb",color:"#6b7280",fontWeight:600,textAlign:"left",borderBottom:"0.5px solid #eee",fontSize:10,textTransform:"uppercase"}}>{k}</th>)}
        </tr></thead>
        <tbody>{d.slice(0,12).map((row,i)=>(
          <tr key={i} style={{borderBottom:"0.5px solid #f9fafb"}}>
            {[xCol,yCol].map(k=><td key={k} style={{padding:"5px 8px",color:"#374151"}}>{row[k]!==null?String(row[k]).slice(0,28):"—"}</td>)}
          </tr>
        ))}</tbody>
      </table>
    </div>
  );

  if (type==="treemap") return (
    <ResponsiveContainer width="100%" height={height}>
      <Treemap data={d.map(r=>({name:String(r[xCol]),size:Math.abs(Number(r[yCol]))||1}))} dataKey="size" stroke="#fff" fill={accent}>
        <Tooltip {...tp}/>
      </Treemap>
    </ResponsiveContainer>
  );

  if (type==="radar") return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={d.slice(0,8)}>
        <PolarGrid stroke="#f3f4f6"/><PolarAngleAxis dataKey={xCol} tick={{fontSize:10}}/>
        <PolarRadiusAxis tick={{fontSize:9}}/>
        <Radar dataKey={yCol} stroke={accent} fill={accent} fillOpacity={0.25}/>
        <Tooltip {...tp}/>
      </RadarChart>
    </ResponsiveContainer>
  );

  if (type==="funnel") return (
    <ResponsiveContainer width="100%" height={height}>
      <FunnelChart>
        <Tooltip {...tp}/>
        <Funnel dataKey={yCol} data={d.slice(0,6)} isAnimationActive>
          {d.slice(0,6).map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]}/>)}
          <LabelList position="right" fill="#374151" fontSize={10} dataKey={xCol}/>
        </Funnel>
      </FunnelChart>
    </ResponsiveContainer>
  );

  if (type==="pie"||type==="donut") return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie data={d.slice(0,10)} dataKey={yCol} nameKey={xCol} cx="50%" cy="50%"
          outerRadius={height*0.35} innerRadius={type==="donut"?height*0.18:0}
          label={type==="pie"?({name})=>name?.slice(0,8):false}>
          {d.slice(0,10).map((_,i)=><Cell key={i} fill={PALETTE[i%PALETTE.length]}/>)}
        </Pie>
        <Tooltip {...tp}/><Legend iconSize={8} wrapperStyle={{fontSize:10}}/>
      </PieChart>
    </ResponsiveContainer>
  );

  if (type==="scatter") return (
    <ResponsiveContainer width="100%" height={height}>
      <ScatterChart><CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
        <XAxis dataKey={xCol} {...ax}/><YAxis dataKey={yCol} {...ax}/>
        <Tooltip {...tp}/><Scatter data={d} fill={accent} opacity={0.7}/>
      </ScatterChart>
    </ResponsiveContainer>
  );

  if (type==="composed") return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={d}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
        <XAxis dataKey={xCol} {...ax}/><YAxis {...ax}/>
        <Tooltip {...tp}/><Legend iconSize={8} wrapperStyle={{fontSize:10}}/>
        <Bar dataKey={yCol} fill={accent} radius={[3,3,0,0]} opacity={0.8}/>
        <Line type="monotone" dataKey={yCol} stroke="#d97706" strokeWidth={2} dot={false}/>
      </ComposedChart>
    </ResponsiveContainer>
  );

  if (type==="area"||type==="stackedarea") return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={d}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
        <XAxis dataKey={xCol} {...ax}/><YAxis {...ax}/>
        <Tooltip {...tp}/><Legend iconSize={8} wrapperStyle={{fontSize:10}}/>
        <Area type="monotone" dataKey={yCol} stroke={accent} fill={`${accent}20`} strokeWidth={2.5}/>
      </AreaChart>
    </ResponsiveContainer>
  );

  if (type==="line") return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={d}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
        <XAxis dataKey={xCol} {...ax}/><YAxis {...ax}/>
        <Tooltip {...tp}/><Legend iconSize={8} wrapperStyle={{fontSize:10}}/>
        <Line type="monotone" dataKey={yCol} stroke={accent} strokeWidth={2.5} dot={false} activeDot={{r:4}}/>
      </LineChart>
    </ResponsiveContainer>
  );

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={d}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6"/>
        <XAxis dataKey={xCol} {...ax}/><YAxis {...ax}/>
        <Tooltip {...tp}/><Legend iconSize={8} wrapperStyle={{fontSize:10}}/>
        <Bar dataKey={yCol} radius={[3,3,0,0]}>
          {d.map((_,i)=><Cell key={i} fill={type==="stackedbar"?PALETTE[i%PALETTE.length]:accent}/>)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}