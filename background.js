// relationships.jsをインポート
importScripts('relationships.js');

// 最新のGemini API URL
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent";
let apiKey = null;

// デバッグ用のログ関数
function logDebug(message) {
  console.log(`[Email Assistant Debug] ${message}`);
}

// 起動時にAPIキーを読み込む
function initApiKey() {
  logDebug("APIキーの初期化を開始します");
  chrome.storage.sync.get('geminiApiKey', (data) => {
    if (data && data.geminiApiKey) {
      apiKey = data.geminiApiKey;
      logDebug("APIキーを読み込みました: " + apiKey.substring(0, 3) + "***");
    } else {
      logDebug("保存されたAPIキーが見つかりませんでした");
      apiKey = null;
    }
  });
}

// 初期化を実行
initApiKey();

// APIキーを設定する関数
function setApiKey(key) {
  logDebug("APIキーを設定します");
  apiKey = key;
  return new Promise((resolve, reject) => {
    chrome.storage.sync.set({ geminiApiKey: key }, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        logDebug("APIキーの保存中にエラーが発生しました: " + error.message);
        reject(error);
      } else {
        logDebug("APIキーを正常に保存しました");
        resolve();
      }
    });
  });
}

// メッセージリスナーを設定
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  logDebug(`受信したメッセージ: ${request.action}`);
  
  if (request.action === "adjustEmail") {
    if (!apiKey) {
      logDebug("APIキーが設定されていません");
      sendResponse({ 
        success: false, 
        error: "APIキーが設定されていません。オプション画面で設定してください。" 
      });
      return true;
    }
    
    logDebug("メール調整を開始します");
    adjustEmail(request.emailContent, request.relationship)
      .then(response => {
        logDebug("メール調整が成功しました");
        sendResponse({ success: true, adjustedEmail: response });
      })
      .catch(error => {
        logDebug("メール調整中にエラーが発生しました: " + error.message);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 非同期レスポンスを示す
  }
  
  if (request.action === "translateEmail") {
    if (!apiKey) {
      logDebug("APIキーが設定されていません");
      sendResponse({ 
        success: false, 
        error: "APIキーが設定されていません。オプション画面で設定してください。" 
      });
      return true;
    }
    
    logDebug("メール英訳を開始します");
    translateEmail(request.emailContent, request.relationship)
      .then(response => {
        logDebug("メール英訳が成功しました");
        sendResponse({ success: true, translatedEmail: response });
      })
      .catch(error => {
        logDebug("メール英訳中にエラーが発生しました: " + error.message);
        sendResponse({ success: false, error: error.message });
      });
    return true; // 非同期レスポンスを示す
  }
  
  if (request.action === "setApiKey") {
    logDebug("APIキー設定リクエストを受信しました");
    setApiKey(request.apiKey)
      .then(() => {
        sendResponse({ success: true });
      })
      .catch(error => {
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  
  if (request.action === "getApiKey") {
    logDebug("APIキー取得リクエストを受信しました");
    // 念のためもう一度ストレージから直接読み込む
    chrome.storage.sync.get('geminiApiKey', (data) => {
      if (data && data.geminiApiKey) {
        apiKey = data.geminiApiKey;
        logDebug("ストレージからAPIキーを再読み込みしました");
      }
      sendResponse({ apiKey: apiKey });
    });
    return true;
  }
  
  if (request.action === "getRelationship") {
    logDebug("関係性取得リクエストを受信しました: " + request.email);
    chrome.storage.sync.get(['relationships', 'defaultRelationship'], (data) => {
      const relationships = data.relationships || [];
      const defaultRelationship = data.defaultRelationship || relationshipManager.getDefaultRelationshipType();
      
      logDebug("保存されている関係性: " + JSON.stringify(relationships));
      
      // 登録されている関係性を検索
      const relationship = relationships.find(r => r.email === request.email);
      
      if (relationship) {
        // カスタム関係性の場合は説明文を、それ以外は関係性タイプを返す
        const relationshipText = relationship.type === 'custom' 
          ? relationship.customDescription 
          : relationshipManager.getDisplayLabel(relationship.type);
        logDebug("関係性が見つかりました: " + relationshipText);
        sendResponse({ relationship: relationshipText });
      } else {
        // 登録されていない場合はデフォルト関係性を返す
        logDebug("関係性が見つからないため、デフォルトを使用: " + defaultRelationship);
        sendResponse({ relationship: defaultRelationship });
      }
    });
    return true;
  }
  
  if (request.action === "saveCustomRelationship") {
    logDebug("カスタム関係性保存リクエストを受信しました: " + request.label);
    try {
      // relationshipManagerを使用してカスタム関係性を追加
      const relationship = relationshipManager.addCustomRelationship(request.label);
      logDebug("カスタム関係性を保存しました: " + JSON.stringify(relationship));
      sendResponse({ success: true, relationship: relationship });
    } catch (error) {
      logDebug("カスタム関係性の保存に失敗しました: " + error.message);
      sendResponse({ success: false, error: error.message });
    }
    return true;
  }
  
  // その他のメッセージに対するレスポンス
  logDebug("未知のメッセージアクション: " + request.action);
  return false;
});

// Gemini APIを使ってメールを修正
async function adjustEmail(emailContent, relationship) {
  logDebug("Gemini APIを呼び出します");
  try {
    const prompt = createPrompt(emailContent, relationship);
    logDebug("プロンプトを作成しました");
    
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1000
        }
      })
    });

    logDebug("APIレスポンスを受信しました: " + response.status);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || "API呼び出し中にエラーが発生しました");
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    logDebug("API呼び出しエラー: " + error.message);
    throw error;
  }
}

// Gemini APIを使ってメールを英訳
async function translateEmail(emailContent, relationship) {
  logDebug("Gemini APIを呼び出します（英訳）");
  try {
    const prompt = createTranslationPrompt(emailContent, relationship);
    logDebug("英訳プロンプトを作成しました");
    
    const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1000
        }
      })
    });

    logDebug("APIレスポンスを受信しました（英訳）: " + response.status);
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || "API呼び出し中にエラーが発生しました");
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    logDebug("英訳API呼び出しエラー: " + error.message);
    throw error;
  }
}

// 関係性に基づいたプロンプトを作成
function createPrompt(emailContent, relationship) {
  return `
以下のメール本文を、「${relationship}」との関係性に適した日本語の文体に修正してください。
元のメッセージの意図や内容は保持しつつ、関係性に合わせた適切な敬語や表現に調整してください。
修正後のメール本文のみを返してください。

メール本文:
${emailContent}
  `;
}

// 関係性に基づいた英訳プロンプトを作成
// 関係性タイプIDから英語スタイルを取得
function getEnglishStyleForRelationship(relationship) {
  // 関係性ラベルからIDを推定
  const allRelationships = relationshipManager.getAllRelationships();
  const matchedRelationship = allRelationships.find(rel => 
    relationshipManager.getDisplayLabel(rel.id) === relationship || rel.label === relationship
  );
  
  if (matchedRelationship) {
    return relationshipManager.getEnglishStyle(matchedRelationship.id);
  } else {
    // カスタム関係性の場合
    return `professional English appropriate for the relationship: ${relationship}`;
  }
}

function createTranslationPrompt(emailContent, relationship) {
  const styleInstruction = getEnglishStyleForRelationship(relationship);
  
  return `
以下の日本語メール本文を、「${relationship}」との関係性に適した英語に翻訳してください。
${styleInstruction}を使用してください。
元のメッセージの意図や内容は保持しつつ、関係性に合わせた適切な英語表現に翻訳してください。
翻訳後の英語メール本文のみを返してください。

日本語メール本文:
${emailContent}
  `;
}

// 拡張機能のインストール/更新時に実行
chrome.runtime.onInstalled.addListener((details) => {
  logDebug("拡張機能がインストール/更新されました: " + details.reason);
  initApiKey();
});
