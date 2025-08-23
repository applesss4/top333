// 简单的测试服务器来验证API功能
require('dotenv').config();
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');

// 导入API处理函数
const usersHandler = require('./api/users.js');

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // API路由
  if (pathname.startsWith('/api/users')) {
    try {
      // 模拟Vercel的请求/响应对象
      const mockReq = {
        method: req.method,
        url: req.url,
        headers: req.headers,
        query: parsedUrl.query,
        body: '',
        on: (event, callback) => {
          // 模拟事件监听器，但对于GET请求不需要处理
          if (event === 'data' || event === 'end') {
            // 对于GET请求，立即触发end事件
            if (event === 'end') {
              setTimeout(callback, 0);
            }
          }
        }
      };
      
      // 收集请求体
      if (req.method === 'POST') {
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', async () => {
          try {
            mockReq.body = JSON.parse(body);
          } catch (e) {
            mockReq.body = body;
          }
          
          const mockRes = {
            status: (code) => {
              res.statusCode = code;
              return mockRes;
            },
            json: (data) => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
            },
            send: (data) => {
              res.end(data);
            },
            setHeader: (name, value) => {
              res.setHeader(name, value);
            }
          };
          
          await usersHandler(mockReq, mockRes);
        });
      } else {
        const mockRes = {
          status: (code) => {
            res.statusCode = code;
            return mockRes;
          },
          json: (data) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
          },
          send: (data) => {
            res.end(data);
          },
          setHeader: (name, value) => {
            res.setHeader(name, value);
          }
        };
        
        await usersHandler(mockReq, mockRes);
      }
    } catch (error) {
      console.error('API Error:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Internal Server Error', details: error.message }));
    }
  } else {
    // 静态文件服务
    const filePath = pathname === '/' ? '/public/index.html' : pathname;
    const fullPath = path.join(__dirname, filePath);
    
    fs.readFile(fullPath, (err, data) => {
      if (err) {
        res.statusCode = 404;
        res.end('File not found');
      } else {
        const ext = path.extname(fullPath);
        const contentType = {
          '.html': 'text/html',
          '.js': 'application/javascript',
          '.css': 'text/css',
          '.json': 'application/json'
        }[ext] || 'text/plain';
        
        res.setHeader('Content-Type', contentType);
        res.end(data);
      }
    });
  }
});

const PORT = 3002;
server.listen(PORT, () => {
  console.log(`测试服务器运行在 http://localhost:${PORT}`);
  console.log('API端点: http://localhost:3002/api/users');
  console.log('诊断端点: http://localhost:3002/api/users?diag=1');
});