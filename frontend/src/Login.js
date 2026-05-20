import { useState } from "react";
import axios from "axios";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("admin@company.com");
  const [password, setPassword] = useState("admin123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function go() {
    setLoading(true); setError("");
    try {
      const r = await axios.post("https://autodash-backend-oqq2.onrender.com/login", { email, password });
      localStorage.setItem("token", r.data.token);
      localStorage.setItem("user", JSON.stringify(r.data.user));
      onLogin(r.data.user);
    } catch { setError("Wrong email or password"); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#0a0a14" }}>
      <div style={{ width:380, background:"#13122a", borderRadius:16, padding:"44px 36px", border:"0.5px solid rgba(255,255,255,0.08)" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:52, height:52, background:"#6d28d9", borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 16px", fontSize:26 }}>📊</div>
          <div style={{ color:"#fff", fontSize:22, fontWeight:600 }}>DataDash</div>
          <div style={{ color:"rgba(255,255,255,0.3)", fontSize:12, marginTop:4 }}>Production BI Platform</div>
        </div>
        {["Email","Password"].map((l,i) => (
          <div key={l} style={{ marginBottom:14 }}>
            <div style={{ color:"rgba(255,255,255,0.4)", fontSize:11, fontWeight:600, marginBottom:5, textTransform:"uppercase", letterSpacing:"0.5px" }}>{l}</div>
            <input type={i===1?"password":"email"} value={i===0?email:password}
              onChange={e => i===0?setEmail(e.target.value):setPassword(e.target.value)}
              onKeyDown={e => e.key==="Enter"&&go()}
              style={{ width:"100%", padding:"10px 14px", borderRadius:8, background:"rgba(255,255,255,0.05)", border:"0.5px solid rgba(255,255,255,0.1)", color:"#fff", fontSize:14, outline:"none" }} />
          </div>
        ))}
        {error && <div style={{ color:"#f87171", fontSize:12, marginBottom:12, textAlign:"center" }}>{error}</div>}
        <button onClick={go} disabled={loading}
          style={{ width:"100%", padding:12, background:"#6d28d9", color:"#fff", border:"none", borderRadius:8, fontSize:14, fontWeight:600, cursor:"pointer", marginTop:6 }}>
          {loading?"Signing in...":"Sign In"}
        </button>
        <div style={{ textAlign:"center", marginTop:16, color:"rgba(255,255,255,0.2)", fontSize:11 }}>admin@company.com / admin123</div>
      </div>
    </div>
  );
}