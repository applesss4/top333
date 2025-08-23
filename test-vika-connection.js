// 测试维格表连接的脚本
require('dotenv').config();
const fetch = require('node-fetch');

// 从环境变量获取配置
const VIKA_CONFIG = {
  apiToken: process.env.VIKA_API_TOKEN,
  datasheetId: process.env.VIKA_DATASHEET_ID,
  baseUrl: process.env.VIKA_BASE_URL || 'https://vika.cn/fusion/v1'
};

async function testVikaConnection() {
  console.log('=== 维格表连接测试 ===');
  
  // 检查环境变量
  console.log('环境变量检查:');
  console.log('- VIKA_API_TOKEN:', VIKA_CONFIG.apiToken ? '已设置' : '未设置');
  console.log('- VIKA_DATASHEET_ID:', VIKA_CONFIG.datasheetId ? '已设置' : '未设置');
  console.log('- VIKA_BASE_URL:', VIKA_CONFIG.baseUrl);
  
  if (!VIKA_CONFIG.apiToken || !VIKA_CONFIG.datasheetId) {
    console.error('❌ 缺少必要的环境变量');
    return false;
  }
  
  try {
    // 测试API连接
    const url = `${VIKA_CONFIG.baseUrl}/datasheets/${VIKA_CONFIG.datasheetId}/records?pageSize=1`;
    console.log('\n测试API连接:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${VIKA_CONFIG.apiToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    const responseText = await response.text();
    console.log('响应状态:', response.status);
    
    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log('✅ 维格表连接成功');
      console.log('数据表信息:', {
        success: data.success,
        recordCount: data.data?.records?.length || 0
      });
      return true;
    } else {
      console.error('❌ 维格表连接失败');
      console.error('错误响应:', responseText);
      return false;
    }
  } catch (error) {
    console.error('❌ 连接测试异常:', error.message);
    return false;
  }
}

// 运行测试
if (require.main === module) {
  testVikaConnection().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = { testVikaConnection };