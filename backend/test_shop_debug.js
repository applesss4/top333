const axios = require('axios');

async function testShopCreation() {
    try {
        console.log('测试店铺创建API...');
        
        const testData = {
            name: '测试店铺' + Date.now(),
            code: 'test' + Date.now()
        };
        
        console.log('发送数据:', testData);
        
        const response = await axios.post('http://localhost:3001/api/shops', testData, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });
        
        console.log('响应状态:', response.status);
        console.log('响应头:', response.headers['content-type']);
        console.log('响应数据:', JSON.stringify(response.data, null, 2));
        
    } catch (error) {
        console.error('请求失败:');
        console.error('状态码:', error.response?.status);
        console.error('响应头:', error.response?.headers['content-type']);
        console.error('响应数据:', error.response?.data);
        console.error('错误信息:', error.message);
        
        // 如果响应是HTML，显示前100个字符
        if (error.response?.data && typeof error.response.data === 'string') {
            console.error('HTML响应预览:', error.response.data.substring(0, 100));
        }
    }
}

testShopCreation();