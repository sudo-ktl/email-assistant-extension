// Gmail UI統合のための変数
let gmailIntegrationInitialized = false;

// 拡張機能のコンテキストが有効かチェック
function isExtensionContextValid() {
  try {
    return chrome.runtime && chrome.runtime.id;
  } catch (error) {
    return false;
  }
}

// 拡張機能の再初期化
function reinitializeExtension() {
  gmailIntegrationInitialized = false;
  console.log("Extension context invalidated, reinitializing...");
  
  // 既存のボタンを削除
  const existingButtons = document.querySelectorAll('.email-adjust-button-container');
  existingButtons.forEach(button => button.remove());
  
  // 再初期化を試行
  setTimeout(() => {
    if (isExtensionContextValid()) {
      initializeExtension();
    }
  }, 1000);
}


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

// Gmail Compose Type検出機能
function detectGmailComposeType(composeBox) {
  let confidence = 0;
  let type = 'new'; // デフォルト
  
  try {
    // 1. URLハッシュによる判定（最も確実）
    const urlHash = window.location.hash;
    if (urlHash.includes('reply')) {
      type = 'reply';
      confidence += 40;
    } else if (urlHash.includes('forward')) {
      type = 'forward';
      confidence += 40;
    } else if (urlHash.includes('compose')) {
      type = 'new';
      confidence += 40;
    }
    
    // 2. 件名フィールドのプレフィックスをチェック
    const emailContainer = composeBox.closest('div[role="dialog"]') || composeBox.closest('form') || composeBox.closest('.M9');
    const subjectField = emailContainer?.querySelector('input[name="subjectbox"]');
    if (subjectField && subjectField.value) {
      if (subjectField.value.startsWith('Re:')) {
        type = 'reply';
        confidence += 30;
      } else if (subjectField.value.startsWith('Fwd:') || subjectField.value.startsWith('転送:')) {
        type = 'forward';
        confidence += 30;
      }
    }
    
    // 3. 引用テキストの存在をチェック
    const hasQuotedText = composeBox.querySelector('blockquote, .gmail_quote, .gmail_extra') ||
                         composeBox.innerHTML.includes('&gt;') ||
                         composeBox.textContent.includes('wrote:') ||
                         composeBox.textContent.includes('さんは書きました');
    if (hasQuotedText) {
      if (type === 'new') type = 'reply'; // URLから判定できなかった場合
      confidence += 20;
    }
    
    // 4. TOフィールドに既存の宛先があるかチェック（返信の場合）
    const toField = emailContainer?.querySelector('input[aria-label*="To"], input[aria-label*="宛先"]');
    if (toField && toField.value && type === 'new') {
      type = 'reply';
      confidence += 10;
    }
    
  } catch (error) {
    console.log('[Email Assistant] Compose type detection error:', error);
  }
  
  return { type, confidence: Math.min(confidence, 100) };
}

// 作成ボックスに調整ボタンを追加
function addAdjustButtonToComposeBoxes(composeBoxes) {
  composeBoxes.forEach(composeBox => {
    // ボタンが既に存在するかチェック
    const existingButton = composeBox.parentNode.querySelector('.email-adjust-button-container');
    if (existingButton) return;
    
    // Compose Typeを検出
    const composeTypeResult = detectGmailComposeType(composeBox);
    const isReply = composeTypeResult.type === 'reply' || composeTypeResult.type === 'forward';
    
    // editableクラス要素（メール本文エリア）のレイアウト調整
    composeBox.style.marginBottom = '100px'; // ボタンコンテナ分のスペース + 3行分の余裕を確保
    composeBox.style.paddingBottom = '20px'; // 内部パディングも追加
    
    // 本文入力欄の下に配置するコンテナを作成
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'email-adjust-button-container';
    
    // 返信画面と新規作成画面で異なるスタイルを適用
    let containerStyle;
    if (isReply) {
      // 返信画面：右寄せ、メール本文と同じ高さ、ボタン横並び+ラベル下配置
      containerStyle = `
        padding: 8px;
        margin-top: 15px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        align-items: stretch;
        position: absolute;
        top: 0;
        right: 0;
        width: auto;
        min-width: 180px;
        max-width: 220px;
        z-index: 100;
        background-color: #fff;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        border-radius: 4px;
        border: 1px solid #dadce0;
      `;
    } else {
      // 新規作成画面：従来のレイアウト（横並び）
      containerStyle = `
        padding: 10px 0;
        border-top: 1px solid #e0e0e0;
        margin-top: 15px;
        display: flex;
        align-items: center;
        position: absolute;
        bottom: -80px;
        left: 0;
        right: 0;
        z-index: 100;
        background-color: #fff;
        min-height: 40px;
        box-shadow: 0 -2px 4px rgba(0,0,0,0.1);
      `;
    }
    
    buttonContainer.style.cssText = containerStyle;
    
    // 返信画面用のボタンコンテナ（ボタンを横並びにするため）
    let buttonRowContainer;
    if (isReply) {
      buttonRowContainer = document.createElement('div');
      buttonRowContainer.style.cssText = `
        display: flex;
        gap: 4px;
        width: 100%;
      `;
    }
    
    // メール調整ボタンを作成
    const adjustButton = document.createElement('div');
    adjustButton.className = 'email-adjust-button';
    const adjustButtonStyle = isReply ? 
      'flex: 1; background-color: #4285f4; color: white; border-radius: 4px; padding: 6px 4px; font-size: 11px; text-align: center;' : 
      'margin-right: 8px; background-color: #4285f4; color: white; border-radius: 4px; padding: 8px 16px;';
    adjustButton.innerHTML = `
      <div class="T-I J-J5-Ji aoO T-I-atl" role="button" tabindex="0" 
           style="${adjustButtonStyle}">
        <span class="Tn">調整</span>
      </div>
    `;
    
    // 英訳ボタンを作成
    const translateButton = document.createElement('div');
    translateButton.className = 'email-translate-button';
    const translateButtonStyle = isReply ? 
      'flex: 1; background-color: #34a853; color: white; border-radius: 4px; padding: 6px 4px; font-size: 11px; text-align: center;' : 
      'margin-right: 8px; background-color: #34a853; color: white; border-radius: 4px; padding: 8px 16px;';
    translateButton.innerHTML = `
      <div class="T-I J-J5-Ji aoO T-I-atl" role="button" tabindex="0" 
           style="${translateButtonStyle}">
        <span class="Tn">英訳</span>
      </div>
    `;
    
    // 関係性ラベルを作成
    const relationshipLabel = document.createElement('div');
    relationshipLabel.className = 'relationship-label';
    if (isReply) {
      // 返信画面用のスタイル：ボタン下に配置
      relationshipLabel.style.width = '100%';
      relationshipLabel.style.fontSize = '11px';
      relationshipLabel.style.color = '#5f6368';
      relationshipLabel.style.cursor = 'pointer';
      relationshipLabel.style.padding = '4px 6px';
      relationshipLabel.style.borderRadius = '4px';
      relationshipLabel.style.border = '1px solid #dadce0';
      relationshipLabel.style.zIndex = '1';
      relationshipLabel.style.backgroundColor = '#f8f9fa';
      relationshipLabel.style.textAlign = 'center';
      relationshipLabel.style.boxSizing = 'border-box';
    } else {
      // 新規作成画面用のスタイル（従来通り）
      relationshipLabel.style.marginLeft = '8px';
      relationshipLabel.style.fontSize = '14px';
      relationshipLabel.style.color = '#5f6368';
      relationshipLabel.style.cursor = 'pointer';
      relationshipLabel.style.padding = '4px 8px';
      relationshipLabel.style.borderRadius = '4px';
      relationshipLabel.style.border = '1px solid #dadce0';
      relationshipLabel.style.zIndex = '1';
    }
    relationshipLabel.textContent = '関係性を確認中...';
    
    // ホバー効果を追加
    relationshipLabel.addEventListener('mouseenter', () => {
      if (!relationshipLabel.classList.contains('editing')) {
        relationshipLabel.style.backgroundColor = '#f8f9fa';
        relationshipLabel.style.border = '1px solid #1a73e8';
      }
    });
    
    relationshipLabel.addEventListener('mouseleave', () => {
      if (!relationshipLabel.classList.contains('editing')) {
        relationshipLabel.style.backgroundColor = isReply ? '#f8f9fa' : 'transparent';
        relationshipLabel.style.border = '1px solid #dadce0';
      }
    });
    
    // クリックイベントを追加
    relationshipLabel.addEventListener('click', (e) => {
      e.stopPropagation();
      enableRelationshipEditing(relationshipLabel, composeBox);
    });
    
    // ボタンとラベルをコンテナに追加
    if (isReply) {
      // 返信画面：ボタンを横並びコンテナに追加し、その下に関係性ラベル
      buttonRowContainer.appendChild(adjustButton);
      buttonRowContainer.appendChild(translateButton);
      buttonContainer.appendChild(buttonRowContainer);
      buttonContainer.appendChild(relationshipLabel);
    } else {
      // 新規作成画面：従来通り横並び
      buttonContainer.appendChild(adjustButton);
      buttonContainer.appendChild(translateButton);
      buttonContainer.appendChild(relationshipLabel);
    }
    
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
    
    // 親要素のpositionを設定してabsolute positioningを有効にする
    const composeParent = composeBox.parentNode;
    if (composeParent) {
      composeParent.style.position = 'relative';
      composeParent.appendChild(buttonContainer);
    } else {
      // フォールバック：従来の方法
      const messageBodyElement = composeBox.closest('[aria-label="メッセージ本文"]');
      if (messageBodyElement && messageBodyElement.parentNode) {
        messageBodyElement.parentNode.insertBefore(buttonContainer, messageBodyElement.nextSibling);
      } else {
        composeBox.parentNode.insertBefore(buttonContainer, composeBox.nextSibling);
      }
    }
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
    if (!isExtensionContextValid()) {
      showError(composeBox, '拡張機能を再読み込みしてください');
      reinitializeExtension();
      return;
    }
    
    chrome.runtime.sendMessage(
      { action: "adjustEmail", emailContent: stripHtml(emailContent), relationship: customRelationship },
      response => {
        if (chrome.runtime.lastError) {
          showError(composeBox, '拡張機能を再読み込みしてください');
          return;
        }
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
      if (!isExtensionContextValid()) {
        showError(composeBox, '拡張機能を再読み込みしてください');
        reinitializeExtension();
        return;
      }
      
      chrome.runtime.sendMessage(
        { action: "adjustEmail", emailContent: stripHtml(emailContent), relationship: relationship },
        response => {
          if (chrome.runtime.lastError) {
            showError(composeBox, '拡張機能を再読み込みしてください');
            return;
          }
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
  
  // 結果パネルのスタイルを設定（editableクラス要素と重ならないように）
  resultPanel.style.cssText = `
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 20px;
    border: 1px solid #dadce0;
    border-radius: 8px;
    padding: 15px;
    background-color: #f8f9fa;
    font-family: 'Google Sans', Roboto, Arial, sans-serif;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    max-height: 300px;
    overflow-y: auto;
  `;
  
  resultPanel.innerHTML = `
    <div class="adjustment-header" style="font-weight: 500; margin-bottom: 12px; color: #202124; font-size: 16px;">メール調整結果</div>
    <div class="adjustment-content" style="padding: 12px; background-color: white; border: 1px solid #dadce0; border-radius: 4px; margin-bottom: 12px; white-space: pre-wrap; font-size: 14px; line-height: 1.5; max-height: 200px; overflow-y: auto;">${adjustedEmail}</div>
    <div class="adjustment-actions" style="display: flex; justify-content: flex-end; gap: 8px;">
      <button class="cancel-btn" style="padding: 8px 16px; border-radius: 4px; border: 1px solid #dadce0; cursor: pointer; font-family: 'Google Sans', Roboto, Arial, sans-serif; background-color: #f1f3f4; color: #5f6368;">キャンセル</button>
      <button class="apply-btn" style="padding: 8px 16px; border-radius: 4px; border: none; cursor: pointer; font-family: 'Google Sans', Roboto, Arial, sans-serif; background-color: #1a73e8; color: white;">適用</button>
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
  
  // パネルを適切な位置に挿入（親要素が相対位置になっているため）
  const composeParent = composeBox.parentNode;
  if (composeParent) {
    composeParent.appendChild(resultPanel);
  } else {
    composeBox.parentNode.insertBefore(resultPanel, composeBox.nextSibling);
  }
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
  
  // 結果パネルのスタイルを設定（editableクラス要素と重ならないように）
  resultPanel.style.cssText = `
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    margin-top: 20px;
    border: 1px solid #dadce0;
    border-radius: 8px;
    padding: 15px;
    background-color: #f8f9fa;
    font-family: 'Google Sans', Roboto, Arial, sans-serif;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    max-height: 300px;
    overflow-y: auto;
  `;
  
  resultPanel.innerHTML = `
    <div class="adjustment-header" style="font-weight: 500; margin-bottom: 12px; color: #202124; font-size: 16px;">英訳結果</div>
    <div class="adjustment-content" style="padding: 12px; background-color: white; border: 1px solid #dadce0; border-radius: 4px; margin-bottom: 12px; white-space: pre-wrap; font-size: 14px; line-height: 1.5; max-height: 200px; overflow-y: auto;">${translatedEmail}</div>
    <div class="adjustment-actions" style="display: flex; justify-content: flex-end; gap: 8px;">
      <button class="cancel-btn" style="padding: 8px 16px; border-radius: 4px; border: 1px solid #dadce0; cursor: pointer; font-family: 'Google Sans', Roboto, Arial, sans-serif; background-color: #f1f3f4; color: #5f6368;">キャンセル</button>
      <button class="apply-btn" style="padding: 8px 16px; border-radius: 4px; border: none; cursor: pointer; font-family: 'Google Sans', Roboto, Arial, sans-serif; background-color: #1a73e8; color: white;">適用</button>
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
  
  // パネルを適切な位置に挿入（親要素が相対位置になっているため）
  const composeParent = composeBox.parentNode;
  if (composeParent) {
    composeParent.appendChild(resultPanel);
  } else {
    composeBox.parentNode.insertBefore(resultPanel, composeBox.nextSibling);
  }
}

// 関係性ラベルの編集機能
async function enableRelationshipEditing(relationshipLabel, composeBox) {
  // 既に編集中の場合は何もしない
  if (relationshipLabel.classList.contains('editing')) {
    return;
  }
  
  // 現在のテキストを取得（「関係性: 」部分を除去）
  const currentText = relationshipLabel.textContent.replace(/^関係性:\s*/, '').replace(/（デフォルト）$/, '').replace(/（カスタム）$/, '');
  
  // 返信画面かどうかを判定
  const composeTypeResult = detectGmailComposeType(composeBox);
  const isReply = composeTypeResult.type === 'reply' || composeTypeResult.type === 'forward';
  
  // 編集状態のスタイルを適用
  relationshipLabel.classList.add('editing');
  relationshipLabel.style.backgroundColor = '#fff';
  relationshipLabel.style.border = '1px solid #1a73e8';
  relationshipLabel.style.position = 'relative';
  relationshipLabel.style.display = 'inline-block';
  relationshipLabel.style.minWidth = '250px';
  
  // 返信画面の場合、コンテナのmargin-rightを調整
  if (isReply) {
    const buttonContainer = relationshipLabel.closest('.email-adjust-button-container');
    if (buttonContainer) {
      buttonContainer.style.marginRight = '100px';
    }
  }
  
  // グローバル設定から全ての関係性選択肢を取得
  const allOptions = await getAllRelationshipOptions();
  
  // ドロップダウンとカスタム入力のコンテナを作成
  const editContainer = document.createElement('div');
  editContainer.style.display = 'flex';
  editContainer.style.flexDirection = 'column';
  editContainer.style.gap = '8px';
  editContainer.style.padding = '8px';
  editContainer.style.backgroundColor = '#fff';
  editContainer.style.border = '1px solid #dadce0';
  editContainer.style.borderRadius = '4px';
  editContainer.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
  editContainer.style.position = 'absolute';
  editContainer.style.top = '100%';
  editContainer.style.left = '0';
  editContainer.style.zIndex = '10000';
  editContainer.style.minWidth = '250px';
  
  // 定型選択肢のドロップダウンを作成
  const selectContainer = document.createElement('div');
  selectContainer.style.display = 'flex';
  selectContainer.style.flexDirection = 'column';
  selectContainer.style.gap = '4px';
  
  const selectLabel = document.createElement('div');
  selectLabel.textContent = '既存の関係性から選択:';
  selectLabel.style.fontSize = '12px';
  selectLabel.style.color = '#5f6368';
  selectLabel.style.fontWeight = '500';
  
  const select = document.createElement('select');
  select.style.width = '100%';
  select.style.padding = '6px 8px';
  select.style.border = '1px solid #dadce0';
  select.style.borderRadius = '4px';
  select.style.fontSize = '14px';
  select.style.backgroundColor = '#fff';
  
  // 「選択してください」オプションを最初に追加
  const emptyOption = document.createElement('option');
  emptyOption.value = '';
  emptyOption.textContent = '選択してください';
  select.appendChild(emptyOption);
  
  // 全ての関係性選択肢を追加（定型 + カスタム）
  allOptions.forEach(option => {
    const optionElement = document.createElement('option');
    optionElement.value = option;
    optionElement.textContent = option;
    if (option === currentText) {
      optionElement.selected = true;
    }
    select.appendChild(optionElement);
  });
  
  selectContainer.appendChild(selectLabel);
  selectContainer.appendChild(select);
  
  // カスタム入力フィールドのコンテナを作成
  const customContainer = document.createElement('div');
  customContainer.style.display = 'flex';
  customContainer.style.flexDirection = 'column';
  customContainer.style.gap = '4px';
  
  const customLabel = document.createElement('div');
  customLabel.textContent = 'カスタム入力:';
  customLabel.style.fontSize = '12px';
  customLabel.style.color = '#5f6368';
  customLabel.style.fontWeight = '500';
  
  const customInput = document.createElement('input');
  customInput.type = 'text';
  customInput.style.width = '100%';
  customInput.style.padding = '6px 8px';
  customInput.style.border = '1px solid #dadce0';
  customInput.style.borderRadius = '4px';
  customInput.style.fontSize = '14px';
  customInput.style.backgroundColor = '#fff';
  customInput.placeholder = '独自の関係性を入力';
  
  // 既存の選択肢にない場合はカスタム入力に値を設定
  if (!allOptions.includes(currentText) && currentText) {
    customInput.value = currentText;
  }
  
  customContainer.appendChild(customLabel);
  customContainer.appendChild(customInput);
  
  // ボタンコンテナを作成
  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '8px';
  buttonContainer.style.justifyContent = 'flex-end';
  
  const applyButton = document.createElement('button');
  applyButton.textContent = '適用';
  applyButton.style.padding = '6px 12px';
  applyButton.style.backgroundColor = '#1a73e8';
  applyButton.style.color = 'white';
  applyButton.style.border = 'none';
  applyButton.style.borderRadius = '4px';
  applyButton.style.fontSize = '14px';
  applyButton.style.cursor = 'pointer';
  
  const cancelButton = document.createElement('button');
  cancelButton.textContent = 'キャンセル';
  cancelButton.style.padding = '6px 12px';
  cancelButton.style.backgroundColor = '#f8f9fa';
  cancelButton.style.color = '#5f6368';
  cancelButton.style.border = '1px solid #dadce0';
  cancelButton.style.borderRadius = '4px';
  cancelButton.style.fontSize = '14px';
  cancelButton.style.cursor = 'pointer';
  
  buttonContainer.appendChild(cancelButton);
  buttonContainer.appendChild(applyButton);
  
  // 全てのコンテンツをコンテナに追加
  editContainer.appendChild(selectContainer);
  editContainer.appendChild(customContainer);
  editContainer.appendChild(buttonContainer);
  
  // 元のテキストを非表示にし、編集コンテナを表示
  relationshipLabel.textContent = '';
  relationshipLabel.appendChild(editContainer);
  
  // 最初にフォーカスを設定
  if (allOptions.includes(currentText)) {
    select.focus();
  } else {
    customInput.focus();
    customInput.select();
  }
  
  // 編集完了時の処理
  const finishEditing = async (save = false) => {
    let newRelationship = '';
    
    if (save) {
      // カスタム入力が優先（空でない場合）
      if (customInput.value.trim()) {
        newRelationship = customInput.value.trim();
      } else if (select.value) {
        newRelationship = select.value;
      }
    }
    
    // 編集状態を解除
    relationshipLabel.classList.remove('editing');
    relationshipLabel.style.backgroundColor = isReply ? '#f8f9fa' : 'transparent';
    relationshipLabel.style.border = '1px solid #dadce0';
    relationshipLabel.style.display = 'inline';
    relationshipLabel.style.minWidth = 'auto';
    
    // 返信画面の場合、コンテナのmargin-rightをリセット
    if (isReply) {
      const buttonContainer = relationshipLabel.closest('.email-adjust-button-container');
      if (buttonContainer) {
        buttonContainer.style.marginRight = '0px';
      }
    }
    
    if (save && newRelationship) {
      // 一時的に新しい関係性を保存（グローバル保存は行わない）
      relationshipLabel.setAttribute('data-custom-relationship', newRelationship);
      relationshipLabel.textContent = `関係性: ${newRelationship}`;
    } else {
      // キャンセルされた場合は元の表示に戻す
      await updateRelationshipLabel(composeBox, relationshipLabel);
    }
    
    // 編集コンテナを削除
    if (relationshipLabel.contains(editContainer)) {
      relationshipLabel.removeChild(editContainer);
    }
  };
  
  // ドロップダウンの変更時にカスタム入力をクリア
  select.addEventListener('change', () => {
    if (select.value) {
      customInput.value = '';
    }
  });
  
  // カスタム入力時にドロップダウンをクリア
  customInput.addEventListener('input', () => {
    if (customInput.value.trim()) {
      select.value = '';
    }
  });
  
  // IME入力状態を追跡
  let isComposing = false;
  
  // IME入力開始
  customInput.addEventListener('compositionstart', () => {
    isComposing = true;
  });
  
  // IME入力終了
  customInput.addEventListener('compositionend', () => {
    isComposing = false;
  });
  
  // Enterキーで保存（IME入力中は無視）
  const handleKeydown = (e) => {
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
  };
  
  select.addEventListener('keydown', handleKeydown);
  customInput.addEventListener('keydown', handleKeydown);
  
  // ボタンクリック
  applyButton.addEventListener('click', () => {
    finishEditing(true);
  });
  
  cancelButton.addEventListener('click', () => {
    finishEditing(false);
  });
  
  // クリック時のイベント伝播を停止
  editContainer.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  // 外部クリックで閉じる
  const handleOutsideClick = (e) => {
    if (!relationshipLabel.contains(e.target)) {
      finishEditing(true);
      document.removeEventListener('click', handleOutsideClick);
    }
  };
  
  // 少し遅らせてイベントリスナーを追加（現在のクリックイベントを回避）
  setTimeout(() => {
    document.addEventListener('click', handleOutsideClick);
  }, 100);
}

// カスタム関係性を取得する関数
function getCustomRelationship(relationshipLabel) {
  return relationshipLabel.getAttribute('data-custom-relationship') || null;
}

// 全ての関係性選択肢を取得（定型 + カスタム）
async function getAllRelationshipOptions() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: "getAllRelationshipOptions" },
      (response) => {
        if (response && response.options) {
          resolve(response.options);
        } else {
          // フォールバック：デフォルトの選択肢のみ
          resolve(['上司', '同僚', '部下', 'クライアント', 'ビジネスパートナー', '社外関係者（初対面）']);
        }
      }
    );
  });
}

// ページ読み込み完了時に拡張機能を初期化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeExtension);
} else {
  initializeExtension();
}
