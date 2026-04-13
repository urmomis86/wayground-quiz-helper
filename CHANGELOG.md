# Changelog

All notable changes to the Wayground Quiz Helper userscript.

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
