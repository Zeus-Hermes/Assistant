"""Workout tracking with Supabase storage and simple pattern recognition."""

from collections import Counter
from datetime import datetime
from typing import Dict, Any, List, Optional
from uuid import uuid4

import requests
from backend.config import settings
from backend.logger import logger


class WorkoutTracker:
    """Persist workouts and surface recurring patterns."""

    def __init__(self):
        self.base_url = f"{settings.supabase_url}/rest/v1"
        self.headers = {
            "apikey": settings.supabase_key,
            "Authorization": f"Bearer {settings.supabase_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

    def log_workout(self, workout_type: str, duration_minutes: Optional[int] = None,
                    intensity: Optional[str] = None, notes: Optional[str] = None,
                    occurred_at: Optional[str] = None) -> Dict[str, Any]:
        payload = {
            "id": str(uuid4()),
            "workout_type": workout_type,
            "duration_minutes": duration_minutes,
            "intensity": intensity,
            "notes": notes,
            "occurred_at": occurred_at or datetime.utcnow().isoformat()
        }

        try:
            url = f"{self.base_url}/workouts"
            response = requests.post(url, headers=self.headers, json=payload, timeout=10)
            response.raise_for_status()
            logger.info(f"Logged workout: {workout_type}")
            return payload
        except Exception as e:
            logger.error(f"Failed to log workout: {e}")
            raise

    def _fetch_recent(self, limit: int = 20) -> List[Dict[str, Any]]:
        try:
            url = f"{self.base_url}/workouts"
            params = {
                "order": "occurred_at.desc",
                "limit": str(limit)
            }
            response = requests.get(url, headers=self.headers, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            return data if isinstance(data, list) else []
        except Exception as e:
            logger.error(f"Failed to fetch workouts: {e}")
            return []

    def _detect_patterns(self, workouts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        if not workouts:
            return []

        counts = Counter([w.get("workout_type") for w in workouts if w.get("workout_type")])
        patterns = []
        for workout_type, count in counts.most_common(5):
            patterns.append({
                "workout_type": workout_type,
                "occurrences": count,
                "recent_note": next((w.get("notes") for w in workouts if w.get("workout_type") == workout_type and w.get("notes")), None)
            })
        return patterns

    def get_summary(self, limit: int = 20) -> Dict[str, Any]:
        workouts = self._fetch_recent(limit)
        patterns = self._detect_patterns(workouts)

        total_duration = sum([w.get("duration_minutes") or 0 for w in workouts])
        return {
            "recent_workouts": workouts,
            "patterns": patterns,
            "total_duration_minutes": total_duration
        }


def log_workout(arguments: Dict[str, Any]) -> Dict[str, Any]:
    tracker = WorkoutTracker()
    workout_type = arguments.get("workout_type")
    if not workout_type:
        raise ValueError("workout_type is required")

    return tracker.log_workout(
        workout_type=workout_type,
        duration_minutes=arguments.get("duration_minutes"),
        intensity=arguments.get("intensity"),
        notes=arguments.get("notes"),
        occurred_at=arguments.get("occurred_at")
    )


def get_workout_summary(arguments: Dict[str, Any]) -> Dict[str, Any]:
    tracker = WorkoutTracker()
    limit = int(arguments.get("limit", 20))
    return tracker.get_summary(limit)
