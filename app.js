// // app.js
import imManager from './utils/imManager.js';

App({
  globalData: {
    userInfo: null,
    token: null,
    // baseUrl: 'http://127.0.0.1:5001',
    baseUrl: 'https://api.powaa.cn',
    unreadCount: 0,
    useMockData: false, // 关闭模拟数据，使用真实后端
    // TUIKit相关配置
    userID: null,
    userSig: null,
    SDKAppID: null,
    isTUIKitInitialized: false,
    // 分享图相关配置
    shareImage: {}, // 存储分享图，key为userId
    sharedUserId: null // 分享者ID
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
      description: user.intro || '',
      avatar: user.avatar_url || '',
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
  },
  
  /**
   * 自动发送好友请求
   */
  async sendAutoFriendRequest(sharedUserId) {
    const app = getApp()
    // 调用后端API，触发分享者发送好友请求给新用户
    app.request({
      url: '/api/friendships/request',
      method: 'POST',
      data: {
        receiver_id: sharedUserId,
        reverse: true
      },
      success: (res) => {
        console.log('触发好友请求成功:', res)
        // wx.hideLoading()
        
        // // 标记已触发好友请求，避免重复触发
        // wx.setStorageSync(`sentFriendRequest_${sharedUserId}`, true)
        
        // 清除临时存储的分享者ID
        wx.removeStorageSync('sharedUserId')
        return true
      },
      fail: (error) => {
        console.error('触发好友请求失败:', error)
        // wx.hideLoading()
        return false
      },
      complete: () => {
        // 确保加载状态被隐藏
        // wx.hideLoading()
      }
    })
  },

  /**
   * 检查好友关系状态
   */
  checkFriendshipStatus: function(targetUserId) {
    if (!targetUserId) return Promise.resolve(false);
    
    // 返回Promise，以便正确处理异步结果
    return new Promise((resolve) => {
      // 调用后端接口检查好友关系
      this.request({
        url: `/api/friendships/check/${targetUserId}`,
        method: 'GET',
        allowAnonymous: true, // 允许匿名访问
        success: (res) => {
          const isFriend = res.success && res.data.is_friend;
          resolve(isFriend);
        },
        fail: (error) => {
          console.error('检查好友关系失败:', error);
          resolve(false);
        }
      });
    });
  },

  /**
   * 检查并发送好友请求
   * 用于在用户完成信息填写或AI训练后触发好友请求
   */
  checkAndSendFriendRequest: function() {
    // 获取sharedUserId，优先从全局变量获取，其次从本地缓存
    const sharedUserId = this.globalData.sharedUserId || wx.getStorageSync('sharedUserId');
    if (!sharedUserId) {
      console.log('没有有效的sharedUserId，不发送好友请求');
      return;
    }
    
    // 检查用户是否已登录
    if (!this.isLoggedIn()) {
      console.log('用户未登录，不发送好友请求');
      return;
    }
    
    // 检查用户信息是否完整
    if (!this.checkUserInfoComplete({ redirect: false })) {
      console.log('用户信息不完整，不发送好友请求');
      return;
    }
    
    // 检查AI训练状态
    const that = this;
    this.request({
      url: '/api/ai-avatars/is_trained',
      method: 'GET',
      success: async (res) => {
        if (res.success && res.data && res.data.status === 'active') {
          console.log('AI训练已完成，检查好友关系');
          
          // 检查是否为好友关系
          const isFriend = await that.checkFriendshipStatus(sharedUserId);
          if (!isFriend) {
            console.log('不是好友关系，准备发送好友请求');
            that.sendAutoFriendRequest(sharedUserId);
          } else {
            console.log('已是好友关系，不发送好友请求');
            // 清除临时存储的分享者ID
            wx.removeStorageSync('sharedUserId');
            that.globalData.sharedUserId = null;
          }
        } else {
          console.log('AI训练未完成，不发送好友请求');
        }
      },
      fail: (error) => {
        console.error('获取AI训练状态失败:', error);
      }
    });
  },

  /**
   * 获取分享图
   * @param {string} userId - 用户ID，可选，默认当前登录用户
   * @returns {string|null} 返回分享图临时文件路径，不存在则返回null
   */
  getShareImage: function(userId = null) {
    // 如果没有提供userId，使用当前登录用户ID
    const targetUserId = userId || this.globalData.userInfo?.id;
    if (!targetUserId) {
      console.log('获取分享图失败：缺少用户ID');
      return null;
    }
    
    // 优先从全局数据获取
    if (this.globalData.shareImage && this.globalData.shareImage[targetUserId]) {
      const shareImageData = this.globalData.shareImage[targetUserId];
      // 检查分享图是否过期（7天过期）
      const isExpired = Date.now() - shareImageData.timestamp > 7 * 24 * 60 * 60 * 1000;
      if (!isExpired) {
        console.log('从全局数据获取分享图', shareImageData.tempFilePath);
        return shareImageData.tempFilePath;
      }
    }
    
    // 从本地存储获取
    try {
      const shareImageData = wx.getStorageSync('shareImage_' + targetUserId);
      console.log('从本地存储获取分享图数据:', 'shareImage_' + targetUserId);
      if (shareImageData) {
        // 检查分享图是否过期（7天过期）
        const isExpired = Date.now() - shareImageData.timestamp > 7 * 24 * 60 * 60 * 1000;
        if (!isExpired) {
          console.log('从本地存储获取分享图');
          // 更新全局数据
          if (!this.globalData.shareImage) {
            this.globalData.shareImage = {};
          }
          this.globalData.shareImage[targetUserId] = shareImageData;
          return shareImageData.tempFilePath;
        }
      }
    } catch (error) {
      console.log('从本地存储获取分享图失败:', error);
    }
    
    console.log('未找到有效的分享图');
    return null;
  },

  /**
   * 绘制分享图片
   * @param {Object} userInfo - 可选，要绘制的用户信息
   * @param {string} avatarUrl - 可选，要绘制的用户头像URL
   * @returns {Promise<string>} 返回绘制好的图片临时文件路径
   */
  drawShareImage(userInfo = null, avatarUrl = null) {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery();
      query.select('#shareCanvas')
        .fields({ node: true, size: true })
        .exec(async (res) => {
          try {
            const canvas = res[0].node;
            const ctx = canvas.getContext('2d');
            
            // 设置Canvas尺寸
            const dpr = wx.getSystemInfoSync().pixelRatio;
            const canvasWidth = 600;
            const canvasHeight = 600;
            canvas.width = canvasWidth * dpr;
            canvas.height = canvasHeight * dpr;
            ctx.scale(dpr, dpr);
            
            // 1. 绘制背景
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
            
            // 2. 绘制用户头像
            const avatarSize = 240;
            const avatarX = (canvasWidth - avatarSize) / 2;
            const avatarY = 20;
            
            // 使用传入的用户信息或当前登录用户信息
            const targetUserInfo = userInfo || this.globalData.userInfo;
            const targetAvatarUrl = avatarUrl || targetUserInfo.avatarUrl;
            console.log('targetUserInfo2:', targetUserInfo);
            console.log('targetAvatarUrl2:', targetAvatarUrl);
            // 加载并绘制用户头像
            await new Promise((imgResolve, imgReject) => {
              const avatarImg = canvas.createImage();
              avatarImg.onload = () => {
                // 绘制圆形头像
                ctx.save();
                ctx.beginPath();
                ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, 2 * Math.PI);
                ctx.clip();
                ctx.drawImage(avatarImg, avatarX, avatarY, avatarSize, avatarSize);
                ctx.restore();
                imgResolve();
              };
              avatarImg.onerror = () => {
                imgReject(new Error('头像加载失败'));
              };
              avatarImg.src = targetAvatarUrl || '/images/ai.png';
            });
            
            // 3. 绘制用户名和AI分身标识
            ctx.fillStyle = '#333333';
            ctx.font = 'bold 36px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(targetUserInfo.name || '用户', canvasWidth / 2, 300);
            
            // 绘制 · AI分身（换行）
            ctx.fillStyle = '#666666';
            ctx.font = '30px sans-serif';
            ctx.fillText('AI分身', canvasWidth / 2, 345);
            
            // 绘制绿色在线状态点（换行）
            ctx.beginPath();
            ctx.arc(canvasWidth / 2 + 60, 336, 6, 0, 2 * Math.PI);
            ctx.fillStyle = '#4CAF50';
            ctx.fill();
            
            // 4. 绘制用户简介
            ctx.fillStyle = '#999999';
            ctx.font = '30px sans-serif';
            ctx.textAlign = 'center';
            
            // 获取简介内容，不限制字符数
            const description = targetUserInfo.description || '';
            
            // 绘制多行文本 - 固定最大宽度，自动换行并居中
            const lines = [];
            const maxWidth = 400; // 固定最大宽度400像素，两侧各留100像素边距
            
            // 首先按照原始换行符分割文本
            const originalLines = description.split('\n');
            
            originalLines.forEach(originalLine => {
              // 处理空行，保留原始换行
              if (originalLine === '') {
                lines.push('');
                return;
              }
              
              let currentLine = '';
              
              // 标记当前行是否已经超出宽度限制
              let lineExceeded = false;
              
              // 逐字符处理，确保文本超出宽度时添加省略号
              for (let i = 0; i < originalLine.length; i++) {
                if (lineExceeded) {
                  // 如果当前行已经超出宽度，跳过剩余所有字符
                  break;
                }
                
                const char = originalLine[i];
                const testLine = currentLine + char;
                const lineWidth = ctx.measureText(testLine).width;
                
                if (lineWidth > maxWidth && currentLine !== '') {
                  // 当前行宽度超过限制，保存当前行并添加省略号
                  const ellipsis = '...';
                  let lineWithEllipsis = currentLine + ellipsis;
                  let lineWithEllipsisWidth = ctx.measureText(lineWithEllipsis).width;
                  
                  // 确保添加省略号后不超过最大宽度
                  if (lineWithEllipsisWidth <= maxWidth) {
                    lines.push(lineWithEllipsis);
                  } else {
                    // 如果添加省略号后还是超过宽度，适当减少字符数
                    let adjustedLine = currentLine.slice(0, -1) + ellipsis;
                    let adjustedLineWidth = ctx.measureText(adjustedLine).width;
                    
                    // 如果还是超过宽度，继续减少字符数
                    while (adjustedLineWidth > maxWidth && adjustedLine.length > 3) {
                      adjustedLine = adjustedLine.slice(0, -4) + ellipsis; // 移除最后一个字符和省略号，再加新的省略号
                      adjustedLineWidth = ctx.measureText(adjustedLine).width;
                    }
                    
                    lines.push(adjustedLine);
                  }
                  
                  // 标记当前行已经超出宽度，跳过剩余字符
                  lineExceeded = true;
                  currentLine = '';
                } else {
                  // 当前行宽度未超过限制，继续添加字符
                  currentLine = testLine;
                }
              }
              
              // 添加当前行（处理完成后确保添加最后一行）
              if (currentLine) {
                lines.push(currentLine);
              }
            });
            
            // 绘制多行文本 - 限制最多3行
            const maxLines = 2;
            const displayLines = lines.slice(0, maxLines);
            
            // 如果有超过3行的内容，在第三行末尾添加省略号
            if (lines.length > maxLines && displayLines.length === maxLines) {
              const lastLine = displayLines[displayLines.length - 1];
              const ellipsis = '...';
              const ellipsisWidth = ctx.measureText(ellipsis).width;
              
              // 检查添加省略号后是否超过最大宽度
              if (ctx.measureText(lastLine + ellipsis).width <= maxWidth) {
                // 直接添加省略号
                displayLines[displayLines.length - 1] = lastLine + ellipsis;
              } else {
                // 需要截断最后一行以容纳省略号
                let truncatedLine = lastLine;
                while (ctx.measureText(truncatedLine + ellipsis).width > maxWidth && truncatedLine.length > 0) {
                  truncatedLine = truncatedLine.slice(0, -1);
                }
                displayLines[displayLines.length - 1] = truncatedLine + ellipsis;
              }
            }
            
            displayLines.forEach((line, index) => {
              // 确保文本居中
              ctx.fillText(line, canvasWidth / 2, 390 + index * 35);
            });
            
            // 5. 将Canvas转换为临时图片URL
            wx.canvasToTempFilePath({
              canvas: canvas,
              width: canvasWidth,
              height: canvasHeight,
              destWidth: canvasWidth,
              destHeight: canvasHeight,
              success: (res) => {
                resolve(res.tempFilePath);
              },
              fail: (error) => {
                console.error('转换画布为图片失败:', error);
                reject(error);
              }
            });
          } catch (error) {
            console.error('绘制分享图失败:', error);
            reject(error);
          }
        });
    });
  },

  /**
   * 生成并保存分享图到本地
   * @param {Object} userInfo - 可选，要生成分享图的用户信息
   * @param {string} avatarUrl - 可选，要生成分享图的用户头像URL
   * @returns {Promise<string>} 返回分享图临时文件路径
   */
  generateAndSaveShareImage(userInfo = null, avatarUrl = null) {
    return new Promise((resolve, reject) => {
      // 使用传入的用户信息或当前登录用户信息
      const targetUserInfo = userInfo || this.globalData.userInfo;
      const targetAvatarUrl = avatarUrl || targetUserInfo.avatar_url;
      console.log('targetUserInfo:', targetUserInfo);
      console.log('targetAvatarUrl:', targetAvatarUrl);
      // 检查用户信息是否完整（仅当绘制当前用户时检查）
      if (!userInfo && !this.checkUserInfoComplete({ redirect: false })) {
        console.log('当前用户信息不完整，不生成分享图');
        reject(new Error('当前用户信息不完整'));
        return;
      }
      
      console.log('开始生成分享图');
      
      this.drawShareImage(targetUserInfo, targetAvatarUrl)
        .then((tempFilePath) => {
          console.log('分享图绘制成功，临时文件路径:', tempFilePath);
          console.log('targetUserInfo333:', targetUserInfo);
          // 使用对应用户的ID作为缓存键
          const userId = targetUserInfo.id || this.globalData.userInfo.id;
          
          // 保存到本地缓存
          const shareImageData = {
            tempFilePath: tempFilePath,
            timestamp: Date.now(),
            userId: userId
          };
          
          // 保存到本地存储
          wx.setStorageSync('shareImage_' + userId, shareImageData);
          console.log('分享图已保存到本地缓存', 'shareImage_' + userId);
          
          // 更新全局数据
          if (!this.globalData.shareImage) {
            this.globalData.shareImage = {};
          }
          this.globalData.shareImage[userId] = shareImageData;
          
          resolve(tempFilePath);
        })
        .catch((error) => {
          console.error('生成分享图失败:', error);
          reject(error);
        });
    });
  },
})