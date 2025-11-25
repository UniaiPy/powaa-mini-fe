// pages/preview/preview.js
import TencentCloudChat from '@tencentcloud/chat';
Page({
  /**
   * 页面的初始数据
   */
  data: {
    aiStatus: 'active',      // AI分身状态（active/ inactive）
    chatUnreadCount: 0,      // 聊天未读消息数
    showMatchDegreeModal: false, // 是否显示匹配度说明弹窗
    showChatModal: false,     // 是否显示聊天弹窗
    showToast: false,         // 是否显示提示
    toastMessage: '',         // 提示消息
    greetingMessage: '你好，很高兴认识你！', // 打招呼消息
    matchDegreeContent: '',   // 匹配度说明内容
    isLoadingMatchDegree: false, // 是否正在加载匹配度说明
    matchDegreeCache: {}      // 匹配度缓存
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 获取聊天未读消息数（模拟数据）
    this.setData({
      chatUnreadCount: 3 // 示例数据，实际应从全局状态或API获取
    });
    
    // 保存传递过来的参数
    const app = getApp();
    const currentUserId = app.globalData.userInfo?.id;
    const targetUserId = options.userId || '';
    const type = options.type || '';
    
    this.setData({
      userId: targetUserId,
      type: type,
      // 判断是否为当前用户自己的名片（确保类型一致并进行空值检查）
      isOwnProfile: currentUserId && targetUserId && String(currentUserId) === String(targetUserId)
    });
    // 加载用户个人资料数据
    this.loadProfileData();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 每次显示页面时更新未读消息数
    this.updateUnreadCount();
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {
    
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    const userId = this.data.userId;
    return {
      title: '预览名片',
      path: `/pages/preview/preview?userId=${userId}&type=${this.data.type}`,
      imageUrl: '/images/share-cover.png' // 分享封面图
    };
  },

  /**
   * 导航到个人资料页面
   */
  navigateToProfile: function() {
    const userId = this.data.userId;
    wx.navigateTo({
      url: `/pages/profile/profile?userId=${userId}`
    });
  },

 

  /**
   * 显示匹配度说明
   */
  /**
   * 显示匹配度说明
   * 点击时调用匹配度分析接口，使用流式输出
   */
  showMatchDegree: function() {
    const app = getApp();
    const userId = String(app.globalData.userInfo?.id || '');
    const targetUserId = String(this.data.userId || '');
    
    if (!userId || !targetUserId) {
      this.showToast('用户信息不完整');
      return;
    }
    
    // 生成缓存键
    const cacheKey = `${userId}_${targetUserId}`;
    
    // 检查是否有缓存数据且未过期
    const cachedData = this.getCachedMatchDegree(cacheKey);
    if (cachedData) {
      this.setData({
        showMatchDegreeModal: true,
        matchDegreeContent: cachedData.content
      });
      return;
    }
    
    // 设置初始状态
    this.setData({
      showMatchDegreeModal: true,
      matchDegreeContent: '',
      isLoadingMatchDegree: true
    });
    
    // 调用匹配度分析接口
    this.fetchMatchDegree(userId, targetUserId, cacheKey);
  },
  
  /**
   * 获取匹配度分析结果
   * 使用SSE流式获取数据
   */
  fetchMatchDegree: function(userId, targetUserId, cacheKey) {
    const app = getApp();
    const baseUrl = 'http://ai.powaa.cn';
    const url = `${baseUrl}/ai/match/compare`;
    let content = '';
    let isDone = false;
    let pollCount = 0;
    const maxPollCount = 200; // 最大轮询次数，防止无限循环
    
    const requestData = {
      userId: userId,
      targetUserId: targetUserId
    };
    
    // 优化的SSE模拟轮询函数
    const mockSSE = () => {
      // 防止无限轮询
      if (isDone || pollCount >= maxPollCount) {
        console.log('轮询结束，状态:', isDone ? '完成' : '达到最大轮询次数');
        // 如果达到最大轮询次数但还未完成，强制停止加载状态
        if (pollCount >= maxPollCount) {
          this.setData({ isLoadingMatchDegree: false });
          // 如果获取到了部分内容，保存缓存
          if (content) {
            this.cacheMatchDegree(cacheKey, content);
          } else {
            // 如果没有任何内容，显示默认文本
            const defaultContent = '<div style="text-align: center; color: #666; padding: 20px 0;">暂无匹配度数据</div>';
            this.setData({ matchDegreeContent: defaultContent });
          }
        }
        return;
      }
      
      pollCount++;
      console.log(`第${pollCount}次轮询请求`);
      
      wx.request({
        url: url,
        method: 'POST',
        data: requestData,
        header: {
          'content-type': 'application/json',
          'Authorization': app.globalData.token ? `Bearer ${app.globalData.token}` : '',
          'Accept': 'text/event-stream' // 添加SSE接受头
        },
        success: (res) => {
          console.log(`第${pollCount}次轮询响应:`, res);
          
          // 处理不同类型的响应格式
          if (res.data) {
            // 1. 尝试直接作为JSON对象处理
            if (typeof res.data === 'object') {
              handleResponseData(res.data);
            }
            // 2. 尝试作为字符串处理
            else if (typeof res.data === 'string') {
              // 先尝试直接解析为JSON
              try {
                const jsonData = JSON.parse(res.data);
                handleResponseData(jsonData);
              } catch (e) {
                // 如果不是纯JSON，按SSE格式处理
                const lines = res.data.split('\n');
                lines.forEach(line => {
                  // 跳过空行
                  if (!line.trim()) return;
                  
                  // 标准SSE格式处理
                  if (line.startsWith('data:')) {
                    const dataStr = line.substring(5).trim();
                    try {
                      const data = JSON.parse(dataStr);
                      handleResponseData(data);
                    } catch (e) {
                      console.error('解析SSE data行失败:', e, '行内容:', line);
                    }
                  }
                  // 非标准格式，尝试直接解析整行
                  else {
                    try {
                      const data = JSON.parse(line);
                      handleResponseData(data);
                    } catch (e) {
                      // 如果都解析失败，记录但不中断
                      console.error('解析非标准行失败:', e, '行内容:', line);
                    }
                  }
                });
              }
            }
          }
        },
        fail: (error) => {
          console.error(`第${pollCount}次轮询失败:`, error);
          // 请求失败时也继续轮询几次，可能是网络波动
          if (pollCount < maxPollCount / 2) {
            setTimeout(mockSSE, 500); // 失败时延长间隔
          } else {
            // 失败次数过多，停止轮询
            isDone = true;
            this.setData({ isLoadingMatchDegree: false });
            this.showToast('获取匹配度说明失败，请稍后重试');
          }
        },
        complete: () => {
          // 只有在未完成时才继续轮询
          if (!isDone && pollCount < maxPollCount) {
            setTimeout(mockSSE, 200); // 调整轮询间隔
          }
        }
      });
    };
    
    // 统一处理响应数据的函数
    const handleResponseData = (data) => {
      console.log('处理响应数据:', data);
      
      // 检查是否有content字段
      if (data.content && typeof data.content === 'string') {
        content += data.content;
        this.setData({ matchDegreeContent: content });
      }
      // 检查是否有complete或done标志
      if (data.done || data.complete || data.finished) {
        isDone = true;
        this.setData({ isLoadingMatchDegree: false });
        // 保存缓存
        if (content) {
          this.cacheMatchDegree(cacheKey, content);
        }
      }
    };
    
    // 启动轮询
    mockSSE();
  },
  
  /**
   * 缓存匹配度结果
   */
  cacheMatchDegree: function(cacheKey, content) {
    try {
      const cacheData = {
        content: content,
        timestamp: Date.now()
      };
      
      // 更新内存缓存
      const cache = this.data.matchDegreeCache;
      cache[cacheKey] = cacheData;
      this.setData({ matchDegreeCache: cache });
      
      // 保存到本地存储
      wx.setStorageSync('matchDegreeCache', cache);
    } catch (e) {
      console.error('缓存匹配度结果失败:', e);
    }
  },
  
  /**
   * 获取缓存的匹配度结果
   */
  getCachedMatchDegree: function(cacheKey) {
    try {
      // 先从内存缓存获取
      const memoryCache = this.data.matchDegreeCache;
      if (memoryCache[cacheKey]) {
        const cachedTime = memoryCache[cacheKey].timestamp;
        // 缓存有效期为30分钟
        if (Date.now() - cachedTime < 30 * 60 * 1000) {
          return memoryCache[cacheKey];
        }
      }
      
      // 从本地存储获取
      const storageCache = wx.getStorageSync('matchDegreeCache') || {};
      if (storageCache[cacheKey]) {
        const cachedTime = storageCache[cacheKey].timestamp;
        // 缓存有效期为30分钟
        if (Date.now() - cachedTime < 30 * 60 * 1000) {
          // 更新内存缓存
          const cache = this.data.matchDegreeCache;
          cache[cacheKey] = storageCache[cacheKey];
          this.setData({ matchDegreeCache: cache });
          return storageCache[cacheKey];
        }
      }
    } catch (e) {
      console.error('获取缓存匹配度失败:', e);
    }
    return null;
  },

  /**
   * 关闭匹配度说明弹窗
   */
  /**
   * 关闭匹配度说明弹窗
   */
  closeMatchDegree: function() {
    this.setData({
      showMatchDegreeModal: false,
      isLoadingMatchDegree: false
      // 保留matchDegreeContent以便下次快速显示缓存内容
    });
  },

  /**
   * 开始聊天
   */
  startChat: function() {
    const app = getApp();
    const targetUserId = this.data.userId;
    // 调用后端接口检查好友关系
    app.request({
      url: `/api/friendships/check/${targetUserId}`,
      method: 'GET',
      success: (res) => {
        if (res.success && res.data.is_friend) {
          // 是好友，直接跳转聊天会话页面
          wx.navigateTo({
            url: `/pages/conversation/conversation?conversationID=C2C${targetUserId}`
          });
        } else {
          // 不是好友，显示打招呼弹窗
          this.setData({
            showChatModal: true
          });
        }
      },
      fail: (error) => {
        console.error('检查好友关系失败:', error);
        // 失败时默认显示打招呼弹窗
        this.setData({
          showChatModal: true
        });
      }
    });
  },

  /**
   * 关闭聊天弹窗
   */
  closeChatModal: function() {
    this.setData({
      showChatModal: false
    });
  },

  /**
   * 发送打招呼消息
   */
  sendGreeting: function() {
    const message = this.data.greetingMessage;
    
    if (!message || message.trim() === '') {
      this.showToast('请输入打招呼消息');
      return;
    }
    
    // 显示加载状态
    wx.showLoading({
      title: '发送中...',
    });
    
    // 构建目标用户对象
    const targetUser = {
      id: this.data.userId,
      userID: this.data.userId, // 腾讯云IM使用userID字段
      name: this.data.userInfo?.name || '用户',
      avatar: this.data.avatarUrl || ''
    };
    
    // 获取app实例用于后续使用（提前定义，确保在整个函数作用域内可用）
    const app = getApp();
    
    // 检查TUIKit是否已初始化
    if (!wx.$TUIKit) {
      console.error('TUIKit未初始化，尝试初始化');
      
      // 尝试初始化TUIKit
      if (app.globalData.token && app.globalData.userInfo) {
        console.log('用户已登录，尝试获取IM配置并初始化TUIKit');
        app.getIMConfigFromServer(app.globalData.token).then(() => {
          // 等待一小段时间让初始化完成
          setTimeout(() => {
            if (wx.$TUIKit) {
              console.log('TUIKit初始化成功，重新执行添加好友');
              this.addFriend(targetUser, message);
            } else {
              console.error('TUIKit初始化失败');
              wx.hideLoading();
              this.showToast('IM服务初始化失败，请稍后重试');
            }
          }, 1000);
        }).catch((error) => {
          console.error('获取IM配置失败:', error);
          wx.hideLoading();
          this.showToast('IM服务配置获取失败，请稍后重试');
        });
      } else {
        console.error('用户未登录，无法初始化TUIKit');
        wx.hideLoading();
        this.showToast('请先登录后再使用此功能');
      }
      return;
    }
    
    // 调用腾讯云IM添加好友API
    console.log('=== 开始发送好友请求 ===');
    console.log('发送方用户ID:', wx.$chat_userID);
    console.log('接收方用户ID:', targetUser.userID);
    console.log('目标用户对象:', targetUser);
    console.log('当前用户信息:', app.globalData.userInfo);
    
    // 检查腾讯云IM常量值
    console.log('=== 腾讯云IM好友类型常量 ===');
    console.log('SNS_ADD_TYPE_SINGLE:', TencentCloudChat.TYPES.SNS_ADD_TYPE_SINGLE);
    console.log('SNS_ADD_TYPE_BOTH:', TencentCloudChat.TYPES.SNS_ADD_TYPE_BOTH);
    console.log('SNS_ADD_TYPE_FOLLOW:', TencentCloudChat.TYPES.SNS_ADD_TYPE_FOLLOW);
    
    // 添加双向好友
    wx.$TUIKit.addFriend({
      to: targetUser.userID,
      source: 'AddSource_Type_Web',
      remark: '',
      wording: message, // 使用打招呼消息作为验证消息
      type: TencentCloudChat.TYPES.SNS_ADD_TYPE_BOTH, // 双向好友，需要对方确认
      addWording: message
    }).then(res => {
      console.log('=== TUIKit添加好友成功 ===');
      console.log('完整响应:', JSON.stringify(res, null, 2));
      
      // 检查响应中的关键信息
      if (res.data) {
        console.log('响应数据:', res.data);
        if (res.data.code === 0) {
          console.log('✅ 好友请求已成功发送到腾讯云IM服务器');
          console.log('目标用户:', targetUser.userID, '应该能在待联系列表中看到此请求');
          
          // 立即检查好友申请状态
          setTimeout(() => {
            console.log('=== 检查好友申请状态 ===');
            wx.$TUIKit.getFriendApplicationList().then(appResponse => {
              console.log('发送方的好友申请列表:', JSON.stringify(appResponse, null, 2));
            }).catch(err => {
              console.error('获取发送方好友申请失败:', err);
            });
          }, 1000);
          
        } else if (res.data.code === 30539) {
          console.log('⚠️ 好友申请已存在，无需重复申请');
          this.showToast('好友申请已存在，无需重复申请');
        } else {
          console.log('⚠️ 其他响应码:', res.data.code, res.data.message);
          this.showToast(`操作失败: ${res.data.message || '未知错误'}`);
        }
      }
      
      wx.hideLoading();
      
      // 关闭弹窗
      this.closeChatModal();
      
      // 显示成功提示
      this.showToast('好友请求已发送');
      
      // 跳转到聊天页面
      setTimeout(() => {
        wx.navigateTo({
          url: `/pages/chat/chat?userId=${targetUser.userID}&userName=${encodeURIComponent(targetUser.name)}`
        });
      }, 1000);
      
    }).catch(err => {
      console.error('=== TUIKit添加好友失败 ===');
      console.error('完整错误信息:', JSON.stringify(err, null, 2));
      console.error('错误码:', err.code);
      console.error('错误消息:', err.message);
      console.error('错误类型:', typeof err);
      
      wx.hideLoading();
      
      // 处理特定错误码
      if (err.code === 10009) {
        console.log('✅ 已经是好友关系');
        this.showToast('已经是好友关系');
        // 已经是好友，直接跳转到聊天页面
        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/chat/chat?userId=${targetUser.userID}&userName=${encodeURIComponent(targetUser.name)}`
          });
        }, 1000);
      } else if (err.code === 10010) {
        console.log('⏰ 好友申请已发送，等待对方同意');
        this.showToast('好友申请已发送，请等待对方同意');
        this.closeChatModal();
      } else if (err.code === 20009) {
        console.log('❌ 非好友无法发送消息，需要先加好友');
        this.showToast('需要先添加好友才能发送消息');
      } else if (err.code === 30001) {
        console.log('❌ 服务器内部错误');
        this.showToast('服务器错误，请稍后重试');
      } else if (err.code === 50001) {
        console.log('❌ 网络连接失败');
        this.showToast('网络连接失败，请检查网络');
      } else {
        console.log('❌ 其他错误:', err.message);
        this.showToast(`添加好友失败: ${err.message || '未知错误'}`);
        
        // 尝试通过后端API发送好友请求（备用方案）
        this.sendFriendRequestViaBackend(targetUser, message);
      }
    });
  },

  /**
   * 通过后端API发送好友请求（备用方案）
   */
  sendFriendRequestViaBackend: function(targetUser, message) {
    const app = getApp();
    
    console.log('通过后端API发送好友请求');
    console.log('目标用户信息:', targetUser);
    console.log('当前用户信息:', app.globalData.userInfo);
    console.log('请求参数:', {
      toUserId: targetUser.userID,
      message: message,
      source: 'preview_page'
    });
    
    app.request({
      url: '/api/friendships/request',
      method: 'POST',
      data: {
        toUserId: targetUser.userID,
        message: message,
        source: 'preview_page'
      },
      success: (res) => {
        console.log('通过后端发送好友请求成功 - 目标用户:', targetUser.userID, '响应:', res);
        console.log('成功响应详情:', JSON.stringify(res, null, 2));
        
        if (res.code === 0) {
          this.closeChatModal();
          this.showToast('好友请求已发送');
        } else {
          console.error('后端API返回错误:', res);
          this.showToast(res.message || '发送失败，请稍后重试');
        }
      },
      fail: (error) => {
        console.error('通过后端发送好友请求失败:', error);
        console.error('请求失败详情:', JSON.stringify(error, null, 2));
        this.showToast('网络错误，请稍后重试');
      }
    });
  },

  /**
   * 输入框内容变化
   */
  onInput: function(e) {
    this.setData({
      greetingMessage: e.detail.value
    });
  },

  /**
   * 显示提示信息
   */
  showToast: function(message) {
    this.setData({
      showToast: true,
      toastMessage: message
    });
    
    // 2秒后自动隐藏
    setTimeout(() => {
      this.setData({
        showToast: false
      });
    }, 2000);
  },

  /**
   * 导航到聊天页面
   */
  navigateToChat: function() {
    wx.navigateTo({
      url: '/pages/chat/chat'
    });
  },

  /**
   * 导航到AI分身页面
   */
  navigateToAvatar: function() {
    wx.navigateTo({
      url: '/pages/avatar/avatar'
    });
  },

  /**
   * 导航到名片页面
   */
  navigateToProfile: function() {
    const userId = this.data.userId;
    wx.navigateTo({
      url: `/pages/profile/profile?userId=${userId}`
    });
  },

  /**
   * 更新未读消息数
   */
  updateUnreadCount: function() {
    // 这里应该从全局状态或API获取实际的未读消息数
    // 示例中使用模拟数据
    this.setData({
      chatUnreadCount: 3
    });
  },

  /**
   * 加载用户个人资料数据
   */
  loadProfileData: function() {
    const app = getApp();
    
    wx.showLoading({
      title: '加载中...',
    });
    
    const userId = this.data.userId;
    const requestUrl = `/api/users/profile/${userId}`;
    
    app.request({
      url: requestUrl,
      method: 'GET',
      success: (res) => {
        console.log('获取用户信息成功:', res);
        
        if (res.code === 0 && res.data) {
          // 更新页面数据
          const updateData = {};
          
          // 更新用户基本信息
          if (res.data.userInfo) {
            updateData.userInfo = res.data.userInfo;
            // 更新打招呼消息中的用户名
            if (res.data.userInfo.name) {
              updateData.greetingMessage = `你好，${res.data.userInfo.name}！很高兴认识你！`;
            }
          }
          
          // 更新联系信息
          if (res.data.contactInfo) {
            updateData.contactInfo = res.data.contactInfo;
          }
          
          // 更新社交媒体列表
          if (res.data.socialMediaList) {
            updateData.socialMediaList = res.data.socialMediaList;
          }
          
          // 更新头像
          if (res.data.avatar_url) {
            updateData.avatarUrl = res.data.avatar_url;
          }
          
          // 设置页面数据
          this.setData(updateData);
        } else {
          this.showToast(res.message || '获取用户信息失败');
        }
      },
      fail: (error) => {
        console.error('获取用户信息失败:', error);
        this.showToast('网络错误，请稍后重试');
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  // 复制社交媒体链接
  copySocialMedia(e) {
    const url = e.currentTarget.dataset.url
    wx.setClipboardData({
      data: url,
      success: () => {
        wx.showToast({
          title: '链接已复制',
          icon: 'success'
        })
      },
      fail: () => {
        this.showToast('复制失败');
      }
    })
  },
   /**
   * 打开分享
   */
  openShare() {
    wx.navigateTo({
      url: '/pages/share/share'
    })
  },
  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    const app = getApp()
    const userId = app.globalData.userInfo.id;
    return {
      title: `${this.data.userInfo.name}的AI名片`,
      path: `/pages/preview/preview?type=profile&userId=${userId}`,
      imageUrl: this.data.avatarUrl
    }
  },
  onShareTimeline() {
    const app = getApp()
    const userId = app.globalData.userInfo.id;
    return {
      title: `${this.data.userInfo.name}的AI名片`,
      path: `/pages/preview/preview?type=profile&userId=${userId}`,
      imageUrl: this.data.avatarUrl
    }
  }
})