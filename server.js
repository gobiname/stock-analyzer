/**
 * 股票量化分析 API 服务
 * 
 * 使用方法:
 * 1. npm install
 * 2. npm start
 * 3. 小程序开发时需勾选"不校验合法域名"
 */

const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 解析命令行输出的表格数据
function parseTableToJson(stdout) {
  const lines = stdout.trim().split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split('|')
    .filter(h => h.trim())
    .map(h => h.trim());

  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('---')) continue;

    const values = line.split('|')
      .filter(v => v.trim())
      .map(v => v.trim());

    if (values.length === headers.length) {
      const row = {};
      let validValueCount = 0;
      headers.forEach((header, index) => {
        const val = values[index] || '';
        row[header] = val;
        // 统计有效值（不是 - 或空字符串）
        if (val && val !== '-') validValueCount++;
      });
      // 至少有一半字段有有效值才算有效数据
      if (validValueCount >= headers.length / 2) {
        data.push(row);
      }
    }
  }
  return data;
}

function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
      } else {
        resolve(stdout);
      }
    });
  });
}

// 搜索股票
app.get('/api/search', async (req, res) => {
  try {
    const { keyword } = req.query;
    const stdout = await execPromise(`npx westock-data-skillhub@latest search ${keyword}`);
    const data = parseTableToJson(stdout);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取K线数据
app.get('/api/kline', async (req, res) => {
  try {
    const { code, period = 'day', limit = 60 } = req.query;
    const stdout = await execPromise(`npx westock-data-skillhub@latest kline ${code} ${period} ${limit}`);
    const data = parseTableToJson(stdout);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取技术指标
app.get('/api/technical', async (req, res) => {
  try {
    const { code, group = 'macd,rsi,kd' } = req.query;
    const stdout = await execPromise(`npx westock-data-skillhub@latest technical ${code} ${group}`);
    const data = parseTableToJson(stdout);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取公司概况
app.get('/api/profile', async (req, res) => {
  try {
    const { code } = req.query;
    const stdout = await execPromise(`npx westock-data-skillhub@latest profile ${code}`);
    const data = parseTableToJson(stdout);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取资金流向
app.get('/api/fund', async (req, res) => {
  try {
    const { code } = req.query;
    const stdout = await execPromise(`npx westock-data-skillhub@latest asfund ${code}`);
    const data = parseTableToJson(stdout);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取筹码分布
app.get('/api/chip', async (req, res) => {
  try {
    const { code } = req.query;
    const stdout = await execPromise(`npx westock-data-skillhub@latest chip ${code}`);
    const data = parseTableToJson(stdout);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取财务报表
app.get('/api/finance', async (req, res) => {
  try {
    const { code, num = 4 } = req.query;
    const stdout = await execPromise(`npx westock-data-skillhub@latest finance ${code} ${num}`);
    
    // 解析三个表
    const sections = stdout.split(/\*{3,}/).filter(s => s.trim());
    const result = {};
    
    sections.forEach(section => {
      const lines = section.trim().split('\n');
      const tableName = lines[0].toLowerCase().replace(/\s+/g, '');
      if (['lrb', 'zcfz', 'xjll'].includes(tableName)) {
        result[tableName] = parseTableToJson(section);
      }
    });
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════╗
║     股票量化分析 API 服务已启动                    ║
╠═══════════════════════════════════════════════════╣
║  访问地址: http://localhost:3001                  ║
║  API文档: http://localhost:3001/api/health       ║
╠═══════════════════════════════════════════════════╣
║  注意事项:                                        ║
║  1. 确保已安装 Node.js >= v18                     ║
║  2. 小程序开发时需勾选"不校验合法域名"            ║
║  3. 生产环境请配置 HTTPS 域名                      ║
╚═══════════════════════════════════════════════════╝
  `);
});
