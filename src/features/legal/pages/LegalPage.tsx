/**
 * 法務文書 静的ページ (UC2) — /legal/privacy, /legal/terms,
 * /legal/specified-commercial-transactions, /legal/ai-usage で閲覧可能な公開ページ。
 *
 * doc prop で表示文書を選び、タイトル + バージョン + リード文 + 章見出しを表示する。
 * 認証不要の公開ページ (SPEC §6.1)。
 *
 * 本文プレースホルダについて (法務): 正式条文は docs/legal/*.md を SoT とする。本ページは
 * 見出し構造のみを描画し、本文は「（本文は公開前に確定）」と明示する。α 公開前に
 * 正式原稿 (react-markdown レンダリング) へ差し替える (002_legal_PLAN.md Phase 1)。
 * バインディングな法的文言をここで創作しない。
 *
 * 関連: docs/legal/001_legal_SPEC.md §1 UC2 §5.1, 002_legal_PLAN.md §1.1/§1.3
 */
import { Link } from 'react-router-dom';
import { LEGAL_DOC_BODY, type LegalDocType } from '../docs';

export type LegalDoc = LegalDocType | 'scta';

export type LegalPageProps = {
  /** 表示する文書。 */
  doc: LegalDoc;
};

/** 法務文書の静的ページ。doc に応じてメタ + 見出しを描画する。 */
export function LegalPage({ doc }: LegalPageProps) {
  const body = LEGAL_DOC_BODY[doc];
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-4 bg-white p-4 text-neutral-800">
      <div>
        <Link to="/" className="text-sm text-green-700 hover:text-green-800">
          ← 戻る
        </Link>
      </div>

      <header className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-green-700">
          {body.label} {body.version}
        </h1>
        <p className="text-sm text-neutral-600">{body.lead}</p>
      </header>

      <section aria-label="本文" className="flex flex-col gap-3">
        {body.sections.map((heading, i) => (
          <article key={heading} className="border-l-2 border-neutral-100 pl-3">
            <h2 className="text-sm font-semibold text-neutral-800">
              {i + 1}. {heading}
            </h2>
            <p className="mt-1 text-sm text-neutral-400">（本文は公開前に確定）</p>
          </article>
        ))}
      </section>
    </main>
  );
}
