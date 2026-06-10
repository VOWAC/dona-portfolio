/**
 * 奥行きの異なる星のレイヤー群を生成する。
 *
 * 各星は「uv を持つ 1x1 平面」を InstancedMesh で大量描画し、
 * TSL で uv からの距離をもとに円形のソフトグローを作る。
 * （PointsMaterial / PointsNodeMaterial はこのバージョンの WebGPURenderer だと
 *  ポイントスプライト座標の uv を供給できず map 抽出に失敗するため、平面方式を採用。）
 *
 * - レイヤーごとの parallax 係数で奥行きの視差を表現
 * - 星ごとの位相 + 共有 uTime でランダムにきらめく
 * - 遠近はパースペクティブにより自然に減衰
 */
import * as THREE from 'three/webgpu';
import { attribute, uv, uniform, float, sin } from 'three/tsl';

export interface StarLayer {
  mesh: THREE.InstancedMesh;
  /** マウス視差の効き具合（手前ほど大きい）。 */
  parallax: number;
}

export interface StarField {
  layers: StarLayer[];
  /** 秒を入れるときらめきが進む共有ユニフォーム。 */
  uTime: { value: number };
}

/** 星の色パレット（白〜淡青〜金〜ラベンダー）。淡色を多めに。 */
const PALETTE = [
  '#ffffff',
  '#ffffff',
  '#dfe8ff',
  '#9bb8ff',
  '#fff2ad',
  '#b9a0cb',
];

interface LayerSpec {
  count: number;
  spread: number;
  depth: [number, number];
  /** ワールド上の星の大きさ範囲。 */
  size: [number, number];
  parallax: number;
  twinkleSpeed: number;
}

const SPECS: LayerSpec[] = [
  { count: 1600, spread: 1000, depth: [-1500, -750], size: [3, 7], parallax: 0.12, twinkleSpeed: 0.7 },
  { count: 750, spread: 760, depth: [-720, -320], size: [5, 11], parallax: 0.35, twinkleSpeed: 1.0 },
  { count: 300, spread: 580, depth: [-320, -90], size: [9, 20], parallax: 0.8, twinkleSpeed: 1.5 },
];

function buildLayer(
  spec: LayerSpec,
  uTime: ReturnType<typeof uniform>,
): StarLayer {
  const { count } = spec;

  const geometry = new THREE.PlaneGeometry(1, 1);
  const colors = new Float32Array(count * 3);
  const phases = new Float32Array(count);
  const col = new THREE.Color();

  const material = new THREE.MeshBasicNodeMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  });

  // uv からの距離で円形グロー（中心 1 → 外周 0）
  const d = uv().sub(0.5).length();
  const glow = float(0.5).sub(d).div(0.5).clamp(0, 1);
  const softGlow = glow.mul(glow); // 中心に集中したソフトな光

  const aColor = attribute('aColor', 'vec3');
  const aPhase = attribute('aPhase', 'float');
  // 0.6〜1.0 の範囲できらめく
  const twinkle = sin(uTime.mul(spec.twinkleSpeed).add(aPhase)).mul(0.2).add(0.8);

  material.colorNode = aColor.mul(twinkle);
  material.opacityNode = softGlow.mul(twinkle);

  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.frustumCulled = false;

  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    dummy.position.set(
      (Math.random() * 2 - 1) * spec.spread,
      (Math.random() * 2 - 1) * spec.spread,
      THREE.MathUtils.lerp(spec.depth[0], spec.depth[1], Math.random()),
    );
    const s = THREE.MathUtils.lerp(spec.size[0], spec.size[1], Math.random());
    dummy.scale.setScalar(s);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);

    col.set(PALETTE[(Math.random() * PALETTE.length) | 0]);
    const b = 0.75 + Math.random() * 0.25;
    colors[i * 3 + 0] = col.r * b;
    colors[i * 3 + 1] = col.g * b;
    colors[i * 3 + 2] = col.b * b;
    phases[i] = Math.random() * Math.PI * 2;
  }
  mesh.instanceMatrix.needsUpdate = true;

  geometry.setAttribute('aColor', new THREE.InstancedBufferAttribute(colors, 3));
  geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1));

  return { mesh, parallax: spec.parallax };
}

export function createStarField(): StarField {
  const uTime = uniform(0);
  const layers = SPECS.map((spec) => buildLayer(spec, uTime));
  return { layers, uTime: uTime as unknown as { value: number } };
}
