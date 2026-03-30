import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import { marked } from "marked";
import "./mcp-app.css";

marked.setOptions({ breaks: true, gfm: true });

// ── State ─────────────────────────────────────────────────────────

let text = "";
let language = "";
let voiceAvailable = false;
let speakingWord = "";

const appEl = document.getElementById("app")!;

// ── Render ────────────────────────────────────────────────────────

function wordButton(word: string): string {
  const isSpeaking = speakingWord === word;
  return (
    `<span class="pronounce-word">` +
      `<span class="word-text">${word}</span>` +
      `<button class="speak-btn${isSpeaking ? " speaking" : ""}${!voiceAvailable ? " disabled" : ""}" ` +
        `data-word="${escapeAttr(word)}" ` +
        `${!voiceAvailable ? "disabled" : ""} ` +
        `title="${voiceAvailable ? "Click to hear pronunciation" : "No voice available"}">` +
        `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">` +
          `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>` +
          `<path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>` +
        `</svg>` +
      `</button>` +
    `</span>`
  );
}

function render() {
  if (!text) {
    appEl.innerHTML = "";
    resizeToContent();
    return;
  }

  // Parse markdown, then replace {{word}} markers with interactive buttons
  let html = marked.parse(text) as string;
  html = html.replace(/\{\{(.+?)\}\}/g, (_match, word) => wordButton(word));

  appEl.innerHTML = html;
  resizeToContent();
}

// Event delegation: survives innerHTML replacements during streaming
appEl.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement).closest(".speak-btn") as HTMLElement | null;
  if (btn?.dataset.word) speak(btn.dataset.word);
});

function resizeToContent() {
  requestAnimationFrame(() => {
    const w = Math.max(appEl.scrollWidth, 100);
    const h = Math.max(appEl.scrollHeight, 24);
    app.sendSizeChanged({ width: w + 8, height: h + 8 });
  });
}

function escapeHtml(str: string): string {
  const el = document.createElement("span");
  el.textContent = str;
  return el.innerHTML;
}

function escapeAttr(str: string): string {
  return str.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

// ── Speech Synthesis ──────────────────────────────────────────────

function pickBestVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | null {
  const langLower = lang.toLowerCase();
  const langPrefix = langLower.split("-")[0];

  const scored = voices
    .map((v) => {
      const vLang = v.lang.toLowerCase();
      const exactLang = vLang === langLower;
      const prefixLang = vLang.startsWith(langPrefix);
      if (!exactLang && !prefixLang) return null;

      let score = exactLang ? 100 : 50;
      const name = v.name.toLowerCase();

      if (name.includes("premium")) score += 30;
      else if (name.includes("enhanced")) score += 20;
      if (name.includes("compact")) score -= 10;
      if (!v.localService) score -= 5;

      return { voice: v, score };
    })
    .filter(Boolean) as { voice: SpeechSynthesisVoice; score: number }[];

  if (!scored.length) return null;
  scored.sort((a, b) => b.score - a.score);
  return scored[0].voice;
}

function checkVoiceAvailability() {
  const voices = speechSynthesis.getVoices();
  if (!language) {
    voiceAvailable = voices.length > 0;
    return;
  }
  const langLower = language.toLowerCase();
  const langPrefix = langLower.split("-")[0];
  const hasMatch = voices.some((v) => {
    const vLang = v.lang.toLowerCase();
    return vLang === langLower || vLang.startsWith(langPrefix);
  });
  voiceAvailable = hasMatch || voices.length > 0;
}

function speak(word: string) {
  if (speakingWord || !word || !voiceAvailable) return;

  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = language;
  utterance.rate = 0.85;

  const voices = speechSynthesis.getVoices();
  const best = pickBestVoice(voices, language);
  if (best) utterance.voice = best;

  utterance.onstart = () => {
    speakingWord = word;
    render();
  };

  utterance.onend = () => {
    speakingWord = "";
    render();
  };

  utterance.onerror = () => {
    speakingWord = "";
    render();
  };

  speechSynthesis.speak(utterance);
}

speechSynthesis.addEventListener("voiceschanged", () => {
  checkVoiceAvailability();
  render();
});
checkVoiceAvailability();

// ── Host context ──────────────────────────────────────────────────

function handleHostContextChanged(ctx: McpUiHostContext) {
  if (ctx.theme) applyDocumentTheme(ctx.theme);
  if (ctx.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
  if (ctx.styles?.css?.fonts) applyHostFonts(ctx.styles.css.fonts);
}

// ── MCP App lifecycle ─────────────────────────────────────────────

const app = new App(
  { name: "Pronounce", version: "1.0.0" },
  {},
  { autoResize: false },
);

app.onteardown = async () => {
  speechSynthesis.cancel();
  return {};
};

let renderTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleRender() {
  if (renderTimer) return;
  renderTimer = setTimeout(() => {
    renderTimer = null;
    render();
  }, 150);
}

app.ontoolinputpartial = (params: any) => {
  const t = params.arguments?.text;
  const l = params.arguments?.language;
  if (t) text = t;
  if (l) language = l;
  checkVoiceAvailability();
  scheduleRender();
};

app.ontoolinput = (params: any) => {
  text = params.arguments?.text ?? "";
  language = params.arguments?.language ?? "";
  checkVoiceAvailability();
  render();
};

app.ontoolresult = () => {};

app.ontoolcancelled = () => {
  speechSynthesis.cancel();
};

app.onerror = console.error;
app.onhostcontextchanged = handleHostContextChanged;

app.connect().then(() => {
  const hostCtx = app.getHostContext();
  if (hostCtx) handleHostContextChanged(hostCtx);

  app.sendSizeChanged({ width: 600, height: 40 });
});
