# Wayground Quiz Helper

A Tampermonkey userscript that uses multiple AI models to automatically answer quiz questions on Wayground and other quiz platforms.

## Features

- **Multi-AI Consensus**: Uses 2 AI providers for answer verification:
  - OpenRouter (free models available)
  - Cohere (trial keys available)
- **Smart Answer Selection**: AI consensus voting - both AIs must agree for high confidence
- **Visual Detection**: Highlights selected answers with green border and auto-clicks
- **Multiple Question Types**: Supports radio buttons, checkboxes, and text inputs
- **Easy Configuration**: Simple menu to add API keys

## Installation

1. Install [Tampermonkey](https://www.tampermonkey.net/) browser extension for your browser
2. Click this link to install the script: **[Install Wayground Quiz Helper](https://raw.githubusercontent.com/urmomis86/wayground-quiz-helper/main/wayground-userscript.user.js)**
   - Or manually: Copy the `wayground-userscript.user.js` file contents
   - In Tampermonkey dashboard, click "Create a new script"
   - Paste the contents and save (Ctrl+S)
3. Navigate to any Wayground quiz page - the script will activate automatically

## Setup

1. Navigate to any Wayground quiz page
2. Click the **⚙️ Menu** button that appears in the top-left corner
3. Select **🔑 API Keys**
4. Add your API keys for the AI services you want to use:
   - **OpenRouter**: Get free API key at [openrouter.ai/keys](https://openrouter.ai/keys)
   - **Cohere**: Get trial API key at [cohere.com](https://cohere.com/)

5. Click **Save**

**Note**: You only need to add at least one API key, but adding more improves accuracy through consensus voting.

## Usage

1. Navigate to any Wayground quiz page (`https://wayground.com/*`)
2. The script automatically detects questions and options
3. Status messages appear showing which AIs are analyzing
4. The consensus answer is automatically selected and clicked

## Menu Options

- **🛑 Pause/▶️ Resume Script**: Temporarily disable or re-enable the script
- **🔑 API Keys**: Open the settings dialog to configure API keys
- **📋 Copy Script**: Export the current script to a file for backup

## How It Works

1. **Page Analysis**: The script extracts question text and all answer options from the page
2. **Multi-AI Query**: Sends the question to all configured AI providers simultaneously
3. **Answer Parsing**: Each AI returns a number (1-N) representing their answer choice
4. **Consensus Voting**: Both AIs must agree on the same answer for high confidence
5. **Auto-Selection**: The winning answer is highlighted in green and clicked automatically
6. **Fallback**: If no consensus is reached, the first available AI answer is used

## Troubleshooting

### "Set API keys in settings" Error
- Add at least one API key in the settings dialog (⚙️ Menu → 🔑 API Keys)
- OpenRouter offers free models that work great
- Cohere provides trial keys for testing

### "No AI could determine answer" Error
- Check that your API keys are valid and have credits
- Open browser console (F12) to see specific error messages
- Some AIs may fail if the question is ambiguous or image-based

### Script Not Appearing
- Check that Tampermonkey is enabled
- Verify you're on a Wayground URL (`https://wayground.com/*`)
- Refresh the page after installing the script

## API Costs

- **OpenRouter**: Free tier available (limited requests per day)
- **Cohere**: Trial key available with free credits
- The script uses lightweight models to minimize API costs
- Both AIs are called simultaneously for consensus

## Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history and updates.

## Support

For issues or questions, check the GitHub repository: https://github.com/urmomis86/wayground-quiz-helper

## Limitations & Known issues
- The matching logic expects close text equality after a simple normalization step (lowercasing, punctuation removal). If the model returns formatted output ("A. ...", explanations, or multiple lines), the extension may fail to match.
- The extension monitors all pages (`<all_urls>`) because quiz platforms vary. That increases the extension's visibility surface; consider narrowing `host_permissions` in `manifest.json` if you target a specific site.
- Rate limiting, API errors, or invalid API keys will prevent answer lookup. The extension logs errors to the page console.

## Development notes
- Manifest version: 3
- Storage key: `OPENROUTER_API_KEY`
- Main content script entry: `content.js` (runs at `document_end`)
- Styling for highlights: `.highlight-correct` in `styles.css`
- To change model or endpoint, edit `fetch` parameters inside `content.js`.

## Troubleshooting
- If answers are not highlighted:
  - Check DevTools console for logs from `[QuizAnswerFinder]` or other console messages.
  - Ensure the API key is set in the extension popup or options.
  - Confirm the page has elements matching the selectors used in `content.js` (quiz platforms differ).

## License
This project is licensed under the **GNU General Public License v3.0 (GPL-3.0)**.

See the [LICENSE](LICENSE) file for the full license text.

**What GPL-3.0 means:**
- **Freedom to use**: You can use this software for any purpose
- **Freedom to study**: You can examine how it works and modify it
- **Freedom to share**: You can redistribute copies
- **Freedom to improve**: You can distribute modified versions

**Requirements:**
- If you distribute modified versions, you must use GPL-3.0 (share-alike)
- You must provide the source code
- You must include the license and copyright notices
- You cannot impose additional restrictions

For more information about GPL-3.0, visit [gnu.org/licenses/gpl-3.0](https://www.gnu.org/licenses/gpl-3.0.html)

