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

    def __init__(self, tools_dir: str = "tools"):
        self.tools_dir = Path(tools_dir)
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

                tool_name = manifest.get("name")
                if not tool_name:
                    logger.error(f"Tool {tool_dir.name} missing 'name' in manifest")
                    continue

                # Load Python module
                module_path = tool_dir / f"{tool_dir.name}.py"
                if not module_path.exists():
                    logger.error(f"Tool {tool_name} missing implementation file")
                    continue

                spec = importlib.util.spec_from_file_location(tool_name, module_path)
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)

                if not hasattr(module, 'execute'):
                    logger.error(f"Tool {tool_name} missing execute() function")
                    continue

                # Register tool
                self.tools[tool_name] = manifest
                self.tool_functions[tool_name] = module.execute

                logger.info(f"✅ Loaded tool: {tool_name} (v{manifest.get('version', '1.0')})")

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
