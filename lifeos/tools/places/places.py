"""
Google Places API Tool
Search for nearby places like restaurants, coffee shops, gas stations, etc.
"""

import requests
from typing import Optional
from backend.config import settings
from backend.logger import logger


def geocode_location(location: str) -> dict:
    """
    Convert a location string to lat/long coordinates

    Args:
        location: City name, address, or location string

    Returns:
        Dict with 'lat', 'lng', and 'formatted_address'
    """
    api_key = settings.google_maps_api_key
    base_url = "https://maps.googleapis.com/maps/api/geocode/json"

    params = {
        "address": location,
        "key": api_key
    }

    logger.info(f"Geocoding location: {location}")
    response = requests.get(base_url, params=params, timeout=10)
    response.raise_for_status()

    data = response.json()

    if data["status"] != "OK" or not data.get("results"):
        raise ValueError(f"Could not geocode location: {location}")

    result = data["results"][0]
    coords = result["geometry"]["location"]

    return {
        "lat": coords["lat"],
        "lng": coords["lng"],
        "formatted_address": result["formatted_address"]
    }


def search_nearby_places(
        query: str,
        latitude: float,
        longitude: float,
        radius: int = 5000,
        place_type: Optional[str] = None,
        open_now: Optional[bool] = None,
        min_rating: Optional[float] = None,
        max_results: int = 5
) -> list:
    """
    Search for places near a location using Google Places API

    Args:
        query: Search query/keyword
        latitude: Center point latitude
        longitude: Center point longitude
        radius: Search radius in meters
        place_type: Optional place type filter
        open_now: Filter for currently open places
        min_rating: Minimum rating filter
        max_results: Max number of results to return

    Returns:
        List of place dicts with details
    """
    api_key = settings.google_maps_api_key

    # Use Text Search API for more flexible queries
    base_url = "https://maps.googleapis.com/maps/api/place/textsearch/json"

    params = {
        "query": query,
        "location": f"{latitude},{longitude}",
        "radius": min(radius, 50000),  # Max 50km
        "key": api_key
    }

    if place_type:
        params["type"] = place_type

    if open_now:
        params["opennow"] = "true"

    logger.info(f"Searching places: query='{query}', location=({latitude},{longitude}), radius={radius}m")

    response = requests.get(base_url, params=params, timeout=10)
    response.raise_for_status()

    data = response.json()

    if data["status"] not in ["OK", "ZERO_RESULTS"]:
        raise ValueError(f"Places API error: {data.get('status')} - {data.get('error_message', '')}")

    results = []
    for place in data.get("results", [])[:max_results * 2]:  # Get more to filter
        # Apply rating filter if specified
        rating = place.get("rating", 0)
        if min_rating and rating < min_rating:
            continue

        # Calculate distance (approximate)
        place_lat = place["geometry"]["location"]["lat"]
        place_lng = place["geometry"]["location"]["lng"]
        distance = calculate_distance(latitude, longitude, place_lat, place_lng)

        place_info = {
            "name": place.get("name"),
            "address": place.get("formatted_address"),
            "rating": rating,
            "user_ratings_total": place.get("user_ratings_total", 0),
            "price_level": get_price_level(place.get("price_level")),
            "open_now": place.get("opening_hours", {}).get("open_now"),
            "distance_meters": round(distance),
            "distance_miles": round(distance / 1609.34, 2),
            "types": place.get("types", []),
            "place_id": place.get("place_id")
        }

        results.append(place_info)

        if len(results) >= max_results:
            break

    # Sort by distance
    results.sort(key=lambda x: x["distance_meters"])

    return results


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate approximate distance between two coordinates in meters
    Uses Haversine formula
    """
    from math import radians, sin, cos, sqrt, atan2

    R = 6371000  # Earth radius in meters

    lat1_rad = radians(lat1)
    lat2_rad = radians(lat2)
    delta_lat = radians(lat2 - lat1)
    delta_lon = radians(lon2 - lon1)

    a = sin(delta_lat / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))

    return R * c


def get_price_level(level: Optional[int]) -> str:
    """Convert numeric price level to string representation"""
    if level is None:
        return "Unknown"

    price_map = {
        0: "Free",
        1: "$",
        2: "$$",
        3: "$$$",
        4: "$$$$"
    }

    return price_map.get(level, "Unknown")


def execute(arguments: dict) -> dict:
    """
    Main execution function for places search

    Args:
        arguments: Dict with query, location, radius, type, filters

    Returns:
        Search results with place details
    """
    query = arguments.get("query")
    if not query:
        raise ValueError("Query is required")

    location = arguments.get("location", "McKinney, Texas")  # Default user location
    radius = arguments.get("radius", 5000)
    place_type = arguments.get("type")
    open_now = arguments.get("open_now")
    min_rating = arguments.get("min_rating")
    max_results = arguments.get("max_results", 5)

    # Geocode location
    geocode_result = geocode_location(location)
    lat = geocode_result["lat"]
    lng = geocode_result["lng"]
    formatted_address = geocode_result["formatted_address"]

    logger.info(f"Places search: '{query}' near {formatted_address}")

    # Search places
    places = search_nearby_places(
        query=query,
        latitude=lat,
        longitude=lng,
        radius=radius,
        place_type=place_type,
        open_now=open_now,
        min_rating=min_rating,
        max_results=max_results
    )

    return {
        "query": query,
        "location": formatted_address,
        "radius_meters": radius,
        "radius_miles": round(radius / 1609.34, 2),
        "results_count": len(places),
        "results": places
    }