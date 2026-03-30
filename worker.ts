import { createMcpHandler } from "agents/mcp";
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import html from "./dist/mcp-app.html";

function createServer(): McpServer {
  const server = new McpServer({
    name: "Pronounce",
    version: "1.0.0",
  });

  const resourceUri = "ui://pronounce/mcp-app.html";

  registerAppTool(server,
    "pronounce",
    {
      title: "Pronounce",
      description:
        "Pronounce words aloud. Renders a compact inline list of words, each with a small " +
        "play button. Use when the user asks to hear how words are pronounced, says " +
        "\"pronounce ...\", \"how do you say ...\", or during language learning. " +
        "The language tag must match the language the words are written in.",
      inputSchema: {
        words: z.string().describe("Comma-separated words or phrases to pronounce"),
        language: z.string().describe("BCP 47 language tag (e.g. fr-FR, ja-JP, en-US)"),
      },
      _meta: { ui: { resourceUri } },
    },
    async ({ words, language }: { words: string; language: string }): Promise<CallToolResult> => {
      const list = words.split(",").map((w) => w.trim()).filter(Boolean);
      return {
        content: [
          {
            type: "text",
            text: `Pronounced: ${list.join(", ")} (${language})`,
          },
        ],
      };
    },
  );

  registerAppResource(server,
    resourceUri,
    resourceUri,
    { mimeType: RESOURCE_MIME_TYPE },
    async (): Promise<ReadResourceResult> => {
      return {
        contents: [
          { uri: resourceUri, mimeType: RESOURCE_MIME_TYPE, text: html },
        ],
      };
    },
  );

  return server;
}

export default {
  fetch: async (request: Request, env: Env, ctx: ExecutionContext) => {
    const url = new URL(request.url);

    if (url.pathname === "/mcp" || url.pathname === "/mcp/") {
      const server = createServer();
      return createMcpHandler(server)(request, env, ctx);
    }

    return new Response("Pronounce MCP Server. Connect at /mcp", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  },
} satisfies ExportedHandler<Env>;
