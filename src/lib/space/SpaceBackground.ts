/**
 * 星空の 3D 背景オーケストレータ。
 *
 * - Three.js の WebGPURenderer を使用（WebGPU 非対応環境では WebGL2 に自動フォールバック）
 * - 奥行きの異なる星レイヤー + 色付きネビュラで「空間」を表現
 * - マウス位置でカメラ／レイヤーが視差移動（setPointer）
 * - スクロール進行で星空の中をドリー（setScroll、ステージ4で配線）
 * - prefers-reduced-motion 時はアニメーションを止め静止フレームのみ描画
 */
import * as THREE from 'three/webgpu';
import { createStarField, type StarLayer } from './starLayers';
import { createNebulaTexture } from './textures';

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export class SpaceBackground {
  private renderer!: THREE.WebGPURenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private layers: StarLayer[] = [];
  private uTime: { value: number } = { value: 0 };
  private nebulae: THREE.Sprite[] = [];

  private pointer = { x: 0, y: 0 };
  private current = { x: 0, y: 0 };
  private scrollTarget = 0;
  private scrollCurrent = 0;

  private reducedMotion = false;
  private running = false;
  private disposed = false;

  constructor(private canvas: HTMLCanvasElement) {
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1,
      4000,
    );
    this.camera.position.set(0, 0, 0);

    this.reducedMotion =
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  /** 非同期初期化。WebGPU/WebGL の準備が整ったら描画を開始する。 */
  async init(): Promise<void> {
    this.renderer = new THREE.WebGPURenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0); // 背景は CSS グラデーションを透過

    await this.renderer.init();
    if (this.disposed) return;

    this.buildScene();
    this.bindEvents();

    if (this.reducedMotion) {
      this.renderOnce();
    } else {
      this.running = true;
      this.renderer.setAnimationLoop(this.frame);
    }
  }

  private buildScene(): void {
    // ネビュラ（奥に色の雲を数枚）
    const nebulaDefs: Array<{ color: string; x: number; y: number; z: number; scale: number }> = [
      { color: '#5b3f8c', x: -420, y: 180, z: -1100, scale: 1400 },
      { color: '#274690', x: 480, y: -120, z: -1300, scale: 1600 },
      { color: '#c98fb0', x: 120, y: 320, z: -900, scale: 900 },
    ];
    for (const def of nebulaDefs) {
      const tex = createNebulaTexture(def.color);
      const mat = new THREE.SpriteNodeMaterial({
        map: tex,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        opacity: 0.9,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(def.x, def.y, def.z);
      sprite.scale.setScalar(def.scale);
      this.scene.add(sprite);
      this.nebulae.push(sprite);
    }

    // 星レイヤー
    const field = createStarField();
    this.layers = field.layers;
    this.uTime = field.uTime;
    for (const layer of this.layers) {
      this.scene.add(layer.mesh);
    }
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize, { passive: true });
    document.addEventListener('visibilitychange', this.onVisibility);
  }

  private onResize = (): void => {
    if (!this.renderer) return;
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    if (this.reducedMotion) this.renderOnce();
  };

  private onVisibility = (): void => {
    if (this.reducedMotion || this.disposed) return;
    if (document.hidden) {
      this.renderer.setAnimationLoop(null);
      this.running = false;
    } else if (!this.running) {
      this.running = true;
      this.renderer.setAnimationLoop(this.frame);
    }
  };

  /** マウス位置を -1..1 で受け取り、視差の目標値にする。 */
  setPointer(nx: number, ny: number): void {
    this.pointer.x = nx;
    this.pointer.y = ny;
  }

  /** スクロール進行 0..1。星空の奥へ進む量を決める。 */
  setScroll(progress: number): void {
    this.scrollTarget = progress;
  }

  /** 実際に使われているバックエンド名（'WebGPU' / 'WebGL'）。 */
  backendName(): string {
    // three の WebGPURenderer は backend に応じて isWebGPUBackend を持つ
    const anyR = this.renderer as unknown as { backend?: { isWebGPUBackend?: boolean } };
    return anyR.backend?.isWebGPUBackend ? 'WebGPU' : 'WebGL';
  }

  private frame = (): void => {
    try {
      this.renderFrame();
    } catch (err) {
      console.error('[space] frame error:', err);
      this.renderer.setAnimationLoop(null);
      this.running = false;
    }
  };

  private renderFrame(): void {
    // マウス視差（なめらかに追従）
    this.current.x = lerp(this.current.x, this.pointer.x, 0.05);
    this.current.y = lerp(this.current.y, this.pointer.y, 0.05);
    this.scrollCurrent = lerp(this.scrollCurrent, this.scrollTarget, 0.06);

    // カメラはマウスと逆方向へわずかに動き、奥行きを強調
    this.camera.position.x = this.current.x * 60;
    this.camera.position.y = this.current.y * 60;
    // スクロールで星空の中をドリー（最大 ~900 奥へ）
    this.camera.position.z = -this.scrollCurrent * 900;
    this.camera.lookAt(0, 0, this.camera.position.z - 600);

    // レイヤーごとに追加の視差（手前ほど強く）
    for (const layer of this.layers) {
      layer.mesh.position.x = -this.current.x * 80 * layer.parallax;
      layer.mesh.position.y = -this.current.y * 80 * layer.parallax;
    }

    const now = performance.now();

    // 星のきらめきを進める（共有ユニフォーム）
    this.uTime.value = now * 0.001;

    // ネビュラをゆっくり回転させて生命感を出す
    const t = now * 0.00002;
    for (let i = 0; i < this.nebulae.length; i++) {
      this.nebulae[i].material.rotation = t * (i % 2 === 0 ? 1 : -1);
    }

    this.renderer.render(this.scene, this.camera);
  };

  private renderOnce(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.disposed = true;
    this.running = false;
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.renderer?.setAnimationLoop(null);
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose?.();
      const mat = (obj as THREE.Sprite | THREE.Points).material as THREE.Material | undefined;
      mat?.dispose?.();
    });
    this.renderer?.dispose?.();
  }
}
