/* global OPENAI_ENDPOINT, OPENAI_MODEL, REQUEST_INTERVAL_MS, MAX_SELECTION_LENGTH */
const lastRequestPerTab = new Map();

browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: "ask-chatgpt-selection",
    title: "Ask ChatGPT about selection",
    contexts: ["selection"]
  });
});

browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== "ask-chatgpt-selection" || !tab || !tab.id) {
    return;
  }
  browser.tabs.sendMessage(tab.id, {
    type: "context-selection",
    text: info.selectionText || ""
  }).catch(() => {});
});

async function getSettings() {
  const { apiKey = "", autoSend = false } = await browser.storage.sync.get({ apiKey: "", autoSend: false });
  return { apiKey, autoSend };
}

async function callOpenAI(apiKey, text) {
  const body = {
    model: OPENAI_MODEL,
    input: [
      { role: "system", content: "Answer clearly and concisely. If the user’s selection looks like a question, answer it; otherwise explain it." },
      { role: "user", content: text }
    ],
    max_output_tokens: 300
  };

  const response = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  if (!data.output || !Array.isArray(data.output) || !data.output.length) {
    throw new Error("Unexpected API response format");
  }

  const textParts = data.output
    .filter(part => part.content && typeof part.content[0]?.text === "string")
    .map(part => part.content[0].text);

  if (!textParts.length) {
    throw new Error("No textual response from API");
  }

  return textParts.join(" ");
}

browser.runtime.onMessage.addListener((message, sender) => {
  if (message?.type === "ask-selection") {
    return handleAsk(sender, message.text);
  }
  if (message?.type === "get-settings") {
    return getSettings();
  }
  return undefined;
});

async function handleAsk(sender, text) {
  if (!sender.tab || typeof sender.tab.id !== "number") {
    return { error: "Tab information unavailable." };
  }

  if (!text || text.trim().length === 0) {
    return { error: "No text selected." };
  }

  if (text.length > MAX_SELECTION_LENGTH) {
    return { error: `Selection exceeds ${MAX_SELECTION_LENGTH} characters.` };
  }

  const now = Date.now();
  const last = lastRequestPerTab.get(sender.tab.id) || 0;
  if (now - last < REQUEST_INTERVAL_MS) {
    return { error: "Please wait a moment before sending another request." };
  }

  lastRequestPerTab.set(sender.tab.id, now);

  try {
    const { apiKey } = await getSettings();
    if (!apiKey) {
      return { error: "Set your OpenAI API key in the extension options." };
    }
    const answer = await callOpenAI(apiKey, text);
    return { answer };
  } catch (err) {
    return { error: err.message || "Failed to contact API." };
  }
}
