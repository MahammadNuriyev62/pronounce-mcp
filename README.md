https://github.com/user-attachments/assets/31b00a7f-db37-4740-9429-4fc6b5dab4fd

# Pronounce MCP

An MCP App with inline audio buttons for word pronunciation and language learning. Claude writes its full response with `{{word}}` markers that become interactive play buttons rendered inside the widget.

## Add to Claude

MCP server URL:

```
https://pronounce-mcp.maganuriyev.workers.dev/mcp
```

Then ask Claude something like "how do I order coffee in French?" or "pronounce these Japanese greetings".

## How it works

1. Claude writes its response as markdown inside the tool's `text` parameter
2. Words wrapped in `{{double curly braces}}` become inline play buttons
3. Clicking a button speaks the word using browser speech synthesis
4. Prefers premium/enhanced system voices when available

## Development

```bash
npm install
npm run dev       # watch mode
npm run deploy    # build + deploy to Cloudflare Workers
```
