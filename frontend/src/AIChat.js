import { useState, useRef, useEffect } from "react";
import axios from "axios";

const BACKEND = "https://autodash-backend-oqq2.onrender.com";

export default function AIChat({ db, onCommand, accent }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role:"assistant", content:"Hi! I'm your dashboard AI. Try: 'Add a bar chart for sales' or 'Change theme to dark'" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput("");
    setMessages(p => [...p, { role:"user", content:userMsg }]);
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const columns = db?.columns || [];
      const domain = db?.domain || "general";

      const res = await axios.post(`${BACKEND}/ai-chat`, {
        message: userMsg,
        columns,
        domain,
        context: "dashboard builder"
      }, { headers:{ Authorization:`Bearer ${token}` } });

      const reply = res.data.reply;
      const action = res.data.action;

      setMessages(p => [...p, { role:"assistant", content:reply }]);

      if (action) {
        onCommand(action);
      }
    } catch {
      setMessages(p => [...p, { role:"assistant", content:"Sorry, I couldn't process that. Try: 'Add a bar chart' or 'Change theme to dark'" }]);
    }
    setLoading(false);
  }

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position:"fixed", bottom:24, right:24, zIndex:1000,
          width:52, height:52, borderRadius:"50%",
          background:accent, border:"none", cursor:"pointer",
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:22, boxShadow:"0 4px 20px rgba(0,0,0,0.2)",
          transition:"transform 0.2s"
        }}>
        {open ? "✕" : "🤖"}
      </button>

      {/* Chat Window */}
      {open && (
        <div style={{
          position:"fixed", bottom:88, right:24, zIndex:999,
          width:340, height:460, background:"#fff",
          borderRadius:16, border:"0.5px solid #eee",
          boxShadow:"0 8px 40px rgba(0,0,0,0.15)",
          display:"flex", flexDirection:"column", overflow:"hidden"
        }}>
          {/* Header */}
          <div style={{ padding:"14px 16px", background:accent, color:"#fff" }}>
            <div style={{ fontSize:14, fontWeight:600 }}>🤖 AI Dashboard Assistant</div>
            <div style={{ fontSize:11, opacity:0.8, marginTop:2 }}>Ask me to modify your dashboard</div>
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflowY:"auto", padding:12, display:"flex", flexDirection:"column", gap:8 }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                maxWidth:"85%"
              }}>
                <div style={{
                  padding:"8px 12px",
                  borderRadius: msg.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                  background: msg.role === "user" ? accent : "#f3f4f6",
                  color: msg.role === "user" ? "#fff" : "#374151",
                  fontSize:12, lineHeight:1.5
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ alignSelf:"flex-start" }}>
                <div style={{ padding:"8px 12px", borderRadius:"12px 12px 12px 2px", background:"#f3f4f6", fontSize:12, color:"#9ca3af" }}>
                  Thinking...
                </div>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Input */}
          <div style={{ padding:"10px 12px", borderTop:"0.5px solid #eee", display:"flex", gap:8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && send()}
              placeholder="Add a bar chart for sales..."
              style={{
                flex:1, padding:"8px 12px", borderRadius:8,
                border:"0.5px solid #e5e7ef", fontSize:12, outline:"none"
              }}
            />
            <button onClick={send} disabled={loading}
              style={{
                background:accent, color:"#fff", border:"none",
                borderRadius:8, padding:"8px 12px",
                fontSize:12, cursor:"pointer", fontWeight:500
              }}>
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}