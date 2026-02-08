# Claude Code 指引

## Git 提交規範

### 分次 Commit 規則

當用戶說「分次 commit」時，直接執行以下步驟：

1. **分析變更**：檢視 `git status` 和 `git diff --stat` 了解所有變更
2. **按功能分組**：依據以下優先順序分組：
   - 資料庫/遷移檔案
   - 類型定義/Hooks/Contexts
   - 工具函式庫（AI、爬蟲、第三方整合）
   - API 端點
   - UI 元件
   - 頁面更新
   - 清理/重構
   - 配置/文檔
3. **資安檢查**：
   - 檢查是否有敏感檔案（.env、credentials、secrets、API keys）
   - 如有敏感檔案，自動加入 `.gitignore` 而非提交
4. **直接執行**：不詢問用戶，直接分組並提交
5. **產出 PR 訊息**：自動產出中文 PR 訊息

### Commit Message 格式

```
feat: 簡短描述

- 變更項目 1
- 變更項目 2

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

### PR 訊息格式（中文）

```markdown
## 摘要
[1-3 點說明此 PR 的主要變更]

## 變更內容
[詳細列出各個 commit 的變更]

## 測試計畫
[測試項目清單]
```

## 資安規範

### 必須加入 .gitignore 的檔案

```
# 環境變數
.env
.env.local
.env.*.local

# 憑證
*.pem
*.key
credentials.json
service-account.json

# API Keys
*-api-key*
*-secret*

# 本地配置
.local/
```

### 提交前檢查

每次提交前自動檢查：
1. 是否有包含 `password`、`secret`、`api_key`、`token` 的檔案
2. 是否有 `.env` 相關檔案
3. 是否有憑證檔案（.pem, .key, .json credentials）

如發現上述檔案，自動加入 `.gitignore` 並提醒用戶。
