import pandas as pd
import io
from sqlalchemy import create_engine, text

def read_excel(file_bytes):
    df = pd.read_excel(io.BytesIO(file_bytes))
    df.columns = df.columns.str.strip().astype(str)
    df = df.dropna(how='all').reset_index(drop=True)
    return df

def read_csv(file_bytes):
    df = pd.read_csv(io.BytesIO(file_bytes))
    df.columns = df.columns.str.strip().astype(str)
    df = df.dropna(how='all').reset_index(drop=True)
    return df

def read_mysql(host, port, database, username, password, query):
    engine = create_engine(f"mysql+pymysql://{username}:{password}@{host}:{port}/{database}")
    with engine.connect() as conn:
        df = pd.read_sql(text(query), conn)
    return df

def read_postgresql(host, port, database, username, password, query):
    engine = create_engine(f"postgresql+psycopg2://{username}:{password}@{host}:{port}/{database}")
    with engine.connect() as conn:
        df = pd.read_sql(text(query), conn)
    return df

def read_sqlserver(server, database, username, password, query):
    conn_str = f"mssql+pyodbc://{username}:{password}@{server}/{database}?driver=ODBC+Driver+17+for+SQL+Server"
    engine = create_engine(conn_str)
    with engine.connect() as conn:
        df = pd.read_sql(text(query), conn)
    return df

def read_sharepoint(site_url, username, password, file_path):
    from office365.sharepoint.client_context import ClientContext
    from office365.runtime.auth.user_credential import UserCredential
    ctx = ClientContext(site_url).with_credentials(UserCredential(username, password))
    with open("/tmp/sp_file.xlsx", "wb") as f:
        ctx.web.get_file_by_server_relative_url(file_path).download(f).execute_query()
    return read_excel(open("/tmp/sp_file.xlsx", "rb").read())