/**
 * マウス位置に応じて DOM 要素を視差移動させる軽量パララックス。
 *
 * 対象要素に data-parallax="<depth>" を付けると、その depth(px) ぶん
 * マウスと逆方向に滑らかに動く。手前/奥の演出に使う。
 *
 *   <img data-parallax="40" />   ... 大きく動く（手前に感じる）
 *   <h1  data-parallax="12" />   ... 少し動く（奥に感じる）
 *
 * 内部で gsap の transform(x/y) を使うため、対象要素自身には
 * CSS transform を併用しないこと（位置調整は親要素側で行う）。
 * GSAP quickTo でフレーム補間し、prefers-reduced-motion では無効化。
 */
import { gsap } from 'gsap';

interface Target {
  setX: (v: number) => void;
  setY: (v: number) => void;
  depth: number;
}

export function initPointerParallax(root: ParentNode = document): void {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  const els = Array.from(root.querySelectorAll<HTMLElement>('[data-parallax]'));
  if (els.length === 0) return;

  const targets: Target[] = els.map((el) => ({
    depth: parseFloat(el.dataset.parallax ?? '0'),
    setX: gsap.quickTo(el, 'x', { duration: 0.9, ease: 'power2.out' }),
    setY: gsap.quickTo(el, 'y', { duration: 0.9, ease: 'power2.out' }),
  }));

  const onMove = (e: PointerEvent) => {
    const nx = (e.clientX / window.innerWidth) * 2 - 1; // -1..1
    const ny = (e.clientY / window.innerHeight) * 2 - 1;
    for (const t of targets) {
      t.setX(-nx * t.depth);
      t.setY(-ny * t.depth);
    }
  };
  window.addEventListener('pointermove', onMove, { passive: true });
}
