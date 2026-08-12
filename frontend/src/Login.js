import { useState } from "react";
import axios from "axios";

const BACKEND = "https://autodash-backend-oqq2.onrender.com";

/* =========================================================
   BACKGROUND — InfraBeat office image
   ========================================================= */

function StaticBackground() {
  return (
    <>
      {/* The image itself */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          backgroundImage: "url('/infrabeat-bg.png')",
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          zIndex: 0,
        }}
      />

      {/* Dark vignette overlay so the login card reads clearly */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "linear-gradient(135deg, rgba(2,4,18,0.72) 0%, rgba(4,8,28,0.55) 50%, rgba(2,4,18,0.78) 100%)",
          zIndex: 1,
          pointerEvents: "none",
        }}
      />

      {/* Subtle blue tint to match brand palette */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background:
            "radial-gradient(ellipse at 60% 40%, rgba(25,100,220,0.08) 0%, transparent 70%)",
          zIndex: 2,
          pointerEvents: "none",
        }}
      />
    </>
  );
}


/* =========================================================
   LOGIN PAGE
   ========================================================= */

export default function Login({ onLogin }) {

  const [email, setEmail] = useState("admin@company.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);


  /* =======================================================
     LOGIN
     ======================================================= */

  async function handleLogin() {

    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    setLoading(true);
    setError("");

    try {

      const res = await axios.post(
        `${BACKEND}/login`,
        { email, password }
      );

      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      onLogin(res.data.user);

    } catch (err) {

      console.error("Login Error:", err);

      if (err.response) {
        setError(
          err.response.data?.detail ||
          err.response.data?.message ||
          "Wrong email or password"
        );
      } else {
        setError("Unable to connect to backend");
      }

    } finally {
      setLoading(false);
    }
  }


  /* =======================================================
     PAGE
     ======================================================= */

  return (

    <div
      style={{
        width: "100%",
        height: "100vh",
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#03060F",
      }}
    >

      {/* =================================================
          BACKGROUND IMAGE
          ================================================= */}

      <StaticBackground />


      {/* =================================================
          LOGIN CARD — neon blue edge glow wrapper
          ================================================= */}

      {/* Outer glow wrapper — not clipped, carries all ambient neon */}
      <div style={{
        position: "relative",
        zIndex: 10,
        width: "420px",
        maxWidth: "calc(100vw - 40px)",
      }}>

        {/* ── Ambient neon halo behind the card ── */}
        <div style={{
          position: "absolute",
          inset: "-28px",
          borderRadius: "46px",
          background: "transparent",
          boxShadow: "0 0 60px 12px rgba(25,182,255,0.18), 0 0 120px 24px rgba(25,182,255,0.08)",
          animation: "neonPulse 3s ease-in-out infinite",
          pointerEvents: "none",
        }}/>

        {/* ── TOP edge ── */}
        <div style={{
          position: "absolute", top: -1, left: "12%", right: "12%", height: "2px",
          background: "linear-gradient(90deg, transparent, #19B6FF, #7C3AED, #19B6FF, transparent)",
          borderRadius: "2px",
          boxShadow: "0 0 8px 2px rgba(25,182,255,0.9), 0 0 20px 4px rgba(25,182,255,0.5)",
          animation: "neonEdgeH 2.8s ease-in-out infinite",
          pointerEvents: "none",
        }}/>

        {/* ── BOTTOM edge ── */}
        <div style={{
          position: "absolute", bottom: -1, left: "12%", right: "12%", height: "2px",
          background: "linear-gradient(90deg, transparent, #7C3AED, #19B6FF, #7C3AED, transparent)",
          borderRadius: "2px",
          boxShadow: "0 0 8px 2px rgba(25,182,255,0.9), 0 0 20px 4px rgba(25,182,255,0.5)",
          animation: "neonEdgeH 2.8s ease-in-out infinite 1.4s",
          pointerEvents: "none",
        }}/>

        {/* ── LEFT edge ── */}
        <div style={{
          position: "absolute", left: -1, top: "10%", bottom: "10%", width: "2px",
          background: "linear-gradient(180deg, transparent, #19B6FF, #7C3AED, #19B6FF, transparent)",
          borderRadius: "2px",
          boxShadow: "0 0 8px 2px rgba(25,182,255,0.9), 0 0 20px 4px rgba(25,182,255,0.5)",
          animation: "neonEdgeV 3.2s ease-in-out infinite 0.6s",
          pointerEvents: "none",
        }}/>

        {/* ── RIGHT edge ── */}
        <div style={{
          position: "absolute", right: -1, top: "10%", bottom: "10%", width: "2px",
          background: "linear-gradient(180deg, transparent, #7C3AED, #19B6FF, #7C3AED, transparent)",
          borderRadius: "2px",
          boxShadow: "0 0 8px 2px rgba(25,182,255,0.9), 0 0 20px 4px rgba(25,182,255,0.5)",
          animation: "neonEdgeV 3.2s ease-in-out infinite 2s",
          pointerEvents: "none",
        }}/>

        {/* ── CORNER sparks ── */}
        {[
          { top:-4, left:-4 },
          { top:-4, right:-4 },
          { bottom:-4, left:-4 },
          { bottom:-4, right:-4 },
        ].map((pos, i) => (
          <div key={i} style={{
            position: "absolute", ...pos,
            width: "8px", height: "8px",
            borderRadius: "50%",
            background: "#19B6FF",
            boxShadow: "0 0 6px 3px rgba(25,182,255,1), 0 0 16px 6px rgba(25,182,255,0.6)",
            animation: `neonCornerSpark 2.8s ease-in-out infinite ${i * 0.4}s`,
            pointerEvents: "none",
          }}/>
        ))}

        {/* ── THE CARD ITSELF ── */}
        <div
          style={{
            position: "relative",
            padding: "40px",
            borderRadius: "22px",
            background: "rgba(4, 6, 20, 0.88)",
            backdropFilter: "blur(28px)",
            WebkitBackdropFilter: "blur(28px)",
            border: "1px solid rgba(25, 182, 255, 0.45)",
            animation: "neonCardGlow 2.8s ease-in-out infinite",
          }}
        >


        {/* =================================================
            LOGO
            ================================================= */}

        <div style={{ textAlign: "center", marginBottom: "32px" }}>

          {/* Logo Icon */}
          <div
            style={{
              width: "58px",
              height: "58px",
              borderRadius: "17px",
              margin: "0 auto 15px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "linear-gradient(135deg, #7C3AED, #2563EB)",
              boxShadow: "0 8px 30px rgba(124,58,237,0.45)",
              fontSize: "27px",
            }}
          >
            📊
          </div>

          {/* InfraBeat */}
          <div
            style={{
              fontSize: "27px",
              fontWeight: "700",
              letterSpacing: "-0.7px",
              color: "#ffffff",
            }}
          >
            Infra
            <span style={{ color: "#EF4444" }}>Beat</span>
          </div>

          {/* Product */}
          <div
            style={{
              marginTop: "5px",
              color: "rgba(255,255,255,0.55)",
              fontSize: "13px",
            }}
          >
            Auto Dashboard Generator
          </div>

          {/* Gradient Line */}
          <div
            style={{
              width: "65px",
              height: "2px",
              margin: "15px auto 0",
              borderRadius: "5px",
              background: "linear-gradient(90deg,#7C3AED,#2563EB)",
            }}
          />

        </div>


        {/* =================================================
            EMAIL
            ================================================= */}

        <div style={{ marginBottom: "18px" }}>

          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.8px",
              color: "rgba(255,255,255,0.50)",
            }}
          >
            EMAIL
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
            style={{
              width: "100%",
              height: "48px",
              padding: "0 15px",
              boxSizing: "border-box",
              borderRadius: "11px",
              outline: "none",
              border: "1px solid rgba(124,58,237,0.28)",
              background: "rgba(255,255,255,0.055)",
              color: "#ffffff",
              fontSize: "14px",
              transition: "all 0.2s",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "rgba(124,58,237,0.85)";
              e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.10)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(124,58,237,0.28)";
              e.target.style.boxShadow = "none";
            }}
          />

        </div>


        {/* =================================================
            PASSWORD
            ================================================= */}

        <div style={{ marginBottom: "18px" }}>

          <label
            style={{
              display: "block",
              marginBottom: "8px",
              fontSize: "11px",
              fontWeight: "700",
              letterSpacing: "0.8px",
              color: "rgba(255,255,255,0.50)",
            }}
          >
            PASSWORD
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            onKeyDown={(e) => { if (e.key === "Enter") handleLogin(); }}
            style={{
              width: "100%",
              height: "48px",
              padding: "0 15px",
              boxSizing: "border-box",
              borderRadius: "11px",
              outline: "none",
              border: "1px solid rgba(124,58,237,0.28)",
              background: "rgba(255,255,255,0.055)",
              color: "#ffffff",
              fontSize: "14px",
              transition: "all 0.2s",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "rgba(124,58,237,0.85)";
              e.target.style.boxShadow = "0 0 0 3px rgba(124,58,237,0.10)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(124,58,237,0.28)";
              e.target.style.boxShadow = "none";
            }}
          />

        </div>


        {/* =================================================
            ERROR
            ================================================= */}

        {error && (
          <div
            style={{
              marginBottom: "16px",
              padding: "9px 12px",
              borderRadius: "8px",
              textAlign: "center",
              color: "#FCA5A5",
              fontSize: "12px",
              background: "rgba(220,38,38,0.10)",
              border: "1px solid rgba(220,38,38,0.20)",
            }}
          >
            {error}
          </div>
        )}


        {/* =================================================
            SIGN IN
            ================================================= */}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: "100%",
            height: "48px",
            border: "none",
            borderRadius: "11px",
            background: loading
              ? "rgba(124,58,237,0.45)"
              : "linear-gradient(135deg,#7C3AED,#2563EB)",
            color: "#ffffff",
            fontSize: "15px",
            fontWeight: "700",
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: loading ? "none" : "0 6px 28px rgba(124,58,237,0.45)",
            transition: "all 0.2s",
            marginTop: "4px",
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow = "0 9px 32px rgba(124,58,237,0.60)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = loading ? "none" : "0 6px 28px rgba(124,58,237,0.45)";
          }}
        >
          {loading ? "Signing in..." : "Sign In →"}
        </button>


        {/* =================================================
            DEMO CREDENTIALS
            ================================================= */}

        <div
          style={{
            textAlign: "center",
            marginTop: "18px",
            color: "rgba(255,255,255,0.25)",
            fontSize: "11px",
          }}
        >
          Demo: admin@company.com / admin123
        </div>


        {/* =================================================
            STATUS
            ================================================= */}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "7px",
            marginTop: "22px",
          }}
        >
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#10B981",
              boxShadow: "0 0 10px rgba(16,185,129,0.8)",
            }}
          />
          <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.30)" }}>
            AI-Powered · Secure · Production Ready
          </span>
        </div>

        </div>{/* end card */}
      </div>{/* end neon wrapper */}

    </div>
  );
}
