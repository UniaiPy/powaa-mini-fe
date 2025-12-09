// // app.js
import imManager from './utils/imManager.js';

App({
  globalData: {
    userInfo: null,
    token: null,
    // baseUrl: 'http://127.0.0.1:5001',
    baseUrl: 'http://api.powaa.cn',
    unreadCount: 0,
    useMockData: false, // 关闭模拟数据，使用真实后端
    // TUIKit相关配置
    userID: null,
    userSig: null,
    SDKAppID: null,
    isTUIKitInitialized: false
  },

  onLaunch: function () {
    console.log('App Launch')
    this.initializeApp();
  },

  onShow: function () {
    console.log('App Show')
    this.checkLoginStatus()
    this.updateUnreadCount()
    this.initTUIKitIfLoggedIn()
  },

  onHide: function () {
    console.log('App Hide')
  },

  // ==================== 应用初始化 ====================
  
  initializeApp: function() {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 恢复登录状态
    this.restoreLoginState()
    
    // 获取系统信息
    this.getSystemInfo()

    // 延迟初始化TUIKit，确保登录状态已恢复
    setTimeout(() => {
      this.initTUIKitIfLoggedIn().catch(error => {
        console.log('应用启动时TUIKit初始化跳过:', error.message)
      })
    }, 100)
  },

  // ==================== 登录状态管理 ====================

  restoreLoginState: function() {
    const token = wx.getStorageSync('token')
    const userInfo = wx.getStorageSync('userInfo')
    
    if (token && userInfo) {
      this.globalData.token = token
      this.globalData.userInfo = userInfo
      console.log('登录状态已恢复')
    }
  },

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

  isLoggedIn: function() {
    return !!(this.globalData.token && this.globalData.userInfo)
  },

  // ==================== 用户认证 ====================

  login: function(code) {
    return new Promise((resolve, reject) => {
      if (!code) {
        reject(new Error('缺少登录凭证'))
        return
      }
      
      this.logout()
      
      this.makeRequest({
        url: '/api/auth/wechat-login',
        method: 'POST',
        data: { code }
      }).then(response => {
        console.log('原始登录响应:', response)
        const userData = this.processLoginResponse(response)
        this.saveLoginState(userData.token, userData.user)
        resolve(userData.user)
      }).catch(error => {
        reject(error)
      })
    })
  },

  processLoginResponse: function(response) {
    let token, user
    
    // 优先尝试直接从响应体获取
    if (response.token) {
      token = response.token
      user = response.user_info || response.user
    }
    // 或者从data字段获取
    else if (response.data && response.data.token) {
      token = response.data.token
      user = response.data.user_info || response.data.user
    }
    else {
      throw new Error('无效的登录响应格式')
    }
    
    if (!token || !user) {
      throw new Error('登录失败，未获取到有效数据')
    }
    
    // 确保用户信息包含必要字段
    const safeUser = {
      id: user.id || '',
      nickname: user.nickname || '',
      phone_number: user.phone || '',
      description: user.intro || ''
    }
    
    console.log('准备保存的用户信息:', safeUser)
    
    return { token, user: safeUser }
  },

  saveLoginState: function(token, userInfo) {
    wx.setStorageSync('token', token)
    wx.setStorageSync('userInfo', userInfo)
    
    this.globalData.token = token
    this.globalData.userInfo = userInfo
    
    // 登录成功后自动初始化IM
    console.log('登录状态已保存，开始初始化IM')
    this.initTUIKitIfLoggedIn().catch(error => {
      console.log('登录后IM初始化失败:', error.message)
    })
  },

  logout: function() {
    // 清除本地存储
    wx.removeStorageSync('token')
    wx.removeStorageSync('refresh_token')
    wx.removeStorageSync('userInfo')
    
    // 清除全局状态
    this.globalData.token = null
    this.globalData.userInfo = null
    this.clearTUIKitState()
  },

  refreshToken: function() {
    return new Promise((resolve, reject) => {
      const token = this.globalData.token
      if (!token) {
        reject(new Error('token不存在'))
        return
      }
      
      this.makeRequest({
        url: '/api/auth/refresh-token',
        method: 'POST',
        noAutoRedirect: true
      }).then(response => {
        if (response.token) {
          console.log('token刷新成功')
          this.globalData.token = response.token
          wx.setStorageSync('token', response.token)
          resolve(response.token)
        } else {
          throw new Error('token刷新失败')
        }
      }).catch(error => {
        console.error('token刷新失败:', error)
        this.logout()
        reject(new Error('token刷新失败，请重新登录'))
      })
    })
  },

  // ==================== 网络请求封装 ====================

  makeRequest: function(options) {
    return new Promise((resolve, reject) => {
      const token = this.globalData.token
      const isValidToken = token && typeof token === 'string' && token.trim().length > 0
      
      wx.request({
        url: this.globalData.baseUrl + options.url,
        method: options.method || 'GET',
        data: options.data || {},
        header: {
          'content-type': 'application/json',
          'Authorization': isValidToken ? `Bearer ${token}` : '',
          ...options.header
        },
        success: (res) => {
          // 处理401未授权错误，但允许匿名访问的请求除外
          if ((res.statusCode === 401 || (res.data && res.data.error && 
              (res.data.error.includes('认证令牌无效') || 
               res.data.error.includes('token无效') || 
               res.data.error.includes('token已过期')))) && !options.allowAnonymous) {
            this.handleAuthError(options)
            reject(new Error('登录已过期，请重新登录'))
          } else {
            resolve(res.data)
          }
        },
        fail: (error) => {
          console.error('网络请求失败:', error)
          this.showNetworkError(error)
          reject(error)
        }
      })
    })
  },

  // 兼容旧版本的request方法
  request: function(options) {
    this.makeRequest(options)
      .then(data => options.success && options.success(data))
      .catch(error => options.fail && options.fail(error))
      .finally(() => options.complete && options.complete())
  },

  handleAuthError: function(options) {
    this.logout()
    
    // 避免在登录相关接口上循环重定向，允许匿名访问的请求也不重定向
    if (!options.url.includes('/api/auth/') && !options.noAutoRedirect && !options.allowAnonymous) {
      wx.showToast({
        title: '登录已过期，请重新登录',
        icon: 'none',
        duration: 1500
      })
      
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/login/login'
        })
      }, 1500)
    }
  },

  showNetworkError: function(error) {
    wx.showToast({
      title: '网络请求失败: ' + (error.errMsg || '未知错误'),
      icon: 'none',
      duration: 2000
    })
  },

  // ==================== 用户信息管理 ====================

  getUserProfile: function() {
    return new Promise((resolve, reject) => {
      wx.getUserProfile({
        desc: '用于完善用户资料',
        success: (res) => resolve(res.userInfo),
        fail: (error) => reject(error)
      })
    })
  },

  onPageShow: function(page) {
    // if (this.isLoggedIn() && page) {
    //   const isLoginPage = page.route === 'pages/login/login'
    //   console.log('当前页面:', page.route, '是否登录页面:', isLoginPage)
      
    //   if (!isLoginPage) {
    //     this.checkUserInfoComplete()
    //   }
    // }
  },

  checkUserInfoComplete: function(options = {}) {
    const { 
      redirect = true, 
      message = '请完善您的名片信息'
    } = options;
    
    const userInfo = this.globalData.userInfo || wx.getStorageSync('userInfo');
    
    console.log('检查用户信息完整性:', userInfo);
    
    const checkConditions = [
      !!userInfo,
      !!userInfo?.nickname,
      !!userInfo?.phone_number,
      !!userInfo?.description
    ];
    
    const isUserInfoComplete = checkConditions.every(condition => condition);
    
    if (!isUserInfoComplete && redirect) {
      console.log('用户信息不完整，跳转到名片页面完善信息');
      wx.showToast({
        title: message,
        icon: 'none',
        duration: 1500
      });
      
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/profile/profile'
        });
      }, 1500);
    }
    
    return isUserInfoComplete; // 返回检查结果供调用者使用
  },

  // ==================== 系统信息 ====================

  getSystemInfo: function() {
    wx.getSystemInfo({
      success: (res) => {
        this.globalData.systemInfo = res
        console.log('系统信息:', res)
      }
    })
  },

  updateUnreadCount: function() {
    const unreadCount = wx.getStorageSync('unreadCount') || 0
    this.globalData.unreadCount = unreadCount
    
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

  // ==================== TUIKit IM集成 ====================

  initTUIKitIfLoggedIn: function() {
    if (this.isLoggedIn()) {
      console.log('用户已登录，开始初始化TUIKit')
      return this.getIMConfigFromServer()
    } else {
      console.log('用户未登录，跳过TUIKit初始化')
      return Promise.resolve() // 返回resolved Promise而不是rejected
    }
  },

  getIMConfigFromServer: function() {
    return this.makeRequest({
      url: '/api/im/get-config',
      method: 'GET'
    }).then(response => {
      console.log('IM配置接口响应:', response)
      
      if (response.code === 200 && response.data) {
        const config = response.data
        console.log('IM配置:', config)
        
        console.log('获取到的IM配置:', {
          SDKAppID: config.SDKAppID,
          userID: config.userID,
          userSigLength: config.userSig ? config.userSig.length : 0
        })
        
        if (config && config.userID && config.userSig && config.SDKAppID) {
          const { userID, userSig, SDKAppID } = config
          this.saveIMConfig(userID, userSig, SDKAppID)
          
          // 使用新的IM管理器 - 强制踢出其他设备
          console.log('🚪 强制踢出其他设备，初始化IM...')
          return imManager.initialize(userID, userSig, SDKAppID)
        } else {
          throw new Error('IM配置参数不完整')
        }
      } else {
        throw new Error(response.error || '服务器返回错误')
      }
    }).then(() => {
      // 更新globalData状态以保持兼容性
      this.globalData.isTUIKitInitialized = true
      console.log('IM初始化完成，已强制踢出其他设备')
    }).catch(error => {
      console.error('获取IM配置失败:', error)
      throw error
    })
  },

  saveIMConfig: function(userID, userSig, SDKAppID) {
    this.globalData.userID = userID
    this.globalData.userSig = userSig
    this.globalData.SDKAppID = SDKAppID
  },

  // 兼容性方法 - 委托给IM管理器
  checkIMLoginStatus: function() {
    const status = imManager.checkIMStatus()
    
    // 转换为旧的状态格式以保持兼容性
    if (status.isInitialized && status.isLoggedIn) {
      if (status.config.userID === this.globalData.userID) {
        return 'SAME_USER_LOGGED_IN'
      } else {
        return 'DIFFERENT_USER_LOGGED_IN'
      }
    } else if (status.isInitialized) {
      return 'NOT_LOGGED_IN'
    } else {
      return 'NOT_INITIALIZED'
    }
  },

  // 兼容性方法 - 简化版本
  initializeTUIKit: function(userID, userSig, SDKAppID) {
    return imManager.initialize(userID, userSig, SDKAppID)
  },

  // 兼容性方法 - 简化版本
  waitForIMLogin: function(timeout = 5000) {
    return imManager.waitForLogin(timeout)
  },

  // 兼容性方法 - 简化版本
  switchIMUser: function(userID, userSig, SDKAppID) {
    return imManager.initialize(userID, userSig, SDKAppID)
  },

  // 兼容性方法 - 简化版本
  performIMLogin: function(userID, userSig, SDKAppID) {
    return imManager.initialize(userID, userSig, SDKAppID)
  },

  // ==================== TUIKit状态管理 ====================

  clearTUIKitState: async function() {
    this.globalData.userID = null
    this.globalData.userSig = null
    this.globalData.SDKAppID = null
    this.globalData.isTUIKitInitialized = false
    
    // 使用IM管理器登出
    await imManager.logout();
    // 清理全局变量（兼容性）
    wx.$chat_userID = null;
    wx.$chat_userSig = null;
    wx.$chat_SDKAppID = null;
  },

  // ==================== 废弃方法 ====================

  wxLogin: function() {
    console.warn('wxLogin方法已弃用，请使用新的login方法')
    return this.login()
  }
})