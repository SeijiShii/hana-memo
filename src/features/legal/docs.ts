/**
 * 法務文書のメタデータ + 静的本文プレースホルダ (presentation 用、UI 非依存の定数モジュール)。
 *
 * - LEGAL_DOC_META: doc_type ごとのタイトル / ルートパス / バージョン (versions.ts の SoT を参照)。
 *   ConsentCheckbox / ConsentGate / LegalPage が共通で参照する。
 * - LEGAL_DOC_BODY: 静的ページ (/legal/*) に表示する本文のリード文 + セクション見出し。
 *
 * NOTE (法務): 本モジュールの本文は **公開前に確定する正式原稿の代替プレースホルダ**である。
 * 法的拘束力を持つ条文は docs/legal/{privacy_policy,terms_of_service,...}.md を SoT とし、
 * α 公開前に法務知見者レビューの上で確定・配線する (002_legal_PLAN.md §1.2 / Phase 1 で
 * react-markdown による原稿レンダリングに差し替える想定)。ここではバインディングな法的文言を
 * 創作せず、SPEC/原稿の見出し構造のみを反映し、本文は「（本文は公開前に確定）」と明示する。
 *
 * 関連: docs/legal/001_legal_SPEC.md §1 UC2 §3, 002_legal_PLAN.md §1.1/§1.2,
 *       docs/legal/{privacy_policy,terms_of_service,specified_commercial_transactions,ai_usage_consent}.md
 */
import type { DocType } from '../../shared/types/domain';
import { LATEST_VERSIONS } from './versions';

/** 静的ページ閲覧対象 (cookie_policy は [論点-005] 未導入のため除外)。 */
export type LegalDocType = Exclude<DocType, 'cookie_policy'>;

/** 静的ページのルートパス型 (App.tsx のルートと一致させる)。 */
export type LegalDocPath =
  | '/legal/privacy'
  | '/legal/terms'
  | '/legal/specified-commercial-transactions'
  | '/legal/ai-usage';

export type LegalDocMeta = {
  /** 画面表示用のタイトル。 */
  label: string;
  /** 静的ページのルートパス (閲覧ページがない doc は null)。 */
  path: LegalDocPath | null;
  /** 現行バージョン (versions.ts LATEST_VERSIONS が SoT、null は未導入)。 */
  version: string | null;
};

/** doc_type → 表示メタ。version は LATEST_VERSIONS を参照 (重複定義しない)。 */
export const LEGAL_DOC_META: Record<DocType, LegalDocMeta> = {
  privacy_policy: { label: 'プライバシーポリシー', path: '/legal/privacy', version: LATEST_VERSIONS.privacy_policy },
  terms_of_service: { label: '利用規約', path: '/legal/terms', version: LATEST_VERSIONS.terms_of_service },
  ai_usage: { label: 'AI 利用同意', path: '/legal/ai-usage', version: LATEST_VERSIONS.ai_usage },
  cookie_policy: { label: 'Cookie ポリシー', path: null, version: LATEST_VERSIONS.cookie_policy },
};

/** 特商法表記は同意対象 doc_type ではないが静的ページとして閲覧可能 (UC2)。 */
export const SCTA_META: { label: string; path: LegalDocPath; version: string } = {
  label: '特定商取引法に基づく表記',
  path: '/legal/specified-commercial-transactions',
  version: 'v1.0.0',
};

export type LegalDocBody = {
  label: string;
  version: string;
  /** リード文 (1 段落)。 */
  lead: string;
  /** 本文のセクション見出し (原稿 .md の章立てに対応、本文は公開前確定)。 */
  sections: string[];
};

/**
 * 静的ページ本文 (プレースホルダ)。見出しは docs/legal/*.md の章立てに対応する。
 * 本文確定までは LegalPage が各見出しに「（本文は公開前に確定）」を表示する。
 */
export const LEGAL_DOC_BODY: Record<LegalDocType | 'scta', LegalDocBody> = {
  privacy_policy: {
    label: 'プライバシーポリシー',
    version: LATEST_VERSIONS.privacy_policy ?? 'v1.0.0',
    lead: '本サービスが取得・利用する個人情報の取扱いについて定めます。',
    sections: [
      'はじめに',
      '取得する情報',
      '利用目的',
      '第三者提供（AI 識別委託 / 画像保存 / エラー監視 opt-in / 決済処理）',
      'エラー監視（Sentry）への送信前 PII スクラブ',
      '越境移転',
      'データ保存期間',
      'ユーザーの権利',
      'Cookie 等の利用',
      '子どもの利用',
      '改訂',
      'お問い合わせ',
    ],
  },
  terms_of_service: {
    label: '利用規約',
    version: LATEST_VERSIONS.terms_of_service ?? 'v1.0.0',
    lead: '本サービスの利用条件を定めます。',
    sections: [
      '適用',
      '利用登録',
      '禁止事項',
      '本サービスの提供の停止等',
      '著作権',
      '有料機能',
      '返金',
      '免責',
      'サービス変更・終了',
      '準拠法・裁判管轄',
      '改訂',
    ],
  },
  ai_usage: {
    label: 'AI 利用に関する同意事項',
    version: LATEST_VERSIONS.ai_usage ?? 'v1.0.0',
    lead: '植物識別における AI (OpenAI Vision API) の利用について定めます。',
    sections: [
      '利用する AI サービス',
      '送信されるデータ',
      'OpenAI 社のデータ取扱い',
      '識別結果の性質',
      '利用回数制限',
      '同意の撤回',
      '改訂',
    ],
  },
  scta: {
    label: '特定商取引法に基づく表記',
    version: SCTA_META.version,
    lead: '特定商取引法に基づく事業者情報を表記します。',
    sections: [
      '販売事業者 / 所在地 / 連絡先 / 運営責任者',
      '販売価格 / 商品代金以外の必要料金',
      '引渡時期 / 支払方法 / 支払時期',
      '返品・キャンセル / 動作環境',
    ],
  },
};
