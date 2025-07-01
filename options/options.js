// DOM要素の参照を取得
const relationshipContainer = document.getElementById('relationshipContainer');
const newEmailAddressInput = document.getElementById('newEmailAddress');
const relationshipTypeSelect = document.getElementById('relationshipType');
const newCustomDescriptionInput = document.getElementById('newCustomDescription');
const customDescriptionContainer = document.getElementById('customDescriptionContainer');
const addRelationshipBtn = document.getElementById('addRelationshipBtn');
const defaultRelationshipSelect = document.getElementById('defaultRelationship');
const autoSaveApiCheckbox = document.getElementById('autoSaveApi');
const geminiApiKeyInput = document.getElementById('geminiApiKey');
const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', () => {
  // 関係性の選択肢を初期化
  initializeRelationshipSelects();
  
  // 保存されている関係性データを読み込む
  loadRelationships();
  
  // デフォルト設定を読み込む
  loadDefaultSettings();
  
  // APIキーを読み込む
  loadApiKey();
  
  // カスタム関係性タイプの表示切り替え
  relationshipTypeSelect.addEventListener('change', () => {
    if (relationshipTypeSelect.value === 'custom') {
      customDescriptionContainer.style.display = 'block';
    } else {
      customDescriptionContainer.style.display = 'none';
    }
  });
  
  // 関係性追加ボタンのイベントリスナー
  addRelationshipBtn.addEventListener('click', addRelationship);
  
  // デフォルト設定の保存
  defaultRelationshipSelect.addEventListener('change', saveDefaultSettings);
  autoSaveApiCheckbox.addEventListener('change', saveDefaultSettings);
  
  // APIキー保存ボタンのイベントリスナー
  saveApiKeyBtn.addEventListener('click', saveApiKey);
});

// 関係性の選択肢を初期化
function initializeRelationshipSelects() {
  // relationshipTypeの選択肢を生成（カスタムオプション付き）
  const relationshipOptions = window.RelationshipManager.generateSelectOptions(window.RelationshipManager.getDefaultRelationshipType());
  const customOption = '<option value="custom">カスタム...</option>';
  relationshipTypeSelect.innerHTML = relationshipOptions + customOption;
  
  // defaultRelationshipの選択肢を生成
  const defaultOptions = window.RelationshipManager.generateSelectOptions(window.RelationshipManager.getDefaultRelationshipType());
  defaultRelationshipSelect.innerHTML = defaultOptions;
  
  // 関係性タイプ一覧を表示
  displayRelationshipTypesList();
}

// 関係性タイプ一覧を表示
function displayRelationshipTypesList() {
  const relationshipTypesList = document.getElementById('relationshipTypesList');
  if (!relationshipTypesList) return;
  
  const relationships = window.RelationshipManager.getAllRelationships();
  
  relationshipTypesList.innerHTML = relationships.map(rel => `
    <div class="relationship-type-item">
      <div class="relationship-type-info">
        <h4>${rel.label}</h4>
        <p class="description">${rel.description}</p>
        <p class="english-style"><strong>英語スタイル:</strong> ${rel.englishStyle}</p>
      </div>
    </div>
  `).join('');
}

// 関係性データを読み込む
function loadRelationships() {
  chrome.storage.sync.get('relationships', (data) => {
    const relationships = data.relationships || [];
    relationshipContainer.innerHTML = '';
    
    if (relationships.length === 0) {
      relationshipContainer.innerHTML = '<p class="empty-message">登録されている関係性はありません。</p>';
      return;
    }
    
    relationships.forEach((relationship, index) => {
      const relationshipItem = document.createElement('div');
      relationshipItem.className = 'relationship-item';
      
      relationshipItem.innerHTML = `
        <div class="relationship-info">
          <span class="email">${relationship.email}</span>
          <span class="type">${relationship.type === 'custom' ? relationship.customDescription : window.RelationshipManager.getDisplayLabel(relationship.type)}</span>
        </div>
        <div class="relationship-actions">
          <button class="delete-btn" data-index="${index}">削除</button>
        </div>
      `;
      
      relationshipContainer.appendChild(relationshipItem);
      
      // 削除ボタンにイベントリスナーを追加
      relationshipItem.querySelector('.delete-btn').addEventListener('click', (e) => {
        const index = parseInt(e.target.getAttribute('data-index'));
        deleteRelationship(index);
      });
    });
  });
}

// 新しい関係性を追加する
function addRelationship() {
  const email = newEmailAddressInput.value.trim();
  const type = relationshipTypeSelect.value;
  let customDescription = '';
  
  if (!email) {
    alert('メールアドレスを入力してください。');
    return;
  }
  
  if (type === 'custom') {
    customDescription = newCustomDescriptionInput.value.trim();
    if (!customDescription) {
      alert('カスタム関係性の説明を入力してください。');
      return;
    }
  }
  
  chrome.storage.sync.get('relationships', (data) => {
    const relationships = data.relationships || [];
    
    // 重複チェック
    const isDuplicate = relationships.some(r => r.email === email);
    if (isDuplicate) {
      alert('このメールアドレスは既に登録されています。');
      return;
    }
    
    // 新しい関係性を追加
    relationships.push({
      email,
      type,
      customDescription
    });
    
    // 保存して表示を更新
    chrome.storage.sync.set({ relationships }, () => {
      loadRelationships();
      
      // 入力フィールドをクリア
      newEmailAddressInput.value = '';
      relationshipTypeSelect.value = window.RelationshipManager.getDefaultRelationshipType();
      newCustomDescriptionInput.value = '';
      customDescriptionContainer.style.display = 'none';
    });
  });
}

// 関係性を削除する
function deleteRelationship(index) {
  chrome.storage.sync.get('relationships', (data) => {
    const relationships = data.relationships || [];
    
    if (index >= 0 && index < relationships.length) {
      relationships.splice(index, 1);
      
      chrome.storage.sync.set({ relationships }, () => {
        loadRelationships();
      });
    }
  });
}

// デフォルト設定を読み込む
function loadDefaultSettings() {
  chrome.storage.sync.get(['defaultRelationship', 'autoSaveApi'], (data) => {
    if (data.defaultRelationship) {
      defaultRelationshipSelect.value = data.defaultRelationship;
    }
    
    if (data.autoSaveApi !== undefined) {
      autoSaveApiCheckbox.checked = data.autoSaveApi;
    }
  });
}

// デフォルト設定を保存する
function saveDefaultSettings() {
  const defaultRelationship = defaultRelationshipSelect.value;
  const autoSaveApi = autoSaveApiCheckbox.checked;
  
  chrome.storage.sync.set({
    defaultRelationship,
    autoSaveApi
  });
}

// APIキーを読み込む
function loadApiKey() {
  chrome.runtime.sendMessage({ action: "getApiKey" }, (response) => {
    if (response && response.apiKey) {
      geminiApiKeyInput.value = response.apiKey;
    }
  });
}

// APIキーを保存する
function saveApiKey() {
  const apiKey = geminiApiKeyInput.value.trim();
  
  if (!apiKey) {
    alert('APIキーを入力してください。');
    return;
  }
  
  chrome.runtime.sendMessage({ action: "setApiKey", apiKey }, (response) => {
    if (response && response.success) {
      alert('APIキーを保存しました。');
    } else {
      alert('APIキーの保存に失敗しました。');
    }
  });
}
// APIキーを保存する関数を修正
function saveApiKey() {
  const apiKey = geminiApiKeyInput.value.trim();
  
  if (!apiKey) {
    alert('APIキーを入力してください。');
    return;
  }
  
  console.log("APIキーを保存します...");
  
  // 直接Storageに保存してから、バックグラウンドにも通知
  chrome.storage.sync.set({ geminiApiKey: apiKey }, () => {
    const error = chrome.runtime.lastError;
    if (error) {
      console.error("APIキーの保存中にエラーが発生しました:", error);
      alert('APIキーの保存に失敗しました: ' + error.message);
      return;
    }
    
    console.log("Storageへの保存が成功しました。バックグラウンドに通知します...");
    
    // バックグラウンドスクリプトにも通知
    chrome.runtime.sendMessage({ action: "setApiKey", apiKey }, (response) => {
      if (response && response.success) {
        console.log("バックグラウンドへの通知も成功しました");
        alert('APIキーを保存しました。');
        
        // 確認のためにもう一度読み込む
        setTimeout(() => {
          chrome.runtime.sendMessage({ action: "getApiKey" }, (getResponse) => {
            console.log("保存後の確認:", getResponse);
            if (!getResponse || !getResponse.apiKey) {
              alert('警告: APIキーは保存されましたが、バックグラウンドで読み込めていない可能性があります。拡張機能を再読み込みしてください。');
            }
          });
        }, 500);
      } else {
        console.error("バックグラウンドへの通知に失敗:", response);
        alert('APIキーをStorageに保存しましたが、バックグラウンドへの通知に失敗しました。拡張機能を再読み込みしてください。');
      }
    });
  });
}

// APIキーを読み込む関数を修正
function loadApiKey() {
  console.log("APIキーを読み込みます...");
  
  // まず直接Storageから読み込む
  chrome.storage.sync.get('geminiApiKey', (data) => {
    console.log("Storage APIからの読み込み結果:", data);
    
    if (data && data.geminiApiKey) {
      geminiApiKeyInput.value = data.geminiApiKey;
      console.log("Storageから直接APIキーを読み込みました");
    }
    
    // バックグラウンドからも確認
    chrome.runtime.sendMessage({ action: "getApiKey" }, (response) => {
      console.log("バックグラウンドからの応答:", response);
      
      if (response && response.apiKey) {
        geminiApiKeyInput.value = response.apiKey;
        console.log("バックグラウンドからAPIキーを読み込みました");
      }
    });
  });
}
