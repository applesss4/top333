// 测试用户注册功能
const http = require('http');

function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log(`\n=== ${method} ${path} ===`);
        console.log(`状态码: ${res.statusCode}`);
        console.log(`响应体:`, responseData);
        resolve({ statusCode: res.statusCode, data: responseData, headers: res.headers });
      });
    });
    
    req.on('error', (err) => {
      console.error(`请求错误:`, err);
      reject(err);
    });
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testRegistration() {
  try {
    const testUser = {
      username: 'testuser' + Date.now(),
      email: 'test' + Date.now() + '@example.com',
      password: 'testpassword123'
    };
    
    console.log('测试用户数据:', testUser);
    
    // 1. 检查用户是否存在（应该不存在）
    await makeRequest(`/api/users/check/${testUser.username}`);
    
    // 2. 注册新用户
    await makeRequest('/api/users', 'POST', testUser);
    
    // 3. 再次检查用户是否存在（应该存在）
    await makeRequest(`/api/users/check/${testUser.username}`);
    
    // 4. 尝试登录
    await makeRequest('/api/users', 'POST', {
      username: testUser.username,
      password: testUser.password
    });
    
    console.log('\n✅ 用户注册和登录测试完成');
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

testRegistration();