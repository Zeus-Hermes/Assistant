"""
Tool Registry
Auto-discovers and loads tools from /tools directory
Each tool has a manifest.json and implementation
"""

import json
import importlib.util
from pathlib import Path
from typing import Dict, List, Any, Callable
from backend.logger import logger


class ToolRegistry:
    """Manages tool discovery, loading, and execution"""

    def __init__(self, tools_dir: str = None):
        if tools_dir:
            self.tools_dir = Path(tools_dir)
        else:
            self.tools_dir = Path(__file__).parent.parent / "tools"
        self.tools: Dict[str, Dict[str, Any]] = {}
        self.tool_functions: Dict[str, Callable] = {}

    def discover_tools(self):
        """
        Scan tools directory and load all valid tools
        Each tool must have:
        - manifest.json (metadata, schema)
        - {tool_name}.py (implementation with execute() function)
        """
        logger.info("Discovering tools...")

        if not self.tools_dir.exists():
            logger.warning(f"Tools directory not found: {self.tools_dir}")
            return

        for tool_dir in self.tools_dir.iterdir():
            if not tool_dir.is_dir():
                continue

            manifest_path = tool_dir / "manifest.json"
            if not manifest_path.exists():
                logger.warning(f"No manifest.json in {tool_dir.name}, skipping")
                continue

            try:
                # Load manifest
                with open(manifest_path, 'r') as f:
                    manifest = json.load(f)

                module_path = tool_dir / f"{tool_dir.name}.py"
                if not module_path.exists():
                    logger.error(f"Tool implementation missing for {tool_dir.name}")
                    continue

                spec = importlib.util.spec_from_file_location(tool_dir.name, module_path)
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)

                manifest_tools = manifest.get("tools")

                # Support legacy single-tool manifests
                if not manifest_tools:
                    manifest_tools = [{
                        "name": manifest.get("name"),
                        "description": manifest.get("description", ""),
                        "input_schema": manifest.get("input_schema", {}),
                        "output_schema": manifest.get("output_schema", {}),
                        "function": manifest.get("function", "execute"),
                        "version": manifest.get("version", "1.0")
                    }]

                for tool_entry in manifest_tools:
                    tool_name = tool_entry.get("name")
                    if not tool_name:
                        logger.error(f"Tool {tool_dir.name} missing 'name' in manifest entry")
                        continue

                    function_name = tool_entry.get("function") or tool_name.split(".")[-1]
                    if not hasattr(module, function_name):
                        logger.error(f"Tool {tool_name} missing handler '{function_name}'")
                        continue

                    handler = getattr(module, function_name)

                    self.tools[tool_name] = tool_entry
                    self.tool_functions[tool_name] = handler

                    logger.info(f"✅ Loaded tool: {tool_name} (v{tool_entry.get('version', manifest.get('version', '1.0'))})")

            except Exception as e:
                logger.error(f"Failed to load tool {tool_dir.name}: {e}")

    def get_tool_schemas(self) -> List[Dict[str, Any]]:
        """
        Get all tool schemas for LLM planning call

        Returns:
            List of tool schemas (name, description, input_schema)
        """
        schemas = []
        for tool_name, manifest in self.tools.items():
            schemas.append({
                "name": tool_name,
                "description": manifest.get("description", ""),
                "input_schema": manifest.get("input_schema", {}),
                "output_schema": manifest.get("output_schema", {})
            })
        return schemas

    def execute_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute a tool by name with given arguments

        Args:
            tool_name: Name of the tool (e.g., "weather.get_weather")
            arguments: Tool input parameters

        Returns:
            Tool output dict with status and data
        """
        logger.info(f"Executing tool: {tool_name} with args: {arguments}")

        if tool_name not in self.tool_functions:
            logger.error(f"Tool not found: {tool_name}")
            return {
                "success": False,
                "error": f"Tool {tool_name} not found",
                "data": None
            }

        try:
            result = self.tool_functions[tool_name](arguments)
            logger.info(f"Tool {tool_name} executed successfully")
            return {
                "success": True,
                "tool": tool_name,
                "data": result
            }
        except Exception as e:
            logger.error(f"Tool {tool_name} execution failed: {e}")
            return {
                "success": False,
                "tool": tool_name,
                "error": str(e),
                "data": None
            }


# Global registry instance
tool_registry = ToolRegistry()
