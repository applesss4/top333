// Vercel无服务器函数 - 店铺管理 (Supabase版本)
// 使用Supabase替代维格表

const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, optionalAuth } = require('./middleware/auth');

// Supabase配置
const supabaseUrl = process.env.SUPABASE_URL || 'https://paumgahictuhluhuudws.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseKey);

// 解析请求体（在某些环境中 req.body 可能未被自动解析）
async function parseJsonBody(req) {
    if (req.body && typeof req.body === 'object') return req.body;
    const contentType = req.headers['content-type'] || '';
    if (!contentType.includes('application/json')) return {};
    return new Promise((resolve, reject) => {
        let data = '';
        req.on('data', chunk => (data += chunk));
        req.on('end', () => {
            try {
                const parsed = data ? JSON.parse(data) : {};
                resolve(parsed);
            } catch (e) {
                resolve({});
            }
        });
        req.on('error', reject);
    });
}

module.exports = async (req, res) => {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // 处理预检请求
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // 检查必要的环境变量
    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({
            success: false,
            message: 'Supabase配置缺失'
        });
    }
    
    const { method, url } = req;
    const urlParts = url.split('/');
    const shopId = urlParts[urlParts.length - 1];
    
    // JWT认证检查
    const user = authenticateToken(req, res);
    if (!user) {
        return; // 认证失败，已在中间件中返回错误响应
    }
    req.user = user; // 将用户信息附加到请求对象
    
    try {
        if (method === 'GET') {
            // 获取店铺信息
            if (shopId && shopId !== 'shops') {
                // 获取单个店铺信息
                const { data, error } = await supabase
                    .from('shops')
                    .select('*')
                    .eq('id', shopId)
                    .single();
                
                if (error) {
                    throw error;
                }
                
                if (!data) {
                    return res.status(404).json({
                        success: false,
                        message: '未找到指定的店铺'
                    });
                }
                
                // 转换为前端期望的格式
                const shop = {
                    id: data.id,
                    name: data.name || '',
                    address: data.address || '',
                    contact: data.contact || '',
                    phone: data.phone || '',
                    notes: data.notes || '',
                    createdAt: data.created_at || ''
                };
                
                res.status(200).json({
                    success: true,
                    record: shop
                });
                
            } else {
                // 获取所有店铺信息
                const { data, error } = await supabase
                    .from('shops')
                    .select('*')
                    .order('name', { ascending: true });
                
                if (error) {
                    throw error;
                }
                
                // 转换为前端期望的格式
                const shops = data.map(record => ({
                    id: record.id,
                    name: record.name || '',
                    address: record.address || '',
                    contact: record.contact || '',
                    phone: record.phone || '',
                    notes: record.notes || '',
                    createdAt: record.created_at || ''
                }));
                
                res.status(200).json({
                    success: true,
                    records: shops
                });
            }
            
        } else if (method === 'POST') {
            // 创建店铺
            const body = await parseJsonBody(req);
            const { name, address, contact, phone, notes } = body;
            
            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: '店铺名称为必填项'
                });
            }
            
            // 准备插入数据
            const shopData = {
                name,
                address: address || '',
                contact: contact || '',
                phone: phone || '',
                notes: notes || '',
                created_at: new Date().toISOString(),
                created_by: req.user?.username || ''
            };
            
            // 插入数据
            const { data, error } = await supabase
                .from('shops')
                .insert([shopData])
                .select();
            
            if (error) {
                throw error;
            }
            
            res.status(201).json({
                success: true,
                message: '店铺创建成功',
                record: data[0]
            });
            
        } else if (method === 'PUT') {
            // 更新店铺
            if (!shopId || shopId === 'shops') {
                return res.status(400).json({
                    success: false,
                    message: '缺少店铺ID'
                });
            }
            
            const body = await parseJsonBody(req);
            
            // 准备更新数据
            const updateData = {};
            if (body.name !== undefined) updateData.name = body.name;
            if (body.address !== undefined) updateData.address = body.address;
            if (body.contact !== undefined) updateData.contact = body.contact;
            if (body.phone !== undefined) updateData.phone = body.phone;
            if (body.notes !== undefined) updateData.notes = body.notes;
            updateData.updated_at = new Date().toISOString();
            updateData.updated_by = req.user?.username || '';
            
            // 更新数据
            const { data, error } = await supabase
                .from('shops')
                .update(updateData)
                .eq('id', shopId)
                .select();
            
            if (error) {
                throw error;
            }
            
            if (!data || data.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '未找到指定的店铺'
                });
            }
            
            res.status(200).json({
                success: true,
                message: '店铺更新成功',
                record: data[0]
            });
            
        } else if (method === 'DELETE') {
            // 删除店铺
            if (!shopId || shopId === 'shops') {
                return res.status(400).json({
                    success: false,
                    message: '缺少店铺ID'
                });
            }
            
            // 删除数据
            const { error } = await supabase
                .from('shops')
                .delete()
                .eq('id', shopId);
            
            if (error) {
                throw error;
            }
            
            res.status(200).json({
                success: true,
                message: '店铺删除成功'
            });
            
        } else {
            res.status(405).json({
                success: false,
                message: '不支持的请求方法'
            });
        }
    } catch (error) {
        console.error('店铺API错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '服务器内部错误',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
};