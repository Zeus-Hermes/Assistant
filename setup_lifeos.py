#!/usr/bin/env python3
"""
LifeOS Project Setup Script
Generates the complete file structure for Phase 0 backend MVP
Run this in PyCharm to auto-create your project structure
"""

import os
from pathlib import Path


def create_file(filepath: Path, content: str):
    """Create a file with content, making parent directories if needed"""
    filepath.parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, 'w') as f:
        f.write(content)
    print(f"✅ Created: {filepath}")


def setup_lifeos_project():
    """Generate the complete LifeOS project structure"""

    base_dir = Path("lifeos")
    base_dir.mkdir(exist_ok=True)

    print("🚀 Setting up LifeOS project structure...\n")

    # ==================== BACKEND FILES ====================

    # backend/__init__.py
    create_file(base_dir / "backend" / "__init__.py", '"""LifeOS Backend Core"""\n')

    # backend/config.py
    create_file(base_dir / "backend" / "config.py", '''"""
Configuration management for LifeOS
Loads environment variables and validates required API keys
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # LLM Settings
    groq_api_key: str
    groq_model: str = "llama-3.1-70b-versatile"

    # Tool API Keys
    openweather_api_key: str
    serper_api_key: str  # For Google search
    news_api_key: str

    # App Settings
    debug_mode: bool = True
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()
''')

    # backend/logger.py
    create_file(base_dir / "backend" / "logger.py", '''"""
Structured logging for LifeOS
Tracks all LLM calls, tool executions, and errors
"""

import logging
import sys
from datetime import datetime
from pathlib import Path


def setup_logger(name: str = "lifeos", log_file: str = "lifeos.log") -> logging.Logger:
    """
    Set up structured logger with console and file output

    Args:
        name: Logger name
        log_file: Path to log file

    Returns:
        Configured logger instance
    """
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    # Prevent duplicate handlers
    if logger.handlers:
        return logger

    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_format = logging.Formatter(
        '%(asctime)s | %(levelname)-8s | %(name)s | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    console_handler.setFormatter(console_format)

    # File handler
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    file_handler = logging.FileHandler(log_dir / log_file)
    file_handler.setLevel(logging.DEBUG)
    file_format = logging.Formatter(
        '%(asctime)s | %(levelname)-8s | %(name)s | %(funcName)s | %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_handler.setFormatter(file_format)

    logger.addHandler(console_handler)
    logger.addHandler(file_handler)

    return logger


# Global logger instance
logger = setup_logger()
''')

    # backend/llm_client.py
    create_file(base_dir / "backend" / "llm_client.py", '''"""
LLM Client for Groq API
Handles two-step pattern: planning call + final response call
"""

import json
from typing import Dict, List, Any, Optional
from groq import Groq
from backend.config import settings
from backend.logger import logger


class LLMClient:
    """Wrapper for Groq API with planning and response calls"""

    def __init__(self):
        self.client = Groq(api_key=settings.groq_api_key)
        self.model = settings.groq_model

    def planning_call(
        self, 
        user_request: str, 
        tool_schemas: List[Dict[str, Any]],
        memory_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Step 1: Planning call to select tools

        Args:
            user_request: User's natural language request
            tool_schemas: List of available tool schemas
            memory_context: Optional memory/preferences context

        Returns:
            Parsed JSON with tool_calls list
        """

        system_prompt = """You are the planning brain of LifeOS, a personal AI assistant.

Your job: Analyze the user's request and decide which tools to call.

Available tools:
{tools}

Rules:
1. Return ONLY valid JSON, no other text
2. Format: {{"tool_calls": [{{"name": "tool_name", "arguments": {{...}}}}]}}
3. If no tools needed, return: {{"tool_calls": []}}
4. You can call multiple tools in sequence
5. Be precise with tool names and arguments

Example:
User: "What's the weather in Dallas and play some chill music"
Response: {{"tool_calls": [{{"name": "weather.get_weather", "arguments": {{"location": "Dallas, TX"}}}}, {{"name": "spotify.play_playlist", "arguments": {{"query": "chill"}}}}]}}
"""

        tools_formatted = json.dumps(tool_schemas, indent=2)
        system_prompt = system_prompt.format(tools=tools_formatted)

        if memory_context:
            system_prompt += f"\\n\\nUser context:\\n{memory_context}"

        logger.info(f"Planning call for request: {user_request}")

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_request}
                ],
                temperature=0.1,  # Low temp for structured output
                max_tokens=1000
            )

            response_text = response.choices[0].message.content.strip()
            logger.debug(f"Planning response: {response_text}")

            # Parse JSON
            parsed = json.loads(response_text)
            logger.info(f"Planned tool calls: {parsed.get('tool_calls', [])}")

            return parsed

        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON from planning call: {e}")
            return {"tool_calls": []}
        except Exception as e:
            logger.error(f"Planning call failed: {e}")
            return {"tool_calls": []}

    def final_response_call(
        self,
        user_request: str,
        tool_outputs: List[Dict[str, Any]],
        memory_context: Optional[str] = None
    ) -> str:
        """
        Step 2: Final response generation with tool outputs

        Args:
            user_request: Original user request
            tool_outputs: Results from executed tools
            memory_context: Optional memory/preferences

        Returns:
            Natural language response
        """

        system_prompt = """You are LifeOS, a charming, helpful AI assistant with a WALL-E-like personality.

Personality traits:
- Warm, friendly, slightly playful
- Concise but not robotic
- Use natural language, avoid being too formal
- Occasionally use light humor when appropriate

Your job: Synthesize the tool outputs into a helpful, natural response.

Tool outputs:
{tool_outputs}

Rules:
1. Be conversational and helpful
2. Synthesize multiple tool outputs smoothly
3. If a tool failed, acknowledge it gracefully
4. Keep responses concise unless detail is needed
"""

        tools_formatted = json.dumps(tool_outputs, indent=2)
        system_prompt = system_prompt.format(tool_outputs=tools_formatted)

        if memory_context:
            system_prompt += f"\\n\\nUser context:\\n{memory_context}"

        logger.info("Generating final response")

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_request}
                ],
                temperature=0.7,  # Higher temp for natural responses
                max_tokens=500
            )

            final_text = response.choices[0].message.content.strip()
            logger.info(f"Final response generated: {final_text[:100]}...")

            return final_text

        except Exception as e:
            logger.error(f"Final response call failed: {e}")
            return "Sorry, I'm having trouble formulating a response right now."


# Global client instance
llm_client = LLMClient()
''')

    # backend/tool_registry.py
    create_file(base_dir / "backend" / "tool_registry.py", '''"""
Tool Registry
Auto-discovers and loads tools from /tools directory
Each tool has a manifest.json and implementation
"""

import json
import importlib.util
from pathlib import Path
from typing import Dict, List, Any, Callable
from backend.logger import logger


class ToolRegistry:
    """Manages tool discovery, loading, and execution"""

    def __init__(self, tools_dir: str = "tools"):
        self.tools_dir = Path(tools_dir)
        self.tools: Dict[str, Dict[str, Any]] = {}
        self.tool_functions: Dict[str, Callable] = {}

    def discover_tools(self):
        """
        Scan tools directory and load all valid tools
        Each tool must have:
        - manifest.json (metadata, schema)
        - {tool_name}.py (implementation with execute() function)
        """
        logger.info("Discovering tools...")

        if not self.tools_dir.exists():
            logger.warning(f"Tools directory not found: {self.tools_dir}")
            return

        for tool_dir in self.tools_dir.iterdir():
            if not tool_dir.is_dir():
                continue

            manifest_path = tool_dir / "manifest.json"
            if not manifest_path.exists():
                logger.warning(f"No manifest.json in {tool_dir.name}, skipping")
                continue

            try:
                # Load manifest
                with open(manifest_path, 'r') as f:
                    manifest = json.load(f)

                tool_name = manifest.get("name")
                if not tool_name:
                    logger.error(f"Tool {tool_dir.name} missing 'name' in manifest")
                    continue

                # Load Python module
                module_path = tool_dir / f"{tool_dir.name}.py"
                if not module_path.exists():
                    logger.error(f"Tool {tool_name} missing implementation file")
                    continue

                spec = importlib.util.spec_from_file_location(tool_name, module_path)
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)

                if not hasattr(module, 'execute'):
                    logger.error(f"Tool {tool_name} missing execute() function")
                    continue

                # Register tool
                self.tools[tool_name] = manifest
                self.tool_functions[tool_name] = module.execute

                logger.info(f"✅ Loaded tool: {tool_name} (v{manifest.get('version', '1.0')})")

            except Exception as e:
                logger.error(f"Failed to load tool {tool_dir.name}: {e}")

    def get_tool_schemas(self) -> List[Dict[str, Any]]:
        """
        Get all tool schemas for LLM planning call

        Returns:
            List of tool schemas (name, description, input_schema)
        """
        schemas = []
        for tool_name, manifest in self.tools.items():
            schemas.append({
                "name": tool_name,
                "description": manifest.get("description", ""),
                "input_schema": manifest.get("input_schema", {}),
                "output_schema": manifest.get("output_schema", {})
            })
        return schemas

    def execute_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a tool by name with given arguments

        Args:
            tool_name: Name of the tool (e.g., "weather.get_weather")
            arguments: Tool input parameters

        Returns:
            Tool output dict with status and data
        """
        logger.info(f"Executing tool: {tool_name} with args: {arguments}")

        if tool_name not in self.tool_functions:
            logger.error(f"Tool not found: {tool_name}")
            return {
                "success": False,
                "error": f"Tool {tool_name} not found",
                "data": None
            }

        try:
            result = self.tool_functions[tool_name](arguments)
            logger.info(f"Tool {tool_name} executed successfully")
            return {
                "success": True,
                "tool": tool_name,
                "data": result
            }
        except Exception as e:
            logger.error(f"Tool {tool_name} execution failed: {e}")
            return {
                "success": False,
                "tool": tool_name,
                "error": str(e),
                "data": None
            }


# Global registry instance
tool_registry = ToolRegistry()
''')

    # backend/orchestrator.py
    create_file(base_dir / "backend" / "orchestrator.py", '''"""
Orchestrator
Core logic that coordinates LLM planning, tool execution, and final response
"""

from typing import Dict, Any, List
from backend.llm_client import llm_client
from backend.tool_registry import tool_registry
from backend.logger import logger


class Orchestrator:
    """Coordinates the full request lifecycle"""

    def __init__(self):
        self.llm = llm_client
        self.registry = tool_registry

    async def process_request(self, user_request: str) -> Dict[str, Any]:
        """
        Main orchestration flow:
        1. Planning call to LLM (select tools)
        2. Execute selected tools
        3. Final response call with tool outputs

        Args:
            user_request: User's natural language input

        Returns:
            Dict with final response and metadata
        """
        logger.info(f"Processing request: {user_request}")

        # Step 1: Planning call
        tool_schemas = self.registry.get_tool_schemas()
        planning_result = self.llm.planning_call(
            user_request=user_request,
            tool_schemas=tool_schemas
        )

        tool_calls = planning_result.get("tool_calls", [])

        # Step 2: Execute tools
        tool_outputs = []
        if tool_calls:
            logger.info(f"Executing {len(tool_calls)} tool(s)")
            for tool_call in tool_calls:
                tool_name = tool_call.get("name")
                arguments = tool_call.get("arguments", {})

                output = self.registry.execute_tool(tool_name, arguments)
                tool_outputs.append(output)
        else:
            logger.info("No tools selected by planner")

        # Step 3: Final response
        final_response = self.llm.final_response_call(
            user_request=user_request,
            tool_outputs=tool_outputs
        )

        return {
            "request": user_request,
            "tool_calls": tool_calls,
            "tool_outputs": tool_outputs,
            "response": final_response
        }


# Global orchestrator instance
orchestrator = Orchestrator()
''')

    # backend/main.py
    create_file(base_dir / "backend" / "main.py", '''"""
FastAPI application entry point
Provides REST API for LifeOS backend
"""

from fastapi import FastAPI, HTTPException
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
''')

    # ==================== TOOLS ====================

    # tools/weather/manifest.json
    create_file(base_dir / "tools" / "weather" / "manifest.json", '''{
  "name": "weather.get_weather",
  "version": "1.0",
  "description": "Get current weather conditions for a location",
  "input_schema": {
    "type": "object",
    "properties": {
      "location": {
        "type": "string",
        "description": "City name or 'City, State' or 'City, Country'"
      }
    },
    "required": ["location"]
  },
  "output_schema": {
    "type": "object",
    "properties": {
      "temperature": {"type": "number"},
      "condition": {"type": "string"},
      "humidity": {"type": "number"},
      "wind_speed": {"type": "number"}
    }
  }
}
''')

    # tools/weather/weather.py
    create_file(base_dir / "tools" / "weather" / "weather.py", '''"""
Weather Tool
Fetches current weather data using OpenWeatherMap API
"""

import requests
from backend.config import settings
from backend.logger import logger


def execute(arguments: dict) -> dict:
    """
    Get current weather for a location

    Args:
        arguments: Dict with 'location' key

    Returns:
        Weather data dict
    """
    location = arguments.get("location")
    if not location:
        raise ValueError("Location is required")

    logger.info(f"Fetching weather for: {location}")

    api_key = settings.openweather_api_key
    base_url = "http://api.openweathermap.org/data/2.5/weather"

    params = {
        "q": location,
        "appid": api_key,
        "units": "imperial"  # Fahrenheit
    }

    response = requests.get(base_url, params=params, timeout=10)
    response.raise_for_status()

    data = response.json()

    return {
        "location": data["name"],
        "temperature": data["main"]["temp"],
        "condition": data["weather"][0]["description"],
        "humidity": data["main"]["humidity"],
        "wind_speed": data["wind"]["speed"]
    }
''')

    # tools/news/manifest.json
    create_file(base_dir / "tools" / "news" / "manifest.json", '''{
  "name": "news.get_news",
  "version": "1.0",
  "description": "Get top news headlines, optionally filtered by category or query",
  "input_schema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Optional search query for specific news topics"
      },
      "category": {
        "type": "string",
        "description": "Optional category: business, entertainment, health, science, sports, technology"
      },
      "limit": {
        "type": "integer",
        "description": "Number of articles to return (default 5)"
      }
    }
  },
  "output_schema": {
    "type": "object",
    "properties": {
      "articles": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "title": {"type": "string"},
            "description": {"type": "string"},
            "source": {"type": "string"},
            "url": {"type": "string"}
          }
        }
      }
    }
  }
}
''')

    # tools/news/news.py
    create_file(base_dir / "tools" / "news" / "news.py", '''"""
News Tool
Fetches top news headlines using NewsAPI
"""

import requests
from backend.config import settings
from backend.logger import logger


def execute(arguments: dict) -> dict:
    """
    Get top news headlines

    Args:
        arguments: Dict with optional 'query', 'category', 'limit' keys

    Returns:
        Dict with list of news articles
    """
    query = arguments.get("query")
    category = arguments.get("category")
    limit = arguments.get("limit", 5)

    api_key = settings.news_api_key

    if query:
        # Search for specific topics
        url = "https://newsapi.org/v2/everything"
        params = {
            "q": query,
            "apiKey": api_key,
            "pageSize": limit,
            "language": "en",
            "sortBy": "publishedAt"
        }
        logger.info(f"Searching news for: {query}")
    else:
        # Get top headlines
        url = "https://newsapi.org/v2/top-headlines"
        params = {
            "apiKey": api_key,
            "pageSize": limit,
            "country": "us"
        }
        if category:
            params["category"] = category
        logger.info(f"Fetching top headlines (category: {category or 'general'})")

    response = requests.get(url, params=params, timeout=10)
    response.raise_for_status()

    data = response.json()
    articles = data.get("articles", [])

    return {
        "articles": [
            {
                "title": article["title"],
                "description": article.get("description", "No description"),
                "source": article["source"]["name"],
                "url": article["url"]
            }
            for article in articles[:limit]
        ]
    }
''')

    # tools/search/manifest.json
    create_file(base_dir / "tools" / "search" / "manifest.json", '''{
  "name": "search.google_search",
  "version": "1.0",
  "description": "Search the internet using Google (via Serper API) for general information",
  "input_schema": {
    "type": "object",
    "properties": {
      "query": {
        "type": "string",
        "description": "Search query"
      },
      "num_results": {
        "type": "integer",
        "description": "Number of results to return (default 5)"
      }
    },
    "required": ["query"]
  },
  "output_schema": {
    "type": "object",
    "properties": {
      "results": {
        "type": "array",
        "items": {
          "type": "object",
          "properties": {
            "title": {"type": "string"},
            "snippet": {"type": "string"},
            "url": {"type": "string"}
          }
        }
      }
    }
  }
}
''')

    # tools/search/search.py
    create_file(base_dir / "tools" / "search" / "search.py", '''"""
Internet Search Tool
Performs Google searches using Serper API
"""

import requests
from backend.config import settings
from backend.logger import logger


def execute(arguments: dict) -> dict:
    """
    Search Google for general information

    Args:
        arguments: Dict with 'query' and optional 'num_results'

    Returns:
        Dict with search results
    """
    query = arguments.get("query")
    if not query:
        raise ValueError("Query is required")

    num_results = arguments.get("num_results", 5)

    logger.info(f"Searching Google for: {query}")

    api_key = settings.serper_api_key
    url = "https://google.serper.dev/search"

    headers = {
        "X-API-KEY": api_key,
        "Content-Type": "application/json"
    }

    payload = {
        "q": query,
        "num": num_results
    }

    response = requests.post(url, json=payload, headers=headers, timeout=10)
    response.raise_for_status()

    data = response.json()
    organic_results = data.get("organic", [])

    return {
        "query": query,
        "results": [
            {
                "title": result.get("title", ""),
                "snippet": result.get("snippet", ""),
                "url": result.get("link", "")
            }
            for result in organic_results[:num_results]
        ]
    }
''')

    # ==================== MEMORY STUB ====================

    create_file(base_dir / "memory" / "__init__.py", '"""Memory system for LifeOS (Phase 4)"""\n')

    create_file(base_dir / "memory" / "memory_stub.py", '''"""
Memory stub for Phase 0
Will be replaced with full implementation in Phase 4
"""

from typing import Optional


def get_user_context(user_id: str = "default") -> Optional[str]:
    """
    Placeholder for memory retrieval

    Args:
        user_id: User identifier

    Returns:
        Context string or None
    """
    return None


def save_interaction(user_id: str, request: str, response: str):
    """
    Placeholder for saving interactions

    Args:
        user_id: User identifier
        request: User's request
        response: Assistant's response
    """
    pass
''')

    # ==================== TESTS ====================

    create_file(base_dir / "tests" / "__init__.py", '')

    create_file(base_dir / "tests" / "test_orchestrator.py", '''"""
Unit tests for orchestrator
Run with: pytest tests/
"""

import pytest
from backend.orchestrator import Orchestrator


@pytest.mark.asyncio
async def test_orchestrator_basic():
    """Test basic orchestrator flow"""
    orchestrator = Orchestrator()
    result = await orchestrator.process_request("What's the weather in Dallas?")

    assert "response" in result
    assert "tool_calls" in result
    assert isinstance(result["response"], str)


# Add more tests as you build features
''')

    # ==================== CONFIG FILES ====================

    # .env.example
    create_file(base_dir / ".env.example", '''# LLM API Keys
GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.1-70b-versatile

# Tool API Keys
OPENWEATHER_API_KEY=your_openweather_api_key_here
SERPER_API_KEY=your_serper_api_key_here
NEWS_API_KEY=your_news_api_key_here

# App Settings
DEBUG_MODE=true
LOG_LEVEL=INFO
''')

    # requirements.txt
    create_file(base_dir / "requirements.txt", '''# Core framework
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
pydantic-settings==2.1.0

# LLM
groq==0.4.1

# HTTP requests
requests==2.31.0
httpx==0.25.2

# Testing
pytest==7.4.3
pytest-asyncio==0.21.1

# Utilities
python-dotenv==1.0.0
''')

    # .gitignore
    create_file(base_dir / ".gitignore", '''# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
env/
venv/
ENV/
build/
dist/
*.egg-info/

# Environment
.env
.env.local

# Logs
logs/
*.log

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Testing
.pytest_cache/
.coverage
htmlcov/
''')

    # README.md
    create_file(base_dir / "README.md", '''# LifeOS - Phase 0: Backend MVP

Personal AI assistant with modular tool architecture.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Set Up Environment Variables

Copy `.env.example` to `.env` and fill in your API keys:

```bash
cp .env.example .env
```

**Required API Keys:**
- **Groq**: Get from https://console.groq.com/keys
- **OpenWeatherMap**: Get from https://openweathermap.org/api
- **Serper**: Get from https://serper.dev/
- **NewsAPI**: Get from https://newsapi.org/

### 3. Run the Backend

```bash
cd lifeos
python -m uvicorn backend.main:app --reload
```

Server will start at `http://localhost:8000`

### 4. Test the API

**Health check:**
```bash
curl http://localhost:8000/
```

**List tools:**
```bash
curl http://localhost:8000/tools
```

**Send a query:**
```bash
curl -X POST http://localhost:8000/query \\
  -H "Content-Type: application/json" \\
  -d '{"query": "What's the weather in Dallas?"}'
```

## 📁 Project Structure

```
lifeos/
├── backend/           # Core backend logic
│   ├── main.py       # FastAPI app
│   ├── orchestrator.py
│   ├── llm_client.py
│   ├── tool_registry.py
│   ├── config.py
│   └── logger.py
├── tools/            # Modular tools
│   ├── weather/
│   ├── news/
│   └── search/
├── memory/           # Memory system (Phase 4)
└── tests/            # Unit tests
```

## 🔧 Adding a New Tool

1. Create a new folder in `tools/`
2. Add `manifest.json` with tool metadata
3. Add `{tool_name}.py` with `execute()` function
4. Restart the server

The tool will be auto-discovered!

## 📝 Next Steps

- Phase 1: Voice integration (STT/TTS)
- Phase 2: Spotify, smart lights, Whoop
- Phase 3: Wake word detection
- Phase 4: Memory & personalization

## 🐛 Debugging

Logs are written to `logs/lifeos.log`

Set `DEBUG_MODE=true` in `.env` for verbose logging.
''')

    print("\n" + "=" * 60)
    print("✅ LifeOS project structure created successfully!")
    print("=" * 60)
    print(f"\n📁 Project location: {base_dir.absolute()}")
    print("\n📋 Next steps:")
    print("1. cd lifeos")
    print("2. pip install -r requirements.txt")
    print("3. cp .env.example .env")
    print("4. Add your API keys to .env")
    print("5. python -m uvicorn backend.main:app --reload")
    print("\n🚀 Ready to build!\n")


if __name__ == "__main__":
    setup_lifeos_project()