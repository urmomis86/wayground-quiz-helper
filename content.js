// Quiz Answer Finder with Reinforcement Learning
// Chrome Extension Content Script

console.log('[QuizAnswerFinder] Content script starting...');
console.log('[QuizAnswerFinder] Document ready state:', document.readyState);

// Normalize strings (remove punctuation, lowercase, trim)
function normalize(str) {
  return str.toLowerCase().replace(/[^\w\s]/gi, '').trim();
}

// Matching helpers
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsWord(haystack, needle) {
  if (!haystack || !needle) return false;
  const pattern = new RegExp(`(^|\\s)${escapeRegex(needle)}(\\s|$)`);
  return pattern.test(haystack);
}

function singularizeWord(word) {
  if (!word) return word;
  if (word.endsWith('ies') && word.length > 3) return word.slice(0, -3) + 'y';
  if (word.endsWith('es') && word.length > 2) return word.slice(0, -2);
  if (word.endsWith('s') && word.length > 1) return word.slice(0, -1);
  return word;
}

function singularizePhrase(text) {
  if (!text) return text;
  const parts = text.split(' ');
  if (!parts.length) return text;
  parts[parts.length - 1] = singularizeWord(parts[parts.length - 1]);
  return parts.join(' ');
}

function stripLeadingLabel(text) {
  return text.replace(/^[A-Ea-e]\s*[\).:-]\s*/, '').trim();
}

function splitAnswerIntoParts(answer) {
  if (!answer) return [];
  let cleaned = answer.replace(/[\r\n]+/g, '\n');
  cleaned = cleaned.replace(/\s*(,|;|\/|\n)\s*/g, ' | ');
  cleaned = cleaned.replace(/\s+(and|&)\s+/gi, ' | ');
  return cleaned.split('|').map(part => stripLeadingLabel(part.trim())).filter(Boolean);
}

function extractLetterIndices(answer, optionCount) {
  const set = new Set();
  if (!answer) return set;
  const regex = /(^|[\s,;])([A-Ea-e])\s*[\).:-]/g;
  let match;
  while ((match = regex.exec(answer)) !== null) {
    const idx = match[2].toLowerCase().charCodeAt(0) - 97;
    if (idx >= 0 && idx < optionCount) set.add(idx);
  }
  const tokens = answer.replace(/[^A-Za-z]/g, ' ').split(/\s+/).filter(Boolean);
  const letterTokens = tokens.filter(t => /^[A-Ea-e]$/.test(t));
  const otherTokens = tokens.filter(t => t.length > 1);
  if (letterTokens.length >= 2 || (letterTokens.length >= 1 && otherTokens.length === 0)) {
    letterTokens.forEach((t) => {
      const idx = t.toLowerCase().charCodeAt(0) - 97;
      if (idx >= 0 && idx < optionCount) set.add(idx);
    });
  }
  return set;
}

function scoreAnswerAgainstOptions(answer, options) {
  if (!answer || !options || !options.length) return { score: 0, matches: 0 };
  const normalizedCorrect = normalize(answer);
  const strippedAnswer = answer.replace(/^[A-Da-d]\.\s*/, '').trim();
  const normalizedStripped = normalize(strippedAnswer);
  const answerParts = splitAnswerIntoParts(answer);
  const normalizedParts = Array.from(new Set([normalizedCorrect, normalizedStripped, ...answerParts.map((p) => normalize(p))].filter(Boolean)));
  const letterIndices = extractLetterIndices(answer, options.length);
  let bestScore = 0;
  let matches = 0;

  options.forEach((optText, idx) => {
    const optionText = optText || '';
    if (!optionText) return;
    const normalizedOption = normalize(optionText);
    const normalizedOptionSingular = singularizePhrase(normalizedOption);
    let score = 0;
    if (letterIndices.has(idx)) {
      score = Math.max(score, 3);
    } else {
      for (const part of normalizedParts) {
        if (!part || part.length < 1) continue;
        const partSingular = singularizePhrase(part);
        if (part === normalizedOption || part === normalizedOptionSingular || partSingular === normalizedOption) {
          score = Math.max(score, 2);
          break;
        }
        if (containsWord(part, normalizedOption) || containsWord(part, normalizedOptionSingular)) {
          score = Math.max(score, 1);
          break;
        }
        if (part.length >= 4 && containsWord(normalizedOption, part)) {
          score = Math.max(score, 1);
          break;
        }
        if (part.length >= 4 && containsWord(normalizedOptionSingular, partSingular)) {
          score = Math.max(score, 1);
          break;
        }
      }
    }
    if (score > 0) {
      matches += 1;
      if (score > bestScore) bestScore = score;
    }
  });

  return { score: bestScore, matches };
}

function pickBestAnswerCandidate(candidates, options) {
  if (!candidates || !candidates.length) return null;
  let best = null;
  candidates.forEach((candidate, idx) => {
    const metrics = scoreAnswerAgainstOptions(candidate.answer, options);
    const score = metrics.score;
    const matches = metrics.matches;
    if (!best) {
      best = { ...candidate, score, matches, order: idx };
      return;
    }
    if (score > best.score) {
      best = { ...candidate, score, matches, order: idx };
      return;
    }
    if (score === best.score && matches > best.matches) {
      best = { ...candidate, score, matches, order: idx };
    }
  });
  return best;
}

// Selector defaults
const DEFAULT_QUESTION_SELECTORS = [
  '[data-testid="question-container-text"] p',
  '[data-testid*="question" i] p',
  '[data-testid*="question" i]',
  '[data-cy*="question" i]',
  '[data-test*="question" i]',
  '[class*="question" i] p',
  '[class*="question" i]',
  '[class*="prompt" i]',
  '[class*="stem" i]',
  '[class*="quiz" i] p',
  '[class*="quiz" i]',
  'main p',
  'main h1',
  'main h2',
  'main h3',
  '[role="heading"]',
  'h1',
  'h2',
  'h3'
];

const DEFAULT_OPTION_SELECTORS = [
  '[data-cy^="option-"]',
  '[data-testid*="option" i]',
  '[data-cy*="option" i]',
  '[data-test*="option" i]',
  '[role="option"]',
  'main [role="button"]',
  'main button',
  'main label'
];

// Reinforcement Learning System for Model Selection
let _rlInitialized = false;
let _rlModels = [];
let _rlStats = {};
const RL_STORAGE_KEY = 'QAF_RL_STATS';
const EXPLORATION_BONUS = 2.0; // UCB1 exploration parameter

// Initialize RL system
async function rlLoad() {
  try {
    // Chrome extension storage
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([RL_STORAGE_KEY], (res) => {
        _rlStats = res && res[RL_STORAGE_KEY] && typeof res[RL_STORAGE_KEY] === 'object' 
          ? res[RL_STORAGE_KEY] 
          : {};
        
        // Initialize default models if none exist
        if (Object.keys(_rlStats).length === 0) {
          _rlStats = {
            'openrouter/free': { pulls: 1, rewards: 0, totalReward: 0 },
            'openrouter/meta-llama/llama-3.2-3b-instruct:free': { pulls: 1, rewards: 0, totalReward: 0 },
            'deepseek/deepseek-chat': { pulls: 1, rewards: 0, totalReward: 0 }
          };
        }
        
        _rlModels = Object.keys(_rlStats);
        _rlInitialized = true;
        console.log('[RL] Initialized with models:', _rlModels);
        console.log('[RL] Stats:', _rlStats);
      });
    } else {
      console.error('[RL] Chrome storage not available');
      // Fallback to memory
      _rlStats = {
        'openrouter/free': { pulls: 1, rewards: 0, totalReward: 0 },
        'openrouter/meta-llama/llama-3.2-3b-instruct:free': { pulls: 1, rewards: 0, totalReward: 0 },
        'deepseek/deepseek-chat': { pulls: 1, rewards: 0, totalReward: 0 }
      };
      _rlModels = Object.keys(_rlStats);
      _rlInitialized = true;
    }
  } catch (err) {
    console.error('[RL] Failed to initialize:', err);
  }
}

// UCB1 algorithm for model selection
function rlGetModel() {
  if (!_rlInitialized || _rlModels.length === 0) return null;
  
  let bestModel = null;
  let bestScore = -Infinity;
  const totalPulls = _rlModels.reduce((sum, model) => sum + _rlStats[model].pulls, 0);
  
  for (const model of _rlModels) {
    const stats = _rlStats[model];
    if (!stats || stats.pulls === 0) continue;
    
    const avgReward = stats.rewards > 0 ? stats.totalReward / stats.rewards : 0;
    const exploration = Math.sqrt(Math.log(totalPulls) / stats.pulls);
    const ucb1Score = avgReward + EXPLORATION_BONUS * exploration;
    
    if (ucb1Score > bestScore) {
      bestScore = ucb1Score;
      bestModel = model;
    }
  }
  
  // Increment pull count for selected model
  if (bestModel && _rlStats[bestModel]) {
    _rlStats[bestModel].pulls++;
    rlSaveStats();
  }
  
  return bestModel;
}

// Save RL stats to storage
function rlSaveStats() {
  try {
    // Chrome extension storage
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [RL_STORAGE_KEY]: _rlStats }, () => {});
    } else {
      console.error('[RL] Chrome storage not available for saving');
    }
  } catch (err) {
    console.error('[RL] Failed to save stats:', err);
  }
}

// Update model stats with reward
function rlUpdateReward(model, reward) {
  if (!_rlInitialized || !model || !reward) return;
  
  if (!_rlStats[model]) {
    _rlStats[model] = { pulls: 1, rewards: 0, totalReward: 0 };
    _rlModels.push(model);
  }
  
  const stats = _rlStats[model];
  stats.rewards++;
  stats.totalReward += reward;
  
  console.log(`[RL] Updated ${model}: reward=${reward}, avg=${(stats.totalReward / stats.rewards).toFixed(3)}`);
  rlSaveStats();
}

// Add new model to RL system (called when a new model is used)
function rlAddModel(modelId) {
  if (!_rlInitialized || !modelId) return;
  
  if (!_rlStats[modelId]) {
    _rlStats[modelId] = { pulls: 1, rewards: 0, totalReward: 0 };
    _rlModels.push(modelId);
    console.log('[RL] Added new model to tracking:', modelId);
    rlSaveStats();
  }
}

// Setup reward detection by monitoring page changes
function rlSetupRewardDetection(modelUsed, matchedOptions, questionSignature) {
  if (!modelUsed || !matchedOptions.length) return;
  
  console.log('[RL] Setting up reward detection for model:', modelUsed);
  
  // Monitor for success/failure indicators
  let rewardDetected = false;
  const maxWaitTime = 30000; // 30 seconds max wait
  const startTime = Date.now();
  
  const checkForReward = () => {
    if (rewardDetected) return;
    
    // Check for success indicators
    const successSelectors = [
      '[class*="correct" i]',
      '[class*="success" i]', 
      '[class*="right" i]',
      '[data-testid*="correct" i]',
      '[data-testid*="success" i]',
      '.correct-answer',
      '.answer-correct',
      '.quiz-correct',
      '.feedback-correct'
    ];
    
    // Check for failure indicators
    const failureSelectors = [
      '[class*="incorrect" i]',
      '[class*="wrong" i]',
      '[class*="error" i]',
      '[data-testid*="incorrect" i]',
      '[data-testid*="wrong" i]',
      '.incorrect-answer',
      '.answer-wrong',
      '.quiz-incorrect',
      '.feedback-incorrect'
    ];
    
    let reward = 0;
    
    // Check for success
    for (const selector of successSelectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        const text = (el.textContent || el.innerText || '').toLowerCase();
        if (text.includes('correct') || text.includes('right') || text.includes('good')) {
          reward = 1.0;
          break;
        }
      }
      if (reward > 0) break;
    }
    
    // Check for failure
    if (reward === 0) {
      for (const selector of failureSelectors) {
        const elements = document.querySelectorAll(selector);
        for (const el of elements) {
          const text = (el.textContent || el.innerText || '').toLowerCase();
          if (text.includes('incorrect') || text.includes('wrong') || text.includes('try again')) {
            reward = -1.0;
            break;
          }
        }
        if (reward < 0) break;
      }
    }
    
    // Additional heuristic: check if highlighted options are marked as correct/incorrect
    if (reward === 0) {
      for (const option of matchedOptions) {
        if (!option) continue;
        
        const parent = option.closest('[class*="answer" i], [class*="option" i], [class*="choice" i]');
        if (parent) {
          const parentText = (parent.textContent || parent.innerText || '').toLowerCase();
          if (parentText.includes('correct') || parentText.includes('right')) {
            reward = 1.0;
            break;
          } else if (parentText.includes('incorrect') || parentText.includes('wrong')) {
            reward = -1.0;
            break;
          }
        }
      }
    }
    
    // Apply reward if detected
    if (reward !== 0) {
      rewardDetected = true;
      rlUpdateReward(modelUsed, reward);
      console.log(`[RL] Reward detected: ${reward > 0 ? 'SUCCESS' : 'FAILURE'} for model ${modelUsed}`);
      return;
    }
    
    // Check timeout
    if (Date.now() - startTime > maxWaitTime) {
      rewardDetected = true;
      // Neutral reward if we couldn't determine outcome
      rlUpdateReward(modelUsed, 0.1); // Small positive reward for completing
      console.log('[RL] Timeout - neutral reward applied');
      return;
    }
    
    // Continue checking
    setTimeout(checkForReward, 1000);
  };
  
  // Start checking after a short delay to allow page to update
  setTimeout(checkForReward, 2000);
}

// Remember last visited host for auto-selecting website in Options.
try {
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local && location && location.hostname) {
    const host = location.hostname.toLowerCase();
    if (/wayground/i.test(host)) {
      chrome.storage.local.set({
        QAF_LAST_HOST: host
      });
    }
  }
} catch (err) {
  // ignore storage failures
}

const CODEHS_QUESTION_SELECTORS = [
  '#question',
  '.question-text',
  '.question',
  '.prompt',
  '.problem',
  '.problem-statement',
  '.quiz-question',
  '[data-testid*="prompt" i]',
  '[data-test*="prompt" i]',
  '[data-testid*="stem" i]'
];

const CODEHS_OPTION_SELECTORS = [
  '.choices label',
  '.choice label',
  '.choice',
  '.answer-choice',
  '.answers label',
  '.multiple-choice label',
  '.multiple-choice .choice',
  '.mc-option'
];

function isCodeHsHost() {
  const host = (location && location.hostname) ? location.hostname : '';
  return /(^|\\.)codehs\\.com$/i.test(host);
}

function isWaygroundHost() {
  const host = (location && location.hostname) ? location.hostname : '';
  console.log('[QuizAnswerFinder] Checking host:', host);
  
  // More flexible Wayground detection
  const waygroundPatterns = [
    /wayground/i,
    /wayground\.app/i,
    /wayground\.com/i,
    /localhost/i,  // For testing
    /127\.0\.0\.1/i  // For testing
  ];
  
  for (const pattern of waygroundPatterns) {
    if (pattern.test(host)) {
      console.log('[QuizAnswerFinder] Wayground host detected via hostname pattern:', pattern);
      return true;
    }
  }
  
  const ref = typeof document !== 'undefined' && document.referrer ? document.referrer : '';
  console.log('[QuizAnswerFinder] Checking referrer:', ref);
  
  for (const pattern of waygroundPatterns) {
    if (pattern.test(ref)) {
      console.log('[QuizAnswerFinder] Wayground host detected via referrer pattern:', pattern);
      return true;
    }
  }
  
  // Check page content for Wayground indicators
  const pageText = (document.body && (document.body.innerText || document.body.textContent) || '').toLowerCase();
  if (pageText.includes('wayground') || pageText.includes('quiz') || pageText.includes('question')) {
    console.log('[QuizAnswerFinder] Wayground-like content detected in page');
    return true;
  }
  
  console.log('[QuizAnswerFinder] Wayground host NOT detected - enabling anyway for testing');
  // For now, enable on any page to test functionality
  return true;
}

const RATE_LIMIT_KEY = 'QAF_RATE_LIMIT_UNTIL';
const STABILITY_KEY = 'QAF_SITE_STABILITY';
let _stabilityAll = null;
let _stabilityHost = null;
let _stabilityHostKey = '';
let _stabilitySaveTimer = null;
let _stabilityIntervalId = null;
let _stabilityIntervalMs = 2500;
let _stabilityLoopInterval = null;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function initStabilityState(res, host) {
  const map = res && res[STABILITY_KEY] && typeof res[STABILITY_KEY] === 'object'
    ? res[STABILITY_KEY]
    : {};
  _stabilityAll = map;
  _stabilityHostKey = host || '';
  if (!_stabilityHostKey) {
    _stabilityHost = null;
    _stabilityIntervalMs = 2500;
    return;
  }
  if (!map[_stabilityHostKey] || typeof map[_stabilityHostKey] !== 'object') {
    map[_stabilityHostKey] = { intervalMs: 2500, successStreak: 0, failStreak: 0 };
  }
  _stabilityHost = map[_stabilityHostKey];
  _stabilityIntervalMs = typeof _stabilityHost.intervalMs === 'number' ? _stabilityHost.intervalMs : 2500;
}

function () {
  if (_stabilitySaveTimer) return;
  _stabilitySaveTimer = setTimeout(() => {
    _stabilitySaveTimer = null;
    if (!_stabilityAll || !_stabilityHostKey) return;
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ [STABILITY_KEY]: _stabilityAll }, () => {});
    }
  }, 700);
}

function startStabilityLoop() {
  if (!isWaygroundHost()) return;
  const interval = _stabilityIntervalMs || 2500;
  if (_stabilityIntervalId && _stabilityLoopInterval === interval) return;
  if (_stabilityIntervalId) clearInterval(_stabilityIntervalId);
  _stabilityLoopInterval = interval;
  _stabilityIntervalId = setInterval(() => {
    if (document.hidden) return;
    processQuestion();
  }, interval);
}

function recordStability(success) {
  if (!_stabilityHost) return;
  if (success) {
    _stabilityHost.successStreak = (typeof _stabilityHost.successStreak === 'number' ? _stabilityHost.successStreak : 0) + 1;
    _stabilityHost.failStreak = 0;
    _stabilityHost.intervalMs = clamp((_stabilityHost.intervalMs || 2500) + 250, 1500, 6000);
  } else {
    _stabilityHost.failStreak = (typeof _stabilityHost.failStreak === 'number' ? _stabilityHost.failStreak : 0) + 1;
    _stabilityHost.successStreak = 0;
    _stabilityHost.intervalMs = clamp((_stabilityHost.intervalMs || 2500) - 250, 1000, 4000);
  }
  _stabilityIntervalMs = _stabilityHost.intervalMs;
  scheduleStabilitySave();
  startStabilityLoop();
}

function clearHighlights() {
  document.querySelectorAll('.highlight-correct').forEach((node) => {
    node.classList.remove('highlight-correct');
    // Remove inline styles we added
    node.style.backgroundColor = '';
    node.style.color = '';
    node.style.border = '';
    node.style.boxShadow = '';
    node.style.fontWeight = '';
  });
}

function applyHighlightToOption(optionEl) {
  if (optionEl) {
    optionEl.classList.add('highlight-correct');
    // Add inline styles for more visibility
    optionEl.style.cssText += `
      background-color: #28a745 !important;
      color: white !important;
      border: 2px solid #1e7e34 !important;
      box-shadow: 0 0 10px rgba(40, 167, 69, 0.5) !important;
      font-weight: bold !important;
    `;
  }
  return optionEl;
}

function formatTimeUntil(ts) {
  const now = Date.now();
  if (!ts || ts <= now) return '';
  const diff = ts - now;
  const minutes = Math.ceil(diff / 60000);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins ? `${hours}h ${mins}m` : `${hours}h`;
}

async function getRateLimitUntil() {
  return await new Promise((resolve) => {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
        resolve(0);
        return;
      }
      chrome.storage.local.get([RATE_LIMIT_KEY], (res) => {
        const val = res && typeof res[RATE_LIMIT_KEY] === 'number' ? res[RATE_LIMIT_KEY] : 0;
        resolve(val);
      });
    } catch (err) {
      resolve(0);
    }
  });
}

async function setRateLimitUntil(ts) {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;
    chrome.storage.local.set({ [RATE_LIMIT_KEY]: ts }, () => {});
  } catch (err) {
    // ignore
  }
}

async function checkRateLimitGate() {
  const until = await getRateLimitUntil();
  if (until && Date.now() < until) {
    const wait = formatTimeUntil(until);
    setStatus(wait ? `Rate limited. Try again in ${wait}.` : 'Rate limited. Try again later.', 'warn');
    return true;
  }
  return false;
}

function parseRateLimitReset(response, errJson) {
  let reset = null;
  if (response && response.headers) {
    reset = response.headers.get('x-ratelimit-reset') || response.headers.get('X-RateLimit-Reset');
  }
  if (!reset && errJson && errJson.error && errJson.error.metadata && errJson.error.metadata.headers) {
    reset = errJson.error.metadata.headers['X-RateLimit-Reset'] || errJson.error.metadata.headers['x-ratelimit-reset'];
  }
  if (!reset) return 0;
  const num = Number(reset);
  if (!Number.isFinite(num)) return 0;
  if (num > 1e12) return num;
  if (num > 1e9) return num * 1000;
  return num * 1000;
}

function uniqueSelectors(list) {
  const seen = new Set();
  const out = [];
  list.forEach((sel) => {
    if (!sel) return;
    const clean = sel.trim();
    if (!clean || seen.has(clean)) return;
    seen.add(clean);
    out.push(clean);
  });
  return out;
}

function buildSelectors(customSelector, defaults) {
  const list = [];
  if (customSelector && customSelector.trim()) list.push(customSelector.trim());
  defaults.forEach((sel) => list.push(sel));
  return uniqueSelectors(list);
}

function getElementText(el) {
  if (!el) return '';
  const text = (el.innerText || el.textContent || '').trim();
  return text;
}

function querySelectorAllDeep(selector) {
  const results = [];
  const visited = new Set();

  function search(root) {
    if (!root || visited.has(root)) return;
    visited.add(root);
    let nodes = [];
    try {
      if (root.querySelectorAll) {
        nodes = Array.from(root.querySelectorAll(selector));
      }
    } catch (err) {
      // ignore selector errors per root
    }
    if (nodes.length) results.push(...nodes);

    let all = [];
    try {
      if (root.querySelectorAll) {
        all = Array.from(root.querySelectorAll('*'));
      }
    } catch (err) {
      all = [];
    }
    all.forEach((el) => {
      if (el && el.shadowRoot) search(el.shadowRoot);
    });
  }

  search(document);
  return results;
}

function querySelectorDeep(selector) {
  try {
    const direct = document.querySelector(selector);
    if (direct) return direct;
  } catch (err) {
    // ignore
  }
  const all = querySelectorAllDeep(selector);
  return all.length ? all[0] : null;
}

function detectQuestionMedia(container) {
  if (!container) return { hasMedia: false, count: 0 };
  const mediaNodes = container.querySelectorAll('img, svg, canvas, video');
  const count = mediaNodes ? mediaNodes.length : 0;
  return { hasMedia: count > 0, count };
}

function showImageNotice(count) {
  let el = document.getElementById('qaf-image-note');
  if (!el) {
    el = document.createElement('div');
    el.id = 'qaf-image-note';
    document.documentElement.appendChild(el);
  }
  const suffix = count > 1 ? 's' : '';
  el.textContent = `Image-based question detected (${count} image${suffix}). Manual mode.`;
  el.style.display = 'block';
}

function hideImageNotice() {
  const el = document.getElementById('qaf-image-note');
  if (el) el.style.display = 'none';
}

function findQuestionNow(selectors) {
  for (const selector of selectors) {
    let el = null;
    try {
      el = document.querySelector(selector);
    } catch (err) {
      console.warn('[QuizAnswerFinder] Invalid question selector', selector, err);
      continue;
    }
    if (!el) {
      try {
        el = querySelectorDeep(selector);
      } catch (err) {
        // ignore deep query errors
      }
    }
    if (!el) continue;
    const text = getElementText(el);
    if (text) return { el, text, selector };
  }
  return null;
}

function waitForQuestion(selectors, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function check() {
      const found = findQuestionNow(selectors);
      if (found) return resolve(found);
      if (Date.now() - start > timeout) return reject('Timeout waiting for question');
      requestAnimationFrame(check);
    }
    check();
  });
}

function pickOptionText(el) {
  if (!el) return '';
  const p = el.querySelector && el.querySelector('p');
  return getElementText(p || el);
}

function isVisible(el) {
  if (!el) return false;
  return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

function findLabelForInput(input) {
  if (!input) return null;
  let label = null;
  if (input.id) {
    try {
      const escId = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(input.id) : input.id;
      label = document.querySelector(`label[for="${escId}"]`);
    } catch (err) {
      label = null;
    }
  }
  if (!label) label = input.closest('label');
  return label;
}

function isMultiSelectQuestion(questionText, optionElements) {
  const text = (questionText || '').toLowerCase();
  const multiHints = [
    'select all',
    'choose all',
    'check all',
    'click all',
    'all that apply',
    'select each',
    'choose each',
    'select any',
    'more than one',
    'one or more',
    'multiple answers',
    'multiple correct',
    'select all that apply'
  ];
  if (multiHints.some((hint) => text.includes(hint))) return true;

  const hasHintInNode = (node) => {
    if (!node) return false;
    const nodeText = (node.innerText || node.textContent || '').toLowerCase();
    return multiHints.some((hint) => nodeText.includes(hint));
  };

  let hasCheckbox = false;
  let hasRadio = false;
  (optionElements || []).forEach((el) => {
    if (!el) return;
    let input = null;
    if (el.tagName === 'INPUT') {
      input = el;
    } else if (el.querySelector) {
      input = el.querySelector('input[type="checkbox"], input[type="radio"]');
    }
    if (!input) return;
    const type = (input.getAttribute('type') || '').toLowerCase();
    if (type === 'checkbox') hasCheckbox = true;
    if (type === 'radio') hasRadio = true;
  });

  if (hasCheckbox) return true;
  if (hasRadio) return false;
  // Check for checkbox-like roles/attributes on option elements.
  let roleCheckbox = false;
  let roleRadio = false;
  (optionElements || []).forEach((el) => {
    if (!el || !el.getAttribute) return;
    const role = (el.getAttribute('role') || '').toLowerCase();
    if (role === 'checkbox') roleCheckbox = true;
    if (role === 'radio') roleRadio = true;
    if (role === 'option' && el.getAttribute('aria-checked') === 'true') {
      // still ambiguous, so don't force multi from this alone
    }
  });
  if (roleCheckbox) return true;
  if (roleRadio) return false;

  // Look for multi-select hint near the options container.
  if (optionElements && optionElements.length) {
    for (let i = 0; i < optionElements.length; i += 1) {
      let node = optionElements[i];
      for (let depth = 0; depth < 4 && node; depth += 1) {
        if (hasHintInNode(node)) return true;
        node = node.parentElement;
      }
    }
  }

  // Fallback: quick scan for a common instruction elsewhere on the page.
  const bodyText = (document.body && (document.body.innerText || document.body.textContent) || '').toLowerCase();
  if (bodyText) {
    if (bodyText.includes('select all correct options')) return true;
  }

  return false;
}

function pickBestOptionGroup(items) {
  if (!items || items.length < 2) return null;
  const groups = new Map();
  items.forEach((item) => {
    let parent = item.el ? item.el.parentElement : null;
    let depth = 0;
    while (parent && depth < 3) {
      let map = groups.get(parent);
      if (!map) {
        map = new Map();
        groups.set(parent, map);
      }
      map.set(item.el, item);
      parent = parent.parentElement;
      depth += 1;
    }
  });
  let best = null;
  groups.forEach((map) => {
    const arr = Array.from(map.values());
    if (arr.length >= 2 && arr.length <= 8) {
      if (!best || arr.length > best.length) best = arr;
    }
  });
  return best;
}

function findOptionsNow(selectors) {
  for (const selector of selectors) {
    let nodes = [];
    try {
      nodes = Array.from(document.querySelectorAll(selector));
    } catch (err) {
      console.warn('[QuizAnswerFinder] Invalid option selector', selector, err);
      continue;
    }
    if (!nodes.length) {
      try {
        nodes = querySelectorAllDeep(selector);
      } catch (err) {
        nodes = [];
      }
    }
    if (!nodes.length) continue;
    const items = nodes
      .map((el) => ({ el, text: pickOptionText(el) }))
      .filter((item) => item.text);
    if (items.length >= 2 && items.length <= 8) {
      return { elements: items.map((i) => i.el), texts: items.map((i) => i.text), selector };
    }
    const grouped = pickBestOptionGroup(items);
    if (grouped && grouped.length) {
      return { elements: grouped.map((i) => i.el), texts: grouped.map((i) => i.text), selector };
    }
  }
  const inputFallback = findOptionsByInputs();
  if (inputFallback) return inputFallback;
  return null;
}

function findOptionsByInputs() {
  let inputs = [];
  try {
    inputs = Array.from(document.querySelectorAll('input[type="radio"], input[type="checkbox"]'));
  } catch (err) {
    return null;
  }
  if (!inputs.length) return null;

  const items = inputs.map((input) => {
    const label = findLabelForInput(input);
    let text = '';
    let el = null;
    if (label) {
      text = getElementText(label);
      el = label;
    }
    if (!text) {
      const parent = input.parentElement;
      text = getElementText(parent);
      el = parent || input;
    }
    if (!text) return null;
    if (label && !isVisible(label) && isVisible(input)) {
      el = input;
    }
    return { el: el || input, text };
  }).filter(Boolean);

  if (items.length < 2) return null;
  const grouped = pickBestOptionGroup(items);
  if (grouped && grouped.length >= 2 && grouped.length <= 12) {
    return { elements: grouped.map((i) => i.el), texts: grouped.map((i) => i.text), selector: 'input[type="radio"], input[type="checkbox"]' };
  }
  if (items.length >= 2 && items.length <= 12) {
    return { elements: items.map((i) => i.el), texts: items.map((i) => i.text), selector: 'input[type="radio"], input[type="checkbox"]' };
  }
  return null;
}

async function loadSelectorSettings() {
  return await new Promise((resolve) => {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['QAF_QUESTION_SELECTOR', 'QAF_OPTION_SELECTOR', 'QAF_ENABLED', 'QAF_SITE_SELECTORS', STABILITY_KEY], (res) => {
          const host = (location && location.hostname) ? location.hostname.toLowerCase() : '';
          initStabilityState(res, host);
          startStabilityLoop();
          const siteMap = res && res.QAF_SITE_SELECTORS && typeof res.QAF_SITE_SELECTORS === 'object'
            ? res.QAF_SITE_SELECTORS
            : {};
          const siteEntry = host && siteMap && siteMap[host] ? siteMap[host] : null;
          resolve({
            questionSelector: siteEntry && siteEntry.questionSelector
              ? siteEntry.questionSelector
              : (res && res.QAF_QUESTION_SELECTOR ? res.QAF_QUESTION_SELECTOR : ''),
            optionSelector: siteEntry && siteEntry.optionSelector
              ? siteEntry.optionSelector
              : (res && res.QAF_OPTION_SELECTOR ? res.QAF_OPTION_SELECTOR : ''),
            enabled: res && typeof res.QAF_ENABLED === 'boolean' ? res.QAF_ENABLED : true
          });
        });
      } else {
        initStabilityState({}, '');
        resolve({ questionSelector: '', optionSelector: '', enabled: true });
      }
    } catch (err) {
      console.error('Error accessing chrome.storage:', err);
      initStabilityState({}, '');
      resolve({ questionSelector: '', optionSelector: '', enabled: true });
    }
  });
}

// Status overlay
const STATUS_ID = "qaf-status";
const STATUS_STATE = { message: '', level: 'info', rate: '' };

function renderStatus() {
  try {
    console.log('[QuizAnswerFinder] renderStatus called with:', STATUS_STATE);
    let el = document.getElementById(STATUS_ID);
    if (!el) {
      console.log('[QuizAnswerFinder] Creating status element');
      el = document.createElement("div");
      el.id = STATUS_ID;
      el.setAttribute("role", "status");
      el.setAttribute("aria-live", "polite");
      // Add styling to make it more visible
      const styles = [
        'position: fixed !important;',
        'top: 10px !important;',
        'right: 10px !important;',
        'background: rgba(0, 0, 0, 0.9) !important;',
        'color: white !important;',
        'padding: 8px 12px !important;',
        'border-radius: 4px !important;',
        'font-size: 12px !important;',
        'font-family: monospace !important;',
        'z-index: 999999 !important;',
        'max-width: 300px !important;',
        'word-wrap: break-word !important;',
        'border: 2px solid #ff0000 !important;',
        'box-shadow: 0 0 10px rgba(255, 0, 0, 0.5) !important;'
      ];
      el.style.cssText = styles.join(' ');
      document.documentElement.appendChild(el);
      console.log('[QuizAnswerFinder] Status element added to page');
    }
    if (!STATUS_STATE.message) {
      el.textContent = "";
      el.style.display = "none";
      console.log('[QuizAnswerFinder] Status hidden - no message');
      return;
    }
    el.style.display = "block";
    
    // Color coding based on level
    const colors = {
      'info': '#007acc',
      'ok': '#28a745', 
      'warn': '#ffc107',
      'error': '#dc3545'
    };
    el.style.borderColor = colors[STATUS_STATE.level] || '#ff0000';
    
    const rateText = STATUS_STATE.rate ? `Usage: ${STATUS_STATE.rate}` : '';
    el.textContent = rateText ? `${STATUS_STATE.message}\n${rateText}` : STATUS_STATE.message;
    console.log('[QuizAnswerFinder] Status displayed:', el.textContent);
  } catch (err) {
    console.error('[QuizAnswerFinder] Error rendering status:', err);
  }
}

function setStatus(message, level = "info") {
  STATUS_STATE.message = message || '';
  STATUS_STATE.level = level || 'info';
  renderStatus();
}

function setRateLimit(text) {
  STATUS_STATE.rate = text || '';
  renderStatus();
}

// Utility to wait for an element
function waitForElement(selector, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function check() {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      if (Date.now() - start > timeout) return reject("Timeout waiting for " + selector);
      requestAnimationFrame(check);
    }
    check();
  });
}

function getHeaderValue(headers, names) {
  for (const name of names) {
    const value = headers.get(name);
    if (value) return value;
  }
  return null;
}

function updateRateLimitFromHeaders(response) {
  try {
    const limitStr = getHeaderValue(response.headers, [
      'x-ratelimit-limit',
      'x-ratelimit-limit-requests',
      'x-ratelimit-limit-requests-day',
      'x-ratelimit-limit-requests-minute',
      'x-rate-limit-limit',
      'x-rate-limit-limit-requests'
    ]);
    const remainingStr = getHeaderValue(response.headers, [
      'x-ratelimit-remaining',
      'x-ratelimit-remaining-requests',
      'x-ratelimit-remaining-requests-day',
      'x-ratelimit-remaining-requests-minute',
      'x-rate-limit-remaining',
      'x-rate-limit-remaining-requests'
    ]);
    if (!limitStr || !remainingStr) return false;
    const limit = parseInt(limitStr, 10);
    const remaining = parseInt(remainingStr, 10);
    if (Number.isNaN(limit) || Number.isNaN(remaining)) return false;
    const used = Math.max(0, limit - remaining);
    setRateLimit(`${used}/${limit} requests`);
    return true;
  } catch (err) {
    return false;
  }
}

async function bumpDailyTokenCount(addedTokens) {
  return await new Promise((resolve) => {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
        resolve(null);
        return;
      }
      const today = new Date().toISOString().slice(0, 10);
      chrome.storage.local.get(['QAF_TOKEN_COUNT_DATE', 'QAF_TOKEN_COUNT', 'QAF_DAILY_TOKEN_CAP'], (res) => {
        let count = 0;
        let shouldUpdate = false;
        if (res && res.QAF_TOKEN_COUNT_DATE === today && typeof res.QAF_TOKEN_COUNT === 'number') {
          count = res.QAF_TOKEN_COUNT;
        } else {
          shouldUpdate = true;
        }
        if (typeof addedTokens === 'number' && Number.isFinite(addedTokens) && addedTokens > 0) {
          count += Math.floor(addedTokens);
          shouldUpdate = true;
        }
        const cap = res && typeof res.QAF_DAILY_TOKEN_CAP === 'number' ? res.QAF_DAILY_TOKEN_CAP : null;
        if (shouldUpdate) {
          chrome.storage.local.set({
            QAF_TOKEN_COUNT_DATE: today,
            QAF_TOKEN_COUNT: count
          }, () => resolve({ count, cap }));
        } else {
          resolve({ count, cap });
        }
      });
    } catch (err) {
      console.error('Error updating local token count:', err);
      resolve(null);
    }
  });
}

// Main logic for processing a question
async function processQuestion() {
  console.log('[QuizAnswerFinder] === processQuestion() called ===');
  
  if (!isWaygroundHost()) {
    console.log('[QuizAnswerFinder] Not Wayground host, but forcing for testing');
    // Don't return - continue for testing
  // return;
  }
  
  if (window._isProcessingQuestion) {
    console.log('[QuizAnswerFinder] Already processing question - skipping');
    return;
  }
  window._isProcessingQuestion = true;
  console.log('[QuizAnswerFinder] Looking for question...');
  setStatus('Looking for question...', 'info');

  try {
    console.log('[QuizAnswerFinder] Loading selector settings...');
    const selectorSettings = await loadSelectorSettings();
    console.log('[QuizAnswerFinder] Selector settings:', selectorSettings);
    
    if (!selectorSettings.enabled) {
      console.log('[QuizAnswerFinder] Extension disabled in settings');
      setStatus('Extension disabled.', 'info');
      return;
    }

    // Initialize RL state once per page load
    if (!_rlInitialized) {
      await rlLoad();
      // Wait a bit for async loading to complete
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const codehs = isCodeHsHost();
    const questionDefaults = codehs ? DEFAULT_QUESTION_SELECTORS.concat(CODEHS_QUESTION_SELECTORS) : DEFAULT_QUESTION_SELECTORS;
    const optionDefaults = codehs ? DEFAULT_OPTION_SELECTORS.concat(CODEHS_OPTION_SELECTORS) : DEFAULT_OPTION_SELECTORS;
    const questionSelectors = buildSelectors(selectorSettings.questionSelector, questionDefaults);
    const optionSelectors = buildSelectors(selectorSettings.optionSelector, optionDefaults);

    let questionInfo = findQuestionNow(questionSelectors);
    if (!questionInfo) {
      try {
        questionInfo = await waitForQuestion(questionSelectors, 5000);
      } catch (err) {
        console.warn('[QuizAnswerFinder] Question not found via DOM. Falling back to vision scan.', err);
        setStatus('Question not found. Trying vision scan...', 'warn');
        recordStability(false);
        try {
          if (typeof chrome !== 'undefined' && chrome.runtime) {
            chrome.runtime.sendMessage({ action: 'captureAndAnswer' }, () => {
              if (chrome.runtime.lastError) return;
            });
          }
        } catch (e) { /* ignore */ }
        return;
      }
    }

    const question = questionInfo && questionInfo.text ? questionInfo.text : '';
    if (!question) {
      console.warn('[QuizAnswerFinder] Question element found but empty.');
      setStatus('Question found but empty.', 'warn');
      recordStability(false);
      return;
    }
    console.log('[QuizAnswerFinder] Question found:', question);

    const mediaInfo = detectQuestionMedia(questionInfo.el);
    if (mediaInfo.hasMedia) {
      showImageNotice(mediaInfo.count);
      setStatus('Image-based question detected. Answer manually.', 'warn');
      recordStability(true);
      return;
    }
    hideImageNotice();

    const optionsInfo = findOptionsNow(optionSelectors);
    if (!optionsInfo || !optionsInfo.elements || !optionsInfo.elements.length) {
      console.warn('[QuizAnswerFinder] No options found.');
      setStatus('No options found. Update selector in Options.', 'warn');
      recordStability(false);
      return;
    }

    const allOptions = optionsInfo.elements;
    const options = allOptions.map((btn, i) => {
      const text = pickOptionText(btn);
      console.log(`[QuizAnswerFinder] Option ${i + 1}: ${text}`);
      return text;
    });

    const signature = `${question}||${options.join(' | ')}`;
    const now = Date.now();
    const sameSignature = signature === window._lastProcessedSignature;
    const lastProcessedAt = window._lastProcessedAt || 0;
    if (sameSignature && now - lastProcessedAt < 45000) {
      return;
    }
    window._lastProcessedSignature = signature;
    window._lastProcessedAt = now;
    recordStability(true);

    // RL: pick the model UCB1 currently recommends
    const rlModel = _rlInitialized ? rlGetModel() : null;
    if (rlModel) {
      console.log('[QuizAnswerFinder] RL selected model:', rlModel);
      setStatus(`RL model: ${rlModel.split('/')[1] || rlModel}`, 'info');
    }

    const correctAnswer = await fetchCorrectAnswerFromChatGPT(question, options, rlModel);
    const modelUsed = _lastModelUsed;
    console.log('[QuizAnswerFinder] Correct Answer:', correctAnswer, '| Model:', modelUsed);

    if (!correctAnswer) return;

    // Strip prefix (e.g., "A. ") if present
    const normalizedCorrect = normalize(correctAnswer);
    const strippedAnswer = correctAnswer.replace(/^[A-Da-d]\.\s*/, '').trim();
    const normalizedStripped = normalize(strippedAnswer);
    const answerParts = splitAnswerIntoParts(correctAnswer);
    const normalizedParts = Array.from(new Set([normalizedCorrect, normalizedStripped, ...answerParts.map((p) => normalize(p))].filter(Boolean)));
    const letterIndices = extractLetterIndices(correctAnswer, allOptions.length);

    const allowMulti = isMultiSelectQuestion(question, allOptions);
    let matched = false;
    const matchedOptions = [];
    const matchedCandidates = [];

    // Remove previous highlights
    clearHighlights();

    allOptions.forEach((btn, i) => {
      const optionText = pickOptionText(btn);
      if (!optionText) return;

      const normalizedOption = normalize(optionText);
      const normalizedOptionSingular = singularizePhrase(normalizedOption);
      let isMatch = false;
      let score = 0;

      if (letterIndices.has(i)) {
        isMatch = true;
        score = Math.max(score, 3);
      } else {
        for (const part of normalizedParts) {
          if (!part || part.length < 1) continue;
          const partSingular = singularizePhrase(part);
          if (part === normalizedOption || part === normalizedOptionSingular || partSingular === normalizedOption) {
            isMatch = true;
            score = Math.max(score, 2);
            break;
          }
          if (containsWord(part, normalizedOption) || containsWord(part, normalizedOptionSingular)) {
            isMatch = true;
            score = Math.max(score, 1);
            break;
          }
          if (part.length >= 4 && containsWord(normalizedOption, part)) {
            isMatch = true;
            score = Math.max(score, 1);
            break;
          }
          if (part.length >= 4 && containsWord(normalizedOptionSingular, partSingular)) {
            isMatch = true;
            score = Math.max(score, 1);
            break;
          }
        }
      }

      if (isMatch) {
        matchedCandidates.push({ btn, score, index: i, text: optionText });
        matched = true;
      }
    });

    if (!matched) {
      console.warn('[QuizAnswerFinder] No exact match found. Model output may be formatted.');
      setStatus('No exact match found.', 'warn');
    } else {
      let chosen = matchedCandidates;
      if (!allowMulti && matchedCandidates.length > 1) {
        chosen = matchedCandidates
          .slice()
          .sort((a, b) => (b.score - a.score) || (a.index - b.index))
          .slice(0, 1);
      }

      chosen.forEach((item) => {
        applyHighlightToOption(item.btn);
        matchedOptions.push(item.btn);
        console.log(`[QuizAnswerFinder] Highlighted Option ${item.index + 1}: ${item.text}`);
      });

      if (allowMulti) {
        setStatus('Answer highlighted. Multi-select: click Submit to continue.', 'ok');
      } else {
        setStatus('Answer highlighted.', 'ok');
      }

      // Auto-click after 3 seconds
      if (chosen.length) {
        setTimeout(() => {
          chosen.forEach((item) => item.btn.click());
          console.log('[QuizAnswerFinder] Auto-clicked correct option');
        }, 3000);
      }

      // RL reward detection — watches outcome to improve model selection
      if (_rlInitialized && modelUsed) {
        rlSetupRewardDetection(modelUsed, matchedOptions.slice(), signature);
      }

    }

  } catch (error) {
    console.error('[QuizAnswerFinder] Error processing question:', error);
    setStatus('Error processing question.', 'error');
  } finally {
    window._isProcessingQuestion = false;
  }
}

// Function to fetch answer from model
let _lastModelUsed = null;
async function fetchCorrectAnswerFromChatGPT(question, options, overrideModel) {
  const prompt = `Question: ${question}
Options:
${options.map((opt, i) => String.fromCharCode(65 + i) + `. ${opt}`).join('
')}

Which option is correct? Just return the full text of the correct option.`;

  // Avoid flooding the API with concurrent requests
  if (window._isFetchingAnswer) {
    console.log('[QuizAnswerFinder] Fetch already in progress - skipping');
    setStatus('Request already in progress.', 'info');
    return null;
  }
  window._isFetchingAnswer = true;

  try {
    if (await checkRateLimitGate()) {
      return null;
    }

    const DEFAULT_PROVIDER = 'openrouter';
    const DEFAULT_OPENROUTER_MODEL = 'openrouter/free';
    const DEFAULT_DEEPSEEK_MODEL = 'deepseek-chat';

    // Retrieve provider settings from chrome.storage.local
    const settings = await new Promise((resolve) => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get([
            'QAF_PROVIDER',
            'OPENROUTER_API_KEY',
            'OPENAI_API_KEY',
            'OPENROUTER_MODEL',
            'OPENROUTER_MODEL_SECONDARY',
            'OPENROUTER_SITE_URL',
            'OPENROUTER_APP_NAME',
            'DEEPSEEK_API_KEY',
            'DEEPSEEK_MODEL'
          ], (res) => {
            resolve({
              provider: res && res.QAF_PROVIDER ? res.QAF_PROVIDER : DEFAULT_PROVIDER,
              apiKey: res && res.OPENROUTER_API_KEY ? res.OPENROUTER_API_KEY : (res && res.OPENAI_API_KEY ? res.OPENAI_API_KEY : null),
              model: res && res.OPENROUTER_MODEL ? res.OPENROUTER_MODEL : DEFAULT_OPENROUTER_MODEL,
              modelSecondary: res && res.OPENROUTER_MODEL_SECONDARY ? res.OPENROUTER_MODEL_SECONDARY : '',
              siteUrl: res && res.OPENROUTER_SITE_URL ? res.OPENROUTER_SITE_URL : '',
              appName: res && res.OPENROUTER_APP_NAME ? res.OPENROUTER_APP_NAME : '',
              deepseekKey: res && res.DEEPSEEK_API_KEY ? res.DEEPSEEK_API_KEY : null,
              deepseekModel: res && res.DEEPSEEK_MODEL ? res.DEEPSEEK_MODEL : DEFAULT_DEEPSEEK_MODEL
            });
          });
        } else {
          resolve({
            provider: DEFAULT_PROVIDER,
            apiKey: null,
            model: DEFAULT_OPENROUTER_MODEL,
            modelSecondary: '',
            siteUrl: '',
            appName: '',
            deepseekKey: null,
            deepseekModel: DEFAULT_DEEPSEEK_MODEL
          });
        }
      } catch (err) {
        console.error('Error accessing chrome.storage:', err);
        resolve({
          provider: DEFAULT_PROVIDER,
          apiKey: null,
          model: DEFAULT_OPENROUTER_MODEL,
          modelSecondary: '',
          siteUrl: '',
          appName: '',
          deepseekKey: null,
          deepseekModel: DEFAULT_DEEPSEEK_MODEL
        });
      }
    });

    const provider = settings.provider || DEFAULT_PROVIDER;
    const providerLabel = provider === 'deepseek'
      ? 'DeepSeek'
      : (provider === 'all' ? 'All Providers' : 'OpenRouter');
    let activeKey = settings.apiKey;
    if (provider === 'deepseek') activeKey = settings.deepseekKey;
    if (provider === 'all') activeKey = settings.apiKey || settings.deepseekKey;

    if (!activeKey) {
      const missingMessage = provider === 'all'
        ? 'OpenRouter or DeepSeek API key missing. Open Options to set them.'
        : `${providerLabel} API key missing. Open Options to set it.`;
      console.error(`${providerLabel} API key not found. Set the key in Options before using this extension.`);
      setStatus(missingMessage, 'error');
      try {
        if (chrome && chrome.runtime && chrome.runtime.openOptionsPage) {
          // Open the options page so the user can enter the API key.
          chrome.runtime.openOptionsPage();
        }
      } catch (err) {
        // ignore failures (e.g., in non-extension contexts)
      }
      return null;
    }

    const maxRetries = 3;
    const baseDelayMs = 800;
    const maxDelayMs = 8000;
    const minIntervalMs = 1200;
    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    const now = Date.now();
    const lastAt = window._lastRequestAt || 0;
    const waitMs = Math.max(0, minIntervalMs - (now - lastAt));
    if (waitMs > 0) {
      setStatus('Throttling requests...', 'info');
      await sleep(waitMs);
    }
    window._lastRequestAt = Date.now();

    const requestOpenRouter = async (modelToUse) => {
      // Add model to RL tracking if not already tracked
      if (_rlInitialized && modelToUse) {
        rlAddModel(modelToUse);
      }
      
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`
      };
      if (settings.siteUrl) headers['HTTP-Referer'] = settings.siteUrl;
      if (settings.appName) headers['X-OpenRouter-Title'] = settings.appName;

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) {
          const delayMs = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
          setStatus(`Retrying in ${Math.ceil(delayMs / 1000)}s...`, 'warn');
          await sleep(delayMs);
        }

        console.log('[QuizAnswerFinder] Sending prompt to OpenRouter');
        setStatus('Sending request to OpenRouter...', 'info');
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: modelToUse,
            messages: [{ role: 'user', content: prompt }]
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log('[QuizAnswerFinder] OpenRouter response:', data);
          let usageTokens = null;
          if (data && data.usage) {
            if (typeof data.usage.total_tokens === 'number') {
              usageTokens = data.usage.total_tokens;
            } else {
              const promptTokens = typeof data.usage.prompt_tokens === 'number' ? data.usage.prompt_tokens : 0;
              const completionTokens = typeof data.usage.completion_tokens === 'number' ? data.usage.completion_tokens : 0;
              const sum = promptTokens + completionTokens;
              if (sum > 0) usageTokens = sum;
            }
          }

          let usageSet = false;
          if (typeof usageTokens === 'number' && Number.isFinite(usageTokens)) {
            const tokenInfo = await bumpDailyTokenCount(usageTokens);
            if (tokenInfo && typeof tokenInfo.count === 'number') {
              const cap = typeof tokenInfo.cap === 'number' && tokenInfo.cap > 0 ? tokenInfo.cap : null;
              setRateLimit(cap ? `${tokenInfo.count}/${cap} tokens` : `${tokenInfo.count} tokens`);
              usageSet = true;
            }
          }

          if (!usageSet) {
            updateRateLimitFromHeaders(response);
          }

          return { answer: data?.choices?.[0]?.message?.content.trim() || null, model: modelToUse };
        }

        let errText = null;
        try {
          errText = await response.text();
        } catch (err) {
          errText = '<no body>';
        }

        let errJson = null;
        try {
          errJson = errText ? JSON.parse(errText) : null;
        } catch (err) {
          errJson = null;
        }

        const errorCode = errJson && errJson.error ? errJson.error.code : null;
        const errorMessage = errJson && errJson.error && errJson.error.message ? errJson.error.message : errText;
        console.error('[QuizAnswerFinder] OpenRouter API error', response.status, errorMessage);

        if (response.status === 429 || response.status === 503) {
          if (response.status === 429) {
            const resetAt = parseRateLimitReset(response, errJson);
            if (resetAt) {
              await setRateLimitUntil(resetAt);
            } else {
              await setRateLimitUntil(Date.now() + 15 * 60 * 1000);
            }
          }
          if (errorCode === 'insufficient_quota') {
            setStatus('Quota or free-tier limit reached.', 'error');
            return null;
          }

          if (attempt < maxRetries) {
            const retryAfter = response.headers.get('retry-after');
            let delayMs = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
            if (retryAfter) {
              const parsed = Number(retryAfter);
              if (!Number.isNaN(parsed)) {
                delayMs = Math.max(delayMs, parsed * 1000);
              }
            }
            delayMs = Math.min(maxDelayMs, delayMs + Math.floor(Math.random() * 250));
            setStatus(`Rate limited. Retrying in ${Math.ceil(delayMs / 1000)}s...`, 'warn');
            await sleep(delayMs);
            continue;
          }
        }

        const cleanMessage = (errorMessage || '').toString().slice(0, 160);
        setStatus(`OpenRouter API error ${response.status}. ${cleanMessage}`, 'error');
        return null;
      }

      setStatus('Rate limit persists. Try again later.', 'error');
      return null;
    };

    const requestDeepSeek = async (modelToUse) => {
      // Add model to RL tracking if not already tracked
      if (_rlInitialized && modelToUse) {
        rlAddModel(modelToUse);
      }
      
      console.log('[QuizAnswerFinder] DeepSeek settings check:', {
        hasKey: !!settings.deepseekKey,
        keyLength: settings.deepseekKey ? settings.deepseekKey.length : 0
      });
      
      if (!settings.deepseekKey) {
        console.log('[QuizAnswerFinder] No DeepSeek API key available');
        setStatus('DeepSeek API key missing. Open Options to set it.', 'error');
        return null;
      }
      
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.deepseekKey}`
      };

      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) {
          const delayMs = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
          setStatus(`Retrying in ${Math.ceil(delayMs / 1000)}s...`, 'warn');
          await sleep(delayMs);
        }

        console.log('[QuizAnswerFinder] Sending prompt to DeepSeek');
        setStatus('Sending request to DeepSeek...', 'info');
        const response = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: modelToUse,
            messages: [{ role: 'user', content: prompt }]
          })
        });

        if (response.ok) {
          const data = await response.json();
          console.log('[QuizAnswerFinder] DeepSeek response:', data);
          let usageTokens = null;
          if (data && data.usage) {
            if (typeof data.usage.total_tokens === 'number') {
              usageTokens = data.usage.total_tokens;
            } else {
              const promptTokens = typeof data.usage.prompt_tokens === 'number' ? data.usage.prompt_tokens : 0;
              const completionTokens = typeof data.usage.completion_tokens === 'number' ? data.usage.completion_tokens : 0;
              const sum = promptTokens + completionTokens;
              if (sum > 0) usageTokens = sum;
            }
          }

          let usageSet = false;
          if (typeof usageTokens === 'number' && Number.isFinite(usageTokens)) {
            const tokenInfo = await bumpDailyTokenCount(usageTokens);
            if (tokenInfo && typeof tokenInfo.count === 'number') {
              const cap = typeof tokenInfo.cap === 'number' && tokenInfo.cap > 0 ? tokenInfo.cap : null;
              setRateLimit(cap ? `${tokenInfo.count}/${cap} tokens` : `${tokenInfo.count} tokens`);
              usageSet = true;
            }
          }

          if (!usageSet) {
            updateRateLimitFromHeaders(response);
          }

          return { answer: data?.choices?.[0]?.message?.content.trim() || null, model: modelToUse };
        }

        let errText = null;
        try {
          errText = await response.text();
        } catch (err) {
          errText = '<no body>';
        }

        let errJson = null;
        try {
          errJson = errText ? JSON.parse(errText) : null;
        } catch (err) {
          errJson = null;
        }

        const errorMessage = errJson && errJson.error && errJson.error.message ? errJson.error.message : errText;
        console.error('[QuizAnswerFinder] DeepSeek API error', response.status, errorMessage);

        if (response.status === 429 || response.status === 503) {
          if (response.status === 429) {
            const resetAt = parseRateLimitReset(response, errJson);
            if (resetAt) {
              await setRateLimitUntil(resetAt);
            } else {
              await setRateLimitUntil(Date.now() + 15 * 60 * 1000);
            }
          }

          if (attempt < maxRetries) {
            const retryAfter = response.headers.get('retry-after');
            let delayMs = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt));
            if (retryAfter) {
              const parsed = Number(retryAfter);
              if (!Number.isNaN(parsed)) {
                delayMs = Math.max(delayMs, parsed * 1000);
              }
            }
            delayMs = Math.min(maxDelayMs, delayMs + Math.floor(Math.random() * 250));
            setStatus(`Rate limited. Retrying in ${Math.ceil(delayMs / 1000)}s...`, 'warn');
            await sleep(delayMs);
            continue;
          }
        }

        const cleanMessage = (errorMessage || '').toString().slice(0, 160);
        setStatus(`${providerLabel} API error ${response.status}. ${cleanMessage}`, 'error');
        return null;
      }

      setStatus('Rate limit persists. Try again later.', 'error');
      return null;
    };

    const buildOpenRouterModelOrder = () => {
      const ordered = [];
      const pushUnique = (modelId) => {
        if (!modelId || ordered.includes(modelId)) return;
        ordered.push(modelId);
      };
      
      // Prioritize RL-selected model
      pushUnique(overrideModel);
      
      // Add user-configured models
      pushUnique(settings.model || DEFAULT_OPENROUTER_MODEL);
      pushUnique(settings.modelSecondary);
      
      // Add other high-performing models from RL stats if available
      if (_rlInitialized && _rlModels.length > 0) {
        // Sort models by their average reward (descending)
        const sortedModels = _rlModels
          .filter(model => model.startsWith('openrouter/'))
          .map(model => ({
            id: model,
            avgReward: _rlStats[model].rewards > 0 ? _rlStats[model].totalReward / _rlStats[model].rewards : 0
          }))
          .sort((a, b) => b.avgReward - a.avgReward);
        
        // Add top performing models that aren't already in the list
        sortedModels.forEach(({ id }) => pushUnique(id));
      }
      
      return ordered;
    };

    const tryOpenRouterInOrder = async (models) => {
      for (let i = 0; i < models.length; i += 1) {
        if (i > 0) {
          setStatus(`Primary model failed. Trying next model (${i + 1}/${models.length})...`, 'warn');
        }
        const res = await requestOpenRouter(models[i]);
        if (res && res.answer) return res;
      }
      return null;
    };

    if (provider === 'deepseek') {
      if (!settings.deepseekKey) return null;
      const modelToUse = settings.deepseekModel || DEFAULT_DEEPSEEK_MODEL;
      const result = await requestDeepSeek(modelToUse);
      _lastModelUsed = result ? result.model : modelToUse;
      return result ? result.answer : null;
    }

    const openrouterModels = buildOpenRouterModelOrder();

    if (provider === 'openrouter') {
      if (!settings.apiKey || !openrouterModels.length) return null;
      const result = await tryOpenRouterInOrder(openrouterModels);
      _lastModelUsed = result ? result.model : openrouterModels[0];
      return result ? result.answer : null;
    }

    if (provider === 'all') {
      let result = null;
      if (settings.apiKey && openrouterModels.length) {
        result = await tryOpenRouterInOrder(openrouterModels);
      }
      if (!result && settings.deepseekKey) {
        setStatus('OpenRouter models failed. Trying DeepSeek...', 'warn');
        const modelToUse = settings.deepseekModel || DEFAULT_DEEPSEEK_MODEL;
        result = await requestDeepSeek(modelToUse);
      }
      if (!result) return null;
      _lastModelUsed = result.model;
      return result.answer;
    }

    return null;
  } catch (err) {
    console.error('[QuizAnswerFinder] Fetch error:', err);
    setStatus('Network error (see console).', 'error');
    return null;
  } finally {
    // allow subsequent requests
    window._isFetchingAnswer = false;
  }
}

// Observe page for new questions
let _observerScheduled = false;
const observer = new MutationObserver(() => {
  if (_observerScheduled) return;
  _observerScheduled = true;
  requestAnimationFrame(() => {
    _observerScheduled = false;
    processQuestion();
  });
});

console.log('[QuizAnswerFinder] Script loaded. Checking if Wayground host...');
console.log('[QuizAnswerFinder] Current URL:', window.location.href);
console.log('[QuizAnswerFinder] Hostname:', window.location.hostname);
console.log('[QuizAnswerFinder] Document ready state:', document.readyState);

// Force immediate status display for testing
setStatus('Extension loaded - testing mode', 'info');

if (isWaygroundHost()) {
  console.log('[QuizAnswerFinder] Starting observer and processing for Wayground');
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Try once on initial load in case the question is already present.
  setTimeout(() => {
    console.log('[QuizAnswerFinder] Initial question processing attempt');
    processQuestion();
  }, 0);

  setStatus('Waiting for question...', 'info');
  console.log('[QuizAnswerFinder] Extension loaded and watching for new questions...');
  startStabilityLoop();
} else {
  console.log('[QuizAnswerFinder] Not a Wayground host - but activating anyway for testing');
  // Force activation for testing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  setTimeout(() => {
    console.log('[QuizAnswerFinder] Initial question processing attempt (forced)');
    processQuestion();
  }, 0);

  // Add a simple test button to verify script is working
  setTimeout(() => {
    try {
      const testBtn = document.createElement('button');
      testBtn.textContent = 'Test Extension';
      testBtn.style.cssText = `
        position: fixed !important;
        top: 50px !important;
        left: 10px !important;
        z-index: 999999 !important;
        background: #007acc !important;
        color: white !important;
        border: none !important;
        padding: 10px !important;
        border-radius: 5px !important;
        cursor: pointer !important;
      `;
      testBtn.onclick = () => {
        console.log('[QuizAnswerFinder] Test button clicked!');
        alert('Extension is working! Check console for debug messages.');
        processQuestion(); // Try to process a question
      };
      document.body.appendChild(testBtn);
      console.log('[QuizAnswerFinder] Test button added');
    } catch (err) {
      console.error('[QuizAnswerFinder] Failed to add test button:', err);
    }
  }, 2000);

  setStatus('Extension active - testing mode', 'info');
  console.log('[QuizAnswerFinder] Extension loaded in testing mode');
  startStabilityLoop();
}
