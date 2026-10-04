# NQX v10.3

NQXの最新凍結仕様を基準にした更新版ソースです。

## 今回の主な更新
- 採用済み背景「静寂の星図と青い星雲」をPLAY観測フィールドへ統合
- 背景画像をWebP化し、約20KBまで軽量化
- OBSERVE / BATTLE / SLEEP の実動作経路を監査
- CPU侵食を、敵出現→TURN1→TURN2→TURN3→情報構造崩壊→結果の段階演出へ変更
- PvP侵食も同じ3TURN観測演出を使用
- 操作UIは観測フィールドへ溶け込ませたまま維持
- 広告は観測フィールド外に維持
- ABERRANT / DOMINION / UNKNOWN のCLASS別表示上限仕様を維持
- v10系の誤スケール補正を維持

## 操作
- OBSERVE: 現役個体なし=FIRST OBSERVATION、あり=EXTERNAL OBSERVATION
- BATTLE: CPU侵食 / 対人侵食
- SLEEP: 60分休眠、途中覚醒対応

## 検証
- Node自動テスト: 21/21 PASS
- 全JavaScript構文確認: PASS
- 相対import整合: PASS
- 主要旧仕様トークン監査: PASS（旧データ移行テスト内の参照を除く）

## Build
この実行環境では `npm install` が120秒でタイムアウトしたため、production buildは未実行です。
Netlify設定は `npm run build` / publish `dist` のままです。
