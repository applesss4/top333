require('dotenv').config({ path: '../.env' });
const { callVika, VIKA_CONFIG } = require('./utils/vikaApi');

async function debugVika() {
    console.log('=== 维格表API调试 ===');
    console.log('配置信息:');
    console.log('API Token:', VIKA_CONFIG.apiToken ? VIKA_CONFIG.apiToken.substring(0, 10) + '...' : '未设置');
    console.log('Datasheet ID:', VIKA_CONFIG.datasheetId || '未设置');
    console.log('Base URL:', VIKA_CONFIG.baseUrl);
    
    if (!VIKA_CONFIG.apiToken || !VIKA_CONFIG.datasheetId) {
        console.error('❌ 环境变量未正确设置');
        return;
    }
    
    try {
        console.log('\n=== 测试获取用户数据 ===');
        const response = await callVika('GET', `/datasheets/${VIKA_CONFIG.datasheetId}/records?fieldKey=name`);
        
        console.log('API调用结果:');
        console.log('Success:', response.success);
        
        if (response.success && response.data && response.data.records) {
            console.log('用户记录数量:', response.data.records.length);
            
            response.data.records.forEach((record, index) => {
                const fields = record.fields || {};
                console.log(`${index + 1}. 用户名: ${fields.username || '未知'}, 邮箱: ${fields.email || '未知'}`);
            });
        } else {
            console.log('响应数据:', JSON.stringify(response, null, 2));
        }
        
        // 测试特定用户查询
        console.log('\n=== 测试查询alice用户 ===');
        const filter = encodeURIComponent(`{username} = "alice"`);
        const aliceResponse = await callVika('GET', `/datasheets/${VIKA_CONFIG.datasheetId}/records?fieldKey=name&filterByFormula=${filter}`);
        
        console.log('Alice查询结果:');
        console.log('Success:', aliceResponse.success);
        if (aliceResponse.success && aliceResponse.data && aliceResponse.data.records) {
            console.log('找到记录数:', aliceResponse.data.records.length);
            if (aliceResponse.data.records.length > 0) {
                const userFields = aliceResponse.data.records[0].fields;
                console.log('用户信息:', {
                    username: userFields.username,
                    email: userFields.email,
                    hasPassword: !!userFields.password
                });
            }
        } else {
            console.log('Alice查询响应:', JSON.stringify(aliceResponse, null, 2));
        }
        
    } catch (error) {
        console.error('❌ API调用失败:', error.message);
        if (error.response) {
            console.error('状态码:', error.response.status);
            console.error('响应数据:', error.response.data);
        }
    }
}

debugVika();