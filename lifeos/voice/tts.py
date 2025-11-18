"""Text-to-speech utilities using ElevenLabs."""

import uuid
from pathlib import Path
from typing import Optional

import requests
from backend.config import settings
from backend.logger import logger


AUDIO_DIR = Path("/tmp/lifeos_audio")
AUDIO_DIR.mkdir(parents=True, exist_ok=True)


def generate_audio(text: str) -> Optional[str]:
    """Generate speech audio from text and return the file path."""
    if not settings.elevenlabs_api_key:
        logger.warning("ElevenLabs API key not configured; skipping TTS generation")
        return None

    if not text:
        return None

    try:
        url = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}".format(
            voice_id=settings.elevenlabs_voice_id
        )
        headers = {
            "xi-api-key": settings.elevenlabs_api_key,
            "Accept": "audio/mpeg",
            "Content-Type": "application/json"
        }
        payload = {
            "text": text,
            "model_id": "eleven_multilingual_v2",
            "voice_settings": {
                "stability": 0.4,
                "similarity_boost": 0.8
            }
        }

        response = requests.post(url, headers=headers, json=payload, timeout=30)
        response.raise_for_status()

        filename = AUDIO_DIR / f"lifeos-{uuid.uuid4()}.mp3"
        with open(filename, "wb") as audio_file:
            audio_file.write(response.content)

        logger.info(f"Generated audio file at {filename}")
        return str(filename)
    except Exception as e:
        logger.error(f"Failed to generate audio: {e}")
        return None
