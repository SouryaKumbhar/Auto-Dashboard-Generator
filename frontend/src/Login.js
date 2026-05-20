import { useState } from "react";
import axios from "axios";

const BACKEND_URL = "https://autodash-backend-oqq2.onrender.com";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("admin@company.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    setError("");
    try {
      const res = await axios.post(`${BACKEND_URL}/login`, { email, password });
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("user", JSON.stringify(res.data.user));
      onLogin(res.data.user);
    } catch (err) {
      setError("Wrong email or password");
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0a0a14" }}>
      <div style={{ width:380, background:"#13122a", borderRadius:16, padding:"44px 36px", border:"0.5px solid rgba(255,255,255,0.08)" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:52, height:52, borderRadius:14, background:"#6d28d9", display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 14px", fontSize:24 }}>📊</div>
          <div style={{ color:"#fff", fontSize:22, fontWeight:600 }}>DataDash</div>
          <div style={{ color:"rgba(255,255,255,0.35)", fontSize:13, marginTop:4 }}>Production BI Platform</div>
        </div>

        <div style={{ marginBottom:14 }}>
          <label style={{ color:"rgba(255,255,255,0.5)", fontSize:11, fontWeight:600, display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.6px" }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width:"100%", padding:"10px 14px", borderRadius:8, background:"rgba(255,255,255,0.06)", border:"0.5px solid rgba(255,255,255,0.1)", color:"#fff", fontSize:14, outline:"none" }}
          />
        </div>

        <div style={{ marginBottom:20 }}>
          <label style={{ color:"rgba(255,255,255,0.5)", fontSize:11, fontWeight:600, display:"block", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.6px" }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && handleLogin()}
            style={{ width:"100%", padding:"10px 14px", borderRadius:8, background:"rgba(255,255,255,0.06)", border:"0.5px solid rgba(255,255,255,0.1)", color:"#fff", fontSize:14, outline:"none" }}
          />
        </div>

        {error && <div style={{ color:"#f87171", fontSize:12, marginBottom:14, textAlign:"center" }}>{error}</div>}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{ width:"100%", padding:12, borderRadius:8, background:"#6d28d9", color:"#fff", border:"none", fontSize:14, fontWeight:600, cursor:"pointer" }}>
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <div style={{ textAlign:"center", marginTop:16, color:"rgba(255,255,255,0.25)", fontSize:11 }}>
          admin@company.com / admin123
        </div>
      </div>
    </div>
  );
}