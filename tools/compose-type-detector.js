// Gmail Compose Type Detector
// 新規作成、返信、転送を判定するユーティリティ

/**
 * Gmailの作成画面タイプを判定
 * @param {HTMLElement} composeBox - .Am.Al.editableクラスのcompose要素
 * @returns {Object} 判定結果 { type: 'new'|'reply'|'forward', confidence: number, indicators: Object }
 */
function detectGmailComposeType(composeBox) {
  const result = {
    type: 'unknown',
    confidence: 0,
    indicators: {
      urlHash: null,
      subject: null,
      quotedText: false,
      dialogTitle: null,
      composeAction: null
    }
  };
  
  try {
    // 1. URLハッシュによる判定（最も確実）
    const urlHash = window.location.hash;
    result.indicators.urlHash = urlHash;
    
    if (urlHash.includes('reply')) {
      result.type = 'reply';
      result.confidence = 90;
      result.indicators.composeAction = 'reply';
      return result;
    }
    
    if (urlHash.includes('forward')) {
      result.type = 'forward';
      result.confidence = 90;
      result.indicators.composeAction = 'forward';
      return result;
    }
    
    if (urlHash.includes('compose')) {
      // URLに'compose'のみの場合は新規作成の可能性が高い
      result.type = 'new';
      result.confidence = 70;
      result.indicators.composeAction = 'compose';
    }
    
    // 2. ダイアログのタイトルによる判定
    const emailContainer = composeBox.closest('div[role="dialog"]') || 
                          composeBox.closest('form') || 
                          composeBox.closest('.M9');
    
    if (emailContainer && emailContainer.matches('[role="dialog"]')) {
      // ダイアログのタイトルエリアを探す
      const titleElements = [
        emailContainer.querySelector('[aria-label]'),
        emailContainer.querySelector('.aAy'),
        emailContainer.querySelector('.aoT'),
        emailContainer.querySelector('h1, h2, h3')
      ].filter(Boolean);
      
      for (const titleEl of titleElements) {
        const titleText = titleEl.textContent || titleEl.getAttribute('aria-label') || '';
        result.indicators.dialogTitle = titleText;
        
        if (titleText.includes('返信') || titleText.includes('Reply')) {
          result.type = 'reply';
          result.confidence = Math.max(result.confidence, 85);
          break;
        }
        
        if (titleText.includes('転送') || titleText.includes('Forward')) {
          result.type = 'forward';
          result.confidence = Math.max(result.confidence, 85);
          break;
        }
        
        if (titleText.includes('新規') || titleText.includes('作成') || titleText.includes('Compose')) {
          result.type = 'new';
          result.confidence = Math.max(result.confidence, 75);
          break;
        }
      }
    }
    
    // 3. 件名フィールドによる判定
    const subjectField = emailContainer?.querySelector(
      'input[name="subjectbox"], input[aria-label*="件名"], input[aria-label*="Subject"]'
    );
    
    if (subjectField) {
      const subject = subjectField.value || '';
      result.indicators.subject = subject;
      
      if (subject.startsWith('Re:')) {
        result.type = 'reply';
        result.confidence = Math.max(result.confidence, 80);
      } else if (subject.startsWith('Fwd:') || subject.startsWith('転送:')) {
        result.type = 'forward';
        result.confidence = Math.max(result.confidence, 80);
      } else if (subject === '' && result.type === 'unknown') {
        // 空の件名で他の手がかりがない場合は新規作成の可能性
        result.type = 'new';
        result.confidence = Math.max(result.confidence, 60);
      }
    }
    
    // 4. 引用テキストの存在による判定
    const quotedTextSelectors = [
      'blockquote',
      '.gmail_quote',
      '.gmail_extra',
      '.ii.gt div[dir="ltr"]', // Gmailの引用形式
      '[data-smartmail="gmail_signature"]'
    ];
    
    let hasQuotedText = false;
    for (const selector of quotedTextSelectors) {
      if (composeBox.querySelector(selector) || 
          emailContainer?.querySelector(selector)) {
        hasQuotedText = true;
        break;
      }
    }
    
    result.indicators.quotedText = hasQuotedText;
    
    if (hasQuotedText) {
      if (result.type === 'unknown' || result.confidence < 60) {
        // 引用テキストがあるが返信/転送の区別がつかない場合
        result.type = 'reply'; // デフォルトとして返信を設定
        result.confidence = Math.max(result.confidence, 70);
      } else if (result.type === 'new') {
        // 新規作成判定だったが引用テキストがある場合は再判定
        result.type = 'reply';
        result.confidence = 75;
      }
    }
    
    // 5. 最終的な信頼度調整
    if (result.confidence === 0 && result.type === 'unknown') {
      result.type = 'new'; // デフォルトは新規作成
      result.confidence = 50;
    }
    
  } catch (error) {
    console.error('Compose type detection error:', error);
    result.type = 'new';
    result.confidence = 30;
  }
  
  return result;
}

/**
 * シンプルな判定関数（真偽値のみ）
 */
const GmailComposeDetector = {
  isNew: (composeBox) => {
    const result = detectGmailComposeType(composeBox);
    return result.type === 'new' && result.confidence >= 60;
  },
  
  isReply: (composeBox) => {
    const result = detectGmailComposeType(composeBox);
    return result.type === 'reply' && result.confidence >= 60;
  },
  
  isForward: (composeBox) => {
    const result = detectGmailComposeType(composeBox);
    return result.type === 'forward' && result.confidence >= 60;
  },
  
  getType: (composeBox) => {
    const result = detectGmailComposeType(composeBox);
    return result.confidence >= 60 ? result.type : 'unknown';
  },
  
  getDetailedResult: (composeBox) => {
    return detectGmailComposeType(composeBox);
  }
};

/**
 * 判定結果に基づいてUIやロジックを分岐させる例
 */
function handleComposeByType(composeBox, callback) {
  const detection = detectGmailComposeType(composeBox);
  
  console.log(`[Compose Type] 判定結果: ${detection.type} (信頼度: ${detection.confidence}%)`, detection);
  
  const context = {
    type: detection.type,
    confidence: detection.confidence,
    isHighConfidence: detection.confidence >= 80,
    indicators: detection.indicators
  };
  
  // コールバック関数に判定結果を渡して処理を委譲
  if (typeof callback === 'function') {
    callback(context, composeBox);
  }
  
  return context;
}

/**
 * 使用例：compose typeに応じて異なるメッセージプリセットを提供
 */
function getMessagePresets(composeType) {
  const presets = {
    new: [
      'いつもお世話になっております。',
      'お疲れさまです。',
      'ご連絡いたします。'
    ],
    reply: [
      'ご連絡いただき、ありがとうございます。',
      'お返事いたします。',
      'ご質問の件について回答いたします。'
    ],
    forward: [
      '以下の件について転送いたします。',
      'ご参考までに転送いたします。',
      '関連する情報として共有いたします。'
    ]
  };
  
  return presets[composeType] || presets.new;
}

// エクスポート（ブラウザ環境での使用を想定）
if (typeof window !== 'undefined') {
  window.detectGmailComposeType = detectGmailComposeType;
  window.GmailComposeDetector = GmailComposeDetector;
  window.handleComposeByType = handleComposeByType;
  window.getMessagePresets = getMessagePresets;
}

// Node.js環境でのエクスポート（テスト用）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    detectGmailComposeType,
    GmailComposeDetector,
    handleComposeByType,
    getMessagePresets
  };
}

console.log(`
📋 Gmail Compose Type Detector が読み込まれました

主な関数:
🎯 detectGmailComposeType(composeBox) - 詳細な判定結果を取得
🔍 GmailComposeDetector.getType(composeBox) - シンプルな判定
⚡ handleComposeByType(composeBox, callback) - 判定結果に基づく処理分岐

使用例:
const result = detectGmailComposeType(composeBox);
console.log('Type:', result.type, 'Confidence:', result.confidence + '%');

handleComposeByType(composeBox, (context, box) => {
  console.log('検出されたタイプ:', context.type);
  if (context.type === 'reply') {
    // 返信専用の処理
  }
});
`);