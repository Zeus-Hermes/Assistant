"""
Database Setup
Creates Supabase tables for memory system
"""

from supabase import create_client
from backend.config import settings


def setup_database():
    """Create all necessary tables in Supabase"""

    client = create_client(settings.supabase_url, settings.supabase_key)

    print("\n🗄️  Setting up Supabase database...\n")

    # Create memories table
    memories_sql = """
    CREATE TABLE IF NOT EXISTS memories (
        id UUID PRIMARY KEY,
        fact TEXT NOT NULL,
        source TEXT NOT NULL,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
        category TEXT NOT NULL,
        importance INTEGER NOT NULL CHECK (importance >= 1 AND importance <= 10),
        tags TEXT[] DEFAULT '{}',
        context TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_memories_category ON memories(category);
    CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories(importance DESC);
    CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_memories_tags ON memories USING GIN(tags);
    """

    # Create conversations table
    conversations_sql = """
    CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY,
        user_message TEXT NOT NULL,
        assistant_response TEXT NOT NULL,
        tool_calls JSONB DEFAULT '[]',
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_conversations_timestamp ON conversations(timestamp DESC);
    """

    # Create entities table
    entities_sql = """
    CREATE TABLE IF NOT EXISTS entities (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        context JSONB DEFAULT '{}',
        last_mentioned TIMESTAMP WITH TIME ZONE NOT NULL,
        mention_count INTEGER DEFAULT 1,
        UNIQUE(name, entity_type)
    );

    CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(entity_type);
    CREATE INDEX IF NOT EXISTS idx_entities_mentions ON entities(mention_count DESC);
    """

    try:
        # Execute SQL via Supabase SQL editor or use rpc
        print("⚠️  IMPORTANT: Run these SQL commands in Supabase SQL Editor:\n")
        print("="*60)
        print("\n1. Go to: https://supabase.com/dashboard/project/_/sql")
        print("\n2. Copy and paste this SQL:\n")
        print("="*60)
        print(memories_sql)
        print(conversations_sql)
        print(entities_sql)
        print("="*60)
        print("\n3. Click 'RUN' to create the tables\n")
        print("✅ After running SQL, your database is ready!\n")

    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    setup_database()
