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
    
    // 英訳ボタンを作成
    const translateButton = document.createElement('div');
    translateButton.className = 'email-translate-button';
    translateButton.innerHTML = `
      <div class="T-I J-J5-Ji aoO T-I-atl" role="button" tabindex="0" 
           style="margin-right: 8px; background-color: #34a853; color: white; border-radius: 4px; padding: 8px 16px;">
        <span class="Tn">英訳</span>
      </div>
    `;
    
    // 関係性ラベルを作成
    const relationshipLabel = document.createElement('div');
    relationshipLabel.className = 'relationship-label';
    relationshipLabel.style.marginLeft = '8px';
    relationshipLabel.style.fontSize = '14px';
    relationshipLabel.style.color = '#5f6368';
    relationshipLabel.style.cursor = 'pointer';
    relationshipLabel.style.padding = '4px 8px';
    relationshipLabel.style.borderRadius = '4px';
    relationshipLabel.style.border = '1px solid transparent';
    relationshipLabel.textContent = '関係性を確認中...';
    
    // ホバー効果を追加
    relationshipLabel.addEventListener('mouseenter', () => {
      relationshipLabel.style.backgroundColor = '#f8f9fa';
      relationshipLabel.style.border = '1px solid #dadce0';
    });
    
    relationshipLabel.addEventListener('mouseleave', () => {
      if (!relationshipLabel.classList.contains('editing')) {
        relationshipLabel.style.backgroundColor = 'transparent';
        relationshipLabel.style.border = '1px solid transparent';
      }
    });
    
    // クリックイベントを追加
    relationshipLabel.addEventListener('click', (e) => {
      e.stopPropagation();
      enableRelationshipEditing(relationshipLabel, composeBox);
    });
    
    // ボタンとラベルをコンテナに追加
    buttonContainer.appendChild(adjustButton);
    buttonContainer.appendChild(translateButton);
    buttonContainer.appendChild(relationshipLabel);
    
    // 宛先フィールドから関係性を取得してラベルを更新
    updateRelationshipLabel(composeBox, relationshipLabel);
    
    // 宛先フィールドの変更を監視
    setupToFieldObserver(composeBox, relationshipLabel);
    
    // より頻繁に関係性ラベルを更新
    setupFrequentUpdate(composeBox, relationshipLabel);
    
    // デバッグ用：定期的に宛先をチェック（必要に応じてコメントアウト）
    // setupPeriodicCheck(composeBox, relationshipLabel);
    
    adjustButton.addEventListener('click', () => handleAdjustButtonClick(composeBox));
    translateButton.addEventListener('click', () => handleTranslateButtonClick(composeBox));
    composeBox.parentNode.insertBefore(buttonContainer, composeBox.nextSibling);
  });
}

// 宛先フィールドの変更を監視
function setupToFieldObserver(composeBox, relationshipLabel) {
  const emailContainer = composeBox.closest('div[role="dialog"]') || composeBox.closest('form') || composeBox.closest('.M9');
  
  if (emailContainer) {
    // MutationObserverで宛先チップの追加/削除を監視
    const observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // 宛先チップが追加または削除された場合
          const hasRecipientChanges = Array.from(mutation.addedNodes).some(node => 
            node.nodeType === 1 && (node.matches('.vR') || node.querySelector('.vR'))
          ) || Array.from(mutation.removedNodes).some(node => 
            node.nodeType === 1 && (node.matches('.vR') || node.querySelector('.vR'))
          );
          if (hasRecipientChanges) {
            shouldUpdate = true;
          }
        }
      });
      
      if (shouldUpdate) {
        setTimeout(() => updateRelationshipLabel(composeBox, relationshipLabel), 100);
      }
    });
    
    observer.observe(emailContainer, { 
      childList: true, 
      subtree: true,
      attributes: false 
    });
    
    // input要素の変更も監視
    const toInput = emailContainer.querySelector('input[aria-label*="To"], input[aria-label*="宛先"]');
    if (toInput) {
      toInput.addEventListener('input', () => {
        setTimeout(() => updateRelationshipLabel(composeBox, relationshipLabel), 200);
      });
      toInput.addEventListener('change', () => {
        setTimeout(() => updateRelationshipLabel(composeBox, relationshipLabel), 200);
      });
    }
  }
}

// より頻繁に関係性ラベルを更新
function setupFrequentUpdate(composeBox, relationshipLabel) {
  // 最初の5回のみ、2秒間隔で関係性ラベルを更新
  let updateCount = 0;
  const maxUpdates = 5;
  
  const updateInterval = setInterval(() => {
    updateCount++;
    updateRelationshipLabel(composeBox, relationshipLabel);
    
    if (updateCount >= maxUpdates) {
      clearInterval(updateInterval);
    }
  }, 2000);
  
  // フォーカスイベントでも更新
  const emailContainer = composeBox.closest('div[role="dialog"]') || composeBox.closest('form') || composeBox.closest('.M9');
  if (emailContainer) {
    const toInput = emailContainer.querySelector('input[aria-label*="To"], input[aria-label*="宛先"]');
    if (toInput) {
      toInput.addEventListener('focus', () => {
        setTimeout(() => updateRelationshipLabel(composeBox, relationshipLabel), 500);
      });
      
      toInput.addEventListener('blur', () => {
        setTimeout(() => updateRelationshipLabel(composeBox, relationshipLabel), 500);
      });
    }
  }
}

// デバッグ用：定期的に宛先をチェック
function setupPeriodicCheck(composeBox, relationshipLabel) {
  console.log('[Email Assistant] 定期チェック開始');
  let checkCount = 0;
  
  const interval = setInterval(() => {
    checkCount++;
    console.log(`[Email Assistant] 定期チェック ${checkCount}回目`);
    
    const emailContainer = composeBox.closest('div[role="dialog"]') || composeBox.closest('form') || composeBox.closest('.M9');
    
    // input要素の状態をチェック
    const toInput = emailContainer?.querySelector('input[aria-label*="To"], input[aria-label*="宛先"]');
    if (toInput) {
      console.log(`[Email Assistant] input状態 - value: "${toInput.value}", textContent: "${toInput.textContent}"`);
      console.log(`[Email Assistant] input属性:`, {
        placeholder: toInput.placeholder,
        'aria-description': toInput.getAttribute('aria-description'),
        'aria-owns': toInput.getAttribute('aria-owns')
      });
    }
    
    // aria-owns で参照されるリストボックスをチェック
    if (toInput && toInput.getAttribute('aria-owns')) {
      const listboxId = toInput.getAttribute('aria-owns');
      const listbox = document.getElementById(listboxId);
      console.log(`[Email Assistant] listbox (${listboxId}):`, listbox);
      if (listbox) {
        console.log(`[Email Assistant] listbox内容:`, listbox.innerHTML);
      }
    }
    
    // 選択済み宛先の表示エリアをより広範囲で検索
    const possibleChipAreas = emailContainer?.querySelectorAll('div[aria-label], div[title], span[title], [data-name]');
    if (possibleChipAreas) {
      console.log(`[Email Assistant] 可能性のあるチップエリア数: ${possibleChipAreas.length}`);
      Array.from(possibleChipAreas).forEach((area, index) => {
        if (area.textContent && area.textContent.includes('@')) {
          console.log(`[Email Assistant] @を含むエリア ${index}:`, area.textContent, area);
        }
      });
    }
    
    // 10回チェックしたら停止
    if (checkCount >= 10) {
      clearInterval(interval);
      console.log('[Email Assistant] 定期チェック終了');
    }
  }, 2000); // 2秒間隔
}

// 関係性ラベルを更新
async function updateRelationshipLabel(composeBox, relationshipLabel) {
  try {
    // 宛先メールアドレスを取得
    const emailContainer = composeBox.closest('div[role="dialog"]') || composeBox.closest('form') || composeBox.closest('.M9');
    let recipientEmail = '';
    let toField = null; // toFieldを関数の最初で定義
    
    // console.log('[Email Assistant] emailContainer:', emailContainer);
    
    // DOM構造の詳細調査（デバッグ用 - 必要に応じてコメントアウト）
    /*
    if (emailContainer) {
      console.log('[Email Assistant] DOM調査 - emailContainer HTML:', emailContainer.innerHTML.substring(0, 500));
      
      // Toフィールド周辺の構造を調査
      const toArea = emailContainer.querySelector('[aria-label*="To"], [aria-label*="宛先"]');
      if (toArea) {
        console.log('[Email Assistant] To area found:', toArea);
        console.log('[Email Assistant] To area parent:', toArea.parentElement);
        console.log('[Email Assistant] To area siblings:', Array.from(toArea.parentElement.children));
      }
      
      // 全ての可能な宛先関連要素を検索
      const allElements = emailContainer.querySelectorAll('*');
      const emailElements = Array.from(allElements).filter(el => {
        const text = el.textContent || '';
        const attrs = Array.from(el.attributes).map(attr => attr.name + '=' + attr.value).join(' ');
        return text.includes('@') || attrs.includes('@') || attrs.includes('email');
      });
      console.log('[Email Assistant] 全ての@関連要素:', emailElements);
    }
    */
    
    // 1. まず選択済みの宛先チップから取得を試行（より具体的なセレクタを使用）
    const chipSelectors = [
      '[email]', // email属性を持つ要素
      '.vR span[email]',
      '.afX span[email]', 
      '.vT span[email]',
      '.yW span[email]',
      '.vO .go span', // 宛先チップ内のspan
      '.vN .vM', // 宛先名表示エリア
      '[data-hovercard-id]' // Gmail の連絡先カード
    ];
    
    let recipientChips = [];
    for (const selector of chipSelectors) {
      const chips = emailContainer?.querySelectorAll(selector);
      if (chips && chips.length > 0) {
        recipientChips = Array.from(chips);
        // console.log('[Email Assistant] 見つかったchips with selector:', selector, chips);
        break;
      }
    }
    
    // console.log('[Email Assistant] recipientChips:', recipientChips);
    
    if (recipientChips.length > 0) {
      for (const chip of recipientChips) {
        const email = chip.getAttribute('email') || 
                     chip.getAttribute('data-hovercard-id') || 
                     chip.textContent || 
                     chip.title;
        // console.log('[Email Assistant] chip email:', email);
        if (email && email.includes('@')) {
          recipientEmail = email;
          break;
        }
      }
    }
    
    // 2. チップが見つからない場合、input要素から取得
    if (!recipientEmail) {
      const toSelectors = [
        'input[aria-label*="To"]',
        'input[aria-label*="宛先"]',
        'input[name="to"]',
        'div[role="textbox"][aria-label*="宛先"]', 
        'div[role="textbox"][aria-label*="To"]'
      ];
      
      for (const selector of toSelectors) {
        toField = emailContainer?.querySelector(selector);
        if (toField) {
          // console.log('[Email Assistant] 見つかったtoField:', toField, 'value:', toField.value);
          recipientEmail = toField.value || toField.textContent || toField.getAttribute('data-initial-value') || '';
          break;
        }
      }
    }
    
    // 3. メールアドレス部分のみを抽出
    if (recipientEmail) {
      const emailMatch = recipientEmail.match(/[\w\.-]+@[\w\.-]+\.\w+/);
      if (emailMatch) {
        recipientEmail = emailMatch[0];
      }
    }
    
    if (recipientEmail && recipientEmail.trim() !== '') {
      const relationship = await getRelationship(recipientEmail);
      relationshipLabel.textContent = `関係性: ${relationship}`;
    } else {
      // 宛先が入力されていない場合でも、デフォルト関係性を表示
      const defaultRelationship = await getDefaultRelationship();
      relationshipLabel.textContent = `関係性: ${defaultRelationship}（デフォルト）`;
    }
  } catch (error) {
    console.error('関係性ラベル更新エラー:', error);
    relationshipLabel.textContent = 'デフォルト: クライアント';
  }
}

// 調整ボタンのクリックハンドラー
function handleAdjustButtonClick(composeBox) {
  // メール内容を取得
  const emailContent = composeBox.innerHTML;
  
  // 宛先から関係性を取得
  const emailContainer = composeBox.closest('div[role="dialog"]') || composeBox.closest('form') || composeBox.closest('.M9');
  let recipientEmail = '';
  
  // 1. まず選択済みの宛先チップから取得を試行（より具体的なセレクタを使用）
  const chipSelectors = [
    '[email]', // email属性を持つ要素
    '.vR span[email]',
    '.afX span[email]', 
    '.vT span[email]',
    '.yW span[email]',
    '.vO .go span', // 宛先チップ内のspan
    '.vN .vM', // 宛先名表示エリア
    '[data-hovercard-id]' // Gmail の連絡先カード
  ];
  
  let recipientChips = [];
  for (const selector of chipSelectors) {
    const chips = emailContainer?.querySelectorAll(selector);
    if (chips && chips.length > 0) {
      recipientChips = Array.from(chips);
      break;
    }
  }
  
  if (recipientChips.length > 0) {
    for (const chip of recipientChips) {
      const email = chip.getAttribute('email') || 
                   chip.getAttribute('data-hovercard-id') || 
                   chip.textContent || 
                   chip.title;
      if (email && email.includes('@')) {
        recipientEmail = email;
        break;
      }
    }
  }
  
  // 2. チップが見つからない場合、input要素から取得
  if (!recipientEmail) {
    const toSelectors = [
      'input[aria-label*="To"]',
      'input[aria-label*="宛先"]',
      'input[name="to"]',
      'div[role="textbox"][aria-label*="宛先"]', 
      'div[role="textbox"][aria-label*="To"]'
    ];
    
    let toField = null;
    for (const selector of toSelectors) {
      toField = emailContainer?.querySelector(selector);
      if (toField) {
        recipientEmail = toField.value || toField.textContent || toField.getAttribute('data-initial-value') || '';
        break;
      }
    }
  }
  
  // 3. メールアドレス部分のみを抽出
  if (recipientEmail) {
    const emailMatch = recipientEmail.match(/[\w\.-]+@[\w\.-]+\.\w+/);
    if (emailMatch) {
      recipientEmail = emailMatch[0];
    }
  }
  
  // console.log('[Email Assistant] 調整ボタンクリック - 宛先:', recipientEmail);
  
  // カスタム関係性があるかチェック
  const buttonContainer = composeBox.parentNode.querySelector('.email-adjust-button-container');
  const relationshipLabel = buttonContainer?.querySelector('.relationship-label');
  const customRelationship = relationshipLabel ? getCustomRelationship(relationshipLabel) : null;
  
  if (customRelationship) {
    // カスタム関係性を使用
    chrome.runtime.sendMessage(
      { action: "adjustEmail", emailContent: stripHtml(emailContent), relationship: customRelationship },
      response => {
        if (response.success) {
          showAdjustmentResult(composeBox, response.adjustedEmail);
        } else {
          showError(composeBox, response.error);
        }
      }
    );
  } else {
    // 通常の関係性取得処理
    getRelationship(recipientEmail).then(relationship => {
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
}

// 関係性を取得（Background scriptを通じて）
async function getRelationship(email) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: "getRelationship", email: email },
      (response) => {
        if (response && response.relationship) {
          resolve(response.relationship);
        } else {
          resolve('クライアント'); // フォールバック
        }
      }
    );
  });
}

// デフォルト関係性を取得
async function getDefaultRelationship() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: "getRelationship", email: "" }, // 空のemailでデフォルト関係性を取得
      (response) => {
        if (response && response.relationship) {
          resolve(response.relationship);
        } else {
          resolve('クライアント'); // フォールバック
        }
      }
    );
  });
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

// 英訳ボタンのクリックハンドラー
function handleTranslateButtonClick(composeBox) {
  // メール内容を取得
  const emailContent = composeBox.innerHTML;
  
  // 宛先から関係性を取得
  const emailContainer = composeBox.closest('div[role="dialog"]') || composeBox.closest('form') || composeBox.closest('.M9');
  let recipientEmail = '';
  
  // 1. まず選択済みの宛先チップから取得を試行（より具体的なセレクタを使用）
  const chipSelectors = [
    '[email]', // email属性を持つ要素
    '.vR span[email]',
    '.afX span[email]', 
    '.vT span[email]',
    '.yW span[email]',
    '.vO .go span', // 宛先チップ内のspan
    '.vN .vM', // 宛先名表示エリア
    '[data-hovercard-id]' // Gmail の連絡先カード
  ];
  
  let recipientChips = [];
  for (const selector of chipSelectors) {
    const chips = emailContainer?.querySelectorAll(selector);
    if (chips && chips.length > 0) {
      recipientChips = Array.from(chips);
      break;
    }
  }
  
  if (recipientChips.length > 0) {
    for (const chip of recipientChips) {
      const email = chip.getAttribute('email') || 
                   chip.getAttribute('data-hovercard-id') || 
                   chip.textContent || 
                   chip.title;
      if (email && email.includes('@')) {
        recipientEmail = email;
        break;
      }
    }
  }
  
  // 2. チップが見つからない場合、input要素から取得
  if (!recipientEmail) {
    const toSelectors = [
      'input[aria-label*="To"]',
      'input[aria-label*="宛先"]',
      'input[name="to"]',
      'div[role="textbox"][aria-label*="宛先"]', 
      'div[role="textbox"][aria-label*="To"]'
    ];
    
    let toField = null;
    for (const selector of toSelectors) {
      toField = emailContainer?.querySelector(selector);
      if (toField) {
        recipientEmail = toField.value || toField.textContent || toField.getAttribute('data-initial-value') || '';
        break;
      }
    }
  }
  
  // 3. メールアドレス部分のみを抽出
  if (recipientEmail) {
    const emailMatch = recipientEmail.match(/[\w\.-]+@[\w\.-]+\.\w+/);
    if (emailMatch) {
      recipientEmail = emailMatch[0];
    }
  }
  
  // カスタム関係性があるかチェック
  const buttonContainer = composeBox.parentNode.querySelector('.email-adjust-button-container');
  const relationshipLabel = buttonContainer?.querySelector('.relationship-label');
  const customRelationship = relationshipLabel ? getCustomRelationship(relationshipLabel) : null;
  
  if (customRelationship) {
    // カスタム関係性を使用
    chrome.runtime.sendMessage(
      { action: "translateEmail", emailContent: stripHtml(emailContent), relationship: customRelationship },
      response => {
        if (response.success) {
          showTranslationResult(composeBox, response.translatedEmail);
        } else {
          showError(composeBox, response.error);
        }
      }
    );
  } else {
    // 通常の関係性取得処理
    getRelationship(recipientEmail).then(relationship => {
      chrome.runtime.sendMessage(
        { action: "translateEmail", emailContent: stripHtml(emailContent), relationship: relationship },
        response => {
          if (response.success) {
            showTranslationResult(composeBox, response.translatedEmail);
          } else {
            showError(composeBox, response.error);
          }
        }
      );
    });
  }
}

// 英訳結果を表示
function showTranslationResult(composeBox, translatedEmail) {
  // すでに表示されている結果パネルを削除
  removeExistingResultPanel(composeBox);
  
  // 結果パネルを作成
  const resultPanel = document.createElement('div');
  resultPanel.className = 'email-adjustment-result';
  resultPanel.innerHTML = `
    <div class="adjustment-header">英訳結果</div>
    <div class="adjustment-content">${translatedEmail}</div>
    <div class="adjustment-actions">
      <button class="apply-btn">適用</button>
      <button class="cancel-btn">キャンセル</button>
    </div>
  `;
  
  // ボタンのイベントリスナーを追加
  resultPanel.querySelector('.apply-btn').addEventListener('click', () => {
    composeBox.innerHTML = translatedEmail;
    resultPanel.remove();
  });
  
  resultPanel.querySelector('.cancel-btn').addEventListener('click', () => {
    resultPanel.remove();
  });
  
  // パネルを挿入
  composeBox.parentNode.insertBefore(resultPanel, composeBox.nextSibling);
}

// 関係性ラベルの編集機能
function enableRelationshipEditing(relationshipLabel, composeBox) {
  // 既に編集中の場合は何もしない
  if (relationshipLabel.classList.contains('editing')) {
    return;
  }
  
  // 現在のテキストを取得（「関係性: 」部分を除去）
  const currentText = relationshipLabel.textContent.replace(/^関係性:\s*/, '').replace(/（デフォルト）$/, '');
  
  // 編集状態のスタイルを適用
  relationshipLabel.classList.add('editing');
  relationshipLabel.style.backgroundColor = '#fff';
  relationshipLabel.style.border = '1px solid #1a73e8';
  relationshipLabel.style.position = 'relative';
  
  // 入力フィールドを作成
  const input = document.createElement('input');
  input.type = 'text';
  input.value = currentText;
  input.style.width = '200px';
  input.style.padding = '4px 8px';
  input.style.border = 'none';
  input.style.outline = 'none';
  input.style.fontSize = '14px';
  input.style.color = '#5f6368';
  input.style.backgroundColor = 'transparent';
  input.placeholder = '関係性を入力してください';
  
  // 元のテキストを非表示にし、入力フィールドを表示
  relationshipLabel.textContent = '';
  relationshipLabel.appendChild(input);
  
  // 入力フィールドにフォーカス
  input.focus();
  input.select();
  
  // 編集完了時の処理
  const finishEditing = async (save = false) => {
    const newRelationship = input.value.trim();
    
    // 編集状態を解除
    relationshipLabel.classList.remove('editing');
    relationshipLabel.style.backgroundColor = 'transparent';
    relationshipLabel.style.border = '1px solid transparent';
    
    if (save && newRelationship) {
      // 一時的に新しい関係性を保存（グローバル保存は行わない）
      relationshipLabel.setAttribute('data-custom-relationship', newRelationship);
      relationshipLabel.textContent = `関係性: ${newRelationship}（カスタム）`;
    } else {
      // キャンセルされた場合は元の表示に戻す
      await updateRelationshipLabel(composeBox, relationshipLabel);
    }
    
    // 入力フィールドを削除
    if (relationshipLabel.contains(input)) {
      relationshipLabel.removeChild(input);
    }
  };
  
  // IME入力状態を追跡
  let isComposing = false;
  
  // IME入力開始
  input.addEventListener('compositionstart', () => {
    isComposing = true;
  });
  
  // IME入力終了
  input.addEventListener('compositionend', () => {
    isComposing = false;
  });
  
  // Enterキーで保存（IME入力中は無視）
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      // IME入力中（日本語変換中）の場合は何もしない
      if (isComposing) {
        return;
      }
      e.preventDefault();
      finishEditing(true);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      finishEditing(false);
    }
  });
  
  // フォーカスが離れたら保存
  input.addEventListener('blur', () => {
    finishEditing(true);
  });
  
  // クリック時のイベント伝播を停止
  input.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

// カスタム関係性を取得する関数
function getCustomRelationship(relationshipLabel) {
  return relationshipLabel.getAttribute('data-custom-relationship') || null;
}

// ページ読み込み完了時に拡張機能を初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}
