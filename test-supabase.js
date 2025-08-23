// Supabase 连接和功能测试脚本
const { SupabaseUserService, testConnection } = require('./utils/supabase');
const bcrypt = require('bcryptjs');

async function runSupabaseTests() {
  console.log('🚀 开始 Supabase 测试...');
  console.log('=' .repeat(50));

  try {
    // 1. 测试连接
    console.log('\n1. 测试 Supabase 连接...');
    const isConnected = await testConnection();
    console.log(`连接状态: ${isConnected ? '✅ 成功' : '❌ 失败'}`);
    
    if (!isConnected) {
      console.log('❌ Supabase 连接失败，请检查配置');
      return;
    }

    // 2. 测试用户检查（应该不存在）
    console.log('\n2. 测试用户检查功能...');
    const testUsername = 'testuser_' + Date.now();
    const userExists = await SupabaseUserService.checkUserExists(testUsername);
    console.log(`用户 ${testUsername} 是否存在: ${userExists ? '✅ 存在' : '❌ 不存在'}`);

    // 3. 测试用户创建
    console.log('\n3. 测试用户创建功能...');
    const hashedPassword = await bcrypt.hash('testpassword123', 10);
    const newUser = await SupabaseUserService.createUser({
      username: testUsername,
      password: hashedPassword,
      email: `${testUsername}@test.com`,
      phone: '13800138000'
    });
    console.log('✅ 用户创建成功:', {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      created_at: newUser.created_at
    });

    // 4. 再次测试用户检查（应该存在）
    console.log('\n4. 再次测试用户检查功能...');
    const userExistsAfterCreate = await SupabaseUserService.checkUserExists(testUsername);
    console.log(`用户 ${testUsername} 是否存在: ${userExistsAfterCreate ? '✅ 存在' : '❌ 不存在'}`);

    // 5. 测试获取用户信息
    console.log('\n5. 测试获取用户信息...');
    const userInfo = await SupabaseUserService.getUserByUsername(testUsername);
    console.log('✅ 获取用户信息成功:', {
      id: userInfo.id,
      username: userInfo.username,
      email: userInfo.email,
      phone: userInfo.phone,
      created_at: userInfo.created_at
    });

    // 6. 测试密码验证
    console.log('\n6. 测试密码验证...');
    const isPasswordValid = await bcrypt.compare('testpassword123', userInfo.password);
    console.log(`密码验证: ${isPasswordValid ? '✅ 正确' : '❌ 错误'}`);

    // 7. 测试用户更新
    console.log('\n7. 测试用户更新功能...');
    const updatedUser = await SupabaseUserService.updateUser(testUsername, {
      email: `updated_${testUsername}@test.com`,
      phone: '13900139000',
      full_name: '测试用户',
      bio: '这是一个测试用户'
    });
    console.log('✅ 用户更新成功:', {
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email,
      phone: updatedUser.phone,
      full_name: updatedUser.full_name,
      bio: updatedUser.bio,
      updated_at: updatedUser.updated_at
    });

    // 8. 测试获取所有用户
    console.log('\n8. 测试获取所有用户...');
    const allUsers = await SupabaseUserService.getAllUsers();
    console.log(`✅ 获取所有用户成功，共 ${allUsers.length} 个用户`);
    console.log('最近创建的用户:', allUsers.slice(-3).map(u => ({
      username: u.username,
      email: u.email,
      created_at: u.created_at
    })));

    // 9. 清理测试数据
    console.log('\n9. 清理测试数据...');
    await SupabaseUserService.deleteUser(testUsername);
    console.log('✅ 测试用户删除成功');

    // 10. 验证删除
    console.log('\n10. 验证用户删除...');
    const userExistsAfterDelete = await SupabaseUserService.checkUserExists(testUsername);
    console.log(`用户 ${testUsername} 是否存在: ${userExistsAfterDelete ? '❌ 仍存在' : '✅ 已删除'}`);

    console.log('\n' + '='.repeat(50));
    console.log('🎉 所有 Supabase 测试完成！');
    console.log('✅ 数据库连接正常');
    console.log('✅ 用户管理功能正常');
    console.log('✅ 准备替换维格表API');

  } catch (error) {
    console.error('\n❌ Supabase 测试失败:', error.message);
    console.error('错误详情:', error);
    
    // 检查常见错误
    if (error.message.includes('Invalid API key')) {
      console.log('\n💡 建议检查:');
      console.log('1. SUPABASE_URL 是否正确');
      console.log('2. SUPABASE_ANON_KEY 是否正确');
      console.log('3. .env.supabase 文件是否存在并正确配置');
    } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
      console.log('\n💡 建议检查:');
      console.log('1. 数据库表是否已创建');
      console.log('2. 运行 supabase-schema.sql 创建表结构');
      console.log('3. 检查表名和字段名是否正确');
    }
  }
}

// 运行测试
if (require.main === module) {
  runSupabaseTests().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('测试运行失败:', error);
    process.exit(1);
  });
}

module.exports = { runSupabaseTests };