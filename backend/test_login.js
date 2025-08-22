const axios = require('axios');

// 测试登录功能
async function testLogin() {
    try {
        console.log('测试登录功能...');
        
        // 测试登录请求
        const loginResponse = await axios.post('http://localhost:3001/api/login', {
            username: 'alice',  // 使用已知存在的用户
            password: '123456'  // 使用正确的密码
        });
        
        console.log('登录成功:', loginResponse.data);
        
    } catch (error) {
        console.error('登录失败:');
        if (error.response) {
            console.error('状态码:', error.response.status);
            console.error('错误信息:', error.response.data);
        } else {
            console.error('网络错误:', error.message);
        }
    }
}

// 测试用户检查接口
async function testUserCheck() {
    try {
        console.log('\n测试用户检查接口...');
        
        const checkResponse = await axios.get('http://localhost:3001/api/users/check/alice');
        console.log('用户检查结果:', checkResponse.data);
        
    } catch (error) {
        console.error('用户检查失败:');
        if (error.response) {
            console.error('状态码:', error.response.status);
            console.error('错误信息:', error.response.data);
        } else {
            console.error('网络错误:', error.message);
        }
    }
}

// 运行测试
async function runTests() {
    await testUserCheck();
    await testLogin();
}

runTests();