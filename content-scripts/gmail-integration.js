// Gmail UI統合のための変数
let gmailIntegrationInitialized = false;

// 拡張機能の初期化
function initializeExtension() {
  if (gmailIntegrationInitialized) return;
  
  // MutationObserverを使用してGmailのUI変更を監視
  const observer = new MutationObserver((mutations) => {
    const composeBoxes = document.querySelectorAll('.Am.Al.editable');
    if (composeBoxes.length > 0) {
      addAdjustButtonToComposeBoxes(composeBoxes);
    }
  });
  
  observer.observe(document.body, { childList: true, subtree: true });
  gmailIntegrationInitialized = true;
  console.log("Email Assistant Extension initialized");
}

// 作成ボックスに調整ボタンを追加
function addAdjustButtonToComposeBoxes(composeBoxes) {
  composeBoxes.forEach(composeBox => {
    // すでにボタンが追加されているか確認
    const toolbar = composeBox.closest('div[role="dialog"]')?.querySelector('.aB.gQ.pE') || 
                  composeBox.closest('td')?.querySelector('.aB.gQ.pE');
    
    if (toolbar && !toolbar.querySelector('.email-adjust-button')) {
      const adjustButton = document.createElement('div');
      adjustButton.className = 'email-adjust-button z0';
      adjustButton.innerHTML = `
        <div class="T-I J-J5-Ji aoO T-I-atl" role="button" tabindex="0" 
             style="margin-right: 8px; background-color: #f1f3f4; color: #5f6368;">
          <span class="Tn">メール調整</span>
        </div>
      `;
      
      adjustButton.addEventListener('click', () => handleAdjustButtonClick(composeBox));
      toolbar.prepend(adjustButton);
    }
  });
}

// 調整ボタンのクリックハンドラー
function handleAdjustButtonClick(composeBox) {
  // メール内容を取得
  const emailContent = composeBox.innerHTML;
  
  // 宛先から関係性を取得（ここでは仮のデモ実装）
  const emailContainer = composeBox.closest('div[role="dialog"]') || composeBox.closest('form');
  const toField = emailContainer.querySelector('input[name="to"], div[role="textbox"][aria-label*="宛先"]');
  const recipientEmail = toField ? toField.value || toField.textContent : '';
  
  // 関係性を取得（実際にはChromeストレージから取得）
  getRelationship(recipientEmail).then(relationship => {
    // 関係性に基づいてメールを調整
    chrome.runtime.sendMessage(
      { action: "adjustEmail", emailContent: stripHtml(emailContent), relationship: relationship },
      response => {
        if (response.success) {
          showAdjustmentResult(composeBox, response.adjustedEmail);
        } else {
          showError(composeBox, response.error);
        }
      }
    );
  });
}

// 関係性を取得（Chromeストレージから）
async function getRelationship(email) {
  // デモ用の仮実装。実際にはChromeストレージから取得
  return "クライアント"; // デフォルトの関係性
}

// HTMLタグを除去
function stripHtml(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || "";
}

// 修正結果を表示
function showAdjustmentResult(composeBox, adjustedEmail) {
  // すでに表示されている結果パネルを削除
  removeExistingResultPanel(composeBox);
  
  // 結果パネルを作成
  const resultPanel = document.createElement('div');
  resultPanel.className = 'email-adjustment-result';
  resultPanel.innerHTML = `
    <div class="adjustment-header">メール調整結果</div>
    <div class="adjustment-content">${adjustedEmail}</div>
    <div class="adjustment-actions">
      <button class="apply-btn">適用</button>
      <button class="cancel-btn">キャンセル</button>
    </div>
  `;
  
  // ボタンのイベントリスナーを追加
  resultPanel.querySelector('.apply-btn').addEventListener('click', () => {
    composeBox.innerHTML = adjustedEmail;
    resultPanel.remove();
  });
  
  resultPanel.querySelector('.cancel-btn').addEventListener('click', () => {
    resultPanel.remove();
  });
  
  // パネルを挿入
  composeBox.parentNode.insertBefore(resultPanel, composeBox.nextSibling);
}

// エラー表示
function showError(composeBox, errorMessage) {
  removeExistingResultPanel(composeBox);
  
  const errorPanel = document.createElement('div');
  errorPanel.className = 'email-adjustment-error';
  errorPanel.innerHTML = `
    <div class="error-message">エラー: ${errorMessage}</div>
    <button class="close-btn">閉じる</button>
  `;
  
  errorPanel.querySelector('.close-btn').addEventListener('click', () => {
    errorPanel.remove();
  });
  
  composeBox.parentNode.insertBefore(errorPanel, composeBox.nextSibling);
}

// 既存の結果パネルを削除
function removeExistingResultPanel(composeBox) {
  const existingPanel = composeBox.parentNode.querySelector('.email-adjustment-result, .email-adjustment-error');
  if (existingPanel) {
    existingPanel.remove();
  }
}

// ページ読み込み完了時に拡張機能を初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}