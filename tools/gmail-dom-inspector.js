// Gmail DOM構造調査ツール
// コンソールで実行してGmailの新規作成画面と返信画面の違いを調査

window.GmailDOMInspector = {
  
  // 現在のcompose boxの詳細情報を取得
  inspectCurrentCompose: function() {
    const composeBoxes = document.querySelectorAll('.Am.Al.editable');
    
    if (composeBoxes.length === 0) {
      console.log('❌ compose boxが見つかりません');
      return null;
    }

    const results = Array.from(composeBoxes).map((composeBox, index) => {
      console.log(`\n🔍 Compose Box #${index + 1} の詳細分析:`);
      
      // 基本情報
      const basicInfo = {
        element: composeBox,
        className: composeBox.className,
        id: composeBox.id,
        tagName: composeBox.tagName
      };
      
      console.log('📋 基本情報:', basicInfo);
      
      // 親要素の階層を調査
      const parentHierarchy = this.getParentHierarchy(composeBox, 10);
      console.log('🏗️ 親要素の階層:');
      parentHierarchy.forEach((parent, level) => {
        console.log(`  ${level}: <${parent.tagName}> ${parent.className ? `.${parent.className.split(' ').join('.')}` : ''} ${parent.id ? `#${parent.id}` : ''}`);
        
        // 特定の属性をチェック
        const attributes = ['role', 'aria-label', 'data-*', 'jsaction'];
        attributes.forEach(attr => {
          if (attr === 'data-*') {
            // data-*属性をすべて取得
            Array.from(parent.attributes).forEach(attribute => {
              if (attribute.name.startsWith('data-')) {
                console.log(`    📝 ${attribute.name}: ${attribute.value}`);
              }
            });
          } else {
            const value = parent.getAttribute(attr);
            if (value) {
              console.log(`    📝 ${attr}: ${value}`);
            }
          }
        });
      });
      
      // ダイアログかどうかの判定
      const dialogContainer = composeBox.closest('div[role="dialog"]');
      const formContainer = composeBox.closest('form');
      const m9Container = composeBox.closest('.M9');
      
      console.log('🗨️ コンテナ情報:');
      console.log('  - Dialog container:', !!dialogContainer);
      console.log('  - Form container:', !!formContainer);
      console.log('  - M9 container:', !!m9Container);
      
      if (dialogContainer) {
        console.log('  📋 Dialog詳細:', {
          className: dialogContainer.className,
          id: dialogContainer.id,
          'aria-label': dialogContainer.getAttribute('aria-label'),
          'aria-labelledby': dialogContainer.getAttribute('aria-labelledby')
        });
        
        // ダイアログのタイトルを探す
        const titleElements = dialogContainer.querySelectorAll('[aria-label], h1, h2, h3, .aAy, .aoT');
        console.log('  🏷️ タイトル候補:');
        titleElements.forEach((el, i) => {
          if (el.textContent.trim()) {
            console.log(`    ${i}: "${el.textContent.trim()}" (${el.tagName}.${el.className || 'no-class'})`);
          }
        });
      }
      
      // 宛先フィールドの情報
      const emailContainer = dialogContainer || formContainer || m9Container;
      if (emailContainer) {
        console.log('📧 宛先フィールド分析:');
        
        // 宛先入力フィールドを探す
        const toSelectors = [
          'input[aria-label*="To"]',
          'input[aria-label*="宛先"]',
          'input[name="to"]',
          'div[role="textbox"][aria-label*="宛先"]',
          'div[role="textbox"][aria-label*="To"]'
        ];
        
        toSelectors.forEach(selector => {
          const elements = emailContainer.querySelectorAll(selector);
          if (elements.length > 0) {
            console.log(`  ✅ ${selector}: ${elements.length}個見つかりました`);
            elements.forEach((el, i) => {
              console.log(`    [${i}] value: "${el.value || ''}", textContent: "${el.textContent || ''}", placeholder: "${el.placeholder || ''}"`);
            });
          }
        });
      }
      
      // 返信/転送判定のための特徴を探す
      console.log('🔄 返信/転送判定のヒント:');
      
      // 件名フィールドの内容をチェック
      const subjectField = emailContainer?.querySelector('input[name="subjectbox"], input[aria-label*="件名"], input[aria-label*="Subject"]');
      if (subjectField) {
        const subjectValue = subjectField.value || '';
        console.log(`  📝 件名: "${subjectValue}"`);
        console.log(`  🔍 Re:判定: ${subjectValue.startsWith('Re:') ? '✅返信' : '❌新規'}`);
        console.log(`  🔍 Fwd:判定: ${subjectValue.startsWith('Fwd:') || subjectValue.startsWith('転送:') ? '✅転送' : '❌転送ではない'}`);
      }
      
      // 引用テキストの存在チェック
      const quotedText = composeBox.querySelector('blockquote, .gmail_quote, .gmail_extra');
      console.log(`  💬 引用テキスト: ${quotedText ? '✅あり' : '❌なし'}`);
      
      // 送信ボタンの近くに返信/転送のヒントがあるかチェック
      const sendButtonArea = emailContainer?.querySelector('[role="button"][aria-label*="送信"], [role="button"][aria-label*="Send"]');
      if (sendButtonArea) {
        const sendButtonContainer = sendButtonArea.closest('div');
        console.log('  📤 送信ボタン周辺の情報:', sendButtonContainer?.textContent);
      }
      
      // URLパラメータから情報を取得
      const urlParams = new URLSearchParams(window.location.search);
      const urlHash = window.location.hash;
      console.log('  🌐 URL情報:');
      console.log(`    Hash: ${urlHash}`);
      console.log(`    Compose parameter: ${urlParams.get('compose')}`);
      
      // Gmailの内部データ構造を探す（存在する場合）
      if (window.gmail && window.gmail.check && window.gmail.check.is_inside_email) {
        console.log('  📊 Gmail API情報: 利用可能');
      }
      
      return {
        index,
        composeBox,
        basicInfo,
        parentHierarchy,
        containers: {
          dialog: !!dialogContainer,
          form: !!formContainer,
          m9: !!m9Container
        },
        subjectValue: subjectField?.value || '',
        hasQuotedText: !!quotedText,
        urlInfo: {
          hash: urlHash,
          params: Object.fromEntries(urlParams)
        }
      };
    });
    
    return results;
  },
  
  // 親要素の階層を取得
  getParentHierarchy: function(element, maxLevels = 10) {
    const hierarchy = [];
    let current = element.parentElement;
    let level = 0;
    
    while (current && level < maxLevels && current !== document.body) {
      hierarchy.push(current);
      current = current.parentElement;
      level++;
    }
    
    return hierarchy;
  },
  
  // 新規作成と返信の判定ロジックをテスト
  detectComposeType: function() {
    const results = this.inspectCurrentCompose();
    if (!results || results.length === 0) return;
    
    console.log('\n🎯 Compose Type 判定結果:');
    
    results.forEach((result, index) => {
      console.log(`\n📝 Compose Box #${index + 1}:`);
      
      const indicators = {
        isReply: false,
        isForward: false,
        isNew: false,
        confidence: 0
      };
      
      // 件名による判定
      if (result.subjectValue.startsWith('Re:')) {
        indicators.isReply = true;
        indicators.confidence += 40;
        console.log('  ✅ 件名に"Re:"が含まれている (返信の可能性: +40%)');
      }
      
      if (result.subjectValue.startsWith('Fwd:') || result.subjectValue.startsWith('転送:')) {
        indicators.isForward = true;
        indicators.confidence += 40;
        console.log('  ✅ 件名に転送マーカーが含まれている (転送の可能性: +40%)');
      }
      
      // 引用テキストによる判定
      if (result.hasQuotedText) {
        indicators.isReply = true;
        indicators.confidence += 30;
        console.log('  ✅ 引用テキストが存在 (返信/転送の可能性: +30%)');
      }
      
      // URLハッシュによる判定
      if (result.urlInfo.hash.includes('compose')) {
        if (result.urlInfo.hash.includes('reply')) {
          indicators.isReply = true;
          indicators.confidence += 50;
          console.log('  ✅ URLに"reply"が含まれている (返信の可能性: +50%)');
        } else if (result.urlInfo.hash.includes('forward')) {
          indicators.isForward = true;
          indicators.confidence += 50;
          console.log('  ✅ URLに"forward"が含まれている (転送の可能性: +50%)');
        } else {
          indicators.isNew = true;
          indicators.confidence += 30;
          console.log('  ✅ URLに"compose"のみ含まれている (新規の可能性: +30%)');
        }
      }
      
      // 最終判定
      let finalType = 'unknown';
      if (indicators.isReply && indicators.confidence >= 50) {
        finalType = 'reply';
      } else if (indicators.isForward && indicators.confidence >= 50) {
        finalType = 'forward';
      } else if (indicators.isNew && indicators.confidence >= 30) {
        finalType = 'new';
      }
      
      console.log(`\n🎯 最終判定: ${finalType} (信頼度: ${indicators.confidence}%)`);
      
      // 判定用の実装可能なJavaScriptコードを提案
      console.log('\n💻 実装用コード例:');
      console.log(`
function detectGmailComposeType(composeBox) {
  // 1. URLハッシュによる判定（最も確実）
  const urlHash = window.location.hash;
  if (urlHash.includes('reply')) return 'reply';
  if (urlHash.includes('forward')) return 'forward';
  if (urlHash.includes('compose')) return 'new';
  
  // 2. 件名による判定
  const emailContainer = composeBox.closest('div[role="dialog"]') || composeBox.closest('form') || composeBox.closest('.M9');
  const subjectField = emailContainer?.querySelector('input[name="subjectbox"], input[aria-label*="件名"], input[aria-label*="Subject"]');
  if (subjectField) {
    const subject = subjectField.value || '';
    if (subject.startsWith('Re:')) return 'reply';
    if (subject.startsWith('Fwd:') || subject.startsWith('転送:')) return 'forward';
  }
  
  // 3. 引用テキストの存在による判定
  const quotedText = composeBox.querySelector('blockquote, .gmail_quote, .gmail_extra');
  if (quotedText) return 'reply_or_forward';
  
  // 4. デフォルトは新規作成
  return 'new';
}
      `);
    });
  },
  
  // 一定間隔でcompose boxを監視
  startMonitoring: function(intervalSeconds = 5) {
    console.log(`🔄 ${intervalSeconds}秒間隔でCompose Box監視を開始...`);
    
    const monitoringInterval = setInterval(() => {
      console.log('\n' + '='.repeat(50));
      console.log('🕒 定期監視: ' + new Date().toLocaleTimeString());
      
      const composeBoxes = document.querySelectorAll('.Am.Al.editable');
      if (composeBoxes.length > 0) {
        console.log(`📝 ${composeBoxes.length}個のCompose Boxを検出`);
        this.detectComposeType();
      } else {
        console.log('❌ Compose Boxが見つかりません');
      }
    }, intervalSeconds * 1000);
    
    // 停止用の関数を返す
    return {
      stop: () => {
        clearInterval(monitoringInterval);
        console.log('⏹️ 監視を停止しました');
      }
    };
  }
};

// 使用方法をコンソールに表示
console.log(`
🛠️ Gmail DOM Inspector が利用可能になりました！

使用方法:
1. 新規作成画面または返信画面を開く
2. コンソールで以下のコマンドを実行:

📋 詳細分析:
GmailDOMInspector.inspectCurrentCompose()

🎯 Compose Type判定:
GmailDOMInspector.detectComposeType()

🔄 継続監視 (5秒間隔):
const monitor = GmailDOMInspector.startMonitoring()
// 停止するには: monitor.stop()

💡 ヒント:
- 新規作成、返信、転送のそれぞれで実行して違いを比較してください
- URLハッシュ、件名、引用テキストの違いに注目してください
`);