# NQX v10.3 Implementation Report

## 1. 監査結果
v10.2コードを基準に、PLAY画面、OBSERVE / BATTLE / SLEEP、CPU侵食、PvP、TRACE、LINEAGE、CLASS表示、広告配置、背景資産、PWA設定を監査した。

確認結果:
- OBSERVE / BATTLE / SLEEP のイベントハンドラは存在していた。
- OBSERVEはQR/バーコード観測から状態更新まで接続済み。
- SLEEPはtimestamp方式で接続済み。
- BATTLEは勝敗処理自体は接続済みだったが、実際の侵食演出が単一待機画面に近く、行動が見えにくかった。
- 広告は観測フィールド外に配置済み。
- CLASS別パラメータ上限表示とv10誤スケール補正は維持されていた。

## 2. 修正
### 背景
採用済み画像を `public/nqx-field-bg.webp` として統合。
PLAYの観測フィールドのみへ表示し、UIとABERRANTの視認性を落とさない暗幕・周辺減光をCSSで重ねた。

### BATTLE
CPU侵食を以下へ変更:
1. TARGET TRACE ACQUIRED
2. TURN 1
3. TURN 2
4. TURN 3
5. INFORMATION STRUCTURE COLLAPSING
6. INTRUSION RESULT

各ターンは既に内部決定された同一resultを再生するだけで、戦闘決定論は変更していない。
PvPも双方確認済みresultを同じ観測演出で再生する。

### 操作
OBSERVE / BATTLE / SLEEP はPLAY上部の観測フィールド内操作として維持。
大きな独立カードUIへ戻していない。

## 3. 軽量化
- 背景PNG 1.5MB超 → WebP 約20KB
- 背景はCSS一枚のみ。Canvas常時背景描画なし。
- 既存のPLAY非表示時animation停止、camera停止、timestamp方式を維持。
- PWA precacheへWebPを追加。

## 4. テスト
21 tests PASS。
追加確認:
- OBSERVEがコード履歴・行動寿命・個体状態を更新
- SLEEPが60分timestampで完了判定
- CPU BATTLEが3TURN結果を生成して勝利状態へ反映
- PLAYに3アクションのclick handlerが存在
- 採用背景がpointer eventを奪わない

## 5. production build
`npm install --prefer-offline --no-audit --no-fund` を試行したが120秒でタイムアウト。
そのためこの環境ではVite production buildは未完了。未実施を完成扱いにはしていない。
