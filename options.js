// Options page script: save/remove OPENROUTER_API_KEY in chrome.storage.local

function maskKey(k) {
  if (!k) return '(not set)';
  if (k.length > 10) return k.slice(0,4) + '…' + k.slice(-4);
  return '••••••';
}

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('apiKey');
  const saveBtn = document.getElementById('saveBtn');
  const removeBtn = document.getElementById('removeBtn');
  const pasteBtn = document.getElementById('pasteBtn');
  const status = document.getElementById('status');
  const masked = document.getElementById('masked');
  const providerSelect = document.getElementById('providerSelect');
  const modelInput = document.getElementById('model');
  const modelSecondaryInput = document.getElementById('modelSecondary');
  const deepseekApiKeyInput = document.getElementById('deepseekApiKey');
  const deepseekModelInput = document.getElementById('deepseekModel');
  const siteUrlInput = document.getElementById('siteUrl');
  const appNameInput = document.getElementById('appName');
  const enabledToggle = document.getElementById('enabledToggle');
  const siteHostInput = document.getElementById('siteHost');
  const siteScopedToggle = document.getElementById('siteScopedToggle');
  const questionSelectorInput = document.getElementById('questionSelector');
  const optionSelectorInput = document.getElementById('optionSelector');
  const dailyTokenCapInput = document.getElementById('dailyTokenCap');
  const chatMessages = document.getElementById('chatMessages');
  const chatInput = document.getElementById('chatInput');
  const chatSendBtn = document.getElementById('chatSendBtn');
  const chatClearBtn = document.getElementById('chatClearBtn');
  const chatStatus = document.getElementById('chatStatus');

  const DEFAULT_PROVIDER = 'openrouter';
  const DEFAULT_OPENROUTER_MODEL = 'openrouter/free';
  const DEFAULT_DEEPSEEK_MODEL = 'deepseek-chat';
  const CHAT_ENDPOINTS = {
    openrouter: 'https://openrouter.ai/api/v1/chat/completions',
    deepseek: 'https://api.deepseek.com/chat/completions'
  };
  let chatHistory = [];

  function getProviderValue() {
    if (!providerSelect) return DEFAULT_PROVIDER;
    return providerSelect.value || DEFAULT_PROVIDER;
  }

  function applyProviderVisibility(provider) {
    const sections = document.querySelectorAll('.provider-section');
    sections.forEach((section) => {
      const target = section.getAttribute('data-provider');
      if (!target) return;
      if (provider === 'all' || target === provider) {
        section.classList.remove('is-hidden');
      } else {
        section.classList.add('is-hidden');
      }
    });
  }

  function updateMaskedKey(provider, openrouterKey, deepseekKey) {
    let activeKey = openrouterKey;
    if (provider === 'deepseek') activeKey = deepseekKey;
    if (provider === 'all') activeKey = openrouterKey || deepseekKey;
    if (provider === 'all' && openrouterKey && deepseekKey) {
      masked.textContent = 'multiple';
      return;
    }
    masked.textContent = activeKey ? maskKey(activeKey) : '(not set)';
  }

  // Load existing key
  try {
    chrome.storage.local.get([
      'QAF_PROVIDER',
      'OPENROUTER_API_KEY',
      'OPENAI_API_KEY',
      'OPENROUTER_MODEL',
      'OPENROUTER_MODEL_SECONDARY',
      'OPENROUTER_SITE_URL',
      'OPENROUTER_APP_NAME',
      'DEEPSEEK_API_KEY',
      'DEEPSEEK_MODEL',
      'QAF_QUESTION_SELECTOR',
      'QAF_OPTION_SELECTOR',
      'QAF_ENABLED',
      'QAF_DAILY_TOKEN_CAP',
      'QAF_LAST_HOST',
      'QAF_SITE_SELECTORS'
    ], (res) => {
      const provider = res && res.QAF_PROVIDER ? res.QAF_PROVIDER : DEFAULT_PROVIDER;
      if (providerSelect) providerSelect.value = provider;

      const openrouterKey = res && res.OPENROUTER_API_KEY ? res.OPENROUTER_API_KEY : (res && res.OPENAI_API_KEY ? res.OPENAI_API_KEY : null);
      const deepseekKey = res && res.DEEPSEEK_API_KEY ? res.DEEPSEEK_API_KEY : '';

      input.value = openrouterKey || '';
      if (deepseekApiKeyInput) deepseekApiKeyInput.value = deepseekKey || '';

      if (modelInput) modelInput.value = res && res.OPENROUTER_MODEL ? res.OPENROUTER_MODEL : DEFAULT_OPENROUTER_MODEL;
      if (modelSecondaryInput) modelSecondaryInput.value = res && res.OPENROUTER_MODEL_SECONDARY ? res.OPENROUTER_MODEL_SECONDARY : '';
      if (deepseekModelInput) deepseekModelInput.value = res && res.DEEPSEEK_MODEL ? res.DEEPSEEK_MODEL : DEFAULT_DEEPSEEK_MODEL;
      if (siteUrlInput) siteUrlInput.value = res && res.OPENROUTER_SITE_URL ? res.OPENROUTER_SITE_URL : '';
      if (appNameInput) appNameInput.value = res && res.OPENROUTER_APP_NAME ? res.OPENROUTER_APP_NAME : '';
      if (enabledToggle) enabledToggle.checked = res && typeof res.QAF_ENABLED === 'boolean' ? res.QAF_ENABLED : true;
      const siteHost = res && res.QAF_LAST_HOST ? String(res.QAF_LAST_HOST).toLowerCase() : '';
      if (siteHostInput) siteHostInput.value = siteHost;
      const siteMap = res && res.QAF_SITE_SELECTORS && typeof res.QAF_SITE_SELECTORS === 'object' ? res.QAF_SITE_SELECTORS : {};
      const siteEntry = siteHost && siteMap[siteHost] ? siteMap[siteHost] : null;
      const useSite = !!siteHost;
      if (siteScopedToggle) siteScopedToggle.checked = useSite;
      const globalQuestion = res && res.QAF_QUESTION_SELECTOR ? res.QAF_QUESTION_SELECTOR : '';
      const globalOption = res && res.QAF_OPTION_SELECTOR ? res.QAF_OPTION_SELECTOR : '';
      if (questionSelectorInput) {
        questionSelectorInput.value = useSite && siteEntry && siteEntry.questionSelector ? siteEntry.questionSelector : globalQuestion;
      }
      if (optionSelectorInput) {
        optionSelectorInput.value = useSite && siteEntry && siteEntry.optionSelector ? siteEntry.optionSelector : globalOption;
      }
      if (dailyTokenCapInput) {
        dailyTokenCapInput.value = res && typeof res.QAF_DAILY_TOKEN_CAP === 'number' ? String(res.QAF_DAILY_TOKEN_CAP) : '';
      }

      applyProviderVisibility(provider);
      updateMaskedKey(provider, openrouterKey, deepseekKey);
    });
  } catch (err) {
    masked.textContent = '(storage unavailable)';
    console.error('chrome.storage unavailable on options page', err);
  }

  if (providerSelect) {
    providerSelect.addEventListener('change', () => {
      const provider = getProviderValue();
      const openrouterKey = input.value.trim();
      const deepseekKey = deepseekApiKeyInput ? deepseekApiKeyInput.value.trim() : '';
      applyProviderVisibility(provider);
      updateMaskedKey(provider, openrouterKey, deepseekKey);
    });
  }

  saveBtn.addEventListener('click', () => {
    const provider = getProviderValue();
    const openrouterKey = input.value.trim();
    const deepseekKey = deepseekApiKeyInput ? deepseekApiKeyInput.value.trim() : '';
    let activeKey = openrouterKey;
    if (provider === 'deepseek') activeKey = deepseekKey;
    if (provider === 'all') activeKey = openrouterKey || deepseekKey;
    if (!activeKey) {
      status.textContent = 'Enter a non-empty API key for the selected provider.';
      return;
    }

    const modelVal = modelInput ? modelInput.value.trim() : '';
    const modelSecondaryVal = modelSecondaryInput ? modelSecondaryInput.value.trim() : '';
    const deepseekModelVal = deepseekModelInput ? deepseekModelInput.value.trim() : '';
    const siteVal = siteUrlInput ? siteUrlInput.value.trim() : '';
    const appVal = appNameInput ? appNameInput.value.trim() : '';
    const siteHostRaw = siteHostInput ? siteHostInput.value.trim().toLowerCase() : '';
    const siteScoped = siteScopedToggle ? siteScopedToggle.checked : false;
    const useSiteScoped = siteScoped && !!siteHostRaw;
    const questionSel = questionSelectorInput ? questionSelectorInput.value.trim() : '';
    const optionSel = optionSelectorInput ? optionSelectorInput.value.trim() : '';
    const tokenCapRaw = dailyTokenCapInput ? dailyTokenCapInput.value.trim() : '';

    const updates = {
      QAF_PROVIDER: provider,
      OPENROUTER_MODEL: modelVal || DEFAULT_OPENROUTER_MODEL,
      DEEPSEEK_MODEL: deepseekModelVal || DEFAULT_DEEPSEEK_MODEL
    };

    if (openrouterKey) updates.OPENROUTER_API_KEY = openrouterKey;
    if (deepseekKey) updates.DEEPSEEK_API_KEY = deepseekKey;

    const toRemove = [];
    if (modelSecondaryVal) {
      updates.OPENROUTER_MODEL_SECONDARY = modelSecondaryVal;
    } else {
      toRemove.push('OPENROUTER_MODEL_SECONDARY');
    }
    if (siteVal) {
      updates.OPENROUTER_SITE_URL = siteVal;
    } else {
      toRemove.push('OPENROUTER_SITE_URL');
    }
    if (appVal) {
      updates.OPENROUTER_APP_NAME = appVal;
    } else {
      toRemove.push('OPENROUTER_APP_NAME');
    }

    if (!useSiteScoped) {
      if (questionSel) {
        updates.QAF_QUESTION_SELECTOR = questionSel;
      } else {
        toRemove.push('QAF_QUESTION_SELECTOR');
      }
      if (optionSel) {
        updates.QAF_OPTION_SELECTOR = optionSel;
      } else {
        toRemove.push('QAF_OPTION_SELECTOR');
      }
    }

    if (tokenCapRaw) {
      const parsed = Number(tokenCapRaw);
      if (Number.isFinite(parsed) && parsed > 0) {
        updates.QAF_DAILY_TOKEN_CAP = Math.floor(parsed);
      } else {
        toRemove.push('QAF_DAILY_TOKEN_CAP');
      }
    } else {
      toRemove.push('QAF_DAILY_TOKEN_CAP');
    }

    const finalizeSave = (siteMap) => {
      if (useSiteScoped) {
        const map = siteMap && typeof siteMap === 'object' ? { ...siteMap } : {};
        if (questionSel || optionSel) {
          map[siteHostRaw] = {
            questionSelector: questionSel,
            optionSelector: optionSel
          };
        } else {
          delete map[siteHostRaw];
        }
        updates.QAF_SITE_SELECTORS = map;
      }

      chrome.storage.local.set(updates, () => {
        if (toRemove.length) {
          chrome.storage.local.remove(toRemove, () => {});
        }
        status.textContent = 'API key saved.';
        updateMaskedKey(provider, openrouterKey, deepseekKey);
        setTimeout(() => (status.textContent = ''), 2000);
      });
    };

    if (useSiteScoped) {
      chrome.storage.local.get(['QAF_SITE_SELECTORS'], (res) => {
        const map = res && res.QAF_SITE_SELECTORS ? res.QAF_SITE_SELECTORS : {};
        finalizeSave(map);
      });
    } else {
      finalizeSave(null);
    }
  });

  removeBtn.addEventListener('click', () => {
    const provider = getProviderValue();
    const keysToRemove = provider === 'all'
      ? ['OPENROUTER_API_KEY', 'OPENAI_API_KEY', 'DEEPSEEK_API_KEY']
      : (provider === 'deepseek'
        ? ['DEEPSEEK_API_KEY']
        : ['OPENROUTER_API_KEY', 'OPENAI_API_KEY']);
    chrome.storage.local.remove(keysToRemove, () => {
      if (provider === 'deepseek') {
        if (deepseekApiKeyInput) deepseekApiKeyInput.value = '';
      } else if (provider === 'all') {
        input.value = '';
        if (deepseekApiKeyInput) deepseekApiKeyInput.value = '';
      } else {
        input.value = '';
      }
      const openrouterKey = input.value.trim();
      const deepseekKey = deepseekApiKeyInput ? deepseekApiKeyInput.value.trim() : '';
      updateMaskedKey(provider, openrouterKey, deepseekKey);
      status.textContent = provider === 'all'
        ? 'All provider keys removed.'
        : (provider === 'deepseek' ? 'DeepSeek API key removed.' : 'OpenRouter API key removed.');
      setTimeout(() => (status.textContent = ''), 2000);
    });
  });

  // Paste from clipboard (user gesture required in most browsers)
  if (pasteBtn) {
    pasteBtn.addEventListener('click', async () => {
      status.textContent = '';
      try {
        if (navigator.clipboard && navigator.clipboard.readText) {
          const text = await navigator.clipboard.readText();
          if (text && text.trim()) {
            const provider = getProviderValue();
            if (provider === 'deepseek') {
              if (deepseekApiKeyInput) deepseekApiKeyInput.value = text.trim();
            } else {
              input.value = text.trim();
            }
            const openrouterKey = input.value.trim();
            const deepseekKey = deepseekApiKeyInput ? deepseekApiKeyInput.value.trim() : '';
            updateMaskedKey(provider, openrouterKey, deepseekKey);
            status.textContent = 'Pasted from clipboard. Click Save to persist.';
            setTimeout(() => (status.textContent = ''), 2500);
          } else {
            status.textContent = 'Clipboard is empty.';
            setTimeout(() => (status.textContent = ''), 2000);
          }
        } else {
          status.textContent = 'Clipboard read not supported in this browser.';
          setTimeout(() => (status.textContent = ''), 2000);
        }
      } catch (err) {
        console.error('Failed to read clipboard:', err);
        status.textContent = 'Unable to read from clipboard. Try pasting manually.';
        setTimeout(() => (status.textContent = ''), 3000);
      }
    });
  }

  if (enabledToggle) {
    enabledToggle.addEventListener('change', () => {
      const enabled = enabledToggle.checked;
      chrome.storage.local.set({ QAF_ENABLED: enabled }, () => {
        status.textContent = enabled ? 'Extension enabled.' : 'Extension disabled.';
        setTimeout(() => (status.textContent = ''), 1500);
      });
    });
  }

  function setChatStatus(message) {
    if (!chatStatus) return;
    chatStatus.textContent = message || '';
  }

  function setChatBusy(busy) {
    if (chatSendBtn) chatSendBtn.disabled = busy;
    if (chatClearBtn) chatClearBtn.disabled = busy;
    if (chatInput) chatInput.disabled = busy;
  }

  function appendChatMessage(role, text) {
    if (!chatMessages) return;
    const div = document.createElement('div');
    div.className = `chat-message ${role === 'user' ? 'user' : 'assistant'}`;
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  async function loadSettings() {
    return await new Promise((resolve) => {
      try {
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.get(['QAF_PROVIDER', 'OPENROUTER_API_KEY', 'OPENAI_API_KEY', 'OPENROUTER_MODEL', 'OPENROUTER_SITE_URL', 'OPENROUTER_APP_NAME', 'DEEPSEEK_API_KEY', 'DEEPSEEK_MODEL'], (res) => {
            resolve({
              provider: res && res.QAF_PROVIDER ? res.QAF_PROVIDER : DEFAULT_PROVIDER,
              apiKey: res && res.OPENROUTER_API_KEY ? res.OPENROUTER_API_KEY : (res && res.OPENAI_API_KEY ? res.OPENAI_API_KEY : null),
              model: res && res.OPENROUTER_MODEL ? res.OPENROUTER_MODEL : DEFAULT_OPENROUTER_MODEL,
              siteUrl: res && res.OPENROUTER_SITE_URL ? res.OPENROUTER_SITE_URL : '',
              appName: res && res.OPENROUTER_APP_NAME ? res.OPENROUTER_APP_NAME : '',
              deepseekKey: res && res.DEEPSEEK_API_KEY ? res.DEEPSEEK_API_KEY : null,
              deepseekModel: res && res.DEEPSEEK_MODEL ? res.DEEPSEEK_MODEL : DEFAULT_DEEPSEEK_MODEL
            });
          });
        } else {
          resolve({ provider: DEFAULT_PROVIDER, apiKey: null, model: DEFAULT_OPENROUTER_MODEL, siteUrl: '', appName: '', deepseekKey: null, deepseekModel: DEFAULT_DEEPSEEK_MODEL });
        }
      } catch (err) {
        console.error('Error accessing chrome.storage:', err);
        resolve({ provider: DEFAULT_PROVIDER, apiKey: null, model: DEFAULT_OPENROUTER_MODEL, siteUrl: '', appName: '', deepseekKey: null, deepseekModel: DEFAULT_DEEPSEEK_MODEL });
      }
    });
  }

  async function sendChat() {
    if (!chatInput) return;
    const content = chatInput.value.trim();
    if (!content) return;

    setChatStatus('');
    chatInput.value = '';
    appendChatMessage('user', content);
    chatHistory.push({ role: 'user', content });

    setChatBusy(true);
    const settings = await loadSettings();
    let provider = settings.provider || DEFAULT_PROVIDER;
    if (provider === 'all') {
      provider = settings.apiKey ? 'openrouter' : 'deepseek';
    }
    const providerLabel = provider === 'deepseek' ? 'DeepSeek' : 'OpenRouter';
    const apiKey = provider === 'deepseek' ? settings.deepseekKey : settings.apiKey;
    if (!apiKey) {
      setChatStatus(`${providerLabel} API key missing. Set it above.`);
      setChatBusy(false);
      return;
    }

    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    };
    if (provider === 'openrouter') {
      if (settings.siteUrl) headers['HTTP-Referer'] = settings.siteUrl;
      if (settings.appName) headers['X-OpenRouter-Title'] = settings.appName;
    }

    try {
      const endpoint = CHAT_ENDPOINTS[provider] || CHAT_ENDPOINTS.openrouter;
      const modelToUse = provider === 'deepseek' ? settings.deepseekModel : settings.model;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: modelToUse,
          messages: chatHistory
        })
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '<no body>');
        console.error('[QuizAnswerFinder] Chat API error', response.status, text);
        setChatStatus(`${providerLabel} API error ${response.status}.`);
        return;
      }

      const data = await response.json();
      const reply = data && data.choices && data.choices[0] && data.choices[0].message
        ? data.choices[0].message.content
        : null;
      if (!reply) {
        setChatStatus('No reply returned.');
        return;
      }

      appendChatMessage('assistant', reply.trim());
      chatHistory.push({ role: 'assistant', content: reply.trim() });
      setChatStatus('');
    } catch (err) {
      console.error('[QuizAnswerFinder] Chat fetch error:', err);
      setChatStatus('Network error (see console).');
    } finally {
      setChatBusy(false);
    }
  }

  if (chatSendBtn) {
    chatSendBtn.addEventListener('click', () => sendChat());
  }

  if (chatClearBtn) {
    chatClearBtn.addEventListener('click', () => {
      chatHistory = [];
      if (chatMessages) chatMessages.innerHTML = '';
      setChatStatus('Cleared.');
      setTimeout(() => setChatStatus(''), 1500);
    });
  }

  if (chatInput) {
    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChat();
      }
    });
  }

  // ── RL Stats ────────────────────────────────────────────────
  const UCB_C = 1.41;

  function renderRLStats(res) {
    const el = document.getElementById('rlStatsContainer');
    if (!el) return;
    const map = (res && res.QAF_RL_STATE && typeof res.QAF_RL_STATE === 'object')
      ? res.QAF_RL_STATE : {};
    const hosts = Object.keys(map);
    if (!hosts.length) {
      el.innerHTML = '<span class="rl-no-data">No data yet — use the extension on a quiz to start learning.</span>';
      return;
    }
    let html = '';
    hosts.forEach(host => {
      const state = map[host];
      if (!state || !state.models) return;
      const N = state.totalSteps || 0;
      const models = state.models;
      const sortedModels = Object.keys(models).sort((a, b) => {
        const eA = models[a]; const eB = models[b];
        const scoreA = eA.n === 0 ? Infinity : (eA.q + UCB_C * Math.sqrt(Math.log(N + 1) / eA.n));
        const scoreB = eB.n === 0 ? Infinity : (eB.q + UCB_C * Math.sqrt(Math.log(N + 1) / eB.n));
        return scoreB - scoreA;
      });
      html += `<div class="rl-host-block">
        <div class="rl-host-label">${host} &mdash; ${N} questions answered</div>
        <table class="rl-table">
          <tr><th>Model</th><th>Win Rate</th><th>Tries</th><th>UCB Score</th></tr>`;
      sortedModels.forEach((m, i) => {
        const e = models[m] || { q: 0.5, n: 0 };
        const ucbVal = e.n === 0 ? null : (e.q + UCB_C * Math.sqrt(Math.log(N + 1) / e.n));
        const ucbStr = ucbVal === null ? '&infin;' : ucbVal.toFixed(3);
        const winPct = (e.q * 100).toFixed(1) + '%';
        const short = m.split('/')[1] || m;
        html += `<tr${i === 0 ? ' class="rl-best"' : ''}>
          <td>${short}${i === 0 ? ' &#9733;' : ''}</td>
          <td>${winPct}</td><td>${e.n}</td><td>${ucbStr}</td>
        </tr>`;
      });
      html += '</table></div>';
    });
    el.innerHTML = html;
  }

  try {
    chrome.storage.local.get(['QAF_RL_STATE'], renderRLStats);
  } catch (e) {}

  const rlResetBtn = document.getElementById('rlResetBtn');
  if (rlResetBtn) {
    rlResetBtn.addEventListener('click', () => {
      chrome.storage.local.remove(['QAF_RL_STATE'], () => {
        status.textContent = 'RL state reset.';
        setTimeout(() => { status.textContent = ''; }, 2000);
        renderRLStats({});
      });
    });
  }

});
