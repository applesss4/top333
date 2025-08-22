require('dotenv').config({ path: '../.env' });
const { checkUserExists } = require('./utils/vikaApi');

async function testCheckUser() {
    console.log('=== 测试checkUserExists函数 ===');
    
    try {
        console.log('测试alice用户...');
        const result = await checkUserExists('alice');
        console.log('结果:', result);
        console.log('用户存在:', !!result);
        
        if (result) {
            console.log('用户信息:', {
                username: result.fields?.username,
                email: result.fields?.email,
                recordId: result.recordId
            });
        }
        
    } catch (error) {
        console.error('测试失败:', error.message);
        console.error('错误详情:', error);
    }
}

testCheckUser();