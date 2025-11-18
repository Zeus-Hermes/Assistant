"""
FastAPI application entry point
Provides REST API for LifeOS backend
"""
from fastapi import FastAPI, HTTPException
from fastapi import FastAPI
from fastapi.responses import FileResponse
from pathlib import Path
from pydantic import BaseModel
from backend.orchestrator import orchestrator
from backend.tool_registry import tool_registry
from backend.logger import logger


app = FastAPI(
    title="LifeOS Backend",
    description="Personal AI assistant backend with modular tool system",
    version="0.1.0"
)


class QueryRequest(BaseModel):
    """Request model for user queries"""
    query: str


class QueryResponse(BaseModel):
    """Response model for processed queries"""
    request: str
    response: str
    tool_calls: list
    tool_outputs: list


@app.on_event("startup")
async def startup_event():
    """Initialize system on startup"""
    logger.info("🚀 Starting LifeOS backend...")
    tool_registry.discover_tools()
    logger.info(f"✅ Loaded {len(tool_registry.tools)} tools")


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "ok",
        "service": "LifeOS Backend",
        "version": "0.1.0",
        "tools_loaded": len(tool_registry.tools)
    }


@app.get("/tools")
async def list_tools():
    """List all available tools"""
    return {
        "tools": tool_registry.get_tool_schemas()
    }


@app.post("/query", response_model=QueryResponse)
async def process_query(request: QueryRequest):
    """
    Process a user query through the orchestrator

    Args:
        request: QueryRequest with user's natural language query

    Returns:
        QueryResponse with final answer and metadata
    """
    try:
        result = await orchestrator.process_request(request.query)
        return QueryResponse(**result)
    except Exception as e:
        logger.error(f"Query processing failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


# Chat UI route
@app.get("/chat")
async def chat_ui():
    """Serve the chat UI"""
    chat_html_path = Path(__file__).parent.parent / "chat.html"
    return FileResponse(chat_html_path)
