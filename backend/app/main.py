import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.ws_manager import ConnectionManager
from app.services.graphiti_service import graphiti_service

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up — initializing Graphiti...")
    try:
        await graphiti_service.init(
            uri=settings.neo4j_uri,
            user=settings.neo4j_user,
            password=settings.neo4j_password,
            api_key=settings.openrouter_api_key,
            base_url=settings.openrouter_base_url,
            model=settings.graph_model,
        )
        logger.info("Graphiti ready")
    except Exception as e:
        logger.warning("Graphiti initialization failed (graph features disabled): %s", e)
    yield
    logger.info("Shutting down — closing Graphiti...")
    await graphiti_service.close()


app = FastAPI(title="MindWeave", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ws_manager = ConnectionManager()

# Import and include routers after app creation to avoid circular imports
from app.api.v1 import chat, export, graph, ws  # noqa: E402

app.include_router(chat.router, prefix="/api/v1", tags=["chat"])
app.include_router(graph.router, prefix="/api/v1", tags=["graph"])
app.include_router(export.router, prefix="/api/v1", tags=["export"])
app.include_router(ws.router, tags=["websocket"])


@app.get("/health")
async def health():
    return {"status": "ok", "graph": graphiti_service.get_status().model_dump()}
