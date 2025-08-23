module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ ok: false, message: 'Method Not Allowed' });

  // 检查Supabase环境变量是否配置
  const supabaseConfigured = !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  return res.status(200).json({ 
    ok: true, 
    message: 'API is working with Supabase!', 
    timestamp: new Date().toISOString(),
    runtime: process.version,
    supabaseConfigured: supabaseConfigured
  });
};