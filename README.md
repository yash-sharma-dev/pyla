# Pyla

**Capture AI context from any tool. Inject it into any other. Never lose the thread.**

Pyla is a developer tool that turns AI conversations into portable, structured bundles called Capsules — captured from ChatGPT, Claude, Gemini, Cursor, or Gmail in one click, injected anywhere via MCP or the web dashboard. Context is work. Stop leaving it behind.

---

## Features

- **One-click capture** from ChatGPT, Claude, Gemini, DeepSeek, Grok, GitHub, and Gmail via Chrome extension (MV3)
- **Capsules** — structured bundles of goals, decisions, and full conversation history, not raw text
- **Version control** — every edit is snapshotted. Roll back, branch, or tag a golden prompt
- **Web dashboard** — search, filter, share, and manage Capsules with a full UI
- **MCP server** — first-class Cursor and Antigravity IDE integration via the Model Context Protocol
- **Team workspaces** — invite members by email, assign owner / editor / viewer roles, share org Capsules
- **Public links** — share any Capsule as a read-only URL

---

## How It Works

1. Open a conversation in any supported tool
2. Click the Pyla button in the Chrome extension — the conversation is parsed, structured, and saved as a Capsule to Supabase
3. Open Cursor (or any MCP client) and call `get_capsule` — full context is injected directly into your AI session
4. Or open the web dashboard to search, edit, share, or fork any Capsule

```
ChatGPT / Claude / Gmail
        │
   Chrome Extension  ──→  Supabase (Capsules)
                               │
                  ┌────────────┴────────────┐
             MCP Server              Web Dashboard
          (Cursor, IDE)           (manage / share)
```

---

## Getting Started

### 1. Install the Chrome extension

```bash
git clone https://github.com/yash-sharma-dev/pyla.git
cd pyla
pnpm install
pnpm build
```

Load the unpacked extension from `apps/browser-extension/dist/chrome-mv3` in `chrome://extensions`.

### 2. Set up Supabase

Create a project at [supabase.com](https://supabase.com), then run the migrations in order:

```bash
# In Supabase Dashboard → SQL Editor, run each file in order:
supabase/migrations/0001_capsules.sql
supabase/migrations/0002_api_keys.sql
supabase/migrations/0003_orgs.sql
```

Copy your project URL and anon key into `.env`:

```bash
cp .env.example .env
# Fill in NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 3. Self-Hosted (Docker) — optional

Spin up the **web dashboard** and **MCP server** locally with a single command. Supabase stays in the cloud — just pass your keys via `.env`.

**Prerequisites:** [Docker Desktop](https://docs.docker.com/get-docker/) (or Docker Engine + Compose plugin v2+).

```bash
git clone your-repo
cd pyla
cp .env.example .env  # add Supabase keys
docker compose up
```

To rebuild after code changes:

```bash
docker compose up --build --force-recreate
```

To stop all services:

```bash
docker compose down
```

#### Services

| Service      | URL / Transport       | Description                    |
| :----------- | :-------------------- | :----------------------------- |
| `web`        | http://localhost:3000 | Next.js dashboard              |
| `mcp-server` | stdio (see below)     | MCP server for Cursor / Claude |

#### Connecting your MCP client to the Docker container

The MCP server uses **stdio transport** (not HTTP). Point your MCP client at the running container:

**Cursor / Claude Desktop `mcp.json`:**

```json
{
  "mcpServers": {
    "pyla": {
      "command": "docker",
      "args": ["exec", "-i", "pyla-mcp-server", "node", "/app/dist/index.js"],
      "env": {}
    }
  }
}
```

> **Note:** The container must be running (`docker compose up -d`) before your MCP client connects.

### 4. Run the dashboard (dev mode)

```bash
pnpm dev:web
# → http://localhost:3010
```

### 5. Add the MCP server to Cursor

```bash
pnpm build:mcp
```

Add to your `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "pyla": {
      "command": "node",
      "args": ["/path/to/pyla/apps/mcp-server/dist/index.js"],
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_ANON_KEY": "your-anon-key",
        "PYLA_API_KEY": "your-api-key"
      }
    }
  }
}
```

Restart Cursor. You can now call Pyla tools in any AI session.

---

## MCP Tools

| Tool | Description |
|---|---|
| `list_capsules` | List recent Capsules, optionally filtered by tag or org |
| `get_capsule` | Fetch a single Capsule by ID — full goals, decisions, and conversation |
| `create_capsule` | Save a new Capsule programmatically |
| `search_capsules` | Full-text search across all your Capsules |

---

## Monorepo Structure

```
pyla/
  apps/
    browser-extension/   # WXT + React, Chrome MV3
    web/                 # Next.js 14 App Router dashboard
    mcp-server/          # Node.js MCP server
  packages/
    core-schema/         # ContentBundle Zod schemas
    core-plugins/        # Platform extractors (ChatGPT, Claude, Gmail, etc.)
    core-markdown/       # Capsule serializer
    supabase/            # Typed Supabase client + all CRUD functions
  supabase/
    migrations/          # SQL migration files
```

Built with pnpm workspaces + Turborepo. Each platform extractor is an isolated plugin — adding a new source means one new file in `core-plugins`.

---

## Tech Stack

- **Extension** — WXT, React 18, Chrome MV3
- **Dashboard** — Next.js 14 App Router, Tailwind CSS, shadcn/ui
- **Backend** — Supabase (Postgres + RLS + Auth)
- **MCP** — Node.js, `@modelcontextprotocol/sdk`
- **Monorepo** — pnpm, Turborepo, TypeScript throughout

---

## License

Proprietary. Copyright 2026 Yash Sharma. All rights reserved.
