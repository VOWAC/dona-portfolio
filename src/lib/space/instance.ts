/**
 * ページ内で共有する SpaceBackground のシングルトン参照。
 * Astro の各 <script> は ESM として import を共有するため、
 * カーソルやスクロールのモジュールからこの参照経由で背景を操作できる。
 */
import type { SpaceBackground } from './SpaceBackground';

let instance: SpaceBackground | null = null;
const waiters: Array<(s: SpaceBackground) => void> = [];

export function setSpaceInstance(s: SpaceBackground): void {
  instance = s;
  waiters.splice(0).forEach((cb) => cb(s));
}

export function getSpaceInstance(): SpaceBackground | null {
  return instance;
}

/** まだ初期化前でも、準備でき次第コールバックを受け取れる。 */
export function onSpaceReady(cb: (s: SpaceBackground) => void): void {
  if (instance) cb(instance);
  else waiters.push(cb);
}
