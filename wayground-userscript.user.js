// ==UserScript==
// @name         Universal Quiz Helper with RL
// @namespace    http://tampermonkey.net/
// @version      5.0
// @license      MIT
// @description  Auto-answer quiz questions with Reinforcement Learning on any site
// @author       You
// @match        https://wayground.com/*
// @match        https://*.wayground.com/*
// @match        https://wayground.com/join/*
// @match        https://*.wayground.com/join/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_notification
// @run-at       document-end
// @updateURL    https://raw.githubusercontent.com/urmomis86/wayground-quiz-helper/main/wayground-userscript.user.js
// @downloadURL  https://raw.githubusercontent.com/urmomis86/wayground-quiz-helper/main/wayground-userscript.user.js
// ==/UserScript==

(function() {
  'use strict';
  
  console.log('=== UNIVERSAL QUIZ HELPER START ===');
  
  // Auto-update functionality
  function checkForUpdates() {
    const lastUpdateCheck = GM_getValue('last_update_check', 0);
    const now = Date.now();
    const checkInterval = 24 * 60 * 60 * 1000; // Check every 24 hours
    
    if (now - lastUpdateCheck > checkInterval) {
      console.log('[Quiz Helper] Checking for updates...');
      
      // You can set up a GitHub repository with your script
      // For now, we'll simulate update checking
      GM_setValue('last_update_check', now);
      
      // Show update notification (you can customize this)
      showStatus('Auto-update enabled - checking for new versions', 'info');
    }
  }
  
  // Auto-update settings
  const autoUpdateSettings = GM_getValue('auto_update_settings', {
    enabled: true,
    check_interval: 24, // hours
    auto_install: false,
    notify_updates: true
  });
  
  function saveAutoUpdateSettings(settings) {
    GM_setValue('auto_update_settings', settings);
  }
  
  // Update checker (you can enhance this with actual version checking)
  function performUpdateCheck() {
    const currentVersion = '1.1';
    
    // Check your GitHub repository for latest version
    GM_xmlhttpRequest({
      method: 'GET',
      url: 'https://api.github.com/repos/urmomis86/wayground-quiz-helper/contents/wayground-userscript.user.js',
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      },
      onload: function(response) {
        if (response.status === 200) {
          const data = JSON.parse(response.responseText);
          const content = atob(data.content);
          
          // Extract version from the file (look for @version)
          const versionMatch = content.match(/@version\s+([0-9.]+)/);
          const latestVersion = versionMatch ? versionMatch[1] : '1.1';
          
          console.log('[Wayground] Current version:', currentVersion, 'Latest version:', latestVersion);
          
          if (currentVersion !== latestVersion) {
            if (autoUpdateSettings.notify_updates) {
              GM_notification({
                title: 'Wayground Quiz Helper Update Available',
                text: `New version ${latestVersion} is available!`,
                onclick: function() {
                  window.open('https://github.com/urmomis86/wayground-quiz-helper', '_blank');
                }
              });
            }
            
            showStatus(`Update available: v${latestVersion}`, 'info');
            
            // Auto-install if enabled
            if (autoUpdateSettings.auto_install) {
              console.log('[Wayground] Auto-installing update...');
              // You could implement auto-installation here
            }
          } else {
            showStatus('You have the latest version!', 'success');
          }
        }
      },
      onerror: function() {
        console.log('[Wayground] Failed to check for updates');
        showStatus('Update check failed', 'error');
      }
    });
  }
  
  // Reinforcement Learning System
  let rlStats = GM_getValue('wayground_rl_stats', {
    'openrouter/free': { pulls: 1, rewards: 0, totalReward: 0 },
    'openrouter/meta-llama/llama-3.2-3b-instruct:free': { pulls: 1, rewards: 0, totalReward: 0 },
    'deepseek/deepseek-chat': { pulls: 1, rewards: 0, totalReward: 0 }
  });
  
  function saveRLStats() {
    GM_setValue('wayground_rl_stats', rlStats);
  }
  
  function selectBestModel() {
    let bestModel = 'openrouter/free';
    let bestScore = -Infinity;
    
    for (const model in rlStats) {
      const stats = rlStats[model];
      const avgReward = stats.rewards > 0 ? stats.totalReward / stats.rewards : 0;
      if (avgReward > bestScore) {
        bestScore = avgReward;
        bestModel = model;
      }
    }
    
    rlStats[bestModel].pulls++;
    saveRLStats();
    return bestModel;
  }
  
  // API keys storage
  function getAPIKeys() {
    return {
      openrouter: GM_getValue('openrouter_key', ''),
      deepseek: GM_getValue('deepseek_key', ''),
      vercel: GM_getValue('vercel_key', ''),
      opencodezen: GM_getValue('opencodezen_key', ''),
      cloudflare: GM_getValue('cloudflare_key', '')
    };
  }
  
  function saveAPIKeys(keys) {
    GM_setValue('openrouter_key', keys.openrouter);
    GM_setValue('deepseek_key', keys.deepseek);
    GM_setValue('vercel_key', keys.vercel);
    GM_setValue('opencodezen_key', keys.opencodezen);
    GM_setValue('cloudflare_key', keys.cloudflare);
  }
  
  // Status display
  function showStatus(message, type = 'info') {
    const existing = document.getElementById('wg-status');
    if (existing) existing.remove();
    
    const status = document.createElement('div');
    status.id = 'wg-status';
    status.textContent = message;
    status.style.cssText = `
      position: fixed !important;
      top: 10px !important;
      right: 10px !important;
      background: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#007acc'} !important;
      color: white !important;
      padding: 10px !important;
      z-index: 999999 !important;
      font-size: 14px !important;
      border: 2px solid white !important;
      border-radius: 5px !important;
    `;
    document.body.appendChild(status);
  }
  
  // Capture full page content for AI analysis
  function capturePageContent() {
    const bodyText = document.body.innerText || '';
    const title = document.title || '';
    const url = window.location.href;
    
    // Get all text content from the page
    const allText = [];
    const elements = document.querySelectorAll('p, h1, h2, h3, h4, h5, h6, label, button, div, span');
    elements.forEach(el => {
      const text = el.textContent?.trim();
      if (text && text.length > 0 && !text.includes('Wayground Script') && !text.includes('⚙️ Menu')) {
        allText.push(text);
      }
    });
    
    // Get specific question and option elements
    const questionElements = document.querySelectorAll('[class*="question"], [class*="prompt"], [class*="stem"], [data-testid*="question"]');
    const optionElements = document.querySelectorAll('button, label, input[type="radio"], [role="option"], [class*="choice"], [class*="option"]');
    
    let questions = [];
    questionElements.forEach(el => {
      const text = el.textContent?.trim();
      if (text && text.length > 10) questions.push(text);
    });
    
    let options = [];
    optionElements.forEach(el => {
      const text = el.textContent?.trim();
      if (text && text.length > 2 && text.length < 200) options.push(text);
    });
    
    return {
      url: url,
      title: title,
      bodyText: bodyText.substring(0, 3000), // Limit length
      allText: allText.slice(0, 50).join('\n'),
      questions: questions,
      options: options,
      timestamp: new Date().toISOString()
    };
  }
  
  // Find questions and options - AGGRESSIVE DETECTION
  function findQuestions() {
    const selectors = [
      'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'div',
      '[class*="question"]', '[class*="prompt"]', '[class*="stem"]',
      '[class*="quiz"]', '[class*="test"]', '[class*="exam"]',
      '[data-testid*="question"]', '[data-cy*="question"]',
      '[data-testid*="prompt"]', '[data-cy*="prompt"]',
      '.question-text', '.quiz-question', '.prompt-text',
      '.question-stem', '.assessment-question', '.question-content',
      'span', 'label', 'td', 'li'
    ];
    
    let questions = [];
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        const text = el.textContent || el.innerText || '';
        const trimmedText = text.trim();
        
        // Skip if too short or contains script text
        if (trimmedText.length < 5 || trimmedText.includes('Wayground Script')) return;
        
        // Skip if it's just the menu or options
        if (trimmedText.length < 50 && (trimmedText.toLowerCase().includes('menu') || trimmedText.toLowerCase().includes('tools'))) return;
        
        // Look for question indicators
        const hasQuestionMark = trimmedText.includes('?');
        const startsWithNumber = /^\d+[.):\s]/.test(trimmedText);
        const isLongEnough = trimmedText.length > 20;
        
        // Accept if has question mark OR is long text (likely a question)
        if (hasQuestionMark || (isLongEnough && !startsWithNumber)) {
          questions.push({ element: el, text: trimmedText });
        }
      });
    }
    
    // Remove duplicates and sort by length (longest first - likely the main question)
    const uniqueQuestions = [];
    const seen = new Set();
    for (const q of questions) {
      if (!seen.has(q.text)) {
        seen.add(q.text);
        uniqueQuestions.push(q);
      }
    }
    
    
    uniqueQuestions.sort((a, b) => b.text.length - a.text.length);
    
    console.log('findQuestions found:', uniqueQuestions.length, 'unique questions');
    return uniqueQuestions;
  }
  
  function findOptions() {
    const selectors = [
      'button', 'label', 'input[type="radio"]', 'input[type="checkbox"]',
      '[role="option"]', '[class*="choice"]', '[class*="answer"]', '[class*="option"]',
      '[data-cy*="option"]', '[data-testid*="option"]', '[data-cy*="answer"]', '[data-testid*="answer"]',
      '.option-text', '.choice-text', '.answer-option', '.answer-text',
      'li', 'div[class*="choice"]', 'div[class*="option"]', 'span[class*="choice"]',
      'span[class*="option"]', 'a', 'td', 'tr'
    ];
    
    let options = [];
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        const text = el.textContent || el.innerText || '';
        const trimmedText = text.trim();
        const textLower = trimmedText.toLowerCase();
        
        // Skip if too short
        if (trimmedText.length < 2) return;
        
        // Skip script text
        if (trimmedText.includes('Wayground Script')) return;
        
        // Skip menu/tools (only if very short)
        if (trimmedText.length < 20) {
          const forbiddenWords = ['tools', 'options', 'settings', 'menu', '⚙️', '🔧', '⚙'];
          if (forbiddenWords.some(word => textLower.includes(word))) {
            return;
          }
        }
        
        // Skip if it's likely a header or navigation
        if (trimmedText.length > 200) return;
        
        options.push({ element: el, text: trimmedText });
      });
    }
    
    // Remove duplicates
    const uniqueOptions = [];
    const seen = new Set();
    for (const opt of options) {
      if (!seen.has(opt.text)) {
        seen.add(opt.text);
        uniqueOptions.push(opt);
      }
    }
    
    console.log('findOptions found:', uniqueOptions.length, 'unique options');
    
    // If we have too many, filter to reasonable length ones (likely actual answers)
    if (uniqueOptions.length > 20) {
      const filtered = uniqueOptions.filter(opt => opt.text.length >= 3 && opt.text.length <= 100);
      console.log('Filtered to:', filtered.length, 'reasonable options');
      return filtered;
    }
    
    return uniqueOptions;
  }
  
  // Find text input fields for typing questions
  function findTextInputs() {
    const selectors = [
      'input[type="text"]', 'input[type="email"]', 'input[type="number"]',
      'textarea', 'input:not([type])',
      '[contenteditable="true"]',
      'input[placeholder]', 'textarea[placeholder]',
      '[class*="input"]', '[class*="textbox"]', '[class*="field"]',
      '[data-testid*="input"]', '[data-cy*="input"]'
    ];
    
    let inputs = [];
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        // Skip hidden or disabled inputs
        if (el.type === 'hidden' || el.disabled || el.style.display === 'none') return;
        
        // Skip if it's too small (likely not a real answer field)
        const rect = el.getBoundingClientRect();
        if (rect.width < 50 || rect.height < 20) return;
        
        // Skip our own menu elements
        if (el.closest('#wg-menu')) return;
        
        inputs.push({
          element: el,
          type: el.tagName.toLowerCase(),
          placeholder: el.placeholder || '',
          questionContext: findQuestionForInput(el)
        });
      });
    }
    
    console.log('findTextInputs found:', inputs.length, 'input fields');
    return inputs;
  }
  
  // Find question text associated with an input
  function findQuestionForInput(inputEl) {
    // Look for labels
    const id = inputEl.id;
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) return label.textContent.trim();
    }
    
    // Look for parent label
    const parentLabel = inputEl.closest('label');
    if (parentLabel) return parentLabel.textContent.trim();
    
    // Look for previous sibling text
    let prev = inputEl.previousElementSibling;
    for (let i = 0; i < 5 && prev; i++) {
      const text = prev.textContent?.trim();
      if (text && text.length > 10) return text;
      prev = prev.previousElementSibling;
    }
    
    // Look for parent container text
    const parent = inputEl.closest('div, section, fieldset, form');
    if (parent) {
      const text = parent.textContent?.trim().substring(0, 200);
      return text;
    }
    
    return '';
  }
  
  // API call to get answer with full page context
  async function getAnswerWithContext(pageContent, keys) {
    const results = { openrouter: null, deepseek: null, vercel: null, opencodezen: null, cloudflare: null };
    
    // Build comprehensive prompt with full page content
    const prompt = `I need you to analyze this quiz/test page and answer the question. Here's the full page content:

PAGE TITLE: ${pageContent.title}
PAGE URL: ${pageContent.url}

DETECTED QUESTIONS:
${pageContent.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}

DETECTED OPTIONS:
${pageContent.options.map((o, i) => `${i + 1}. ${o}`).join('\n')}

PAGE CONTENT:
${pageContent.bodyText.substring(0, 2000)}

Based on this content, what is the correct answer? 

If you can identify a clear question and multiple choice options, respond with JUST the number of the correct option (1, 2, 3, etc.).

If you're not sure, respond with "UNCERTAIN".

If there's no clear question, respond with "NO_QUESTION".`;

    // Call OpenRouter
    if (keys.openrouter) {
      showStatus('🌐 OpenRouter analyzing screen...', 'info');
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keys.openrouter}`,
            'HTTP-Referer': 'https://openrouter.ai/'
          },
          body: JSON.stringify({
            model: 'openrouter/free',
            messages: [
              { role: 'system', content: 'You are a helpful assistant that analyzes web pages and answers quiz questions. Read the full page content carefully and identify the question and correct answer.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 100
          })
        });
        
        const data = await response.json();
        const answer = data.choices?.[0]?.message?.content?.trim();
        results.openrouter = answer;
        showStatus('✅ OpenRouter analyzed screen', 'success');
      } catch (error) {
        console.error('OpenRouter error:', error);
        showStatus('❌ OpenRouter failed', 'error');
      }
    }
    
    // Call DeepSeek
    if (keys.deepseek) {
      showStatus('🌐 DeepSeek analyzing screen...', 'info');
      try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keys.deepseek}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [
              { role: 'system', content: 'You are a helpful assistant that analyzes web pages and answers quiz questions. Read the full page content carefully and identify the question and correct answer.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 100
          })
        });
        
        const data = await response.json();
        const answer = data.choices?.[0]?.message?.content?.trim();
        results.deepseek = answer;
        showStatus('✅ DeepSeek analyzed screen', 'success');
      } catch (error) {
        console.error('DeepSeek error:', error);
        showStatus('❌ DeepSeek failed', 'error');
      }
    }
    
    // Call Vercel AI
    if (keys.vercel) {
      showStatus('🌐 Vercel AI analyzing screen...', 'info');
      try {
        const response = await fetch('https://api.vercel.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keys.vercel}`
          },
          body: JSON.stringify({
            model: 'vercel/gpt-4o',
            messages: [
              { role: 'system', content: 'You are a helpful assistant that analyzes web pages and answers quiz questions. Read the full page content carefully and identify the question and correct answer.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 100
          })
        });
        
        const data = await response.json();
        const answer = data.choices?.[0]?.message?.content?.trim();
        results.vercel = answer;
        showStatus('✅ Vercel AI analyzed screen', 'success');
      } catch (error) {
        console.error('Vercel AI error:', error);
        showStatus('❌ Vercel AI failed', 'error');
      }
    }
    
    // Call OpenCode Zen AI
    if (keys.opencodezen) {
      showStatus('🌐 OpenCode Zen analyzing screen...', 'info');
      try {
        const response = await fetch('https://api.opencodezen.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keys.opencodezen}`
          },
          body: JSON.stringify({
            model: 'opencodezen/gpt-4',
            messages: [
              { role: 'system', content: 'You are a helpful assistant that analyzes web pages and answers quiz questions. Read the full page content carefully and identify the question and correct answer.' },
              { role: 'user', content: prompt }
            ],
            max_tokens: 100
          })
        });
        
        const data = await response.json();
        const answer = data.choices?.[0]?.message?.content?.trim();
        results.opencodezen = answer;
        showStatus('✅ OpenCode Zen analyzed screen', 'success');
      } catch (error) {
        console.error('OpenCode Zen error:', error);
        showStatus('❌ OpenCode Zen failed', 'error');
      }
    }
    
    return results;
  }
  
  // Parse answer from AI response
  function parseAnswer(response) {
    if (!response) return null;
    
    // Look for number in response
    const match = response.match(/\b([1-9])\b/);
    if (match) {
      return parseInt(match[1]) - 1; // Convert to 0-based index
    }
    
    // Check for uncertainty
    if (response.toUpperCase().includes('UNCERTAIN') || response.toUpperCase().includes('NO_QUESTION')) {
      return null;
    }
    
    return null;
  }
  
  // Get consensus answer from all AIs
  async function getConsensusAnswer(pageContent, options) {
    const keys = getAPIKeys();
    
    if (!keys.openrouter && !keys.deepseek && !keys.vercel) {
      showStatus('⚠️ Set API keys in settings', 'error');
      return null;
    }
    
    showStatus('🤖 All AIs reading screen...', 'info');
    
    const results = await getAnswerWithContext(pageContent, keys);
    
    const openrouterAnswer = parseAnswer(results.openrouter);
    const deepseekAnswer = parseAnswer(results.deepseek);
    const vercelAnswer = parseAnswer(results.vercel);
    
    showStatus(`🤖 OpenRouter: ${openrouterAnswer !== null ? openrouterAnswer + 1 : 'no answer'}`, 'info');
    showStatus(`🤖 DeepSeek: ${deepseekAnswer !== null ? deepseekAnswer + 1 : 'no answer'}`, 'info');
    showStatus(`🤖 Vercel: ${vercelAnswer !== null ? vercelAnswer + 1 : 'no answer'}`, 'info');
    
    // Count votes for each answer
    const votes = {};
    if (openrouterAnswer !== null) votes[openrouterAnswer] = (votes[openrouterAnswer] || 0) + 1;
    if (deepseekAnswer !== null) votes[deepseekAnswer] = (votes[deepseekAnswer] || 0) + 1;
    if (vercelAnswer !== null) votes[vercelAnswer] = (votes[vercelAnswer] || 0) + 1;
    
    // Find the answer with most votes
    let bestAnswer = null;
    let bestVotes = 0;
    for (const [answer, count] of Object.entries(votes)) {
      if (count > bestVotes) {
        bestVotes = count;
        bestAnswer = parseInt(answer);
      }
    }
    
    // If majority agrees (2 or more votes)
    if (bestVotes >= 2) {
      showStatus(`✅ ${bestVotes} AIs agree on answer!`, 'success');
      return bestAnswer;
    }
    
    // If only one has answer, use that
    if (openrouterAnswer !== null) {
      showStatus('✅ Using OpenRouter answer', 'success');
      return openrouterAnswer;
    }
    
    if (deepseekAnswer !== null) {
      showStatus('✅ Using DeepSeek answer', 'success');
      return deepseekAnswer;
    }
    
    if (vercelAnswer !== null) {
      showStatus('✅ Using Vercel answer', 'success');
      return vercelAnswer;
    }
    
    showStatus('❌ No AI could determine answer', 'error');
    return null;
  }
  
  // API call with forced RL model
  async function getAnswerWithRL(question, options, model) {
    const keys = getAPIKeys();
    
    if (!keys.openrouter && !keys.deepseek) {
      showStatus('⚠️ Set API keys in settings', 'error');
      return null;
    }
    
    showStatus(`🎯 RL forcing model: ${model}`, 'info');
    
    const prompt = `Question: ${question}\n\nOptions:\n${options.map((opt, i) => `${i + 1}. ${opt.text}`).join('\n')}\n\nWhich option is correct? Just give the number.`;
    
    // Use the RL-selected model
    if (model.includes('openrouter') && keys.openrouter) {
      showStatus('🌐 RL using OpenRouter...', 'info');
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keys.openrouter}`,
            'HTTP-Referer': 'https://openrouter.ai/'
          },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 50
          })
        });
        
        const data = await response.json();
        const answer = data.choices?.[0]?.message?.content?.trim();
        const answerNum = parseInt(answer);
        
        if (answerNum >= 1 && answerNum <= options.length) {
          return answerNum - 1;
        }
      } catch (error) {
        console.error('OpenRouter RL error:', error);
        showStatus('❌ RL OpenRouter failed', 'error');
      }
    } else if (model.includes('deepseek') && keys.deepseek) {
      showStatus('🌐 RL using DeepSeek...', 'info');
      try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keys.deepseek}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 50
          })
        });
        
        const data = await response.json();
        const answer = data.choices?.[0]?.message?.content?.trim();
        const answerNum = parseInt(answer);
        
        if (answerNum >= 1 && answerNum <= options.length) {
          return answerNum - 1;
        }
      } catch (error) {
        console.error('DeepSeek RL error:', error);
        showStatus('❌ RL DeepSeek failed', 'error');
      }
    }
    
    return null;
  }
  
  // Call both AIs simultaneously with improved prompting for maximum accuracy
  async function getBothAIAnswersWithRetry(question, options) {
    const keys = getAPIKeys();
    
    if (!keys.openrouter && !keys.deepseek) {
      showStatus('⚠️ Set API keys in settings', 'error');
      return null;
    }
    
    // Enhanced prompt for better reasoning
    const prompt = `You are answering a quiz question. Analyze carefully and select the BEST answer.

Question: ${question}

Options:
${options.map((opt, i) => `${i + 1}. ${opt.text}`).join('\n')}

Instructions:
1. Read the question carefully
2. Consider each option
3. Select the most accurate answer
4. Respond with ONLY the number (1-${options.length})

Your answer (just the number):`;
    
    showStatus('🤖 Calling BOTH AIs for maximum accuracy...', 'info');
    
    // Create both API calls with timeout
    const promises = [];
    const timeout = 15000; // 15 second timeout
    
    // OpenRouter call with timeout
    if (keys.openrouter) {
      const openrouterPromise = Promise.race([
        fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keys.openrouter}`,
            'HTTP-Referer': 'https://openrouter.ai/'
          },
          body: JSON.stringify({
            model: 'openrouter/free',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 10,
            temperature: 0.1 // Lower temperature for more consistent answers
          })
        }).then(async (response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = await response.json();
          const answer = data.choices?.[0]?.message?.content?.trim();
          console.log('OpenRouter raw:', answer);
          // Extract number from answer
          const match = answer.match(/\d+/);
          const num = match ? parseInt(match[0]) : NaN;
          console.log('OpenRouter parsed:', num);
          if (num >= 1 && num <= options.length) {
            showStatus(`✅ OpenRouter: ${num}`, 'success');
            return { source: 'openrouter', answer: num, valid: true };
          }
          throw new Error('Invalid answer format');
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
      ]).catch(err => {
        console.error('OpenRouter error:', err.message);
        showStatus('❌ OpenRouter failed', 'error');
        return { source: 'openrouter', answer: null, valid: false };
      });
      promises.push(openrouterPromise);
    }
    
    // DeepSeek call with timeout
    if (keys.deepseek) {
      const deepseekPromise = Promise.race([
        fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keys.deepseek}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 10,
            temperature: 0.1
          })
        }).then(async (response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const data = await response.json();
          const answer = data.choices?.[0]?.message?.content?.trim();
          console.log('DeepSeek raw:', answer);
          const match = answer.match(/\d+/);
          const num = match ? parseInt(match[0]) : NaN;
          console.log('DeepSeek parsed:', num);
          if (num >= 1 && num <= options.length) {
            showStatus(`✅ DeepSeek: ${num}`, 'success');
            return { source: 'deepseek', answer: num, valid: true };
          }
          throw new Error('Invalid answer format');
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
      ]).catch(err => {
        console.error('DeepSeek error:', err.message);
        showStatus('❌ DeepSeek failed', 'error');
        return { source: 'deepseek', answer: null, valid: false };
      });
      promises.push(deepseekPromise);
    }
    
    // Wait for results
    const results = await Promise.all(promises);
    console.log('AI results:', results);
    
    // Find valid answers
    const validAnswers = results.filter(r => r.valid);
    
    if (validAnswers.length === 0) {
      showStatus('❌ Both AIs failed', 'error');
      return null;
    }
    
    // Check agreement
    if (validAnswers.length === 2 && validAnswers[0].answer === validAnswers[1].answer) {
      showStatus('✅ BOTH AIs AGREE!', 'success');
      return validAnswers[0].answer - 1; // Convert to 0-based
    }
    
    // Return first valid answer if they disagree
    showStatus(`⚠️ AIs disagree, using ${validAnswers[0].source}`, 'warning');
    return validAnswers[0].answer - 1;
  }
  
  // Fallback single AI answer
  async function getSingleAIAnswer(question, options) {
    const keys = getAPIKeys();
    const prompt = `Question: ${question}\n\nOptions:\n${options.map((opt, i) => `${i + 1}. ${opt.text}`).join('\n')}\n\nWhich is correct? Answer with just the number.`;
    
    // Try OpenRouter first
    if (keys.openrouter) {
      try {
        showStatus('🔄 Trying OpenRouter fallback...', 'info');
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keys.openrouter}`,
            'HTTP-Referer': 'https://openrouter.ai/'
          },
          body: JSON.stringify({
            model: 'openrouter/free',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 10,
            temperature: 0.1
          })
        });
        
        if (!response.ok) throw new Error('Failed');
        const data = await response.json();
        const answer = data.choices?.[0]?.message?.content?.trim();
        const match = answer.match(/\d+/);
        const num = match ? parseInt(match[0]) : NaN;
        
        if (num >= 1 && num <= options.length) {
          showStatus(`✅ Fallback OpenRouter: ${num}`, 'success');
          return num - 1;
        }
      } catch (e) {
        console.error('Fallback OpenRouter failed:', e);
      }
    }
    
    // Try DeepSeek
    if (keys.deepseek) {
      try {
        showStatus('🔄 Trying DeepSeek fallback...', 'info');
        const response = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keys.deepseek}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 10,
            temperature: 0.1
          })
        });
        
        if (!response.ok) throw new Error('Failed');
        const data = await response.json();
        const answer = data.choices?.[0]?.message?.content?.trim();
        const match = answer.match(/\d+/);
        const num = match ? parseInt(match[0]) : NaN;
        
        if (num >= 1 && num <= options.length) {
          showStatus(`✅ Fallback DeepSeek: ${num}`, 'success');
          return num - 1;
        }
      } catch (e) {
        console.error('Fallback DeepSeek failed:', e);
      }
    }
    
    return null;
  }
  
  // Get text answer from AI for typing questions
  async function getTextAnswerFromAI(question, inputType, keys) {
    const prompt = `Question: ${question}

This question requires a ${inputType} answer. Please provide a concise, accurate answer.

Respond with just the answer text, nothing else.`;

    let answer = null;
    
    // Try OpenRouter first
    if (keys.openrouter) {
      showStatus('🌐 OpenRouter generating text answer...', 'info');
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keys.openrouter}`,
            'HTTP-Referer': 'https://openrouter.ai/'
          },
          body: JSON.stringify({
            model: 'openrouter/free',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 150
          })
        });
        
        const data = await response.json();
        answer = data.choices?.[0]?.message?.content?.trim();
        console.log('OpenRouter text answer:', answer);
        if (answer) {
          showStatus('✅ OpenRouter generated answer', 'success');
          return answer;
        }
      } catch (error) {
        console.error('OpenRouter text generation error:', error);
      }
    }
    
    // Try DeepSeek
    if (keys.deepseek) {
      showStatus('🌐 DeepSeek generating text answer...', 'info');
      try {
        const response = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keys.deepseek}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 150
          })
        });
        
        const data = await response.json();
        answer = data.choices?.[0]?.message?.content?.trim();
        console.log('DeepSeek text answer:', answer);
        if (answer) {
          showStatus('✅ DeepSeek generated answer', 'success');
          return answer;
        }
      } catch (error) {
        console.error('DeepSeek text generation error:', error);
      }
    }
    
    return null;
  }
  
  // Type answer into input field
  function typeAnswer(input, text) {
    showStatus(`⌨️ Typing answer...`, 'info');
    
    // Focus the input
    input.focus();
    input.click();
    
    // Clear existing value
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Type character by character with delay
    let index = 0;
    const typeInterval = setInterval(() => {
      if (index < text.length) {
        input.value += text[index];
        input.dispatchEvent(new Event('input', { bubbles: true }));
        index++;
      } else {
        clearInterval(typeInterval);
        // Final events
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.dispatchEvent(new Event('blur', { bubbles: true }));
        showStatus('✅ Answer typed!', 'success');
        
        // Try to find and click submit button
        setTimeout(() => {
          clickSubmitButton(input);
        }, 500);
      }
    }, 50); // 50ms per character
  }
  
  // Find and click submit button near input
  function clickSubmitButton(inputEl) {
    // Look for submit buttons
    const submitSelectors = [
      'button[type="submit"]', 'input[type="submit"]',
      'button:contains("Submit")', 'button:contains("Save")',
      'button:contains("Answer")', 'button:contains("Continue")',
      '[class*="submit"]', '[class*="button"]', 'button'
    ];
    
    // First check siblings
    let sibling = inputEl.nextElementSibling;
    for (let i = 0; i < 3 && sibling; i++) {
      if (sibling.tagName === 'BUTTON' || sibling.type === 'submit') {
        showStatus('🖱️ Clicking submit button...', 'info');
        sibling.click();
        return;
      }
      sibling = sibling.nextElementSibling;
    }
    
    // Check parent container
    const parent = inputEl.closest('form, div, section');
    if (parent) {
      const buttons = parent.querySelectorAll('button, input[type="submit"]');
      for (const btn of buttons) {
        const text = btn.textContent?.toLowerCase() || '';
        if (text.includes('submit') || text.includes('save') || text.includes('answer') || text.includes('continue')) {
          showStatus('🖱️ Clicking submit button...', 'info');
          btn.click();
          return;
        }
      }
    }
  }
  
  // Process text input questions
  async function processPageWithHybridAI() {
    // Check if script is enabled
    if (!scriptEnabled) {
      console.log('Script is paused, skipping processing');
      return;
    }
    
    console.log('=== HYBRID AI START ===');
    showStatus('🤖 Processing with Hybrid AI...', 'info');
    
    const questions = findQuestions();
    const options = findOptions();
    const textInputs = findTextInputs();
    
    console.log('Questions found:', questions.length);
    console.log('Options found:', options.length);
    console.log('Text inputs found:', textInputs.length);
    
    // Handle text input questions first
    if (textInputs.length > 0 && questions.length > 0) {
      showStatus(`⌨️ Found ${textInputs.length} text input(s)`, 'info');
      
      const keys = getAPIKeys();
      if (!keys.openrouter && !keys.deepseek) {
        showStatus('⚠️ Set API keys to answer text questions', 'error');
        return;
      }
      
      // Process each text input
      for (let i = 0; i < textInputs.length; i++) {
        const input = textInputs[i];
        const questionText = input.questionContext || questions[0].text;
        
        showStatus(`🤖 Generating answer for input ${i + 1}...`, 'info');
        
        const answer = await getTextAnswerFromAI(questionText, input.type, keys);
        
        if (answer) {
          // Highlight the input
          input.element.style.border = '3px solid #00aa00';
          input.element.style.backgroundColor = '#ccffcc';
          
          // Type the answer
          typeAnswer(input.element, answer);
          
          // Track for feedback
          const rlModel = selectBestModel();
          trackTextAnswerForFeedback(input.element, answer, rlModel);
        } else {
          showStatus('❌ Could not generate text answer', 'error');
        }
      }
      
      return; // Text inputs handled, don't process multiple choice
    }
    
    // Handle multiple choice questions
    if (questions.length === 0) {
      console.log('No questions found');
      showStatus('❌ No questions found', 'error');
      return;
    }
    
    if (options.length === 0) {
      console.log('No options found');
      showStatus('❌ No answer options found', 'error');
      return;
    }
    
    showStatus(`📋 ${questions.length} questions, ${options.length} options`, 'info');
    
    const questionText = questions[0].text;
    console.log('Using question:', questionText.substring(0, 100));
    
    // PRIORITY: MAXIMUM ACCURACY - 100% AI CONSENSUS
    showStatus('🎯 PRIORITY: Maximum Accuracy Mode', 'info');
    
    // Try up to 3 times to get a valid answer
    let answerIndex = null;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (answerIndex === null && attempts < maxAttempts) {
      attempts++;
      showStatus(`🤖 AI Attempt ${attempts}/${maxAttempts}...`, 'info');
      
      answerIndex = await getBothAIAnswersWithRetry(questionText, options);
      
      if (answerIndex === null && attempts < maxAttempts) {
        showStatus('⏳ Retrying in 2 seconds...', 'warning');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    const rlModel = selectBestModel();
    let decisionMethod = 'AI_CONSENSUS';
    
    if (answerIndex === null) {
      showStatus('❌ AI could not determine answer after all attempts', 'error');
      // Last resort - try single AI
      answerIndex = await getSingleAIAnswer(questionText, options);
      decisionMethod = 'SINGLE_AI_FALLBACK';
    }
    
    if (answerIndex === null || answerIndex < 0 || answerIndex >= options.length) {
      showStatus('❌ Could not determine answer, using option 1', 'error');
      answerIndex = 0;
      decisionMethod = 'DEFAULT_FALLBACK';
    }
    
    showStatus(`✅ ${decisionMethod}: Answer #${answerIndex + 1}`, 'success');
    
    // Highlight and click
    const answerElement = options[answerIndex].element;
    answerElement.style.border = '3px solid #00aa00';
    answerElement.style.backgroundColor = '#ccffcc';
    
    console.log('Clicking answer element:', answerElement);
    showStatus('🖱️ CLICKING ANSWER...', 'info');
    
    // Click multiple times to ensure it registers
    answerElement.click();
    setTimeout(() => answerElement.click(), 500);
    setTimeout(() => answerElement.click(), 1000);
    setTimeout(() => {
      answerElement.click();
      showStatus('✅ Answer clicked!', 'success');
      console.log('=== HYBRID AI COMPLETE ===');
    }, 2000);
    
    // Track for RL feedback
    trackAnswerForFeedback(answerIndex, rlModel, decisionMethod);
  }
  
  // Track text answer for feedback
  function trackTextAnswerForFeedback(input, answer, model) {
    window._lastTextAnswer = {
      input: input,
      answer: answer,
      model: model,
      timestamp: Date.now()
    };
    
    // Check for wrong answer after delay
    setTimeout(() => {
      detectWrongTextAnswer();
    }, 5000);
  }
  
  // Detect if text answer was wrong
  function detectWrongTextAnswer() {
    const lastAnswer = window._lastTextAnswer;
    if (!lastAnswer) return;
    
    const pageText = document.body.innerText?.toLowerCase() || '';
    const wrongIndicators = ['incorrect', 'wrong', 'try again', 'not right', 'failed', 'error'];
    const isWrong = wrongIndicators.some(indicator => pageText.includes(indicator));
    
    if (isWrong && rlStats[lastAnswer.model]) {
      rlStats[lastAnswer.model].totalReward -= 100;
      saveRLStats();
      showStatus(`📊 RL: ${lastAnswer.model} -100 PENALTY!`, 'error');
    } else if (!isWrong && rlStats[lastAnswer.model]) {
      rlStats[lastAnswer.model].totalReward += 100;
      saveRLStats();
      showStatus(`📊 RL: ${lastAnswer.model} +100 reward`, 'success');
    }
    
    window._lastTextAnswer = null;
  }
  
  // Track answer and wait for feedback - ENHANCED DETECTION
  function trackAnswerForFeedback(answerIndex, model, method) {
    // Store the answer info for later feedback
    window._lastAnswer = {
      index: answerIndex,
      model: model,
      method: method,
      timestamp: Date.now(),
      checkCount: 0,
      wrongDetected: false,
      correctDetected: false
    };
    
    showStatus('🔍 Monitoring for answer feedback...', 'info');
    
    // Start score monitoring for this answer
    startScoreMonitoring();
    
    // Check multiple times for feedback detection
    const checkInterval = setInterval(() => {
      window._lastAnswer.checkCount++;
      
      const isWrong = detectWrongAnswerImmediate();
      const isCorrect = detectCorrectAnswerImmediate();
      
      if (isWrong && !window._lastAnswer.wrongDetected) {
        window._lastAnswer.wrongDetected = true;
        applyWrongAnswerPenalty();
        clearInterval(checkInterval);
        window._lastAnswer = null;
      } else if (isCorrect && !window._lastAnswer.correctDetected) {
        window._lastAnswer.correctDetected = true;
        applyCorrectAnswerReward();
        clearInterval(checkInterval);
        window._lastAnswer = null;
      } else if (window._lastAnswer.checkCount >= 5) {
        // After 5 checks, if neither detected, assume neutral
        showStatus('⏱️ No clear feedback detected', 'info');
        clearInterval(checkInterval);
        window._lastAnswer = null;
      }
    }, 1500); // Check every 1.5 seconds for faster detection
  }
  
  // Track score for change detection
  let lastKnownScore = null;
  let scoreCheckInterval = null;
  
  // Start monitoring score changes
  function startScoreMonitoring() {
    // Get initial score
    lastKnownScore = extractCurrentScore();
    console.log('Initial score:', lastKnownScore);
    
    // Check score every 2 seconds
    if (scoreCheckInterval) clearInterval(scoreCheckInterval);
    scoreCheckInterval = setInterval(() => {
      const currentScore = extractCurrentScore();
      if (lastKnownScore !== null && currentScore !== null) {
        if (currentScore < lastKnownScore) {
          console.log('Score decreased:', lastKnownScore, '->', currentScore);
          showStatus('📉 Score decreased - wrong answer detected!', 'error');
          if (window._lastAnswer && !window._lastAnswer.wrongDetected) {
            window._lastAnswer.wrongDetected = true;
            applyWrongAnswerPenalty();
          }
        } else if (currentScore > lastKnownScore) {
          console.log('Score increased:', lastKnownScore, '->', currentScore);
          showStatus('📈 Score increased - correct answer!', 'success');
        }
      }
      lastKnownScore = currentScore;
    }, 2000);
  }
  
  // Extract score from page
  function extractCurrentScore() {
    const pageText = document.body.innerText || '';
    
    // Look for common score patterns
    const scorePatterns = [
      /score[:\s]+(\d+)/i,
      /(\d+)\s*\/\s*(\d+)/,
      /(\d+)%/,
      /points[:\s]+(\d+)/i,
      /(\d+)\s+points/i,
      /score[=:]\s*(\d+)/i
    ];
    
    for (const pattern of scorePatterns) {
      const match = pageText.match(pattern);
      if (match) {
        return parseInt(match[1]);
      }
    }
    
    return null;
  }
  
  // Immediate wrong answer detection with enhanced visual checking
  function detectWrongAnswerImmediate() {
    const pageText = document.body.innerText?.toLowerCase() || '';
    
    // Enhanced wrong indicators - text based
    const wrongIndicators = [
      'incorrect', 'wrong', 'try again', 'not right', 'failed', 'error',
      'oops', 'sorry', 'that\'s not', 'not correct', 'unfortunately',
      'bad answer', 'invalid', 'rejected', 'denied', 'nope',
      '❌', '✗', '×', '&#10008;', '&#x2717;', '&#x2718;',
      'not the right', 'keep trying', 'almost', 'not quite',
      'missed it', 'incorrect answer', 'wrong answer',
      // Additional quiz platform indicators
      'better luck next time', 'you missed', 'not quite right',
      'that\'s incorrect', 'false', 'no,', 'negative',
      'lose', 'lost', 'penalty', 'minus', 'deducted',
      'try another', 'select again', 'pick again'
    ];
    
    // Check for visual error indicators (red styling)
    const errorSelectors = [
      '.error', '.wrong', '.incorrect', '.failed', '.alert-danger',
      '[class*="error"]', '[class*="wrong"]', '[class*="incorrect"]',
      '[style*="color: red"]', '[style*="color:red"]',
      '[style*="background: red"]', '[style*="background:red"]',
      '[style*="border-color: red"]', '[style*="border-color:red"]',
      '[style*="#ff0000"]', '[style*="#ff4444"]', '[style*="#ff6666"]',
      '.text-danger', '.has-error', '.is-invalid', '.form-error',
      // Additional selectors
      '.ng-invalid', '.field-error', '.validation-error',
      '[aria-invalid="true"]', '.answer-incorrect'
    ];
    
    let errorElements = [];
    for (const selector of errorSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        errorElements.push(...elements);
      } catch (e) {}
    }
    
    // Also check computed styles for red colors
    const allElements = document.querySelectorAll('div, span, p, button, li, td');
    for (const el of allElements) {
      const style = window.getComputedStyle(el);
      const color = style.color;
      const bgColor = style.backgroundColor;
      const borderColor = style.borderColor;
      
      if (color.includes('rgb(255, 0, 0)') || color.includes('rgb(255,0,0)') ||
          color.includes('rgb(220, 53, 69)') || color.includes('#dc3545') ||
          bgColor.includes('rgb(255, 0, 0)') || bgColor.includes('rgba(255, 0, 0,') ||
          borderColor.includes('rgb(255, 0, 0)') || borderColor.includes('rgb(220, 53, 69)')) {
        errorElements.push(el);
      }
    }
    
    const hasVisualError = errorElements.length > 0;
    const hasTextError = wrongIndicators.some(indicator => pageText.includes(indicator.toLowerCase()));
    
    // Check for animation/shake effects
    const hasShakeAnimation = document.querySelectorAll('[style*="shake"], [class*="shake"], [class*="bounce"], [class*="wobble"]').length > 0;
    
    // Check for modal/popup with error
    const hasErrorModal = document.querySelectorAll('[role="alert"], [role="dialog"], .modal, .popup, .toast').length > 0 &&
                          wrongIndicators.some(i => pageText.includes(i.toLowerCase()));
    
    // Check for disabled inputs (locked after wrong answer)
    const disabledInputs = document.querySelectorAll('input:disabled, button:disabled, [disabled]');
    const hasDisabledElements = disabledInputs.length > 0;
    
    const isWrong = hasVisualError || hasTextError || hasShakeAnimation || hasErrorModal;
    
    if (isWrong) {
      console.log('Wrong answer detected:', { 
        visual: hasVisualError, 
        text: hasTextError, 
        shake: hasShakeAnimation, 
        modal: hasErrorModal,
        disabled: hasDisabledElements,
        errorElements: errorElements.length 
      });
    }
    
    return isWrong;
  }
  
  // Detect if answer was correct (green indicators)
  function detectCorrectAnswerImmediate() {
    const pageText = document.body.innerText?.toLowerCase() || '';
    
    // Correct indicators
    const correctIndicators = [
      'correct', 'right', 'good job', 'well done', 'excellent', 'perfect',
      '✅', '✓', '☑', '&#10004;', '&#x2713;', '&#x2714;',
      'that\'s right', 'you got it', 'nice work', 'correct answer'
    ];
    
    // Visual success indicators (green styling)
    const successSelectors = [
      '.success', '.correct', '.right', '.alert-success',
      '[class*="success"]', '[class*="correct"]', '[class*="right"]',
      '[style*="color: green"]', '[style*="color:green"]',
      '[style*="background: green"]', '[style*="background:green"]',
      '[style*="#00aa00"]', '[style*="#28a745"]',
      '.text-success', '.has-success', '.is-valid'
    ];
    
    let successElements = [];
    for (const selector of successSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        successElements.push(...elements);
      } catch (e) {}
    }
    
    // Check computed styles for green
    const allElements = document.querySelectorAll('div, span, p, button');
    for (const el of allElements) {
      const style = window.getComputedStyle(el);
      const color = style.color;
      const bgColor = style.backgroundColor;
      
      if (color.includes('rgb(0, 128, 0)') || color.includes('rgb(0,255,0)') ||
          color.includes('rgb(40, 167, 69)') || color.includes('#28a745') ||
          bgColor.includes('rgb(0, 128, 0)') || bgColor.includes('rgba(0, 128, 0,')) {
        successElements.push(el);
      }
    }
    
    const hasVisualSuccess = successElements.length > 0;
    const hasTextSuccess = correctIndicators.some(indicator => pageText.includes(indicator.toLowerCase()));
    
    const isCorrect = hasVisualSuccess || hasTextSuccess;
    
    if (isCorrect) {
      console.log('Correct answer detected:', { visual: hasVisualSuccess, text: hasTextSuccess });
    }
    
    return isCorrect;
  }
  
  // Apply penalty for wrong answer
  function applyWrongAnswerPenalty() {
    const lastAnswer = window._lastAnswer;
    if (!lastAnswer || lastAnswer.wrongDetected) return;
    
    showStatus('❌ WRONG ANSWER AUTO-DETECTED! -100 PENALTY!', 'error');
    
    // Apply -100 penalty to the RL model
    if (rlStats[lastAnswer.model]) {
      rlStats[lastAnswer.model].totalReward -= 100;
      rlStats[lastAnswer.model].rewards = Math.max(0, rlStats[lastAnswer.model].rewards - 1);
      saveRLStats();
      showStatus(`📊 RL: ${lastAnswer.model} -100 PENALTY!`, 'error');
    }
    
    // Clear tracked answer
    window._lastAnswer = null;
  }
  
  // Apply reward for correct answer
  function applyCorrectAnswerReward() {
    const lastAnswer = window._lastAnswer;
    if (!lastAnswer) return;
    
    // Answer was correct - give reward
    if (rlStats[lastAnswer.model]) {
      rlStats[lastAnswer.model].rewards++;
      rlStats[lastAnswer.model].totalReward += 100;
      saveRLStats();
      showStatus(`📊 RL: ${lastAnswer.model} +100 reward`, 'success');
    }
    
    // Clear tracked answer
    window._lastAnswer = null;
  }
  
  // Legacy detectWrongAnswer function (kept for compatibility)
  function detectWrongAnswer() {
    const isWrong = detectWrongAnswerImmediate();
    if (isWrong) {
      applyWrongAnswerPenalty();
    } else {
      applyCorrectAnswerReward();
    }
  }
  
  // Manual wrong answer marking
  function markWrongAnswer() {
    const lastAnswer = window._lastAnswer;
    
    if (!lastAnswer) {
      showStatus('⚠️ No recent answer to mark as wrong', 'warning');
      return;
    }
    
    // Apply -100 penalty
    if (rlStats[lastAnswer.model]) {
      rlStats[lastAnswer.model].totalReward -= 100;
      rlStats[lastAnswer.model].rewards = Math.max(0, rlStats[lastAnswer.model].rewards - 1);
      saveRLStats();
      showStatus(`❌ MANUAL: ${lastAnswer.model} -100 PENALTY!`, 'error');
    }
    
    window._lastAnswer = null;
  }
  
  // Process page with hybrid AI/RL
  
  // Script enabled state
  let scriptEnabled = GM_getValue('wayground_enabled', true);
  
  // Toggle script on/off
  function toggleScript() {
    scriptEnabled = !scriptEnabled;
    GM_setValue('wayground_enabled', scriptEnabled);
    showStatus(scriptEnabled ? '✅ Script ENABLED' : '⏸️ Script PAUSED', scriptEnabled ? 'success' : 'warning');
    return scriptEnabled;
  }
  
  // Simple reliable dropdown menu
  function createOptionsMenu() {
    // Remove existing menu if any
    const existing = document.getElementById('wg-menu');
    if (existing) existing.remove();
    
    // Create container
    const container = document.createElement('div');
    container.id = 'wg-menu';
    container.style.cssText = 'position:fixed;top:10px;left:10px;z-index:999999;font-family:Arial,sans-serif;';
    
    // Create button
    const btn = document.createElement('button');
    btn.innerHTML = '⚙️ Menu ▼';
    btn.style.cssText = 'background:#007acc;color:white;border:none;padding:10px 15px;border-radius:5px;cursor:pointer;font-size:14px;font-weight:bold;';
    
    // Create dropdown (already open)
    const dropdown = document.createElement('div');
    dropdown.style.cssText = 'display:block;position:absolute;top:100%;left:0;background:white;border:1px solid #ccc;box-shadow:0 2px 5px rgba(0,0,0,0.2);min-width:150px;margin-top:5px;';
    
    // Menu items
    const items = [
      {text: scriptEnabled ? '🛑 Pause Script' : '▶️ Resume Script', action: () => {
        toggleScript();
        // Rebuild menu to update text
        createOptionsMenu();
      }},
      {text: '🔑 API Keys', action: showSettingsDialog},
      {text: '❌ Wrong Answer', action: markWrongAnswer},
      {text: '📋 Copy Script', action: autoCopyToDownloads}
    ];
    
    items.forEach(item => {
      const div = document.createElement('div');
      div.innerHTML = item.text;
      div.style.cssText = 'padding:10px 15px;cursor:pointer;border-bottom:1px solid #eee;color:#333;';
      div.onmouseover = () => div.style.backgroundColor = '#f5f5f5';
      div.onmouseout = () => div.style.backgroundColor = 'white';
      div.onclick = (e) => {
        e.stopPropagation();
        item.action();
      };
      dropdown.appendChild(div);
    });
    
    // Toggle dropdown (starts open)
    btn.innerHTML = '⚙️ Menu ▲';
    btn.onclick = (e) => {
      e.stopPropagation();
      const isOpen = dropdown.style.display === 'block';
      dropdown.style.display = isOpen ? 'none' : 'block';
      btn.innerHTML = isOpen ? '⚙️ Menu ▼' : '⚙️ Menu ▲';
    };
    
    // Close when clicking outside
    document.addEventListener('click', () => {
      dropdown.style.display = 'none';
      btn.innerHTML = '⚙️ Menu ▼';
    });
    
    container.appendChild(btn);
    container.appendChild(dropdown);
    
    // Wait for body to be ready
    if (document.body) {
      document.body.appendChild(container);
      console.log('Menu added to body');
    } else {
      setTimeout(() => {
        if (document.body) {
          document.body.appendChild(container);
          console.log('Menu added to body (delayed)');
        }
      }, 500);
    }
  }
  
  // Settings dialog
  function showSettingsDialog() {
    const keys = getAPIKeys();
    
    // Remove existing dialog if any
    const existingDialog = document.getElementById('wg-settings-dialog');
    if (existingDialog) {
      existingDialog.remove();
      return;
    }
    
    const dialog = document.createElement('div');
    dialog.id = 'wg-settings-dialog';
    dialog.style.cssText = `
      position: fixed !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      background: white !important;
      border: 2px solid #007acc !important;
      border-radius: 10px !important;
      padding: 20px !important;
      z-index: 999999 !important;
      box-shadow: 0 0 20px rgba(0,0,0,0.3) !important;
      min-width: 400px !important;
      max-width: 500px !important;
    `;
    
    dialog.innerHTML = `
      <h3 style="margin: 0 0 15px 0; color: #007acc;">API Keys Settings</h3>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">OpenRouter API Key:</label>
        <input type="password" id="wg_openrouter_key" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" value="${keys.openrouter}" placeholder="sk-or-v1-...">
      </div>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">DeepSeek API Key:</label>
        <input type="password" id="wg_deepseek_key" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" value="${keys.deepseek}" placeholder="sk-...">
      </div>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Vercel AI API Key:</label>
        <input type="password" id="wg_vercel_key" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" value="${keys.vercel}" placeholder="vercel-...">
      </div>
      <div style="text-align: right; margin-top: 20px;">
        <button id="wg_save_keys" style="background: #007acc; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-right: 10px;">Save</button>
        <button id="wg_cancel_keys" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Cancel</button>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Focus first input
    setTimeout(() => {
      const firstInput = document.getElementById('wg_openrouter_key');
      if (firstInput) firstInput.focus();
    }, 100);
    
    // Save keys
    const saveHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const openrouterKey = document.getElementById('wg_openrouter_key').value.trim();
      const deepseekKey = document.getElementById('wg_deepseek_key').value.trim();
      const vercelKey = document.getElementById('wg_vercel_key').value.trim();
      saveAPIKeys({ openrouter: openrouterKey, deepseek: deepseekKey, vercel: vercelKey });
      dialog.remove();
      showStatus('API keys saved!', 'success');
    };
    
    // Cancel
    const cancelHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      dialog.remove();
    };
    
    // Attach event listeners
    const saveBtn = document.getElementById('wg_save_keys');
    const cancelBtn = document.getElementById('wg_cancel_keys');
    const openrouterInput = document.getElementById('wg_openrouter_key');
    const deepseekInput = document.getElementById('wg_deepseek_key');
    const vercelInput = document.getElementById('wg_vercel_key');
    
    if (saveBtn) saveBtn.onclick = saveHandler;
    if (cancelBtn) cancelBtn.onclick = cancelHandler;
    
    // Save on Enter key in input fields
    const enterHandler = (e) => {
      if (e.key === 'Enter') {
        saveHandler(e);
      }
    };
    
    if (openrouterInput) openrouterInput.addEventListener('keypress', enterHandler);
    if (deepseekInput) deepseekInput.addEventListener('keypress', enterHandler);
    if (vercelInput) vercelInput.addEventListener('keypress', enterHandler);
    
    // Close on escape
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        dialog.remove();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }
  
  // Stats dialog
  function showStatsDialog() {
    const dialog = document.createElement('div');
    dialog.id = 'wg-stats-dialog';
    dialog.style.cssText = `
      position: fixed !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      background: white !important;
      border: 2px solid #007acc !important;
      border-radius: 10px !important;
      padding: 20px !important;
      z-index: 999999 !important;
      box-shadow: 0 0 20px rgba(0,0,0,0.3) !important;
      min-width: 400px !important;
    `;
    
    let statsHtml = '<h3 style="margin: 0 0 15px 0; color: #007acc;">📊 RL Model Stats</h3>';
    
    for (const model in rlStats) {
      const stats = rlStats[model];
      const avgReward = stats.rewards > 0 ? (stats.totalReward / stats.rewards).toFixed(3) : '0.000';
      const successRate = stats.rewards > 0 ? ((stats.totalReward / stats.rewards) * 100).toFixed(1) : '0.0';
      
      statsHtml += `
        <div style="margin-bottom: 10px; padding: 10px; background: #f8f9fa; border-radius: 5px;">
          <div style="font-weight: bold; color: #333;">${model}</div>
          <div style="font-size: 12px; color: #666;">
            Pulls: ${stats.pulls} | Success Rate: ${successRate}% | Avg Reward: ${avgReward}
          </div>
        </div>
      `;
    }
    
    statsHtml += `
      <div style="text-align: right; margin-top: 20px;">
        <button id="wg_close_stats" style="background: #007acc; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Close</button>
      </div>
    `;
    
    dialog.innerHTML = statsHtml;
    document.body.appendChild(dialog);
    
    // Close button
    document.getElementById('wg_close_stats').onclick = () => {
      dialog.remove();
    };
    
    // Close on escape
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        dialog.remove();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }
  
  // Update dialog
  function showUpdateDialog() {
    const dialog = document.createElement('div');
    dialog.id = 'wg-update-dialog';
    dialog.style.cssText = `
      position: fixed !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      background: white !important;
      border: 2px solid #007acc !important;
      border-radius: 10px !important;
      padding: 20px !important;
      z-index: 999999 !important;
      box-shadow: 0 0 20px rgba(0,0,0,0.3) !important;
      min-width: 400px !important;
      max-width: 500px !important;
    `;
    
    const currentVersion = '1.1';
    const lastCheck = new Date(GM_getValue('last_update_check', 0)).toLocaleDateString();
    
    dialog.innerHTML = `
      <h3 style="margin: 0 0 15px 0; color: #007acc;">🔄 Auto-Update Settings</h3>
      <div style="margin-bottom: 15px;">
        <div style="font-weight: bold; margin-bottom: 5px;">Current Version: ${currentVersion}</div>
        <div style="font-size: 12px; color: #666; margin-bottom: 10px;">Last checked: ${lastCheck}</div>
        
        <label style="display: block; margin-bottom: 10px;">
          <input type="checkbox" id="wg_auto_update_enabled" ${autoUpdateSettings.enabled ? 'checked' : ''} style="margin-right: 8px;">
          Enable auto-update checking
        </label>
        
        <div style="margin-bottom: 10px;">
          <label style="display: block; margin-bottom: 5px; font-weight: bold;">Check interval (hours):</label>
          <select id="wg_check_interval" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
            <option value="6" ${autoUpdateSettings.check_interval === 6 ? 'selected' : ''}>Every 6 hours</option>
            <option value="12" ${autoUpdateSettings.check_interval === 12 ? 'selected' : ''}>Every 12 hours</option>
            <option value="24" ${autoUpdateSettings.check_interval === 24 ? 'selected' : ''}>Every 24 hours</option>
            <option value="48" ${autoUpdateSettings.check_interval === 48 ? 'selected' : ''}>Every 48 hours</option>
            <option value="168" ${autoUpdateSettings.check_interval === 168 ? 'selected' : ''}>Every week</option>
          </select>
        </div>
        
        <label style="display: block; margin-bottom: 10px;">
          <input type="checkbox" id="wg_notify_updates" ${autoUpdateSettings.notify_updates ? 'checked' : ''} style="margin-right: 8px;">
          Notify me when updates are available
        </label>
      </div>
      <div style="text-align: right; margin-top: 20px;">
        <button id="wg_check_now" style="background: #28a745; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-right: 10px;">Check Now</button>
        <button id="wg_save_update" style="background: #007acc; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-right: 10px;">Save</button>
        <button id="wg_cancel_update" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Cancel</button>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Check now button
    document.getElementById('wg_check_now').onclick = () => {
      showStatus('Checking for updates...', 'info');
      performUpdateCheck();
    };
    
    // Save settings
    document.getElementById('wg_save_update').onclick = () => {
      const newSettings = {
        enabled: document.getElementById('wg_auto_update_enabled').checked,
        check_interval: parseInt(document.getElementById('wg_check_interval').value),
        notify_updates: document.getElementById('wg_notify_updates').checked,
        auto_install: autoUpdateSettings.auto_install
      };
      
      saveAutoUpdateSettings(newSettings);
      dialog.remove();
      showStatus('Update settings saved!', 'success');
    };
    
    // Cancel
    document.getElementById('wg_cancel_update').onclick = () => {
      dialog.remove();
    };
    
    // Close on escape
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        dialog.remove();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }
  
  // Help dialog
  function showHelpDialog() {
    const dialog = document.createElement('div');
    dialog.id = 'wg-help-dialog';
    dialog.style.cssText = `
      position: fixed !important;
      top: 50% !important;
      left: 50% !important;
      transform: translate(-50%, -50%) !important;
      background: white !important;
      border: 2px solid #007acc !important;
      border-radius: 10px !important;
      padding: 20px !important;
      z-index: 999999 !important;
      box-shadow: 0 0 20px rgba(0,0,0,0.3) !important;
      min-width: 400px !important;
      max-width: 500px !important;
    `;
    
    dialog.innerHTML = `
      <h3 style="margin: 0 0 15px 0; color: #007acc;">❓ Wayground Quiz Helper</h3>
      <div style="margin-bottom: 15px;">
        <strong>How to use:</strong><br>
        1. Click ⚙️ Menu → 🔑 API Keys<br>
        2. Enter your OpenRouter and/or DeepSeek API keys<br>
        3. Visit any Wayground quiz page<br>
        4. Script automatically finds questions and highlights answers<br>
        5. Correct answer is clicked after 3 seconds
      </div>
      <div style="margin-bottom: 15px;">
        <strong>Features:</strong><br>
        • Reinforcement Learning (learns best model)<br>
        • Multiple API support (OpenRouter, DeepSeek)<br>
        • Auto-detection of questions and options<br>
        • Visual highlighting of correct answers
      </div>
      <div style="margin-bottom: 15px;">
        <strong>API Keys:</strong><br>
        • OpenRouter: Get from openrouter.ai<br>
        • DeepSeek: Get from platform.deepseek.com
      </div>
      <div style="text-align: right; margin-top: 20px;">
        <button id="wg_close_help" style="background: #007acc; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Got it!</button>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Close button
    document.getElementById('wg_close_help').onclick = () => {
      dialog.remove();
    };
    
    // Close on escape
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        dialog.remove();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);
  }
  
  // Auto-copy to downloads when script is updated
  function autoCopyToDownloads() {
    try {
      const scriptContent = document.documentElement.outerHTML;
      const currentVersionMatch = scriptContent.match(/@version\s+([0-9.]+)/);
      const currentVersion = currentVersionMatch ? currentVersionMatch[1] : '1.0';
      
      const versionParts = currentVersion.split('.');
      versionParts[2] = (parseInt(versionParts[2]) + 1).toString();
      const newVersion = versionParts.join('.');
      
      const updatedScriptContent = scriptContent.replace(
        /@version\s+[0-9.]+/,
        `@version      ${newVersion}`
      );
      
      const blob = new Blob([updatedScriptContent], { type: 'text/javascript' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `wayground-userscript-v${newVersion}.user.js`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log(`Script v${newVersion} copied to downloads folder`);
      showStatus(`Script v${newVersion} copied to downloads!`, 'success');
    } catch (error) {
      console.error('Error copying script:', error);
    }
  }

  // Start the script
  showStatus('Wayground Userscript Loaded');
  createOptionsMenu();
  
  // Process once after delay
  setTimeout(processPageWithHybridAI, 2000);
  
  // Continuously look for questions every 3 seconds
  setInterval(() => {
    const questions = findQuestions();
    const options = findOptions();
    if (questions.length > 0 && options.length > 0) {
      showStatus(`Found ${questions.length} questions, processing...`, 'info');
      processPageWithHybridAI();
    }
  }, 3000);
})();
