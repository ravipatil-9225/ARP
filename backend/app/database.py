from motor.motor_asyncio import AsyncIOMotorClient
from app.config import get_settings

settings = get_settings()

client: AsyncIOMotorClient = None


async def connect_db():
    global client
    # 1. Try configured MONGODB_URI (Atlas or custom) with 15s timeout
    try:
        client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=15000,
            connectTimeoutMS=10000,
            socketTimeoutMS=20000,
        )
        await client.admin.command("ping")
        print(f"[OK] Connected to MongoDB Atlas - DB: {settings.MONGODB_DB_NAME}")
        return
    except Exception as e:
        print(f"[WARN] Primary MongoDB connection failed ({e}).")

    # 2. If Atlas fails (DNS/network timeout), attempt local MongoDB fallback
    try:
        print("[INFO] Attempting local MongoDB connection (mongodb://localhost:27017)...")
        local_client = AsyncIOMotorClient("mongodb://localhost:27017", serverSelectionTimeoutMS=3000)
        await local_client.admin.command("ping")
        client = local_client
        print(f"[OK] Connected to Local MongoDB fallback - DB: {settings.MONGODB_DB_NAME}")
    except Exception as local_err:
        print(f"[ERROR] Both Atlas and Local MongoDB connection attempts failed: {local_err}")


async def close_db():
    global client
    if client:
        client.close()
        print("[INFO] MongoDB connection closed")


def get_db():
    global client
    if client is None:
        client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=15000,
            connectTimeoutMS=10000,
        )
    return client[settings.MONGODB_DB_NAME]
