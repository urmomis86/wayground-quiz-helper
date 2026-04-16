# Changelog

All notable changes to the Wayground Quiz Helper userscript.

## [6.4.5] - 2025-04-16

### Added
- **Comprehensive debug logging** - Added extensive console logging throughout the script for troubleshooting
- **Element detection logging** - Detailed logs for question/option detection with selector information
- **Click debugging** - Enhanced logging for click functionality including element type, visibility, and click methods
- **API call logging** - Detailed logs for OpenRouter and Cohere API requests and responses

## [6.4.4] - 2025-04-16

### Changed
- **Version bump** - Version update only (no code changes)

## [6.4.3] - 2025-04-16

### Added
- **Kahoot support** - Added kahoot.com and play.kahoot.it to supported websites

## [6.4.2] - 2025-04-16

### Fixed
- **Click functionality** - Improved answer clicking to handle different element types (labels, divs, spans, radio buttons)
- **Element detection** - Script now finds the actual clickable element (e.g., finds input inside label)
- **Radio button support** - Directly sets checked property for radio/checkbox inputs
- **Scroll to view** - Elements are scrolled into view before clicking
- **Multiple click methods** - Uses click(), MouseEvent dispatch, and property setting for reliability

## [6.4.1] - 2025-04-16

### Fixed
- **Syntax error** - Removed leftover try block without catch/finally that was causing script to fail

## [6.4.0] - 2025-04-16

### Changed
- **Answer format** - AI now returns actual answer text (e.g., "84.9 m²") instead of numbers (1-4)
- **Prompting** - Updated prompts to request exact answer text including units
- **Answer matching** - Implemented text matching logic to match AI responses to option text

## [6.3.0] - 2025-04-16

### Fixed
- **Cohere API** - Fixed HTTP 422 error by updating model name to `command-r-08-2024`
- **Debug logging** - Removed debug logging now that Cohere is working

## [6.2.9] - 2025-04-16

### Changed
- **Debug logging** - Added detailed logging for Cohere API requests and responses to debug HTTP 422 error

## [6.2.8] - 2025-04-15

### Fixed
- **Cohere model name** - Updated from `command-r` to `command-r-08-2024` for v2 API compatibility (fixes HTTP 422 error)

## [6.2.7] - 2025-04-15

### Changed
- Version bump to 6.2.7

## [6.2.5] - 2025-04-15

### Removed
- **NitroType support** - Removed nitrotype.com from supported websites
- **NitroType @match directives** - Removed all nitrotype.com URL patterns from userscript

### Changed
- **README** - Updated to reflect wayground.com as the only supported platform

## [6.2.4] - 2025-04-14

### Fixed
- **Cohere endpoint** - Changed from `/v1/chat` to `/v2/chat` (v1 deprecated)
- **Cohere model** - Changed from `command` to `command-r` for better compatibility
- **Cohere response parsing** - Updated for v2/chat format (data.message.content[0].text)

## [6.2.3] - 2025-04-14

### Removed
- **Mistral AI** - Removed from consensus (too fast and getting answers wrong)
- **Mistral API key storage** - Removed from settings dialog and storage functions
- **Mistral test API** - Removed from API test functionality

### Fixed
- **Cohere endpoint** - Changed from `/v1/generate` to `/v1/chat` for trial key compatibility
- **Cohere response parsing** - Updated to handle chat endpoint response format (data.text or data.message.content)
- **Consensus logic** - Changed from majority (2+ out of 3) to unanimous (both AIs must agree)

### Changed
- **Consensus threshold** - Now requires both OpenRouter and Cohere to agree (unanimous)
- **Help dialog** - Updated to mention only OpenRouter and Cohere
- **Metadata description** - Updated to "Multi-AI Consensus (OpenRouter + Cohere)"

## [6.2.2] - 2025-04-14

### Fixed
- **OpenRouter model** - Changed to `openrouter/free` (basic free model) to fix HTTP 404
- **Cohere endpoint** - Changed from `api.cohere.com` to `api.cohere.ai` for trial key compatibility
- **Updated all API calls** - Synchronized endpoints and models across all functions

## [6.2.1] - 2025-04-14

### Fixed
- **OpenRouter model name** - Changed from `mistralai/mistral-7b-instruct:free` to `meta-llama/llama-3-8b-instruct:free` (fixes HTTP 404)
- **Cohere model name** - Changed from `command-light` to `command` (fixes HTTP 404)
- **Updated all API calls** - Model names synchronized across test, main, fallback, and text answer functions

## [6.2.0] - 2025-04-13

### Added
- **Mistral AI integration** - Re-added Mistral as a third AI provider (OpenRouter + Mistral + Cohere)
- **Majority consensus** - Changed from unanimous to majority voting (2+ out of 3 AIs must agree)

### Fixed
- **Cohere text answer endpoint** - Fixed to use `/v1/generate` instead of `/v1/chat` for trial key compatibility
- **Cohere test endpoint** - Updated API test in settings to use correct `/v1/generate` endpoint
- **Debug log consistency** - Added `[Wayground Debug]` prefix to all remaining console logs
- **API key storage** - Re-added Mistral to `getAPIKeys()` and `saveAPIKeys()` functions

### Removed
- **Dead code cleanup** - Removed unused `getAnswerWithContext()` and `getConsensusAnswer()` functions
- **DeepSeek references** - Removed all remaining DeepSeek references from help dialog and codebase
- **Old AI calling code** - Removed deprecated multi-AI calling logic with stale endpoints

### Changed
- **Consensus threshold** - Now requires 2+ AIs to agree (majority) instead of 100% unanimous
- **Settings dialog** - Added Mistral API key input field
- **Help dialog** - Updated to mention all 3 supported APIs (OpenRouter, Mistral, Cohere)
- **Fallback function** - Added Mistral as fallback option between OpenRouter and Cohere

## [6.1.1] - 2025-04-10

### Fixed
- **Rate limit handling** - Added retry with exponential backoff for OpenRouter 429 errors
- **Better AI model** - Changed from `openrouter/free` to `mistralai/mistral-7b-instruct:free` (more accurate)
- **Chain-of-thought prompting** - AI now reasons through each option before answering
- **Better answer parsing** - Improved number extraction from AI responses

### Changed
- **Prompt improvements** - Added "THINKING PROCESS" section for better reasoning
- **Debug logging** - All AI responses now logged with `[Wayground Debug]` prefix
- **max_tokens increased** - From 10 to 50 to allow reasoning space

## [6.1.0] - 2025-04-10

### Fixed
- **Fixed Cohere API integration** - Replaced all DeepSeek references with proper Cohere API calls
- **Fixed metadata** - Updated version to 6.1.0, license to GPL-3.0, removed RL references
- **Fixed consensus logic** - Now requires 100% AI agreement (unanimous) before answering
- **Fixed input freezing** - Removed blur event from typeAnswer that was causing freezes
- **Fixed typeAnswer** - Now returns Promise for proper async/await handling
- **Removed RL references** - Cleaned up remaining selectBestModel and trackTextAnswerForFeedback calls

### Added
- **Heavy debugging** - Added detailed console logging to findQuestions and findOptions
- **Enhanced AI prompts** - Better formatting with clear examples for AI responses
- **Vote tally display** - Shows how many AIs voted for each answer

### Changed
- **No answer on disagreement** - Script now skips questions when AIs disagree (avoids wrong answers)
- **Improved question detection** - Better logging to debug what's being detected

## [5.2] - 2025-04-07

### Added
- **Groq AI integration** - Added 6th AI provider (Groq) with llama-3.3-70b-versatile model
- All 6 AIs now participate in consensus voting (4 votes required for agreement)
- Groq API key input added to settings dialog
- Updated README with userscript-specific documentation

### Fixed
- Fixed consensus function to include all 6 AI providers in voting
- Fixed API key check to recognize all configured providers
- Fixed fallback chain to try all AIs before giving up

## [5.1] - 2025-04-07

### Added
- **OpenCode Zen AI** - 4th AI provider integration
- **Cloudflare AI** - 5th AI provider integration
- API key input fields for OpenCode Zen and Cloudflare in settings dialog
- Cloudflare API call implementation

### Removed
- **Reinforcement Learning (RL) system completely removed**
  - Removed all RL tracking and feedback functions
  - Removed "❌ Wrong Answer" button from menu
  - Removed penalty/reward logic
  - Removed score monitoring and detection
  - Removed 455+ lines of RL-related code
  - Simplified codebase significantly

### Fixed
- Fixed consensus function to properly include all 5 AIs (previously only 3)
- Fixed status display to show all AI responses
- Fixed voting logic to require 3 out of 5 votes (now 4 out of 6)

## [5.0] - 2025-04-06

### Added
- **Multi-AI Consensus System** - Complete rewrite with voting mechanism
- **Vercel AI** - 3rd AI provider added
- Full page context analysis for better accuracy
- Visual status messages showing which AIs are processing
- Auto-click functionality with multiple retry attempts
- Green highlight styling for selected answers
- Menu system with Pause/Resume toggle
- Settings dialog for API key management

### Changed
- Migrated from single-AI to multi-AI architecture
- Updated from simple text matching to AI consensus voting
- Improved answer detection with full page context

## [4.x] - 2025-04-05

### Added
- Reinforcement Learning (RL) system for answer tracking
- Hybrid AI/RL decision making (80% AI / 20% RL)
- Wrong answer detection with visual and textual indicators
- Auto wrong answer detection system
- Score monitoring to detect incorrect answers
- Multi-check detection system

### Changed
- Enhanced answer detection for multi-select questions
- Added support for submit buttons
- Improved visual detection with CSS classes and computed styles

## [3.x] - 2025-04-04

### Added
- MIT License added to metadata
- Userscript versioning system
- Universal training across quiz platforms

### Changed
- Auto-copy to Downloads folder functionality
- GitHub integration for updates

## [2.x] - 2025-04-03

### Added
- OpenRouter API integration
- DeepSeek API integration
- Basic answer selection and clicking
- Status overlay display

### Changed
- Improved prompt engineering for better accuracy

## [1.0] - 2025-04-02

### Added
- Initial release
- Basic quiz question detection
- Single AI (OpenRouter) support
- Answer highlighting functionality
- Tampermonkey userscript structure
