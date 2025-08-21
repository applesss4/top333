module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, message: 'Method Not Allowed' });

  // 检查维格表环境变量是否配置
  const vikaConfigured = !!(process.env.VIKA_API_TOKEN && process.env.VIKA_DATASHEET_ID);
  
  return res.status(200).json({ 
    ok: true, 
    message: vikaConfigured ? 'API is working with Vika!' : 'API is working with local storage!', 
    timestamp: new Date().toISOString(),
    runtime: process.version,
    vikaConfigured: vikaConfigured
  });
};