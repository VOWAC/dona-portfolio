/**
 * Canvas で生成するソフトスプライト群。
 * WebGPU / WebGL2 のどちらでも確実に同じ見た目になるよう、
 * シェーダの point-coord 依存を避けてテクスチャで丸いグローを表現する。
 */
import * as THREE from 'three/webgpu';

/** ゆるい色付きの星雲（ネビュラ）。指定色のソフトな雲。 */
export function createNebulaTexture(hex: string, size = 512): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const c = size / 2;

  const col = new THREE.Color(hex);
  const r = Math.round(col.r * 255);
  const gg = Math.round(col.g * 255);
  const b = Math.round(col.b * 255);

  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  grad.addColorStop(0.0, `rgba(${r},${gg},${b},0.55)`);
  grad.addColorStop(0.4, `rgba(${r},${gg},${b},0.18)`);
  grad.addColorStop(1.0, `rgba(${r},${gg},${b},0)`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
