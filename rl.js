// =============================================================
//  QAF — Reinforcement Learning (UCB1 Multi-Armed Bandit)
//
//  Learns which OpenRouter model answers quiz questions best.
//  Reward signals (observed automatically):
//    +1  Page advances to a new question (answer was correct)
//    -1  User clicks a different option than the one highlighted
//     0  No signal within 28 s (neutral / timeout)
//
//  State is persisted per-hostname in chrome.storage.local
//  under the key QAF_RL_STATE.
// =============================================================

const QAF_RL_KEY  = 'QAF_RL_STATE';
const UCB_EXPLORE = 1.41; // exploration constant ≈ √2

const RL_MODELS = [
  'google/gemini-2.0-flash-001',
  'meta-llama/llama-4-scout:free',
  'mistralai/mistral-7b-instruct:free',
  'google/gemini-flash-1.5-8b:free',
  'nousresearch/hermes-3-llama-3.1-405b:free'
];

// ── Module state ──────────────────────────────────────────────
let _rlState       = null;
let _rlHost        = '';
let _rlInitialized = false;
let _rlCleanup     = null;   // cancels active reward-detection

// ── Helpers ───────────────────────────────────────────────────
function _rlDefault() {
  const models = {};
  RL_MODELS.forEach(m => { models[m] = { q: 0.5, n: 0 }; });
  return { totalSteps: 0, models };
}

function _rlEnsureModels(state) {
  RL_MODELS.forEach(m => {
    if (!state.models[m]) state.models[m] = { q: 0.5, n: 0 };
  });
  return state;
}

// ── UCB1 ──────────────────────────────────────────────────────
function _ucb1(q, n, N) {
  if (n === 0) return Infinity;            // always try unexplored arms first
  return q + UCB_EXPLORE * Math.sqrt(Math.log(N + 1) / n);
}

function _rlPick(state) {
  const N = state.totalSteps || 0;
  let best = RL_MODELS[0], bestScore = -Infinity;
  RL_MODELS.forEach(m => {
    const e = state.models[m] || { q: 0.5, n: 0 };
    const s = _ucb1(e.q, e.n, N);
    if (s > bestScore) { bestScore = s; best = m; }
  });
  return best;
}

function _rlUpdate(state, model, reward) {
  if (!state.models[model]) state.models[model] = { q: 0.5, n: 0 };
  const e = state.models[model];
  e.n += 1;
  e.q = e.q + (reward - e.q) / e.n;   // incremental sample-mean update
  state.totalSteps = (state.totalSteps || 0) + 1;
  return state;
}

// ── Storage ───────────────────────────────────────────────────
async function rlLoad(host) {
  _rlHost = host || (typeof location !== 'undefined' ? location.hostname.toLowerCase() : '');
  return new Promise(resolve => {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
        _rlState = _rlDefault();
        _rlInitialized = true;
        return resolve(_rlState);
      }
      chrome.storage.local.get([QAF_RL_KEY], res => {
        const map = (res && res[QAF_RL_KEY] && typeof res[QAF_RL_KEY] === 'object')
          ? res[QAF_RL_KEY] : {};
        const saved = map[_rlHost];
        _rlState = (saved && typeof saved === 'object')
          ? _rlEnsureModels(Object.assign(_rlDefault(), saved))
          : _rlDefault();
        _rlInitialized = true;
        resolve(_rlState);
      });
    } catch (e) {
      _rlState = _rlDefault();
      _rlInitialized = true;
      resolve(_rlState);
    }
  });
}

function _rlPersist() {
  if (!_rlState || !_rlHost) return;
  try {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;
    chrome.storage.local.get([QAF_RL_KEY], res => {
      const map = Object.assign(
        {},
        (res && res[QAF_RL_KEY] && typeof res[QAF_RL_KEY] === 'object') ? res[QAF_RL_KEY] : {}
      );
      map[_rlHost] = _rlState;
      chrome.storage.local.set({ [QAF_RL_KEY]: map });
    });
  } catch (e) { /* ignore */ }
}

// ── Public API ────────────────────────────────────────────────

/** Returns the model UCB1 recommends for the next question. */
function rlGetModel() {
  if (!_rlState || !_rlInitialized) return RL_MODELS[0];
  return _rlPick(_rlState);
}

/** Record an outcome reward for a model. */
async function rlRecordReward(model, reward) {
  if (!RL_MODELS.includes(model)) return;
  if (!_rlState) _rlState = _rlDefault();
  _rlState = _rlUpdate(_rlState, model, reward);
  _rlPersist();
  const e = _rlState.models[model];
  const label = reward > 0 ? 'CORRECT' : reward < 0 ? 'WRONG' : 'timeout';
  console.log(
    `[QAF-RL] ${label} — model="${model.split('/')[1]}" ` +
    `Q=${e.q.toFixed(3)} n=${e.n} steps=${_rlState.totalSteps} ` +
    `next="${rlGetModel().split('/')[1]}"`
  );
}

/** Returns stats object for display in the options page. */
function rlGetStats() {
  if (!_rlState) return null;
  const N = _rlState.totalSteps;
  const best = _rlPick(_rlState);
  return {
    totalSteps: N,
    host: _rlHost,
    best,
    arms: RL_MODELS.map(m => {
      const e = _rlState.models[m] || { q: 0.5, n: 0 };
      const ucb = _ucb1(e.q, e.n, N);
      return {
        model: m,
        shortName: m.split('/')[1] || m,
        winRate: +(e.q * 100).toFixed(1),
        n: e.n,
        ucb: Number.isFinite(ucb) ? +ucb.toFixed(3) : null,
        isBest: m === best
      };
    })
  };
}

// ── Reward detection ──────────────────────────────────────────
/**
 * Sets up automatic reward detection after an answer is highlighted.
 *
 * @param {string}    model          The model that produced the answer.
 * @param {Element[]} highlightedEls The highlighted option elements.
 * @param {string}    signature      The current question signature.
 */
function rlSetupRewardDetection(model, highlightedEls, signature) {
  // Cancel any lingering detection from the previous question
  if (_rlCleanup) { _rlCleanup(); _rlCleanup = null; }
  if (!model || !RL_MODELS.includes(model)) return;

  let done = false;
  let timeoutId  = null;
  let intervalId = null;

  function cancel() {
    done = true;
    if (timeoutId)  clearTimeout(timeoutId);
    if (intervalId) clearInterval(intervalId);
    document.removeEventListener('click', onPageClick, true);
  }

  async function finish(reward) {
    if (done) return;
    cancel();
    await rlRecordReward(model, reward);
  }

  // ── Signal 1: user clicks an option ──────────────────────────
  function onPageClick(e) {
    if (done) return;
    const el = e.target;
    if (!el) return;

    // Clicked the highlighted answer → positive confirmation
    const isHighlighted = (highlightedEls || []).some(h =>
      h === el || (h.contains && h.contains(el))
    );
    if (isHighlighted) { finish(1); return; }

    // Clicked a different answer-like element → negative
    if (el.closest) {
      const answerSelectors = [
        '[data-cy^="option-"]', '[data-testid*="option" i]',
        '[role="option"]', '[role="radio"]', '[role="checkbox"]',
        'main button', 'main label'
      ];
      for (const sel of answerSelectors) {
        try { if (el.closest(sel)) { finish(-1); return; } } catch (_) {}
      }
    }
  }
  document.addEventListener('click', onPageClick, true);

  // ── Signal 2: question signature changes (page advanced) ─────
  const startSig = signature ||
    (typeof window !== 'undefined' ? window._lastProcessedSignature : '');
  intervalId = setInterval(() => {
    if (done) { clearInterval(intervalId); return; }
    const cur = typeof window !== 'undefined' ? window._lastProcessedSignature : '';
    if (cur && startSig && cur !== startSig) finish(1);
  }, 700);

  // ── Timeout: no signal → neutral ─────────────────────────────
  timeoutId = setTimeout(() => { if (!done) finish(0); }, 28000);

  _rlCleanup = cancel;
}
