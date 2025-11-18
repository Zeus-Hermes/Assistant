"""
Spotify Tool (Using Spotipy)
Control Spotify playback with proper argument handling
"""

import spotipy
from spotipy.oauth2 import SpotifyOAuth
from typing import Optional, Dict, Any
from backend.config import settings
from backend.logger import logger


def get_spotify_client():
    """Get authenticated Spotify client"""
    auth_manager = SpotifyOAuth(
        client_id=settings.spotify_client_id,
        client_secret=settings.spotify_client_secret,
        redirect_uri="https://example.com/callback",
        scope="user-read-playback-state user-modify-playback-state user-read-currently-playing",
        open_browser=False,
        cache_path=".spotify_cache"
    )

    return spotipy.Spotify(auth_manager=auth_manager)


# Global client
_spotify_client = None


def get_client():
    """Get or create Spotify client"""
    global _spotify_client
    if _spotify_client is None:
        _spotify_client = get_spotify_client()
    return _spotify_client


def play_music(query: str, content_type: Optional[str] = None) -> Dict[str, Any]:
    """Search for and play music on Spotify"""
    sp = get_client()

    if not content_type:
        if "playlist" in query.lower():
            content_type = "playlist"
        elif "album" in query.lower():
            content_type = "album"
        else:
            content_type = "track"

    logger.info(f"Playing: '{query}' (type: {content_type})")

    try:
        results = sp.search(q=query, type=content_type, limit=1)
        items_key = f"{content_type}s"
        items = results.get(items_key, {}).get("items", [])

        if not items:
            return {"success": False, "error": f"No {content_type} found for '{query}'"}

        item = items[0]
        uri = item["uri"]

        if content_type == "track":
            sp.start_playback(uris=[uri])
            return {
                "success": True,
                "action": "play",
                "playing": item["name"],
                "artist": item["artists"][0]["name"],
                "type": "track"
            }
        else:
            sp.start_playback(context_uri=uri)
            return {"success": True, "action": "play", "playing": item["name"], "type": content_type}

    except Exception as e:
        logger.error(f"Spotify play error: {e}")
        return {"success": False, "error": str(e)}


def pause_playback() -> Dict[str, Any]:
    """Pause Spotify playback"""
    try:
        get_client().pause_playback()
        return {"success": True, "action": "paused"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def resume_playback() -> Dict[str, Any]:
    """Resume Spotify playback"""
    try:
        get_client().start_playback()
        return {"success": True, "action": "resumed"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def skip_track() -> Dict[str, Any]:
    """Skip to next track"""
    try:
        get_client().next_track()
        return {"success": True, "action": "skipped_next"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def previous_track() -> Dict[str, Any]:
    """Go to previous track"""
    try:
        get_client().previous_track()
        return {"success": True, "action": "skipped_previous"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def set_volume(level: int) -> Dict[str, Any]:
    """Set volume level"""
    try:
        get_client().volume(max(0, min(100, level)))
        return {"success": True, "action": "volume_set", "volume": level}
    except Exception as e:
        return {"success": False, "error": str(e)}


def get_current_track() -> Dict[str, Any]:
    """Get currently playing track info"""
    try:
        playback = get_client().current_playback()

        if not playback or not playback.get("item"):
            return {"success": False, "error": "Nothing is currently playing"}

        track = playback["item"]
        return {
            "success": True,
            "action": "current_track",
            "track": track["name"],
            "artist": track["artists"][0]["name"],
            "album": track["album"]["name"],
            "is_playing": playback["is_playing"]
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


def execute(arguments: dict) -> dict:
    """Route to appropriate Spotify function"""

    action = arguments.get("action", "play")

    logger.info(f"Spotify action: {action}, args: {arguments}")

    try:
        if action == "play":
            query = arguments.get("query")
            if not query:
                return {"success": False, "error": "Query is required for play action"}
            return play_music(query, arguments.get("type"))
        elif action == "pause":
            return pause_playback()
        elif action == "resume":
            return resume_playback()
        elif action == "skip":
            return skip_track()
        elif action == "previous":
            return previous_track()
        elif action == "volume":
            volume_level = arguments.get("volume")
            if volume_level is None:
                return {"success": False, "error": "Volume level is required"}
            return set_volume(volume_level)
        elif action == "current_track":
            return get_current_track()
        else:
            return {"success": False, "error": f"Unknown action: {action}"}
    except Exception as e:
        logger.error(f"Spotify execute error: {e}")
        return {"success": False, "error": str(e)}
