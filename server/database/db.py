import asyncpg
from fastapi import HTTPException

DB_URL = "postgres://u4s2tnq1qdnfhs:p5e985da61a7c048131d8e0c8473aa3e9cbe03906588a11541297dafa1677ced9@c8m0261h0c7idk.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/dfh36eu1f1e39j"

async def connect_db():
    try:
        connected = await asyncpg.connect(DB_URL)
        return connected
    except Exception as e:
         return {"status":"failed","message":"no connection established"}