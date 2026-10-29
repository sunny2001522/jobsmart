# 評審示範帳號與示範資料

> 已於 2026-10-29 填寫 Devpost 時建立，**請勿再另建示範帳號或示範資料**。

## 帳號

- 網站：https://wisejob.vercel.app
- Email：`judge.demo@jobsmart.example`
- 密碼：**不放在 repo**（repo 會公開）。已填在 Devpost 的 Additional info（只有評審看得到）；需要時請問 lai2570。

## 線上已建立的示範資料

所有帳號共用同一份資料（`src/lib/turso/repository.ts` 的 `userId()` 固定回傳 `demo-user`），所以下面這些資料任何帳號登入都看得到。

| 項目 | 內容 | ID |
|---|---|---|
| 職缺分類 | `Demo` | `7dc8aaa5-1283-475e-b17a-041149411d86` |
| 示範履歷 | `Demo · Alex Lin (PM)`（虛構人物，`display_order = -1`，是「準備履歷」的預設履歷） | `122958e7-818c-4fca-84a5-371d487589d0` |
| 示範職缺 | Lumora AI、Kitebank（Saved）、Northwind Logistics（Preparing）、Formosa Health Tech（Applied）、Pixelpine Games（Round 1）、Harborline Travel（Verbal offer），皆為虛構公司 | 分類為 `Demo` |

- 示範履歷刻意寫成「Assisted the product manager…」，而 Lumora AI 的 JD 要求「Led the end-to-end launch」，用來展示事實審核會標出誇大的句子。
- 請不要刪除或修改上述資料；隊員原本的卡片沒有被動到。

## 評審試用路徑

登入 → 求職追蹤頁切到「Demo」分頁 → 在 Lumora AI 卡片按「Prepare resume」→ 看事實審核結果 → 回答延伸問題 → 自己按送出。

## 待處理

- [ ] **wisejob 的 Vercel 尚未設定 `NEBIUS_API_KEY`**，目前所有 AI 功能都會失敗（`NEBIUS_API_KEY is not set`），上面的試用路徑走不通。設定後請重新部署。
- [ ] Devpost 的事實審核截圖要等金鑰設定好才能補拍。
