// Gemini API キー（実際のキーに置き換える）
const GEMINI_API_KEY = "YOUR_GEMINI_API_KEY";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent";

// メッセージリスナーを設定
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "adjustEmail") {
    adjustEmail(request.emailContent, request.relationship)
      .then(response => sendResponse({ success: true, adjustedEmail: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // 非同期レスポンスを示す
  }
});

// Gemini APIを使ってメールを修正
async function adjustEmail(emailContent, relationship) {
  try {
    const prompt = createPrompt(emailContent, relationship);
    const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }]
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error?.message || "API呼び出し中にエラーが発生しました");
    }

    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("API呼び出しエラー:", error);
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