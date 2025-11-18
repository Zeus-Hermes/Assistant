"""
LLM Client for Groq API
Handles two-step pattern: planning call + final response call
"""

import json
from typing import Dict, List, Any, Optional
from groq import Groq
from backend.config import settings
from backend.logger import logger


class LLMClient:
    """Wrapper for Groq API with planning and response calls"""

    def __init__(self):
        self.client = Groq(api_key=settings.groq_api_key)
        self.model = settings.groq_model

    def planning_call(
        self,
        user_request: str,
        tool_schemas: List[Dict[str, Any]],
        memory_context: Optional[str] = None,
            conversation_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Step 1: Planning call to select tools

        Args:
            user_request: User's natural language request
            tool_schemas: List of available tool schemas
            memory_context: Optional memory/preferences context

        Returns:
            Parsed JSON with tool_calls list
        """

        system_prompt = """You are the planning brain of LifeOS, a personal AI assistant.

Your job: Analyze the user's request and decide which tools to call WITH THE CORRECT ARGUMENTS.

Available tools:
{tools}

CRITICAL WEATHER TOOL USAGE:
- For "what's the weather" or "current weather" → Use forecast_type: "current"
- For "hourly forecast" or "next X hours" → Use forecast_type: "hourly" with hours: X
- For "5-day forecast" or "daily forecast" or "forecast for the week" → Use forecast_type: "daily" with days: X

Examples:
- "What's the weather in Dallas?" → {{"name": "weather.get_weather", "arguments": {{"location": "Dallas"}}}}
- "Hourly forecast for next 12 hours" → {{"name": "weather.get_weather", "arguments": {{"location": "Dallas", "forecast_type": "hourly", "hours": 12}}}}
- "5-day forecast for McKinney" → {{"name": "weather.get_weather", "arguments": {{"location": "McKinney", "forecast_type": "daily", "days": 5}}}}

Rules:
1. Return ONLY valid JSON, no other text
2. Format: {{"tool_calls": [{{"name": "tool_name", "arguments": {{...}}}}]}}
3. If no tools needed, return: {{"tool_calls": []}}
4. You can call multiple tools in sequence
5. Be precise with tool names and arguments
6. PAY ATTENTION TO FORECAST_TYPE for weather queries

Response format:
{{"tool_calls": [{{"name": "tool.function", "arguments": {{"key": "value"}}}}]}}
"""

        tools_formatted = json.dumps(tool_schemas, indent=2)
        system_prompt = system_prompt.format(tools=tools_formatted)

        if memory_context:
            system_prompt += f"\n\nUser context:\n{memory_context}"

        logger.info(f"Planning call for request: {user_request}")

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_request}
                ],
                temperature=0.1,  # Low temp for structured output
                max_tokens=1000
            )

            response_text = response.choices[0].message.content.strip()
            logger.debug(f"Planning response: {response_text}")

            # Parse JSON
            parsed = json.loads(response_text)
            logger.info(f"Planned tool calls: {parsed.get('tool_calls', [])}")

            return parsed

        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON from planning call: {e}")
            return {"tool_calls": []}
        except Exception as e:
            logger.error(f"Planning call failed: {e}")
            return {"tool_calls": []}

    def final_response_call(
        self,
        user_request: str,
        tool_outputs: List[Dict[str, Any]],
        memory_context: Optional[str] = None,
            conversation_context: Optional[str] = None
    ) -> str:
        """
        Step 2: Final response generation with tool outputs

        Args:
            user_request: Original user request
            tool_outputs: Results from executed tools
            memory_context: Optional memory/preferences

        Returns:
            Natural language response
        """

        system_prompt = """You are LifeOS, a charming, helpful AI assistant with a WALL-E-like personality.

Personality traits:
- Warm, friendly, slightly playful
- Concise but not robotic
- Use natural language, avoid being too formal
- Occasionally use light humor when appropriate

Your job: Synthesize the tool outputs into a helpful, natural response.

Tool outputs:
{tool_outputs}

Rules:
1. Be conversational and helpful
2. Synthesize multiple tool outputs smoothly
3. If a tool failed, acknowledge it gracefully
4. Keep responses concise unless detail is needed
5. For weather forecasts, summarize the data in a human-friendly way
"""

        tools_formatted = json.dumps(tool_outputs, indent=2)
        system_prompt = system_prompt.format(tool_outputs=tools_formatted)

        if memory_context:
            system_prompt += f"\n\nUser context:\n{memory_context}"

        logger.info("Generating final response")

        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_request}
                ],
                temperature=0.7,  # Higher temp for natural responses
                max_tokens=500
            )

            final_text = response.choices[0].message.content.strip()
            logger.info(f"Final response generated: {final_text[:100]}...")

            return final_text

        except Exception as e:
            logger.error(f"Final response call failed: {e}")
            return "Sorry, I'm having trouble formulating a response right now."


# Global client instance
llm_client = LLMClient()