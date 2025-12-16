# Ask ChatGPT About Selection (Firefox)

A Firefox WebExtension that lets you highlight text on any webpage, right-click, and ask ChatGPT about it from a floating in-page popup.

## Features
- Context menu item "Ask ChatGPT about selection".
- Shadow DOM popup near the selected text with collapsible selection preview, Send, loading state, answer display, Copy, and Close controls.
- Keyboard shortcuts: `Enter` to send, `Esc` to close.
- Safety guards: ignores selections inside form fields/contenteditable, caps selection to 3,000 characters, throttles to one request per 2 seconds per tab, and avoids restricted schemes.
- Options page to store the OpenAI API key and toggle auto-send on selection.
- Uses the OpenAI Responses API with a concise system prompt.

## Installation (Firefox temporary add-on)
1. Open `about:debugging#addons` in Firefox.
2. Click **This Firefox**.
3. Click **Load Temporary Add-on...** and choose the `manifest.json` file from this folder.
4. Open the options page from the extension card to set your OpenAI API key and (optionally) enable auto-send.

## Usage
- Highlight text on a webpage (outside inputs/textareas/contenteditable areas).
- Right-click and choose **Ask ChatGPT about selection**, or enable auto-send to trigger on mouse release.
- A popup appears near the selection showing the text, Send button, loading state, answer, Copy answer, and Close controls.

## Configuration
- API endpoint: `https://api.openai.com/v1/responses`
- Model: `gpt-4.1-mini`
- System instruction: "Answer clearly and concisely. If the user’s selection looks like a question, answer it; otherwise explain it."
