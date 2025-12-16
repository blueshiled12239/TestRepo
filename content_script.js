(() => {
  if (window.hasChatGptSelectionExtension) {
    return;
  }
  window.hasChatGptSelectionExtension = true;

  const disallowedSchemes = ["about:", "moz-extension:", "file:"];
  const MAX_SELECTION_LENGTH = 3000;
  if (disallowedSchemes.some(prefix => window.location.href.startsWith(prefix))) {
    return;
  }

  const stylePath = browser.runtime.getURL("styles.css");
  let shadowRoot = null;
  let popupEl = null;
  let selectionText = "";
  let isSending = false;

  const closePopup = () => {
    if (popupEl && popupEl.parentNode) {
      popupEl.parentNode.removeChild(popupEl);
    }
    popupEl = null;
    selectionText = "";
    isSending = false;
    document.removeEventListener("keydown", onKeyDown, true);
  };

  function isEditable(node) {
    if (!node) return false;
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (!element) return false;
    const role = element.getAttribute && element.getAttribute("role");
    if (role && role.toLowerCase() === "textbox") {
      return true;
    }
    const tagName = element.tagName ? element.tagName.toLowerCase() : "";
    if (["input", "textarea", "select", "option", "button"].includes(tagName)) {
      return true;
    }
    const contentEditable = element.closest("[contenteditable=true]");
    return Boolean(contentEditable);
  }

  function getCleanSelection() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return "";
    if (isEditable(sel.anchorNode) || isEditable(sel.focusNode)) {
      return "";
    }
    return sel.toString().trim();
  }

  function clampPosition(x, y, width, height) {
    const padding = 8;
    const maxX = window.innerWidth - width - padding;
    const maxY = window.innerHeight - height - padding;
    const clampedX = Math.min(Math.max(padding, x), Math.max(padding, maxX));
    const clampedY = Math.min(Math.max(padding, y), Math.max(padding, maxY));
    return { x: clampedX, y: clampedY };
  }

  function ensureShadow() {
    if (shadowRoot) return shadowRoot;
    const container = document.createElement("div");
    container.style.all = "initial";
    container.style.position = "fixed";
    container.style.zIndex = 2147483647;
    document.body.appendChild(container);
    shadowRoot = container.attachShadow({ mode: "closed" });
    const styleEl = document.createElement("style");
    fetch(stylePath)
      .then(resp => resp.text())
      .then(css => { styleEl.textContent = css; })
      .catch(() => {});
    shadowRoot.appendChild(styleEl);
    return shadowRoot;
  }

  function createPopup(text, rect) {
    closePopup();
    selectionText = text;
    const root = ensureShadow();
    popupEl = document.createElement("div");
    popupEl.className = "chatgpt-popup";

    const header = document.createElement("div");
    header.className = "chatgpt-header";
    const title = document.createElement("div");
    title.textContent = "Ask ChatGPT";
    const closeBtn = document.createElement("button");
    closeBtn.className = "close-btn";
    closeBtn.textContent = "×";
    closeBtn.addEventListener("click", closePopup);
    header.appendChild(title);
    header.appendChild(closeBtn);

    const details = document.createElement("details");
    details.className = "selection-details";
    const summary = document.createElement("summary");
    summary.textContent = "Selected text";
    const pre = document.createElement("pre");
    pre.textContent = text;
    details.appendChild(summary);
    details.appendChild(pre);

    const status = document.createElement("div");
    status.className = "status";

    const controls = document.createElement("div");
    controls.className = "controls";
    const sendBtn = document.createElement("button");
    sendBtn.textContent = "Send";
    const copyBtn = document.createElement("button");
    copyBtn.textContent = "Copy answer";
    copyBtn.disabled = true;

    const answerBox = document.createElement("div");
    answerBox.className = "answer";

    controls.appendChild(sendBtn);
    controls.appendChild(copyBtn);

    popupEl.appendChild(header);
    popupEl.appendChild(details);
    popupEl.appendChild(status);
    popupEl.appendChild(controls);
    popupEl.appendChild(answerBox);

    root.appendChild(popupEl);

    const measured = popupEl.getBoundingClientRect();
    const popupRect = {
      width: measured.width || 320,
      height: measured.height || 240
    };
    const initialX = rect.left + rect.width / 2 - popupRect.width / 2;
    const initialY = rect.bottom + 8;
    const pos = clampPosition(initialX, initialY, popupRect.width, popupRect.height);
    popupEl.style.left = `${pos.x}px`;
    popupEl.style.top = `${pos.y}px`;

    sendBtn.addEventListener("click", () => sendSelection(sendBtn, status, answerBox, copyBtn));
    copyBtn.addEventListener("click", () => {
      const textToCopy = answerBox.textContent || "";
      navigator.clipboard?.writeText(textToCopy);
    });

    document.addEventListener("keydown", onKeyDown, true);
    popupEl.addEventListener("keydown", (evt) => {
      if (evt.key === "Enter" && !evt.shiftKey) {
        evt.preventDefault();
        sendSelection(sendBtn, status, answerBox, copyBtn);
      }
    });
  }

  async function sendSelection(sendBtn, statusEl, answerEl, copyBtn) {
    if (isSending || !selectionText) return;
    isSending = true;
    sendBtn.disabled = true;
    statusEl.textContent = "Sending...";
    answerEl.textContent = "";
    copyBtn.disabled = true;

    try {
      const response = await browser.runtime.sendMessage({
        type: "ask-selection",
        text: selectionText
      });
      if (response?.error) {
        statusEl.textContent = response.error;
      } else if (response?.answer) {
        statusEl.textContent = "";
        answerEl.textContent = response.answer;
        copyBtn.disabled = false;
      } else {
        statusEl.textContent = "No response received.";
      }
    } catch (err) {
      statusEl.textContent = err.message || "Failed to send message.";
    } finally {
      isSending = false;
      sendBtn.disabled = false;
    }
  }

  function onKeyDown(evt) {
    if (evt.key === "Escape") {
      closePopup();
    }
  }

  function handleSelection(text, providedRect) {
    if (!text) return;
    if (text.length > MAX_SELECTION_LENGTH) {
      showTemporaryMessage(`Selection exceeds ${MAX_SELECTION_LENGTH} characters.`);
      return;
    }
    const sel = window.getSelection();
    const rect = providedRect || (sel && sel.rangeCount > 0 ? sel.getRangeAt(0).getBoundingClientRect() : null);
    if (!rect || rect.width === 0 || rect.height === 0) return;
    createPopup(text, rect);
  }

  function showTemporaryMessage(message) {
    closePopup();
    const root = ensureShadow();
    popupEl = document.createElement("div");
    popupEl.className = "chatgpt-popup";
    const status = document.createElement("div");
    status.className = "status";
    status.textContent = message;
    popupEl.appendChild(status);
    root.appendChild(popupEl);
    setTimeout(closePopup, 2000);
  }

  async function maybeAutoSend() {
    const text = getCleanSelection();
    if (!text) return;
    if (text.length > MAX_SELECTION_LENGTH) {
      showTemporaryMessage(`Selection exceeds ${MAX_SELECTION_LENGTH} characters.`);
      return;
    }
    const { autoSend } = await browser.runtime.sendMessage({ type: "get-settings" });
    if (!autoSend) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    handleSelection(text, rect);
    if (!popupEl) return;
    const controls = popupEl.querySelector(".controls");
    const [sendButton, copyButton] = controls.querySelectorAll("button");
    const statusEl = popupEl.querySelector(".status");
    const answerEl = popupEl.querySelector(".answer");
    sendSelection(sendButton, statusEl, answerEl, copyButton);
  }

  document.addEventListener("mouseup", () => {
    setTimeout(() => {
      maybeAutoSend();
    }, 10);
  });

  browser.runtime.onMessage.addListener((message) => {
    if (message?.type === "context-selection") {
      const cleaned = (message.text || "").trim();
      if (!cleaned) return;
      if (isEditable(document.activeElement)) return;
      const sel = window.getSelection();
      const rect = sel && sel.rangeCount > 0
        ? sel.getRangeAt(0).getBoundingClientRect()
        : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 1, height: 1 };
      handleSelection(cleaned, rect);
    }
  });
})();
