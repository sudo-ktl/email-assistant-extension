document.addEventListener('DOMContentLoaded', function() {
  // 設定ページを開くボタン
  document.getElementById('openOptionsBtn').addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });
  
  // ヘルプボタン
  document.getElementById('helpBtn').addEventListener('click', function() {
    chrome.tabs.create({ url: 'https://example.com/email-assistant-help' });
  });
});