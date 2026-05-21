# Pyla MCP Server

The Pyla MCP (Model Context Protocol) Server allows local AI tools like **Cursor**, **Antigravity**, and **Claude Desktop** to list and inject your saved AI conversation context directly into your workspace.

## Configuration

To use the Pyla MCP Server, you need:
1. The absolute path to this repository.
2. A **Pyla API Key** generated from your dashboard.

### Cursor `mcp.json`

Create or edit your `.cursor/mcp.json` (or go to Cursor Settings -> Features -> MCP Servers):

```json
{
  "mcpServers": {
    "pyla": {
      "command": "node",
      "args": ["/absolute/path/to/pyla/ctxport/apps/mcp-server/dist/index.js"],
      "env": {
        "PYLA_API_KEY": "your_api_key_here",
        "VITE_SUPABASE_URL": "https://kpqnovyubguuqaylsgrf.supabase.co",
        "VITE_SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    }
  }
}
```

### Antigravity & Claude Desktop

Add this configuration to your MCP config file (e.g., `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "pyla": {
      "command": "node",
      "args": ["/absolute/path/to/pyla/ctxport/apps/mcp-server/dist/index.js"],
      "env": {
        "PYLA_API_KEY": "your_api_key_here",
        "VITE_SUPABASE_URL": "https://kpqnovyubguuqaylsgrf.supabase.co",
        "VITE_SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
      }
    }
  }
}
```

## Available Tools

- `list_capsules`: Returns a list of all available Pyla Capsules for the authenticated user.
- `get_capsule`: Fetches metadata for a single Pyla Capsule by its ID.
- `inject_capsule`: Retrieves the full context of a Capsule formatted as Markdown.

## Development

Run the server via inspector locally for debugging:

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```
