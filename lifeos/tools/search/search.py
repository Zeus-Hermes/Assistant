"""
Internet Search Tool
Performs Google searches using Serper API
"""

import requests
from backend.config import settings
from backend.logger import logger


def execute(arguments: dict) -> dict:
    """
    Search Google for general information

    Args:
        arguments: Dict with 'query' and optional 'num_results'

    Returns:
        Dict with search results
    """
    query = arguments.get("query")
    if not query:
        raise ValueError("Query is required")

    num_results = arguments.get("num_results", 5)

    logger.info(f"Searching Google for: {query}")

    api_key = settings.serper_api_key
    url = "https://google.serper.dev/search"

    headers = {
        "X-API-KEY": api_key,
        "Content-Type": "application/json"
    }

    payload = {
        "q": query,
        "num": num_results
    }

    response = requests.post(url, json=payload, headers=headers, timeout=10)
    response.raise_for_status()

    data = response.json()
    organic_results = data.get("organic", [])

    return {
        "query": query,
        "results": [
            {
                "title": result.get("title", ""),
                "snippet": result.get("snippet", ""),
                "url": result.get("link", "")
            }
            for result in organic_results[:num_results]
        ]
    }
