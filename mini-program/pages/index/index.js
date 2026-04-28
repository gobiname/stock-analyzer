const app = getApp()

Page({
  data: {
    stockCode: '',
    stockInfo: null,
    analysis: null,
    loading: false,
    Math: Math
  },

  onInput(e) {
    this.setData({ stockCode: e.detail.value })
  },

  formatCode(code) {
    code = code.trim().toLowerCase()
    if (['sh', 'sz', 'bj', 'hk', 'us'].some(p => code.startsWith(p))) return code
    if (/^\d+$/.test(code)) {
      if (code.startsWith('0') || code.startsWith('3')) return 'sz' + code
      else if (code.startsWith('6')) return 'sh' + code
      else if (code.startsWith('8') || code.startsWith('4')) return 'bj' + code
    }
    return code
  },

  parseNum(val, defaultVal = 0) {
    if (val === '-' || val === '' || val === null || val === undefined) return defaultVal
    const num = parseFloat(val)
    return isNaN(num) ? defaultVal : num
  },

  formatMoney(val) {
    if (Math.abs(val) >= 100000000) return (val / 100000000).toFixed(2) + '亿'
    else if (Math.abs(val) >= 10000) return (val / 10000).toFixed(0) + '万'
    return val.toFixed(0) + '元'
  },

  request(endpoint, params, timeout = 15000) {
    return new Promise((resolve, reject) => {
      const url = `${app.globalData.apiBase}${endpoint}`
      const query = Object.entries(params).map(([k, v]) => `${k}=${v}`).join('&')
      wx.request({
        url: `${url}?${query}`,
        timeout: timeout,
        success: res => resolve(res.data),
        fail: err => reject(err)
      })
    })
  },

  async analyze() {
    const inputCode = this.data.stockCode.trim()
    if (!inputCode) {
      wx.showToast({ title: '请输入股票代码', icon: 'none' })
      return
    }

    const code = this.formatCode(inputCode)
    const displayCode = inputCode
    this.setData({ loading: true, stockInfo: null, analysis: null })

    try {
      const klineRes = await this.request('/kline', { code, limit: 60, fq: 'qfq' })
      if (!klineRes.success || !klineRes.data || klineRes.data.length === 0) {
        throw new Error('未找到该股票')
      }

      const searchRes = await this.request('/search', { keyword: inputCode }).catch(() => null)
      const stockName = searchRes?.success && searchRes.data?.[0]?.name || displayCode
      const techRes = await this.request('/technical', { code }).catch(() => ({ success: false }))
      const fundRes = await this.request('/fund', { code }).catch(() => ({ success: false }))
      const chipRes = await this.request('/chip', { code }).catch(() => ({ success: false }))
      const profileRes = await this.request('/profile', { code }).catch(() => ({ success: false }))
      const financeRes = await this.request('/finance', { code }).catch(() => ({ success: false }))

      const klines = klineRes.data
      const latestPrice = this.parseNum(klines[0].last)
      const highs = klines.map(k => this.parseNum(k.high)).filter(p => p > 0)
      const lows = klines.map(k => this.parseNum(k.low)).filter(p => p > 0)
      const high60d = highs.length > 0 ? Math.max(...highs) : latestPrice
      const low60d = lows.length > 0 ? Math.min(...lows) : latestPrice
      const highDateIdx = klines.findIndex(k => this.parseNum(k.high) === high60d)
      const highDate = highDateIdx >= 0 ? klines[highDateIdx].date : '-'
      const dropRate = high60d > 0 ? (((high60d - latestPrice) / high60d) * 100).toFixed(1) : '0.0'

      const tech = techRes.success && techRes.data?.[0] || {}
      const rsi6 = this.parseNum(tech['rsi.RSI_6'] || tech['RSI_6'], 50)
      const rsi12 = this.parseNum(tech['rsi.RSI_12'] || tech['RSI_12'], 50)
      const rsi24 = this.parseNum(tech['rsi.RSI_24'] || tech['RSI_24'], 50)
      const macd = this.parseNum(tech['macd.MACD'] || tech['MACD'], 0)
      const dif = this.parseNum(tech['macd.DIF'] || tech['DIF'], 0)

      const fund = fundRes.success && fundRes.data?.[0] || {}
      const mainNetFlow = this.parseNum(fund.MainNetFlow, 0)
      const mainNetFlow5d = this.parseNum(fund.MainNetFlow5D, 0)
      const mainNetFlow10d = this.parseNum(fund.MainNetFlow10D, 0)
      const mainNetFlow20d = this.parseNum(fund.MainNetFlow20D, 0)
      const retailNetFlow = this.parseNum(fund.RetailInFlow, 0) - this.parseNum(fund.RetailOutFlow, 0)

      const chip = chipRes.success && chipRes.data?.[0] || {}
      const avgCost = this.parseNum(chip.chipAvgCost, latestPrice)
      const profitRate = this.parseNum(chip.chipProfitRate, 0)
      const chipConcentration90 = this.parseNum(chip.chipConcentration90, 0)
      const costDiff = avgCost > 0 ? (((latestPrice - avgCost) / avgCost) * 100).toFixed(1) : '0.0'

      const profile = profileRes.success && profileRes.data?.[0] || {}
      const companyName = profile.name || stockName
      const industry = profile.industry || '-'
      const business = profile.business || '-'
      const listedDate = profile.listedDate ? profile.listedDate.split(' ')[0] : '-'
      const totalShares = profile.regCapital ? (this.parseNum(profile.regCapital) / 10000).toFixed(2) + '万股' : '-'

      // 保存完整的财务数据
      const finance = financeRes.success && financeRes.data || {}
      const financeRaw = financeRes.success && financeRes.raw ? financeRes.raw : ''
      const lrb = finance.lrb || []
      const zcfz = finance.zcfz || []
      const xjll = finance.xjll || []
      
      // 原始财务数据（不过滤）
      const financeDataRaw = lrb
      
      const financeData = []
      const quarterNames = ['Q1', 'Q2', 'Q3', 'Q4']
      lrb.slice(-4).forEach((item, idx) => {
        const revenue = this.parseNum(item.OperatingRevenue, 0)
        const profit = this.parseNum(item.NPParentCompanyOwners, 0)
        financeData.unshift({
          period: quarterNames[idx] || item.EndDate?.slice(5) || '-',
          revenue: revenue > 0 ? (revenue / 10000).toFixed(0) + '万' : '-',
          profit: profit > 0 ? (profit / 10000).toFixed(0) + '万' : '-'
        })
      })

      const latestFinance = lrb[lrb.length - 1] || {}
      const revenue = this.parseNum(latestFinance.OperatingRevenue, 0)
      const cost = this.parseNum(latestFinance.OperatingCost, 0)
      const grossMargin = revenue > 0 ? (((revenue - cost) / revenue * 100).toFixed(1)) + '%' : '-'
      const cashFlow = this.parseNum(latestFinance.NetOperateCashFlow, 0)
      const cashFlowText = cashFlow > 0 ? '净流入 ' + this.formatMoney(cashFlow) : (cashFlow < 0 ? '净流出 ' + this.formatMoney(Math.abs(cashFlow)) : '-')

      let trendDesc = ''
      if (dropRate > 15) trendDesc = `近期呈现冲高回落走势，60日内高点${high60d}元(${highDate})后持续回调，跌幅已达${dropRate}%，接近60日低点附近。`
      else if (dropRate > 5) trendDesc = `近期有所回调，从高点${high60d}元(${highDate})下跌${dropRate}%，仍处于正常波动范围内。`
      else if (dropRate < -5) trendDesc = `近期处于上涨趋势，从低点${low60d}元已上涨${Math.abs(dropRate)}%，走势偏强。`
      else trendDesc = `近期处于震荡整理走势，价格在${high60d}-${low60d}元区间波动，暂无明确方向。`

      const techConclusions = []
      if (rsi6 < 30) techConclusions.push('RSI(6)=' + rsi6.toFixed(1) + '，处于严重超卖区域，短期反弹概率较高')
      else if (rsi6 > 70) techConclusions.push('RSI(6)=' + rsi6.toFixed(1) + '，处于超买区域，注意回调风险')
      else techConclusions.push('RSI(6)=' + rsi6.toFixed(1) + '，处于正常区间')
      if (rsi12 < 30) techConclusions.push('RSI(12)=' + rsi12.toFixed(1) + '，中期处于超卖状态')
      else if (rsi12 > 70) techConclusions.push('RSI(12)=' + rsi12.toFixed(1) + '，中期处于超买状态')
      if (macd < 0) techConclusions.push('MACD=' + macd.toFixed(2) + '，处于零轴下方，中期趋势偏弱')
      else techConclusions.push('MACD=' + macd.toFixed(2) + '，处于零轴上方，中期趋势偏强')

      let fundConclusion = ''
      if (mainNetFlow20d < -50000000) fundConclusion = `主力资金连续20日净流出，累计流出约${this.formatMoney(Math.abs(mainNetFlow20d))}，存在主力出货嫌疑。`
      else if (mainNetFlow20d < -10000000) fundConclusion = `主力资金近期持续净流出，累计约${this.formatMoney(Math.abs(mainNetFlow20d))}，需关注。`
      else if (mainNetFlow20d > 0) fundConclusion = `主力资金连续20日净流入，累计约${this.formatMoney(mainNetFlow20d)}，主力建仓明显。`
      else fundConclusion = `主力资金进出相对平衡，无明显趋势。`
      if (retailNetFlow > 0 && mainNetFlow20d < -10000000) fundConclusion += '散户资金逆势买入，需警惕。'

      let chipConclusion = ''
      if (costDiff > 5) chipConclusion = `当前价格高于平均成本${Math.abs(costDiff)}%，上方套牢盘压力较大。`
      else if (costDiff < -5) chipConclusion = `当前价格低于平均成本${Math.abs(costDiff)}%，大多数筹码处于亏损状态，下方支撑较弱。`
      else chipConclusion = `当前价格接近平均成本，筹码盈亏相对平衡。`
      chipConclusion += `筹码集中度${chipConcentration90 < 10 ? '较高' : '一般'}，波动可能加大。`

      const totalRevenue = financeData.reduce((sum, item) => sum + this.parseNum(item.revenue, 0), 0)
      const totalProfit = financeData.reduce((sum, item) => sum + this.parseNum(item.profit, 0), 0)
      let financeConclusion = ''
      if (financeData.length >= 2) {
        const lastProfit = this.parseNum(financeData[financeData.length - 1].profit, 0)
        const prevProfit = this.parseNum(financeData[0].profit, 0)
        if (prevProfit > 0 && lastProfit > prevProfit) financeConclusion = `前三季度净利润持续增长，累计约${this.formatMoney(totalProfit)}，经营状况良好。`
        else if (prevProfit > 0 && lastProfit < prevProfit * 0.5) financeConclusion = `近期净利润有所下滑，需关注业绩变化。`
        else financeConclusion = `前三季度净利润累计约${this.formatMoney(totalProfit)}，经营相对稳定。`
      } else financeConclusion = '财务数据暂无详细信息。'
      if (cashFlow > 0) financeConclusion += '经营现金流为正，财务状况健康。'
      else if (cashFlow < 0) financeConclusion += '经营现金流为负，需关注资金状况。'

      let score = 5.0
      const scoreDetails = []

      let trendScore = 5
      if (macd >= 0) trendScore += 2
      else trendScore -= 1
      if (dropRate < 5) trendScore += 1
      else if (dropRate > 15) trendScore -= 1
      trendScore = Math.max(1, Math.min(10, trendScore))
      score += (trendScore - 5) * 0.3
      scoreDetails.push({ name: '趋势强度', score: trendScore, desc: macd >= 0 ? 'MACD零轴上方' : 'MACD零轴下方' })

      let oversoldScore = 5
      if (rsi6 < 20) oversoldScore += 3
      else if (rsi6 < 30) oversoldScore += 2
      else if (rsi6 > 80) oversoldScore -= 2
      else if (rsi6 > 70) oversoldScore -= 1
      oversoldScore = Math.max(1, Math.min(10, oversoldScore))
      score += (oversoldScore - 5) * 0.5
      scoreDetails.push({ name: '超卖程度', score: oversoldScore, desc: rsi6 < 30 ? '严重超卖' : rsi6 < 50 ? '偏弱' : rsi6 > 70 ? '超买' : '正常' })

      let fundScore = 5
      if (mainNetFlow20d > 50000000) fundScore += 3
      else if (mainNetFlow20d > 10000000) fundScore += 2
      else if (mainNetFlow20d < -50000000) fundScore -= 3
      else if (mainNetFlow20d < -10000000) fundScore -= 2
      fundScore = Math.max(1, Math.min(10, fundScore))
      score += (fundScore - 5) * 0.5
      scoreDetails.push({ name: '资金动向', score: fundScore, desc: mainNetFlow20d > 0 ? '主力净流入' : '主力净流出' })

      let chipScore = 5
      if (costDiff > -3 && costDiff < 3) chipScore += 1
      else if (costDiff < -10) chipScore -= 1
      if (profitRate < 10) chipScore += 1
      else if (profitRate > 50) chipScore -= 0.5
      chipScore = Math.max(1, Math.min(10, chipScore))
      score += (chipScore - 5) * 0.3
      scoreDetails.push({ name: '筹码分布', score: chipScore, desc: profitRate < 30 ? '大多亏损' : profitRate > 70 ? '大多盈利' : '盈亏平衡' })

      let basicScore = 5
      if (cashFlow > 0) basicScore += 1
      if (totalProfit > 0) basicScore += 1
      if (totalRevenue > 100000000) basicScore += 0.5
      basicScore = Math.max(1, Math.min(10, basicScore))
      score += (basicScore - 5) * 0.3
      scoreDetails.push({ name: '基本面', score: basicScore, desc: cashFlow > 0 ? '现金流为正' : '现金流为负' })

      score = Math.max(1, Math.min(10, score))

      const risks = []
      const opportunities = []
      if (mainNetFlow20d < -10000000) risks.push('主力资金连续20日净流出，出货迹象明显')
      if (costDiff < -10) risks.push('股价跌破平均成本' + avgCost.toFixed(2) + '元，套牢盘压力大')
      if (rsi6 > 80) risks.push('RSI严重超买，注意回调风险')
      if (dropRate > 20) risks.push('近期跌幅较大，需关注下跌风险')
      if (rsi6 < 20) opportunities.push('RSI严重超卖，短期反弹概率较高')
      if (rsi6 < 30 && rsi12 < 30) opportunities.push('短期和中RSI均超卖，反弹概率大')
      if (low60d > 0 && (latestPrice - low60d) / low60d < 0.05) opportunities.push('接近60日低点，若企稳可能有反弹')
      if (mainNetFlow > 0 && mainNetFlow20d < 0) opportunities.push('当日主力由流出转为流入，值得关注')
      if (risks.length === 0) risks.push('暂无明显异常风险')
      if (opportunities.length === 0) opportunities.push('暂无明显机会信号')

      const analysis = {
        companyName, industry, business, listedDate, totalShares,
        high60d: high60d.toFixed(2), low60d: low60d.toFixed(2), dropRate, trendDesc,
        rsi6: rsi6.toFixed(1), rsi6Signal: rsi6 < 30 ? '严重超卖' : rsi6 > 70 ? '超买' : '正常',
        rsi12: rsi12.toFixed(1), rsi12Signal: rsi12 < 30 ? '超卖' : rsi12 > 70 ? '超买' : '正常',
        rsi24: rsi24.toFixed(1),
        macd: macd.toFixed(2), macdSignal: macd >= 0 ? '零轴上方' : '零轴下方',
        dif: dif.toFixed(2), techConclusions,
        mainNetFlow, mainNetFlowText: this.formatMoney(mainNetFlow),
        mainNetFlow5d, mainNetFlow5dText: this.formatMoney(mainNetFlow5d),
        mainNetFlow10d, mainNetFlow10dText: this.formatMoney(mainNetFlow10d),
        mainNetFlow20d, mainNetFlow20dText: this.formatMoney(mainNetFlow20d),
        retailNetFlow, retailNetFlowText: this.formatMoney(retailNetFlow),
        fundConclusion,
        avgCost: avgCost.toFixed(2), currentPrice: latestPrice.toFixed(2), costDiff,
        profitRate: profitRate.toFixed(1), chipConcentration90: chipConcentration90.toFixed(1),
        chipConclusion,
        financeData, grossMargin, cashFlow: cashFlowText, financeConclusion,
        score: score.toFixed(1), scoreDesc: score >= 7 ? '偏强势' : score >= 4 ? '中性偏弱' : '偏弱势',
        scoreDetails, risks, opportunities
      }

      this.setData({
        stockInfo: { name: stockName, code: displayCode, price: latestPrice.toFixed(2), change: dropRate },
        analysis
      })

    } catch (err) {
      console.error(err)
      wx.showToast({ title: err.message || '分析失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  saveToHistory() {
    if (!this.data.analysis) {
      wx.showToast({ title: '请先进行分析', icon: 'none' })
      return
    }
    const history = wx.getStorageSync('history') || []
    history.unshift({ ...this.data.stockInfo, ...this.data.analysis, time: new Date().toLocaleString() })
    wx.setStorageSync('history', history.slice(0, 50))
    wx.showToast({ title: '已保存', icon: 'success' })
  },

  onShareAppMessage() {
    const { stockInfo, analysis } = this.data
    if (!stockInfo) return
    return { title: `${stockInfo.name}量化分析 - 评分${analysis?.score || '-'}分`, path: `/pages/index/index?code=${stockInfo.code}` }
  },

  onLoad(options) {
    if (options.code) this.setData({ stockCode: options.code })
  }
})
