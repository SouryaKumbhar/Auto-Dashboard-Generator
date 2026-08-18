from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from engines.layout_engine import generate_layout
from engines.semantic_engine import detect_business_context
from engines.insight_engine import generate_insights
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import pandas as pd
import numpy as np
import io, json, hashlib
from datetime import datetime, timedelta
from jose import jwt
from groq import Groq
from dotenv import load_dotenv
import os

load_dotenv()
app = FastAPI()
client = Groq(api_key=os.getenv("GROQ_API_KEY"))
security = HTTPBearer()
SECRET = "datadash-prod-2026"

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── Auth ──────────────────────────────────────────────────────────────────
def hp(p): return hashlib.sha256(p.encode()).hexdigest()
USERS = {"admin@company.com": {"name":"Sourabh K.","email":"admin@company.com","hashed_password":hp("admin123"),"role":"Admin"}}

def mk_token(email): return jwt.encode({"sub":email,"exp":datetime.utcnow()+timedelta(hours=24)},SECRET,algorithm="HS256")
def chk_token(t):
    try: return jwt.decode(t,SECRET,algorithms=["HS256"]).get("sub")
    except: return None

def auth(c: HTTPAuthorizationCredentials = Depends(security)):
    e = chk_token(c.credentials)
    if not e or e not in USERS: raise HTTPException(401, "Invalid token")
    return USERS[e]

# ── Helpers ───────────────────────────────────────────────────────────────
def cv(v):
    if v is None: return None
    try:
        if pd.isna(v): return None
    except: pass
    if isinstance(v, (bool, str)): return v
    if isinstance(v, (int, float)): return None if np.isnan(v) or np.isinf(v) else round(float(v), 4)
    return str(v)

def smart_transform(df):
    df = df.copy()
    df.columns = df.columns.str.strip().str.replace(r'\s+', ' ', regex=True).astype(str)
    df = df.dropna(how='all').reset_index(drop=True)
    for col in df.columns:
        if df[col].dtype == object:
            cleaned = df[col].astype(str).str.replace(r'[₹$,\s]', '', regex=True).str.strip()
            numeric = pd.to_numeric(cleaned, errors='coerce')
            if numeric.notna().sum() > len(df) * 0.6:
                df[col] = numeric; continue
            try:
                parsed = pd.to_datetime(df[col], infer_datetime_format=True, errors='coerce')
                if parsed.notna().sum() > len(df) * 0.5:
                    df[col] = parsed.dt.strftime('%Y-%m-%d'); continue
            except: pass
    return df

def detect_domain(col_names, sample_data):
    cols_lower = [c.lower() for c in col_names]
    all_text = ' '.join(cols_lower)
    if any(w in all_text for w in ['revenue','sales','profit','price','amount','cost','invoice']): return 'finance'
    if any(w in all_text for w in ['patient','diagnosis','hospital','medication','doctor']): return 'healthcare'
    if any(w in all_text for w in ['product','inventory','stock','order','shipment','supplier']): return 'retail'
    if any(w in all_text for w in ['employee','salary','department','hr','leave','payroll']): return 'hr'
    if any(w in all_text for w in ['server','error','cpu','memory','request','latency']): return 'tech'
    if any(w in all_text for w in ['contract','vendor','procurement','purchase']): return 'procurement'
    return 'general'

DOMAIN_THEMES = {
    'finance':     {'sidebar':'#0a1628','accent':'#1d4ed8','bg':'#f0f4ff','name':'Finance'},
    'healthcare':  {'sidebar':'#052e16','accent':'#16a34a','bg':'#f0fdf4','name':'Healthcare'},
    'retail':      {'sidebar':'#431407','accent':'#ea580c','bg':'#fff7ed','name':'Retail'},
    'hr':          {'sidebar':'#2d1b69','accent':'#7c3aed','bg':'#faf5ff','name':'Human Resources'},
    'tech':        {'sidebar':'#0c1a2e','accent':'#0891b2','bg':'#f0f9ff','name':'Technology'},
    'procurement': {'sidebar':'#1c1917','accent':'#d97706','bg':'#fffbeb','name':'Procurement'},
    'general':     {'sidebar':'#0f0f1a','accent':'#6d28d9','bg':'#f5f5fb','name':'Dashboard'},
}

# ── AI Config Builder ─────────────────────────────────────────────────────
def build_ai_config(df, col_info, domain):
    num_cols = [c for c in col_info if 'int' in c['type'] or 'float' in c['type']]
    cat_cols = [c for c in col_info if c['type'] == 'object']
    col_names = [c['name'] for c in col_info]

    prompt = f"""
You are a senior data analyst. Dataset domain: {domain}
Columns: {json.dumps(col_info[:20])}
Numeric columns: {[c['name'] for c in num_cols]}
Categorical columns: {[c['name'] for c in cat_cols]}
Total rows: {len(df)}

Generate a comprehensive dashboard config. Return ONLY valid JSON:
{{
  "dashboard_title": "descriptive title based on data domain",
  "kpis": [
    {{"label":"label","column":"col","aggregation":"sum","prefix":"","suffix":"","icon":"chart-bar","color":"#6d28d9"}},
    {{"label":"label","column":"col","aggregation":"mean","prefix":"","suffix":"","icon":"trending-up","color":"#0891b2"}},
    {{"label":"label","column":"col","aggregation":"count","prefix":"","suffix":"","icon":"users","color":"#059669"}},
    {{"label":"label","column":"col","aggregation":"max","prefix":"","suffix":"","icon":"arrow-up","color":"#d97706"}},
    {{"label":"label","column":"col","aggregation":"min","prefix":"","suffix":"","icon":"arrow-down","color":"#dc2626"}},
    {{"label":"label","column":"col","aggregation":"sum","prefix":"","suffix":"","icon":"chart-pie","color":"#7c3aed"}}
  ],
  "charts": [
    {{"id":"c1","type":"bar","title":"title","x_column":"col","y_column":"col","size":"large"}},
    {{"id":"c2","type":"line","title":"title","x_column":"col","y_column":"col","size":"large"}},
    {{"id":"c3","type":"pie","title":"title","x_column":"col","y_column":"col","size":"medium"}},
    {{"id":"c4","type":"area","title":"title","x_column":"col","y_column":"col","size":"large"}},
    {{"id":"c5","type":"donut","title":"title","x_column":"col","y_column":"col","size":"medium"}},
    {{"id":"c6","type":"bar","title":"title","x_column":"col","y_column":"col","size":"medium"}},
    {{"id":"c7","type":"scatter","title":"title","x_column":"col","y_column":"col","size":"medium"}},
    {{"id":"c8","type":"bar","title":"title","x_column":"col","y_column":"col","size":"small"}}
  ],
  "filters": ["col","col","col"],
  "table_columns": ["col","col","col","col","col"]
}}
Rules:
- Use ONLY column names from: {col_names}
- aggregation: sum/mean/count/max/min
- type: bar/line/area/pie/donut/scatter
- size: large/medium/small
- kpis need numeric columns, filters need categorical columns
- Make titles descriptive and business-meaningful
- table_columns: best 5 columns for the data table
- Return ONLY JSON, nothing else
"""
    resp = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=2000,
        temperature=0
    )
    raw = resp.choices[0].message.content.strip()
    if "```" in raw:
        raw = "\n".join(l for l in raw.split("\n") if not l.strip().startswith("```"))
    return json.loads(raw[raw.find("{"):raw.rfind("}")+1])

# ── AI Insights Builder ───────────────────────────────────────────────────
def build_insights(df, col_info, domain, config):
    sample = df.head(5).to_dict(orient='records')
    stats = {}
    for c in col_info:
        if 'int' in c['type'] or 'float' in c['type']:
            col_data = df[c['name']].dropna()
            if len(col_data) > 0:
                stats[c['name']] = {
                    'sum': round(float(col_data.sum()), 2),
                    'mean': round(float(col_data.mean()), 2),
                    'max': round(float(col_data.max()), 2)
                }
    prompt = f"""
Analyze this {domain} dataset: {len(df)} rows, {len(col_info)} columns.
Key stats: {json.dumps(stats)}
Sample: {json.dumps(sample[:3])}
Return ONLY JSON:
{{"summary":"2 sentence business overview","trend":"key trend in data","insight1":"specific insight with numbers","insight2":"another specific finding","recommendation":"top actionable recommendation","anomaly":"any anomaly or outlier noticed","performance":"overall performance assessment in one sentence"}}
"""
    try:
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=600,
            temperature=0
        )
        raw = resp.choices[0].message.content.strip()
        if "```" in raw:
            raw = "\n".join(l for l in raw.split("\n") if not l.strip().startswith("```"))
        return json.loads(raw[raw.find("{"):raw.rfind("}")+1])
    except:
        return {
            "summary": "Data loaded successfully.",
            "trend": "Analysis complete.",
            "insight1": "Review KPI cards for key metrics.",
            "insight2": "Use filters to explore data.",
            "recommendation": "Examine the charts for patterns.",
            "anomaly": "No anomalies detected.",
            "performance": "Data is ready for analysis."
        }

# ── Finalize Response ─────────────────────────────────────────────────────
def finalize(df, config, insights, domain, theme, filename, source_type):
    def _cv(v):
        try:
            if pd.isna(v): return None
        except: pass
        if isinstance(v, (pd.Timestamp, datetime)): return str(v)
        try:
            return float(v) if isinstance(v, np.floating) else int(v) if isinstance(v, np.integer) else v
        except:
            return str(v)

    col_info = {}
    for c in df.columns:
        s = df[c]
        col_info[c] = {"dtype": str(s.dtype), "nulls": int(s.isna().sum()), "unique": int(s.nunique())}

    num_stats = {}
    for c in df.select_dtypes(include=np.number).columns:
        d = df[c].dropna()
        if len(d):
            num_stats[c] = {
                "sum": round(float(d.sum()), 2),
                "mean": round(float(d.mean()), 2),
                "max": round(float(d.max()), 2),
                "min": round(float(d.min()), 2),
                "count": int(len(d))
            }

    records = [{str(col): _cv(row[col]) for col in df.columns} for _, row in df.iterrows()]
    layout = generate_layout(config["charts"])
    business_context = detect_business_context(df.columns.tolist())
    ai_extra_insights = generate_insights(config["charts"])

    return {
        "config": config,
        "layout": layout,
        "business_context": business_context,
        "ai_extra_insights": ai_extra_insights,
        "data": records,
        "columns": list(df.columns),
        "col_info": col_info,
        "insights": insights,
        "domain": domain,
        "theme": theme,
        "filename": filename,
        "source_type": source_type,
        "row_count": len(df),
        "col_count": len(df.columns),
        "num_stats": num_stats
    }

# ── Pydantic Models ───────────────────────────────────────────────────────
class LoginReq(BaseModel):
    email: str
    password: str

class DBConn(BaseModel):
    db_type: str
    host: str = "localhost"
    port: int = 3306
    database: str = ""
    username: str = ""
    password: str = ""
    query: str = "SELECT * FROM your_table LIMIT 5000"
    server: str = ""

class WhatIfRequest(BaseModel):
    message: str
    columns: Optional[List[str]] = []
    current_stats: Optional[Dict[str, Any]] = {}
    domain: Optional[str] = "general"

class ChatRequest(BaseModel):
    message: str
    columns: list = []
    domain: str = "general"
    num_cols: list = []
    cat_cols: list = []
    data_summary: dict = {}
    sample_data: list = []
    current_charts_count: int = 0
    current_kpis_count: int = 0

# ── Routes ────────────────────────────────────────────────────────────────
@app.get("/")
def health():
    return {"status": "ok", "model": "llama-3.3-70b-versatile"}

@app.post("/login")
def login(req: LoginReq):
    u = USERS.get(req.email)
    if not u or hp(req.password) != u["hashed_password"]:
        raise HTTPException(401, "Wrong credentials")
    return {"token": mk_token(req.email), "user": {"name": u["name"], "email": u["email"], "role": u["role"]}}

@app.post("/upload")
async def upload_excel(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        df = smart_transform(df)
        col_info = [{"name": c, "type": str(df[c].dtype)} for c in df.columns]
        domain = detect_domain(df.columns.tolist(), [])
        theme = DOMAIN_THEMES.get(domain, DOMAIN_THEMES["general"])
        config = build_ai_config(df, col_info, domain)
        insights = build_insights(df, col_info, domain, config)
        return finalize(df, config, insights, domain, theme, file.filename, "excel")
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        try:
            df = pd.read_csv(io.BytesIO(contents), encoding='utf-8')
        except:
            df = pd.read_csv(io.BytesIO(contents), encoding='latin-1')
        df = smart_transform(df)
        col_info = [{"name": c, "type": str(df[c].dtype)} for c in df.columns]
        domain = detect_domain(df.columns.tolist(), [])
        theme = DOMAIN_THEMES.get(domain, DOMAIN_THEMES["general"])
        config = build_ai_config(df, col_info, domain)
        insights = build_insights(df, col_info, domain, config)
        return finalize(df, config, insights, domain, theme, file.filename, "csv")
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/connect-db")
async def connect_db(conn: DBConn):
    try:
        from sqlalchemy import create_engine, text
        if conn.db_type == "mysql":
            url = f"mysql+pymysql://{conn.username}:{conn.password}@{conn.host}:{conn.port}/{conn.database}"
        elif conn.db_type == "postgresql":
            url = f"postgresql+psycopg2://{conn.username}:{conn.password}@{conn.host}:{conn.port}/{conn.database}"
        elif conn.db_type == "sqlserver":
            url = (f"mssql+pyodbc://{conn.server}/{conn.database}"
                   f"?driver=ODBC+Driver+17+for+SQL+Server&trusted_connection=yes&TrustServerCertificate=yes")
        else:
            raise HTTPException(400, "Unsupported DB")
        engine = create_engine(url)
        with engine.connect() as c:
            df = pd.read_sql(text(conn.query), c)
        df = smart_transform(df)
        col_info = [{"name": c, "type": str(df[c].dtype)} for c in df.columns]
        domain = detect_domain(df.columns.tolist(), [])
        theme = DOMAIN_THEMES.get(domain, DOMAIN_THEMES["general"])
        config = build_ai_config(df, col_info, domain)
        insights = build_insights(df, col_info, domain, config)
        return finalize(df, config, insights, domain, theme, f"{conn.db_type}:{conn.database}", conn.db_type)
    except Exception as e:
        raise HTTPException(500, str(e))

@app.post("/ai-chat")
async def ai_chat(req: ChatRequest):
    prompt = f"""
You are an intelligent AI assistant inside a BI dashboard called DataDash.
The user has a {req.domain} dataset.
- Columns: {req.columns[:20]}
- Numeric columns: {req.num_cols[:10]}
- Category columns: {req.cat_cols[:10]}
- Stats summary: {json.dumps(req.data_summary, default=str)[:1000]}
- Sample rows: {json.dumps(req.sample_data[:3], default=str)[:800]}
- Current charts: {req.current_charts_count}
- Current KPIs: {req.current_kpis_count}

User message: "{req.message}"

Return ONLY this JSON:
{{
  "reply": "helpful 1-2 sentence response, use numbers from data if answering a question",
  "action": {{
    "type": "add_chart|add_kpi|remove_chart|remove_kpi|none",
    "chart_type": "bar|line|area|pie|donut|scatter|radar|treemap|table",
    "title": "descriptive chart title",
    "x_column": "exact column name for X axis or null",
    "y_column": "exact column name for Y axis or null",
    "kpi_label": "KPI display label",
    "kpi_column": "exact column name for KPI or null",
    "kpi_aggregation": "sum|mean|count|max|min",
    "prefix": "currency symbol or empty",
    "suffix": "% or K or empty"
  }}
}}
Rules:
- add chart → type = add_chart
- add KPI/metric/card → type = add_kpi
- remove chart → type = remove_chart
- remove KPI → type = remove_kpi
- question only → type = none
- x_column from: {req.cat_cols[:10]}
- y_column from: {req.num_cols[:10]}
- kpi_column from: {req.num_cols[:10]}
Return ONLY valid JSON.
"""
    try:
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=600,
            temperature=0
        )
        raw = resp.choices[0].message.content.strip()
        if "```" in raw:
            raw = "\n".join(l for l in raw.split("\n") if not l.strip().startswith("```"))
        return json.loads(raw[raw.find("{"):raw.rfind("}")+1])
    except Exception as e:
        print(f"AI Chat Error: {e}")
        return {
            "reply": "I'm here to help! Ask me data questions or say 'Add a bar chart' to add visuals.",
            "action": {"type": "none"}
        }

@app.post("/whatif")
async def what_if_analysis(req: WhatIfRequest):
    prompt = f"""
You are a business analyst. User has a {req.domain} dataset.
Current stats: {json.dumps(req.current_stats)}
Columns: {req.columns}
User scenario: "{req.message}"

Analyze and return ONLY JSON:
{{
  "scenario_title": "short title of the scenario",
  "explanation": "2 sentence explanation of what this scenario means",
  "adjustments": {{
    "column_name": percentage_change_as_decimal
  }},
  "kpi_impacts": [
    {{"label": "kpi label", "current": 1000, "simulated": 1200, "change_pct": 20.0, "positive": true}}
  ],
  "recommendation": "one business recommendation based on this scenario",
  "risk": "one risk to consider"
}}
Rules:
- adjustments: use actual column names from {req.columns}
- percentage_change: 0.20 means +20%, -0.15 means -15%
- kpi_impacts: show top 4 most impacted KPIs
- Return ONLY JSON
"""
    try:
        resp = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=800,
            temperature=0
        )
        raw = resp.choices[0].message.content.strip()
        if "```" in raw:
            raw = "\n".join(l for l in raw.split("\n") if not l.strip().startswith("```"))
        return json.loads(raw[raw.find("{"):raw.rfind("}")+1])
    except Exception as e:
        return {
            "scenario_title": "Scenario Analysis",
            "explanation": "Analyzing your scenario based on current data.",
            "adjustments": {},
            "kpi_impacts": [],
            "recommendation": "Review the simulated values carefully.",
            "risk": "Ensure assumptions are realistic."
        }