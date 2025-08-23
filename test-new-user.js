require('dotenv').config({ path: '.env.supabase' });
const axios = require('axios');

const BASE_URL = 'http://localhost:3001';

async function testNewUser() {
  try {
    const timestamp = Date.now();
    const testUser = {
      username: `newuser${timestamp}`,
      email: `newuser${timestamp}@example.com`,
      password: 'newpass123'
    };
    
    console.log('🧪 测试新用户注册和登录流程...');
    console.log('测试用户:', testUser.username);
    
    // 1. 检查用户名是否可用
    console.log('\n1. 检查用户名可用性...');
    try {
      const checkResponse = await axios.get(`${BASE_URL}/api/users/check/${testUser.username}`);
      console.log('✅ 用户名检查:', checkResponse.data);
    } catch (error) {
      console.log('❌ 用户名检查失败:', error.response?.data || error.message);
      return;
    }
    
    // 2. 注册新用户
    console.log('\n2. 注册新用户...');
    let registrationResponse;
    try {
      registrationResponse = await axios.post(`${BASE_URL}/api/register`, testUser);
      console.log('✅ 注册成功:', {
        success: registrationResponse.data.success,
        message: registrationResponse.data.message,
        hasToken: !!registrationResponse.data.data?.token
      });
    } catch (error) {
      console.log('❌ 注册失败:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message
      });
      return;
    }
    
    // 3. 等待一秒确保数据已保存
    console.log('\n⏳ 等待数据保存...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 4. 使用新注册的用户登录
    console.log('\n3. 测试登录...');
    try {
      const loginResponse = await axios.post(`${BASE_URL}/api/login`, {
        username: testUser.username,
        password: testUser.password
      });
      
      console.log('✅ 登录成功:', {
        username: loginResponse.data.data?.username,
        hasToken: !!loginResponse.data.data?.token,
        message: loginResponse.data.message
      });
      
      console.log('\n🎉 完整的注册和登录流程测试通过！');
      
    } catch (error) {
      console.log('❌ 登录失败:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        details: error.response?.data?.details
      });
    }
    
  } catch (error) {
    console.error('❌ 测试过程中出错:', error.message);
  }
}

testNewUser();