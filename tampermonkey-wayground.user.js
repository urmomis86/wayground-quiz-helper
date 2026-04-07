// ==UserScript==
// @name         Wayground Answer Highlighter
// @namespace    https://wayground.com/
// @version      0.1.0
// @description  Highlight suggested answers on Wayground using OpenRouter.
// @match        *://wayground.com/*
// @match        *://*.wayground.com/*
// @run-at       document-end
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// @connect      openrouter.ai
// @connect      api.deepseek.com
// ==/UserScript==

(function () {
  'use strict';

  if (!/wayground/i.test(location.hostname)) return;

  const DEFAULT_QUESTION_SELECTORS = [
    '[data-testid="question-container-text"] p',
    '[data-testid*="question" i] p',
    '[data-testid*="question" i]',
    '[data-cy*="question" i]',
    '[data-test*="question" i]',
    '[class*="question" i] p',
    '[class*="question" i]',
    'main h1',
    'main h2',
    '[role="heading"]'
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

  const STATUS_ID = 'qaf-status-tm';
  const HIGHLIGHT_CLASS = 'qaf-highlight-tm';
  const STATE = { message: '', level: 'info' };

  GM_addStyle(`
    #${STATUS_ID} {
      position: fixed;
      bottom: 14px;
      right: 14px;
      z-index: 99999;
      background: rgba(20, 20, 20, 0.92);
      color: #fff;
      padding: 10px 12px;
      border-radius: 8px;
      font-size: 12px;
      line-height: 1.35;
      font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      max-width: 300px;
      white-space: pre-line;
      box-shadow: 0 6px 18px rgba(0,0,0,0.25);
    }
    #${STATUS_ID}[data-level="warn"] { background: rgba(120, 80, 10, 0.92); }
    #${STATUS_ID}[data-level="error"] { background: rgba(140, 20, 20, 0.92); }
    #${STATUS_ID}[data-level="ok"] { background: rgba(10, 120, 70, 0.92); }
    .${HIGHLIGHT_CLASS} {
      outline: 3px solid #23d18b !important;
      background: rgba(35, 209, 139, 0.18) !important;
      border-radius: 10px !important;
    }
  `);

  function renderStatus() {
    let el = document.getElementById(STATUS_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = STATUS_ID;
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      document.documentElement.appendChild(el);
    }
    if (!STATE.message) {
      el.textContent = '';
      el.style.display = 'none';
      return;
    }
    el.style.display = 'block';
    el.dataset.level = STATE.level || 'info';
    el.textContent = STATE.message;
  }

  function setStatus(message, level = 'info') {
    STATE.message = message || '';
    STATE.level = level;
    renderStatus();
  }

  function normalize(str) {
    return (str || '').toLowerCase().replace(/[^\w\s]/gi, '').trim();
  }

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
    return (text || '').replace(/^[A-Ea-e]\s*[\).:-]\s*/, '').trim();
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

  function getElementText(el) {
    if (!el) return '';
    return (el.innerText || el.textContent || '').trim();
  }

  function isVisible(el) {
    return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  }

  function querySelectorAllDeep(selector) {
    const results = [];
    const visited = new Set();
    function search(root) {
      if (!root || visited.has(root)) return;
      visited.add(root);
      let nodes = [];
      try {
        if (root.querySelectorAll) nodes = Array.from(root.querySelectorAll(selector));
      } catch (err) {
        nodes = [];
      }
      if (nodes.length) results.push(...nodes);
      let all = [];
      try {
        if (root.querySelectorAll) all = Array.from(root.querySelectorAll('*'));
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

  function findQuestionNow(selectors) {
    for (const selector of selectors) {
      let el = null;
      try {
        el = document.querySelector(selector);
      } catch (err) {
        continue;
      }
      if (!el) el = querySelectorDeep(selector);
      if (!el) continue;
      const text = getElementText(el);
      if (text) return { el, text };
    }
    return null;
  }

  function findOptionsNow(selectors) {
    const elements = [];
    for (const selector of selectors) {
      let nodes = [];
      try {
        nodes = Array.from(document.querySelectorAll(selector));
      } catch (err) {
        nodes = [];
      }
      if (!nodes.length) {
        try {
          nodes = querySelectorAllDeep(selector);
        } catch (err) {
          nodes = [];
        }
      }
      nodes.forEach((node) => {
        if (!node || elements.includes(node)) return;
        if (!isVisible(node)) return;
        const text = getElementText(node);
        if (text) elements.push(node);
      });
      if (elements.length) break;
    }
    return elements;
  }

  function pickOptionText(el) {
    if (!el) return '';
    const p = el.querySelector && el.querySelector('p');
    return getElementText(p || el);
  }

  function clearHighlights() {
    document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach((node) => {
      node.classList.remove(HIGHLIGHT_CLASS);
    });
  }

  function applyHighlight(el) {
    if (!el) return;
    el.classList.add(HIGHLIGHT_CLASS);
  }

  async function getSettings() {
    const provider = await GM_getValue('QAF_PROVIDER', 'openrouter');
    const apiKey = await GM_getValue('OPENROUTER_API_KEY', '');
    const model = await GM_getValue('OPENROUTER_MODEL', 'openrouter/free');
    const modelSecondary = await GM_getValue('OPENROUTER_MODEL_SECONDARY', '');
    const siteUrl = await GM_getValue('OPENROUTER_SITE_URL', location.origin);
    const appName = await GM_getValue('OPENROUTER_APP_NAME', 'Wayground Tampermonkey');
    const deepseekKey = await GM_getValue('DEEPSEEK_API_KEY', '');
    const deepseekModel = await GM_getValue('DEEPSEEK_MODEL', 'deepseek-chat');
    return { provider, apiKey, model, modelSecondary, siteUrl, appName, deepseekKey, deepseekModel };
  }

  async function fetchCorrectAnswer(question, options) {
    const settings = await getSettings();
    const provider = settings.provider || 'openrouter';
    const providerLabel = provider === 'deepseek' ? 'DeepSeek' : (provider === 'all' ? 'All Providers' : 'OpenRouter');
    const hasOpenRouterKey = !!settings.apiKey;
    const hasDeepSeekKey = !!settings.deepseekKey;

    if (provider === 'openrouter' && !hasOpenRouterKey) {
      setStatus('OpenRouter API key missing. Use the menu to set it.', 'error');
      return null;
    }
    if (provider === 'deepseek' && !hasDeepSeekKey) {
      setStatus('DeepSeek API key missing. Use the menu to set it.', 'error');
      return null;
    }
    if (provider === 'all' && !hasOpenRouterKey && !hasDeepSeekKey) {
      setStatus('OpenRouter or DeepSeek API key missing. Use the menu to set them.', 'error');
      return null;
    }

    const prompt = `Question: ${question}
Options:
${options.map((opt, i) => String.fromCharCode(65 + i) + `. ${opt}`).join('
')}

Which option is correct? Just return the full text of the correct option.`;

    const requestOpenRouter = async (modelToUse) => {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.apiKey}`
      };
      if (settings.siteUrl) headers['HTTP-Referer'] = settings.siteUrl;
      if (settings.appName) headers['X-OpenRouter-Title'] = settings.appName;

      setStatus('Sending request to OpenRouter...', 'info');
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: modelToUse,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        const text = await response.text();
        setStatus(`OpenRouter API error ${response.status}.`, 'error');
        console.error('[Wayground TM] API error', response.status, text);
        return null;
      }

      const data = await response.json();
      return { answer: data?.choices?.[0]?.message?.content?.trim() || null, model: modelToUse };
    };

    const requestDeepSeek = async (modelToUse) => {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${settings.deepseekKey}`
      };

      setStatus('Sending request to DeepSeek...', 'info');
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: modelToUse,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      if (!response.ok) {
        const text = await response.text();
        setStatus(`DeepSeek API error ${response.status}.`, 'error');
        console.error('[Wayground TM] DeepSeek API error', response.status, text);
        return null;
      }

      const data = await response.json();
      return { answer: data?.choices?.[0]?.message?.content?.trim() || null, model: modelToUse };
    };

    const buildOpenRouterModelOrder = () => {
      const ordered = [];
      const pushUnique = (modelId) => {
        if (!modelId || ordered.includes(modelId)) return;
        ordered.push(modelId);
      };
      pushUnique(settings.model || 'openrouter/free');
      pushUnique(settings.modelSecondary);
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
      if (!hasDeepSeekKey) return null;
      const modelToUse = settings.deepseekModel || 'deepseek-chat';
      const result = await requestDeepSeek(modelToUse);
      return result ? result.answer : null;
    }

    const openrouterModels = buildOpenRouterModelOrder();

    if (provider === 'openrouter') {
      if (!hasOpenRouterKey || !openrouterModels.length) return null;
      const result = await tryOpenRouterInOrder(openrouterModels);
      return result ? result.answer : null;
    }

    if (provider === 'all') {
      let result = null;
      if (hasOpenRouterKey && openrouterModels.length) {
        result = await tryOpenRouterInOrder(openrouterModels);
      }
      if (!result && hasDeepSeekKey) {
        setStatus('OpenRouter models failed. Trying DeepSeek...', 'warn');
        const modelToUse = settings.deepseekModel || 'deepseek-chat';
        result = await requestDeepSeek(modelToUse);
      }
      return result ? result.answer : null;
    }

    return null;
  }

  async function processQuestion() {
    if (window._tmProcessing) return;
    window._tmProcessing = true;
    setStatus('Looking for question...', 'info');

    try {
      const questionInfo = findQuestionNow(DEFAULT_QUESTION_SELECTORS);
      if (!questionInfo || !questionInfo.text) {
        setStatus('Question not found yet.', 'warn');
        return;
      }

      const optionsEls = findOptionsNow(DEFAULT_OPTION_SELECTORS);
      if (!optionsEls.length) {
        setStatus('No options found yet.', 'warn');
        return;
      }

      const options = optionsEls.map((el) => pickOptionText(el));
      const signature = `${questionInfo.text}||${options.join(' | ')}`;
      const now = Date.now();
      if (signature === window._tmLastSignature && now - (window._tmLastAt || 0) < 45000) {
        return;
      }
      window._tmLastSignature = signature;
      window._tmLastAt = now;

      const answer = await fetchCorrectAnswer(questionInfo.text, options);
      if (!answer) return;

      clearHighlights();
      const normalizedAnswer = normalize(answer);
      const parts = splitAnswerIntoParts(answer).map((p) => normalize(p));
      const letterIndices = extractLetterIndices(answer, optionsEls.length);

      const matches = [];
      optionsEls.forEach((el, idx) => {
        const optionText = pickOptionText(el);
        const normalizedOption = normalize(optionText);
        const normalizedOptionSingular = singularizePhrase(normalizedOption);
        let score = 0;

        if (letterIndices.has(idx)) {
          score = 3;
        } else if (normalizedAnswer === normalizedOption || normalizedAnswer === normalizedOptionSingular) {
          score = 2;
        } else {
          for (const part of parts) {
            if (!part) continue;
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
          }
        }

        if (score > 0) matches.push({ el, score, idx, text: optionText });
      });

      if (!matches.length) {
        setStatus('No exact match found.', 'warn');
        return;
      }

      matches.sort((a, b) => (b.score - a.score) || (a.idx - b.idx));
      const chosen = [matches[0]];
      chosen.forEach((item) => {
        applyHighlight(item.el);
      });

      setStatus('Answer highlighted.', 'ok');

      setTimeout(() => {
        chosen.forEach((item) => item.el.click());
      }, 3000);
    } catch (err) {
      console.error('[Wayground TM] Error:', err);
      setStatus('Error processing question.', 'error');
    } finally {
      window._tmProcessing = false;
    }
  }

  function setupMenu() {
    if (typeof GM_registerMenuCommand !== 'function') return;
    GM_registerMenuCommand('Set Provider (openrouter/deepseek/all)', async () => {
      const current = await GM_getValue('QAF_PROVIDER', 'openrouter');
      const provider = prompt('Enter provider: openrouter, deepseek, or all', current || 'openrouter');
      if (provider !== null) {
        await GM_setValue('QAF_PROVIDER', provider.trim().toLowerCase());
        setStatus('Provider saved.', 'ok');
      }
    });

    GM_registerMenuCommand('Set OpenRouter API key', async () => {
      const current = await GM_getValue('OPENROUTER_API_KEY', '');
      const key = prompt('Enter OpenRouter API key', current || '');
      if (key !== null) {
        await GM_setValue('OPENROUTER_API_KEY', key.trim());
        setStatus('API key saved.', 'ok');
      }
    });

    GM_registerMenuCommand('Set OpenRouter model', async () => {
      const current = await GM_getValue('OPENROUTER_MODEL', 'openrouter/free');
      const model = prompt('Enter OpenRouter model ID', current || 'openrouter/free');
      if (model !== null) {
        await GM_setValue('OPENROUTER_MODEL', model.trim());
        setStatus('Model saved.', 'ok');
      }
    });

    GM_registerMenuCommand('Set OpenRouter secondary model', async () => {
      const current = await GM_getValue('OPENROUTER_MODEL_SECONDARY', '');
      const model = prompt('Enter OpenRouter secondary model ID (optional)', current || '');
      if (model !== null) {
        await GM_setValue('OPENROUTER_MODEL_SECONDARY', model.trim());
        setStatus('Secondary model saved.', 'ok');
      }
    });

    GM_registerMenuCommand('Set DeepSeek API key', async () => {
      const current = await GM_getValue('DEEPSEEK_API_KEY', '');
      const key = prompt('Enter DeepSeek API key', current || '');
      if (key !== null) {
        await GM_setValue('DEEPSEEK_API_KEY', key.trim());
        setStatus('DeepSeek key saved.', 'ok');
      }
    });

    GM_registerMenuCommand('Set DeepSeek model', async () => {
      const current = await GM_getValue('DEEPSEEK_MODEL', 'deepseek-chat');
      const model = prompt('Enter DeepSeek model ID', current || 'deepseek-chat');
      if (model !== null) {
        await GM_setValue('DEEPSEEK_MODEL', model.trim());
        setStatus('DeepSeek model saved.', 'ok');
      }
    });

    GM_registerMenuCommand('Clear OpenRouter API key', async () => {
      await GM_setValue('OPENROUTER_API_KEY', '');
      setStatus('API key cleared.', 'warn');
    });

    GM_registerMenuCommand('Clear DeepSeek API key', async () => {
      await GM_setValue('DEEPSEEK_API_KEY', '');
      setStatus('DeepSeek key cleared.', 'warn');
    });
  }

  setupMenu();

  const observer = new MutationObserver(() => {
    processQuestion();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  setStatus('Waiting for question...', 'info');
  processQuestion();
})();
