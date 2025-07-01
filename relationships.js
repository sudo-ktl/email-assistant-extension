// 関係性設定を一元管理するモジュール

// デフォルトの関係性定義
const DEFAULT_RELATIONSHIPS = [
  {
    id: 'boss',
    label: '上司',
    description: 'フォーマルで敬語',
    englishStyle: 'very formal and respectful tone, using honorific language'
  },
  {
    id: 'colleague',
    label: '同僚',
    description: '標準的なビジネス文体',
    englishStyle: 'professional and collaborative tone'
  },
  {
    id: 'subordinate',
    label: '部下',
    description: '指導的でありながら丁寧',
    englishStyle: 'supportive and encouraging tone while maintaining professionalism'
  },
  {
    id: 'client',
    label: 'クライアント',
    description: '非常にフォーマルで丁寧',
    englishStyle: 'extremely formal and polite business tone'
  },
  {
    id: 'business_partner',
    label: 'ビジネスパートナー',
    description: '協力的でプロフェッショナル',
    englishStyle: 'collaborative and professional partnership tone'
  },
  {
    id: 'external_first_contact',
    label: '社外関係者（初対面）',
    description: 'フォーマルで慎重',
    englishStyle: 'formal and cautious tone for new business contacts'
  }
];

// デフォルトの関係性タイプ
const DEFAULT_RELATIONSHIP_TYPE = 'client';

// 関係性管理クラス
class RelationshipManager {
  constructor() {
    this.relationships = [...DEFAULT_RELATIONSHIPS];
    this.defaultRelationshipType = DEFAULT_RELATIONSHIP_TYPE;
    this.loadCustomRelationships();
  }

  // カスタム関係性をChrome Storageから読み込み
  async loadCustomRelationships() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      try {
        const data = await new Promise((resolve) => {
          chrome.storage.sync.get('customRelationships', (result) => {
            resolve(result);
          });
        });
        
        if (data.customRelationships) {
          // 既存のカスタム関係性を削除してから追加
          this.relationships = this.relationships.filter(rel => !rel.custom);
          this.relationships.push(...data.customRelationships);
        }
      } catch (error) {
        console.error('カスタム関係性の読み込みエラー:', error);
      }
    }
  }

  // カスタム関係性をChrome Storageに保存
  async saveCustomRelationships() {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      try {
        const customRelationships = this.relationships.filter(rel => rel.custom);
        await new Promise((resolve) => {
          chrome.storage.sync.set({ customRelationships }, () => {
            resolve();
          });
        });
      } catch (error) {
        console.error('カスタム関係性の保存エラー:', error);
      }
    }
  }

  // 全ての関係性を取得
  getAllRelationships() {
    return this.relationships;
  }

  // 関係性をIDで取得
  getRelationshipById(id) {
    return this.relationships.find(rel => rel.id === id);
  }

  // 関係性の表示用ラベル（説明付き）を取得
  getDisplayLabel(id) {
    const relationship = this.getRelationshipById(id);
    return relationship ? `${relationship.label}（${relationship.description}）` : id;
  }

  // デフォルトの関係性タイプを取得
  getDefaultRelationshipType() {
    return this.defaultRelationshipType;
  }

  // 英語スタイルを取得（background.jsで使用）
  getEnglishStyle(relationshipType) {
    const relationship = this.getRelationshipById(relationshipType);
    return relationship ? relationship.englishStyle : 'professional business tone';
  }

  // カスタム関係性を追加
  addCustomRelationship(label, description, englishStyle = null) {
    // IDを生成（ラベルをベースに）
    const id = 'custom_' + label.replace(/[^a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '').toLowerCase();
    
    // 既存ラベルのチェック（重複防止）
    if (this.relationships.some(rel => rel.label === label)) {
      return this.getRelationshipByLabel(label);
    }

    const newRelationship = {
      id,
      label,
      description: description || `カスタム関係性：${label}`,
      englishStyle: englishStyle || `professional tone appropriate for ${label}`,
      custom: true
    };

    this.relationships.push(newRelationship);
    this.saveCustomRelationships();
    return newRelationship;
  }

  // ラベルで関係性を取得
  getRelationshipByLabel(label) {
    return this.relationships.find(rel => rel.label === label);
  }

  // カスタム関係性を削除
  removeCustomRelationship(id) {
    const relationship = this.getRelationshipById(id);
    if (!relationship) {
      throw new Error(`Relationship with ID '${id}' not found`);
    }
    
    if (!relationship.custom) {
      throw new Error('Cannot remove default relationships');
    }

    this.relationships = this.relationships.filter(rel => rel.id !== id);
    this.saveCustomRelationships();
    return true;
  }

  // カスタム関係性のみを取得
  getCustomRelationships() {
    return this.relationships.filter(rel => rel.custom);
  }

  // HTMLの選択肢要素を生成
  generateSelectOptions(selectedValue = null) {
    return this.relationships.map(rel => {
      const selected = selectedValue === rel.id ? ' selected' : '';
      return `<option value="${rel.id}"${selected}>${this.getDisplayLabel(rel.id)}</option>`;
    }).join('');
  }
}

// シングルトンインスタンス
const relationshipManager = new RelationshipManager();

// ブラウザ環境での使用（グローバル変数として公開）
if (typeof window !== 'undefined') {
  window.RelationshipManager = relationshipManager;
}

// Node.js環境での使用（エクスポート）
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    RelationshipManager,
    relationshipManager,
    DEFAULT_RELATIONSHIPS,
    DEFAULT_RELATIONSHIP_TYPE
  };
}