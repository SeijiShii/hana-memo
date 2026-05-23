// 位置情報ヘルパ ([論点-004] ~100m 丸めデフォルト、プライバシー保護)
// 関連: docs/_shared/helpers/001_helpers_SPEC.md §1.3, concept §3 NFR プライバシー

export type LatLng = { lat: number; lng: number };
export type CoarseLatLng = { lat: number; lng: number; precision_m: number };

const EARTH_RADIUS_M = 6_371_000;

/** ~precisionMeters 単位に座標を丸める (緯度経度方向で別計算) */
export function roundLocation(
  lat: number,
  lng: number,
  precisionMeters = 100,
): CoarseLatLng {
  if (typeof precisionMeters !== 'number' || precisionMeters <= 0) {
    throw new TypeError('precisionMeters must be > 0');
  }
  // 緯度 1 度 ≒ 111_320m
  const latStep = precisionMeters / 111_320;
  // 経度 1 度 ≒ 111_320 × cos(lat)
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const lngStep =
    cosLat === 0 ? Number.POSITIVE_INFINITY : precisionMeters / (111_320 * Math.abs(cosLat));
  return {
    lat: Math.round(lat / latStep) * latStep,
    lng: Math.round(lng / lngStep) * lngStep,
    precision_m: precisionMeters,
  };
}

/** Haversine 距離 (メートル) */
export function haversineDistance(a: LatLng, b: LatLng): number {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.asin(Math.min(1, Math.sqrt(h)));
  return EARTH_RADIUS_M * c;
}

/** navigator.geolocation ラッパ。未許可 / エラーで null */
export async function getCurrentLocation(): Promise<LatLng | null> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) return null;
  return new Promise<LatLng | null>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 10_000, enableHighAccuracy: false },
    );
  });
}
