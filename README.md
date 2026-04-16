# Universal Quiz Helper

A Tampermonkey userscript that automatically answers quiz questions using Multi-AI Consensus technology.

## Features

- **Multi-AI Consensus** - Uses OpenRouter and Cohere APIs to analyze questions
- **Unanimous Agreement** - Only answers when both AIs agree (prevents wrong answers)
- **Auto-Detection** - Automatically finds quiz questions and answer options
- **Visual Highlighting** - Highlights correct answers in green before clicking
- **Auto-Click** - Automatically clicks the correct answer multiple times
- **Rate Limit Handling** - Automatic retry with exponential backoff for rate limits
- **Settings Dialog** - Easy API key management through a visual interface
- **API Testing** - Test your API keys directly from the settings dialog

## Supported AI Providers

- **OpenRouter** - Get API key from [openrouter.ai](https://openrouter.ai) (free tier available)
- **Cohere** - Get API key from [dashboard.cohere.com](https://dashboard.cohere.com) (trial key available)

## Installation

### Prerequisites

1. Install [Tampermonkey](https://www.tampermonkey.net/) for your browser
2. Get API keys for at least one of the supported AI providers

### Installing the Userscript

1. Download the latest version: `wayground-userscript-6.4.1.user.js`
2. Open Tampermonkey dashboard
3. Click the "+" button to create a new script
4. Copy and paste the entire contents of the userscript file
5. Save the script (Ctrl+S or File > Save)

### Configuring API Keys

1. Navigate to a quiz page (e.g., wayground.com)
2. Click the "⚙️ Menu" button in the top-left corner
3. Select "🔑 API Keys"
4. Enter your API keys:
   - OpenRouter API Key (Recommended): `sk-or-v1-...`
   - Cohere API Key: Trial or production key from dashboard
5. Click "Save"
6. Test your keys by clicking "🧪 Test All APIs"

## Usage

1. Visit a quiz page (supported sites include wayground.com and nitrotype.com)
2. The script automatically detects questions and options
3. Both AIs analyze the question and vote on the correct answer
4. If both AIs agree, the answer is highlighted in green and clicked
5. If AIs disagree, the question is skipped (to avoid wrong answers)

## How It Works

1. **Question Detection** - Script finds quiz questions and answer options on the page
2. **AI Analysis** - Both OpenRouter and Cohere analyze the question with chain-of-thought reasoning
3. **Consensus Voting** - Each AI votes on the correct answer (1-4)
4. **Unanimous Check** - If both AIs vote for the same answer, consensus is reached
5. **Auto-Click** - The agreed-upon answer is clicked multiple times to ensure it registers

## Consensus Logic

- **Unanimous Agreement Required** - Both AIs must agree on the same answer
- **No Guessing** - If AIs disagree, the question is skipped (better to skip than be wrong)
- **Rate Limit Handling** - OpenRouter rate limits are handled with automatic retry and exponential backoff

## Troubleshooting

### API Returns 404 Error

- **OpenRouter**: Make sure you're using a valid API key. The script uses the `openrouter/free` model which should work with free tier keys.
- **Cohere**: Trial keys must use the `/v1/chat` endpoint. Make sure your key is valid and not expired.

### Script Not Finding Questions

- The script looks for specific patterns in quiz pages. If it's not detecting questions, check the browser console for debug logs.
- The script currently supports wayground.com.

### Rate Limiting

- OpenRouter has rate limits on free tier keys. The script automatically retries with exponential backoff.
- If you frequently hit rate limits, consider upgrading to a paid OpenRouter plan.

## Supported Websites

- wayground.com

## Version History

See [CHANGELOG.md](CHANGELOG.md) for detailed version history.

## License

This project is licensed under the GNU General Public License v3.0. See [LICENSE](LICENSE) for details.

## Contributing

This is a personal project for educational purposes. Contributions are welcome but please note that using automated scripts on quiz platforms may violate their terms of service.

## Disclaimer

This userscript is for educational purposes only. Using automated scripts on quiz platforms may violate their terms of service. Use responsibly and at your own risk.

## GitHub Repository

https://github.com/urmomis86/wayground-quiz-helper
