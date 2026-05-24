# Pyla

AI context portability — capture conversations from ChatGPT, Claude, and Gemini as Capsules and inject them anywhere.

[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js-black?logo=next.js)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com)
[![Chrome MV3](https://img.shields.io/badge/Chrome-MV3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/)

## Features

- **Capture** — Extract conversation context from any supported AI platform with one click
- **Save as Capsule** — Store captured context in your personal library on the Pyla dashboard
- **Inject** — Push any Capsule into a new conversation via the dashboard or MCP server

## Supported Platforms

- ChatGPT
- Claude.ai
- Gemini

## Stack

| Layer | Technology |
|-------|-----------|
| Web dashboard | Next.js 14 |
| Database & auth | Supabase |
| Browser extension | WXT + React (Chrome MV3) |
| MCP server | Node.js |

## Getting Started

```bash
pnpm install
pnpm dev:web
```

Dashboard: [pyla-web.vercel.app](https://pyla-web.vercel.app)

## License

[AGPL v3](LICENSE) — free for open source use. A commercial license is available for proprietary/closed-source projects.

## Credits

Built on top of [CtxPort](https://github.com/nicepkg/ctxport) (MIT).
