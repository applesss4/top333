// Vercel无服务器函数 - 工作日程管理 (Supabase版本)
// 使用Supabase替代维格表

const { createClient } = require('@supabase/supabase-js');
const { authenticateToken, optionalAuth } = require('./middleware/auth');

// Supabase配置
const supabaseUrl = process.env.SUPABASE_URL || 'https://paumgahictuhluhuudws.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

// 创建Supabase客户端
const supabase = createClient(supabaseUrl, supabaseKey);

// 确保备注中包含用户标签 [@user:username]
function ensureUserTag(notes, username) {
    if (!username) return notes || '';
    const tag = `[@user:${username}]`;
    const src = (notes || '').trim();
    return src.includes(tag) ? src : `${src}${src ? ' ' : ''}${tag}`;
}

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
    
    const { method, url, query } = req;
    const urlParts = url.split('/');

    // 统一获取查询参数的工具函数（兼容不同平台）
    const getQueryParam = (name) => {
        try {
            if (query && Object.prototype.hasOwnProperty.call(query, name)) return query[name];
            const u = new URL(req.url, 'http://localhost');
            return u.searchParams.get(name);
        } catch (_) { return undefined; }
    };

    // JWT认证检查（诊断模式除外）
    const diag = getQueryParam('diag');
    const isDiagMode = (method === 'GET' && (diag === '1' || diag === 'true'));
    
    if (!isDiagMode) {
        const user = authenticateToken(req, res);
        if (!user) {
            return; // 认证失败，已在中间件中返回错误响应
        }
        req.user = user; // 将用户信息附加到请求对象
    }

    // 统一解析 JSON 请求体
    const body = await parseJsonBody(req);
    
    try {
        if (method === 'GET') {
            // 诊断模式：仅检查与Supabase的连通性
            if (isDiagMode) {
                const envInfo = {
                    hasSupabaseUrl: !!supabaseUrl,
                    hasSupabaseKey: !!supabaseKey,
                    runtime: process.version
                };
                try {
                    // 测试Supabase连接
                    const { data, error, count } = await supabase
                        .from('schedules')
                        .select('*', { count: 'exact' })
                        .limit(1);
                    
                    if (error) throw error;
                    
                    return res.status(200).json({
                        success: true,
                        total: count,
                        sample: data,
                        message: 'Supabase API accessible',
                        env: envInfo
                    });
                } catch (e) {
                    return res.status(500).json({
                        success: false,
                        error: e?.message || String(e),
                        code: e?.code || e?.status || undefined,
                        details: e?.details || undefined,
                        env: envInfo
                    });
                }
            }

            // 获取工作日程列表
            const username = getQueryParam('username');
            const date = getQueryParam('date');
            
            // 构建查询
            let query = supabase.from('schedules').select('*');
            
            // 添加过滤条件
            if (username) {
                query = query.eq('username', username);
            }
            if (date) {
                query = query.eq('work_date', date);
            }
            
            // 执行查询
            const { data, error } = await query;
            
            if (error) {
                throw error;
            }
            
            // 转换为前端期望的格式
            const schedules = data.map(record => ({
                id: record.id,
                username: record.username || '',
                workStore: record.work_store || [],
                workDate: record.work_date || '',
                startTime: record.start_time || '',
                endTime: record.end_time || '',
                duration: record.duration || 0,
                notes: record.notes || '',
                createdAt: record.created_at || ''
            }));
            
            res.status(200).json({
                success: true,
                records: schedules
            });
            
        } else if (method === 'POST') {
            // 创建工作日程
            const { username, workStore, workDate, startTime, endTime, duration, notes } = body;
            
            if (!workStore || !workDate || !startTime || !endTime) {
                return res.status(400).json({
                    success: false,
                    message: '必填字段缺失'
                });
            }
            
            // 准备插入数据
            const scheduleData = {
                username: username || req.user?.username,
                work_store: Array.isArray(workStore) ? workStore : [workStore],
                work_date: new Date(workDate).toISOString().split('T')[0],
                start_time: startTime,
                end_time: endTime,
                duration: duration ?? null,
                notes: ensureUserTag(notes || '', username || req.user?.username),
                created_at: new Date().toISOString()
            };
            
            // 插入数据
            const { data, error } = await supabase
                .from('schedules')
                .insert([scheduleData])
                .select();
            
            if (error) {
                throw error;
            }
            
            res.status(201).json({
                success: true,
                message: '工作日程创建成功',
                record: data[0]
            });
            
        } else if (method === 'PUT') {
            // 更新工作日程
            const scheduleId = urlParts[urlParts.length - 1];
            
            if (!scheduleId) {
                return res.status(400).json({
                    success: false,
                    message: '缺少日程ID'
                });
            }
            
            // 准备更新数据
            const updateData = {};
            if (body.workStore) updateData.work_store = Array.isArray(body.workStore) ? body.workStore : [body.workStore];
            if (body.workDate) updateData.work_date = new Date(body.workDate).toISOString().split('T')[0];
            if (body.startTime) updateData.start_time = body.startTime;
            if (body.endTime) updateData.end_time = body.endTime;
            if (body.duration !== undefined) updateData.duration = body.duration;
            if (body.notes !== undefined) updateData.notes = ensureUserTag(body.notes, body.username || req.user?.username);
            updateData.updated_at = new Date().toISOString();
            
            // 更新数据
            const { data, error } = await supabase
                .from('schedules')
                .update(updateData)
                .eq('id', scheduleId)
                .select();
            
            if (error) {
                throw error;
            }
            
            if (!data || data.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: '未找到指定的工作日程'
                });
            }
            
            res.status(200).json({
                success: true,
                message: '工作日程更新成功',
                record: data[0]
            });
            
        } else if (method === 'DELETE') {
            // 删除工作日程
            const scheduleId = urlParts[urlParts.length - 1];
            
            if (!scheduleId) {
                return res.status(400).json({
                    success: false,
                    message: '缺少日程ID'
                });
            }
            
            // 删除数据
            const { data, error } = await supabase
                .from('schedules')
                .delete()
                .eq('id', scheduleId);
            
            if (error) {
                throw error;
            }
            
            res.status(200).json({
                success: true,
                message: '工作日程删除成功'
            });
            
        } else {
            res.status(405).json({
                success: false,
                message: '不支持的请求方法'
            });
        }
    } catch (error) {
        console.error('工作日程API错误:', error);
        res.status(500).json({
            success: false,
            message: error.message || '服务器内部错误',
            error: process.env.NODE_ENV === 'development' ? error : undefined
        });
    }
};