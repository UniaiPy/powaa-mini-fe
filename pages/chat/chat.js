// pages/chat/chat.js
import imManager from '../../utils/imManager.js';
const app = getApp();

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
    isImInitialized: false, // IM初始化状态
    lastRefreshTime: 0, // 上次刷新时间
    MIN_REFRESH_INTERVAL: 5000, // 最小刷新间隔（毫秒）
    avatarUrlCache: {}, // 头像URL缓存
    CACHE_EXPIRY_TIME: 30 * 60 * 1000, // 缓存过期时间（30分钟）
    slideButtons: [
      { text: '置顶',type:'warn'}
    ],
    currentItemIndex: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 检查TUIKit是否已在app.js中初始化
    if (!app.isLoggedIn()) {
      return;
    }
    // 检查activeSection参数
    const activeSection = options.activeSection || 'contacts';
    console.log('activeSection', activeSection);
    if (activeSection !== 'contacts' && activeSection !== 'pending') {
      console.warn('⚠️ 无效的activeSection参数，默认使用contacts');
      this.setData({
        activeSection: 'contacts'
      });
    } else {
      this.setData({
        activeSection: activeSection
      });
    }

    this.checkTUIKitStatus();
  },
  
  // 检查TUIKit状态 - 重新设计使用imManager
  checkTUIKitStatus: function() {
    console.log('🔍 开始检查TUIKit状态...');
    
    try {
      // 检查应用实例是否存在
      const app = getApp();
      if (!app || !app.globalData) {
        console.error('❌ 应用实例不可用');
        this.handleAppError('应用实例不可用');
        return;
      }
      
      // 检查是否已登录
      if (!app.globalData.token || !app.globalData.userInfo) {
        console.log('ℹ️ 用户未登录或信息不完整，跳过IM初始化，直接进入聊天页面', {
          hasToken: !!app.globalData.token,
          hasUserInfo: !!app.globalData.userInfo
        });
        this.setData({
          isImInitialized: false
        });
        return;
      }
      
      // 检查imManager是否可用
      if (!imManager || !imManager.checkIMStatus) {
        console.error('❌ imManager不可用或方法缺失');
        this.handleAppError('IM管理器不可用');
        return;
      }
      
      // 使用imManager检查状态
      const imStatus = imManager.checkIMStatus();
      console.log('📊 IM状态检查结果:', imStatus);
      
      // 如果IM已初始化且已登录，直接加载数据
      if (imStatus && imStatus.isInitialized && imStatus.isLoggedIn) {
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
        console.log('⏳ IM未完全初始化，开始初始化流程', {
          isInitialized: imStatus?.isInitialized,
          isLoggedIn: imStatus?.isLoggedIn
        });
        // 主动触发IM初始化
        this.initIMWithManager();
      }
    } catch (error) {
      console.error('❌ 检查TUIKit状态时发生异常:', error);
      console.error('错误详情:', {
        message: error.message,
        stack: error.stack,
        code: error.code
      });
      this.handleAppError('IM状态检查失败');
    }
  },
  
  // 统一处理应用错误
  handleAppError: function(errorMessage) {
    console.error('⚠️ 统一错误处理:', errorMessage);
    
    // 检查页面是否已卸载
    if (this._isPageUnloaded) {
      console.log('⚠️ 页面已卸载，跳过错误处理UI反馈');
      return;
    }
    
    wx.showToast({
      title: errorMessage || '应用出现异常',
      icon: 'none',
      duration: 2000
    });
    // 移除自动跳转到登录页面的逻辑，允许用户继续使用小程序
  },
  
  // 增量更新会话信息（避免频繁全量刷新）
  refreshConversationUpdates: function() {
    const app = getApp();
    if (!app.globalData.isTUIKitInitialized || !wx.$TUIKit) {
      return;
    }
    
    console.log('🔄 执行会话增量更新');
    
    // 获取会话列表的增量更新
    wx.$TUIKit.getConversationList({ count: 10, offset: 0 }, (imError, data) => {
      if (imError) {
        console.error('获取会话增量更新失败:', imError);
        return;
      }
      
      if (data.conversationList && data.conversationList.length > 0) {
        // 只更新关键信息，如未读消息数、最新消息内容等
        this._updateConversationLastMessageAndUnread(data.conversationList);
      }
    });
    
    // 检查是否有新的好友请求
    this._checkForNewFriendRequests();
  },
  
  // 更新会话列表中的最新消息和未读数
  _updateConversationLastMessageAndUnread: function(newConversations) {
    const contactsList = [...this.data.contactsList];
    let hasUpdates = false;
    
    newConversations.forEach(newConv => {
      // 只处理C2C类型会话
      if (newConv.type === 1) { // C2C类型
        const index = contactsList.findIndex(contact => {
          return contact.id === newConv.userID;
        });
        
        if (index !== -1) {
          // 检查是否需要更新
          const shouldUpdateUnread = contactsList[index].unreadCount !== newConv.unreadCount;
          const shouldUpdateMessage = !contactsList[index].lastMessage || 
                                     contactsList[index].lastMessage.msgTime !== newConv.lastMessage.msgTime ||
                                     contactsList[index].lastMessage.msgID !== newConv.lastMessage.msgID;
          
          if (shouldUpdateUnread || shouldUpdateMessage) {
            // 只更新变化的字段
            if (shouldUpdateUnread) {
              contactsList[index].unreadCount = newConv.unreadCount;
              hasUpdates = true;
            }
            
            if (shouldUpdateMessage) {
              contactsList[index].lastMessage = newConv.lastMessage;
              contactsList[index].lastMessageTime = newConv.lastMessage.msgTime;
              hasUpdates = true;
            }
          }
        }
      }
    });
    
    // 如果有更新，应用到数据中
    if (hasUpdates) {
      console.log('🔄 更新了会话信息');
      this.setData({
        contactsList
      });
    }
  },
  
  // 检查是否有新的好友请求
  _checkForNewFriendRequests: function() {
    console.log('🔍 开始检查新的好友请求...');
    
    try {
      // 检查TUIKit是否初始化
      if (!wx.$TUIKit) {
        console.log('📦 TUIKit未初始化，跳过新好友请求检查');
        return;
      }

      // 使用TUIKit API获取好友申请列表，与loadFriendRequests保持一致
      wx.$TUIKit.getFriendApplicationList().then((friendApplicationList) => {

        if (friendApplicationList.code === 0) {
          // 解析数据结构，复用loadFriendRequests中的逻辑
          let applications = [];
          
          if (friendApplicationList.data) {
            if (Array.isArray(friendApplicationList.data)) {
              applications = friendApplicationList.data;
            } else if (friendApplicationList.data.friendApplicationList && Array.isArray(friendApplicationList.data.friendApplicationList)) {
              applications = friendApplicationList.data.friendApplicationList;
            } else if (friendApplicationList.data.applicationList && Array.isArray(friendApplicationList.data.applicationList)) {
              applications = friendApplicationList.data.applicationList;
            }
          } else if (friendApplicationList.friendApplicationList && Array.isArray(friendApplicationList.friendApplicationList)) {
            applications = friendApplicationList.friendApplicationList;
          }
          
          // 只处理发送给我的申请
          const sentToMeApps = applications.filter(app => {
            const isSentToMe = app.type === wx.TencentCloudChat.TYPES.SNS_APPLICATION_SENT_TO_ME ||
                              app.type === 'SNS_APPLICATION_SENT_TO_ME' ||
                              app.type === 1; // 有可能是数字类型
            return isSentToMe;
          });
          
          // 检查是否有新的请求
          const currentIds = new Set(this.data.pendingList.map(pending => pending.id));
          const newRequestIds = new Set(sentToMeApps.map(app => app.userID).filter(id => id));
          
          // 找出新的请求ID
          let hasNewRequests = false;
          for (let id of newRequestIds) {
            if (!currentIds.has(id)) {
              hasNewRequests = true;
              console.log('🔄 发现新的好友请求，ID:', id);
              break;
            }
          }
          
          if (hasNewRequests) {
            console.log('🔄 发现新的好友请求，刷新列表');
            // 如果有新请求，重新加载好友请求列表
            this.loadFriendRequests();
          }
        } else {
          console.error('❌ 获取好友申请列表失败:', friendApplicationList);
        }
      }).catch((error) => {
        console.error('❌ 检查新好友请求失败:', error);
      });
    } catch (error) {
      console.error('❌ 检查新好友请求异常:', error);
    }
  },
  
  // 使用imManager初始化IM
  initIMWithManager: async function() {
    console.log('📱 开始IM初始化流程');
    
    try {
      // 检查页面是否已卸载
      if (this._isPageUnloaded) {
        console.log('⚠️ 页面已卸载，跳过IM初始化');
        return;
      }
      
      // 检查是否正在处理被踢出
      if (this._isHandlingKickout) {
        console.log('⚠️ 正在处理被踢出逻辑，跳过IM初始化');
        return;
      }
      
      const app = getApp();
      
      // 检查应用实例是否存在
      if (!app || !app.globalData) {
        console.error('❌ 应用实例不可用');
        this.handleAppError('应用实例不可用');
        return;
      }
      
      // 显示加载提示
      wx.showLoading({
        title: '初始化IM中...',
      });
      
      // 检查是否有必要的用户信息
      if (!app.globalData.userInfo || !app.globalData.userInfo.id) {
        console.error('❌ 缺少必要的用户信息', {
          hasUserInfo: !!app.globalData.userInfo,
          hasUserID: !!app.globalData.userInfo?.userId
        });
        wx.hideLoading();
        wx.showToast({
          title: '用户信息不完整，跳过IM初始化',
          icon: 'none'
        });
        this.setData({
          isImInitialized: false
        });
        return;
      }
      
      // 从app.js获取IM配置
      const userID = app.globalData.userInfo.id.toString();
      let userSig = app.globalData.userSig;
      let SDKAppID = app.globalData.SDKAppID;
      
      if (!userSig || !SDKAppID) {
        console.warn('⚠️ 缺少IM配置信息，尝试主动获取:', { 
          userSig: !!userSig, 
          SDKAppID: !!SDKAppID,
          userID: userID
        });
        
        try {
          // 主动调用app.js的方法获取IM配置
          await app.getIMConfigFromServer();
          
          // 重新获取配置
          userSig = app.globalData.userSig;
          SDKAppID = app.globalData.SDKAppID;
          
          console.log('🔄 重新获取IM配置后:', { 
            userSig: !!userSig, 
            SDKAppID: !!SDKAppID
          });
        } catch (error) {
          console.error('❌ 主动获取IM配置失败:', error);
        }
      }
      
      if (!userSig || !SDKAppID) {
        console.error('❌ 仍然缺少IM配置信息，跳过IM初始化:', { 
          userSig: !!userSig, 
          SDKAppID: !!SDKAppID,
          userID: userID
        });
        wx.hideLoading();
        this.setData({
          isImInitialized: false
        });
        return;
      }
      
      // 检查imManager是否可用
      if (!imManager || !imManager.initialize) {
        console.error('❌ imManager未初始化或缺少initialize方法');
        wx.hideLoading();
        this.handleAppError('IM管理器不可用');
        return;
      }
      
      console.log('🔧 开始调用imManager.initialize', {
        userID: userID,
        hasUserSig: !!userSig,
        SDKAppID: SDKAppID
      });
      
      // 使用imManager初始化
      imManager.initialize(userID, userSig, SDKAppID)
        .then(() => {
          // 再次检查页面是否已卸载
          if (this._isPageUnloaded) {
            console.log('⚠️ 页面已卸载，跳过初始化成功后的处理');
            wx.hideLoading();
            return;
          }
          
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
          console.error('错误详情:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            errMsg: error.errMsg
          });
          
          wx.hideLoading();
          
          // 检查页面是否已卸载
          if (this._isPageUnloaded) {
            console.log('⚠️ 页面已卸载，跳过错误处理');
            return;
          }
          
          // 检测账号被踢出的情况
          const isKickoutError = error.code === 3003 || 
                                error.code === 90104 || 
                                (error.message && 
                                 (error.message.includes('kicked out') || 
                                  error.message.includes('在其他设备登录')));
          
          if (isKickoutError) {
            console.log('⚠️ 检测到账号在其他设备登录或被踢出');
            this.handleKickedOut();
          } else {
            wx.showToast({
              title: 'IM初始化失败，跳过IM功能',
              icon: 'none'
            });
            this.setData({
              isImInitialized: false
            });
          }
        });
    } catch (error) {
      console.error('❌ 初始化IM过程中发生未捕获异常:', error);
      console.error('异常详情:', {
        message: error.message,
        stack: error.stack
      });
      
      try {
        wx.hideLoading();
      } catch (hideError) {
        // 忽略隐藏loading的错误
      }
      
      // 检查页面是否已卸载
      if (!this._isPageUnloaded) {
        this.handleAppError('IM初始化异常');
      }
    }
  },
  
  // 设置IM事件监听（页面级别）
  // 定义事件处理函数
  _onSdkReadyHandler: function(event) {
    if (this._isPageUnloaded || this._isHandlingKickout) return;
    console.log('✅ IM SDK准备就绪', { eventType: typeof event });
  },
  
  _onConversationListUpdatedHandler: function(event) {
    try {
      if (this._isPageUnloaded || this._isHandlingKickout) return;
      this.onConversationListUpdated(event);
    } catch (err) {
      console.error('❌ 处理会话列表更新事件时出错:', err);
    }
  },
  
  _onMessageReceivedHandler: function(event) {
    try {
      if (this._isPageUnloaded || this._isHandlingKickout) return;
      this.onMessageReceived(event);
    } catch (err) {
      console.error('❌ 处理新消息事件时出错:', err);
    }
  },
  
  _onFriendApplicationListUpdatedHandler: function(event) {
    try {
      if (this._isPageUnloaded || this._isHandlingKickout) return;
      this.onFriendApplicationListUpdated(event);
    } catch (err) {
      console.error('❌ 处理好友申请列表更新事件时出错:', err);
    }
  },
  
  setImEventListeners: function() {
    console.log('🔗 开始设置IM事件监听');
    
    // 检查页面是否已卸载
    if (this._isPageUnloaded) {
      console.log('⚠️ 页面已卸载，跳过设置IM事件监听');
      return;
    }
    
    // 检查是否正在处理被踢出
    if (this._isHandlingKickout) {
      console.log('⚠️ 正在处理被踢出逻辑，跳过设置IM事件监听');
      return;
    }
    
    // 检查wx.$TUIKit是否可用
    if (!wx || !wx.$TUIKit || typeof wx.$TUIKit !== 'object') {
      console.error('❌ wx.$TUIKit不可用或类型错误');
      return;
    }
    
    try {
      // 检查必要的事件常量是否存在
      if (!wx.TencentCloudChat || !wx.TencentCloudChat.EVENT) {
        console.error('❌ TencentCloudChat.EVENT 常量不可用');
        return;
      }
      
      // 监听SDK_READY事件
      if (wx.TencentCloudChat.EVENT.SDK_READY && typeof wx.$TUIKit.on === 'function') {
        wx.$TUIKit.on(wx.TencentCloudChat.EVENT.SDK_READY, this._onSdkReadyHandler, this);
        console.log('✅ 添加SDK_READY事件监听成功');
      } else {
        console.warn('⚠️ SDK_READY事件常量不存在或wx.$TUIKit.on不可用');
      }
      
      // 监听会话列表更新
      if (wx.TencentCloudChat.EVENT.CONVERSATION_LIST_UPDATED && this.onConversationListUpdated && typeof wx.$TUIKit.on === 'function') {
        wx.$TUIKit.on(wx.TencentCloudChat.EVENT.CONVERSATION_LIST_UPDATED, this._onConversationListUpdatedHandler, this);
        console.log('✅ 添加CONVERSATION_LIST_UPDATED事件监听成功');
      } else {
        console.warn('⚠️ CONVERSATION_LIST_UPDATED事件常量不存在或回调方法不可用');
      }
      
      // 监听新消息
      if (wx.TencentCloudChat.EVENT.MESSAGE_RECEIVED && this.onMessageReceived && typeof wx.$TUIKit.on === 'function') {
        wx.$TUIKit.on(wx.TencentCloudChat.EVENT.MESSAGE_RECEIVED, this._onMessageReceivedHandler, this);
        console.log('✅ 添加MESSAGE_RECEIVED事件监听成功');
      } else {
        console.warn('⚠️ MESSAGE_RECEIVED事件常量不存在或回调方法不可用');
      }
      
      // 监听好友申请列表更新
      if (wx.TencentCloudChat.EVENT.FRIEND_APPLICATION_LIST_UPDATED && this.onFriendApplicationListUpdated && typeof wx.$TUIKit.on === 'function') {
        wx.$TUIKit.on(wx.TencentCloudChat.EVENT.FRIEND_APPLICATION_LIST_UPDATED, this._onFriendApplicationListUpdatedHandler, this);
        console.log('✅ 添加FRIEND_APPLICATION_LIST_UPDATED事件监听成功');
      } else {
        console.warn('⚠️ FRIEND_APPLICATION_LIST_UPDATED事件常量不存在或回调方法不可用');
      }
      
      // 设置好友申请监听
      try {
        if (this.setupFriendApplicationListener && typeof this.setupFriendApplicationListener === 'function') {
          this.setupFriendApplicationListener();
          console.log('✅ 设置好友申请监听成功');
        } else {
          console.warn('⚠️ setupFriendApplicationListener方法不可用');
        }
      } catch (err) {
        console.error('❌ 设置好友申请监听失败:', err);
      }
      
      console.log('✅ 所有IM事件监听设置完成');
    } catch (error) {
      console.error('❌ 设置IM事件监听失败:', error);
      console.error('错误详情:', {
        message: error.message,
        stack: error.stack
      });
    }
    
      // 监听imManager的事件
    try {
      // 避免重复绑定事件
      if (this._hasBoundImManagerEvents) {
        console.log('⚠️ 已绑定imManager事件，跳过重新绑定');
        return;
      }
      
      // 监听登录状态变化 - 使用命名方法
      this.onLoginStatusChanged = (data) => {
        try {
          // 检查页面状态
          if (this._isPageUnloaded || this._isHandlingKickout) {
            console.log('⚠️ 页面已卸载或正在处理被踢出，跳过登录状态变化处理');
            return;
          }
          
          console.log('🔄 检测到登录状态变化:', { 
            isLoggedIn: data?.isLoggedIn, 
            reason: data?.reason,
            dataType: typeof data
          });
          
          // 检查数据有效性
          if (!data || typeof data !== 'object') {
            console.warn('⚠️ 登录状态变化事件数据无效');
            return;
          }
          
          if (!data.isLoggedIn) {
            console.log('⚠️ 用户被踢出或连接断开，原因:', data.reason);
            
            // 显示更明确的提示信息
            if (data.reason === 'KICKED_OUT') {
              // 检查是否正在处理被踢出，避免循环调用
              if (this._isHandlingKickout) {
                console.warn('⚠️ 已在处理被踢出逻辑，避免重复处理');
                return;
              }
              
              console.log('🚨 账号被踢出，显示提示对话框');
              // 使用try-catch包装整个模态框调用
              try {
                wx.showModal({
                  title: '登录提示',
                  content: '您的账号已在其他设备登录，当前设备已自动下线。如需继续使用，请重新登录。',
                  showCancel: false,
                  confirmText: '我知道了',
                  success: (res) => {
                    try {
                      console.log('👍 用户点击确认，开始处理被踢出逻辑');
                      // 清理本地状态并跳转到登录页
                      this.handleKickedOut();
                    } catch (error) {
                      console.error('❌ 处理模态框确认事件时出错:', error);
                    }
                  },
                  fail: (err) => {
                    console.error('❌ 显示登录提示模态框失败:', err);
                    // 即使模态框显示失败，也要确保用户被正确引导到登录页面
                    try {
                      this.handleKickedOut();
                    } catch (error) {
                      console.error('❌ 备用处理被踢出逻辑失败:', error);
                    }
                  }
                });
              } catch (modalError) {
                console.error('❌ 调用wx.showModal失败:', modalError);
                // 模态框调用失败时的备用方案
                try {
                  setTimeout(() => {
                    this.handleKickedOut();
                  }, 100);
                } catch (finalError) {
                  console.error('❌ 最终备用方案执行失败:', finalError);
                }
              }
            } else if (data.reason === 'SDK_NOT_READY') {
              wx.showToast({
                title: 'IM连接断开，正在重新连接...',
                icon: 'none',
                duration: 2000
              });
              
              // 延迟后重新初始化
              setTimeout(() => {
                this.reinitializeIM();
              }, 2000);
            }
          }
        } catch (error) {
          console.error('❌ 处理登录状态变化事件时发生异常:', error);
          console.error('异常详情:', { message: error.message, stack: error.stack });
        }
      }
      
      // 只有在imManager和addEventListener方法都可用时才绑定事件
      if (imManager && typeof imManager.addEventListener === 'function') {
        imManager.addEventListener('LOGIN_STATUS_CHANGED', this.onLoginStatusChanged);
        console.log('✅ 绑定LOGIN_STATUS_CHANGED事件成功');
        // 设置绑定标志，防止重复绑定
        this._hasBoundImManagerEvents = true;
      } else {
        console.error('❌ imManager或addEventListener方法不可用');
      }
      
      // 监听被踢出事件 - 使用命名方法
      this.onKickedOut = (event) => {
        try {
          // 检查页面状态
          if (this._isPageUnloaded || this._isHandlingKickout) {
            console.log('⚠️ 页面已卸载或正在处理被踢出，跳过KICKED_OUT事件处理');
            return;
          }
          console.log('🚫 收到被踢出事件:', event);
          // 由于已经有LOGIN_STATUS_CHANGED事件处理被踢出逻辑，这里仅作为备份
          // 但为了更可靠，我们也直接调用handleKickedOut方法
          this.handleKickedOut();
        } catch (error) {
          console.error('❌ 处理KICKED_OUT事件时出错:', error);
        }
      };
      
      // 只有在imManager和addEventListener方法都可用时才绑定事件
      if (imManager && typeof imManager.addEventListener === 'function') {
        if (this.onKickedOut) {
          imManager.addEventListener('KICKED_OUT', this.onKickedOut);
          console.log('✅ 绑定KICKED_OUT事件成功');
        }
        
        // 监听SDK_NOT_READY事件 - 使用命名方法
        this.onSDKNotReady = (event) => {
            try {
              // 检查页面状态
              if (this._isPageUnloaded || this._isHandlingKickout) {
                console.log('⚠️ 页面已卸载或正在处理被踢出，跳过SDK_NOT_READY事件处理');
                return;
              }
              console.log('⚠️ 收到SDK_NOT_READY事件:', event);
              wx.showToast({
                title: 'IM连接断开，正在重新连接...',
                icon: 'none',
                duration: 2000
              });
            } catch (error) {
              console.error('❌ 处理SDK_NOT_READY事件时出错:', error);
            }
          };
          
          if (this.onSDKNotReady) {
            imManager.addEventListener('SDK_NOT_READY', this.onSDKNotReady);
            console.log('✅ 绑定SDK_NOT_READY事件成功');
          }
          
          // 所有事件绑定完成，设置标志
          this._hasBoundImManagerEvents = true;
        } else {
          console.error('❌ imManager或addEventListener方法不可用');
        }
      } catch (error) {
        console.error('❌ 设置imManager事件监听失败:', error);
        console.error('错误详情:', { message: error.message, stack: error.stack });
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
  // onFriendRequestListUpdated: function(event) {
  //   this.loadFriendRequests();
  // },

  // 好友申请列表更新回调
  onFriendApplicationListUpdated: function(event) {
    console.log('好友申请列表更新事件:', event);
    this.loadFriendRequests();
  },
  
  // 加载会话列表 - 简化版本，使用imManager状态管理
  loadConversationList: function() {
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
          let needReinit = false;
          
          if (error.message && error.message.includes('等待IM登录超时')) {
            errorMessage = 'IM初始化超时';
            needReinit = true;
          } else if (error.message && error.message.includes('TUIKit实例不可用')) {
            errorMessage = 'IM服务不可用';
            needReinit = true;
          } else if (error.message && error.message.includes('sdk not ready')) {
            errorMessage = 'IM连接断开，正在重新连接...';
            needReinit = true;
          } else if (error.message && error.message.includes('用户多实例登录被踢出')) {
            errorMessage = '账号在其他设备登录，正在重新连接...';
            needReinit = true;
          } else if (error.code === 3003) {
            errorMessage = 'IM连接异常，正在重新连接...';
            needReinit = true;
          }
          
          wx.showToast({
            title: errorMessage,
            icon: 'none',
            duration: 2000
          });
          
          // 如果需要重新初始化，延迟后重试
          if (needReinit) {
            console.log('🔄 检测到连接问题，准备重新初始化IM...');
            setTimeout(() => {
              this.reinitializeIM();
            }, 2000);
          }
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
  
  // 防止循环调用的标记
  _isHandlingKickout: false,
  
  // 重新初始化IM
  reinitializeIM: function() {
    console.log('🔄 开始重新初始化IM...');
    
    // 检查是否正在处理被踢出事件，如果是则不进行重新初始化，避免循环调用
    if (this._isHandlingKickout) {
      console.log('⚠️ 正在处理被踢出事件，跳过重新初始化');
      return;
    }
    
    // 重置状态
    this.setData({
      isImInitialized: false
    });
    
    // 调用imManager的重新登录方法
    try {
      if (imManager && imManager.relogin) {
        imManager.relogin().then(() => {
          console.log('✅ 重新登录成功，重新检查TUIKit状态');
          // 重新检查TUIKit状态
          this.checkTUIKitStatus();
        }).catch((error) => {
          console.log('❌ 重新登录失败:', error);
          
          // 检查错误是否表示账号被踢出
          if (error && (error.message && error.message.includes('KICKED_OUT') || 
                        error.code === 3003 || 
                        error.code === 90104)) {
            console.log('⚠️ 检测到账号被踢出，直接跳转到登录页面');
            this.handleKickedOut();
          } else {
            // wx.showToast({
            //   title: '重新登录失败，请重试',
            //   icon: 'none'
            // });
          }
        });
      } else {
        console.error('❌ imManager或relogin方法不可用');
      }
    } catch (error) {
      console.error('❌ 重新初始化IM异常:', error);
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
      if (userId && (userId === 'AI分身' || userId === '@RBT#001')) {
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

      console.log('lastMessage:', conversation.lastMessage);
      // 获取最后一条消息
      const lastMessage = this.getMessageDetails(conversation.lastMessage);
      
      // 格式化时间
      const time = this.formatTime(lastMessage.lastTime || Date.now());
      
      const contact = {
        id: conversation.conversationID,
        userId: userProfile.userID,
        name: userProfile.nick,
        avatar: this.processAvatarUrl(userProfile.avatar),
        originalAvatar: userProfile.avatar, // 保存原始头像地址
        lastMessage:  lastMessage.content || lastMessage.payload?.text,
        time: time,
        unread: conversation.unreadCount || 0,
        isPinned: conversation.isPinned || false,
        matchPercent: 0 // 添加默认匹配度
      };
      
      return contact;
    }).filter(Boolean);
    
    console.log('处理后的联系人列表:', contactsList);
    
    // 提取所有用户ID，调用匹配度接口
    if (contactsList.length > 0) {
      const userIds = contactsList.map(contact => contact.userId).filter(id => id);
      console.log('提取的用户ID列表:', userIds);
      
      if (userIds.length > 0) {
        this.getMatchPercent(userIds, contactsList);
      } else {
        // 没有有效的用户ID，直接设置列表
        this.setData({
          contactsList: contactsList
        }, () => {
          // 数据设置完成后，批量获取头像URL
          this.batchGetAvatarUrls(contactsList, 1);
        });
      }
    } else {
      // 联系人列表为空，直接设置
      this.setData({
        contactsList: contactsList
      });
    }
  },

  /**
   * 获取联系人匹配度
   * @param {Array} userIds - 用户ID列表
   * @param {Array} contactsList - 原始联系人列表
   */
  getMatchPercent: function(userIds, contactsList) {
    const app = getApp();
    console.log('调用匹配度接口，用户ID列表:', userIds);
    
    app.request({
      url: '/api/users/batch',
      method: 'POST',
      success: (res) => {
        console.log('匹配度接口返回数据:', res);
        
        if (res.results) {
          // 合并匹配度数据到联系人列表
          const updatedContacts = contactsList.map(contact => {
            // 查找对应的匹配度数据
            const matchData = res.results.find(item => item.targetUserId == contact.userId);
            console.log('匹配度数据:', matchData);
            
            return {
              ...contact,
              matchPercent: matchData ? matchData.overallScore : 0
            };
          });
          
          console.log('合并匹配度后的联系人列表:', updatedContacts);
          
          // 更新UI
          this.setData({
            contactsList: updatedContacts
          }, () => {
            // 数据设置完成后，批量获取头像URL
            this.batchGetAvatarUrls(updatedContacts, 1);
          });
        } else {
          console.error('匹配度接口返回失败:', res.message || '未知错误');
          // 接口调用失败，使用默认匹配度
          this.setData({
            contactsList: contactsList
          }, () => {
            // 数据设置完成后，批量获取头像URL
            this.batchGetAvatarUrls(contactsList, 1);
          });
        }
      },
      fail: (error) => {
        console.error('调用匹配度接口失败:', error);
        // 网络请求失败，使用默认匹配度
        this.setData({
          contactsList: contactsList
        }, () => {
          // 数据设置完成后，批量获取头像URL
          this.batchGetAvatarUrls(contactsList, 1);
        });
      }
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
          // if (pendingList.length > 0 && this.data.activeSection === 'contacts') {
          //   console.log('🔄 发现好友请求，自动切换到待联系标签');
          //   this.setData({
          //     activeSection: 'pending'
          //   });
          //   console.log(`收到${pendingList.length}个好友申请`);
          // }
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
    const now = Date.now();
    
    // 收集所有需要获取临时URL的头像
    const avatarRequests = [];
    const cachedRequests = [];
    const expiredCache = [];
    
    userList.forEach((user, index) => {
      // 使用originalAvatar字段来获取原始头像地址
      const originalAvatar = user.originalAvatar || user.avatar;
      if (originalAvatar && !originalAvatar.startsWith('http://')
         && !originalAvatar.startsWith('https://')
         && originalAvatar !== '/images/ai.png') {
        
        // 检查缓存
        const cachedItem = this.data.avatarUrlCache[originalAvatar];
        if (cachedItem && (now - cachedItem.timestamp) < this.data.CACHE_EXPIRY_TIME) {
          // 使用缓存
          cachedRequests.push({
            key: originalAvatar,
            url: cachedItem.url,
            index: index,
            userId: user.id || user.userId
          });
        } else {
          // 需要请求新URL
          avatarRequests.push({
            key: originalAvatar,
            index: index,
            userId: user.id || user.userId
          });
          // 记录过期缓存
          if (cachedItem) {
            expiredCache.push(originalAvatar);
          }
        }
      }
    });
    
    // 先应用缓存的URL
    if (cachedRequests.length > 0) {
      console.log(`🖼️  使用缓存的头像URL: ${cachedRequests.length}个`);
      cachedRequests.forEach(request => {
        const updatePath = type === 1 
          ? `contactsList[${request.index}].avatar`
          : `pendingList[${request.index}].avatar`;
        
        this.setData({
          [updatePath]: request.url
        });
      });
    }
    
    // 如果所有请求都命中缓存，则直接返回
    if (avatarRequests.length === 0) {
      return Promise.resolve();
    }
    
    // 清理过期缓存
    if (expiredCache.length > 0) {
      const updatedCache = { ...this.data.avatarUrlCache };
      expiredCache.forEach(key => {
        delete updatedCache[key];
      });
      this.setData({
        avatarUrlCache: updatedCache
      });
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
            // 更新缓存
            const updatedCache = { ...this.data.avatarUrlCache };
            let updatedCount = 0;
            
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
                
                // 更新缓存
                updatedCache[originalRequest.key] = {
                  url: urlInfo.url,
                  timestamp: now
                };
                updatedCount++;
              }
            });
            
            // 应用缓存更新
            this.setData({
              avatarUrlCache: updatedCache
            });
            
            console.log(`🖼️  成功更新并缓存${updatedCount}个头像URL`);
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
    const now = Date.now();
    
    // 先检查缓存
    const cachedItem = this.data.avatarUrlCache[avatarKey];
    if (cachedItem && (now - cachedItem.timestamp) < this.data.CACHE_EXPIRY_TIME) {
      // 使用缓存的URL
      console.log(`🖼️  使用缓存的单个头像URL: ${avatarKey}`);
      if (type == 1) {
        // 更新联系人列表中指定用户的头像URL
        const updatePath = `contactsList[${index}].avatar`;
        this.setData({
          [updatePath]: cachedItem.url
        });
      } else {
        // 更新待联系列表中指定用户的头像URL
        const updatePath = `pendingList[${index}].avatar`;
        this.setData({
          [updatePath]: cachedItem.url
        });
      }
      return;
    }
    
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
          // 更新缓存
          const updatedCache = { ...this.data.avatarUrlCache };
          updatedCache[avatarKey] = {
            url: res.url,
            timestamp: now
          };
          this.setData({
            avatarUrlCache: updatedCache
          });
          
          console.log(`🖼️  缓存单个头像URL: ${avatarKey}`);
          
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
    const sharedId=wx.getStorageSync('sharedUserId');
    console.log('sharedId:', sharedId);

    // 页面显示时的操作
    const params = getApp().globalData.tabParams;
    if (params) {
      // 使用参数进行逻辑判断
      // 切换到指定tab
      if (params.activeSection) {
        this.setData({
          activeSection: params.activeSection
        });
      }
      // 使用完后清理，避免下次进入时仍持有旧数据
      getApp().globalData.tabParams = null;
    }

    // 调用全局的页面显示钩子函数
    const app = getApp();
    if (!app.isLoggedIn()) {
      return;
    }
    if (app.onPageShow) {
      app.onPageShow(this);
    }
    
    // 检查隐私设置（仅在IM初始化时检查一次）
    if (!this.hasCheckedPrivacy) {
      this.checkAndSetPrivacySettings();
      this.hasCheckedPrivacy = true;
    }
    
    // 添加时间间隔检查，避免频繁刷新
    const now = Date.now();
    
    if (app.globalData.isTUIKitInitialized && wx.$TUIKit) {
      this.setData({
        isImInitialized: true
      });
      
      // 检查是否需要刷新数据
      if (!this.data.lastRefreshTime || (now - this.data.lastRefreshTime) > this.data.MIN_REFRESH_INTERVAL) {
        // 只有在需要时才加载完整数据
        console.log('⏱️  超过刷新间隔，重新加载数据');
        this.loadConversationList();
        this.loadFriendRequests();
        this.setData({
          lastRefreshTime: now
        });
      } else {
        // 否则只更新增量数据（如未读消息数）
        console.log('⏱️  在刷新间隔内，只更新增量数据');
        this.refreshConversationUpdates();
      }
    } else {
      // 如果没有初始化，则重新检查TUIKit状态
      if (app.isLoggedIn()) {
        this.checkTUIKitStatus();
      }
      
      // 重置刷新时间，确保下次初始化后能正常加载数据
      this.setData({
        lastRefreshTime: 0
      });
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
      showSearchResults: false,
      currentItemIndex: null
    });
  },
  onPageScroll() {
    this.setData({
      currentItemIndex: null
    })
  },
  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    console.log('🗑️ 页面卸载，清理资源...');
    
    // 设置页面卸载标志，防止后续操作执行
    this._isPageUnloaded = true;
    console.log('✅ 已设置_isPageUnloaded为true');
    
    // 重置处理被踢出标志
    this._isHandlingKickout = false;
    console.log('✅ 已重置_isHandlingKickout为false');
    
    // 重置事件绑定标志
    this._hasBoundImManagerEvents = false;
    console.log('✅ 已重置_hasBoundImManagerEvents为false');
    
    // 清理会话更新订阅
    try {
      if (this.conversationUpdateHandler && typeof this.conversationUpdateHandler.unsubscribe === 'function') {
        console.log('🔄 执行会话更新订阅清理');
        this.conversationUpdateHandler.unsubscribe();
        console.log('✓ 会话更新订阅已清理');
        this.conversationUpdateHandler = null; // 避免内存泄漏
      } else {
        console.log('ℹ️ conversationUpdateHandler不存在或unsubscribe方法不可用，跳过清理');
      }
    } catch (e) {
      console.error('× 清理订阅失败:', e);
      console.error('异常详情:', {
        message: e.message,
        stack: e.stack
      });
    }
    
    // 清理imManager事件监听器
    try {
      if (imManager && imManager.removeEventListener && typeof imManager.removeEventListener === 'function') {
        // 移除所有imManager事件监听器
        console.log('🔇 移除imManager事件监听器');
        
        if (this.onLoginStatusChanged && typeof this.onLoginStatusChanged === 'function') {
          imManager.removeEventListener('LOGIN_STATUS_CHANGED', this.onLoginStatusChanged);
          console.log('✓ 已移除LOGIN_STATUS_CHANGED事件监听器');
          this.onLoginStatusChanged = null;
        }
        if (this.onKickedOut && typeof this.onKickedOut === 'function') {
          imManager.removeEventListener('KICKED_OUT', this.onKickedOut);
          console.log('✓ 已移除KICKED_OUT事件监听器');
          this.onKickedOut = null;
        }
        if (this.onSDKNotReady && typeof this.onSDKNotReady === 'function') {
          imManager.removeEventListener('SDK_NOT_READY', this.onSDKNotReady);
          console.log('✓ 已移除SDK_NOT_READY事件监听器');
          this.onSDKNotReady = null;
        }
      } else {
        console.warn('⚠️ imManager或removeEventListener方法不可用，跳过事件监听器清理');
      }
    } catch (error) {
      console.error('× 清理imManager事件监听器失败:', error);
      console.error('异常详情:', {
        message: error.message,
        stack: error.stack
      });
    }
    
    // 清理TUIKit事件监听器
    try {
      // 确保所有必要的对象和方法都可用
      if (wx && wx.$TUIKit && typeof wx.$TUIKit === 'object' && 
          wx.$TUIKit.off && typeof wx.$TUIKit.off === 'function' && 
          wx.TencentCloudChat && wx.TencentCloudChat.EVENT) {
        console.log('🔄 清理TUIKit事件监听器');
        
        // 定义一个安全的off方法调用函数
        const safeOff = (eventName, handler) => {
          try {
            if (eventName && typeof eventName === 'string' && handler && typeof handler === 'function') {
              wx.$TUIKit.off(eventName, handler, this);
              console.log(`✓ 已移除${eventName}事件监听器`);
            }
          } catch (err) {
            console.warn(`⚠️ 移除${eventName}事件监听器失败:`, err.message);
          }
        };
        
        // 依次清理各个事件监听器
        safeOff(wx.TencentCloudChat.EVENT.SDK_READY, this._onSdkReadyHandler);
        safeOff(wx.TencentCloudChat.EVENT.CONVERSATION_LIST_UPDATED, this._onConversationListUpdatedHandler);
        safeOff(wx.TencentCloudChat.EVENT.MESSAGE_RECEIVED, this._onMessageReceivedHandler);
        safeOff(wx.TencentCloudChat.EVENT.FRIEND_APPLICATION_LIST_UPDATED, this._onFriendApplicationListUpdatedHandler);
      } else {
        console.warn('⚠️ wx.$TUIKit或相关方法/常量不可用，跳过TUIKit事件监听器清理');
      }
    } catch (error) {
      console.error('× 清理TUIKit事件监听器失败:', error);
      console.error('异常详情:', {
        message: error.message,
        stack: error.stack
      });
    }
    
    console.log('🧹 页面卸载，所有资源清理完成');
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

    // 显示加载状态
    wx.showLoading({
      title: '搜索中...',
    });

    // 如果IM已初始化，使用云端消息搜索
    if (this.data.isImInitialized && wx.$TUIKit) {
      this.searchCloudMessages(searchText)
        .then(messageResults => {
          // 同时搜索联系人姓名
          const contactResults = this.searchContacts(searchText, contactsList, pendingList);
          
          // 合并搜索结果
          const allResults = this.mergeSearchResults(contactResults, messageResults);
          
          this.setData({
            searchResults: allResults,
            showSearchResults: true
          });
        })
        .catch(error => {
          console.error('云端消息搜索失败:', error);
          // 降级到本地搜索
          this.performLocalSearch(searchText, contactsList, pendingList);
        })
        .finally(() => {
          wx.hideLoading();
        });
    } else {
      // IM未初始化，使用本地搜索
      this.performLocalSearch(searchText, contactsList, pendingList);
      wx.hideLoading();
    }
  },

  // 云端消息搜索
  searchCloudMessages: function(searchText) {
    return new Promise((resolve, reject) => {
      // 检查是否有searchCloudMessages API
      if (typeof wx.$TUIKit.searchCloudMessages !== 'function') {
        console.warn('searchCloudMessages API不存在，尝试使用其他搜索方法');
        // 尝试使用getMessageList搜索每个会话的消息
        this.searchAllConversations(searchText)
          .then(resolve)
          .catch(reject);
        return;
      }

      wx.$TUIKit.searchCloudMessages({
        keywordList: [searchText],
        conversationType: wx.$TUIKit.TYPES.CONV_C2C, // 搜索C2C会话
        pageSize: 20,
        cursor: ''
      }).then(response => {
        console.log('云端消息搜索结果:', response);
        const messageResults = this.processCloudSearchResults(response.data || []);
        resolve(messageResults);
      }).catch(error => {
        console.error('云端消息搜索失败:', error);
        reject(error);
      });
    });
  },

  // 搜索所有会话中的消息（降级方案）
  searchAllConversations: async function(searchText) {
    const allMessageResults = [];
    const { contactsList } = this.data;
    
    // 限制搜索的会话数量，避免请求过多
    const maxConversations = Math.min(contactsList.length, 10);
    
    for (let i = 0; i < maxConversations; i++) {
      const contact = contactsList[i];
      try {
        const messages = await this.searchConversationMessages(contact.id, searchText);
        allMessageResults.push(...messages);
      } catch (error) {
        console.error(`搜索会话 ${contact.id} 失败:`, error);
      }
    }
    
    return allMessageResults;
  },

  // �搜索单个会话的消息
  searchConversationMessages: function(conversationID, searchText) {
    return new Promise((resolve, reject) => {
      wx.$TUIKit.getMessageList({
        conversationID: conversationID,
        count: 20, // 获取最近20条消息进行搜索
        cursor: ''
      }).then(response => {
        const messages = response.data.messageList || [];
        const matchedMessages = messages.filter(msg => 
          msg.payload && msg.payload.text && 
          msg.payload.text.toLowerCase().includes(searchText.toLowerCase())
        );
        
        // 为匹配的消息添加会话信息
        const results = matchedMessages.map(msg => ({
          ...msg,
          conversationID: conversationID,
          matchType: 'message',
          contactName: this.getContactName(conversationID)
        }));
        
        resolve(results);
      }).catch(reject);
    });
  },

  // 处理云端搜索结果
  processCloudSearchResults: function(searchResults) {
    return searchResults.map(result => ({
      ...result,
      matchType: 'message',
      contactName: this.getContactName(result.conversationID)
    }));
  },

  // 获取联系人名称
  getContactName: function(conversationID) {
    const contact = this.data.contactsList.find(c => c.id === conversationID);
    return contact ? contact.name : '未知用户';
  },

  // 搜索联系人
  searchContacts: function(searchText, contactsList, pendingList) {
    const allUsers = [...contactsList, ...pendingList.map(item => ({
      ...item,
      lastMessage: item.message,
      unread: 0
    }))];

    return allUsers.filter(user => 
      user.name.toLowerCase().includes(searchText.toLowerCase())
    ).map(user => ({
      ...user,
      matchType: 'contact'
    }));
  },

  // 合并搜索结果
  mergeSearchResults: function(contactResults, messageResults) {
    // 创建一个映射，按会话ID分组消息
    const messageMap = {};
    messageResults.forEach(msg => {
      if (!messageMap[msg.conversationID]) {
        messageMap[msg.conversationID] = [];
      }
      messageMap[msg.conversationID].push(msg);
    });

    // 为联系人结果添加匹配的消息
    const mergedResults = contactResults.map(contact => {
      const matchedMessages = messageMap[contact.id] || [];
      return {
        ...contact,
        matchedMessages: matchedMessages,
        totalMatches: matchedMessages.length
      };
    });

    // 添加只有消息匹配的联系人（不在联系人列表中的）
    Object.keys(messageMap).forEach(conversationID => {
      if (!mergedResults.find(result => result.id === conversationID)) {
        mergedResults.push({
          id: conversationID,
          name: this.getContactName(conversationID),
          matchType: 'message_only',
          matchedMessages: messageMap[conversationID],
          totalMatches: messageMap[conversationID].length,
          unread: 0
        });
      }
    });

    // 按匹配数量排序
    return mergedResults.sort((a, b) => b.totalMatches - a.totalMatches);
  },

  // 本地搜索（降级方案）
  performLocalSearch: function(searchText, contactsList, pendingList) {
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

  // 导航到聊天会话页
  navigateToConversation: function(e) {
    let user = e.currentTarget.dataset.user;
    console.log('原始用户数据:', e);
    // 如果是搜索结果，需要使用originalUser数据
    if (user.originalUser) {
      user = user.originalUser;
    }
    
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
    let url = `/subpages/conversation/conversation`;
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
      url: '/subpages/about/about'
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
          // 刷新联系人列表的逻辑已移至sendWelcomeMessage方法中，确保会话创建完成后再刷新
          // 避免因异步操作导致的更新不及时问题
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

    /**
   * 获取消息详细信息
   */
  getMessageDetails(message) {
    let messageInfo = {
      content: '',
      messageType: 'text',
      imageUrl: '',
      fileName: '',
      fileSize: '',
      fileUrl: '',
      location: null,
      duration: '',
      audioUrl: '',
      videoUrl: '',
      faceData: '',
      isRevoked: false,
      type: '',
      lastTime: message.lastTime || 0,
    };

    if (!wx.$TUIKit) {
      return messageInfo;
    }

    switch (message.type) {
      case wx.TencentCloudChat.TYPES.MSG_TEXT:
        messageInfo.content = message.payload.text || '';
        messageInfo.messageType = 'text';
        break;
        
      case wx.TencentCloudChat.TYPES.MSG_IMAGE:
        messageInfo.content = '[图片]';
        messageInfo.messageType = 'image';
        // 获取图片URL，优先使用原图，其次使用大图（与conversation.js保持一致）
        messageInfo.imageUrl = message.payload.imageInfoArray?.[0]?.url || 
                               message.payload.url || 
                               message.payload.imageUrl || '';
        // console.log('获取的图片URL:', messageInfo.imageUrl);
        // console.log('完整消息对象:', JSON.stringify(messageInfo, null, 2));
        
        // 测试图片URL可访问性
        if (messageInfo.imageUrl) {
          this.testImageUrl(messageInfo.imageUrl);
        }
        break;
        
      case wx.TencentCloudChat.TYPES.MSG_AUDIO:
        messageInfo.content = '[语音]';
        messageInfo.messageType = 'audio';
        messageInfo.duration = message.payload.second || 0;
        messageInfo.audioUrl = message.payload.url || '';
        break;
        
      case wx.TencentCloudChat.TYPES.MSG_VIDEO:
        messageInfo.content = '[视频]';
        messageInfo.messageType = 'video';
        messageInfo.videoUrl = message.payload.videoUrl || '';
        break;
        
      case wx.TencentCloudChat.TYPES.MSG_FILE:
        messageInfo.content = '[文件]';
        messageInfo.messageType = 'file';
        messageInfo.fileName = message.payload.fileName || '';
        messageInfo.fileSize = this.formatFileSize(message.payload.fileSize || 0);
        // 修复文件URL获取逻辑，优先使用url字段，其次使用fileUrl字段
        messageInfo.fileUrl = message.payload.url || message.payload.fileUrl || '';
        messageInfo.fileTypeInfo = this.getFileTypeInfo(messageInfo.fileName); // 添加文件类型信息
        break;
        
      case wx.TencentCloudChat.TYPES.MSG_FACE:
        messageInfo.content = '[表情]';
        messageInfo.messageType = 'face';
        messageInfo.faceData = message.payload.data || '';
        break;
        
      case wx.TencentCloudChat.TYPES.MSG_LOCATION:
        messageInfo.content = '[位置]';
        messageInfo.messageType = 'location';
        // 从description中分离name和address
        const description = message.payload.description || '';
        let name = '';
        let address = '';
        if (description.includes(' - ')) {
          const parts = description.split(' - ');
          name = parts[0] || '';
          address = parts[1] || '';
        } else {
          address = description;
        }
        messageInfo.location = {
          latitude: message.payload.latitude,
          longitude: message.payload.longitude,
          name: name,
          address: address
        };
        break;
        
      case wx.TencentCloudChat.TYPES.MSG_CUSTOM:
        // messageInfo.content = '[自定义消息]';
        messageInfo.messageType = 'custom';
        try {
          const customData = JSON.parse(message.payload.data || '{}');
          // console.log('=== 解析自定义消息内容 ===', customData);
          
          // 处理AI下一问的流式消息
          if (customData.chatbotPlugin === 1 && customData.src === 2 && customData.chunks) {
            // 提取chunks内容作为消息内容
            for (const chunk of customData.chunks) {
              messageInfo.content += chunk || '';
            }
            messageInfo.messageType = 'text'; // 标记为文本消息类型，便于显示
            // console.log('=== 提取到流式消息内容 ===', messageInfo.content);
          } else if (customData.businessID === 'user_defined_status') {
            // 处理其他类型的自定义消息
            messageInfo.content = customData.description || '[自定义消息]';
          }
        } catch (e) {
          console.log('解析自定义消息失败:', e);
        }
        break;
        
      default:
        messageInfo.content = '[未知消息类型]';
        messageInfo.messageType = 'text';
    }

    return messageInfo;
  },

   /**
   * 测试图片URL可访问性
   */
  testImageUrl(url) {
    // 使用微信小程序提供的wx.getImageInfo方法检测图片可访问性
    wx.getImageInfo({
      src: url,
      success: (res) => {
        console.log('图片URL可访问:', url, '图片信息:', res);
      },
      fail: (error) => {
        console.error('图片URL不可访问:', url, error);
      }
    });
  },
  
  /**
   * 获取文件类型信息
   */
  getFileTypeInfo(fileName) {
    const extension = this.getFileExtension(fileName);
    console.log('extension', extension);
    // 文档类型
    const documentTypes = ['doc', 'docx', 'txt', 'pdf', 'rtf'];
    // 表格类型
    const spreadsheetTypes = ['xls', 'xlsx', 'csv'];
    // 演示文稿类型
    const presentationTypes = ['ppt', 'pptx'];
    // 图片类型
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    // 音频类型
    const audioTypes = ['mp3', 'wav', 'aac', 'flac', 'ogg'];
    // 视频类型
    const videoTypes = ['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv'];
    // 压缩包类型
    const archiveTypes = ['zip', 'rar', '7z', 'tar', 'gz'];
    
    let icon = 'fa-file-o';
    let color = '#6b7280';
    let bgColor = '#f3f4f6';
    
    if (documentTypes.includes(extension)) {
      icon = 'fa-file-text-o';
      color = '#3b82f6';
      bgColor = '#eff6ff';
    } else if (spreadsheetTypes.includes(extension)) {
      icon = 'fa-file-excel-o';
      color = '#10b981';
      bgColor = '#ecfdf5';
    } else if (presentationTypes.includes(extension)) {
      icon = 'fa-file-powerpoint-o';
      color = '#f59e0b';
      bgColor = '#fffbeb';
    } else if (imageTypes.includes(extension)) {
      icon = 'fa-file-image-o';
      color = '#8b5cf6';
      bgColor = '#f3e8ff';
    } else if (audioTypes.includes(extension)) {
      icon = 'fa-file-audio-o';
      color = '#ef4444';
      bgColor = '#fef2f2';
    } else if (videoTypes.includes(extension)) {
      icon = 'fa-file-video-o';
      color = '#06b6d4';
      bgColor = '#ecfeff';
    } else if (archiveTypes.includes(extension)) {
      icon = 'fa-file-archive-o';
      color = '#f97316';
      bgColor = '#fff7ed';
    } else if (extension === 'pdf') {
      icon = 'fa-file-pdf-o';
      color = '#dc2626';
      bgColor = '#fef2f2';
    }
    
    return {
      icon,
      color,
      bgColor
    };
  },

  /**
   * 判断是否为图片文件
   */
  isImageFile(extension) {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    return imageExtensions.includes(extension);
  },

  /**
   * 判断是否为文本文件
   */
  isTextFile(extension) {
    const textExtensions = ['txt', 'md', 'json', 'xml', 'html', 'css', 'js', 'log', 'csv'];
    return textExtensions.includes(extension);
  },

  /**
   * 获取文件扩展名
   */
  getFileExtension(filename) {
    if (!filename) return '';
    const lastDotIndex = filename.lastIndexOf('.');
    return lastDotIndex > -1 ? filename.substring(lastDotIndex + 1).toLowerCase() : '';
  },

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    if (i === 0) return bytes + ' ' + sizes[i];
    
    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
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
        // 消息发送成功后，延迟刷新会话列表，确保会话已创建
        setTimeout(() => {
          this.loadConversationList();
        }, 1000);
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
  },

  // 页面状态标志
  _isPageUnloaded: false,
  
  // 处理被踢出登录
  handleKickedOut: function() {
    console.log('🚪 开始处理用户被踢出登录流程');
    
    // 检查是否已经在处理中，防止循环调用
    if (this._isHandlingKickout) {
      console.warn('⚠️ handleKickedOut方法已经在执行中，避免重复调用');
      return;
    }
    
    try {
      // 设置处理被踢出标志，防止循环调用
      this._isHandlingKickout = true;
      console.log('✅ 设置_isHandlingKickout标志为true');
      
      // 检查页面是否已卸载，如果已卸载则不再执行后续操作
      if (this._isPageUnloaded) {
        console.log('⚠️ 页面已卸载，跳过handleKickedOut处理');
        return;
      }
      
      // 清理本地状态
      try {
        console.log('🧹 开始清理本地登录状态');
        const app = getApp();
        if (app && app.logout && typeof app.logout === 'function') {
          console.log('🔄 调用app.logout清理全局登录状态');
          app.logout();
          console.log('✅ 全局登录状态清理完成');
        } else {
          console.warn('⚠️ app.logout方法不可用，跳过全局状态清理');
        }
      } catch (error) {
        console.error('❌ 清理登录状态失败:', error);
        console.error('清理失败详情:', {
          message: error.message,
          stack: error.stack
        });
      }
      
      // 清理IM状态
      try {
        console.log('🧹 开始清理IM状态');
        if (imManager && imManager.logout && typeof imManager.logout === 'function') {
          console.log('🔄 调用imManager.logout清理IM状态');
          imManager.logout();
          console.log('✅ IM状态清理完成');
        } else {
          console.warn('⚠️ imManager.logout方法不可用，跳过IM状态清理');
        }
      } catch (error) {
        console.error('❌ 清理IM状态失败:', error);
        console.error('清理失败详情:', {
          message: error.message,
          stack: error.stack
        });
      }
      
      // 立即跳转到登录页面，避免长时间等待
      console.log('🚀 执行wx.reLaunch跳转到登录页面');
      
      // 定义跳转函数，便于多次尝试
      const performNavigation = (method, options) => {
        return new Promise((resolve, reject) => {
          console.log(`🔄 执行${method}跳转到登录页面`);
          if (wx[method] && typeof wx[method] === 'function') {
            wx[method]({
              ...options,
              success: (res) => {
                console.log(`✅ ${method}跳转成功`);
                resolve(res);
              },
              fail: (error) => {
                console.error(`❌ ${method}跳转失败:`, error);
                console.error('跳转失败详情:', {
                  message: error.message,
                  stack: error.stack,
                  errMsg: error.errMsg
                });
                reject(error);
              }
            });
          } else {
            console.error(`❌ ${method}方法不可用`);
            reject(new Error(`${method} method is not available`));
          }
        });
      };
      
      // 尝试多种跳转方式，确保用户能被引导到登录页面
      performNavigation('reLaunch', { url: '/pages/login/login' })
        .catch(() => {
          // reLaunch失败，尝试redirectTo
          console.log('🔄 reLaunch失败，尝试redirectTo');
          return performNavigation('redirectTo', { url: '/pages/login/login' });
        })
        .catch(() => {
          // redirectTo失败，尝试navigateTo
          console.log('🔄 redirectTo失败，尝试navigateTo');
          return performNavigation('navigateTo', { url: '/pages/login/login' });
        })
        .catch((finalError) => {
          console.error('❌ 所有跳转方式均失败:', finalError);
          // 最后尝试直接设置页面卸载标志
          console.log('🔄 设置页面卸载标志');
          this._isPageUnloaded = true;
        });
        
    } catch (error) {
      console.error('❌ handleKickedOut执行失败:', error);
      console.error('错误详情:', {
        message: error.message,
        stack: error.stack
      });
      
      // 即使出错也要确保跳转到登录页面
      try {
        console.log('🔄 执行错误捕获后的备用跳转');
        wx.reLaunch({
          url: '/pages/login/login',
          fail: (relaunchError) => {
            console.error('❌ 备用reLaunch跳转失败:', relaunchError);
            // 最后尝试redirectTo
            setTimeout(() => {
              try {
                wx.redirectTo({
                  url: '/pages/login/login',
                  fail: (finalError) => {
                    console.error('❌ 最终跳转登录页面失败:', finalError);
                  }
                });
              } catch (finalError) {
                console.error('❌ 无法执行任何跳转:', finalError);
              }
            }, 100);
          }
        });
      } catch (relaunchError) {
        console.error('❌ 无法跳转到登录页面:', relaunchError);
      }
    } finally {
      console.log('🏁 handleKickedOut方法执行完成');
      // 注意：不在这里清除_isHandlingKickout标志，因为页面跳转后这个值不再重要
    }
  },
    /**
   * 导航到预览页面
   */
  navigateToPreview(e) {
    const { user } = e.currentTarget.dataset
    console.log('user:', user)
    const userId = user.id
    wx.navigateTo({
      url: `/subpages/preview/preview?isFromProfile=true&type=avatar&userId=${userId}`
    })
  },
  slideButtonTap(e) {
    const { user } = e.currentTarget.dataset
    const id = user.id
    const index = e.detail.index
    const conversation = this.data.contactsList.find(contact => contact.id === id)
    
    if (index === 0) {
      // 如果当前是置顶按钮
      if (conversation && conversation.isPinned) {
        // 如果已经置顶，则取消置顶
        this.unpinConversation(id)
      } else {
        // 否则置顶
        this.pinConversation(id)
      }
    }
    this.setData({
      currentItemIndex: null
    })
  },
  //置顶会话
  pinConversation(id) {
    let promise = wx.$TUIKit.pinConversation(
      { conversationID: id, isPinned: true }
    );
    promise.then(imResponse => {
      // 置顶会话成功
      const { conversationID } = imResponse.data; // 被置顶的会话 ID
      console.log('pinConversation success:', imResponse); // 置顶会话成功的相关信息
      // 更新本地数据
      this.updateConversationPinStatus(conversationID, true)
    }).catch(imError => {
      const { code } = imError;
      // code - 50002 会话 ID 无效
      console.warn('pinConversation error:', imError); // 置顶会话失败的相关信息
    });
  },
  
  // 更新会话置顶状态
  updateConversationPinStatus(conversationID, isPinned) {
    // 更新contactsList中的会话状态
    const updatedContactsList = this.data.contactsList.map(contact => {
      if (contact.id === conversationID) {
        return {
          ...contact,
          isPinned: isPinned
        };
      }
      return contact;
    });
    
    this.setData({
      contactsList: updatedContactsList
    });
  },
  //取消置顶
  unpinConversation(id) {
    let promise = wx.$TUIKit.pinConversation({ conversationID: id, isPinned: false });
    promise.then(imResponse => {
      // 取消置顶会话成功
      const { conversationID } = imResponse.data; // 被取消置顶的会话 ID
      console.log('unpinConversation success:', imResponse);
      // 更新本地数据
      this.updateConversationPinStatus(conversationID, false)
    }).catch(imError => {
      console.warn('unpinConversation error:', imError); // 取消置顶会话失败的相关信息
    });
  },
  handleShow(e) {
    const { index } = e.currentTarget.dataset
    this.setData({
      currentItemIndex: index
    })
  },
  closeSlideview() {
    this.setData({
      currentItemIndex: null
    })
  },
});