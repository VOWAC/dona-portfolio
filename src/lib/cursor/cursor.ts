/**
 * マウスに追従する星型カスタムカーソル。
 * - GSAP quickTo で芯（即応）とリング（遅延）を別速度で追従させ、彗星のような尾を演出
 * - リンク/ボタン上ではリングが膨らむ
 * - 同時にポインタ正規化座標を星空背景へ渡し、カメラ視差を生む
 * - タッチ主体のデバイスでは無効化
 */
import { gsap } from 'gsap';
import { onSpaceReady } from '@lib/space/instance';
import type { SpaceBackground } from '@lib/space/SpaceBackground';

export function initCursor(): void {
  const finePointer = window.matchMedia?.('(pointer: fine)').matches ?? true;
  if (!finePointer) return;

  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  const core = document.createElement('div');
  core.className = 'cursor-core';
  document.body.append(ring, core);
  document.body.classList.add('has-custom-cursor');

  // 要素の中心をカーソル位置に合わせる（以後 x/y は中心基準で動く）
  gsap.set([ring, core], { xPercent: -50, yPercent: -50, autoAlpha: 0 });

  // 芯は素早く、リングはゆったり追従
  const coreX = gsap.quickTo(core, 'x', { duration: 0.12, ease: 'power3' });
  const coreY = gsap.quickTo(core, 'y', { duration: 0.12, ease: 'power3' });
  const ringX = gsap.quickTo(ring, 'x', { duration: 0.5, ease: 'power3' });
  const ringY = gsap.quickTo(ring, 'y', { duration: 0.5, ease: 'power3' });

  let space: SpaceBackground | null = null;
  onSpaceReady((s) => (space = s));

  let visible = false;
  const onMove = (e: PointerEvent) => {
    if (!visible) {
      visible = true;
      gsap.to([ring, core], { autoAlpha: 1, duration: 0.3 });
    }
    coreX(e.clientX);
    coreY(e.clientY);
    ringX(e.clientX);
    ringY(e.clientY);

    // 画面中心を 0 とした -1..1 の正規化座標を背景へ
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = -((e.clientY / window.innerHeight) * 2 - 1);
    space?.setPointer(nx, ny);
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('pointerout', (e) => {
    if (!e.relatedTarget) {
      visible = false;
      gsap.to([ring, core], { autoAlpha: 0, duration: 0.3 });
    }
  });

  // インタラクティブ要素でリングを拡大
  const interactive = 'a, button, [role="button"], input, .interactive';
  document.addEventListener('pointerover', (e) => {
    if ((e.target as Element)?.closest?.(interactive)) {
      ring.classList.add('is-hover');
    }
  });
  document.addEventListener('pointerout', (e) => {
    if ((e.target as Element)?.closest?.(interactive)) {
      ring.classList.remove('is-hover');
    }
  });

  // クリックの波紋
  window.addEventListener('pointerdown', () => ring.classList.add('is-down'));
  window.addEventListener('pointerup', () => ring.classList.remove('is-down'));
}
