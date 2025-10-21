// app.js
App({
  globalData: {
    userInfo: null,
    token: null,
    baseUrl: 'https://api.powaaaicard.com', // 后端API基础地址
    unreadCount: 0,
    useMockData: true // 开发环境使用模拟数据
  },

  onLaunch: function () {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 检查用户登录状态
    this.checkLoginStatus()
    
    // // 如果用户未登录，自动进行登录
    // if (!this.globalData.token || !this.globalData.userInfo) {
    //   console.log('用户未登录，尝试自动登录')
    //   this.wxLogin().catch(error => {
    //     console.error('自动登录失败:', error)
    //   })
    // }

    // 获取系统信息
    this.getSystemInfo()

    // 初始化云开发环境（如果需要）
    // wx.cloud.init({
    //   env: 'your-env-id',
    //   traceUser: true
    // })
  },

  onShow: function () {
    // 从后台回到前台时执行
    console.log('App Show')
    this.updateUnreadCount()
  },

  onHide: function () {
    // 从前台进入后台时执行
    console.log('App Hide')
  },

  // 检查用户登录状态
  checkLoginStatus: function() {
    const token = wx.getStorageSync('token')
    const userInfo = wx.getStorageSync('userInfo')
    console.log('checkLoginStatus:', token, userInfo)
    if (token && userInfo) {
      this.globalData.token = token
      this.globalData.userInfo = userInfo
      console.log('用户已登录')
    } else {
      console.log('用户未登录')
    }
  },

  // 获取系统信息
  getSystemInfo: function() {
    wx.getSystemInfo({
      success: (res) => {
        this.globalData.systemInfo = res
        console.log('系统信息:', res)
      }
    })
  },

  // 更新未读消息数
  updateUnreadCount: function() {
    // 这里应该调用API获取实际未读数
    const unreadCount = wx.getStorageSync('unreadCount') || 0
    this.globalData.unreadCount = unreadCount
    
    // 更新tabBar的未读消息红点
    if (unreadCount > 0) {
      wx.setTabBarBadge({
        index: 0,
        text: unreadCount > 99 ? '99+' : unreadCount.toString()
      })
    } else {
      wx.removeTabBarBadge({
        index: 0
      })
    }
  },

  // 微信登录
  wxLogin: function() {
    return new Promise((resolve, reject) => {
      // 使用模拟数据
      if (this.globalData.useMockData) {
        const mockUser = {
          id: '1',
          openid: 'mock_openid_123456',
          nickname: '测试用户',
          avatarUrl: '/images/user-avatar.png',
          gender: 0,
          country: '中国',
          province: '北京',
          city: '北京'
        }
        const mockToken = 'mock_token_' + Date.now()
        
        // 保存登录态
        wx.setStorageSync('token', mockToken)
        wx.setStorageSync('refresh_token', 'mock_refresh_token_' + Date.now())
        wx.setStorageSync('userInfo', mockUser)
        
        this.globalData.token = mockToken
        this.globalData.userInfo = mockUser
        
        setTimeout(() => {
          console.log('使用模拟数据登录成功')
          resolve(mockUser)
        }, 500)
        return
      }
      
      // 实际网络登录
      wx.login({
        success: (res) => {
          if (res.code) {
            // 发送 res.code 到后端换取 openId, sessionKey, unionId
            this.request({
              url: '/api/auth/wx-login',
              method: 'POST',
              data: {
                code: res.code
              },
              success: (response) => {
                const { token, refresh_token, user } = response.data
                
                // 保存登录态
                wx.setStorageSync('token', token)
                wx.setStorageSync('refresh_token', refresh_token)
                wx.setStorageSync('userInfo', user)
                
                this.globalData.token = token
                this.globalData.userInfo = user
                
                resolve(user)
              },
              fail: (error) => {
                reject(error)
              }
            })
          } else {
            reject(new Error('登录失败: ' + res.errMsg))
          }
        },
        fail: (error) => {
          reject(error)
        }
      })
    })
  },

  // 获取用户信息
  getUserProfile: function() {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res) => {
          resolve(res.userInfo)
        },
        fail: (error) => {
          reject(error)
        }
      })
    })
  },

  // 通用网络请求
  request: function(options) {
    // 使用模拟数据
    if (this.globalData.useMockData) {
      console.log('使用模拟数据响应请求:', options.url)
      
      // 模拟网络延迟
      setTimeout(() => {
        let mockResponse = { success: true, data: null, message: '操作成功' }
        
        // 根据不同的API路径返回不同的模拟数据
        if (options.url.includes('/api/auth/wx-login')) {
          mockResponse.data = {
            token: 'mock_token_' + Date.now(),
            refresh_token: 'mock_refresh_token_' + Date.now(),
            user: {
              id: '1',
              openid: 'mock_openid_123456',
              nickname: '测试用户',
              avatarUrl: '/images/user-avatar.png',
              gender: 0,
              country: '中国',
              province: '北京',
              city: '北京'
            }
          }
        } else if (options.url.includes('/api/chat/history')) {
          mockResponse.data = [
            {
              id: '1',
              type: 'ai',
              content: '您好！我是小瓦AI，有什么可以帮助您的？',
              timestamp: new Date().toISOString()
            }
          ]
        } else if (options.url.includes('/api/chat/ask')) {
          const userMessage = options.data.content || ''
          let aiResponse = '感谢您的提问！这是一条模拟的AI回复。'
          
          if (userMessage.includes('你好') || userMessage.includes('您好')) {
            aiResponse = '你好！很高兴见到你，有什么可以帮助你的吗？'
          } else if (userMessage.includes('天气')) {
            aiResponse = '今天天气很好，阳光明媚，适合户外活动。'
          } else if (userMessage.includes('再见')) {
            aiResponse = '再见！有需要随时找我聊天。'
          }
          
          mockResponse.data = {
            content: aiResponse
          }
        } else if (options.url.includes('/api/chat/clear')) {
          mockResponse.data = { status: 'success' }
        }
        
        options.success && options.success(mockResponse)
      }, 300)
      
      // 返回一个模拟的request对象
      return {
        abort: () => console.log('模拟请求已取消')
      }
    }
    
    // 实际网络请求
    const token = this.globalData.token
    
    return wx.request({
      url: this.globalData.baseUrl + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'content-type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        if (res.data.code === 401) {
          // Token过期，需要重新登录
          this.logout()
          wx.navigateTo({
            url: '/pages/login/login'
          })
        } else {
          options.success && options.success(res.data)
        }
      },
      fail: (error) => {
        console.error('网络请求失败:', error)
        options.fail && options.fail(error)
        wx.showToast({
          title: '网络请求失败: ' + (error.errMsg || '未知错误'),
          icon: 'none',
          duration: 2000
        })
      },
      complete: options.complete
    })
  },

  // 退出登录
  logout: function() {
    wx.removeStorageSync('token')
    wx.removeStorageSync('refresh_token')
    wx.removeStorageSync('userInfo')
    this.globalData.token = null
    this.globalData.userInfo = null
  }
})