// Wayground Specific Extension
console.log('=== WAYGROUND EXTENSION START ===');

// Status display
function showStatus(message) {
  const existing = document.getElementById('wg-status');
  if (existing) existing.remove();
  
  const status = document.createElement('div');
  status.id = 'wg-status';
  status.textContent = message;
  status.style.cssText = `
    position: fixed !important;
    top: 10px !important;
    right: 10px !important;
    background: rgba(0, 100, 0, 0.8) !important;
    color: white !important;
    padding: 10px !important;
    z-index: 999999 !important;
    font-size: 14px !important;
    border: 2px solid #00ff00 !important;
    border-radius: 5px !important;
  `;
  document.body.appendChild(status);
}

// Find questions
function findQuestions() {
  const selectors = [
    'p', 'h1', 'h2', 'h3', 'h4',
    '[class*="question"]',
    '[class*="prompt"]',
    '[class*="stem"]',
    '[data-testid*="question"]',
    '.question-text',
    '.quiz-question'
  ];
  
  let questions = [];
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      const text = el.textContent || el.innerText || '';
      if (text.trim().length > 10) {
        questions.push({ element: el, text: text.trim() });
      }
    });
  }
  
  return questions;
}

// Find options
function findOptions() {
  const selectors = [
    'button', 'label', 'input[type="radio"]',
    'input[type="checkbox"]', '[role="option"]',
    '[class*="choice"]', '[class*="answer"]',
    '[data-cy*="option"]'
  ];
  
  let options = [];
  for (const selector of selectors) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => {
      const text = el.textContent || el.innerText || '';
      if (text.trim().length > 3) {
        options.push({ element: el, text: text.trim() });
      }
    });
  }
  
  return options;
}

// Process questions
function processWayground() {
  console.log('Processing Wayground page...');
  
  const questions = findQuestions();
  const options = findOptions();
  
  console.log('Found questions:', questions.length);
  console.log('Found options:', options.length);
  
  if (questions.length > 0 && options.length > 0) {
    showStatus(`Found ${questions.length} questions, ${options.length} options`);
    
    // Highlight first question
    questions[0].element.style.border = '3px solid #00ff00';
    questions[0].element.style.backgroundColor = '#ffffcc';
    
    // Highlight first option
    options[0].element.style.border = '3px solid #00aa00';
    options[0].element.style.backgroundColor = '#ccffcc';
  } else {
    showStatus('No questions or options found');
  }
}

// Start
showStatus('Wayground Extension Loaded');

// Auto process after delay
setTimeout(processWayground, 1000);

// Watch for changes
const observer = new MutationObserver(() => {
  console.log('Page changed, reprocessing...');
  processWayground();
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
