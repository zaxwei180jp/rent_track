// api/notion.js — Notion API 代理(租屋費用)
// 環境變數:NOTION_TOKEN(integration token)、NOTION_DB_ID(租屋費用資料庫 ID)
const NOTION_API = 'https://api.notion.com/v1';

function notionHeaders() {
  return {
    'Authorization': 'Bearer ' + process.env.NOTION_TOKEN,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json'
  };
}

async function notionFetch(path, options) {
  const resp = await fetch(NOTION_API + path, Object.assign({ headers: notionHeaders() }, options));
  const data = await resp.json();
  if (!resp.ok) {
    const err = new Error(data.message || 'Notion API error');
    err.status = resp.status;
    err.detail = data;
    throw err;
  }
  return data;
}

// 查詢全部紀錄(自動處理分頁),依名稱(YYYYMM)遞減排序
async function queryAll(dbId) {
  const results = [];
  let cursor = undefined;
  do {
    const body = {
      page_size: 100,
      sorts: [{ property: '名稱', direction: 'descending' }]
    };
    if (cursor) body.start_cursor = cursor;
    const data = await notionFetch('/databases/' + dbId + '/query', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    results.push.apply(results, data.results);
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);
  return results;
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }

  const dbId = process.env.NOTION_DB_ID;
  if (!process.env.NOTION_TOKEN || !dbId) {
    res.status(500).json({ error: '缺少 NOTION_TOKEN 或 NOTION_DB_ID 環境變數' });
    return;
  }

  const { action, payload } = req.body || {};

  try {
    switch (action) {
      case 'query': {
        const pages = await queryAll(dbId);
        res.status(200).json({ results: pages });
        return;
      }
      case 'create': {
        // payload.properties 為前端組好的 Notion properties 物件
        const data = await notionFetch('/pages', {
          method: 'POST',
          body: JSON.stringify({
            parent: { database_id: dbId },
            properties: payload.properties
          })
        });
        res.status(200).json(data);
        return;
      }
      case 'update': {
        const data = await notionFetch('/pages/' + payload.pageId, {
          method: 'PATCH',
          body: JSON.stringify({ properties: payload.properties })
        });
        res.status(200).json(data);
        return;
      }
      case 'delete': {
        const data = await notionFetch('/pages/' + payload.pageId, {
          method: 'PATCH',
          body: JSON.stringify({ archived: true })
        });
        res.status(200).json(data);
        return;
      }
      case 'schema': {
        const data = await notionFetch('/databases/' + dbId, { method: 'GET' });
        res.status(200).json(data);
        return;
      }
      default:
        res.status(400).json({ error: '未知的 action: ' + action });
        return;
    }
  } catch (e) {
    res.status(e.status || 500).json({ error: e.message, detail: e.detail || null });
  }
};
