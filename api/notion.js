// api/notion.js — Notion API 代理(租屋費用 / 稅金)
// 環境變數:
//   NOTION_TOKEN    integration token
//   NOTION_DB_RENT  租屋費用資料庫 ID(相容舊名 NOTION_DB_ID)
//   NOTION_DB_TAX     稅金資料庫 ID
//   NOTION_DB_SALARY  薪資資料庫 ID
const NOTION_API = 'https://api.notion.com/v1';

function dbConfig(key) {
  const map = {
    rent: { id: process.env.NOTION_DB_RENT || process.env.NOTION_DB_ID, titleProp: '名稱' },
    tax:    { id: process.env.NOTION_DB_TAX, titleProp: '月份' },
    salary: { id: process.env.NOTION_DB_SALARY, titleProp: '月份' }
  };
  return map[key] || null;
}

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

// 查詢全部紀錄(自動處理分頁),依 title(YYYYMM)遞減排序
async function queryAll(cfg) {
  const results = [];
  let cursor = undefined;
  do {
    const body = {
      page_size: 100,
      sorts: [{ property: cfg.titleProp, direction: 'descending' }]
    };
    if (cursor) body.start_cursor = cursor;
    const data = await notionFetch('/databases/' + cfg.id + '/query', {
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

  if (!process.env.NOTION_TOKEN && (req.body || {}).action !== 'health') {
    res.status(500).json({ error: '缺少 NOTION_TOKEN 環境變數' });
    return;
  }

  const { action, db, payload } = req.body || {};

  const cfg = dbConfig(db || 'rent');
  if (action !== 'health' && (!cfg || !cfg.id)) {
    res.status(500).json({ error: '缺少資料庫 ID 環境變數(db=' + (db || 'rent') + ')' });
    return;
  }

  try {
    switch (action) {
      case 'query': {
        const pages = await queryAll(cfg);
        res.status(200).json({ results: pages });
        return;
      }
      case 'create': {
        const data = await notionFetch('/pages', {
          method: 'POST',
          body: JSON.stringify({
            parent: { database_id: cfg.id },
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
      case 'health': {
        // 三個資料庫的連線診斷(不需 db 參數)
        const keys = ['rent', 'tax', 'salary'];
        const names = { rent: '租屋費用', tax: '稅金', salary: '薪資' };
        const envNames = { rent: 'NOTION_DB_RENT', tax: 'NOTION_DB_TAX', salary: 'NOTION_DB_SALARY' };
        const out = [];
        for (const k of keys) {
          const c = dbConfig(k);
          const item = { key: k, name: names[k], env: envNames[k] };
          if (!c.id) {
            item.ok = false;
            item.error = '未設定環境變數 ' + envNames[k];
          } else {
            try {
              const info = await notionFetch('/databases/' + c.id, { method: 'GET' });
              item.ok = true;
              item.title = (info.title || []).map(t => t.plain_text).join('') || '(無標題)';
              item.props = Object.keys(info.properties || {});
              item.titleProp = c.titleProp;
              item.titlePropOk = item.props.indexOf(c.titleProp) !== -1;
            } catch (err) {
              item.ok = false;
              item.error = err.status === 404
                ? '找不到資料庫,請確認 ID 正確且已將資料庫「連接」到 integration'
                : (err.message || '連線失敗');
            }
          }
          out.push(item);
        }
        res.status(200).json({ tokenSet: !!process.env.NOTION_TOKEN, databases: out });
        return;
      }
      case 'schema': {
        const data = await notionFetch('/databases/' + cfg.id, { method: 'GET' });
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
