// DOM要素
const relationshipItemsContainer = document.getElementById('relationshipItems');
const customRelationshipItemsContainer = document.getElementById('customRelationshipItems');
const newEmailInput = document.getElementById('newEmail');
const newRelationshipSelect = document.getElementById('newRelationship');
const addRelationshipBtn = document.getElementById('addRelationshipBtn');
const newCustomNameInput = document.getElementById('newCustomName');
const newCustomDescriptionInput = document.getElementById('newCustomDescription');
const addCustomRelationshipBtn = document.getElementById('addCustomRelationshipBtn');
const saveBtn = document.getElementById('saveBtn');
const resetBtn = document.getElementById('resetBtn');
const autoSaveApiCheckbox = document.getElementById('autoSaveApi');

// 関係性マッピングとカスタム関係性
let relationshipMappings = [];
let customRelationships = [];

// 初期化
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  
  // イベントリスナー
  addRelationshipBtn.addEventListener('click', addRelationshipMapping);
  addCustomRelationshipBtn.addEventListener('click', addCustomRelationship);
  saveBtn.addEventListener('click', saveSettings);
  resetBtn.addEventListener('click', resetSettings);
});

// 設定の読み込み
function loadSettings() {
  chrome.storage.sync.get(['relationshipMappings', 'customRelationships', 'autoSaveApi'], (result) => {
    relationshipMappings = result.relationshipMappings || [];
    customRelationships = result.customRelationships || getDefaultCustomRelationships();
    
    // 自動保存設定
    const autoSaveApi = result.autoSaveApi !== undefined ? result.autoSaveApi : true;
    autoSaveApiCheckbox.checked = autoSaveApi;
    
    // 関係性マッピングの表示
    renderRelationshipMappings();
    
    // カスタム関係性の表示
    renderCustomRelationships();
    
    // セレクトボックスの更新
    updateRelationshipSelect();
  });
}

// デフォルトのカスタム関係性を取得
function getDefaultCustomRelationships() {
  return [
    { name: '上司', description: 'フォーマルで敬語' },
    { name: '同僚', description: '標準的なビジネス文体' },
    { name: '部下', description: '指導的でありながら丁寧' },
    { name: 'クライアント', description: '非常にフォーマルで丁寧' },
    { name: 'ビジネスパートナー', description: '協力的でプロフェッショナル' },
    { name: '社外関係者', description: 'フォーマルで慎重' }
  ];
}

// 関係性マッピングの表示
function renderRelationshipMappings() {
  relationshipItemsContainer.innerHTML = '';
  
  relationshipMappings.forEach((mapping, index) => {
    const item = document.createElement('div');
    item.className = 'relationship-item';
    item.innerHTML = `
      <div class="email">${mapping.email}</div>
      <div class="relationship">${mapping.relationship}</div>
      <div class="actions">
        <button class="edit-btn" data-index="${index}">編集</button>
        <button class="delete-btn" data-index="${index}">削除</button>
      </div>
    `;
    
    relationshipItemsContainer.appendChild(item);
  });
  
  // イベントリスナーの追加
  document.querySelectorAll('.relationship-item .edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => editRelationshipMapping(parseInt(e.target.dataset.index)));
  });
  
  document.querySelectorAll('.relationship-item .delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => deleteRelationshipMapping(parseInt(e.target.dataset.index)));
  });
}

// カスタム関係性の表示
function renderCustomRelationships() {
  customRelationshipItemsContainer.innerHTML = '';
  
  customRelationships.forEach((rel, index) => {
    const item = document.createElement('div');
    item.className = 'custom-relationship-item';
    item.innerHTML = `
      <div class="name">${rel.name}</div>
      <div class="description">${rel.description}</div>
      <div class="actions">
        <button class="edit-btn" data-index="${index}">編集</button>
        <button class="delete-btn" data-index="${index}">削除</button>
      </div>
    `;
    
    customRelationshipItemsContainer.appendChild(item);
  });
  
  // イベントリスナーの追加
  document.querySelectorAll('.custom-relationship-item .edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => editCustomRelationship(parseInt(e.target.dataset.index)));
  });
  
  document.querySelectorAll('.custom-relationship-item .delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => deleteCustomRelationship(parseInt(e.target.dataset.index)));
  });
}

// 関係性セレクトボックスの更新
function updateRelationshipSelect() {
  newRelationshipSelect.innerHTML = '<option value="">関係性を選択</option>';
  
  customRelationships.forEach(rel => {
    const option = document.createElement('option');
    option.value = rel.name;
    option.textContent = rel.name;
    newRelationshipSelect.appendChild(option);
  });
}

// 関係性マッピングの追加
function addRelationshipMapping() {
  const email = newEmailInput.value.trim();
  const relationship = newRelationshipSelect.value;
  
  if (!email || !relationship) {
    alert('メールアドレスと関係性を入力してください');
    return;
  }
  
  // 既存のマッピングの確認
  const existingIndex = relationshipMappings.findIndex(m => m.email === email);
  if (existingIndex >= 0) {
    relationshipMappings[existingIndex].relationship = relationship;
  } else {
    relationshipMappings.push({ email, relationship });
  }
  
  renderRelationshipMappings();
  newEmailInput.value = '';
  newRelationshipSelect.value = '';
}

// カスタム関係性の追加
function addCustomRelationship() {
  const name = newCustomNameInput.value.trim();
  const description = newCustomDescriptionInput.value.trim();
  
  if (!name || !description) {
    alert('関係性名と説明を入力してください');
    return;
  }
  
  // 既存の関係性の確認
  const existingIndex = customRelationships.findIndex(r => r.name === name);
  if (existingIndex >= 0) {
    customRelationships[existingIndex].description = description;
  } else {
    customRelationships.push({ name, description });
  }
  
  renderCustomRelationships();
  updateRelationshipSelect();
  newCustomNameInput.value = '';
  newCustomDescriptionInput.value = '';
}

// 関係性マッピングの編集
function editRelationshipMapping(index) {
  const mapping = relationshipMappings[index];
  newEmailInput.value = mapping.email;
  newRelationshipSelect.value = mapping.relationship;
  deleteRelationshipMapping(index);
}

// 関係性マッピングの削除
function deleteRelationshipMapping(index) {
  relationshipMappings.splice(index, 1);
  renderRelationshipMappings();
}

// カスタム関係性の編集
function editCustomRelationship(index) {
  const rel = customRelationships[index];
  newCustomNameInput.value = rel.name;
  newCustomDescriptionInput.value = rel.description;
  deleteCustomRelationship(index);
}

// カスタム関係性の削除
function deleteCustomRelationship(index) {
  customRelationships.splice(index, 1);
  renderCustomRelationships();
  updateRelationshipSelect();
}

// 設定の保存
function saveSettings() {
  chrome.storage.sync.set({
    relationshipMappings,
    customRelationships,
    autoSaveApi: autoSaveApiCheckbox.checked
  }, () => {
    showSavedMessage();
  });
}

// 保存メッセージの表示
function showSavedMessage() {
  const message = document.createElement('div');
  message.className = 'saved-message';
  message.textContent = '設定を保存しました';
  document.body.appendChild(message);
  
  setTimeout(() => {
    message.remove();
  }, 2000);
}

// 設定のリセット
function resetSettings() {
  if (confirm('すべての設定をリセットしますか？')) {
    relationshipMappings = [];
    customRelationships = getDefaultCustomRelationships();
    autoSaveApiCheckbox.checked = true;
    
    renderRelationshipMappings();
    renderCustomRelationships();
    updateRelationshipSelect();
  }
}