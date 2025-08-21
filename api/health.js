// Vercel 无服务器函数 - 健康检查端点
// 统一检查运行时、环境变量、以及与维格表的连通性

// 在 Node.js 18+（Vercel Node.js 20 运行时）已内置 fetch，这里直接使用全局 fetch，避免对 node-fetch 的打包依赖导致函数构建失败
const safeFetch = fetch;

const VIKA_CONFIG = {
  apiToken: process.env.VIKA_API_TOKEN,
  userDatasheetId: process.env.VIKA_DATASHEET_ID,
  scheduleDatasheetId: process.env.VIKA_SCHEDULE_DATASHEET_ID,
  baseUrl: process.env.VIKA_BASE_URL || 'https://vika.cn/fusion/v1'
};

async function callVikaAPI(method, endpoint) {
  const url = `${VIKA_CONFIG.baseUrl}${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${VIKA_CONFIG.apiToken}`,
      'Content-Type': 'application/json'
    }
  };
  const response = await safeFetch(url, options);
  const rawText = await response.text();
  let result;
  try {
    result = rawText ? JSON.parse(rawText) : {};
  } catch (_) {
    result = { raw: rawText };
  }
  if (!response.ok) {
    const err = new Error(result?.message || result?.msg || result?.code || `Vika API error: ${response.status}`);
    err.status = response.status;
    err.details = result;
    err.url = url;
    throw err;
  }
  return result;
}

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  const env = {
    hasGlobalFetch: typeof fetch === 'function',
    runtime: process.version,
    hasToken: !!VIKA_CONFIG.apiToken,
    hasUserSheetId: !!VIKA_CONFIG.userDatasheetId,
    hasScheduleId: !!VIKA_CONFIG.scheduleDatasheetId,
    baseUrl: VIKA_CONFIG.baseUrl
  };

  const checks = { vikaUsers: { ok: null }, vikaSchedule: { ok: null } };

  // 检查用户表连通性
  if (VIKA_CONFIG.apiToken && VIKA_CONFIG.userDatasheetId) {
    try {
      const r = await callVikaAPI('GET', `/datasheets/${VIKA_CONFIG.userDatasheetId}/records?pageSize=1&fieldKey=name`);
      checks.vikaUsers.ok = true;
      checks.vikaUsers.total = r?.data?.total ?? null;
      checks.vikaUsers.sample = Array.isArray(r?.data?.records) ? r.data.records.slice(0,1) : [];
    } catch (e) {
      checks.vikaUsers.ok = false;
      checks.vikaUsers.error = e.message || 'Unknown error';
      checks.vikaUsers.status = e.status || null;
    }
  } else {
    checks.vikaUsers.ok = false;
    checks.vikaUsers.error = 'Missing token or user datasheet id';
  }

  // 检查日程表连通性
  if (VIKA_CONFIG.apiToken && VIKA_CONFIG.scheduleDatasheetId) {
    try {
      const r = await callVikaAPI('GET', `/datasheets/${VIKA_CONFIG.scheduleDatasheetId}/records?pageSize=1&fieldKey=name`);
      checks.vikaSchedule.ok = true;
      checks.vikaSchedule.total = r?.data?.total ?? null;
      checks.vikaSchedule.sample = Array.isArray(r?.data?.records) ? r.data.records.slice(0,1) : [];
    } catch (e) {
      checks.vikaSchedule.ok = false;
      checks.vikaSchedule.error = e.message || 'Unknown error';
      checks.vikaSchedule.status = e.status || null;
    }
  } else {
    checks.vikaSchedule.ok = false;
    checks.vikaSchedule.error = 'Missing token or schedule datasheet id';
  }

  return res.status(200).json({
    ok: true,
    message: 'Health OK',
    timestamp: new Date().toISOString(),
    env,
    checks
  });
};
