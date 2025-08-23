// Supabase API 完整测试脚本
const http = require('http');
const https = require('https');

// 测试配置
const API_BASE_URL = 'http://localhost:3005';
const TEST_USER = {
    username: 'testuser_' + Date.now(),
    email: 'test@example.com',
    password: 'testpassword123',
    phone: '13800138000'
};

// HTTP 请求工具函数
function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const isHttps = urlObj.protocol === 'https:';
        const client = isHttps ? https : http;
        
        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || (isHttps ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };
        
        const req = client.request(requestOptions, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: jsonData
                    });
                } catch (error) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        data: data
                    });
                }
            });
        });
        
        req.on('error', reject);
        
        if (options.body) {
            req.write(JSON.stringify(options.body));
        }
        
        req.end();
    });
}

// 测试函数
async function runApiTests() {
    console.log('🚀 开始 Supabase API 测试...');
    console.log('=' .repeat(60));
    
    let authToken = null;
    
    try {
        // 1. 测试健康检查
        console.log('\n1. 测试健康检查...');
        const healthResponse = await makeRequest(`${API_BASE_URL}/api/health`);
        console.log(`状态码: ${healthResponse.statusCode}`);
        console.log(`响应: ${JSON.stringify(healthResponse.data, null, 2)}`);
        
        if (healthResponse.statusCode !== 200) {
            throw new Error('健康检查失败');
        }
        console.log('✅ 健康检查通过');
        
        // 2. 测试 Supabase 诊断
        console.log('\n2. 测试 Supabase 诊断...');
        const diagResponse = await makeRequest(`${API_BASE_URL}/api/supabase/diag`);
        console.log(`状态码: ${diagResponse.statusCode}`);
        console.log(`响应: ${JSON.stringify(diagResponse.data, null, 2)}`);
        
        if (diagResponse.statusCode !== 200) {
            throw new Error('Supabase 诊断失败');
        }
        console.log('✅ Supabase 诊断通过');
        
        // 3. 测试用户检查（应该不存在）
        console.log('\n3. 测试用户检查（用户不存在）...');
        const checkResponse1 = await makeRequest(`${API_BASE_URL}/api/users/check/${TEST_USER.username}`);
        console.log(`状态码: ${checkResponse1.statusCode}`);
        console.log(`响应: ${JSON.stringify(checkResponse1.data, null, 2)}`);
        
        if (checkResponse1.statusCode !== 200 || checkResponse1.data.data.exists !== false) {
            throw new Error('用户检查测试失败（应该不存在）');
        }
        console.log('✅ 用户检查通过（用户不存在）');
        
        // 4. 测试用户注册
        console.log('\n4. 测试用户注册...');
        const registerResponse = await makeRequest(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            body: TEST_USER
        });
        console.log(`状态码: ${registerResponse.statusCode}`);
        console.log(`响应: ${JSON.stringify(registerResponse.data, null, 2)}`);
        
        if (registerResponse.statusCode !== 201) {
            throw new Error('用户注册失败');
        }
        
        authToken = registerResponse.data.data.token;
        console.log('✅ 用户注册成功');
        console.log(`🔑 获得认证令牌: ${authToken.substring(0, 20)}...`);
        
        // 5. 测试用户检查（应该存在）
        console.log('\n5. 测试用户检查（用户存在）...');
        const checkResponse2 = await makeRequest(`${API_BASE_URL}/api/users/check/${TEST_USER.username}`);
        console.log(`状态码: ${checkResponse2.statusCode}`);
        console.log(`响应: ${JSON.stringify(checkResponse2.data, null, 2)}`);
        
        if (checkResponse2.statusCode !== 200 || checkResponse2.data.data.exists !== true) {
            throw new Error('用户检查测试失败（应该存在）');
        }
        console.log('✅ 用户检查通过（用户存在）');
        
        // 6. 测试用户登录
        console.log('\n6. 测试用户登录...');
        const loginResponse = await makeRequest(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            body: {
                username: TEST_USER.username,
                password: TEST_USER.password
            }
        });
        console.log(`状态码: ${loginResponse.statusCode}`);
        console.log(`响应: ${JSON.stringify(loginResponse.data, null, 2)}`);
        
        if (loginResponse.statusCode !== 200) {
            throw new Error('用户登录失败');
        }
        console.log('✅ 用户登录成功');
        
        // 7. 测试获取用户资料
        console.log('\n7. 测试获取用户资料...');
        const profileResponse = await makeRequest(`${API_BASE_URL}/api/profile/${TEST_USER.username}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        console.log(`状态码: ${profileResponse.statusCode}`);
        console.log(`响应: ${JSON.stringify(profileResponse.data, null, 2)}`);
        
        if (profileResponse.statusCode !== 200) {
            throw new Error('获取用户资料失败');
        }
        console.log('✅ 获取用户资料成功');
        
        // 8. 测试更新用户资料
        console.log('\n8. 测试更新用户资料...');
        const updateData = {
            email: 'updated@example.com',
            phone: '13900139000',
            full_name: '测试用户',
            bio: '这是一个测试用户的简介'
        };
        
        const updateResponse = await makeRequest(`${API_BASE_URL}/api/profile/${TEST_USER.username}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: updateData
        });
        console.log(`状态码: ${updateResponse.statusCode}`);
        console.log(`响应: ${JSON.stringify(updateResponse.data, null, 2)}`);
        
        if (updateResponse.statusCode !== 200) {
            throw new Error('更新用户资料失败');
        }
        console.log('✅ 更新用户资料成功');
        
        // 9. 测试用户验证（兼容API）
        console.log('\n9. 测试用户验证（兼容API）...');
        const validateResponse = await makeRequest(`${API_BASE_URL}/api/users/validate`, {
            method: 'POST',
            body: {
                username: TEST_USER.username,
                password: TEST_USER.password
            }
        });
        console.log(`状态码: ${validateResponse.statusCode}`);
        console.log(`响应: ${JSON.stringify(validateResponse.data, null, 2)}`);
        
        if (validateResponse.statusCode !== 200) {
            throw new Error('用户验证失败');
        }
        console.log('✅ 用户验证成功');
        
        // 10. 测试重复注册（应该失败）
        console.log('\n10. 测试重复注册（应该失败）...');
        const duplicateRegisterResponse = await makeRequest(`${API_BASE_URL}/api/register`, {
            method: 'POST',
            body: TEST_USER
        });
        console.log(`状态码: ${duplicateRegisterResponse.statusCode}`);
        console.log(`响应: ${JSON.stringify(duplicateRegisterResponse.data, null, 2)}`);
        
        if (duplicateRegisterResponse.statusCode !== 400) {
            throw new Error('重复注册测试失败（应该返回400错误）');
        }
        console.log('✅ 重复注册测试通过（正确拒绝）');
        
        // 11. 测试错误密码登录（应该失败）
        console.log('\n11. 测试错误密码登录（应该失败）...');
        const wrongPasswordResponse = await makeRequest(`${API_BASE_URL}/api/login`, {
            method: 'POST',
            body: {
                username: TEST_USER.username,
                password: 'wrongpassword'
            }
        });
        console.log(`状态码: ${wrongPasswordResponse.statusCode}`);
        console.log(`响应: ${JSON.stringify(wrongPasswordResponse.data, null, 2)}`);
        
        if (wrongPasswordResponse.statusCode !== 401) {
            throw new Error('错误密码登录测试失败（应该返回401错误）');
        }
        console.log('✅ 错误密码登录测试通过（正确拒绝）');
        
        console.log('\n' + '='.repeat(60));
        console.log('🎉 所有 Supabase API 测试完成！');
        console.log('✅ 用户注册功能正常');
        console.log('✅ 用户登录功能正常');
        console.log('✅ 用户检查功能正常');
        console.log('✅ 用户资料管理正常');
        console.log('✅ 错误处理正常');
        console.log('✅ 认证机制正常');
        console.log('');
        console.log('🔧 测试用户信息:');
        console.log(`   用户名: ${TEST_USER.username}`);
        console.log(`   邮箱: updated@example.com`);
        console.log(`   电话: 13900139000`);
        console.log('');
        console.log('💡 下一步:');
        console.log('1. 更新前端配置使用 Supabase API');
        console.log('2. 测试完整的前后端集成');
        console.log('3. 迁移现有用户数据（如果需要）');
        
    } catch (error) {
        console.error('\n❌ API 测试失败:', error.message);
        console.error('错误详情:', error);
        
        // 提供故障排除建议
        console.log('\n🔧 故障排除建议:');
        console.log('1. 确保 Supabase 后端服务器正在运行 (http://localhost:3001)');
        console.log('2. 检查 Supabase 配置和环境变量');
        console.log('3. 确认数据库表已正确创建');
        console.log('4. 检查网络连接');
        console.log('5. 查看服务器日志获取更多信息');
        
        process.exit(1);
    }
}

// 运行测试
if (require.main === module) {
    // 等待一下确保服务器启动
    setTimeout(() => {
        runApiTests().then(() => {
            console.log('\n✨ 测试完成，可以安全退出');
            process.exit(0);
        }).catch(error => {
            console.error('测试运行失败:', error);
            process.exit(1);
        });
    }, 2000);
}

module.exports = { runApiTests };