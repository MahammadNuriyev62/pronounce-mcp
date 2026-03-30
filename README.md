# Pronounce MCP

An MCP App that pronounces words aloud using browser speech synthesis. Shows an inline play button next to the word that speaks it in the requested language.

Built with Cloudflare Workers + MCP Apps SDK.

## Usage

Add the MCP server URL to your client and use the `pronounce` tool with a word and BCP 47 language tag (e.g. `fr-FR`, `ja-JP`).

## Development

```bash
npm install
npm run dev       # watch mode
npm run deploy    # build + deploy to Cloudflare Workers
```
