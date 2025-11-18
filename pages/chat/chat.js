// pages/chat/chat.js
import imManager from '../../utils/imManager.js'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    activeSection: 'contacts', // 默认显示联系人
    contactsList: [],
    pendingList: [],
    showSearch: false,
    searchText: '',
    showSearchResults: false,
    searchResults: [],
    isImInitialized: false // IM初始化状态
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 检查TUIKit是否已在app.js中初始化
    this.checkTUIKitStatus();
  },
  
  // 检查TUIKit状态 - 重新设计使用imManager
  checkTUIKitStatus: function() {
    const app = getApp()
    
    // 检查是否已登录
    if (!app.globalData.token || !app.globalData.userInfo) {
      console.error('用户未登录');
      // 跳转到登录页面
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/login/login'
        });
      }, 1500);
      return;
    }
    
    // 使用imManager检查状态
    const imStatus = imManager.checkIMStatus();
    console.log('IM状态检查:', imStatus);
    
    // 如果IM已初始化且已登录，直接加载数据
    if (imStatus.isInitialized && imStatus.isLoggedIn) {
      console.log('✅ IM已初始化且已登录，直接加载数据');
      this.setData({
        isImInitialized: true
      });
      
      // 设置页面级别的事件监听
      this.setImEventListeners();
      
      // 加载数据
      this.loadConversationList();
      this.loadFriendRequests();
    } else {
      console.log('⏳ IM未完全初始化，开始初始化流程');
      // 主动触发IM初始化
      this.initIMWithManager();
    }
  },
  
  // 使用imManager初始化IM
  initIMWithManager: function() {
    const app = getApp();
    
    // 显示加载提示
    wx.showLoading({
      title: '初始化IM中...',
    });
    
    // 检查是否有必要的用户信息
    if (!app.globalData.userInfo || !app.globalData.userInfo.userId) {
      console.error('缺少必要的用户信息');
      wx.hideLoading();
      wx.showToast({
        title: '用户信息不完整',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/login/login'
        });
      }, 1500);
      return;
    }
    
    // 从app.js获取IM配置
    const userID = app.globalData.userInfo.userId.toString();
    const userSig = app.globalData.userInfo.userSig;
    const SDKAppID = app.globalData.sdkAppID;
    
    if (!userSig || !SDKAppID) {
      console.error('缺少IM配置信息:', { userSig: !!userSig, SDKAppID: !!SDKAppID });
      wx.hideLoading();
      wx.showToast({
        title: 'IM配置不完整',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/login/login'
        });
      }, 1500);
      return;
    }
    
    // 使用imManager初始化
    imManager.initialize(userID, userSig, SDKAppID)
      .then(() => {
        console.log('✅ IM初始化成功');
        wx.hideLoading();
        this.setData({
          isImInitialized: true
        });
        
        // 设置页面级别的事件监听
        this.setImEventListeners();
        
        // 加载数据
        this.loadConversationList();
        this.loadFriendRequests();
        
        // 检查和设置用户隐私设置
        this.checkAndSetPrivacySettings();
      })
      .catch((error) => {
        console.error('❌ IM初始化失败:', error);
        wx.hideLoading();
        
        // 根据错误类型显示不同的提示
        if (error.message && error.message.includes('用户未登录')) {
          wx.showToast({
            title: '请先登录',
            icon: 'none'
          });
          setTimeout(() => {
            wx.navigateTo({
              url: '/pages/login/login'
            });
          }, 1500);
        } else {
          wx.showToast({
            title: 'IM初始化失败',
            icon: 'none'
          });
          // 初始化失败时跳转到登录页面
          setTimeout(() => {
            wx.navigateTo({
              url: '/pages/login/login'
            });
          }, 1500);
        }
      });
  },
  
  // 设置IM事件监听（页面级别）
  setImEventListeners: function() {
    if (!wx.$TUIKit) return;
    
    try {
      // 监听SDK_READY事件
      wx.$TUIKit.on(wx.TencentCloudChat.EVENT.SDK_READY, (event) => {
        console.log('IM SDK准备就绪');
      });
      
      // 监听会话列表更新
      wx.$TUIKit.on(wx.TencentCloudChat.EVENT.CONVERSATION_LIST_UPDATED, (event) => {
        this.onConversationListUpdated(event);
      });
      
      // 监听新消息
      wx.$TUIKit.on(wx.TencentCloudChat.EVENT.MESSAGE_RECEIVED, (event) => {
        this.onMessageReceived(event);
      });
      
      // 设置好友申请监听
      this.setupFriendApplicationListener();
      
    } catch (error) {
      console.error('设置IM事件监听失败:', error);
    }
  },
  
  // 会话列表更新回调
  onConversationListUpdated: function(event) {
    this.loadConversationList();
  },
  
  // 收到新消息回调
  onMessageReceived: function(event) {
    this.loadConversationList();
  },
  
  // 好友请求列表更新回调
  onFriendRequestListUpdated: function(event) {
    this.loadFriendRequests();
  },
  
  // 加载会话列表 - 简化版本，使用imManager状态管理
  loadConversationList: function() {
    wx.showLoading({
      title: '加载会话中...',
    });
    
    try {
      // 使用imManager等待登录完成，而不是自定义的waitForSDKReady
      imManager.waitForLogin(10000)
        .then(() => {
          console.log('✅ IM已登录，开始获取会话列表');
          
          // 再次检查TUIKit是否可用
          if (!wx.$TUIKit) {
            throw new Error('TUIKit实例不可用');
          }
          
          // 调用getConversationList
          return wx.$TUIKit.getConversationList();
        })
        .then((imResponse) => {
          console.log('获取会话列表成功:', imResponse);
          
          // 按照TUIConversation组件的方式处理数据
          let actualConversationList = [];
          
          if (imResponse && imResponse.data && imResponse.data.conversationList) {
            actualConversationList = imResponse.data.conversationList;
            console.log('找到会话列表数组:', actualConversationList);
          } else {
            console.warn('未找到会话列表数据，返回结构:', imResponse);
          }
          
          // 验证actualConversationList是否为数组
          if (!Array.isArray(actualConversationList)) {
            console.error('会话列表数据格式错误，期望数组，实际收到:', typeof actualConversationList, actualConversationList);
            throw new Error('会话列表数据格式错误');
          }
          
          // 处理会话列表数据
          this.processConversationList(actualConversationList);
        
        })
        .catch((error) => {
          console.error('获取会话列表失败:', error);
          console.error('错误详情:', {
            message: error.message,
            stack: error.stack,
            code: error.code
          });
          
          // 根据错误类型显示不同的提示
          let errorMessage = '加载会话失败';
          if (error.message && error.message.includes('等待IM登录超时')) {
            errorMessage = 'IM初始化超时';
          } else if (error.message && error.message.includes('TUIKit实例不可用')) {
            errorMessage = 'IM服务不可用';
          }
          
          wx.showToast({
            title: errorMessage,
            icon: 'none',
            duration: 2000
          });
        });
      
    } catch (error) {
      console.error('加载会话列表失败:', error);
      wx.showToast({
        title: '加载会话失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  },
  
  // 处理会话列表数据的独立方法
  processConversationList: function(conversationList) {
    console.log('开始处理会话列表，数量:', conversationList.length);
    
    // 先过滤掉AI分身的会话
    const filteredConversationList = conversationList.filter(conversation => {
      const userProfile = conversation.userProfile || {};
      const userId = userProfile.userID;
      
      // 过滤掉AI分身的会话
      if (userId && (userId === 'AI分身')) {
        console.log('过滤掉AI分身会话:', userId);
        return false;
      }
      return true;
    });
    
    // 处理会话列表数据
    const contactsList = filteredConversationList.map((conversation, index) => {
      console.log('处理会话:', conversation);
      
      // 只处理C2C类型会话
      if (conversation.type !== wx.TencentCloudChat.TYPES.CONV_C2C) {
        console.log('跳过非C2C会话:', conversation.type);
        return null;
      }
      
      // 用户信息
      const userProfile = conversation.userProfile || {};

      // 获取最后一条消息
      const lastMessage = conversation.lastMessage || {};
      
      // 格式化时间
      const time = this.formatTime(lastMessage.lastTime || Date.now());
      
      const contact = {
        id: conversation.conversationID,
        userId: userProfile.userID,
        name: userProfile.nick,
        avatar: this.processAvatarUrl(userProfile.avatar),
        originalAvatar: userProfile.avatar, // 保存原始头像地址
        lastMessage:  lastMessage.messageForShow || lastMessage.payload?.text,
        time: time,
        unread: conversation.unreadCount || 0
      };
      
      return contact;
    }).filter(Boolean);
    
    console.log('处理后的联系人列表:', contactsList);
    
    this.setData({
      contactsList: contactsList
    }, () => {
      // 数据设置完成后，批量获取头像URL
      this.batchGetAvatarUrls(contactsList, 1);
    });
  },
  
  // 加载好友申请列表
  async loadFriendRequests() {
    try {
      console.log('🔍 开始加载好友申请列表...');
      
      if (!this.data.isImInitialized || !wx.$TUIKit) {
        console.log('📦 IM未初始化，跳过好友申请加载');
        return;
      }

      // 等待确保登录完成
      const imManager = getApp().globalData.imManager;
      if (imManager) {
        const isLoginReady = await imManager.waitForLogin(10000);
        if (!isLoginReady) {
          console.error('❌ 等待登录超时，无法加载好友申请');
          return;
        }
      }

      const friendApplicationList = await wx.$TUIKit.getFriendApplicationList();
      console.log('📬 好友申请列表原始数据:', JSON.stringify(friendApplicationList, null, 2));

      if (friendApplicationList.code === 0) {
        // 修复数据结构解析逻辑
        let applications = [];
        
        // 检查实际的数据结构
        if (friendApplicationList.data) {
          if (Array.isArray(friendApplicationList.data)) {
            applications = friendApplicationList.data;
          } else if (friendApplicationList.data.friendApplicationList && Array.isArray(friendApplicationList.data.friendApplicationList)) {
            applications = friendApplicationList.data.friendApplicationList;
          } else if (friendApplicationList.data.applicationList && Array.isArray(friendApplicationList.data.applicationList)) {
            applications = friendApplicationList.data.applicationList;
          } else {
            console.warn('未知的data结构:', friendApplicationList.data);
            applications = [];
          }
        } else if (friendApplicationList.friendApplicationList && Array.isArray(friendApplicationList.friendApplicationList)) {
          // 直接在根级别的情况
          applications = friendApplicationList.friendApplicationList;
        } else {
          console.warn('未知的响应结构:', friendApplicationList);
          applications = [];
        }
        
        // 确保是数组才进行处理
        if (!Array.isArray(applications)) {
          throw new Error('申请列表不是数组格式');
        }
        console.log('📋 申请列表总数:', applications.length);
        
        // 详细分析申请类型
        const sentToMeApps = applications.filter(app => {
          // 检查多种可能的类型值
          const isSentToMe = app.type === wx.TencentCloudChat.TYPES.SNS_APPLICATION_SENT_TO_ME ||
                            app.type === 'SNS_APPLICATION_SENT_TO_ME' ||
                            app.type === 1; // 有可能是数字类型
          
          if (isSentToMe) {
            console.log('✅ 找到发送给我的申请:', app.userID || app.nick);
          }
          return isSentToMe;
        });
        
        const sentFromMeApps = applications.filter(app => {
          const isSentFromMe = app.type === wx.TencentCloudChat.TYPES.SNS_APPLICATION_SENT_FROM_ME ||
                              app.type === 'SNS_APPLICATION_SENT_FROM_ME' ||
                              app.type === 2; // 有可能是数字类型
          
          if (isSentFromMe) {
            console.log('📤 我发送的申请:', app.userID || app.nick);
          }
          return isSentFromMe;
        });
        
        // 打印每个申请的详细信息
        // applications.forEach((app, index) => {
        //   console.log(`申请${index + 1}详情:`, {
        //     userID: app.userID,
        //     nickname: app.nickname,
        //     nick: app.nick, // 注意：可能是 nick 而不是 nickname
        //     type: app.type,
        //     addTime: app.addTime,
        //     time: app.time, // 注意：可能是 time 而不是 addTime
        //     addSource: app.addSource,
        //     source: app.source, // 注意：可能是 source 而不是 addSource
        //     wording: app.wording,
        //     status: app.status
        //   });
        // });

        // 只显示收到的好友申请（别人发给当前用户的）
        const pendingList = sentToMeApps
          .filter(app => {
            // 更灵活的有效性检查
            const userID = app.userID;
            const time = app.addTime || app.time;
            const isValid = userID && time;
            if (!isValid) {
              console.warn('⚠️ 无效的申请记录:', app);
            }
            return isValid;
          })
          .map((app, index) => {
            console.log(`处理申请${index + 1}:`, app);
            // 格式化时间
            const time = this.formatTime(app.time);
            return {
              id: app.userID,
              name: app.nick || app.nickname || app.userID,
              avatar: this.processAvatarUrl(app.avatar),
              originalAvatar: app.avatar, // 保存原始头像地址
              message: app.wording,
              time: time,
              requestId: app.userID, // 使用userID作为requestId
              type: app.type,
              addSource: app.addSource || app.source
            };
          });

        // console.log('🎯 最终待处理的好友申请列表:', pendingList);
        // console.log('📝 设置到页面的pendingList:', pendingList.length, '条记录');
        
        // // 添加更详细的调试信息
        // console.log('🔍 调试信息 - pendingList详情:');
        // pendingList.forEach((item, index) => {
        //   console.log(`待处理申请${index + 1}:`, {
        //     id: item.id,
        //     name: item.name,
        //     message: item.message,
        //     time: item.time,
        //     requestId: item.requestId,
        //     type: item.type,
        //     addSource: item.addSource
        //   });
        // });
        
        // console.log('🔍 调试信息 - 页面状态检查:');
        // console.log('- 当前activeSection:', this.data.activeSection);
        // console.log('- 当前pendingList长度:', this.data.pendingList.length);
        // console.log('- 即将设置的pendingList长度:', pendingList.length);

        this.setData({
          pendingList: pendingList
        }, () => {
          console.log('✅ pendingList已设置到页面，当前长度:', this.data.pendingList.length);
          console.log('📋 页面pendingList内容:', this.data.pendingList);
          
          // 数据设置完成后，批量获取头像URL
          this.batchGetAvatarUrls(pendingList, 2);
          
          // 如果有待处理的好友请求，自动切换到待联系标签
          if (pendingList.length > 0 && this.data.activeSection === 'contacts') {
            console.log('🔄 发现好友请求，自动切换到待联系标签');
            this.setData({
              activeSection: 'pending'
            });
            console.log(`收到${pendingList.length}个好友申请`);
          }
        });

        // 显示通知
        if (pendingList.length > 0) {
          const app = getApp();
          if (app.globalData.imManager) {
            app.globalData.imManager.showNotification(
              `收到 ${pendingList.length} 个好友申请`,
              pendingList.map(req => req.name).join(', ')
            );
          }
        }
      } else {
        console.error('❌ 获取好友申请列表失败:', friendApplicationList);
      }
    } catch (error) {
      console.error('❌ 加载好友申请列表失败:', error);
    }
  },
  
  /**
   * 设置好友申请监听
   */
  setupFriendApplicationListener: function() {
    console.log('=== 设置好友申请监听 ===');
    
    if (!wx.$TUIKit) {
      console.error('❌ TUIKit未初始化，无法设置监听');
      return;
    }
    
    try {
      // 检查事件常量是否存在
      const EVENT = wx.TencentCloudChat.EVENT;
      if (!EVENT) {
        console.error('❌ TUIKit事件常量不存在');
        return;
      }
      
      console.log('📋 可用的事件常量:', EVENT);
      
      // 监听好友申请列表更新 - 使用try-catch包装每个监听器
      if (EVENT.FRIEND_APPLICATION_LIST_UPDATED) {
        try {
          wx.$TUIKit.on(EVENT.FRIEND_APPLICATION_LIST_UPDATED, (event) => {
            console.log('=== 📬 好友申请列表更新事件 ===');
            console.log('事件数据:', JSON.stringify(event, null, 2));
            
            // 重新加载好友申请列表
            this.loadFriendRequests();
          });
          console.log('✅ 好友申请列表更新监听设置成功');
        } catch (error) {
          console.error('❌ 设置好友申请列表更新监听失败:', error);
        }
      } else {
        console.warn('⚠️ FRIEND_APPLICATION_LIST_UPDATED 事件常量不存在');
      }
      
      // 监听好友申请被处理
      if (EVENT.FRIEND_APPLICATION_PROCESS) {
        try {
          wx.$TUIKit.on(EVENT.FRIEND_APPLICATION_PROCESS, (event) => {
            console.log('=== 🔄 好友申请处理事件 ===');
            console.log('事件数据:', JSON.stringify(event, null, 2));
            
            // 重新加载好友申请列表
            this.loadFriendRequests();
          });
          console.log('✅ 好友申请处理监听设置成功');
        } catch (error) {
          console.error('❌ 设置好友申请处理监听失败:', error);
        }
      } else {
        console.warn('⚠️ FRIEND_APPLICATION_PROCESS 事件常量不存在');
      }
      
      // 监听好友列表更新（当好友申请被同意后）
      if (EVENT.FRIEND_LIST_UPDATED) {
        try {
          wx.$TUIKit.on(EVENT.FRIEND_LIST_UPDATED, (event) => {
            // console.log('=== 👥 好友列表更新事件 ===');
            // console.log('事件数据:', JSON.stringify(event, null, 2));
            
            // 刷新会话列表
            this.loadConversationList();
          });
          console.log('✅ 好友列表更新监听设置成功');
        } catch (error) {
          console.error('❌ 设置好友列表更新监听失败:', error);
        }
      } else {
        console.warn('⚠️ FRIEND_LIST_UPDATED 事件常量不存在');
      }
      
    } catch (error) {
      console.error('❌ 设置好友申请监听过程中发生错误:', error);
    }
    
    console.log('✅ 好友申请监听设置完成');
  },

  // 查看自己发送的好友请求状态
  loadSentFriendRequests: function() {
    console.log('查看自己发送的好友请求...');
    
    const app = getApp();
    const currentUserId = app.globalData.userInfo?.userId || app.globalData.userInfo?.id;
    console.log('当前用户ID:', currentUserId, '查看发送的好友请求');
    
    wx.showLoading({
      title: '加载中...',
    });
    
    // 调用后端API获取发送的好友请求
    app.request({
      url: `/api/friendships/sent`,
      method: 'GET',
      success: (res) => {
        console.log('获取发送的好友请求响应:', JSON.stringify(res, null, 2));
        
        if (res.code === 200 && res.data && res.data.sent_requests) {
          console.log('发送的好友请求数量:', res.data.sent_requests.length);
          
          res.data.sent_requests.forEach((request, index) => {
            console.log(`发送的好友请求${index + 1}:`, {
              request_id: request.request_id,
              receiver_id: request.receiver_id,
              receiver_nickname: request.receiver_nickname,
              message: request.message,
              request_time: request.request_time,
              status: request.status
            });
          });
          
          wx.showModal({
            title: '发送的好友请求',
            content: `您发送了${res.data.sent_requests.length}个好友请求，详情请查看控制台`,
            showCancel: false
          });
        } else {
          console.log('没有找到发送的好友请求或接口返回异常');
          wx.showToast({
            title: '暂无发送的请求',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('获取发送的好友请求失败:', err);
        wx.showToast({
          title: '暂不支持查看',
          icon: 'none'
        });
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },
  
  // 处理头像URL，确保在小程序中可以正常显示（优化版本）
  processAvatarUrl: function(avatarUrl) {
    if (!avatarUrl) {
      return '/images/ai.png';
    }
    
    // 如果是外部URL，直接返回
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      return avatarUrl;
    }
    
    // 如果是相对路径，返回临时头像路径
    // 批量处理会在后续统一获取预签名URL并更新
    return '/images/ai.png';
  },

  // 批量获取头像预签名URL（优化性能）
  batchGetAvatarUrls: function(userList, type) {
    const app = getApp();
    
    // 收集所有需要获取临时URL的头像
    const avatarRequests = [];
    userList.forEach((user, index) => {
      // 使用originalAvatar字段来获取原始头像地址
      const originalAvatar = user.originalAvatar || user.avatar;
      if (originalAvatar && !originalAvatar.startsWith('http://')
         && !originalAvatar.startsWith('https://')
         && originalAvatar !== '/images/ai.png') {
        avatarRequests.push({
          key: originalAvatar,
          index: index,
          userId: user.id || user.userId
        });
      }
    });
    
    if (avatarRequests.length === 0) {
      return Promise.resolve();
    }
    
    console.log(`批量获取${avatarRequests.length}个头像的预签名URL`);
    
    // 批量请求预签名URL
    return new Promise((resolve, reject) => {
      app.request({
        url: '/api/upload/batch-signed-urls',
        method: 'POST',
        data: {
          files: avatarRequests.map(req => ({
            key: req.key,
            expires: 3600 // 1小时有效期
          }))
        },
        success: (res) => {
          if (res.success && res.urls) {
            // 批量更新头像URL
            res.urls.forEach((urlInfo, index) => {
              const originalRequest = avatarRequests[index];
              if (urlInfo.url && originalRequest) {
                const updatePath = type === 1 
                  ? `contactsList[${originalRequest.index}].avatar`
                  : `pendingList[${originalRequest.index}].avatar`;
                
                this.setData({
                  [updatePath]: urlInfo.url
                });
              }
            });
            console.log(`成功更新${res.urls.length}个头像URL`);
            resolve();
          } else {
            console.warn('批量获取头像URL失败:', res.message);
            // 降级处理：逐个获取
            this.fallbackToIndividualRequests(avatarRequests, type);
            resolve();
          }
        },
        fail: (error) => {
          console.error('批量获取头像URL请求失败:', error);
          // 降级处理：逐个获取
          this.fallbackToIndividualRequests(avatarRequests, type);
          resolve();
        }
      });
    });
  },

  // 降级处理：逐个获取头像URL（保持向后兼容）
  fallbackToIndividualRequests: function(avatarRequests, type) {
    console.log('降级处理：逐个获取头像URL');
    avatarRequests.forEach(request => {
      this.getTempAvatarUrl(request.key, type, request.userId, request.index);
    });
  },

  // 获取临时头像URL（保留原方法用于降级处理）
  getTempAvatarUrl: function(avatarKey, type, userId, index) {
    const app = getApp();
    
    // 调用后端接口获取临时访问URL
    app.request({
      url: '/api/upload/signed-url',
      method: 'GET',
      data: {
        key: avatarKey,
        expires: 3600 // 1小时有效期
      },
      success: (res) => {
        if (res.success && res.url) {
          if (type == 1) {
            // 更新联系人列表中指定用户的头像URL
            const updatePath = `contactsList[${index}].avatar`;
            this.setData({
              [updatePath]: res.url
            });
          } else {
            // 更新待联系列表中指定用户的头像URL
            const updatePath = `pendingList[${index}].avatar`;
            this.setData({
              [updatePath]: res.url
            });
          }
        } else {
          console.warn('获取临时头像URL失败:', res.message);
        }
      },
      fail: (error) => {
        console.error('获取临时头像URL请求失败:', error);
      }
    });
  },

  // 格式化时间
  formatTime: function(timestamp) {
    // 检查时间戳格式，如果是秒级时间戳（10位数），转换为毫秒级
    const timestampMs = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
    
    const date = new Date(timestampMs);
    const now = new Date();
    
    // 获取各个时间点的零点时间戳
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - (24 * 60 * 60 * 1000);
    const sixDaysAgoStart = todayStart - (6 * 24 * 60 * 60 * 1000);
    
    const messageTime = date.getTime();
    
    // 格式化时间部分 HH:mm
    const formatTime = (d) => {
      return d.getHours().toString().padStart(2, '0') + ':' + 
             d.getMinutes().toString().padStart(2, '0');
    };
    
    // 1. 大于等于今天零点时间戳，显示格式 HH:mm
    if (messageTime >= todayStart) {
      return formatTime(date);
    }
    // 2. 大于等于昨天零点时间戳，显示格式 昨天 + HH:mm
    else if (messageTime >= yesterdayStart) {
      return '昨天 ' + formatTime(date);
    }
    // 3. 大于等于往前6天的零点时间戳，显示格式星期
    else if (messageTime >= sixDaysAgoStart) {
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return weekdays[date.getDay()];
    }
    // 4. 其他的显示 mm-dd
    else {
      return (date.getMonth() + 1).toString().padStart(2, '0') + '-' + 
             date.getDate().toString().padStart(2, '0');
    }
  },
  


  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    // 页面渲染完成时的操作
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 页面显示时的操作
    // 调用全局的页面显示钩子函数
    const app = getApp();
    if (app.onPageShow) {
      app.onPageShow(this);
    }
    
    // 每次页面显示时检查TUIKit状态并刷新数据
    if (app.globalData.isTUIKitInitialized && wx.$TUIKit) {
      this.setData({
        isImInitialized: true
      });
      this.loadConversationList();
      this.loadFriendRequests();
      
      // 检查隐私设置（仅在IM初始化时检查一次）
      if (!this.hasCheckedPrivacy) {
        this.checkAndSetPrivacySettings();
        this.hasCheckedPrivacy = true;
      }
    } else {
      // 如果没有初始化，则重新检查TUIKit状态
      this.checkTUIKitStatus();
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    // 页面隐藏时的操作
    this.setData({
      showSearch: false,
      searchText: '',
      showSearchResults: false
    });
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    // 页面卸载时的操作
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    // 模拟刷新操作
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {
    // 加载更多数据
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    return {
      title: '聊天列表',
      path: '/pages/chat/chat'
    };
  },

  // 切换分组（联系人/待联系）
  toggleSection: function(e) {
    const section = e.currentTarget.dataset.section;
    this.setData({
      activeSection: section
    });
  },

  // 打开搜索
  openSearch: function() {
    this.setData({
      showSearch: true,
      searchText: '',
      showSearchResults: false,
      searchResults: []
    });
    // 自动聚焦搜索框
    setTimeout(() => {
      wx.createSelectorQuery().select('.search-input').boundingClientRect(rect => {
        if (rect) {
          // 触发输入框聚焦
        }
      }).exec();
    }, 300);
  },

  // 关闭搜索
  closeSearch: function() {
    this.setData({
      showSearch: false,
      searchText: '',
      showSearchResults: false,
      searchResults: []
    });
    // 重新加载数据以恢复原始列表
    if (this.data.isImInitialized) {
      this.loadConversationList();
      this.loadFriendRequests();
    }
  },

  // 搜索输入
  onSearchInput: function(e) {
    this.setData({
      searchText: e.detail.value
    });
  },

  // 执行搜索
  performSearch: function() {
    const { searchText, contactsList, pendingList } = this.data;
    if (!searchText.trim()) {
      this.setData({
        showSearchResults: false,
        searchResults: []
      });
      return;
    }

    // 合并联系人列表和待联系列表进行搜索
    const allUsers = [...contactsList, ...pendingList.map(item => ({
      ...item,
      lastMessage: item.message,
      unread: 0
    }))];

    // 过滤搜索结果
    const results = allUsers.filter(user => 
      user.name.toLowerCase().includes(searchText.toLowerCase()) ||
      (user.lastMessage && user.lastMessage.toLowerCase().includes(searchText.toLowerCase())) ||
      (user.message && user.message.toLowerCase().includes(searchText.toLowerCase()))
    );

    this.setData({
      searchResults: results,
      showSearchResults: true
    });
  },

  // 导航到用户预览页
  navigateToPreview: function(e) {
    const user = e.currentTarget.dataset.user;
    wx.navigateTo({
      url: `/pages/preview/preview?user=${encodeURIComponent(JSON.stringify(user))}`
    });
  },

  // 导航到聊天会话页
  navigateToConversation: function(e) {
    const user = e.currentTarget.dataset.user;
    
    // 创建会话ID（C2C类型）
    const conversationID = user.id || '';
    
    console.log('跳转到会话页面，用户信息:', user);
    console.log('生成的会话ID:', conversationID);
    
    // 如果有未读消息，标记为已读
    if (user.unread > 0 && conversationID && this.data.isImInitialized && wx.$TUIKit) {
      console.log('标记会话为已读，清零未读数:', conversationID);
      wx.$TUIKit.setMessageRead({ conversationID: conversationID })
        .then(() => {
          console.log('会话已标记为已读');
          // 更新本地数据，立即清零未读数
          this.updateContactUnreadCount(conversationID, 0);
        })
        .catch((error) => {
          console.error('标记会话为已读失败:', error);
          // 即使标记失败，也更新本地数据以提供更好的用户体验
          this.updateContactUnreadCount(conversationID, 0);
        });
    }
    
    // 构建跳转URL，包含用户信息和会话ID
    let url = `/pages/conversation/conversation`;
    if (conversationID) {
      url += `?conversationID=${conversationID}`;
    }
    
    wx.navigateTo({
      url: url
    });
  },

  // 更新联系人未读数
  updateContactUnreadCount: function(conversationID, unreadCount) {
    const updatedContactsList = this.data.contactsList.map(contact => {
      if (contact.id === conversationID) {
        return {
          ...contact,
          unread: unreadCount
        };
      }
      return contact;
    });
    
    this.setData({
      contactsList: updatedContactsList
    });
  },

  // 导航到关于页面
  navigateToAbout: function() {
    wx.navigateTo({
      url: '/pages/about/about'
    });
  },

  // 同意匹配（添加好友）
  acceptMatch: function(e) {
    const requestId = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    
    // 从requestId中解析出userID
    const userId = requestId;
    
    wx.showLoading({
      title: '处理中...',
    });
    
    try {
      // 如果IM已初始化，使用IM API同意好友请求
      if (this.data.isImInitialized && wx.$TUIKit) {
        // 检查API是否存在
        if (typeof wx.$TUIKit.acceptFriendApplication !== 'function') {
          console.error('acceptFriendApplication API不存在，可用的方法:', Object.getOwnPropertyNames(wx.$TUIKit).filter(name => typeof wx.$TUIKit[name] === 'function'));
          throw new Error('acceptFriendApplication API不存在');
        }
        
        console.log('开始调用acceptFriendApplication，userID:', userId);
        wx.$TUIKit.acceptFriendApplication({
          userID: userId
        })
        .then((imResponse) => {
          console.log('IM同意好友申请成功:', imResponse);
          
          // 同意好友申请后，发送一条欢迎消息来创建会话
          // 这样新好友就会出现在会话列表中
          this.sendWelcomeMessage(userId, name);
          
          // 移除已处理的请求
          const updatedPendingList = this.data.pendingList.filter(item => item.id !== requestId);
          this.setData({
            pendingList: updatedPendingList
          });
          
          wx.showToast({
            title: `已同意与${name}的好友请求`,
            icon: 'success'
          });
          
          // 刷新联系人列表，这样新好友就会出现在列表中
          this.loadConversationList();
        })
        .catch((error) => {
          console.error('IM同意好友申请失败:', error);
          console.error('错误码:', error.code);
          console.error('错误信息:', error.message);
          
          // 根据错误码显示不同提示
          let errorMessage = '操作失败';
          if (error.code === 30001) {
            errorMessage = '服务器错误，请稍后重试';
          } else if (error.code === 50001) {
            errorMessage = '网络连接失败';
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          wx.showToast({
            title: errorMessage,
            icon: 'none'
          });
        })
        .finally(() => {
          wx.hideLoading();
        });
      } else {
        // 模拟模式下的处理
        setTimeout(() => {
          wx.hideLoading();
          wx.showToast({
            title: `已同意与${name}的好友请求`,
            icon: 'success'
          });

          // 更新待联系列表（移除已同意的用户）
          const updatedPendingList = this.data.pendingList.filter(item => item.id !== requestId);
          this.setData({
            pendingList: updatedPendingList
          });
        }, 1000);
      }
    } catch (error) {
      console.error('同意好友请求失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '处理失败',
        icon: 'none'
      });
    }
  },

  // 发送欢迎消息以创建会话
  sendWelcomeMessage: function(userId, userName) {
    if (!this.data.isImInitialized || !wx.$TUIKit) {
      console.warn('IM未初始化，无法发送欢迎消息');
      return;
    }

    try {
      // 创建会话ID（C2C类型）
      const conversationID = `C2C${userId}`;
      
      // 创建欢迎消息
      const welcomeMessage = wx.$TUIKit.createTextMessage({
        to: userId,
        conversationType: 'C2C',
        payload: {
          text: `你好！我们已经成为好友了，很高兴认识你！👋`
        }
      });

      console.log('发送欢迎消息，目标用户:', userId, '消息内容:', welcomeMessage);

      // 发送消息
      wx.$TUIKit.sendMessage(welcomeMessage, {
        conversationID: conversationID
      })
      .then((res) => {
        console.log('欢迎消息发送成功:', res);
        console.log('会话已创建，新好友将出现在会话列表中');
      })
      .catch((error) => {
        console.error('欢迎消息发送失败:', error);
        // 即使消息发送失败，会话可能仍然会被创建
        // 我们仍然尝试刷新会话列表
        setTimeout(() => {
          this.loadConversationList();
        }, 1000);
      });

    } catch (error) {
      console.error('创建欢迎消息失败:', error);
    }
  },

  // 拒绝好友请求
  rejectMatch: function(e) {
    const requestId = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    
    // 从requestId中解析出userID
    const userId = requestId;
    
    wx.showLoading({
      title: '处理中...',
    });
    
    try {
      // 如果IM已初始化，使用IM API拒绝好友请求
      if (this.data.isImInitialized && wx.$TUIKit) {
        // 检查API是否存在
        if (typeof wx.$TUIKit.refuseFriendApplication !== 'function') {
          console.error('refuseFriendApplication API不存在，可用的方法:', Object.getOwnPropertyNames(wx.$TUIKit).filter(name => typeof wx.$TUIKit[name] === 'function'));
          throw new Error('refuseFriendApplication API不存在');
        }
        
        console.log('开始调用refuseFriendApplication，userID:', userId);
        wx.$TUIKit.refuseFriendApplication({
          userID: userId
        })
        .then((imResponse) => {
          console.log('IM拒绝好友申请成功:', imResponse);
          
          // 移除已处理的请求
          const updatedPendingList = this.data.pendingList.filter(item => item.id !== requestId);
          this.setData({
            pendingList: updatedPendingList
          });
          
          wx.showToast({
            title: `已拒绝与${name}的好友请求`,
            icon: 'success'
          });
        })
        .catch((error) => {
          console.error('IM拒绝好友申请失败:', error);
          console.error('错误码:', error.code);
          console.error('错误信息:', error.message);
          
          // 根据错误码显示不同提示
          let errorMessage = '操作失败';
          if (error.code === 30001) {
            errorMessage = '服务器错误，请稍后重试';
          } else if (error.code === 50001) {
            errorMessage = '网络连接失败';
          } else if (error.message) {
            errorMessage = error.message;
          }
          
          wx.showToast({
            title: errorMessage,
            icon: 'none'
          });
        })
        .finally(() => {
          wx.hideLoading();
        });
      } else {
        // 模拟模式下的处理
        setTimeout(() => {
          wx.hideLoading();
          wx.showToast({
            title: `已拒绝与${name}的好友请求`,
            icon: 'success'
          });

          // 更新待联系列表（移除已拒绝的用户）
          const updatedPendingList = this.data.pendingList.filter(item => item.id !== requestId);
          this.setData({
            pendingList: updatedPendingList
          });
        }, 1000);
      }
    } catch (error) {
      console.error('拒绝好友请求失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '处理失败',
        icon: 'none'
      });
    }
  },

  // 检查和设置用户隐私设置
  checkAndSetPrivacySettings: function() {
    if (!this.data.isImInitialized || !wx.$TUIKit) {
      console.log('IM未初始化，跳过隐私设置检查');
      return;
    }

    // 获取自己的用户资料
    wx.$TUIKit.getMyProfile()
      .then((profileResponse) => {
        console.log('获取用户资料成功:', profileResponse);
        
        if (profileResponse.code === 0 && profileResponse.data) {
          const profile = profileResponse.data;
          const currentAllowType = profile.allowType;
          
          console.log('当前隐私设置:', currentAllowType);
          
          // 如果当前允许类型不是需要验证，则更新为需要验证
          if (currentAllowType !== 'AllowType_Type_NeedConfirm') {
            console.log('更新隐私设置为需要验证');
            
            wx.$TUIKit.updateMyProfile({
              allowType: 'AllowType_Type_NeedConfirm'
            })
            .then((updateResponse) => {
              console.log('隐私设置更新成功:', updateResponse);
              wx.showToast({
                title: '隐私设置已更新',
                icon: 'success',
                duration: 2000
              });
            })
            .catch((error) => {
              console.error('隐私设置更新失败:', error);
            });
          } else {
            console.log('隐私设置已是需要验证，无需更新');
          }
        }
      })
      .catch((error) => {
        console.error('获取用户资料失败:', error);
      });
  },

  // 测试隐私设置功能
  testPrivacySettings: function() {
    console.log('=== 测试隐私设置功能 ===');
    
    if (!this.data.isImInitialized || !wx.$TUIKit) {
      wx.showToast({
        title: 'IM未初始化',
        icon: 'none'
      });
      return;
    }

    // 检查当前隐私设置
    wx.$TUIKit.getMyProfile()
      .then((profileResponse) => {
        console.log('📋 当前用户资料:', profileResponse);
        
        if (profileResponse.code === 0 && profileResponse.data) {
          const profile = profileResponse.data;
          const currentAllowType = profile.allowType;
          
          console.log('🔒 当前隐私设置:', currentAllowType);
          
          // 显示当前设置给用户
          let allowTypeText = '未知';
          switch (currentAllowType) {
            case 'AllowType_Type_NeedConfirm':
              allowTypeText = '需要验证';
              break;
            case 'AllowType_Type_AllowAny':
              allowTypeText = '允许任何人';
              break;
            case 'AllowType_Type_DenyAny':
              allowTypeText = '禁止任何人';
              break;
          }
          
          wx.showModal({
            title: '当前隐私设置',
            content: `添加好友方式: ${allowTypeText}`,
            showCancel: true,
            cancelText: '取消',
            confirmText: currentAllowType === 'AllowType_Type_AllowAny' ? '设置为需要验证' : '好的',
            success: (res) => {
              if (res.confirm && currentAllowType === 'AllowType_Type_AllowAny') {
                // 更新为需要验证
                this.updatePrivacySettings('AllowType_Type_NeedConfirm');
              }
            }
          });
        }
      })
      .catch((error) => {
        console.error('❌ 获取用户资料失败:', error);
        wx.showToast({
          title: '获取资料失败',
          icon: 'none'
        });
      });
  },

  // 更新隐私设置
  updatePrivacySettings: function(newAllowType) {
    wx.showLoading({
      title: '更新设置中...',
    });

    wx.$TUIKit.updateMyProfile({
      allowType: newAllowType
    })
    .then((updateResponse) => {
      console.log('✅ 隐私设置更新成功:', updateResponse);
      wx.hideLoading();
      
      let allowTypeText = '';
      switch (newAllowType) {
        case 'AllowType_Type_NeedConfirm':
          allowTypeText = '需要验证';
          break;
        case 'AllowType_Type_AllowAny':
          allowTypeText = '允许任何人';
          break;
        case 'AllowType_Type_DenyAny':
          allowTypeText = '禁止任何人';
          break;
      }
      
      wx.showToast({
        title: `已设置为${allowTypeText}`,
        icon: 'success',
        duration: 2000
      });
    })
    .catch((error) => {
      console.error('❌ 隐私设置更新失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '更新失败',
        icon: 'none'
      });
    });
  }
})