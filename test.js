// Minimal test script
console.log('=== TEST SCRIPT LOADED ===');

// Create a visible element
const testDiv = document.createElement('div');
testDiv.innerHTML = 'TEST SCRIPT WORKING';
testDiv.style.cssText = `
  position: fixed !important;
  top: 100px !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  background: red !important;
  color: white !important;
  padding: 20px !important;
  z-index: 999999 !important;
  font-size: 24px !important;
  font-weight: bold !important;
`;
document.body.appendChild(testDiv);

console.log('=== TEST ELEMENT ADDED ===');
