"""
Unit tests for orchestrator
Run with: pytest tests/
"""

import pytest
from backend.orchestrator import Orchestrator


@pytest.mark.asyncio
async def test_orchestrator_basic():
    """Test basic orchestrator flow"""
    orchestrator = Orchestrator()
    result = await orchestrator.process_request("What's the weather in Dallas?")

    assert "response" in result
    assert "tool_calls" in result
    assert isinstance(result["response"], str)


# Add more tests as you build features
