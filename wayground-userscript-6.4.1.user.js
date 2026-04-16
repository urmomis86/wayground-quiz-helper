// ==UserScript==
// @name         Universal Quiz Helper
// @namespace    http://tampermonkey.net/
// @version      6.4.0
// @license      GPL-3.0
// @description  Auto-answer quiz questions with Multi-AI Consensus (OpenRouter + Cohere)
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
    const currentVersion = '6.4.1';
    
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
  
  // API keys storage
  function getAPIKeys() {
    return {
      openrouter: GM_getValue('openrouter_key', ''),
      cohere: GM_getValue('cohere_key', '')
    };
  }

  function saveAPIKeys(keys) {
    GM_setValue('openrouter_key', keys.openrouter);
    GM_setValue('cohere_key', keys.cohere);
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
  
  // Find questions and options - AGGRESSIVE DETECTION with heavy debugging
  function findQuestions() {
    console.log('[Wayground Debug] Starting findQuestions...');
    
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
    let checkedElements = 0;
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        checkedElements++;
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
          console.log(`[Wayground Debug] Found question (${trimmedText.length} chars, hasQ=${hasQuestionMark}): "${trimmedText.substring(0, 80)}..."`);
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
    
    console.log(`[Wayground Debug] Checked ${checkedElements} elements, found ${uniqueQuestions.length} unique questions`);
    if (uniqueQuestions.length > 0) {
      console.log('[Wayground Debug] Top question:', uniqueQuestions[0].text.substring(0, 100));
    }
    
    return uniqueQuestions;
  }
  
  function findOptions() {
    console.log('[Wayground Debug] Starting findOptions...');
    
    const selectors = [
      'button', 'label', 'input[type="radio"]', 'input[type="checkbox"]',
      '[role="option"]', '[class*="choice"]', '[class*="answer"]', '[class*="option"]',
      '[data-cy*="option"]', '[data-testid*="option"]', '[data-cy*="answer"]', '[data-testid*="answer"]',
      '.option-text', '.choice-text', '.answer-option', '.answer-text',
      'li', 'div[class*="choice"]', 'div[class*="option"]', 'span[class*="choice"]',
      'span[class*="option"]', 'a', 'td', 'tr'
    ];
    
    let options = [];
    let checkedElements = 0;
    
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        checkedElements++;
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
        
        console.log(`[Wayground Debug] Found option (${trimmedText.length} chars): "${trimmedText.substring(0, 60)}..."`);
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
    
    console.log(`[Wayground Debug] Checked ${checkedElements} elements, found ${uniqueOptions.length} unique options`);
    if (uniqueOptions.length > 0) {
      console.log('[Wayground Debug] First 3 options:');
      uniqueOptions.slice(0, 3).forEach((opt, i) => {
        console.log(`  [${i+1}] ${opt.text.substring(0, 60)}`);
      });
    }
    
    // If we have too many, filter to reasonable length ones (likely actual answers)
    if (uniqueOptions.length > 20) {
      const filtered = uniqueOptions.filter(opt => opt.text.length >= 3 && opt.text.length <= 100);
      console.log('[Wayground Debug] Filtered to:', filtered.length, 'reasonable options');
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
  
  // Call both AIs simultaneously with improved prompting for maximum accuracy
  async function getBothAIAnswersWithRetry(question, options) {
    const keys = getAPIKeys();
    
    if (!keys.openrouter && !keys.cohere) {
      showStatus('⚠️ Set API keys in settings', 'error');
      return null;
    }
    
    // Build enhanced prompt with chain-of-thought reasoning for better accuracy
    const prompt = `You are answering a multiple choice quiz question. Think step-by-step before answering.

QUESTION:
${question}

OPTIONS:
${options.map((opt, i) => `  [${i + 1}] ${opt.text}`).join('\n')}

THINKING PROCESS:
1. Analyze what the question is asking for
2. Evaluate each option:
${options.map((opt, i) => `   - Option [${i + 1}] "${opt.text}": ${i === 0 ? 'Could this be correct?' : 'Is this better or worse than option [1]?'}`).join('\n')}
3. Determine which option is most accurate
4. Select your final answer

FINAL ANSWER:
You MUST respond with ONLY the exact text of the correct option, including any units.
- If option [1] is correct, respond with exactly: "${options[0]?.text || ''}"
- If option [2] is correct, respond with exactly: "${options[1]?.text || ''}"
- If option [3] is correct, respond with exactly: "${options[2]?.text || ''}"
- If option [4] is correct, respond with exactly: "${options[3]?.text || ''}"

Do NOT include any explanation, the word "option", or any other text. Only the exact answer text.

Your answer (exact text only):`;
    
    console.log('[Wayground Debug] =======================================');
    console.log('[Wayground Debug] SENDING PROMPT TO AIs:');
    console.log('[Wayground Debug] ' + prompt);
    console.log('[Wayground Debug] =======================================');
    
    showStatus('🤖 Calling ALL AIs for maximum accuracy...', 'info');

    // Create all API calls with timeout
    const promises = [];
    const timeout = 15000; // 15 second timeout

    // OpenRouter call with timeout and rate limit retry
    if (keys.openrouter) {
      const openrouterPromise = Promise.race([
        (async () => {
          let retries = 3;
          let delay = 2000; // Start with 2 second delay
          
          while (retries > 0) {
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
                max_tokens: 50, // Increased for reasoning
                temperature: 0.1
              })
            });
            
            // Handle rate limit with retry
            if (response.status === 429) {
              console.log(`[Wayground] OpenRouter rate limited, retrying in ${delay}ms... (${retries} retries left)`);
              showStatus(`⏳ OpenRouter rate limit, waiting...`, 'warning');
              await new Promise(r => setTimeout(r, delay));
              delay *= 2; // Exponential backoff
              retries--;
              continue;
            }
            
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const data = await response.json();
            console.log('[Wayground Debug] OpenRouter full response:', JSON.stringify(data));
            const answer = data.choices?.[0]?.message?.content?.trim() || data.output?.trim() || data.text?.trim();
            console.log('[Wayground Debug] OpenRouter raw:', answer);
            
            // Match answer to option text
            let matchedIndex = -1;
            for (let i = 0; i < options.length; i++) {
              if (answer === options[i].text || answer.includes(options[i].text) || options[i].text.includes(answer)) {
                matchedIndex = i;
                break;
              }
            }
            
            console.log('[Wayground Debug] OpenRouter matched index:', matchedIndex);
            if (matchedIndex >= 0) {
              showStatus(`✅ OpenRouter: ${options[matchedIndex].text}`, 'success');
              return { source: 'openrouter', answer: matchedIndex + 1, valid: true };
            }
            console.log(`[Wayground Debug] OpenRouter could not match answer to any option`);
            throw new Error(`Could not match answer to any option`);
          }
          throw new Error('Rate limit retries exhausted');
        })(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
      ]).catch(err => {
        console.error('[Wayground Debug] OpenRouter error:', err.message);
        showStatus(`❌ OpenRouter: ${err.message}`, 'error');
        return { source: 'openrouter', answer: null, valid: false };
      });
      promises.push(openrouterPromise);
    }

    // Cohere call with timeout - using v2/chat endpoint
    if (keys.cohere) {
      const cohereRequestBody = {
        model: 'command-r-08-2024',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 50,
        temperature: 0.1
      };
      
      const coherePromise = Promise.race([
        fetch('https://api.cohere.ai/v2/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keys.cohere}`
          },
          body: JSON.stringify(cohereRequestBody)
        }).then(async (response) => {
          if (!response.ok) {
            const errText = await response.text();
            console.error('[Wayground Debug] Cohere error response:', errText);
            throw new Error(`HTTP ${response.status}`);
          }
          const data = await response.json();
          const answer = data.message?.content?.[0]?.text?.trim() || data.text?.trim();
          console.log('[Wayground Debug] Cohere raw:', answer);
          
          // Match answer to option text
          let matchedIndex = -1;
          for (let i = 0; i < options.length; i++) {
            if (answer === options[i].text || answer.includes(options[i].text) || options[i].text.includes(answer)) {
              matchedIndex = i;
              break;
            }
          }
          
          console.log('[Wayground Debug] Cohere matched index:', matchedIndex);
          if (matchedIndex >= 0) {
            showStatus(`✅ Cohere: ${options[matchedIndex].text}`, 'success');
            return { source: 'cohere', answer: matchedIndex + 1, valid: true };
          }
          console.log(`[Wayground Debug] Cohere could not match answer to any option`);
          throw new Error(`Could not match answer to any option`);
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
      ]).catch(err => {
        console.error('[Wayground Debug] Cohere error:', err.message);
        showStatus(`❌ Cohere: ${err.message}`, 'error');
        return { source: 'cohere', answer: null, valid: false };
      });
      promises.push(coherePromise);
    }
    
    // Wait for results
    const results = await Promise.all(promises);
    console.log('[Wayground Debug] =======================================');
    console.log('[Wayground Debug] RAW AI RESULTS:');
    results.forEach((r, i) => {
      console.log(`[Wayground Debug] Result ${i+1}: source=${r.source}, answer=${r.answer}, valid=${r.valid}`);
    });
    
    // Find valid answers
    const validAnswers = results.filter(r => r.valid);
    console.log(`[Wayground Debug] Valid answers: ${validAnswers.length}/${results.length}`);
    
    if (validAnswers.length === 0) {
      showStatus('❌ Both AIs failed', 'error');
      console.log('[Wayground Debug] No valid answers from any AI');
      return null;
    }
    
    // Show vote tally
    const votes = {};
    validAnswers.forEach(r => {
      votes[r.answer] = (votes[r.answer] || 0) + 1;
    });
    console.log('[Wayground Debug] Vote tally:', votes);
    const voteDetails = Object.entries(votes).map(([ans, count]) => `Answer ${ans}: ${count} AI(s)`).join(', ');
    showStatus(`📊 ${voteDetails}`, 'info');

    // Check agreement - require both AIs to agree (unanimous)
    const totalValid = validAnswers.length;
    let bestAnswer = null;
    let bestCount = 0;

    for (const [answer, count] of Object.entries(votes)) {
      if (count > bestCount) {
        bestCount = count;
        bestAnswer = parseInt(answer);
      }
    }

    console.log(`[Wayground Debug] Best answer: ${bestAnswer} with ${bestCount}/${totalValid} votes`);

    // Require unanimous agreement (both AIs must agree)
    if (bestCount === totalValid && totalValid >= 2) {
      const optionIndex = bestAnswer - 1;
      const optionText = options[optionIndex]?.text?.substring(0, 50) || 'N/A';
      showStatus(`✅ ${totalValid}/${totalValid} AIs agree on answer ${bestAnswer}`, 'success');
      console.log(`[Wayground Debug] Selected option [${bestAnswer}]: "${optionText}"`);
      return optionIndex; // Convert to 0-based
    }

    // AIs disagree - don't answer to avoid being wrong
    showStatus(`❌ No consensus (${voteDetails}) - NOT answering to avoid error`, 'error');
    console.log('[Wayground Debug] No AI consensus (need both AIs to agree), skipping question');
    console.log('[Wayground Debug] =======================================');
    return null;
  }
  
  // Fallback single AI answer
  async function getSingleAIAnswer(question, options) {
    const keys = getAPIKeys();
    const prompt = `You are answering a multiple choice quiz question.\n\nQUESTION:\n${question}\n\nOPTIONS:\n${options.map((opt, i) => `  [${i + 1}] ${opt.text}`).join('\n')}\n\nRespond with ONLY the exact text of the correct option, including any units.`;
    
    // Try OpenRouter first with better model
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
            max_tokens: 20,
            temperature: 0.1
          })
        });
        
        if (!response.ok) throw new Error('Failed');
        const data = await response.json();
        const answer = data.choices?.[0]?.message?.content?.trim();
        console.log('[Wayground Debug] Fallback OpenRouter raw:', answer);
        
        // Match answer to option text
        let matchedIndex = -1;
        for (let i = 0; i < options.length; i++) {
          if (answer === options[i].text || answer.includes(options[i].text) || options[i].text.includes(answer)) {
            matchedIndex = i;
            break;
          }
        }
        
        if (matchedIndex >= 0) {
          showStatus(`✅ Fallback OpenRouter: ${options[matchedIndex].text}`, 'success');
          return matchedIndex;
        }
        console.log(`[Wayground Debug] Fallback OpenRouter could not match answer to any option`);
      } catch (e) {
        console.error('[Wayground Debug] Fallback OpenRouter failed:', e);
      }
    }

    // Try Cohere fallback - using v2/chat endpoint
    if (keys.cohere) {
      try {
        showStatus('🔄 Trying Cohere fallback...', 'info');
        const response = await fetch('https://api.cohere.ai/v2/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keys.cohere}`
          },
          body: JSON.stringify({
            model: 'command-r-08-2024',
            messages: [
              { role: 'user', content: prompt + '\n\nRespond with ONLY a single number (1-4):' }
            ],
            max_tokens: 10,
            temperature: 0.1
          })
        });
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const answer = data.message?.content?.[0]?.text?.trim() || data.text?.trim();
        console.log('[Wayground Debug] Fallback Cohere raw:', answer);
        
        // Match answer to option text
        let matchedIndex = -1;
        for (let i = 0; i < options.length; i++) {
          if (answer === options[i].text || answer.includes(options[i].text) || options[i].text.includes(answer)) {
            matchedIndex = i;
            break;
          }
        }
        
        if (matchedIndex >= 0) {
          showStatus(`✅ Fallback Cohere: ${options[matchedIndex].text}`, 'success');
          return matchedIndex;
        }
      } catch (e) {
        console.error('[Wayground Debug] Fallback Cohere failed:', e);
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
            model: 'mistralai/mistral-7b-instruct:free',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 150
          })
        });
        
        const data = await response.json();
        answer = data.choices?.[0]?.message?.content?.trim();
        console.log('[Wayground Debug] OpenRouter text answer:', answer);
        if (answer) {
          showStatus('✅ OpenRouter generated answer', 'success');
          return answer;
        }
      } catch (error) {
        console.error('[Wayground Debug] OpenRouter text generation error:', error);
      }
    }
    
    // Try Cohere - using v2/chat endpoint
    if (keys.cohere) {
      showStatus('🌐 Cohere generating text answer...', 'info');
      try {
        const response = await fetch('https://api.cohere.ai/v2/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${keys.cohere}`
          },
          body: JSON.stringify({
            model: 'command-r-08-2024',
            messages: [
              { role: 'user', content: prompt }
            ],
            max_tokens: 150,
            temperature: 0.3
          })
        });
        
        if (!response.ok) {
          const errText = await response.text();
          console.error('[Wayground Debug] Cohere text error response:', errText);
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        answer = data.message?.content?.[0]?.text?.trim() || data.text?.trim();
        console.log('[Wayground Debug] Cohere text answer:', answer);
        if (answer) {
          showStatus('✅ Cohere generated answer', 'success');
          return answer;
        }
      } catch (error) {
        console.error('[Wayground Debug] Cohere text generation error:', error);
      }
    }
    
    return null;
  }
  
  // Type answer into input field - returns Promise that resolves when done
  function typeAnswer(input, text) {
    return new Promise((resolve) => {
      showStatus(`⌨️ Typing answer...`, 'info');
      console.log(`[Wayground Debug] Typing "${text}" into input`);
      
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
          // Final events (NO blur - causes freezing)
          input.dispatchEvent(new Event('change', { bubbles: true }));
          showStatus('✅ Answer typed!', 'success');
          console.log('[Wayground Debug] Finished typing');
          
          // Try to find and click submit button
          setTimeout(() => {
            clickSubmitButton(input);
            resolve();
          }, 500);
        }
      }, 50); // 50ms per character
    });
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
    
    console.log('[Wayground Debug] =======================================');
    console.log('[Wayground Debug] QUESTIONS FOUND:', questions.length);
    questions.forEach((q, i) => {
      console.log(`[Wayground Debug] Q${i+1}: "${q.text.substring(0, 100)}${q.text.length > 100 ? '...' : ''}"`);
    });
    console.log('[Wayground Debug] ---------------------------------------');
    console.log('[Wayground Debug] OPTIONS FOUND:', options.length);
    options.forEach((opt, i) => {
      console.log(`[Wayground Debug] Opt${i+1}: "${opt.text.substring(0, 60)}${opt.text.length > 60 ? '...' : ''}"`);
    });
    console.log('[Wayground Debug] ---------------------------------------');
    console.log('[Wayground Debug] TEXT INPUTS FOUND:', textInputs.length);
    console.log('[Wayground Debug] =======================================');
    
    // Handle text input questions first
    if (textInputs.length > 0 && questions.length > 0) {
      showStatus(`⌨️ Found ${textInputs.length} text input(s)`, 'info');
      
      const keys = getAPIKeys();
      if (!keys.openrouter && !keys.cohere) {
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
          
          // Type the answer with delay for realism
          await typeAnswer(input.element, answer);
          
          console.log('[Wayground Debug] Text answer typed:', answer);
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
  }
  
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
      {text: '🔑 API Keys', action: showSettingsDialog}
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
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">OpenRouter API Key (Recommended):</label>
        <input type="password" id="wg_openrouter_key" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" value="${keys.openrouter}" placeholder="sk-or-v1-...">
      </div>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Cohere API Key:</label>
        <input type="password" id="wg_cohere_key" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;" value="${keys.cohere}" placeholder="...">
      </div>
      <div style="margin-bottom: 15px; padding: 10px; background: #f5f5f5; border-radius: 4px;">
        <button id="wg_test_apis" style="background: #28a745; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; width: 100%;">🧪 Test All APIs</button>
        <div id="wg_test_results" style="margin-top: 10px; font-size: 12px; max-height: 150px; overflow-y: auto;"></div>
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
      const cohereKey = document.getElementById('wg_cohere_key').value.trim();
      saveAPIKeys({ openrouter: openrouterKey, cohere: cohereKey });
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
    const cohereInput = document.getElementById('wg_cohere_key');
    
    if (saveBtn) saveBtn.onclick = saveHandler;
    if (cancelBtn) cancelBtn.onclick = cancelHandler;
    
    // Test APIs handler
    const testBtn = document.getElementById('wg_test_apis');
    const testResultsDiv = document.getElementById('wg_test_results');
    
    if (testBtn) {
      testBtn.onclick = async () => {
        testResultsDiv.innerHTML = '<div style="color: #007acc;">🧪 Testing APIs...</div>';
        testBtn.disabled = true;
        
        const testPrompt = 'What is 2+2? Answer with ONLY the number.';
        const results = [];
        
        // Test OpenRouter
        const openrouterKey = document.getElementById('wg_openrouter_key').value.trim();
        if (openrouterKey) {
          try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${openrouterKey}`,
                'HTTP-Referer': 'https://openrouter.ai/'
              },
              body: JSON.stringify({
                model: 'openrouter/free',
                messages: [
                  { role: 'user', content: testPrompt }
                ],
                max_tokens: 10
              })
            });
            
            if (response.ok) {
              const data = await response.json();
              const answer = data.choices?.[0]?.message?.content?.trim();
              results.push(`✅ <b>OpenRouter:</b> Working (answered: "${answer}")`);
            } else {
              results.push(`❌ <b>OpenRouter:</b> HTTP ${response.status}`);
            }
          } catch (err) {
            results.push(`❌ <b>OpenRouter:</b> ${err.message}`);
          }
        } else {
          results.push(`⚠️ <b>OpenRouter:</b> No API key`);
        }

        // Test Cohere
        const cohereKey = document.getElementById('wg_cohere_key').value.trim();
        if (cohereKey) {
          try {
            const response = await fetch('https://api.cohere.ai/v2/chat', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${cohereKey}`
              },
              body: JSON.stringify({
                model: 'command-r-08-2024',
                messages: [
                  { role: 'user', content: testPrompt }
                ],
                max_tokens: 10,
                temperature: 0.1
              })
            });
            
            if (response.ok) {
              const data = await response.json();
              const answer = data.message?.content?.[0]?.text?.trim() || data.text?.trim();
              results.push(`✅ <b>Cohere:</b> Working (answered: "${answer}")`);
            } else {
              results.push(`❌ <b>Cohere:</b> HTTP ${response.status}`);
            }
          } catch (err) {
            results.push(`❌ <b>Cohere:</b> ${err.message}`);
          }
        } else {
          results.push(`⚠️ <b>Cohere:</b> No API key`);
        }
        
        testResultsDiv.innerHTML = results.join('<br>');
        testBtn.disabled = false;
      };
    }
    
    // Save on Enter key in input fields
    const enterHandler = (e) => {
      if (e.key === 'Enter') {
        saveHandler(e);
      }
    };
    
    if (openrouterInput) openrouterInput.addEventListener('keypress', enterHandler);
    if (cohereInput) cohereInput.addEventListener('keypress', enterHandler);
    
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
    
    const currentVersion = '6.4.1';
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
        2. Enter your OpenRouter and/or Cohere API keys<br>
        3. Visit any quiz page<br>
        4. Script automatically finds questions and highlights answers<br>
        5. Correct answer is clicked after AI consensus (both AIs must agree)
      </div>
      <div style="margin-bottom: 15px;">
        <strong>Features:</strong><br>
        • Multi-AI Consensus (unanimous vote from 2 AIs)<br>
        • OpenRouter + Cohere API support<br>
        • Auto-detection of questions and options<br>
        • Visual highlighting of correct answers
      </div>
      <div style="margin-bottom: 15px;">
        <strong>API Keys:</strong><br>
        • OpenRouter: Get from openrouter.ai (free tier available)<br>
        • Cohere: Get from dashboard.cohere.com (trial key available)
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
