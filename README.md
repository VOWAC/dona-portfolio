# DONA's Portfolio ✨

星空をテーマにした、空間を感じさせるグラフィカルなポートフォリオ。
トップページは WebGPU で描画する 3D 星空をヒーローに、マウス追従カーソル・
パララックス・慣性スクロールで「ゲーム公式サイト」のような没入体験を目指しています。

## 🛠 技術スタック

ベースは **Astro**（アイランド構成・静的生成）。そこへ以下を重ねています。

| 技術 | 用途 |
| :-- | :-- |
| **Three.js (WebGPURenderer + TSL)** | 全画面の 3D 星空・星雲・奥行きパーティクル。WebGPU を主に使用し、非対応環境では WebGL2 へ自動フォールバック。さらに WebGL も使えない場合は CSS の深宇宙グラデーション背景に退避 |
| **GSAP + ScrollTrigger** | スクロール連動の出現演出、カーソル/パララックスのフレーム補間（`quickTo`） |
| **Lenis** | 慣性スムーススクロール。ScrollTrigger / gsap.ticker と連動 |

> **Pixi.js は不採用。** 星空とカーソル追従を Three.js の単一 GPU パイプラインに
> 集約したほうが、描画コンテキストの競合を避けられ、見た目の統一感とパフォーマンス
> の両面で有利と判断したため。カーソル追従は Three シーン連動＋GSAP で実装。

## 🌌 主な演出

- **WebGPU 星空背景** … 奥行きの異なる 3 層の星（`InstancedMesh` + TSL の円形グロー）と
  色付きネビュラ。星ごとの位相でランダムにきらめく。
- **マウス視差** … カメラと各星レイヤーがポインタに追従して動き、奥行きを強調。
  DOM 要素も `data-parallax="<深度px>"` で深度比例に視差移動。
- **星型カスタムカーソル** … 芯（即応）＋リング（遅延）の二層追従。リンク上で拡大。
- **慣性スクロール＆出現演出** … Lenis のなめらかなスクロールに合わせてカメラが
  星空の奥へドリー。`[data-reveal]` 要素は blur+slide+fade で出現。
- **アクセシビリティ** … `prefers-reduced-motion` ではアニメーションを停止し、
  静止フレーム＋ネイティブスクロールに退避。

## 📂 構成（追加分）

```text
src/
├── lib/
│   ├── space/        # 星空背景（WebGPU）
│   │   ├── SpaceBackground.ts  # レンダラ/シーン/ループの統括
│   │   ├── starLayers.ts       # 星レイヤー(InstancedMesh + TSL)
│   │   ├── textures.ts         # ネビュラのスプライト生成
│   │   └── instance.ts         # ページ内共有シングルトン参照
│   ├── cursor/cursor.ts        # 星型カスタムカーソル
│   ├── parallax/pointerParallax.ts  # DOM 視差
│   └── scroll/smoothScroll.ts  # Lenis + ScrollTrigger 連動
└── components/
    ├── SpaceCanvas.astro   # 固定キャンバス + 深宇宙グラデーション
    └── CustomCursor.astro  # カーソルのスタイル/初期化
```

## 🧞 コマンド

このリポジトリは **pnpm**（lockfile 同梱）を使用します。Node は arm64/x64 を
合わせてください（Apple Silicon では `corepack pnpm` 推奨）。

| コマンド | 内容 |
| :-- | :-- |
| `pnpm install` | 依存をインストール |
| `pnpm dev` | 開発サーバ（`localhost:4321`） |
| `pnpm build` | `./dist/` へ本番ビルド |
| `pnpm preview` | ビルド結果をローカル確認 |

### デバッグ用クエリ

- `?debug` … 星空背景のバックエンド名（WebGPU / WebGL）をバッジ表示
- `?nolenis` … Lenis を無効化しネイティブスクロールで確認
- `?scrollto=<px>` … 指定位置へ初期スクロール

## 🌐 動作環境

WebGPU 対応ブラウザ（最新の Chrome / Edge / Safari）で最良。非対応でも WebGL2 で
動作し、いずれも使えない環境では静的な深宇宙グラデーションにフォールバックします。
