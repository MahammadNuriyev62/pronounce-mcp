import {
  App,
  applyDocumentTheme,
  applyHostFonts,
  applyHostStyleVariables,
  type McpUiHostContext,
} from "@modelcontextprotocol/ext-apps";
import "./mcp-app.css";

// ── State ─────────────────────────────────────────────────────────

let word = "";
let language = "";
let voiceAvailable = false;
let speaking = false;

const appEl = document.getElementById("app")!;

// ── Render ────────────────────────────────────────────────────────

function render() {
  if (!word) {
    appEl.innerHTML = "";
    return;
  }

  appEl.innerHTML = `
    <div class="pronounce">
      <span class="word">${escapeHtml(word)}</span>
      <button
        class="speak-btn${speaking ? " speaking" : ""}${!voiceAvailable ? " disabled" : ""}"
        ${!voiceAvailable ? "disabled" : ""}
        title="${voiceAvailable ? "Click to hear pronunciation" : "No voice available for this language"}"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
        </svg>
      </button>
    </div>
  `;

  const btn = appEl.querySelector(".speak-btn");
  if (btn && voiceAvailable) {
    btn.addEventListener("click", speak);
  }
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

  // Check for exact or prefix match
  const hasMatch = voices.some((v) => {
    const vLang = v.lang.toLowerCase();
    return vLang === langLower || vLang.startsWith(langPrefix);
  });

  // Allow speaking even without an exact match if any voices exist,
  // since the browser may still handle the language via a fallback voice.
  voiceAvailable = hasMatch || voices.length > 0;
}

function speak() {
  if (speaking || !word || !voiceAvailable) return;

  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = language;
  utterance.rate = 0.85;

  // Prefer exact match, then prefix match
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
    speaking = true;
    render();
  };

  utterance.onend = () => {
    speaking = false;
    render();
  };

  utterance.onerror = () => {
    speaking = false;
    render();
  };

  speechSynthesis.speak(utterance);
}

// Voices may load asynchronously
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

app.ontoolinputpartial = (params: any) => {
  const w = params.arguments?.word;
  const l = params.arguments?.language;
  if (w) word = w;
  if (l) language = l;
  checkVoiceAvailability();
  render();
};

app.ontoolinput = (params: any) => {
  word = params.arguments?.word ?? "";
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

  app.sendSizeChanged({ width: 300, height: 36 });
});
