"""
Orchestrator
Core logic that coordinates LLM planning, tool execution, and final response
"""

from typing import List, Dict, Any
import json
import re
from backend.llm_client import llm_client
from backend.tool_registry import tool_registry
from backend.logger import logger
from backend.token_counter import token_counter
from backend.summarizer import conversation_summarizer


class Orchestrator:
    """Coordinates the full request lifecycle"""

    def __init__(self):
        self.llm = llm_client
        self.registry = tool_registry

    # ==================== MEMORY INTEGRATION ====================

    def _extract_memories(self, user_message: str, assistant_response: str) -> list:
        """Extract facts to remember from conversation with dynamic tags"""

        extraction_prompt = f"""Based on this conversation, extract facts worth remembering about the user AND generate relevant tags for each fact.

Conversation:
User: {user_message}
Assistant: {assistant_response}

Return a JSON array of objects with "fact" and "tags" fields.
Tags should be:
- Single words or short phrases
- Relevant keywords for searching
- 2-5 tags per fact
- Lowercase

Example:
[
  {{"fact": "User's name is John", "tags": ["name", "identity", "personal"]}},
  {{"fact": "User lives in Seattle", "tags": ["location", "seattle", "home", "city"]}},
  {{"fact": "User loves the Porsche 911", "tags": ["cars", "porsche", "preferences", "vehicles"]}},
  {{"fact": "User enjoys rock climbing", "tags": ["hobbies", "sports", "climbing", "outdoor"]}}
]

Return ONLY the JSON array. If nothing to remember, return [].

Facts:"""

        try:
            response = self.llm.final_response_call(
                user_request=extraction_prompt,
                tool_outputs=[]
            )

            # Extract JSON array from response
            json_match = re.search(r'\[.*\]', response, re.DOTALL)
            if json_match:
                facts_data = json.loads(json_match.group())
                # Validate structure and filter
                valid_facts = []
                for item in facts_data:
                    if isinstance(item, dict) and 'fact' in item and item['fact'] and len(item['fact']) > 5:
                        fact = item['fact']
                        tags = item.get('tags', [])
                        # Ensure tags are lowercase strings
                        tags = [str(tag).lower().strip() for tag in tags if tag]
                        valid_facts.append({"fact": fact, "tags": tags})
                return valid_facts

            return []
        except Exception as e:
            logger.error(f"Failed to extract memories: {e}")
            return []

    def _save_to_memory(self, user_message: str, assistant_response: str, tool_calls: list):
        """Save conversation and extract memories with tags"""
        try:
            from memory.service import memory_service
            from memory.models import Memory, ConversationMemory, MemoryCategory, MemorySource

            # Save conversation
            conv = ConversationMemory(
                user_message=user_message,
                assistant_response=assistant_response,
                tool_calls=tool_calls
            )
            memory_service.save_conversation(conv)

            # Extract facts with tags
            facts_data = self._extract_memories(user_message, assistant_response)

            for item in facts_data:
                fact = item['fact']
                tags = item.get('tags', [])
                fact_lower = fact.lower()

                # Check for duplicates
                existing = memory_service.search_memories(fact, limit=1)
                if existing and any(mem['fact'].lower() == fact_lower for mem in existing):
                    logger.info(f"Skipping duplicate memory: {fact}")
                    continue

                # Determine category
                category = MemoryCategory.GENERAL

                if any(word in fact_lower for word in ['like', 'love', 'prefer', 'favorite']) or 'preferences' in tags:
                    category = MemoryCategory.PREFERENCES
                elif any(word in fact_lower for word in ['work', 'job', 'company', 'project']) or 'work' in tags:
                    category = MemoryCategory.WORK
                elif any(word in fact_lower for word in ['live', 'home', 'address', 'city']) or 'location' in tags:
                    category = MemoryCategory.LOCATIONS
                elif any(word in fact_lower for word in ['goal', 'want to', 'plan to']) or 'goals' in tags:
                    category = MemoryCategory.GOALS
                elif any(word in fact_lower for word in ['routine', 'usually', 'always', 'every']) or 'routines' in tags:
                    category = MemoryCategory.ROUTINES

                # Determine importance
                importance = 5
                if any(word in fact_lower for word in ['name is', 'i am']) or 'name' in tags:
                    importance = 10
                elif category == MemoryCategory.PREFERENCES:
                    importance = 7
                elif category in [MemoryCategory.WORK, MemoryCategory.GOALS]:
                    importance = 8

                mem = Memory(
                    fact=fact,
                    source=MemorySource.CONVERSATION,
                    category=category,
                    importance=importance,
                    tags=tags
                )
                memory_service.save_memory(mem)
                logger.info(f"Saved memory: {fact} (tags: {', '.join(tags)})")

        except Exception as e:
            logger.error(f"Failed to save to memory: {e}")

    def _get_memory_context(self, user_message: str) -> str:
        """Get relevant memories for context using tag-based search"""
        try:
            from memory.service import memory_service

            # Search for relevant memories
            memories = memory_service.search_memories(user_message, limit=5)

            if not memories:
                # Get recent high-importance memories
                memories = memory_service.get_memories(min_importance=7, limit=3)

            if not memories:
                return ""

            # Deduplicate by fact content
            seen_facts = set()
            unique_memories = []
            for mem in memories:
                fact_lower = mem['fact'].lower()
                if fact_lower not in seen_facts:
                    seen_facts.add(fact_lower)
                    unique_memories.append(mem)

            context_parts = ["\n\n**Context from memory:**"]

            for mem in unique_memories[:5]:  # Max 5 memories
                context_parts.append(f"- {mem['fact']}")

            return "\n".join(context_parts)

        except Exception as e:
            logger.error(f"Failed to get memory context: {e}")
            return ""

    def _get_conversation_context(self, user_message: str) -> tuple[str, int]:
        """
        Get conversation context with automatic summarization

        Returns:
            (context_text, token_count)
        """
        try:
            from memory.service import memory_service

            # Get all conversation history
            conversations = memory_service.get_recent_conversations(limit=1000)

            if not conversations:
                return "", 0

            # Count tokens in full history
            total_tokens = token_counter.count_conversation(conversations)

            logger.info(f"Conversation history: {len(conversations)} messages, {total_tokens} tokens")

            # Check if we need to summarize
            if total_tokens > 20000:
                logger.info("Token limit exceeded! Triggering summarization...")

                # Summarize the conversation
                summary = conversation_summarizer.summarize_conversation(conversations)
                summary_tokens = token_counter.count_text(summary)

                # Save summary to database
                first_msg_id = conversations[0]['id']
                last_msg_id = conversations[-1]['id']
                memory_service.save_summary(
                    summary_text=summary,
                    messages_start_id=first_msg_id,
                    messages_end_id=last_msg_id,
                    message_count=len(conversations),
                    token_count=summary_tokens
                )

                logger.info(f"Summarized {len(conversations)} messages → {summary_tokens} tokens")

                # Archive old messages (keep in DB but mark as summarized)
                memory_service.archive_old_conversations(last_msg_id)

                return summary, summary_tokens
            else:
                # Use full history
                context = self._format_conversation_history(conversations)
                return context, total_tokens

        except Exception as e:
            logger.error(f"Failed to get conversation context: {e}")
            return "", 0

    def _format_conversation_history(self, conversations: list) -> str:
        """Format conversation history as text"""
        formatted = []
        for conv in conversations[-20:]:  # Last 20 messages
            formatted.append(f"User: {conv.get('user_message', '')}")
            formatted.append(f"Assistant: {conv.get('assistant_response', '')}")
        return "\n".join(formatted)

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

        # Get conversation history (with auto-summarization)
        conversation_context, conv_tokens = self._get_conversation_context(user_request)

        # Get memory context
        memory_context = self._get_memory_context(user_request)

        # Add memory context to request if available
        enhanced_request = user_request
        if memory_context:
            enhanced_request = f"{user_request}{memory_context}"

        # Step 1: Planning call
        tool_schemas = self.registry.get_tool_schemas()
        planning_result = self.llm.planning_call(
            user_request=enhanced_request,
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
            user_request=enhanced_request,
            tool_outputs=tool_outputs
        )

        # Save to memory (non-blocking)
        try:
            self._save_to_memory(user_request, final_response, tool_outputs)
        except Exception as e:
            logger.error(f"Memory save failed (non-critical): {e}")

        return {
            "request": user_request,
            "tool_calls": tool_calls,
            "tool_outputs": tool_outputs,
            "response": final_response
        }


# Global orchestrator instance
orchestrator = Orchestrator()