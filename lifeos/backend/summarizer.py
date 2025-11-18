"""
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
        return "\n".join(formatted)

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
