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
document.addEventListener('DOMContentLoaded', async () => {
  // 関係性の選択肢を初期化
  await initializeRelationshipSelects();
  
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
async function initializeRelationshipSelects() {
  // カスタム関係性を含む全ての関係性のオプションを生成
  const allOptions = await generateAllRelationshipOptions();
  
  // relationshipTypeの選択肢を生成（カスタムオプション付き）
  const customOption = '<option value="custom">カスタム...</option>';
  relationshipTypeSelect.innerHTML = allOptions + customOption;
  
  // defaultRelationshipの選択肢を生成
  defaultRelationshipSelect.innerHTML = allOptions;
  
  // 関係性タイプ一覧を表示
  displayRelationshipTypesList();
}

// 関係性タイプ一覧を表示
async function displayRelationshipTypesList() {
  const relationshipTypesList = document.getElementById('relationshipTypesList');
  if (!relationshipTypesList) return;
  
  // カスタム関係性を含む全ての関係性を取得するためにリロード
  await window.RelationshipManager.loadCustomRelationships();
  const relationships = window.RelationshipManager.getAllRelationships();
  
  relationshipTypesList.innerHTML = relationships.map(rel => `
    <div class="relationship-type-item ${rel.custom ? 'custom-relationship' : 'default-relationship'}">
      <div class="relationship-type-info">
        <h4>${rel.label} ${rel.custom ? '（カスタム）' : ''}</h4>
        <p class="description">${rel.description}</p>
        <p class="english-style"><strong>英語スタイル:</strong> ${rel.englishStyle}</p>
        ${rel.custom ? `
          <div class="relationship-actions">
            <button class="delete-custom-btn" data-id="${rel.id}">削除</button>
          </div>
        ` : ''}
      </div>
    </div>
  `).join('');
  
  // カスタム関係性の削除ボタンにイベントリスナーを追加
  const deleteButtons = relationshipTypesList.querySelectorAll('.delete-custom-btn');
  deleteButtons.forEach(button => {
    button.addEventListener('click', async (e) => {
      const relationshipId = e.target.getAttribute('data-id');
      if (confirm('このカスタム関係性を削除しますか？')) {
        try {
          window.RelationshipManager.removeCustomRelationship(relationshipId);
          await displayRelationshipTypesList(); // 表示を更新
          
          // 関係性選択肢も更新
          await initializeRelationshipSelects();
          
          console.log(`カスタム関係性「${relationshipId}」を削除しました`);
        } catch (error) {
          alert('カスタム関係性の削除に失敗しました: ' + error.message);
        }
      }
    });
  });
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
async function addRelationship() {
  const email = newEmailAddressInput.value.trim();
  const type = relationshipTypeSelect.value;
  let customDescription = '';
  
  if (!email) {
    alert('メールアドレスを入力してください。');
    return;
  }
  
  // カスタム関係性の処理
  if (type === 'custom') {
    customDescription = newCustomDescriptionInput.value.trim();
    if (!customDescription) {
      alert('カスタム関係性の説明を入力してください。');
      return;
    }
  } else if (type.startsWith('custom:')) {
    // 既存のカスタム関係性を選択した場合
    customDescription = type.substring(7); // "custom:"を除去
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
    const finalType = type.startsWith('custom:') ? 'custom' : type;
    relationships.push({
      email,
      type: finalType,
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
      
      // 関係性タイプ一覧を更新（カスタム関係性が追加された可能性がある）
      displayRelationshipTypesList();
      
      // プルダウンも更新
      initializeRelationshipSelects();
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

// 全ての関係性（デフォルト＋カスタム）のオプションを生成
async function generateAllRelationshipOptions() {
  return new Promise((resolve) => {
    // storageからカスタム関係性を取得
    chrome.storage.sync.get('relationships', (data) => {
      const relationships = data.relationships || [];
      
      // デフォルトの関係性オプションを取得
      const defaultOptions = window.RelationshipManager.generateSelectOptions(window.RelationshipManager.getDefaultRelationshipType());
      
      // カスタム関係性からユニークなカスタム説明を抽出
      const customRelationships = relationships
        .filter(rel => rel.type === 'custom' && rel.customDescription)
        .reduce((unique, rel) => {
          // 重複を除く
          if (!unique.find(u => u.customDescription === rel.customDescription)) {
            unique.push(rel);
          }
          return unique;
        }, []);
      
      // カスタム関係性のオプションを生成
      const customOptions = customRelationships
        .map(rel => `<option value="custom:${rel.customDescription}">${rel.customDescription}</option>`)
        .join('');
      
      resolve(defaultOptions + customOptions);
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
