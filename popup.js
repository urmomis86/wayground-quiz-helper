// Popup script: quick save/remove for OPENROUTER_API_KEY

function maskKey(k) {
  if (!k) return '(not set)';
  if (k.length > 10) return k.slice(0,4) + '…' + k.slice(-4);
  return '••••••';
}

document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('apiKey');
  const providerSelect = document.getElementById('providerSelect');
  const saveBtn = document.getElementById('saveBtn');
  const pasteBtn = document.getElementById('pasteBtn');
  const optionsBtn = document.getElementById('optionsBtn');
  const status = document.getElementById('status');
  const enabledToggle = document.getElementById('enabledToggle');

  chrome.storage.local.get(['QAF_PROVIDER', 'OPENROUTER_API_KEY', 'OPENAI_API_KEY', 'DEEPSEEK_API_KEY'], (res) => {
    const provider = res && res.QAF_PROVIDER ? res.QAF_PROVIDER : 'openrouter';
    if (providerSelect) providerSelect.value = provider;
    const openrouterKey = res && res.OPENROUTER_API_KEY ? res.OPENROUTER_API_KEY : (res && res.OPENAI_API_KEY ? res.OPENAI_API_KEY : null);
    const deepseekKey = res && res.DEEPSEEK_API_KEY ? res.DEEPSEEK_API_KEY : '';
    const displayKey = provider === 'deepseek'
      ? (deepseekKey || '')
      : (provider === 'all' ? (openrouterKey || deepseekKey || '') : (openrouterKey || ''));
    input.value = displayKey;
  });

  chrome.storage.local.get(['QAF_ENABLED'], (res) => {
    const enabled = res && typeof res.QAF_ENABLED === 'boolean' ? res.QAF_ENABLED : true;
    if (enabledToggle) enabledToggle.checked = enabled;
  });

  if (providerSelect) {
    providerSelect.addEventListener('change', () => {
      const provider = providerSelect.value || 'openrouter';
      chrome.storage.local.get(['OPENROUTER_API_KEY', 'OPENAI_API_KEY', 'DEEPSEEK_API_KEY'], (res) => {
        const openrouterKey = res && res.OPENROUTER_API_KEY ? res.OPENROUTER_API_KEY : (res && res.OPENAI_API_KEY ? res.OPENAI_API_KEY : null);
        const deepseekKey = res && res.DEEPSEEK_API_KEY ? res.DEEPSEEK_API_KEY : '';
        input.value = provider === 'deepseek'
          ? (deepseekKey || '')
          : (provider === 'all' ? (openrouterKey || deepseekKey || '') : (openrouterKey || ''));
      });
    });
  }

  saveBtn.addEventListener('click', () => {
    const val = input.value.trim();
    if (!val) {
      status.textContent = 'Enter a non-empty API key.';
      return;
    }
    const provider = providerSelect ? (providerSelect.value || 'openrouter') : 'openrouter';
    const updates = { QAF_PROVIDER: provider };
    if (provider === 'deepseek') {
      updates.DEEPSEEK_API_KEY = val;
    } else if (provider === 'all') {
      updates.OPENROUTER_API_KEY = val;
    } else {
      updates.OPENROUTER_API_KEY = val;
    }
    chrome.storage.local.set(updates, () => {
      status.textContent = 'Saved.';
      setTimeout(() => (status.textContent = ''), 1800);
    });
  });

  pasteBtn.addEventListener('click', async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.trim()) {
          input.value = text.trim();
          status.textContent = 'Pasted. Click Save.';
          setTimeout(() => (status.textContent = ''), 2000);
        } else {
          status.textContent = 'Clipboard empty.';
          setTimeout(() => (status.textContent = ''), 1500);
        }
      } else {
        status.textContent = 'Clipboard not available.';
        setTimeout(() => (status.textContent = ''), 1500);
      }
    } catch (err) {
      console.error('Clipboard read failed', err);
      status.textContent = 'Failed to read clipboard.';
      setTimeout(() => (status.textContent = ''), 2000);
    }
  });

  optionsBtn.addEventListener('click', () => {
    if (chrome.runtime && chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    }
  });

  if (enabledToggle) {
    enabledToggle.addEventListener('change', () => {
      const enabled = enabledToggle.checked;
      chrome.storage.local.set({ QAF_ENABLED: enabled }, () => {
        status.textContent = enabled ? 'Enabled.' : 'Disabled.';
        setTimeout(() => (status.textContent = ''), 1500);
      });
    });
  }
});
