"""
Google Weather Tool
Fetches current conditions, hourly forecasts, and daily forecasts using Google Weather API
"""

import requests
from backend.config import settings
from backend.logger import logger


def geocode_location(location: str) -> dict:
    """
    Convert a location string to lat/long coordinates using Google Geocoding API

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


def get_current_conditions(lat: float, lng: float) -> dict:
    """
    Get current weather conditions

    Args:
        lat: Latitude
        lng: Longitude

    Returns:
        Current conditions data
    """
    api_key = settings.google_maps_api_key
    base_url = "https://weather.googleapis.com/v1/currentConditions:lookup"

    params = {
        "key": api_key,
        "location.latitude": lat,
        "location.longitude": lng,
        "unitsSystem": "IMPERIAL"  # Fahrenheit for US
    }

    logger.info(f"Fetching current conditions for: {lat}, {lng}")
    response = requests.get(base_url, params=params, timeout=10)
    response.raise_for_status()

    data = response.json()

    return {
        "temperature": data["temperature"]["degrees"],
        "feels_like": data["feelsLikeTemperature"]["degrees"],
        "condition": data["weatherCondition"]["description"]["text"],
        "humidity": data["relativeHumidity"],
        "wind_speed": data["wind"]["speed"]["value"],
        "wind_direction": data["wind"]["direction"]["cardinal"],
        "uv_index": data["uvIndex"],
        "visibility": data["visibility"]["distance"],
        "cloud_cover": data["cloudCover"],
        "precipitation_probability": data["precipitation"]["probability"]["percent"],
        "is_daytime": data["isDaytime"]
    }


def get_hourly_forecast(lat: float, lng: float, hours: int = 6) -> list:
    """
    Get hourly weather forecast

    Args:
        lat: Latitude
        lng: Longitude
        hours: Number of hours to forecast (1-240)

    Returns:
        List of hourly forecast dicts
    """
    api_key = settings.google_maps_api_key
    base_url = "https://weather.googleapis.com/v1/forecast/hours:lookup"

    params = {
        "key": api_key,
        "location.latitude": lat,
        "location.longitude": lng,
        "unitsSystem": "IMPERIAL",
        "hours": min(hours, 240)  # Max 240 hours
    }

    logger.info(f"Fetching {hours}h forecast for: {lat}, {lng}")
    response = requests.get(base_url, params=params, timeout=10)
    response.raise_for_status()

    data = response.json()

    hourly_data = []
    for hour in data.get("forecastHours", []):
        hourly_data.append({
            "time": hour["displayDateTime"],
            "temperature": hour["temperature"]["degrees"],
            "feels_like": hour["feelsLikeTemperature"]["degrees"],
            "condition": hour["weatherCondition"]["description"]["text"],
            "precipitation_probability": hour["precipitation"]["probability"]["percent"],
            "wind_speed": hour["wind"]["speed"]["value"],
            "humidity": hour["relativeHumidity"],
            "uv_index": hour["uvIndex"]
        })

    return hourly_data


def get_daily_forecast(lat: float, lng: float, days: int = 3) -> list:
    """
    Get daily weather forecast

    Args:
        lat: Latitude
        lng: Longitude
        days: Number of days to forecast (1-10)

    Returns:
        List of daily forecast dicts
    """
    api_key = settings.google_maps_api_key
    base_url = "https://weather.googleapis.com/v1/forecast/days:lookup"

    params = {
        "key": api_key,
        "location.latitude": lat,
        "location.longitude": lng,
        "unitsSystem": "IMPERIAL",
        "days": min(days, 10)  # Max 10 days
    }

    logger.info(f"Fetching {days}d forecast for: {lat}, {lng}")
    response = requests.get(base_url, params=params, timeout=10)
    response.raise_for_status()

    data = response.json()

    daily_data = []
    for day in data.get("forecastDays", []):
        daily_data.append({
            "date": day["displayDate"],
            "max_temp": day["maxTemperature"]["degrees"],
            "min_temp": day["minTemperature"]["degrees"],
            "daytime_condition": day["daytimeForecast"]["weatherCondition"]["description"]["text"],
            "nighttime_condition": day["nighttimeForecast"]["weatherCondition"]["description"]["text"],
            "precipitation_probability": day["daytimeForecast"]["precipitation"]["probability"]["percent"],
            "sunrise": day["sunEvents"]["sunriseTime"],
            "sunset": day["sunEvents"]["sunsetTime"]
        })

    return daily_data


def execute(arguments: dict) -> dict:
    """
    Main execution function for weather tool

    Args:
        arguments: Dict with location, forecast_type, hours, days

    Returns:
        Weather data based on forecast type
    """
    location = arguments.get("location")
    if not location:
        raise ValueError("Location is required")

    forecast_type = arguments.get("forecast_type", "current")
    hours = arguments.get("hours", 6)
    days = arguments.get("days", 3)

    # Geocode location to get coordinates
    geocode_result = geocode_location(location)
    lat = geocode_result["lat"]
    lng = geocode_result["lng"]
    formatted_address = geocode_result["formatted_address"]

    logger.info(f"Weather request for {formatted_address} (type: {forecast_type})")

    result = {
        "location": formatted_address,
        "forecast_type": forecast_type
    }

    # Fetch weather based on type
    if forecast_type == "current":
        result["current"] = get_current_conditions(lat, lng)

    elif forecast_type == "hourly":
        result["hourly_forecast"] = get_hourly_forecast(lat, lng, hours)

    elif forecast_type == "daily":
        result["daily_forecast"] = get_daily_forecast(lat, lng, days)

    else:
        raise ValueError(f"Invalid forecast_type: {forecast_type}")

    return result