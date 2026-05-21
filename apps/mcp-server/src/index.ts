#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { createSupabaseClient, listCapsules, getCapsule } from "@pyla/supabase";
import { serializeConversation } from "@pyla/core-markdown";
import * as dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// When built, this file is in apps/mcp-server/dist/index.js
// We need to go up to the workspace root: dist -> mcp-server -> apps -> ctxport
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

import { createHash } from "crypto";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const API_KEY = process.env.PYLA_API_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing Supabase URL or Anon Key in environment variables.");
  process.exit(1);
}

if (!API_KEY) {
  console.error("Missing PYLA_API_KEY in environment variables. Please provide it in your MCP configuration.");
  process.exit(1);
}

// Hash the API key JS-side so we don't rely on pgcrypto in Postgres
const keyHash = createHash("sha256").update(API_KEY).digest("hex");

/**
 * Instantiate the stateless Supabase client using the custom API Key header.
 * Authentication relies strictly on the `x-pyla-api-key` header and RLS policies.
 */
const supabase = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  apiKey: keyHash,
});

class PylaMcpServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: "pyla-mcp-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "list_capsules",
          description: "Returns a list of all available Pyla Capsules for the authenticated user.",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_capsule",
          description: "Fetches metadata for a single Pyla Capsule by its ID.",
          inputSchema: {
            type: "object",
            properties: {
              capsuleId: {
                type: "string",
                description: "The UUID of the Capsule to fetch",
              },
            },
            required: ["capsuleId"],
          },
        },
        {
          name: "inject_capsule",
          description: "Retrieves the full content of a Capsule formatted as Markdown, ready to be injected into an AI's context.",
          inputSchema: {
            type: "object",
            properties: {
              capsuleId: {
                type: "string",
                description: "The UUID of the Capsule to inject",
              },
            },
            required: ["capsuleId"],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case "list_capsules":
          return this.handleListCapsules();
        case "get_capsule":
          return this.handleGetCapsule(request.params.arguments);
        case "inject_capsule":
          return this.handleInjectCapsule(request.params.arguments);
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  private async handleListCapsules() {
    try {
      const capsules = await listCapsules(supabase);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              capsules.map(c => ({ id: c.id, title: c.title, tags: c.tags, updated_at: c.updated_at })), 
              null, 
              2
            ),
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to list capsules: ${error}`);
    }
  }

  private async handleGetCapsule(args: any) {
    const { capsuleId } = args;
    if (!capsuleId || typeof capsuleId !== "string") {
      throw new McpError(ErrorCode.InvalidParams, "capsuleId is required and must be a string");
    }

    try {
      const capsule = await getCapsule(supabase, capsuleId);
      if (!capsule) {
        throw new McpError(ErrorCode.InvalidRequest, `Capsule not found: ${capsuleId}`);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              id: capsule.id,
              title: capsule.title,
              tags: capsule.tags,
              goals: capsule.goals,
              decisions: capsule.decisions,
              updated_at: capsule.updated_at,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to get capsule: ${error}`);
    }
  }

  private async handleInjectCapsule(args: any) {
    const { capsuleId } = args;
    if (!capsuleId || typeof capsuleId !== "string") {
      throw new McpError(ErrorCode.InvalidParams, "capsuleId is required and must be a string");
    }

    try {
      const capsule = await getCapsule(supabase, capsuleId);
      if (!capsule) {
        throw new McpError(ErrorCode.InvalidRequest, `Capsule not found: ${capsuleId}`);
      }

      // Format the capsule messages using our shared core-markdown serializer
      const markdownContent = serializeConversation(capsule.messages, { format: "full" });
      
      return {
        content: [
          {
            type: "text",
            text: `Here is the context from the Pyla Capsule "${capsule.title}":\n\n${markdownContent}`,
          },
        ],
      };
    } catch (error) {
      throw new McpError(ErrorCode.InternalError, `Failed to inject capsule: ${error}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Pyla MCP server running on stdio");
  }
}

const server = new PylaMcpServer();
server.run().catch(console.error);
