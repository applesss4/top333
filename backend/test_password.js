const bcrypt = require('bcryptjs');

// 测试密码验证
async function testPassword() {
    const plainPassword = '123456';
    const hashedPassword = '$2a$10$rbVtih0uiWTH/Ur/er8BB.dnti/VzxD0lqY1N0S.XOWDZvgSKoIom';
    
    console.log('明文密码:', plainPassword);
    console.log('哈希密码:', hashedPassword);
    
    const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
    console.log('密码匹配:', isMatch);
    
    // 测试其他可能的密码
    const testPasswords = ['alice', 'password', 'alice123', '123456789'];
    
    for (const testPwd of testPasswords) {
        const match = await bcrypt.compare(testPwd, hashedPassword);
        console.log(`密码 '${testPwd}' 匹配:`, match);
    }
}

testPassword().catch(console.error);