import { useState, useEffect, useRef } from "react";
import axios from "axios";

const BACKEND = "https://autodash-backend-oqq2.onrender.com";

function AnimatedBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animId;
    let particles = [];
    let time = 0;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    // Create floating data particles
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2 + 0.5,
        alpha: Math.random() * 0.6 + 0.2,
        color: Math.random() > 0.6 ? "#7C3AED" : Math.random() > 0.5 ? "#2563EB" : "#06B6D4"
      });
    }

    // KPI card positions
    const cards = [
      { x: 0.08, y: 0.15, w: 0.16, h: 0.12, label: "Total Revenue", value: "₹24.5M", change: "+12.4%", positive: true },
      { x: 0.08, y: 0.33, w: 0.16, h: 0.12, label: "Active Users", value: "8,340", change: "+6.1%", positive: true },
      { x: 0.08, y: 0.51, w: 0.16, h: 0.12, label: "Avg Sale", value: "₹2,938", change: "-2.3%", positive: false },
      { x: 0.76, y: 0.15, w: 0.16, h: 0.12, label: "Regions", value: "5", change: "All Live", positive: true },
      { x: 0.76, y: 0.33, w: 0.16, h: 0.12, label: "Orders", value: "1,284", change: "+18.7%", positive: true },
      { x: 0.76, y: 0.51, w: 0.16, h: 0.12, label: "Growth", value: "34%", change: "+5.2%", positive: true },
    ];

    // Bar chart data
    const bars = [0.4, 0.65, 0.5, 0.8, 0.6, 0.9, 0.7, 0.85];
    const barColors = ["#7C3AED","#2563EB","#7C3AED","#06B6D4","#7C3AED","#2563EB","#06B6D4","#7C3AED"];

    // Line chart points
    const linePoints = [0.6, 0.4, 0.55, 0.35, 0.5, 0.3, 0.45, 0.25, 0.4, 0.2, 0.35, 0.15];

    function drawCard(card, t) {
      const x = card.x * canvas.width;
      const y = card.y * canvas.height;
      const w = card.w * canvas.width;
      const h = card.h * canvas.height;
      const pulse = 0.7 + Math.sin(t * 0.02 + card.x * 10) * 0.1;

      // Card background
      ctx.save();
      ctx.globalAlpha = 0.15 * pulse;
      ctx.fillStyle = "#1E1B4B";
      roundRect(ctx, x, y, w, h, 10);
      ctx.fill();

      // Card border glow
      ctx.globalAlpha = 0.3 * pulse;
      ctx.strokeStyle = "#7C3AED";
      ctx.lineWidth = 1;
      roundRect(ctx, x, y, w, h, 10);
      ctx.stroke();

      // Top accent line
      ctx.globalAlpha = 0.8 * pulse;
      ctx.strokeStyle = card.positive ? "#7C3AED" : "#DC2626";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 10, y + 2);
      ctx.lineTo(x + w - 10, y + 2);
      ctx.stroke();

      // Label
      ctx.globalAlpha = 0.5 * pulse;
      ctx.fillStyle = "#9CA3AF";
      ctx.font = `${w * 0.09}px Inter, sans-serif`;
      ctx.fillText(card.label, x + 10, y + h * 0.3);

      // Value
      ctx.globalAlpha = 0.9 * pulse;
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `bold ${w * 0.16}px Inter, sans-serif`;
      ctx.fillText(card.value, x + 10, y + h * 0.6);

      // Change
      ctx.globalAlpha = 0.8 * pulse;
      ctx.fillStyle = card.positive ? "#10B981" : "#EF4444";
      ctx.font = `${w * 0.09}px Inter, sans-serif`;
      ctx.fillText(card.change, x + 10, y + h * 0.85);

      ctx.restore();
    }

    function drawBarChart(t) {
      const cx = canvas.width * 0.08;
      const cy = canvas.height * 0.7;
      const cw = canvas.width * 0.16;
      const ch = canvas.height * 0.18;

      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = "#1E1B4B";
      roundRect(ctx, cx, cy, cw, ch, 10);
      ctx.fill();
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = "#7C3AED";
      ctx.lineWidth = 1;
      roundRect(ctx, cx, cy, cw, ch, 10);
      ctx.stroke();

      ctx.globalAlpha = 0.4;
      ctx.fillStyle = "#9CA3AF";
      ctx.font = `${cw * 0.09}px Inter, sans-serif`;
      ctx.fillText("Revenue by Region", cx + 8, cy + 16);

      const barW = (cw - 24) / bars.length - 4;
      bars.forEach((h, i) => {
        const pulse = 0.6 + Math.sin(t * 0.015 + i * 0.5) * 0.2;
        const bh = (ch - 30) * h * pulse;
        const bx = cx + 12 + i * (barW + 4);
        const by = cy + ch - bh - 4;
        ctx.globalAlpha = 0.6 * pulse;
        ctx.fillStyle = barColors[i];
        roundRect(ctx, bx, by, barW, bh, 3);
        ctx.fill();
      });
      ctx.restore();
    }

    function drawLineChart(t) {
      const cx = canvas.width * 0.76;
      const cy = canvas.height * 0.7;
      const cw = canvas.width * 0.16;
      const ch = canvas.height * 0.18;

      ctx.save();
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = "#1E1B4B";
      roundRect(ctx, cx, cy, cw, ch, 10);
      ctx.fill();
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = "#2563EB";
      ctx.lineWidth = 1;
      roundRect(ctx, cx, cy, cw, ch, 10);
      ctx.stroke();

      ctx.globalAlpha = 0.4;
      ctx.fillStyle = "#9CA3AF";
      ctx.font = `${cw * 0.09}px Inter, sans-serif`;
      ctx.fillText("Sales Trend", cx + 8, cy + 16);

      const pts = linePoints.map((v, i) => ({
        x: cx + 12 + (i / (linePoints.length - 1)) * (cw - 24),
        y: cy + 24 + (ch - 32) * (v + Math.sin(t * 0.01 + i) * 0.05)
      }));

      // Fill
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = "#2563EB";
      ctx.beginPath();
      ctx.moveTo(pts[0].x, cy + ch - 4);
      pts.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.lineTo(pts[pts.length-1].x, cy + ch - 4);
      ctx.closePath();
      ctx.fill();

      // Line
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = "#2563EB";
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.beginPath();
      pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();

      // Dots
      pts.forEach(p => {
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = "#2563EB";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.restore();
    }

    function drawParticles() {
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.save();
        ctx.globalAlpha = p.alpha * 0.6;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Connect nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < 100) {
            ctx.save();
            ctx.globalAlpha = (1 - dist/100) * 0.08;
            ctx.strokeStyle = "#7C3AED";
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    }

    function drawGlowOrbs(t) {
      const orbs = [
        { x: 0.15, y: 0.5, r: 200, color: "#7C3AED" },
        { x: 0.85, y: 0.5, r: 180, color: "#2563EB" },
        { x: 0.5, y: 0.1, r: 150, color: "#06B6D4" },
        { x: 0.5, y: 0.9, r: 130, color: "#7C3AED" },
      ];
      orbs.forEach(orb => {
        const pulse = 0.8 + Math.sin(t * 0.008 + orb.x * 5) * 0.2;
        const grd = ctx.createRadialGradient(
          orb.x * canvas.width, orb.y * canvas.height, 0,
          orb.x * canvas.width, orb.y * canvas.height, orb.r * pulse
        );
        grd.addColorStop(0, orb.color + "22");
        grd.addColorStop(1, orb.color + "00");
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(orb.x * canvas.width, orb.y * canvas.height, orb.r * pulse, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    }

    function drawGrid() {
      ctx.save();
      ctx.globalAlpha = 0.03;
      ctx.strokeStyle = "#7C3AED";
      ctx.lineWidth = 0.5;
      const spacing = 50;
      for (let x = 0; x < canvas.width; x += spacing) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += spacing) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke();
      }
      ctx.restore();
    }

    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
    }

    function drawDataFlowLines(t) {
      const flows = [
        { x1: 0.24, y1: 0.21, x2: 0.36, y2: 0.5 },
        { x1: 0.24, y1: 0.39, x2: 0.36, y2: 0.5 },
        { x1: 0.24, y1: 0.57, x2: 0.36, y2: 0.5 },
        { x1: 0.76, y1: 0.21, x2: 0.64, y2: 0.5 },
        { x1: 0.76, y1: 0.39, x2: 0.64, y2: 0.5 },
        { x1: 0.76, y1: 0.57, x2: 0.64, y2: 0.5 },
      ];

      flows.forEach((fl, i) => {
        const progress = (t * 0.01 + i * 0.3) % 1;
        const x1 = fl.x1 * canvas.width;
        const y1 = fl.y1 * canvas.height;
        const x2 = fl.x2 * canvas.width;
        const y2 = fl.y2 * canvas.height;

        ctx.save();
        ctx.globalAlpha = 0.12;
        ctx.strokeStyle = "#7C3AED";
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        // Moving dot
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = "#7C3AED";
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(
          x1 + (x2 - x1) * progress,
          y1 + (y2 - y1) * progress,
          3, 0, Math.PI * 2
        );
        ctx.fill();
        ctx.restore();
      });
    }

    function animate() {
      time++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Deep dark background
      ctx.fillStyle = "#080812";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawGrid();
      drawGlowOrbs(time);
      drawParticles();
      drawDataFlowLines(time);
      cards.forEach(card => drawCard(card, time));
      drawBarChart(time);
      drawLineChart(time);

      animId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas ref={canvasRef} style={{
      position: "fixed", top: 0, left: 0, width: "100%", height: "100%",
      zIndex: 0, pointerEvents: "none"
    }}/>
  );
}

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("admin@company.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${BACKEND}/login`, { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      onLogin(res.data.user);
    } catch {
      setError("Wrong email or password");
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", background: "#080812",
      position: "relative", overflow: "hidden"
    }}>
      <AnimatedBackground />

      {/* Login Card */}
      <div style={{
        position: "relative", zIndex: 10,
        width: 420, background: "rgba(15, 12, 35, 0.85)",
        backdropFilter: "blur(20px)",
        borderRadius: 24, padding: "44px 40px",
        border: "1px solid rgba(124, 58, 237, 0.3)",
        boxShadow: "0 0 80px rgba(124, 58, 237, 0.15), 0 20px 60px rgba(0,0,0,0.5)"
      }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 18,
            background: "linear-gradient(135deg, #7C3AED, #2563EB)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px", fontSize: 28,
            boxShadow: "0 8px 32px rgba(124, 58, 237, 0.4)"
          }}>📊</div>
          <div style={{ color: "#fff", fontSize: 26, fontWeight: 700, letterSpacing: "-0.5px" }}>DataDash</div>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 4 }}>Production BI Platform</div>
        </div>

        {/* Fields */}
        {[
          { label: "EMAIL", value: email, setter: setEmail, type: "email" },
          { label: "PASSWORD", value: password, setter: setPassword, type: "password" }
        ].map(field => (
          <div key={field.label} style={{ marginBottom: 18 }}>
            <label style={{
              color: "rgba(255,255,255,0.45)", fontSize: 11, fontWeight: 700,
              display: "block", marginBottom: 8, letterSpacing: "0.8px"
            }}>{field.label}</label>
            <input
              type={field.type}
              value={field.value}
              onChange={e => field.setter(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              style={{
                width: "100%", padding: "13px 16px", borderRadius: 12,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(124, 58, 237, 0.25)",
                color: "#fff", fontSize: 14, outline: "none",
                transition: "border-color 0.2s",
                boxSizing: "border-box"
              }}
              onFocus={e => e.target.style.borderColor = "rgba(124, 58, 237, 0.8)"}
              onBlur={e => e.target.style.borderColor = "rgba(124, 58, 237, 0.25)"}
            />
          </div>
        ))}

        {/* Error */}
        {error && (
          <div style={{
            color: "#FCA5A5", fontSize: 12, marginBottom: 16,
            textAlign: "center", background: "rgba(220, 38, 38, 0.1)",
            padding: "8px 14px", borderRadius: 8, border: "1px solid rgba(220, 38, 38, 0.2)"
          }}>{error}</div>
        )}

        {/* Sign In Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%", padding: "14px", borderRadius: 12,
            background: loading
              ? "rgba(124, 58, 237, 0.5)"
              : "linear-gradient(135deg, #7C3AED, #2563EB)",
            color: "#fff", border: "none", fontSize: 15,
            fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
            boxShadow: loading ? "none" : "0 4px 24px rgba(124, 58, 237, 0.5)",
            transition: "all 0.2s", marginTop: 8, letterSpacing: "0.3px"
          }}>
          {loading ? "Signing in..." : "Sign In →"}
        </button>

        {/* Hint */}
        <div style={{
          textAlign: "center", marginTop: 20,
          color: "rgba(255,255,255,0.2)", fontSize: 11
        }}>
          admin@company.com / admin123
        </div>

        {/* Bottom badge */}
        <div style={{
          textAlign: "center", marginTop: 24,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981" }}/>
          <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>
            AI-Powered · Secure · Production Ready
          </span>
        </div>
      </div>
    </div>
  );
}