const axios = require('axios');

async function testShopAPI() {
    try {
        console.log('测试创建店铺API...');
        
        const response = await axios.post('http://localhost:3001/api/shops', {
            name: '新测试店铺',
            code: 'newtest' + Date.now()
        }, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('成功:', response.data);
    } catch (error) {
        console.error('错误:', error.response?.data || error.message);
        console.error('状态码:', error.response?.status);
    }
}

testShopAPI();