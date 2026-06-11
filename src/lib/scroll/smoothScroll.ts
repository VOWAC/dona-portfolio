/**
 * Lenis の慣性スムーススクロールと GSAP ScrollTrigger を統合し、
 * 「空間の奥へ進む」スクロール体験をつくる。
 *
 * - Lenis ↔ ScrollTrigger ↔ gsap.ticker を連動
 * - スクロール進行(0..1)を星空背景へ渡し、カメラを星の奥へドリー
 * - [data-reveal] 要素をスクロールでふわっと出現させる
 * - prefers-reduced-motion ではスムーススクロール・演出を無効化し、
 *   進行度だけは渡してカメラ位置を反映する
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { onSpaceReady } from '@lib/space/instance';
import type { SpaceBackground } from '@lib/space/SpaceBackground';

gsap.registerPlugin(ScrollTrigger);

const clamp01 = (v: number) => Math.min(Math.max(v, 0), 1);

export function initSmoothScroll(): void {
  // 検証用: ?scrollto=<px> で初期スクロール位置、?nolenis で Lenis を無効化
  const params = new URLSearchParams(location.search);
  const scrollTo = params.has('scrollto') ? parseInt(params.get('scrollto') ?? '0', 10) : null;

  const reduce =
    (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false) ||
    params.has('nolenis');

  let space: SpaceBackground | null = null;
  onSpaceReady((s) => (space = s));

  if (!reduce) {
    const lenis = new Lenis({ lerp: 0.1, smoothWheel: true });

    lenis.on('scroll', () => {
      ScrollTrigger.update();
      const limit = (lenis as unknown as { limit: number }).limit || 1;
      const scroll = (lenis as unknown as { scroll: number }).scroll;
      space?.setScroll(clamp01(scroll / limit));
    });

    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    if (scrollTo !== null) {
      setTimeout(() => lenis.scrollTo(scrollTo, { immediate: true }), 700);
    }
  } else {
    const onScroll = () => {
      const limit = document.documentElement.scrollHeight - window.innerHeight || 1;
      space?.setScroll(clamp01(window.scrollY / limit));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    if (scrollTo !== null) {
      setTimeout(() => {
        window.scrollTo(0, scrollTo);
        onScroll();
      }, 700);
    }
  }

  initReveals(reduce);
}

function initReveals(reduce: boolean): void {
  const els = gsap.utils.toArray<HTMLElement>('[data-reveal]');
  els.forEach((el) => {
    if (reduce) {
      gsap.set(el, { opacity: 1, clearProps: 'all' });
      return;
    }
    gsap.fromTo(
      el,
      { opacity: 0, y: 48, filter: 'blur(8px)' },
      {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 1.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 82%',
          toggleActions: 'play none none reverse',
        },
      },
    );
  });
}
