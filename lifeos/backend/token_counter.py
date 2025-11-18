"""
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
