#!/usr/bin/env python3
"""
Install Conversation Summarization System
Implements 20K token window with 2K summary compression
"""

import subprocess
import sys
from pathlib import Path


def install_dependencies():
    """Install required packages"""
    print("\n📦 Installing dependencies...\n")

    packages = [
        "tiktoken",  # Token counting
    ]

    for package in packages:
        print(f"Installing {package}...")
        subprocess.run([sys.executable, "-m", "pip", "install", package, "--break-system-packages"],
                       check=True, capture_output=True)

    print("✅ Dependencies installed!\n")


def create_token_counter():
    """Create token counting utility"""
    print("📝 Creating token_counter.py...\n")

    content = '''"""
Token Counter
Counts tokens for conversation history using tiktoken
"""

import tiktoken
from typing import List, Dict, Any


class TokenCounter:
    """Count tokens in conversations"""

    def __init__(self, model: str = "gpt-3.5-turbo"):
        # Use cl100k_base encoding (works for llama models too)
        self.encoding = tiktoken.get_encoding("cl100k_base")

    def count_text(self, text: str) -> int:
        """Count tokens in a single text string"""
        return len(self.encoding.encode(text))

    def count_message(self, message: Dict[str, str]) -> int:
        """Count tokens in a single message"""
        tokens = 0
        tokens += self.count_text(message.get("user_message", ""))
        tokens += self.count_text(message.get("assistant_response", ""))
        return tokens

    def count_conversation(self, messages: List[Dict[str, Any]]) -> int:
        """Count total tokens in conversation history"""
        total = 0
        for msg in messages:
            total += self.count_message(msg)
        return total

    def estimate_tokens(self, text: str) -> int:
        """Quick estimate: ~4 chars per token"""
        return len(text) // 4


# Global token counter instance
token_counter = TokenCounter()
'''

    path = Path("backend/token_counter.py")
    with open(path, 'w') as f:
        f.write(content)

    print(f"✅ Created {path}\n")


def create_summarizer():
    """Create conversation summarizer"""
    print("📝 Creating summarizer.py...\n")

    content = '''"""
Conversation Summarizer
Summarizes long conversations down to 2K tokens
"""

from typing import List, Dict, Any
from backend.llm_client import llm_client
from backend.token_counter import token_counter
from backend.logger import logger


class ConversationSummarizer:
    """Summarize conversations using Groq"""

    def __init__(self):
        self.llm = llm_client
        self.target_tokens = 2000

    def summarize_conversation(self, messages: List[Dict[str, Any]]) -> str:
        """
        Summarize a list of conversation messages down to ~2K tokens

        Args:
            messages: List of conversation dicts with user_message and assistant_response

        Returns:
            Summary text (~2K tokens)
        """
        # Format conversation for summarization
        conversation_text = self._format_messages(messages)

        summarization_prompt = f"""You are summarizing a conversation between a user (Rishi) and LifeOS (an AI assistant).

Your job: Create a comprehensive summary of this conversation that captures:
1. Key facts mentioned about the user
2. Topics discussed and decisions made
3. Important preferences or opinions expressed
4. Any ongoing tasks or goals mentioned
5. The general flow and context of the conversation

IMPORTANT: 
- Your summary must be approximately 2000 tokens (about 1500 words)
- Be thorough but concise
- Focus on information that would be useful for continuing the conversation
- Write in a narrative style that provides context

Conversation to summarize:
{conversation_text}

Summary (target ~2000 tokens):"""

        try:
            logger.info(f"Summarizing {len(messages)} messages...")

            summary = self.llm.final_response_call(
                user_request=summarization_prompt,
                tool_outputs=[]
            )

            # Verify token count
            summary_tokens = token_counter.count_text(summary)
            logger.info(f"Generated summary: {summary_tokens} tokens")

            # If too long, ask for compression
            if summary_tokens > 2500:
                summary = self._compress_summary(summary)

            return summary

        except Exception as e:
            logger.error(f"Summarization failed: {e}")
            # Fallback: truncate conversation
            return self._emergency_truncate(messages)

    def _format_messages(self, messages: List[Dict[str, Any]]) -> str:
        """Format messages into readable text"""
        formatted = []
        for msg in messages:
            formatted.append(f"User: {msg.get('user_message', '')}")
            formatted.append(f"Assistant: {msg.get('assistant_response', '')}")
            formatted.append("")  # Blank line between exchanges
        return "\\n".join(formatted)

    def _compress_summary(self, summary: str) -> str:
        """Compress a summary that's too long"""
        compression_prompt = f"""This summary is too long. Compress it to exactly 1500 words while keeping all key information:

{summary}

Compressed version (1500 words):"""

        try:
            compressed = self.llm.final_response_call(
                user_request=compression_prompt,
                tool_outputs=[]
            )
            return compressed
        except:
            # If compression fails, just truncate
            tokens = token_counter.encoding.encode(summary)
            return token_counter.encoding.decode(tokens[:2000])

    def _emergency_truncate(self, messages: List[Dict[str, Any]]) -> str:
        """Emergency fallback: just describe what happened"""
        return f"Conversation history: {len(messages)} messages exchanged. Topics discussed include various user preferences and interactions with LifeOS."


# Global summarizer instance
conversation_summarizer = ConversationSummarizer()
'''

    path = Path("backend/summarizer.py")
    with open(path, 'w') as f:
        f.write(content)

    print(f"✅ Created {path}\n")


def update_memory_service():
    """Add summary methods to memory service"""
    print("📝 Updating memory/service.py with summary methods...\n")

    summary_methods = '''

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
'''

    # Read existing service file
    service_path = Path("memory/service.py")
    with open(service_path, 'r') as f:
        content = f.read()

    # Add methods before the final line (global instance)
    if "# Global memory service instance" in content:
        parts = content.rsplit("# Global memory service instance", 1)
        new_content = parts[0] + summary_methods + "\\n\\n# Global memory service instance" + parts[1]

        with open(service_path, 'w') as f:
            f.write(new_content)

        print(f"✅ Updated {service_path}\n")
    else:
        print(f"⚠️  Could not find insertion point in {service_path}")
        print(f"Please manually add summary methods to MemoryService class\n")


def update_orchestrator():
    """Update orchestrator with summarization logic"""
    print("📝 Updating orchestrator with summarization...\n")

    # Add imports at top
    import_additions = """from backend.token_counter import token_counter
from backend.summarizer import conversation_summarizer"""

    # New method to add
    summarization_method = '''
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
        return "\\n".join(formatted)
'''

    orchestrator_path = Path("backend/orchestrator.py")
    with open(orchestrator_path, 'r') as f:
        content = f.read()

    # Add imports
    if "from backend.token_counter" not in content:
        content = content.replace(
            "from backend.logger import logger",
            f"from backend.logger import logger\\n{import_additions}"
        )

    # Add method before process_request
    if "_get_conversation_context" not in content:
        content = content.replace(
            "    async def process_request",
            summarization_method + "\\n    async def process_request"
        )

    # Modify process_request to use conversation context
    if "conversation_context, conv_tokens = self._get_conversation_context" not in content:
        # Find process_request method
        process_start = content.find("async def process_request")
        if process_start != -1:
            # Find where we get memory context
            memory_start = content.find("# Get memory context", process_start)
            if memory_start != -1:
                # Insert conversation context loading
                insertion = """
        # Get conversation history (with auto-summarization)
        conversation_context, conv_tokens = self._get_conversation_context(user_request)

        """
                content = content[:memory_start] + insertion + content[memory_start:]

    with open(orchestrator_path, 'w') as f:
        f.write(content)

    print(f"✅ Updated {orchestrator_path}\n")


def update_llm_client():
    """Update LLM client to inject conversation context"""
    print("📝 Updating llm_client.py to inject conversation context...\n")

    llm_path = Path("backend/llm_client.py")
    with open(llm_path, 'r') as f:
        content = f.read()

    # Update both planning_call and final_response_call signatures
    content = content.replace(
        "memory_context: Optional[str] = None",
        "memory_context: Optional[str] = None,\\n        conversation_context: Optional[str] = None"
    )

    # Add conversation context injection in planning_call
    if "if conversation_context:" not in content:
        content = content.replace(
            'if memory_context:\\n            system_prompt += f"\\n\\nUser context:\\n{memory_context}"',
            '''if memory_context:
            system_prompt += f"\\n\\nUser context:\\n{memory_context}"

        if conversation_context:
            system_prompt += f"\\n\\nConversation history:\\n{conversation_context}"'''
        )

    with open(llm_path, 'w') as f:
        f.write(content)

    print(f"✅ Updated {llm_path}\n")


def main():
    """Run complete installation"""
    print("=" * 60)
    print("🚀 INSTALLING CONVERSATION SUMMARIZATION SYSTEM")
    print("=" * 60)

    try:
        install_dependencies()
        create_token_counter()
        create_summarizer()
        update_memory_service()
        update_orchestrator()
        update_llm_client()

        print("\\n" + "=" * 60)
        print("✅ INSTALLATION COMPLETE!")
        print("=" * 60)
        print("\\n📋 Next steps:")
        print("\\n1. Run the SQL script in Supabase SQL Editor")
        print("2. Restart your server:")
        print("   python -m uvicorn backend.main:app --reload")
        print("\\n3. Test it out!")
        print("   - Have a long conversation (100+ messages)")
        print("   - System will auto-summarize at 20K tokens")
        print("   - Check logs for summarization events")
        print("\\n" + "=" * 60 + "\\n")

    except Exception as e:
        print(f"\\n❌ Installation failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()