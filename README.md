# Ask ChatGPT About Selection (Firefox)

A Firefox WebExtension that lets you highlight text on any webpage, right-click, and ask ChatGPT about it from a floating in-page popup.

## Features
- Context menu item "Ask ChatGPT about selection".
- Shadow DOM popup near the selected text with collapsible selection preview, Send, loading state, answer display, Copy, and Close controls.
- Keyboard shortcuts: `Enter` to send, `Esc` to close.
- Safety guards: ignores selections inside form fields/contenteditable, caps selection to 3,000 characters, throttles to one request per 2 seconds per tab, and avoids restricted schemes.
- Options page to store the OpenAI API key and toggle auto-send on selection.
- Uses the OpenAI Responses API with a concise system prompt.

## Download and Installation (Firefox temporary add-on)
1. **Download the code**
   - If you are viewing this on GitHub, click **Code → Download ZIP**, then extract the archive to a local folder.
   - If you prefer git, run `git clone <repo-url>` and change into the project directory.
2. **Load the extension temporarily**
   - Open Firefox and go to `about:debugging#addons`.
   - Click **This Firefox** (or **Load Temporary Add-on...** in older versions).
   - Choose **Load Temporary Add-on...** and select the `manifest.json` file inside the extracted folder. Firefox will load all extension files from that directory until you close the browser.
3. **Configure your API key**
   - On the **Ask ChatGPT About Selection** card that appears, click **Preferences** (or **Options**) to open the options page.
   - Enter your OpenAI API key, optionally enable **Auto-send on selection**, and click **Save**.
4. **Keep it available**
   - Temporary add-ons are removed when Firefox restarts; repeat step 2 after restarting, or package/sign the add-on for persistent installation.

## Usage
- Highlight text on a webpage (outside inputs/textareas/contenteditable areas).
- Right-click and choose **Ask ChatGPT about selection**, or enable auto-send to trigger on mouse release.
- A popup appears near the selection showing the text, Send button, loading state, answer, Copy answer, and Close controls.

## Configuration
- API endpoint: `https://api.openai.com/v1/responses`
- Model: `gpt-4.1-mini`
- System instruction: "Answer clearly and concisely. If the user’s selection looks like a question, answer it; otherwise explain it."
