/**
 * 発見詳細 container (revise_001) — `/notebook/:id` の app 層配線。
 *
 * useParams(:id) + useNotebook 一覧から discovery を検索 ([論点-001]: 専用 endpoint でなく一覧流用)。
 * 画像は getSignedUrl で署名付き URL を解決して DiscoveryDetailPage に注入。未 sign-in / 未発見 / 取得中を分岐。
 *
 * 関連: pages/DiscoveryDetailPage.tsx, hooks.ts (useNotebook), src/shared/storage/fetch.ts
 */
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useNotebook } from './hooks';
import { DiscoveryDetailPage } from './pages/DiscoveryDetailPage';
import { useAuthToken } from '../../app/useAuthToken';
import { getSignedUrl } from '../../shared/storage/fetch';

export type DiscoveryDetailContainerProps = {
  /** テスト用にトークンを明示注入する (省略時は useAuthToken)。 */
  token?: string | null;
};

function AuthedDetail({ token, id, onBack }: { token: string; id: string; onBack: () => void }) {
  const { discoveries, loading } = useNotebook({ token });
  const discovery = discoveries.find((d) => d.id === id) ?? null;
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const key = discovery?.imageObjectKey;
    if (!key) return;
    void getSignedUrl(key, { token })
      .then((u) => {
        if (active) setImageUrl(u);
      })
      .catch(() => {
        /* 失敗はプレースホルダ */
      });
    return () => {
      active = false;
    };
  }, [discovery?.imageObjectKey, token]);

  return (
    <DiscoveryDetailPage
      discovery={discovery}
      imageUrl={imageUrl}
      loading={loading}
      onBack={onBack}
    />
  );
}

export function DiscoveryDetailContainer({ token: injectedToken }: DiscoveryDetailContainerProps = {}) {
  const auth = useAuthToken();
  const navigate = useNavigate();
  const { id } = useParams();
  const token = injectedToken !== undefined ? injectedToken : auth.token;
  const onBack = () => navigate('/notebook');

  if (!token || !id) {
    return <DiscoveryDetailPage discovery={null} onBack={onBack} />;
  }
  return <AuthedDetail token={token} id={id} onBack={onBack} />;
}
