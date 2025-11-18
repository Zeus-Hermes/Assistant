"""
Configuration management for LifeOS
Loads environment variables and validates required API keys
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # LLM Settings
    groq_api_key: str
    groq_model: str = "llama-3.1-70b-versatile"

    # Tool API Keys
    google_maps_api_key: str  # Google Maps Platform (Weather + Places + Geocoding)
    serper_api_key: str  # For Google search
    news_api_key: str

    # Spotify OAuth
    spotify_client_id: str
    spotify_client_secret: str
    spotify_refresh_token: str

    # User Settings
    default_location: str = "McKinney, Texas"  # Default location for "near me" queries


    # Supabase (Memory System)
    supabase_url: str
    supabase_key: str
    # App Settings
    debug_mode: bool = True
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()


# Simple in-memory location context (Phase 4 will move to database)
class LocationContext:
    """Manages user's current location context"""

    def __init__(self):
        self.current_location = settings.default_location

    def set_location(self, location: str):
        """Update current location"""
        self.current_location = location

    def get_location(self) -> str:
        """Get current location"""
        return self.current_location

    def reset_to_default(self):
        """Reset to default location"""
        self.current_location = settings.default_location


# Global location context
location_context = LocationContext()