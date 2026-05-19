from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from typing import Optional, List, Any
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

def hp(p): return hashlib.sha256(p.encode()).hexdigest()
USERS = {"admin@company.com": {"name":"Sourabh K.","email":"admin@company.com","hashed_password":hp("admin123"),"role":"Admin"}}

def mk_token(email): return jwt.encode({"sub":email,"exp":datetime.utcnow()+timedelta(hours=24)},SECRET,algorithm="HS256")
def chk_token(t):
    try: return jwt.decode(t,SECRET,algorithms=["HS256"]).get("sub")
    except: return None

def auth(c:HTTPAuthorizationCredentials=Depends(security)):
    e=chk_token(c.credentials)
    if not e or e not in USERS: raise HTTPException(401,"Invalid token")
    return USERS[e]

def cv(v):
    if v is None: return None
    try:
        if pd.isna(v): return None
    except: pass
    if isinstance(v,(bool,str)): return v
    if isinstance(v,(int,float)): return None if np.isnan(v) or np.isinf(v) else round(float(v),4)
    return str(v)

def smart_transform(df):
    df=df.copy()
    df.columns=df.columns.str.strip().str.replace(r'\s+',' ',regex=True).astype(str)
    df=df.dropna(how='all').reset_index(drop=True)
    for col in df.columns:
        if df[col].dtype==object:
            cleaned=df[col].astype(str).str.replace(r'[₹$,\s]','',regex=True).str.strip()
            numeric=pd.to_numeric(cleaned,errors='coerce')
            if numeric.notna().sum()>len(df)*0.6:
                df[col]=numeric; continue
            try:
                parsed=pd.to_datetime(df[col],infer_datetime_format=True,errors='coerce')
                if parsed.notna().sum()>len(df)*0.5:
                    df[col]=parsed.dt.strftime('%Y-%m-%d'); continue
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
    'finance': {'sidebar':'#0a1628','accent':'#1d4ed8','bg':'#f0f4ff','name':'Finance'},
    'healthcare': {'sidebar':'#052e16','accent':'#16a34a','bg':'#f0fdf4','name':'Healthcare'},
    'retail': {'sidebar':'#431407','accent':'#ea580c','bg':'#fff7ed','name':'Retail'},
    'hr': {'sidebar':'#2d1b69','accent':'#7c3aed','bg':'#faf5ff','name':'Human Resources'},
    'tech': {'sidebar':'#0c1a2e','accent':'#0891b2','bg':'#f0f9ff','name':'Technology'},
    'procurement': {'sidebar':'#1c1917','accent':'#d97706','bg':'#fffbeb','name':'Procurement'},
    'general': {'sidebar':'#0f0f1a','accent':'#6d28d9','bg':'#f5f5fb','name':'Dashboard'},
}

def build_ai_config(df, col_info, domain):
    num_cols = [c for c in col_info if 'int' in c['type'] or 'float' in c['type']]
    cat_cols = [c for c in col_info if c['type']=='object']
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
        messages=[{"role":"user","content":prompt}],
        max_tokens=2000
    )
    raw = resp.choices[0].message.content.strip()
    if "```" in raw:
        raw = "\n".join(l for l in raw.split("\n") if not l.strip().startswith("```"))
    return json.loads(raw[raw.find("{"):raw.rfind("}")+1])

def build_insights(df, col_info, domain, config):
    sample = df.head(5).to_dict(orient='records')
    stats = {}
    for c in col_info:
        if 'int' in c['type'] or 'float' in c['type']:
            col_data = df[c['name']].dropna()
            if len(col_data) > 0:
                stats[c['name']] = {'sum': round(float(col_data.sum()),2), 'mean': round(float(col_data.mean()),2), 'max': round(float(col_data.max()),2)}

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
            messages=[{"role":"user","content":prompt}],
            max_tokens=600
        )
        raw = resp.choices[0].message.content.strip()
        if "```" in raw:
            raw = "\n".join(l for l in raw.split("\n") if not l.strip().startswith("```"))
        return json.loads(raw[raw.find("{"):raw.rfind("}")+1])
    except:
        return {"summary":"Data loaded successfully.","trend":"Analysis complete.","insight1":"Review KPI cards for key metrics.","insight2":"Use filters to explore data.","recommendation":"Examine the charts for patterns.","anomaly":"No anomalies detected.","performance":"Data is ready for analysis."}

def finalize(df, filename, source_type="excel"):
    col_info = []
    for col in df.columns:
        try:
            samples = [cv(s) for s in df[col].dropna().head(5).tolist()]
            col_info.append({"name":str(col),"type":str(df[col].dtype),"sample":samples,"unique":int(df[col].nunique())})
        except:
            col_info.append({"name":str(col),"type":"unknown","sample":[],"unique":0})

    domain = detect_domain(df.columns.tolist(), df.head(3).to_dict(orient='records'))
    theme = DOMAIN_THEMES[domain]
    config = build_ai_config(df, col_info, domain)
    insights = build_insights(df, col_info, domain, config)

    num_stats = {}
    for col in df.columns:
        if pd.api.types.is_numeric_dtype(df[col]):
            d = df[col].dropna()
            if len(d) > 0:
                num_stats[col] = {
                    "sum": round(float(d.sum()),2),
                    "mean": round(float(d.mean()),2),
                    "max": round(float(d.max()),2),
                    "min": round(float(d.min()),2),
                    "count": int(len(d))
                }

    records = [{str(col): cv(row[col]) for col in df.columns} for _, row in df.iterrows()]

    return {
        "config": config,
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

@app.post("/login")
def login(req: LoginReq):
    u = USERS.get(req.email)
    if not u or hp(req.password) != u["hashed_password"]:
        raise HTTPException(401,"Wrong credentials")
    return {"token": mk_token(req.email), "user": {"name":u["name"],"email":u["email"],"role":u["role"]}}

@app.post("/upload")
async def upload_excel(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        df = smart_transform(df)
        return finalize(df, file.filename, "excel")
    except Exception as e:
        raise HTTPException(400, str(e))

@app.post("/upload-csv")
async def upload_csv(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        try: df = pd.read_csv(io.BytesIO(contents), encoding='utf-8')
        except: df = pd.read_csv(io.BytesIO(contents), encoding='latin-1')
        df = smart_transform(df)
        return finalize(df, file.filename, "csv")
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
            url = (
        f"mssql+pyodbc://{conn.server}/{conn.database}"
        f"?driver=ODBC+Driver+17+for+SQL+Server"
        f"&trusted_connection=yes"
        f"&TrustServerCertificate=yes"

)
        else:
            raise HTTPException(400,"Unsupported DB")
        engine = create_engine(url)
        with engine.connect() as c:
            df = pd.read_sql(text(conn.query), c)
        df = smart_transform(df)
        return finalize(df, f"{conn.db_type}:{conn.database}", conn.db_type)
    except Exception as e:
        raise HTTPException(500, str(e))