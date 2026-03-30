import { createMcpHandler } from "agents/mcp";
import { registerAppResource, registerAppTool, RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult, ReadResourceResult } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import html from "./dist/mcp-app.html";
import icon from "./icon.svg";

const ICON_PNG_DATA_URI = "data:image/png;base64,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";

function createServer(baseUrl: string): McpServer {
  const server = new McpServer({
    name: "Pronounce",
    version: "1.0.0",
    icons: [
      { src: ICON_PNG_DATA_URI, mimeType: "image/png", sizes: ["128x128"] },
      { src: `${baseUrl}/icon.svg`, mimeType: "image/svg+xml", sizes: ["any"] },
    ],
  });

  const resourceUri = "ui://pronounce/mcp-app.html";

  registerAppTool(server,
    "pronounce",
    {
      title: "Pronounce",
      description:
        "Render a rich text response with inline pronunciation buttons. " +
        "Use when the user asks to hear how words are pronounced, says " +
        "\"pronounce ...\", \"how do you say ...\", or during language learning.\n\n" +
        "Write your FULL response inside the `text` parameter using markdown. " +
        "Wrap each pronounceable word/phrase in double curly braces: {{bonjour}}. " +
        "These become inline play buttons in the rendered output.\n\n" +
        "Example text: \"In French, {{bonjour}} means hello and {{merci}} means thank you.\"",
      inputSchema: {
        text: z.string().describe("Full markdown response with {{word}} markers for pronounceable words"),
        language: z.string().describe("BCP 47 language tag for speech synthesis (e.g. fr-FR, ja-JP, en-US)"),
      },
      _meta: { ui: { resourceUri } },
    },
    async ({ text, language }: { text: string; language: string }): Promise<CallToolResult> => {
      const words = [...text.matchAll(/\{\{(.+?)\}\}/g)].map((m) => m[1]);
      return {
        content: [
          {
            type: "text",
            text: words.length
              ? `Pronounced: ${words.join(", ")} (${language})`
              : text,
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

    if (url.pathname === "/icon.svg") {
      return new Response(icon, {
        headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" },
      });
    }

    if (url.pathname === "/mcp" || url.pathname === "/mcp/") {
      const server = createServer(url.origin);
      return createMcpHandler(server)(request, env, ctx);
    }

    return new Response("Pronounce MCP Server. Connect at /mcp", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  },
} satisfies ExportedHandler<Env>;
