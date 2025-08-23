// 通过SQL API创建Supabase表结构的脚本
require('dotenv').config({ path: '.env.supabase' });
const fetch = require('node-fetch');
const fs = require('fs');

// Supabase 配置
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('错误: 缺少Supabase配置。请确保.env.supabase文件中包含SUPABASE_URL和SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// 读取SQL脚本
const sqlScript = fs.readFileSync('setup-schedule-shops-tables.sql', 'utf8');

// 通过SQL API执行SQL脚本
async function executeSqlScript() {
  console.log('开始执行SQL脚本创建表结构...');
  
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey
      },
      body: JSON.stringify({
        source: sqlScript
      })
    });
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ SQL脚本执行成功:', result);
    } else {
      console.error('❌ SQL脚本执行失败:', result);
    }
  } catch (error) {
    console.error('❌ 执行SQL脚本时出错:', error);
  }
}

// 执行SQL脚本
executeSqlScript();