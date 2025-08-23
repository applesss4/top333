const axios = require('axios');
require('dotenv').config({ path: '.env.supabase' });

const API_BASE_URL = 'http://localhost:3001/api';

// 生成随机测试用户
const generateTestUser = () => {
    const timestamp = Date.now().toString().slice(-8); // 只取后8位
    return {
        username: `test${timestamp}`,
        email: `test${timestamp}@example.com`,
        password: 'TestPassword123!'
    };
};

async function testFrontendBackendIntegration() {
    console.log('🧪 开始测试前端后端集成...');
    
    const testUser = generateTestUser();
    console.log(`测试用户: ${testUser.username}`);
    
    try {
        // 1. 测试健康检查
        console.log('\n1. 测试后端健康检查...');
        const healthResponse = await axios.get(`${API_BASE_URL}/health`);
        console.log('✅ 后端健康检查通过:', healthResponse.data);
        
        // 2. 测试用户名检查（应该不存在）
        console.log('\n2. 测试用户名检查...');
        const checkResponse = await axios.get(`${API_BASE_URL}/users/check/${testUser.username}`);
        console.log('✅ 用户名检查成功:', checkResponse.data);
        
        if (checkResponse.data.data.exists) {
            throw new Error('测试用户已存在，请重新运行测试');
        }
        
        // 3. 测试用户注册
        console.log('\n3. 测试用户注册...');
        const registerResponse = await axios.post(`${API_BASE_URL}/register`, testUser);
        console.log('✅ 用户注册成功:', {
            id: registerResponse.data.data.id,
            username: registerResponse.data.data.username,
            email: registerResponse.data.data.email,
            hasToken: !!registerResponse.data.data.token
        });
        
        const token = registerResponse.data.data.token;
        
        // 4. 测试用户登录
        console.log('\n4. 测试用户登录...');
        const loginResponse = await axios.post(`${API_BASE_URL}/login`, {
            username: testUser.username,
            password: testUser.password
        });
        console.log('✅ 用户登录成功:', {
            id: loginResponse.data.data.id,
            username: loginResponse.data.data.username,
            email: loginResponse.data.data.email,
            hasToken: !!loginResponse.data.data.token
        });
        
        // 5. 测试错误密码登录
        console.log('\n5. 测试错误密码登录...');
        try {
            await axios.post(`${API_BASE_URL}/login`, {
                username: testUser.username,
                password: 'wrongpassword'
            });
            throw new Error('错误密码登录应该失败');
        } catch (error) {
            if (error.response && error.response.status === 401) {
                console.log('✅ 错误密码登录正确被拒绝');
            } else {
                throw error;
            }
        }
        
        // 6. 测试重复注册
        console.log('\n6. 测试重复注册...');
        try {
            await axios.post(`${API_BASE_URL}/register`, testUser);
            throw new Error('重复注册应该失败');
        } catch (error) {
            if (error.response && error.response.status === 409) {
                console.log('✅ 重复注册正确被拒绝');
            } else {
                throw error;
            }
        }
        
        // 7. 测试带认证的API（用户名检查再次确认存在）
        console.log('\n7. 测试用户存在性确认...');
        const checkExistsResponse = await axios.get(`${API_BASE_URL}/users/check/${testUser.username}`);
        console.log('✅ 用户存在性确认:', checkExistsResponse.data);
        
        if (!checkExistsResponse.data.data.exists) {
            throw new Error('用户应该存在但检查结果为不存在');
        }
        
        console.log('\n🎉 所有前端后端集成测试通过！');
        console.log('\n📋 测试总结:');
        console.log('- ✅ 后端健康检查');
        console.log('- ✅ 用户名可用性检查');
        console.log('- ✅ 用户注册功能');
        console.log('- ✅ 用户登录功能');
        console.log('- ✅ 错误密码验证');
        console.log('- ✅ 重复注册防护');
        console.log('- ✅ 用户存在性验证');
        
    } catch (error) {
        console.error('❌ 集成测试失败:', error.message);
        if (error.response) {
            console.error('响应状态:', error.response.status);
            console.error('响应数据:', error.response.data);
        }
        process.exit(1);
    }
}

// 运行测试
testFrontendBackendIntegration();