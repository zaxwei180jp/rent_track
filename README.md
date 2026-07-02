# 家計管理(租屋費用 / 稅金)

Notion 資料庫的網頁前台:統計卡片、構成分析、每月堆疊圖、搜尋、新增/編輯/刪除。

## 頁面

- `index.html` 租屋費用
- `tax.html` 稅金
- `salary.html` 薪資 — 與稅金以 relation 關聯,新增時自動綁定同月份稅金

## 部署步驟(Vercel)

1. 推上 GitHub 或 `vercel deploy`
2. 環境變數:
   - `NOTION_TOKEN`:Notion integration token
   - `NOTION_DB_RENT`:租屋費用資料庫 ID(相容舊名 `NOTION_DB_ID`)
   - `NOTION_DB_TAX`:稅金資料庫 ID
   - `NOTION_DB_SALARY`:薪資資料庫 ID
3. 在 Notion 將兩個資料庫都「連接」到該 integration
4. 三個資料庫都要連接 integration,Redeploy 使環境變數生效

## Notion 欄位對應(名稱需完全一致)

### 租屋費用(title:名稱)
電費、水費、瓦斯費、樂天通信、燈油、電kWh、水m3、瓦斯m3(number)/ 購買日期(date)/ 合計(formula,唯讀)

### 稅金(title:月份)
健康保險、厚生年金保險、雇用保險、社會保險、所得稅、住民稅、子育て支援金、事假(number)/ 合計(formula,唯讀)

- 合計 = 社會保險 + 所得稅 + 住民稅 + 事假
- 健康/厚生年金/雇用保險為社會保險明細;新增時可按「自動計算」磚塊帶入三項加總
- 子育て支援金不計入合計

## 備註

- 各頁快取 5 分鐘(localStorage),右上 ↻ 強制刷新
- 新增後延遲 1.5 秒再查詢(Notion 索引延遲)
- 合計以 Notion formula 為準,formula 未回傳時前端以構成項目加總顯示

### 薪資(title:月份)
基本給予(月給)、全勤、加班、通勤、其他(number)/ 合計、實拿薪水(formula,唯讀)/ 扣除額(rollup,唯讀)/ 稅金(relation)

- 合計 = 五項支給加總;實拿薪水 = 合計 − 扣除額;扣除額 = 關聯稅金的合計(rollup)
- 新增/儲存時自動搜尋同月份稅金紀錄並綁定 relation;未連結的紀錄明細內有「連結稅金」按鈕
- 「基本給予(月給)」欄位名於載入時自動偵測(容許括號全半形差異)
