// utils/imManager.js
// IM统一管理器 - 解决页面间状态同步问题

import TencentCloudChat from '@tencentcloud/chat';
// 兼容CommonJS模块的导入
if (typeof TencentCloudChat === 'object' && TencentCloudChat.default) {
  TencentCloudChat = TencentCloudChat.default;
}

// 导入上传插件
import TIMUploadPlugin from 'tim-upload-plugin';

class IMManager {
  constructor() {
    this.isInitialized = false;
    this.isLoggedIn = false;
    this.loginPromise = null;
    this.initPromise = null;
    
    // IM配置
    this.config = {
      userID: null,
      userSig: null,
      SDKAppID: null
    };
    
    // 事件监听器
    this.eventListeners = new Map();
    
    // 绑定方法到实例
    this.checkIMStatus = this.checkIMStatus.bind(this);
    this.waitForLogin = this.waitForLogin.bind(this);
  }
  
  // ==================== 初始化管理 ====================
  
  // 初始化IM（单例模式，避免重复初始化）
  async initialize(userID, userSig, SDKAppID) {
    // 如果正在初始化，返回现有的Promise
    if (this.initPromise) {
      return this.initPromise;
    }
    
    // 如果已经初始化且是同一用户，直接返回
    if (this.isInitialized && this.isLoggedIn && 
        this.config.userID === userID && this.config.SDKAppID === SDKAppID) {
      console.log('IM已初始化且为同一用户，跳过重复初始化');
      return Promise.resolve();
    }
    
    // 如果已登录不同用户，先登出
    if (this.isInitialized && this.isLoggedIn && 
        this.config.userID !== userID) {
      await this.logout();
    }
    
    this.initPromise = this._performInitialization(userID, userSig, SDKAppID);
    
    try {
      await this.initPromise;
      this.initPromise = null; // 清除Promise
      return Promise.resolve();
    } catch (error) {
      this.initPromise = null; // 清除Promise
      throw error;
    }
  }
  
  // 执行实际的初始化
  async _performInitialization(userID, userSig, SDKAppID) {
    try {
      console.log('开始IM初始化:', { userID, SDKAppID });
      
      // 清理旧实例
      this._clearInstance();
      
      // 创建新实例
      wx.$TUIKit = TencentCloudChat.create({
        SDKAppID: parseInt(SDKAppID)
      });
      
      // 注册上传插件 - 支持图片、音频、视频、文件等消息类型
      try {
        wx.$TUIKit.registerPlugin({'tim-upload-plugin': TIMUploadPlugin});
        console.log('✅ 上传插件注册成功');
      } catch (pluginError) {
        console.warn('⚠️ 上传插件注册失败:', pluginError);
      }
      
      // 保存配置
      this.config = { userID, userSig, SDKAppID };
      
      // 设置全局变量（兼容旧代码）
      wx.$chat_userID = userID;
      wx.$chat_userSig = userSig;
      wx.$chat_SDKAppID = parseInt(SDKAppID);
      wx.TencentCloudChat = TencentCloudChat;
      
      // 重要：先设置事件监听，再登录，确保不会错过SDK_READY事件
      console.log('🔧 设置事件监听器（登录前）...');
      this._setupEventListeners();
      
      // 等待一小段时间确保事件监听器设置完成
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 登录IM
      console.log('🔐 开始登录IM...');
      await wx.$TUIKit.login({
        userID: userID,
        userSig: userSig
      });
      
      console.log('IM登录方法调用成功');
      
      // 更新状态
      this.isInitialized = true;
      // 注意：isLoggedIn会在SDK_READY事件中设置为true
      
      // 等待SDK_READY事件或超时
      console.log('⏳ 等待SDK_READY事件...');
      try {
        await this.waitForLogin(15000); // 等待15秒
        console.log('✅ SDK_READY事件已触发，IM完全初始化完成');
      } catch (waitError) {
        console.warn('⚠️ 等待SDK_READY超时，但登录可能已成功:', waitError.message);
        // 即使超时也检查实际状态
        const status = this.checkIMStatus();
        if (status.tUIKitLoginStatus === wx.TencentCloudChat.TYPES.LOGIN_STATUS_SUCCESS) {
          console.log('🔄 TUIKit显示已登录，强制更新状态');
          this.isLoggedIn = true;
        }
      }
      
      // 通知所有监听器
      this._notifyListeners('LOGIN_SUCCESS', { userID, SDKAppID });
      
      return Promise.resolve();
      
    } catch (error) {
      console.error('IM初始化失败:', error);
      
      // 如果是重复登录错误，不视为失败
      if (error.message && (error.message.includes('重复登录') || 
          error.message.includes('duplicate login'))) {
        console.log('检测到重复登录，标记为已初始化');
        this.isInitialized = true;
        this.isLoggedIn = true;
        this._notifyListeners('LOGIN_SUCCESS', { userID, SDKAppID });
        return Promise.resolve();
      }
      
      // 清理状态
      this._clearInstance();
      this.isInitialized = false;
      this.isLoggedIn = false;
      
      this._notifyListeners('LOGIN_ERROR', error);
      throw error;
    }
  }
  
  // ==================== 状态检查 ====================
  
  // 检查IM状态
  checkIMStatus() {
    const status = {
      isInitialized: this.isInitialized,
      isLoggedIn: this.isLoggedIn,
      hasInstance: !!wx.$TUIKit,
      hasConfig: !!(this.config && this.config.userID && this.config.SDKAppID),
      config: this.config ? { ...this.config } : {}
    };
    
    // 如果TUIKit实例存在，尝试获取实际状态
    if (wx.$TUIKit) {
      try {
        // 检查TUIKit登录状态
        if (wx.$TUIKit.getLoginStatus) {
          const tUIKitStatus = wx.$TUIKit.getLoginStatus();
          status.tUIKitLoginStatus = tUIKitStatus;
          status.tUIKitStatusText = this._getLoginStatusText(tUIKitStatus);
          
          // 如果TUIKit显示已登录但imManager.isLoggedIn为false，同步更新
          if (tUIKitStatus === wx.TencentCloudChat.TYPES.LOGIN_STATUS_SUCCESS && !this.isLoggedIn) {
            console.log('🔄 检测到TUIKit已登录，同步更新imManager状态');
            this.isLoggedIn = true;
            status.isLoggedIn = true;
          }
        }
        
        // 尝试获取用户资料作为额外检查
        try {
          const userProfile = wx.$TUIKit.getMyProfile();
          if (userProfile && userProfile.data) {
            status.canGetProfile = true;
            status.profileUserID = userProfile.data.userID;
          } else {
            status.canGetProfile = false;
          }
        } catch (profileError) {
          status.canGetProfile = false;
          status.profileError = profileError.message;
        }
        
        // 获取SDK版本
        if (wx.$TUIKit.getSDKVersion) {
          status.sdkVersion = wx.$TUIKit.getSDKVersion();
        }
        
      } catch (error) {
        status.checkError = error.message;
      }
    }
    
    console.log('IM状态检查:', status);
    return status;
  }
  
  // 获取登录状态文本
  _getLoginStatusText(status) {
    const statusMap = {
      [wx.TencentCloudChat.TYPES.LOGIN_STATUS_SUCCESS]: '登录成功',
      [wx.TencentCloudChat.TYPES.LOGIN_STATUS_LOGINING]: '登录中',
      [wx.TencentCloudChat.TYPES.LOGIN_STATUS_LOGOUT]: '未登录',
      [wx.TencentCloudChat.TYPES.LOGIN_STATUS_UNKNOWN]: '未知状态'
    };
    return statusMap[status] || '未知状态';
  }
  
  // 等待登录完成
  async waitForLogin(timeout = 10000) {
    if (this.isLoggedIn) {
      console.log('✅ 已经登录，直接返回');
      return Promise.resolve();
    }
    
    if (this.loginPromise) {
      console.log('⏳ 已有登录等待进行中，返回现有Promise');
      return this.loginPromise;
    }
    
    console.log(`⏱️ 开始等待登录完成，超时时间: ${timeout}ms`);
    
    this.loginPromise = new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkStatus = () => {
        const elapsed = Date.now() - startTime;
        
        if (this.isLoggedIn) {
          console.log(`✅ 登录完成，耗时: ${elapsed}ms`);
          this.loginPromise = null;
          resolve();
        } else if (elapsed > timeout) {
          console.log(`⏰ 等待登录超时，耗时: ${elapsed}ms`);
          this.loginPromise = null;
          
          // 超时时提供详细的诊断信息
          const status = this.checkIMStatus();
          console.log('超时时的IM状态:', status);
          
          reject(new Error(`等待IM登录超时 (${timeout}ms)`));
        } else {
          // 每200ms检查一次
          setTimeout(checkStatus, 200);
        }
      };
      
      // 立即检查一次
      checkStatus();
    });
    
    return this.loginPromise;
  }
  
  // ==================== 登出管理 ====================
  
  async logout() {
    try {
      console.log('开始IM登出');
      
      if (wx.$TUIKit) {
        try {
          await wx.$TUIKit.logout();
        } catch (error) {
          console.log('IM登出失败，但继续清理:', error);
        }
      }
      
      this._clearInstance();
      this._resetState();
      
      this._notifyListeners('LOGOUT_SUCCESS');
      
      return Promise.resolve();
    } catch (error) {
      console.error('IM登出失败:', error);
      throw error;
    }
  }
  
  // ==================== 事件管理 ====================
  
  // 添加事件监听器
  addEventListener(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }
  
  // 移除事件监听器
  removeEventListener(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }
  
  // 通知监听器
  _notifyListeners(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('事件监听器执行失败:', error);
        }
      });
    }
  }
  
  // ==================== 私有方法 ====================
  
  // 清理实例
  _clearInstance() {
    if (wx.$TUIKit) {
      wx.$TUIKit = null;
    }
    
    // 清理全局变量
    wx.$chat_userID = null;
    wx.$chat_userSig = null;
    wx.$chat_SDKAppID = null;
  }
  
  // 重置状态
  _resetState() {
    this.isInitialized = false;
    this.isLoggedIn = false;
    this.config = {
      userID: null,
      userSig: null,
      SDKAppID: null
    };
  }
  
  // 设置事件监听
  _setupEventListeners() {
    if (!wx.$TUIKit) {
      console.error('❌ TUIKit实例不存在，无法设置事件监听');
      return;
    }
    
    // 检查TencentCloudChat对象和EVENT是否可用
    if (!wx.TencentCloudChat || !wx.TencentCloudChat.EVENT) {
      console.error('❌ TencentCloudChat.EVENT不存在，无法设置事件监听');
      console.log('TencentCloudChat对象:', !!wx.TencentCloudChat);
      console.log('EVENT对象:', wx.TencentCloudChat ? !!wx.TencentCloudChat.EVENT : false);
      return;
    }
    
    console.log('🎧 开始设置IM事件监听...');
    console.log('可用的EVENT常量:', Object.keys(wx.TencentCloudChat.EVENT));
    
    try {
      // 验证事件名称是否存在
      const validateEventName = (eventName) => {
        if (!wx.TencentCloudChat.EVENT[eventName]) {
          console.warn(`⚠️ 事件 ${eventName} 不存在于EVENT常量中`);
          return false;
        }
        return true;
      };
      
      // 监听SDK_READY事件
      if (validateEventName('SDK_READY')) {
        wx.$TUIKit.on(wx.TencentCloudChat.EVENT.SDK_READY, (event) => {
          console.log('🎉 IM SDK准备就绪 (SDK_READY事件)');
          console.log('SDK_READY事件数据:', event);
          
          // 更新登录状态为完全ready
          this.isLoggedIn = true;
          console.log('✅ 更新isLoggedIn状态为true');
          
          // 通知所有监听器
          this._notifyListeners('SDK_READY', event);
        });
        console.log('✅ 已设置SDK_READY事件监听');
      }
      
      // 监听新消息
      if (validateEventName('MESSAGE_RECEIVED')) {
        wx.$TUIKit.on(wx.TencentCloudChat.EVENT.MESSAGE_RECEIVED, (event) => {
          console.log('📨 收到新消息:', event);
          this._notifyListeners('MESSAGE_RECEIVED', event);
        });
        console.log('✅ 已设置MESSAGE_RECEIVED事件监听');
      }
      
      // 监听会话列表更新
      if (validateEventName('CONVERSATION_LIST_UPDATED')) {
        wx.$TUIKit.on(wx.TencentCloudChat.EVENT.CONVERSATION_LIST_UPDATED, (event) => {
          console.log('📋 会话列表更新:', event);
          this._notifyListeners('CONVERSATION_LIST_UPDATED', event);
        });
        console.log('✅ 已设置CONVERSATION_LIST_UPDATED事件监听');
      }
      
      // 监听好友申请列表更新
      if (validateEventName('FRIEND_APPLICATION_LIST_UPDATED')) {
        wx.$TUIKit.on(wx.TencentCloudChat.EVENT.FRIEND_APPLICATION_LIST_UPDATED, (event) => {
          console.log('👥 好友申请列表更新:', event);
          this._notifyListeners('FRIEND_APPLICATION_LIST_UPDATED', event);
        });
        console.log('✅ 已设置FRIEND_APPLICATION_LIST_UPDATED事件监听');
      }
      
      // 监听SDK_NOT_READY事件 - 确认存在
      if (validateEventName('SDK_NOT_READY')) {
        wx.$TUIKit.on(wx.TencentCloudChat.EVENT.SDK_NOT_READY, (event) => {
          console.log('⚠️ IM SDK未准备就绪:', event);
          this._notifyListeners('SDK_NOT_READY', event);
        });
        console.log('✅ 已设置SDK_NOT_READY事件监听');
      }
      
      // 监听KICKED_OUT事件 - 确认存在
      if (validateEventName('KICKED_OUT')) {
        wx.$TUIKit.on(wx.TencentCloudChat.EVENT.KICKED_OUT, (event) => {
          console.log('🚫 被踢出登录:', event);
          this._notifyListeners('KICKED_OUT', event);
        });
        console.log('✅ 已设置KICKED_OUT事件监听');
      }
      
      console.log('🎉 所有IM事件监听器设置完成');
      
    } catch (error) {
      console.error('❌ 设置IM事件监听失败:', error);
      console.error('错误详情:', error.message, error.stack);
      
      // 尝试输出更多调试信息
      if (wx.TencentCloudChat) {
        console.log('TencentCloudChat可用方法:', Object.getOwnPropertyNames(wx.TencentCloudChat));
        if (wx.TencentCloudChat.EVENT) {
          console.log('EVENT常量内容:', wx.TencentCloudChat.EVENT);
        }
      }
    }
  }
}

// 创建单例实例
const imManager = new IMManager();

// 导出管理器
export default imManager;