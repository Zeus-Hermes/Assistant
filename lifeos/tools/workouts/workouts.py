"""Workout tool wrappers."""

from typing import Dict, Any

from lifeos.workouts.tracker import log_workout as tracker_log_workout, get_workout_summary as tracker_get_summary
from backend.logger import logger


def log_workout(arguments: Dict[str, Any]) -> Dict[str, Any]:
    try:
        return tracker_log_workout(arguments)
    except Exception as e:
        logger.error(f"Workout logging failed: {e}")
        raise


def get_workout_summary(arguments: Dict[str, Any]) -> Dict[str, Any]:
    try:
        return tracker_get_summary(arguments)
    except Exception as e:
        logger.error(f"Workout summary failed: {e}")
        raise
