# Email Assistant Extension

Gmail上でメール文を関係性に応じて自動調整・英訳するChrome拡張機能

## 使い方

1. **初期設定**
   - Chrome拡張機能の設定画面でGemini APIキーを設定
   - 必要に応じて関係性を事前登録

2. **メール作成時**
   - Gmailでメール作成
   - 関係性ラベルをクリックして関係性を確認・編集
   - 「メール調整」または「英訳」ボタンをクリック
   - 結果を確認して適用

## 機能

- メール文の関係性ベース調整
- 英訳機能  
- 関係性ラベルのインライン編集（クリックで編集可能）
- 日本語IME対応

## 使用技術

- Chrome Extension (Manifest V3)
- Google Gemini API
- JavaScript
- Gmail DOM操作