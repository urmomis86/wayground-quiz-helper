# Changelog

All notable changes to the Wayground Quiz Helper userscript.

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
