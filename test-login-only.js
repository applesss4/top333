require('dotenv').config({ path: '.env.supabase' });
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testLogin() {
  try {
    console.log('🧪 测试用户登录功能...');
    
    // 使用之前注册的用户进行登录测试
    const testUsers = [
      { username: 'test17983551', password: 'test123456' },
      { username: 'test18099843', password: 'test123456' }
    ];
    
    for (const user of testUsers) {
      console.log(`\n🔐 尝试登录用户: ${user.username}`);
      
      try {
        const response = await axios.post(`${BASE_URL}/api/login`, {
          username: user.username,
          password: user.password
        });
        
        console.log('✅ 登录成功:', {
          username: response.data.data?.username,
          hasToken: !!response.data.data?.token,
          message: response.data.message
        });
        
        // 如果登录成功，就停止测试
        console.log('\n🎉 登录功能测试通过！');
        return;
        
      } catch (error) {
        console.log('❌ 登录失败:', {
          status: error.response?.status,
          message: error.response?.data?.message || error.message
        });
      }
    }
    
    console.log('\n⚠️ 所有测试用户登录都失败了');
    
  } catch (error) {
    console.error('❌ 测试过程中出错:', error.message);
  }
}

testLogin();