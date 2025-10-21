// pages/login/login.js
const app = getApp()

Page({
  data: {
    agreeTerms: false,
    loading: false,
    unreadCount: 0
  },

  onLoad: function (options) {
    // 页面加载时检查登录状态
    this.checkLoginStatus()
  },

  onShow: function () {
    // 页面显示时更新未读消息数量
    this.updateUnreadCount()
  },

  // 检查登录状态
  checkLoginStatus: function() {
    const token = wx.getStorageSync('token')
    if (token) {
      // 已登录，跳转到聊天页面
      wx.switchTab({
        url: '/pages/chat/chat'
      })
    }
  },

  // 切换同意条款状态
  toggleAgreeTerms: function() {
    this.setData({
      agreeTerms: !this.data.agreeTerms
    })
  },

  // 微信一键登录
  wxLogin: async function() {
    // 检查是否同意用户协议
    if (!this.data.agreeTerms) {
      wx.showToast({
        title: '请先同意用户协议和隐私政策',
        icon: 'none'
      })
      return
    }

    this.setData({ loading: true })

    try {
      // 1. 获取用户信息（需要用户授权）
      const userProfile = await this.getUserProfile()
      
      // 2. 调用微信登录获取code
      await app.wxLogin()
      
      // 3. 登录成功，跳转到聊天页面
      wx.switchTab({
        url: '/pages/chat/chat'
      })
    } catch (error) {
      console.error('登录失败:', error)
      wx.showToast({
        title: error.message || '登录失败，请重试',
        icon: 'none'
      })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 获取用户信息
  getUserProfile: function() {
    // 在模拟数据模式下，直接返回模拟用户信息
    if (app.globalData.useMockData) {
      return Promise.resolve({
        nickName: '测试用户',
        avatarUrl: '/images/user-avatar.png',
        gender: 0,
        country: '中国',
        province: '北京',
        city: '北京'
      })
    }
    
    // 实际环境下的用户信息获取
    // 注意：wx.getUserProfile在较新版本的微信中不再推荐使用
    return new Promise((resolve, reject) => {
      // 先尝试使用wx.getUserProfile
      try {
        wx.getUserProfile({
          desc: '用于完善用户资料',
          success: (res) => {
            resolve(res.userInfo)
          },
          fail: (error) => {
            // 如果失败，可以尝试使用getUserInfo（虽然也已不推荐）
            wx.getUserInfo({
              success: (res) => {
                resolve(res.userInfo)
              },
              fail: (err) => {
                reject(new Error('获取用户信息失败'))
              }
            })
          }
        })
      } catch (e) {
        reject(new Error('获取用户信息失败'))
      }
    })
  },

  // 更新未读消息数量
  updateUnreadCount: function() {
    try {
      // 从本地存储获取未读消息数量
      const unreadCount = parseInt(wx.getStorageSync('chatUnreadCount') || '0')
      
      // 更新页面数据
      this.setData({
        unreadCount: unreadCount
      })
    } catch (error) {
      console.error('更新未读消息数量失败:', error)
      this.setData({
        unreadCount: 0
      })
    }
  },

  // 导航到聊天页面
  navigateToChat: function() {
    wx.navigateTo({
      url: '/pages/chat/chat'
    })
  },

  // 导航到AI分身页面
  navigateToAvatar: function() {
    wx.navigateTo({
      url: '/pages/avatar/avatar'
    })
  },

  // 导航到名片页面
  navigateToProfile: function() {
    wx.navigateTo({
      url: '/pages/profile/profile'
    })
  },

  // 打开用户协议
  openUserTerms: function() {
    wx.navigateTo({
      // url: '/pages/terms/terms'
      url: '/pages/about/about?section=terms'
    })
  },

  // 打开隐私政策
  openPrivacyPolicy: function() {
    wx.navigateTo({
      // url: '/pages/privacy/privacy'
      url: '/pages/about/about?section=privacy'
    })
  }
})