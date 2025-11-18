"""
News Tool
Fetches top news headlines using NewsAPI
"""

import requests
from backend.config import settings
from backend.logger import logger


def execute(arguments: dict) -> dict:
    """
    Get top news headlines

    Args:
        arguments: Dict with optional 'query', 'category', 'limit' keys

    Returns:
        Dict with list of news articles
    """
    query = arguments.get("query")
    category = arguments.get("category")
    limit = arguments.get("limit", 5)

    api_key = settings.news_api_key

    if query:
        # Search for specific topics
        url = "https://newsapi.org/v2/everything"
        params = {
            "q": query,
            "apiKey": api_key,
            "pageSize": limit,
            "language": "en",
            "sortBy": "publishedAt"
        }
        logger.info(f"Searching news for: {query}")
    else:
        # Get top headlines
        url = "https://newsapi.org/v2/top-headlines"
        params = {
            "apiKey": api_key,
            "pageSize": limit,
            "country": "us"
        }
        if category:
            params["category"] = category
        logger.info(f"Fetching top headlines (category: {category or 'general'})")

    response = requests.get(url, params=params, timeout=10)
    response.raise_for_status()

    data = response.json()
    articles = data.get("articles", [])

    return {
        "articles": [
            {
                "title": article["title"],
                "description": article.get("description", "No description"),
                "source": article["source"]["name"],
                "url": article["url"]
            }
            for article in articles[:limit]
        ]
    }
