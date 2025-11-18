"""Gmail tools for LifeOS."""

from typing import Dict, Any, List

import requests
from backend.config import settings
from backend.logger import logger

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me"


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
        "Accept": "application/json"
    }


def _fetch_message(token: str, message_id: str) -> Dict[str, Any]:
    url = f"{GMAIL_API_BASE}/messages/{message_id}"
    params = {"format": "metadata", "metadataHeaders": ["Subject", "From", "Date"]}
    response = requests.get(url, headers=_headers(token), params=params, timeout=10)
    response.raise_for_status()
    data = response.json()

    headers = {h.get("name"): h.get("value") for h in data.get("payload", {}).get("headers", [])}
    snippet = data.get("snippet", "")
    return {
        "id": data.get("id"),
        "subject": headers.get("Subject", "(no subject)"),
        "from": headers.get("From", ""),
        "date": headers.get("Date", ""),
        "snippet": snippet
    }


def get_recent_emails(arguments: Dict[str, Any]) -> Dict[str, Any]:
    max_results = int(arguments.get("max_results", 5))
    try:
        token = _get_access_token()
        list_url = f"{GMAIL_API_BASE}/messages"
        params = {"maxResults": max_results}
        response = requests.get(list_url, headers=_headers(token), params=params, timeout=10)
        response.raise_for_status()
        messages = response.json().get("messages", [])

        emails: List[Dict[str, Any]] = []
        for msg in messages:
            try:
                emails.append(_fetch_message(token, msg.get("id")))
            except Exception as inner_err:
                logger.error(f"Failed to fetch message {msg.get('id')}: {inner_err}")

        return {"emails": emails}
    except Exception as e:
        logger.error(f"Failed to retrieve recent emails: {e}")
        raise


def search_emails(arguments: Dict[str, Any]) -> Dict[str, Any]:
    query = arguments.get("query", "")
    max_results = int(arguments.get("max_results", 5))
    if not query:
        raise ValueError("query is required")

    try:
        token = _get_access_token()
        list_url = f"{GMAIL_API_BASE}/messages"
        params = {"q": query, "maxResults": max_results}
        response = requests.get(list_url, headers=_headers(token), params=params, timeout=10)
        response.raise_for_status()
        messages = response.json().get("messages", [])

        emails: List[Dict[str, Any]] = []
        for msg in messages:
            try:
                emails.append(_fetch_message(token, msg.get("id")))
            except Exception as inner_err:
                logger.error(f"Failed to fetch message {msg.get('id')}: {inner_err}")

        return {"emails": emails, "query": query}
    except Exception as e:
        logger.error(f"Failed to search emails: {e}")
        raise


def summarize_inbox(arguments: Dict[str, Any]) -> Dict[str, Any]:
    max_results = int(arguments.get("max_results", 10))
    try:
        recent = get_recent_emails({"max_results": max_results})
        emails = recent.get("emails", [])
        if not emails:
            return {"summary": "No emails found", "highlights": []}

        highlights = []
        for email in emails:
            highlights.append({
                "subject": email.get("subject"),
                "from": email.get("from"),
                "date": email.get("date"),
                "snippet": email.get("snippet")
            })

        summary_lines = [f"{item.get('from')}: {item.get('subject')}" for item in highlights]
        summary_text = "; ".join(summary_lines[:5])

        return {"summary": summary_text, "highlights": highlights}
    except Exception as e:
        logger.error(f"Failed to summarize inbox: {e}")
        raise
