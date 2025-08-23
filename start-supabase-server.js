#!/usr/bin/env node

// Supabase 后端服务器启动脚本
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🚀 启动 Supabase 后端服务器...');
console.log('=' .repeat(50));

// 检查必要文件
const requiredFiles = [
    './utils/supabase.js',
    './backend/server-supabase.js',
    './.env'
];

const missingFiles = [];
for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
        missingFiles.push(file);
    }
}

if (missingFiles.length > 0) {
    console.error('❌ 缺少必要文件:');
    missingFiles.forEach(file => console.error(`   - ${file}`));
    console.log('\n💡 请确保:');
    console.log('1. 已创建 Supabase 配置文件');
    console.log('2. 已设置环境变量');
    console.log('3. 已创建数据库表结构');
    process.exit(1);
}

// 检查环境变量
require('dotenv').config();

const requiredEnvVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY'
];

const missingEnvVars = [];
for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        missingEnvVars.push(envVar);
    }
}

if (missingEnvVars.length > 0) {
    console.error('❌ 缺少必要的环境变量:');
    missingEnvVars.forEach(envVar => console.error(`   - ${envVar}`));
    console.log('\n💡 请在 .env 文件中设置这些变量');
    console.log('参考 .env.supabase 文件或 SUPABASE_SETUP.md');
    process.exit(1);
}

console.log('✅ 环境检查通过');
console.log(`📍 Supabase URL: ${process.env.SUPABASE_URL}`);
console.log(`🔑 API Key: ${process.env.SUPABASE_ANON_KEY.substring(0, 20)}...`);

// 启动服务器
const serverPath = path.join(__dirname, 'backend', 'server-supabase.js');
const serverProcess = spawn('node', [serverPath], {
    stdio: 'inherit',
    env: { ...process.env }
});

serverProcess.on('error', (error) => {
    console.error('❌ 启动服务器失败:', error.message);
    process.exit(1);
});

serverProcess.on('exit', (code) => {
    if (code !== 0) {
        console.error(`❌ 服务器异常退出，退出码: ${code}`);
        process.exit(code);
    }
});

// 优雅关闭
process.on('SIGINT', () => {
    console.log('\n🛑 正在关闭服务器...');
    serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
    console.log('\n🛑 正在关闭服务器...');
    serverProcess.kill('SIGTERM');
});

console.log('\n📋 使用说明:');
console.log('- 服务器将在 http://localhost:3001 启动');
console.log('- 按 Ctrl+C 停止服务器');
console.log('- 访问 http://localhost:3001/api/health 检查服务状态');
console.log('- 访问 http://localhost:3001/api/supabase/diag 查看诊断信息');
console.log('');