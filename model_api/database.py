import os
from functools import lru_cache

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "server", ".env"))


@lru_cache(maxsize=1)
def get_client() -> AsyncIOMotorClient:
    mongo_url = os.getenv("MONGO_URL")
    if not mongo_url:
        raise RuntimeError("MONGO_URL is not configured")

    return AsyncIOMotorClient(mongo_url)


def get_database():
    client = get_client()
    configured_db = os.getenv("MONGO_DB", "test")

    try:
        return client.get_default_database()
    except Exception:
        return client[configured_db]
