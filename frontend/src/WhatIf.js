import { useState, useEffect } from "react";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, Cell
} from "recharts";

const BACKEND = "http://localhost:8000" //"https://autodash-backend-oqq2.onrender.com";

const QUICK_SCENARIOS = [
  "What if revenue increases by 20%?",
  "What if costs increase by 15%?",
  "What if we lose 10% of customers?",
  "What if sales drop by 30% next quarter?",
  "What if we expand to 2 new regions?",
  "What if employee count doubles?",
];

export default function WhatIf({ db, data, kpis, accent, palette: P, onClose }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
  axios.get(`${BACKEND}/`).catch(() => {});
  }, []);

  async function runSimulation(scenario) {
  const msg = scenario || input.trim();
  if (!msg) return;
  setLoading(true);
  setError("");
  setResult(null);

  try {
    const token = localStorage.getItem("token");

    // FIX: col_info is a dict {colName: {dtype, nulls, unique}}
    const current_stats = {};
    Object.entries(db?.col_info || {}).forEach(([colName, info]) => {
      if (info.dtype?.includes("int") || info.dtype?.includes("float")) {
        const vals = (data || []).map(r => Number(r[colName])).filter(v => !isNaN(v));
        if (vals.length) {
          current_stats[colName] = {
            sum: vals.reduce((a, b) => a + b, 0),
            mean: vals.reduce((a, b) => a + b, 0) / vals.length,
            max: Math.max(...vals),
            min: Math.min(...vals)
          };
        }
      }
    });

    const res = await axios.post(`${BACKEND}/whatif`, {
      message: msg,
      columns: db?.columns || [],
      current_stats,
      domain: db?.domain || "general"
    }, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 60000
    });

    setResult(res.data);

    if (res.data.adjustments && Object.keys(res.data.adjustments).length > 0) {
      const simulated = (data || []).map(row => {
        const newRow = { ...row };
        Object.entries(res.data.adjustments).forEach(([col, change]) => {
          if (newRow[col] !== null && !isNaN(Number(newRow[col]))) {
            newRow[col] = Number(newRow[col]) * (1 + change);
          }
        });
        return newRow;
      });
    }

  } catch (err) {
    if (err.code === 'ECONNABORTED') {
      setError("Server waking up. Wait 30 seconds and try again.");
    } else if (err.response?.status === 401) {
      setError("Session expired. Please log in again.");
    } else if (err.response?.status === 404) {
      setError("Backend route not found. Check server deployment.");
    } else {
      // Show the real error so you can debug
      setError(`Simulation failed: ${err.message}`);
    }
  }
  setLoading(false);
}  
  function formatVal(v) {
    if (!v && v !== 0) return "—";
    const n = Number(v);
    if (isNaN(n)) return String(v);
    if (n >= 1e9) return `${(n/1e9).toFixed(1)}B`;
    if (n >= 1e6) return `${(n/1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n/1e3).toFixed(1)}K`;
    return n.toLocaleString("en-IN");
  }

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 2000, padding: 20
    }}>
      <div style={{
        background: P.card, borderRadius: 20, width: "100%", maxWidth: 800,
        maxHeight: "90vh", overflow: "hidden", display: "flex",
        flexDirection: "column", border: `1px solid ${P.border}`,
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
      }}>

        {/* Header */}
        <div style={{
          padding: "18px 22px", background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
          color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0
        }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700 }}>🔮 What-If Scenario Simulator</div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
              Ask AI to simulate any business scenario instantly
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "rgba(255,255,255,0.2)", border: "none",
            borderRadius: 8, padding: "6px 12px", color: "#fff",
            cursor: "pointer", fontSize: 14
          }}>✕ Close</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: 22 }}>

          {/* Input Area */}
          <div style={{
            background: P.bg, borderRadius: 14, padding: 18,
            border: `1px solid ${P.border}`, marginBottom: 18
          }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: P.text, marginBottom: 10 }}>
              Describe your scenario
            </div>
            <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && runSimulation()}
                placeholder='e.g. "What if revenue increases by 25% next quarter?"'
                style={{
                  flex: 1, padding: "10px 14px", borderRadius: 10,
                  border: `1px solid ${P.border}`, fontSize: 13,
                  outline: "none", background: P.card, color: P.text
                }}
              />
              <button
                onClick={() => runSimulation()}
                disabled={loading || !input.trim()}
                style={{
                  background: loading ? `${accent}80` : accent,
                  color: "#fff", border: "none", borderRadius: 10,
                  padding: "10px 20px", fontSize: 13, fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", gap: 6, flexShrink: 0
                }}>
                {loading ? "⚙ Simulating..." : "▶ Run Simulation"}
              </button>
            </div>

            {/* Quick Scenarios */}
            <div style={{ fontSize: 11, color: P.sub, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Quick Scenarios
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {QUICK_SCENARIOS.map(s => (
                <button key={s} onClick={() => { setInput(s); runSimulation(s); }}
                  style={{
                    padding: "5px 12px", borderRadius: 20, fontSize: 11,
                    border: `1px solid ${P.border}`, background: P.card,
                    color: P.text, cursor: "pointer", transition: "all 0.2s"
                  }}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: "10px 14px", color: "#DC2626", fontSize: 12, marginBottom: 16 }}>
              {error}
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>🔮</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: accent }}>AI is simulating your scenario...</div>
              <div style={{ fontSize: 13, color: P.sub, marginTop: 6 }}>Recalculating all KPIs and charts</div>
            </div>
          )}

          {/* Results */}
          {result && !loading && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Scenario Title */}
              <div style={{
                background: `${accent}10`, borderRadius: 14, padding: "16px 20px",
                border: `1px solid ${accent}30`
              }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: accent, marginBottom: 6 }}>
                  📋 {result.scenario_title}
                </div>
                <div style={{ fontSize: 13, color: P.text, lineHeight: 1.6, marginBottom: 12 }}>
                  {result.explanation}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div style={{ background: "#F0FDF4", borderRadius: 10, padding: "10px 14px", border: "1px solid #BBF7D0" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#059669", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>💡 Recommendation</div>
                    <div style={{ fontSize: 12, color: "#064E3B", lineHeight: 1.5 }}>{result.recommendation}</div>
                  </div>
                  <div style={{ background: "#FEF2F2", borderRadius: 10, padding: "10px 14px", border: "1px solid #FECACA" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#DC2626", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 4 }}>⚠ Risk</div>
                    <div style={{ fontSize: 12, color: "#7F1D1D", lineHeight: 1.5 }}>{result.risk}</div>
                  </div>
                </div>
              </div>

              {/* KPI Impact Cards */}
              {result.kpi_impacts && result.kpi_impacts.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginBottom: 12 }}>
                    📊 KPI Impact — Current vs Simulated
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
                    {result.kpi_impacts.map((kpi, i) => (
                      <div key={i} style={{
                        background: P.card, borderRadius: 14, padding: "16px 18px",
                        border: `1px solid ${kpi.positive ? "#BBF7D0" : "#FECACA"}`,
                        position: "relative", overflow: "hidden"
                      }}>
                        <div style={{
                          position: "absolute", top: 0, left: 0, right: 0, height: 3,
                          background: kpi.positive ? "#059669" : "#DC2626"
                        }}/>
                        <div style={{ fontSize: 10, color: P.sub, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 10, marginTop: 4 }}>
                          {kpi.label}
                        </div>

                        {/* Current */}
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ fontSize: 9, color: P.sub, marginBottom: 2 }}>CURRENT</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: P.text }}>{formatVal(kpi.current)}</div>
                        </div>

                        {/* Arrow */}
                        <div style={{ fontSize: 18, color: kpi.positive ? "#059669" : "#DC2626", marginBottom: 8, textAlign: "center" }}>
                          {kpi.positive ? "↑" : "↓"}
                        </div>

                        {/* Simulated */}
                        <div style={{ marginBottom: 10 }}>
                          <div style={{ fontSize: 9, color: P.sub, marginBottom: 2 }}>SIMULATED</div>
                          <div style={{ fontSize: 18, fontWeight: 700, color: kpi.positive ? "#059669" : "#DC2626" }}>{formatVal(kpi.simulated)}</div>
                        </div>

                        {/* Change badge */}
                        <div style={{
                          display: "inline-block", padding: "3px 10px", borderRadius: 20,
                          background: kpi.positive ? "#D1FAE5" : "#FEE2E2",
                          color: kpi.positive ? "#065F46" : "#7F1D1D",
                          fontSize: 11, fontWeight: 700
                        }}>
                          {kpi.positive ? "+" : ""}{kpi.change_pct?.toFixed(1)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Comparison Chart */}
              {result.kpi_impacts && result.kpi_impacts.length > 0 && (
                <div style={{ background: P.card, borderRadius: 14, padding: "16px 18px", border: `1px solid ${P.border}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: P.text, marginBottom: 14 }}>
                    📈 Side-by-Side Comparison Chart
                  </div>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      data={result.kpi_impacts.map(k => ({
                        name: k.label.slice(0, 12),
                        Current: Math.abs(Number(k.current) || 0),
                        Simulated: Math.abs(Number(k.simulated) || 0),
                        positive: k.positive
                      }))}
                      margin={{ top: 5, right: 20, bottom: 5, left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={`${P.border}80`}/>
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: P.sub }}/>
                      <YAxis tick={{ fontSize: 10, fill: P.sub }}/>
                      <Tooltip
                        contentStyle={{ borderRadius: 10, border: `1px solid ${P.border}`, fontSize: 11, background: P.card, color: P.text }}
                        formatter={(value) => formatVal(value)}
                      />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }}/>
                      <Bar dataKey="Current" fill={`${accent}80`} radius={[4,4,0,0]} name="Current"/>
                      <Bar dataKey="Simulated" radius={[4,4,0,0]} name="Simulated">
                        {result.kpi_impacts.map((k, i) => (
                          <Cell key={i} fill={k.positive ? "#059669" : "#DC2626"}/>
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Applied Adjustments */}
              {result.adjustments && Object.keys(result.adjustments).length > 0 && (
                <div style={{ background: P.bg, borderRadius: 14, padding: "14px 18px", border: `1px solid ${P.border}` }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: P.sub, marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                    Applied Adjustments to Data
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {Object.entries(result.adjustments).map(([col, change]) => (
                      <div key={col} style={{
                        padding: "5px 12px", borderRadius: 20,
                        background: Number(change) >= 0 ? "#D1FAE5" : "#FEE2E2",
                        color: Number(change) >= 0 ? "#065F46" : "#7F1D1D",
                        fontSize: 11, fontWeight: 600,
                        border: `1px solid ${Number(change) >= 0 ? "#6EE7B7" : "#FCA5A5"}`
                      }}>
                        {col}: {Number(change) >= 0 ? "+" : ""}{(Number(change) * 100).toFixed(0)}%
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}