"""
Memory Models
Data structures for memory system based on Swift architecture
"""

from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from uuid import UUID, uuid4


class MemorySource(str, Enum):
    """Source of memory information"""
    CONVERSATION = "conversation"
    USER_PROVIDED = "user_provided"
    INFERRED = "inferred"


class MemoryCategory(str, Enum):
    """Category of memory"""
    GENERAL = "general"
    PREFERENCES = "preferences"
    RELATIONSHIPS = "relationships"
    WORK = "work"
    HEALTH = "health"
    GOALS = "goals"
    ROUTINES = "routines"
    LOCATIONS = "locations"


class Memory(BaseModel):
    """Core memory model"""
    id: UUID = Field(default_factory=uuid4)
    fact: str = Field(..., description="The actual memory content")
    source: MemorySource = Field(default=MemorySource.CONVERSATION)
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    category: MemoryCategory = Field(default=MemoryCategory.GENERAL)
    importance: int = Field(default=5, ge=1, le=10, description="Priority 1-10")
    tags: List[str] = Field(default_factory=list)
    context: Optional[str] = Field(default=None, description="Additional context")

    class Config:
        use_enum_values = True


class ConversationMemory(BaseModel):
    """Conversation history for context"""
    id: UUID = Field(default_factory=uuid4)
    user_message: str
    assistant_response: str
    tool_calls: List[Dict[str, Any]] = Field(default_factory=list)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class Entity(BaseModel):
    """Named entities (people, places, things)"""
    id: UUID = Field(default_factory=uuid4)
    name: str
    entity_type: str  # person, place, thing, event
    context: Dict[str, Any] = Field(default_factory=dict)
    last_mentioned: datetime = Field(default_factory=datetime.utcnow)
    mention_count: int = Field(default=1)
