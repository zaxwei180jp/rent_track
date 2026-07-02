# 租屋費用管理

Notion「租屋費用」資料庫的網頁前台:統計卡片、費用構成、每月堆疊圖、搜尋、新增/編輯/刪除。

## 部署步驟(Vercel)

1. 將本專案推上 GitHub,或直接 `vercel deploy`
2. 在 Vercel 專案設定 → Environment Variables 加入:
   - `NOTION_TOKEN`:Notion integration token(可沿用 request-teal-eight 的)
   - `NOTION_DB_ID`:租屋費用資料庫 ID(Notion 網址中 32 碼)
3. 在 Notion 打開「租屋費用」資料庫 → 右上「…」→ 連接 → 選擇你的 integration
4. Redeploy 讓環境變數生效

## 對應的 Notion 欄位(名稱需完全一致)

| 欄位 | 類型 |
|---|---|
| 名稱 | title(YYYYMM,例 202607)|
| 電費、水費、瓦斯費、樂天通信、燈油 | number |
| 電kWh、水m3、瓦斯m3 | number |
| 購買日期 | date |
| 合計 | formula(唯讀,網頁端不寫入)|

## 備註

- 記錄快取 5 分鐘(localStorage),右上 ↻ 可強制刷新
- 新增後延遲 1.5 秒再重新查詢(Notion 索引延遲)
- 「合計」以 Notion formula 為準;若尚未計算完成,前端以五項費用加總顯示
