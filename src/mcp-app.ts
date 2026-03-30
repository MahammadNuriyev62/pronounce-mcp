import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import "./mcp-app.css";

// ── State ─────────────────────────────────────────────────────────

let words: string[] = [];
let language = "";
let voiceAvailable = false;
let speakingIndex = -1;

const appEl = document.getElementById("app")!;

// ── Render ────────────────────────────────────────────────────────

function render() {
  if (!words.length) {
    appEl.innerHTML = "";
    resizeToContent();
    return;
  }

  appEl.innerHTML = words
    .map((w, i) => {
      const isSpeaking = speakingIndex === i;
      return `<span class="item">${i > 0 ? '<span class="sep">,</span> ' : ""}<span class="word">${escapeHtml(w)}</span><button class="speak-btn${isSpeaking ? " speaking" : ""}" data-index="${i}" ${!voiceAvailable ? "disabled" : ""} title="${voiceAvailable ? "Play" : "No voice available"}"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg></button></span>`;
    })
    .join("");

  appEl.querySelectorAll(".speak-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt((btn as HTMLElement).dataset.index!, 10);
      speak(idx);
    });
  });

  resizeToContent();
}

function resizeToContent() {
  requestAnimationFrame(() => {
    const w = Math.max(appEl.scrollWidth, 100);
    const h = Math.max(appEl.scrollHeight, 24);
    app.sendSizeChanged({ width: w + 4, height: h + 4 });
  });
}

function escapeHtml(str: string): string {
  const el = document.createElement("span");
  el.textContent = str;
  return el.innerHTML;
}

// ── Speech Synthesis ──────────────────────────────────────────────

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

function speak(index: number) {
  if (speakingIndex >= 0 || !words[index] || !voiceAvailable) return;

  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(words[index]);
  utterance.lang = language;
  utterance.rate = 0.85;

  const voices = speechSynthesis.getVoices();
  const langLower = language.toLowerCase();
  const langPrefix = langLower.split("-")[0];

  const exactMatch = voices.find((v) => v.lang.toLowerCase() === langLower);
  const prefixMatch = voices.find((v) =>
    v.lang.toLowerCase().startsWith(langPrefix),
  );
  if (exactMatch) utterance.voice = exactMatch;
  else if (prefixMatch) utterance.voice = prefixMatch;

  utterance.onstart = () => {
    speakingIndex = index;
    render();
  };

  utterance.onend = () => {
    speakingIndex = -1;
    render();
  };

  utterance.onerror = () => {
    speakingIndex = -1;
    render();
  };

  speechSynthesis.speak(utterance);
}

speechSynthesis.addEventListener("voiceschanged", () => {
  checkVoiceAvailability();
  render();
});
checkVoiceAvailability();

// ── Parse words ──────────────────────────────────────────────────

function parseWords(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((w) => w.trim())
    .filter(Boolean);
}

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

app.ontoolinputpartial = (params: any) => {
  const w = params.arguments?.words;
  const l = params.arguments?.language;
  if (w) words = parseWords(w);
  if (l) language = l;
  checkVoiceAvailability();
  render();
};

app.ontoolinput = (params: any) => {
  words = parseWords(params.arguments?.words);
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

  app.sendSizeChanged({ width: 300, height: 28 });
});
