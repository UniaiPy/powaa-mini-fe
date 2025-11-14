// app.js
import TencentCloudChat from '@tencentcloud/chat';

App({
  globalData: {
    userInfo: null,
    token: null,
    baseUrl: 'http://127.0.0.1:5001', // 后端API基础地址 https://api.powaaaicard.com
    unreadCount: 0,
    useMockData: false, // 关闭模拟数据，使用真实后端
    // TUIKit相关配置
    userID: null,
    userSig: null,
    SDKAppID: null,
    isTUIKitInitialized: false
  },

  onLaunch: function () {
    // 展示本地存储能力
    const logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)

    // 尝试从本地存储恢复登录状态
    const token = wx.getStorageSync('token')
    const userInfo = wx.getStorageSync('userInfo')
    
    if (token) {
      this.globalData.token = token
      this.globalData.userInfo = userInfo
    }

    // 获取系统信息
    this.getSystemInfo()

    // 初始化TUIKit（如果用户已登录）
    this.initTUIKitIfLoggedIn()

    // 初始化云开发环境（如果需要）
    // wx.cloud.init({
    //   env: 'your-env-id',
    //   traceUser: true
    // })
  },
  
  // 新增全局登录方法，供页面调用
  login: function(code) {
    return new Promise((resolve, reject) => {
      if (!code) {
        reject(new Error('缺少登录凭证'))
        return
      }
      
      // 先清除可能存在的无效token
      this.logout()
      
      // 发送 code 到后端换取 openId, sessionKey, unionId
      wx.request({
        url: this.globalData.baseUrl + '/api/auth/wechat-login',
        method: 'POST',
        data: {
          code: code
        },
        header: {
          'content-type': 'application/json'
        },
        success: (res) => {
          console.log('登录响应:', res)
          
          // 首先检查是否有错误信息
          if (res.data.error) {
            console.error('登录接口返回错误:', res.data.error)
            // 返回具体的错误信息给用户
            reject(new Error(res.data.error))
            return
          }
          
          // 处理不同的响应格式
          let token, user
          
          // 优先尝试直接从响应体获取
          if (res.data.token) {
            token = res.data.token
            // 后端返回的用户信息字段名是user_info
            user = res.data.user_info || res.data.user
          }
          // 或者从data字段获取
          else if (res.data.data && res.data.data.token) {
            token = res.data.data.token
            // 后端返回的用户信息字段名是user_info
            user = res.data.data.user_info || res.data.data.user
          }
          else {
            console.error('登录响应格式不匹配:', res.data)
            reject(new Error('无效的登录响应格式'))
            return
          }
          
          if (token && user) {
            // 确保用户信息包含必要字段，设置默认值防止空值
            const safeUser = {
              id: user.id || '',
              nickname: user.nickname || '小皮' + user.id,
              phone_number: user.phone || '',
            }
            
            console.log('准备保存的用户信息:', safeUser)
            
            // 保存登录态
            wx.setStorageSync('token', token)
            wx.setStorageSync('userInfo', safeUser)
            
            this.globalData.token = token
            this.globalData.userInfo = safeUser
            
            resolve(safeUser)
          } else {
            console.error('缺少必要的登录信息:', { token, user })
            reject(new Error('登录失败，未获取到有效数据'))
          }
        },
        fail: (error) => {
          console.error('登录请求失败:', error)
          reject(new Error('网络请求失败，请检查网络连接'))
        }
      })
    })
  },

  onShow: function () {
    // 从后台回到前台时执行
    console.log('App Show')
    // 每次显示应用时都检查并恢复登录状态
    this.checkLoginStatus()
    this.updateUnreadCount()
    
    // 检查TUIKit是否需要初始化
    if (!this.globalData.isTUIKitInitialized && this.globalData.token && this.globalData.userInfo) {
      console.log('TUIKit未初始化且用户已登录，尝试初始化')
      this.initTUIKitIfLoggedIn()
    }
  },
  
  /**
   * 页面显示时的公共钩子函数
   * 供所有页面的onShow生命周期调用
   * page - 当前页面实例
   */
  onPageShow: function(page) {
    // 检查是否已登录
    if (this.globalData.token && page) {
      // 检查是否不是登录页面
      const isLoginPage = page.route === 'pages/login/login'
      console.log('当前页面:', page.route, '是否登录页面:', isLoginPage)
      
      // 不是登录页面时，检查用户信息完整性
      if (!isLoginPage) {
        this.checkUserInfoComplete()
      }
    }
  },

  onHide: function () {
    // 从前台进入后台时执行
    console.log('App Hide')
  },
  
  /**
   * 检查用户信息是否完整
   * 这是一个全局方法，会在除登录页面外的所有页面显示时自动调用
   */
  checkUserInfoComplete: function() {
    const userInfo = this.globalData.userInfo || wx.getStorageSync('userInfo');
    
    console.log('检查用户信息完整性:', userInfo);
    
    // 检查用户信息是否完整（头像、昵称、手机号）
    const isUserInfoComplete = userInfo && 
                              userInfo.nickname && 
                              userInfo.phone_number;
    
    if (!isUserInfoComplete) {
      console.log('用户信息不完整，跳转到名片页面完善信息');
      wx.showToast({
        title: '请完善您的名片信息',
        icon: 'none',
        duration: 1500
      });
      setTimeout(() => {
        // 跳转到名片页面完善个人信息
        wx.switchTab({
          url: '/pages/profile/profile'
        });
      }, 1500);
    }
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

  // 微信登录 - 已弃用，使用新的login方法
  wxLogin: function() {
    console.warn('wxLogin方法已弃用，请使用新的login方法')
    return this.login()
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

  // 刷新token的方法
  refreshToken: function() {
    return new Promise((resolve, reject) => {
      const token = this.globalData.token
      if (!token) {
        reject(new Error('token不存在'))
        return
      }
      
      wx.request({
        url: this.globalData.baseUrl + '/api/auth/refresh-token',
        method: 'POST',
        header: {
          'content-type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data && res.data.token) {
            console.log('token刷新成功')
            // 保存新token
            this.globalData.token = res.data.token
            wx.setStorageSync('token', res.data.token)
            resolve(res.data.token)
          } else {
            console.error('token刷新失败:', res.data)
            // 当token刷新失败时，清除本地无效的token
            this.logout()
            reject(new Error('token刷新失败，请重新登录'))
          }
        },
        fail: (err) => {
          console.error('token刷新网络错误:', err)
          // 网络错误也清除token，避免无限重试无效的token
          this.logout()
          reject(new Error('网络错误，请重新登录'))
        }
      })
    })
  },
  
  // 通用网络请求
  request: function(options) {
    // 实际网络请求
    const token = this.globalData.token
    
    // 检查token格式是否有效
    const isValidToken = token && typeof token === 'string' && token.trim().length > 0
    
    // 防止重复刷新token的标志
    this._refreshTokenInProgress = this._refreshTokenInProgress || false
    
    return wx.request({
      url: this.globalData.baseUrl + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: {
        'content-type': 'application/json',
        'Authorization': isValidToken ? `Bearer ${token}` : ''
      },
      success: (res) => {
        console.log('API响应:', res)
        // 处理401未授权错误
        if (res.statusCode === 401 || (res.data && res.data.error && 
            (res.data.error.includes('认证令牌无效') || 
             res.data.error.includes('token无效') || 
             res.data.error.includes('token已过期')))) {
          console.log('检测到token无效或过期')
          
          // 清除无效token
          this.logout()
          
          // 避免在登录相关接口上循环重定向
          if (!options.url.includes('/api/auth/') && !options.noAutoRedirect) {
            // 显示提示并跳转到登录页面
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
          
          options.fail && options.fail({ message: '登录已过期，请重新登录' })
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
      complete: (res) => {
        options.complete && options.complete(res)
      }
    })
  },

  // 退出登录
  logout: function() {
    wx.removeStorageSync('token')
    wx.removeStorageSync('refresh_token')
    wx.removeStorageSync('userInfo')
    this.globalData.token = null
    this.globalData.userInfo = null
    
    // 清除TUIKit相关配置
    this.globalData.userID = null
    this.globalData.userSig = null
    this.globalData.SDKAppID = null
    this.globalData.isTUIKitInitialized = false
    
    // 清除全局TUIKit实例
    if (wx.$TUIKit) {
      try {
        // 先检查登录状态
        const loginStatus = wx.$TUIKit.getLoginStatus()
        if (loginStatus === wx.TencentCloudChat.TYPES.LOGIN_STATUS_LOGGED_IN) {
          wx.$TUIKit.logout()
        }
      } catch (error) {
        console.error('TUIKit登出失败:', error)
      }
      wx.$TUIKit = null
    }
    
    wx.$chat_userID = null
    wx.$chat_userSig = null
    wx.$chat_SDKAppID = null
  },

  // 如果用户已登录，初始化TUIKit
  initTUIKitIfLoggedIn: function() {
    const token = this.globalData.token
    const userInfo = this.globalData.userInfo
    
    if (token && userInfo) {
      console.log('用户已登录，开始初始化TUIKit')
      this.getIMConfigFromServer(token)
    } else {
      console.log('用户未登录，跳过TUIKit初始化')
    }
  },

  // 从后端获取IM配置参数
  getIMConfigFromServer: function(token) {
    return new Promise((resolve, reject) => {
      try {
        // 调用后端API获取IM配置参数
        this.request({
          url: '/api/im/get-config',
          method: 'GET',
          header: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          success: (res) => {
            console.log('IM配置接口响应:', res)
            
            if (res.code === 200 && res.data) {
              const config = res.data
              console.log('获取到的IM配置:', {
                SDKAppID: config.SDKAppID,
                userID: config.userID,
                userSigLength: config.userSig ? config.userSig.length : 0
              })
              
              // 检查响应数据
              if (config && config.userID && config.userSig && config.SDKAppID) {
                const { userID, userSig, SDKAppID } = config
                
                // 保存到全局数据
                this.globalData.userID = userID
                this.globalData.userSig = userSig
                this.globalData.SDKAppID = SDKAppID
                
                // 初始化TUIKit
                this.initializeTUIKit(userID, userSig, SDKAppID)
                resolve(config)
              } else {
                console.error('IM配置参数不完整:', config)
                reject(new Error('IM配置参数不完整'))
              }
            } else {
              console.error('获取IM配置失败:', res.error || '服务器返回错误')
              reject(new Error(res.error || '服务器返回错误'))
            }
          },
          fail: (error) => {
            console.error('获取IM配置失败:', error)
            reject(error)
          }
        })
      } catch (error) {
        console.error('获取IM配置异常:', error)
        reject(error)
      }
    })
  },

  // 初始化TUIKit
  initializeTUIKit: function(userID, userSig, SDKAppID) {
    try {
      console.log('开始初始化TUIKit:', { userID, SDKAppID })
      
      // 检查是否已经初始化并登录
      if (wx.$TUIKit && this.globalData.isTUIKitInitialized) {
        console.log('TUIKit已初始化，检查登录状态')
        
        try {
          // 检查当前登录状态
          const loginStatus = wx.$TUIKit.getLoginStatus()
          console.log('当前TUIKit登录状态:', loginStatus)
          
          if (loginStatus === wx.TencentCloudChat.TYPES.LOGIN_STATUS_LOGGED_IN) {
            // 检查是否是同一用户
            if (wx.$chat_userID === userID && wx.$chat_SDKAppID === parseInt(SDKAppID)) {
              console.log('TUIKit已登录相同用户，跳过重复登录')
              return
            } else {
              console.log('TUIKit已登录不同用户，需要重新登录')
              // 先登出当前用户
              wx.$TUIKit.logout().then(() => {
                console.log('已登出旧用户，开始登录新用户')
                this.performLogin(userID, userSig, SDKAppID)
              }).catch((error) => {
                console.log('登出旧用户失败，强制重新登录:', error)
                this.performLogin(userID, userSig, SDKAppID)
              })
              return
            }
          } else if (loginStatus === wx.TencentCloudChat.TYPES.LOGIN_STATUS_LOGGING) {
            console.log('TUIKit正在登录中，等待登录完成')
            return
          }
        } catch (statusError) {
          console.log('获取登录状态失败，继续执行登录流程:', statusError)
        }
      }
      
      // 如果TUIKit实例存在但未正确初始化，先销毁
      if (wx.$TUIKit && !this.globalData.isTUIKitInitialized) {
        try {
          wx.$TUIKit.logout()
        } catch (error) {
          console.log('销毁旧TUIKit实例失败:', error)
        }
        wx.$TUIKit = null
      }
      
      // 执行登录流程
      this.performLogin(userID, userSig, SDKAppID)
      
    } catch (error) {
      console.error('TUIKit初始化失败:', error)
      this.globalData.isTUIKitInitialized = false
    }
  },

  // 执行实际的登录操作
  performLogin: function(userID, userSig, SDKAppID) {
    try {
      // 初始化TUIKit实例
      wx.$TUIKit = TencentCloudChat.create({
        SDKAppID: parseInt(SDKAppID)
      })
      
      // 保存到全局变量
      wx.$chat_SDKAppID = parseInt(SDKAppID)
      wx.$chat_userID = userID
      wx.$chat_userSig = userSig
      wx.TencentCloudChat = TencentCloudChat
      
      // 登录IM
      wx.$TUIKit.login({
        userID: userID,
        userSig: userSig
      }).then(() => {
        console.log('TUIKit登录成功')
        this.globalData.isTUIKitInitialized = true

        // 设置加好友需要验证
        wx.$TUIKit.setSelfInfo({
          allowType: 'V2TIM_FRIEND_NEED_CONFIRM'
        });
        
        // 设置全局事件监听
        this.setTUIKitEventListeners()
        
      }).catch((error) => {
        console.error('TUIKit登录失败:', error)
        this.globalData.isTUIKitInitialized = false
        
        // 如果是重复登录错误，不视为失败
        if (error.message && (error.message.includes('重复登录') || error.message.includes('duplicate login'))) {
          console.log('检测到重复登录，标记为已初始化')
          this.globalData.isTUIKitInitialized = true
          this.setTUIKitEventListeners()
        } else {
          // 其他登录错误，清除实例
          wx.$TUIKit = null
        }
      })
      
    } catch (error) {
      console.error('执行登录操作失败:', error)
      this.globalData.isTUIKitInitialized = false
      wx.$TUIKit = null
    }
  },

  // 设置TUIKit全局事件监听
  setTUIKitEventListeners: function() {
    if (!wx.$TUIKit) return
    
    try {
      // 监听SDK_READY事件
      wx.$TUIKit.on(wx.TencentCloudChat.EVENT.SDK_READY, (event) => {
        console.log('TUIKit SDK准备就绪')
      })
      
      // 监听新消息
      wx.$TUIKit.on(wx.TencentCloudChat.EVENT.MESSAGE_RECEIVED, (event) => {
        console.log('收到新消息:', event)
        // 可以在这里处理全局消息通知
      })
      
      // 监听会话列表更新
      wx.$TUIKit.on(wx.TencentCloudChat.EVENT.CONVERSATION_LIST_UPDATED, (event) => {
        console.log('会话列表更新:', event)
      })
      
    } catch (error) {
      console.error('设置TUIKit事件监听失败:', error)
    }
  }
})