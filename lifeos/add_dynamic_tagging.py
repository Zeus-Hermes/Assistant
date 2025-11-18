#!/usr/bin/env python3
"""
Update Orchestrator with Dynamic Tagging
Groq generates tags for each memory automatically
"""

from pathlib import Path


def update_orchestrator_with_tagging():
    """Add dynamic tagging to memory system"""

    print("\n🏷️  Adding Dynamic Tagging to Memory System\n")
    print("=" * 60)

    orchestrator_path = Path("backend/orchestrator.py")

    if not orchestrator_path.exists():
        print(f"❌ Could not find {orchestrator_path}")
        return

    with open(orchestrator_path, 'r') as f:
        content = f.read()

    # Backup
    backup_path = Path("backend/orchestrator.py.backup2")
    with open(backup_path, 'w') as f:
        f.write(content)
    print(f"✅ Backed up to {backup_path}")

    # New extraction method with tagging
    new_extract_memories = '''    def _extract_memories(self, user_message: str, assistant_response: str) -> list:
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
            json_match = re.search(r'\\[.*\\]', response, re.DOTALL)
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
            return []'''

    # New save method that handles tags
    new_save_to_memory = '''    def _save_to_memory(self, user_message: str, assistant_response: str, tool_calls: list):
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
            logger.error(f"Failed to save to memory: {e}")'''

    # Enhanced search method
    new_get_memory_context = '''    def _get_memory_context(self, user_message: str) -> str:
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

            context_parts = ["\\n\\n**Context from memory:**"]
            for mem in unique_memories[:5]:  # Max 5 memories
                context_parts.append(f"- {mem['fact']}")

            return "\\n".join(context_parts)
        except Exception as e:
            logger.error(f"Failed to get memory context: {e}")
            return ""'''

    # Replace methods
    import re

    # Replace _extract_memories
    extract_pattern = r'    def _extract_memories\(self.*?\n(?=    def |    async def |\Z)'
    content = re.sub(extract_pattern, new_extract_memories + '\n\n', content, flags=re.DOTALL)

    # Replace _save_to_memory
    save_pattern = r'    def _save_to_memory\(self.*?\n(?=    def |    async def |\Z)'
    content = re.sub(save_pattern, new_save_to_memory + '\n\n', content, flags=re.DOTALL)

    # Replace _get_memory_context
    context_pattern = r'    def _get_memory_context\(self.*?\n(?=    def |    async def |\Z)'
    content = re.sub(context_pattern, new_get_memory_context + '\n\n', content, flags=re.DOTALL)

    # Write back
    with open(orchestrator_path, 'w') as f:
        f.write(content)

    print("✅ Successfully added dynamic tagging!")
    print("\n" + "=" * 60)
    print("Changes made:")
    print("=" * 60)
    print("✅ Updated _extract_memories() - now generates tags with Groq")
    print("✅ Updated _save_to_memory() - saves tags and checks duplicates")
    print("✅ Updated _get_memory_context() - deduplicates memories")
    print("\n" + "=" * 60)
    print("\n🔄 Restart your server to test!")
    print("   python -m uvicorn backend.main:app --reload")
    print("\n" + "=" * 60 + "\n")


if __name__ == "__main__":
    update_orchestrator_with_tagging()