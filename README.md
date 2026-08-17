# 家計管理(Notion + Vercel)

用 Notion 當資料庫、Vercel 當前台的家計管理網頁。三個頁面:租屋費用、稅金、薪資,支援統計卡片、構成分析、每月堆疊圖、搜尋、新增/編輯/刪除,手機優先設計。

薪資與稅金以 relation 關聯,新增薪資時會自動綁定同月份的稅金紀錄,實拿薪水直接由 Notion 公式算出。

## 安裝(約 10 分鐘)

### 1. 複製 Notion 範本

複製範本到自己的 workspace:**[👉 Notion 範本連結](在此貼上你的範本連結)**

範本包含三個資料庫,欄位與公式都已設定好。

### 2. 建立 Notion Integration

1. 前往 [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. New integration → 命名(例如 `家計管理`)→ 選擇你的 workspace → Submit
3. 複製 **Internal Integration Token**(`ntn_` 或 `secret_` 開頭)

### 3. 把資料庫連接到 Integration

**三個資料庫都要做,漏掉任何一個該頁就會讀不到資料。**

打開資料庫 → 右上角 `⋯` → `連接` / `Connections` → 選擇剛才建立的 integration。

### 4. 取得資料庫 ID

打開資料庫,看網址列:

```
https://www.notion.so/workspace/a1b2c3d4e5f67890abcdef1234567890?v=...
                                └────────── 這 32 碼就是 ID ──────────┘
```

三個資料庫各取一次。

### 5. 部署到 Vercel

**方法 A:一鍵部署**

點擊 Deploy 按鈕 → 連接 GitHub → 依提示填入四個環境變數。

**方法 B:手動**

```bash
git clone <這個 repo>
cd household-tracker
vercel deploy
```

部署後到 Vercel 專案 → Settings → Environment Variables 填入:

| 變數名 | 說明 |
|---|---|
| `NOTION_TOKEN` | 步驟 2 的 token |
| `NOTION_DB_RENT` | 租屋費用資料庫 ID |
| `NOTION_DB_TAX` | 稅金資料庫 ID |
| `NOTION_DB_SALARY` | 薪資資料庫 ID |

填完 **Redeploy** 一次讓變數生效。

### 6. 檢查

開啟 `你的網址/setup.html`,四項全綠就完成了。有紅色或黃色會直接告訴你缺什麼。

## 頁面

| 檔案 | 內容 |
|---|---|
| `index.html` | 租屋費用 — 電費、水費、瓦斯費、通信、燈油,含用量與單價 |
| `tax.html` | 稅金 — 社會保險、所得稅、住民稅、事假 |
| `salary.html` | 薪資 — 支給明細、扣除額、實拿薪水 |
| `setup.html` | 設定檢查 — 診斷連線與欄位 |

## Notion 欄位對應

欄位名稱需與下表**完全一致**(用範本就不會有問題)。

### 租屋費用(標題欄:`名稱`,格式 YYYYMM)

| 欄位 | 類型 |
|---|---|
| 電費、水費、瓦斯費、樂天通信、燈油 | number |
| 電kWh、水m3、瓦斯m3 | number |
| 購買日期 | date |
| 合計 | formula(五項費用加總) |

### 稅金(標題欄:`月份`,格式 YYYYMM)

| 欄位 | 類型 |
|---|---|
| 健康保險、厚生年金保險、雇用保險 | number(社會保險明細,不計入合計) |
| 社會保險、所得稅、住民稅、事假 | number(計入合計) |
| 子育て支援金 | number(不計入合計) |
| 合計 | formula = 社會保險 + 所得稅 + 住民稅 + 事假 |

### 薪資(標題欄:`月份`,格式 YYYYMM)

| 欄位 | 類型 |
|---|---|
| 基本給予(月給)、全勤、加班、通勤、其他 | number |
| 合計 | formula = 五項支給加總 |
| 稅金 | relation → 稅金資料庫 |
| 扣除額 | rollup(稅金 relation 的合計) |
| 實拿薪水 | formula = 合計 − 扣除額 |

## 使用建議

- 每月**先建稅金、再建薪資**,薪資儲存時就能自動綁定 relation,扣除額立刻有值
- 新增時月份會自動帶下一個年月,各欄位旁有「上月 ¥x」磚塊可一鍵帶入
- 稅金頁的社會保險欄有「自動計算」磚塊,自動加總三項保險
- 舊薪資紀錄若未連結稅金,展開明細有「連結稅金」按鈕可補綁

## 技術備註

- 純靜態 HTML + 單一 serverless function,無建置流程、無 npm 依賴
- Token 只存在 Vercel 環境變數,前端不會接觸到
- 資料快取 5 分鐘(localStorage),右上 ↻ 強制刷新
- 新增後延遲 1.5 秒再查詢(Notion 索引延遲)
- formula 與 rollup 欄位為唯讀,網頁不寫入

## 客製化

改欄位名稱的話,編輯對應 HTML 檔開頭的設定區:

```js
var COST_FIELDS = [
  { key: '電費', cssVar: '--c-elec' },
  ...
];
```

配色改 CSS 最上方的 `:root` 變數即可。

## License

MIT
