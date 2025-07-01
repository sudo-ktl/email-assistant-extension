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

  // カスタム関係性を追加（将来的な機能拡張用）
  addCustomRelationship(id, label, description, englishStyle) {
    // 既存IDのチェック
    if (this.getRelationshipById(id)) {
      throw new Error(`Relationship with ID '${id}' already exists`);
    }

    const newRelationship = {
      id,
      label,
      description,
      englishStyle,
      custom: true
    };

    this.relationships.push(newRelationship);
    return newRelationship;
  }

  // カスタム関係性を削除（将来的な機能拡張用）
  removeCustomRelationship(id) {
    const relationship = this.getRelationshipById(id);
    if (!relationship) {
      throw new Error(`Relationship with ID '${id}' not found`);
    }
    
    if (!relationship.custom) {
      throw new Error('Cannot remove default relationships');
    }

    this.relationships = this.relationships.filter(rel => rel.id !== id);
    return true;
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