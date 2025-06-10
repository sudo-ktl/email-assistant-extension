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
    // ボタンが既に存在するかチェック
    const existingButton = composeBox.parentNode.querySelector('.email-adjust-button-container');
    if (existingButton) return;
    
    // 本文入力欄の下に配置するコンテナを作成
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'email-adjust-button-container';
    buttonContainer.style.padding = '10px 0';
    buttonContainer.style.borderTop = '1px solid #e0e0e0';
    buttonContainer.style.marginTop = '10px';
    buttonContainer.style.display = 'flex';
    buttonContainer.style.alignItems = 'center';
    
    // メール調整ボタンを作成
    const adjustButton = document.createElement('div');
    adjustButton.className = 'email-adjust-button';
    adjustButton.innerHTML = `
      <div class="T-I J-J5-Ji aoO T-I-atl" role="button" tabindex="0" 
           style="margin-right: 8px; background-color: #4285f4; color: white; border-radius: 4px; padding: 8px 16px;">
        <span class="Tn">メール調整</span>
      </div>
    `;
    
    // 関係性ラベルを作成
    const relationshipLabel = document.createElement('div');
    relationshipLabel.style.marginLeft = '8px';
    relationshipLabel.style.fontSize = '14px';
    relationshipLabel.style.color = '#5f6368';
    relationshipLabel.textContent = 'クライアント（非常にフォーマルで丁寧）';
    
    // ボタンとラベルをコンテナに追加
    buttonContainer.appendChild(adjustButton);
    buttonContainer.appendChild(relationshipLabel);
    
    adjustButton.addEventListener('click', () => handleAdjustButtonClick(composeBox));
    composeBox.parentNode.insertBefore(buttonContainer, composeBox.nextSibling);
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
