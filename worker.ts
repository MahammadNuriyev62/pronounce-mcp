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
        "Pronounce a word aloud. Renders a minimal inline play button next to the word. " +
        "Use when the user asks to hear how a word is pronounced, says \"pronounce ...\", " +
        "\"how do you say ...\", or during language learning. The language tag must match " +
        "the language the word is written in.",
      inputSchema: {
        word: z.string().describe("The word or phrase to pronounce"),
        language: z.string().describe("BCP 47 language tag (e.g. fr-FR, ja-JP, en-US)"),
      },
      _meta: { ui: { resourceUri } },
    },
    async ({ word, language }: { word: string; language: string }): Promise<CallToolResult> => {
      return {
        content: [
          {
            type: "text",
            text: `Pronounced: ${word} (${language})`,
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
