# 評審示範帳號與示範資料

> 已於 2026-10-29 填寫 Devpost 時建立，**請勿再另建示範帳號或示範資料**。

## 帳號

- 網站：https://wisejob.vercel.app
- Email：`judge.demo@jobsmart.example`
- 密碼：**不放在 repo**（repo 會公開）。已填在 Devpost 的 Additional info（只有評審看得到）；需要時請問 lai2570。

## 線上已建立的示範資料

從 `9e8e475` 起資料依登入帳號分開（`src/lib/turso/repository.ts` 的 `userId()` 回傳登入者 ID），所以下面這些資料**只屬於評審帳號**，用評審帳號登入才看得到。2026-10-30 已在評審帳號底下重新建立。

| 項目 | 內容 | ID |
|---|---|---|
| 職缺分類 | `Demo` | `6e1202e8-2165-40d7-b741-9b8fc07b1c9c` |
| 示範履歷 | `Demo · Alex Lin (PM)`（虛構人物） | `a31db432-eea7-4bd6-b6ad-1e284621aacc` |
| 示範職缺 | Lumora AI、Kitebank（Saved）、Northwind Logistics（Preparing）、Formosa Health Tech（Applied）、Pixelpine Games（Round 1）、Harborline Travel（Verbal offer），皆為虛構公司 | 分類為 `Demo` |

- 示範履歷刻意寫成「Assisted the product manager…」，而 Lumora AI 的 JD 要求「Led the end-to-end launch」，用來展示事實審核會標出誇大的句子。
- 請不要刪除或修改上述資料。
- 2026-10-29 第一次建立的同名資料屬於舊的共用 `demo-user`，現在一般帳號看不到，可以忽略。

## 評審試用路徑

登入 → 求職追蹤頁切到「Demo」分頁 → 在 Lumora AI 卡片按「Prepare resume」→ 看事實審核結果 → 回答延伸問題 → 自己按送出。

## 待處理

- [ ] **wisejob 的 Vercel 尚未設定 AI 金鑰**（2026-10-30 確認 `/api/agent/run` 回傳 `provider: demo-fallback`）。請設定 `NEBIUS_API_KEY`（或 `AI_PROVIDER` + `AI_API_KEY`）後重新部署，否則上面的試用路徑走不通。
- [ ] Devpost 的事實審核截圖要等金鑰設定好才能補拍。
