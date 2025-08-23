// 测试API端点的脚本
const http = require('http');

function testAPI(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3002,
      path: path,
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`\n=== 测试 ${path} ===`);
        console.log(`状态码: ${res.statusCode}`);
        console.log(`响应头:`, res.headers);
        console.log(`响应体:`, data);
        resolve({ statusCode: res.statusCode, data, headers: res.headers });
      });
    });
    
    req.on('error', (err) => {
      console.error(`请求错误:`, err);
      reject(err);
    });
    
    req.end();
  });
}

async function runTests() {
  try {
    // 测试诊断端点
    await testAPI('/api/users?diag=1');
    
    // 测试用户检查端点
    await testAPI('/api/users/check/testuser');
    
    console.log('\n所有测试完成');
  } catch (error) {
    console.error('测试失败:', error);
  }
}

runTests();