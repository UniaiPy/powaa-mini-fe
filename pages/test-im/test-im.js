// 测试IM初始化功能
const app = getApp()
import imManager from '../../utils/imManager.js'

Page({
  data: {
    imStatus: null,
    logs: []
  },

  onLoad: function() {
    this.addLog('页面加载完成')
    this.checkIMStatus()
  },

  onShow: function() {
    this.addLog('页面显示')
    this.checkIMStatus()
  },

  // 检查IM状态
  checkIMStatus: function() {
    const status = imManager.checkIMStatus()
    this.setData({
      imStatus: status
    })
    this.addLog('IM状态检查完成: ' + JSON.stringify(status, null, 2))
  },

  // 手动初始化IM
  initIM: function() {
    this.addLog('开始手动初始化IM...')
    app.initTUIKitIfLoggedIn()
      .then(() => {
        this.addLog('IM初始化成功')
        this.checkIMStatus()
      })
      .catch(error => {
        this.addLog('IM初始化失败: ' + error.message)
      })
  },

  // 测试登录状态
  testLogin: function() {
    const isLoggedIn = app.isLoggedIn()
    this.addLog('用户登录状态: ' + isLoggedIn)
    
    if (isLoggedIn) {
      const userInfo = app.globalData.userInfo
      this.addLog('用户信息: ' + JSON.stringify(userInfo))
    }
  },

  // 添加日志
  addLog: function(message) {
    const timestamp = new Date().toLocaleTimeString()
    const logs = this.data.logs || []
    logs.push(`[${timestamp}] ${message}`)
    
    // 只保留最近20条日志
    if (logs.length > 20) {
      logs.shift()
    }
    
    this.setData({
      logs: logs
    })
  },

  // 清空日志
  clearLogs: function() {
    this.setData({
      logs: []
    })
  }
})