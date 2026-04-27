# 股票量化分析工具 (微信小程序版)

基于 WeStock Data 的股票量化分析微信小程序，支持输入股票代码生成分析报告。

## 项目结构

```
stock-analyzer/
├── mini-program/           # 微信小程序
│   ├── app.js             # 小程序入口
│   ├── app.json           # 全局配置
│   ├── app.wxss           # 全局样式
│   ├── project.config.json # 项目配置
│   └── pages/
│       ├── index/         # 主页面 - 股票分析
│       └── history/       # 历史记录页面
├── server.js              # API 服务端
└── package.json           # 依赖配置
```

## 快速开始

### 1. 安装依赖

```bash
cd stock-analyzer
npm install
```

### 2. 启动 API 服务

```bash
npm start
```

服务将在 http://localhost:3000 启动

### 3. 导入小程序

1. 下载 [微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 打开微信开发者工具
3. 选择「导入项目」，路径选择 `stock-analyzer/mini-program`
4. AppID 可以使用测试号或填写自己的 AppID
5. 勾选「不校验合法域名」选项（开发阶段）
6. 点击「导入」

### 4. 开始使用

1. 在输入框输入股票代码（如：`002729`、`600519`）
2. 点击「分析」按钮
3. 查看量化分析结果

## 功能特性

- 📊 **技术指标分析**：RSI、MACD、KDJ 等
- 📈 **趋势分析**：60日高低点、涨跌幅
- 💰 **资金流向**：主力/散户资金进出
- 🎯 **筹码分布**：平均成本、获利比例
- ⭐ **综合评分**：1-10分量化评分
- ⚠️ **风险提示**：智能识别风险因素
- 📝 **历史记录**：保存分析记录

## 股票代码格式

| 市场 | 格式 | 示例 |
|------|------|------|
| 沪市/科创板 | sh + 6位数字 | sh600000 |
| 深市 | sz + 6位数字 | sz000001 |
| 北交所 | bj + 6位数字 | bj430047 |
| 港股 | hk + 5位数字 | hk00700 |
| 美股 | us + 代码 | usAAPL |

支持直接输入纯数字代码：
- `002729` → 自动识别为深市 sz002729
- `600519` → 自动识别为沪市 sh600519

## API 接口

| 接口 | 用途 |
|------|------|
| GET /api/search | 搜索股票 |
| GET /api/kline | K线数据 |
| GET /api/technical | 技术指标 |
| GET /api/profile | 公司概况 |
| GET /api/fund | 资金流向 |
| GET /api/chip | 筹码分布 |
| GET /api/finance | 财务报表 |
| GET /api/health | 健康检查 |

## 注意事项

### 开发环境
- 小程序开发时需勾选「不校验合法域名」
- 确保 API 服务已启动

### 生产环境
- 需要配置 HTTPS 域名
- 在微信公众平台配置合法域名
- 修改 `app.js` 中的 `apiBase` 为正式域名

### 依赖要求
- Node.js >= v18
- 微信开发者工具最新版

## 免责声明

本工具仅提供客观市场数据展示和分析参考，不构成证券投资咨询服务。投资有风险，决策需谨慎。
