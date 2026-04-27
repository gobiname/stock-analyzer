const app = getApp()

Page({
  data: {
    history: []
  },

  onShow() {
    const history = wx.getStorageSync('history') || []
    this.setData({ history })
  },

  viewDetail(e) {
    const item = e.currentTarget.dataset.item
    const pages = getCurrentPages()
    const prevPage = pages[pages.length - 2]
    if (prevPage) {
      prevPage.setData({
        stockCode: item.code,
        stockInfo: { name: item.name, code: item.code, price: item.price, change: item.change },
        analysis: item
      })
    }
    wx.navigateBack()
  },

  clearHistory() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有历史记录吗？',
      success: res => {
        if (res.confirm) {
          wx.removeStorageSync('history')
          this.setData({ history: [] })
        }
      }
    })
  }
})
