"""Embeddings-based memory search and storage using pgvector."""

import json
from typing import List, Optional, Dict, Any

import requests
from backend.config import settings
from backend.logger import logger


class EmbeddingClient:
    """Handles embedding generation and semantic search."""

    def __init__(self):
        self.supabase_url = f"{settings.supabase_url}/rest/v1"
        self.headers = {
            "apikey": settings.supabase_key,
            "Authorization": f"Bearer {settings.supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

    def _generate_embedding(self, text: str) -> Optional[List[float]]:
        """Generate an embedding vector using Groq or OpenAI."""
        if not text:
            return None

        try:
            payload = {
                "model": settings.groq_embeddings_model,
                "input": text
            }
            url = "https://api.groq.com/openai/v1/embeddings"
            headers = {
                "Authorization": f"Bearer {settings.groq_api_key}",
                "Content-Type": "application/json"
            }

            # Prefer OpenAI if key provided
            if settings.openai_api_key:
                headers["Authorization"] = f"Bearer {settings.openai_api_key}"
                payload["model"] = settings.openai_embeddings_model
                url = "https://api.openai.com/v1/embeddings"

            response = requests.post(url, headers=headers, data=json.dumps(payload), timeout=15)
            response.raise_for_status()
            data = response.json()
            embedding = data.get("data", [{}])[0].get("embedding")
            return embedding
        except Exception as e:
            logger.error(f"Failed to generate embedding: {e}")
            return None

    def store_embedding(self, fact_text: str, memory_id: Optional[str] = None) -> Optional[List[float]]:
        """
        Generate and store an embedding for the given fact.

        If memory_id is provided, the embedding is persisted to the corresponding
        memory row. Otherwise, the embedding vector is returned for manual storage.
        """
        embedding = self._generate_embedding(fact_text)
        if not embedding:
            return None

        if not memory_id:
            return embedding

        try:
            endpoint = f"{self.supabase_url}/memories?id=eq.{memory_id}"
            payload = {"embedding": embedding}
            response = requests.patch(endpoint, headers=self.headers, json=payload, timeout=10)
            response.raise_for_status()
            return embedding
        except Exception as e:
            logger.error(f"Failed to store embedding for memory {memory_id}: {e}")
            return embedding

    def search_embeddings(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Search memories semantically using pgvector similarity."""
        embedding = self._generate_embedding(query)
        if not embedding:
            return []

        try:
            rpc_url = f"{self.supabase_url}/rpc/match_memories"
            payload = {
                "query_embedding": embedding,
                "match_count": limit
            }
            response = requests.post(rpc_url, headers=self.headers, json=payload, timeout=15)
            response.raise_for_status()
            results = response.json()
            if isinstance(results, list):
                return results
            return []
        except Exception as e:
            logger.error(f"Semantic search failed: {e}")
            return []


auto_embedding_client = EmbeddingClient()
