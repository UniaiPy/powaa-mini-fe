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
    // 使用app.js的统一登录状态检查
    const isLoggedIn = app.isLoggedIn()
    
    if (isLoggedIn) {
      // 额外检查用户信息完整性
      const userInfo = app.globalData.userInfo
      const isUserInfoComplete = userInfo && 
                                userInfo.nickname && 
                                userInfo.phone_number;
      
      if (isUserInfoComplete) {
        // 已登录且信息完整，跳转到聊天页面
        console.log('用户已登录且信息完整，跳转到聊天页面')
        wx.switchTab({
          url: '/pages/chat/chat'
        })
      } else {
        // 已登录但信息不完整，跳转到个人资料页面
        console.log('用户已登录但信息不完整，跳转到个人资料页面')
        wx.switchTab({
          url: '/pages/profile/profile'
        })
      }
    } else {
      console.log('用户未登录，停留在登录页面')
    }
  },

  // 切换同意条款状态
  toggleAgreeTerms: function() {
    this.setData({
      agreeTerms: !this.data.agreeTerms
    })
  },

  // 微信一键登录
  wxLogin: function() {
    // 检查是否同意用户协议
    if (!this.data.agreeTerms) {
      wx.showToast({
        title: '请先同意用户协议和隐私政策',
        icon: 'none'
      })
      return
    }

    this.setData({ loading: true })
    
    wx.showLoading({
      title: '登录中...',
    })
    
    // 1. 先调用wx.login获取code
    wx.login({
      success: (res) => {
        if (res.code) {
          console.log('获取登录code成功:', res.code)
          // 2. 调用全局登录方法，传入code
          app.login(res.code)
            .then((userInfo) => {
              console.log('登录成功', userInfo)
              wx.hideLoading()
              this.setData({ loading: false })
              console.log('检查用户信息完整性:', userInfo)
              // 检查用户信息是否完整（头像、昵称、手机号）
              const isUserInfoComplete = userInfo && 
                                        userInfo.nickname && 
                                        // userInfo.avatar_url && 
                                        userInfo.phone_number;
              
              if (!isUserInfoComplete) {
                console.log('新用户，跳转到名片页面完善信息')
                wx.showToast({
                  title: '请完善您的名片信息',
                  icon: 'none',
                  duration: 1500
                })
                setTimeout(() => {
                  // 跳转到名片页面完善个人信息
                  wx.switchTab({
                    url: '/pages/profile/profile'
                  })
                }, 1500)
              } else {
                // 老用户，直接跳转到聊天页面
                 console.log('新用户')
                wx.switchTab({
                  url: '/pages/chat/chat'
                })
              }
            })
            .catch((error) => {
              console.error('登录失败', error)
              wx.hideLoading()
              this.setData({ loading: false })
              wx.showToast({
                title: error.message || '登录失败，请重试',
                icon: 'none'
              })
            })
        } else {
          console.error('获取登录code失败:', res)
          wx.hideLoading()
          this.setData({ loading: false })
          wx.showToast({
            title: '登录失败，请重试',
            icon: 'none'
          })
        }
      },
      fail: (err) => {
        console.error('微信登录接口调用失败:', err)
        wx.hideLoading()
        this.setData({ loading: false })
        wx.showToast({
          title: '网络异常，请检查',
          icon: 'none'
        })
      }
    })
  },

  // 获取用户信息 - 简化版本，直接调用全局方法
  getUserProfile: function() {
    return app.getUserProfile()
      .catch((error) => {
        console.error('获取用户信息失败:', error)
        throw error
      })
  },

  // 更新未读消息数量
  updateUnreadCount: function() {
    try {
      const unreadCount = wx.getStorageSync('unreadCount') || 0
      this.setData({
        unreadCount: unreadCount
      })
    } catch (error) {
      console.error('更新未读消息数失败:', error)
    }
  },

  // 导航到聊天页面
  navigateToChat: function() {
    wx.switchTab({
      url: '/pages/chat/chat'
    })
  },

  // 导航到头像选择页面
  navigateToAvatar: function() {
    wx.navigateTo({
      url: '/pages/avatar/avatar'
    })
  },

  // 导航到个人资料页面
  navigateToProfile: function() {
    wx.navigateTo({
      url: '/pages/profile/profile'
    })
  },

  // 打开用户协议
  openUserTerms: function() {
    wx.navigateTo({
      url: '/pages/about/about?section=terms'
    })
  },

  // 打开隐私政策
  openPrivacyPolicy: function() {
    wx.navigateTo({
      url: '/pages/about/about?section=privacy'
    })
  }
})