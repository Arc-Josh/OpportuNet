import asyncpg
from fastapi import HTTPException

DB_URL = "postgres://u3vrmarrvp2jaa:p18dc62cbbde83252691bd6a5711d1297e20291dd144ec092f549a34aaf9b64c3@ca932070ke6bv1.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/db7395k6nk841t"

async def connect_db():
    try:
        connected = await asyncpg.connect(DB_URL)
        return connected
    except Exception as e:
         return {"status":"failed","message":"no connection established"}