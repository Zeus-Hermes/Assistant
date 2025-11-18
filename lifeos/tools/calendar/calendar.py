"""Google Calendar tools for LifeOS."""

from typing import Dict, Any, List

import requests
from backend.config import settings
from backend.logger import logger

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
CALENDAR_API_BASE = "https://www.googleapis.com/calendar/v3/calendars/primary"


def _get_access_token() -> str:
    if not settings.google_client_id or not settings.google_client_secret or not settings.google_refresh_token:
        raise ValueError("Google OAuth credentials are missing")

    payload = {
        "client_id": settings.google_client_id,
        "client_secret": settings.google_client_secret,
        "refresh_token": settings.google_refresh_token,
        "grant_type": "refresh_token"
    }

    response = requests.post(GOOGLE_TOKEN_URL, data=payload, timeout=10)
    response.raise_for_status()
    return response.json().get("access_token")


def _headers(token: str) -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "Content-Type": "application/json"
    }


def list_events(arguments: Dict[str, Any]) -> Dict[str, Any]:
    time_min = arguments.get("time_min")
    time_max = arguments.get("time_max")
    max_results = int(arguments.get("max_results", 10))

    if not time_min or not time_max:
        raise ValueError("time_min and time_max are required")

    try:
        token = _get_access_token()
        url = f"{CALENDAR_API_BASE}/events"
        params = {
            "timeMin": time_min,
            "timeMax": time_max,
            "maxResults": max_results,
            "singleEvents": True,
            "orderBy": "startTime"
        }
        response = requests.get(url, headers=_headers(token), params=params, timeout=10)
        response.raise_for_status()
        data = response.json()

        events: List[Dict[str, Any]] = []
        for item in data.get("items", []):
            events.append({
                "id": item.get("id"),
                "summary": item.get("summary"),
                "start": item.get("start"),
                "end": item.get("end"),
                "location": item.get("location"),
                "htmlLink": item.get("htmlLink")
            })

        return {"events": events}
    except Exception as e:
        logger.error(f"Failed to list events: {e}")
        raise


def create_event(arguments: Dict[str, Any]) -> Dict[str, Any]:
    title = arguments.get("title")
    datetime_start = arguments.get("datetime_start")
    datetime_end = arguments.get("datetime_end")
    description = arguments.get("description")
    location = arguments.get("location")

    if not title or not datetime_start or not datetime_end:
        raise ValueError("title, datetime_start, and datetime_end are required")

    try:
        token = _get_access_token()
        url = f"{CALENDAR_API_BASE}/events"
        body = {
            "summary": title,
            "description": description,
            "location": location,
            "start": {"dateTime": datetime_start},
            "end": {"dateTime": datetime_end}
        }

        response = requests.post(url, headers=_headers(token), json=body, timeout=10)
        response.raise_for_status()
        data = response.json()

        return {"event_id": data.get("id"), "html_link": data.get("htmlLink")}
    except Exception as e:
        logger.error(f"Failed to create event: {e}")
        raise


def delete_event(arguments: Dict[str, Any]) -> Dict[str, Any]:
    event_id = arguments.get("event_id")
    if not event_id:
        raise ValueError("event_id is required")

    try:
        token = _get_access_token()
        url = f"{CALENDAR_API_BASE}/events/{event_id}"
        response = requests.delete(url, headers=_headers(token), timeout=10)
        response.raise_for_status()
        return {"deleted": True}
    except Exception as e:
        logger.error(f"Failed to delete event {event_id}: {e}")
        raise
