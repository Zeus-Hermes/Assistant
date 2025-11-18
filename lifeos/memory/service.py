"""
Memory Service (Supabase REST API)
Direct API calls - no client library bullshit
"""

import requests
import json
from datetime import datetime
from typing import List, Dict, Any, Optional
from backend.config import settings
from backend.logger import logger
from memory.models import Memory, ConversationMemory, Entity, MemoryCategory


class MemoryService:
    """Supabase REST API-based memory service"""

    def __init__(self):
        self.base_url = f"{settings.supabase_url}/rest/v1"
        self.headers = {
            "apikey": settings.supabase_key,
            "Authorization": f"Bearer {settings.supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        logger.info("Memory service initialized (Supabase REST API)")

    def _request(self, method: str, endpoint: str, data: Optional[Dict] = None, params: Optional[Dict] = None) -> Dict:
        """Make Supabase REST API request"""
        url = f"{self.base_url}/{endpoint}"

        try:
            response = requests.request(
                method=method,
                url=url,
                headers=self.headers,
                json=data,
                params=params,
                timeout=10
            )
            response.raise_for_status()

            if response.status_code == 204:  # No content
                return {}

            return response.json() if response.text else {}

        except requests.exceptions.HTTPError as e:
            logger.error(f"Supabase API error: {e.response.status_code} - {e.response.text}")
            raise
        except Exception as e:
            logger.error(f"Request failed: {e}")
            raise

    # ==================== MEMORIES ====================

    def save_memory(self, memory: Memory) -> Memory:
        """Save a new memory"""
        try:
            data = {
                "id": str(memory.id),
                "fact": memory.fact,
                "source": memory.source.value if hasattr(memory.source, 'value') else memory.source,
                "timestamp": memory.timestamp.isoformat(),
                "category": memory.category.value if hasattr(memory.category, 'value') else memory.category,
                "importance": memory.importance,
                "tags": memory.tags,
                "context": memory.context
            }

            self._request("POST", "memories", data=data)
            logger.info(f"Saved memory: {memory.fact[:50]}...")
            return memory
        except Exception as e:
            logger.error(f"Failed to save memory: {e}")
            raise

    def get_memories(
        self,
        category: Optional[MemoryCategory] = None,
        tags: Optional[List[str]] = None,
        min_importance: int = 1,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Retrieve memories with filters"""
        try:
            params = {
                "importance": f"gte.{min_importance}",
                "order": "importance.desc,timestamp.desc",
                "limit": str(limit)
            }

            if category:
                params["category"] = f"eq.{category.value}"

            result = self._request("GET", "memories", params=params)
            memories = result if isinstance(result, list) else []

            # Filter by tags if provided (client-side since Supabase array filtering is complex)
            if tags and memories:
                memories = [
                    m for m in memories
                    if any(tag in m.get('tags', []) for tag in tags)
                ]

            logger.info(f"Retrieved {len(memories)} memories")
            return memories
        except Exception as e:
            logger.error(f"Failed to retrieve memories: {e}")
            return []

    def search_memories(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Search memories by extracting keywords and matching against fact + tags"""
        try:
            # Extract keywords from query (remove common words)
            stop_words = {'what', 'is', 'my', 'the', 'a', 'an', 'are', 'hey', 'bud', 'whats', 'do', 'does'}
            keywords = [w.lower().strip() for w in query.split() if w.lower().strip() not in stop_words and len(w) > 2]

            if not keywords:
                # Fallback to basic search
                params = {
                    "fact": f"ilike.*{query}*",
                    "order": "importance.desc",
                    "limit": str(limit)
                }
                result = self._request("GET", "memories", params=params)
                return result if isinstance(result, list) else []

            # Get all high-importance memories and filter client-side
            params = {
                "importance": "gte.5",
                "order": "importance.desc",
                "limit": "20"  # Get more to filter
            }

            result = self._request("GET", "memories", params=params)
            all_memories = result if isinstance(result, list) else []

            # Score each memory based on keyword matches
            scored_memories = []
            for mem in all_memories:
                score = 0
                fact_lower = mem['fact'].lower()
                mem_tags = [t.lower() for t in mem.get('tags', [])]

                for keyword in keywords:
                    # Check fact
                    if keyword in fact_lower:
                        score += 2
                    # Check tags
                    if any(keyword in tag for tag in mem_tags):
                        score += 3  # Tags are more specific

                if score > 0:
                    scored_memories.append((score, mem))

            # Sort by score and return top results
            scored_memories.sort(reverse=True, key=lambda x: x[0])
            memories = [mem for score, mem in scored_memories[:limit]]

            logger.info(f"Found {len(memories)} memories for query: {query} (keywords: {keywords})")
            return memories

        except Exception as e:
            logger.error(f"Memory search failed: {e}")
            return []

    def get_recent_context(self, limit: int = 5) -> str:
        """Get recent memories as context string"""
        memories = self.get_memories(limit=limit)

        if not memories:
            return ""

        context_parts = ["Recent memories:"]
        for mem in memories:
            context_parts.append(f"- {mem['fact']} (importance: {mem['importance']})")

        return "\\n".join(context_parts)

    # ==================== CONVERSATIONS ====================

    def save_conversation(self, conv: ConversationMemory) -> ConversationMemory:
        """Save conversation history"""
        try:
            data = {
                "id": str(conv.id),
                "user_message": conv.user_message,
                "assistant_response": conv.assistant_response,
                "tool_calls": conv.tool_calls,
                "timestamp": conv.timestamp.isoformat()
            }

            self._request("POST", "conversations", data=data)
            logger.info("Saved conversation")
            return conv
        except Exception as e:
            logger.error(f"Failed to save conversation: {e}")
            raise

    def get_recent_conversations(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent conversation history"""
        try:
            params = {
                "order": "timestamp.desc",
                "limit": str(limit)
            }

            result = self._request("GET", "conversations", params=params)
            return result if isinstance(result, list) else []
        except Exception as e:
            logger.error(f"Failed to retrieve conversations: {e}")
            return []

    # ==================== ENTITIES ====================

    def save_entity(self, entity: Entity) -> Entity:
        """Save or update an entity"""
        try:
            # Check if exists
            existing = self._request("GET", "entities", params={
                "name": f"eq.{entity.name}",
                "entity_type": f"eq.{entity.entity_type}"
            })

            data = {
                "id": str(entity.id),
                "name": entity.name,
                "entity_type": entity.entity_type,
                "context": entity.context,
                "last_mentioned": entity.last_mentioned.isoformat(),
                "mention_count": entity.mention_count
            }

            if existing and len(existing) > 0:
                # Update existing
                entity_id = existing[0]['id']
                data['mention_count'] = existing[0]['mention_count'] + 1
                self._request("PATCH", f"entities?id=eq.{entity_id}", data=data)
            else:
                # Insert new
                self._request("POST", "entities", data=data)

            logger.info(f"Saved entity: {entity.name}")
            return entity
        except Exception as e:
            logger.error(f"Failed to save entity: {e}")
            raise

    def get_entities(self, entity_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get tracked entities"""
        try:
            params = {
                "order": "mention_count.desc",
                "limit": "20"
            }

            if entity_type:
                params["entity_type"] = f"eq.{entity_type}"

            result = self._request("GET", "entities", params=params)
            return result if isinstance(result, list) else []
        except Exception as e:
            logger.error(f"Failed to retrieve entities: {e}")
            return []




    # ==================== CONVERSATION SUMMARIES ====================

    def save_summary(self, summary_text: str, messages_start_id: str, 
                    messages_end_id: str, message_count: int, token_count: int) -> Dict[str, Any]:
        """Save a conversation summary"""
        try:
            data = {
                "summary_text": summary_text,
                "messages_start_id": messages_start_id,
                "messages_end_id": messages_end_id,
                "message_count": message_count,
                "token_count": token_count
            }

            result = self._request("POST", "conversation_summaries", data=data)
            logger.info(f"Saved conversation summary ({message_count} messages, {token_count} tokens)")
            return result
        except Exception as e:
            logger.error(f"Failed to save summary: {e}")
            raise

    def get_latest_summary(self) -> Optional[Dict[str, Any]]:
        """Get the most recent conversation summary"""
        try:
            params = {
                "order": "created_at.desc",
                "limit": "1"
            }

            result = self._request("GET", "conversation_summaries", params=params)
            if result and len(result) > 0:
                return result[0]
            return None
        except Exception as e:
            logger.error(f"Failed to get latest summary: {e}")
            return None

    def get_all_summaries(self) -> List[Dict[str, Any]]:
        """Get all conversation summaries"""
        try:
            params = {
                "order": "created_at.asc"
            }

            result = self._request("GET", "conversation_summaries", params=params)
            return result if isinstance(result, list) else []
        except Exception as e:
            logger.error(f"Failed to get summaries: {e}")
            return []

    def archive_old_conversations(self, before_id: str):
        """Mark old conversations as archived (soft delete)"""
        # We keep them in DB but don't load them into context
        # This is just for record-keeping
        pass

# Global memory service instance
memory_service = MemoryService()