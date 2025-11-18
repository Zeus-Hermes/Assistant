# LifeOS - Phase 0: Backend MVP

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
curl -X POST http://localhost:8000/query \
  -H "Content-Type: application/json" \
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
