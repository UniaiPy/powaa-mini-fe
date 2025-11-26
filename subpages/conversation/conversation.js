// subpages/conversation/conversation.js
// 导入IM管理器
import imManager from '../../utils/imManager.js';
// 导入时间格式化工具
import { formatTime, shouldShowTimeSeparator, getCurrentTimestamp } from '../../utils/timeFormat.js';

Page({

  /**
   * 页面的初始数据
   */
  data: {
    // 聊天消息数据
    messages: [],
    // 输入框内容
    inputValue: '',
    // 是否显示更多选项菜单
    showMoreOptions: false,
    // 是否显示功能菜单
    showFunctionMenu: false,
    // 是否显示AI分身菜单
    showAiMenu: false,
    // 是否显示表情选择器
    showEmojiPicker: false,
    // AI分身是否在线
    aiOnline: true,
    aiStatus: 'online',
    // 当前聊天对象信息
    chatInfo: {
      name: 'AI助手',
      avatar: '/images/ai.png'
    },
    // 语音录制状态
    isRecording: false,
    // 是否为语音模式
    isVoiceMode: false,
    // 会话ID
    conversationID: '',
    // 加载状态
    loading: false,
    // 错误信息
    error: null,
    // 表情列表
    emojiList: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤏', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🙏', '🤝', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄'],
    // 消息操作菜单相关
    showMessageMenu: false,
    selectedMessage: null,
    menuPosition: { left: 0, top: 0 },
    // 下拉刷新状态
    refreshing: false,
    // 分页相关字段
    nextReqMessageID: '',
    isCompleted: false,
    // 调试模式标志
    isDebugMode: true,
    // 用户是否已被屏蔽
    isUserBlocked: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('会话页面加载，参数:', options);
    let app = getApp();
    console.log('全局数据:', app.globalData);
    try {
      // 从URL参数中获取聊天对象信息
      let userInfo = null;
      if (options.user) {
        userInfo = JSON.parse(decodeURIComponent(options.user));
      } else if (options.conversationID) {
        // 如果有会话ID，设置会话ID
        this.setData({
          conversationID: options.conversationID
        });
        // 从会话ID中解析用户信息
        const userID = this.extractUserIDFromConversationID(options.conversationID);
        if (userID) {
          userInfo = {
            id: userID,
            name: userID, // 先用userID作为临时名称，后面会获取真实昵称
            avatar: '/images/ai.png'
          };
          
          // 尝试获取用户昵称
          this.getUserProfile(userID);
        }
      } else {
        // 如果没有任何参数，创建一个默认的AI助手聊天
        console.log('没有传入参数，创建默认AI助手聊天');
        userInfo = {
          id: 'ai_assistant',
          name: 'AI助手',
          avatar: '/images/ai.png'
        };
      }
      
      if (userInfo && userInfo.name) {
        wx.setNavigationBarTitle({
          title: userInfo.name,
        });
        
        this.setData({
          chatInfo: {
            name: userInfo.name || 'AI助手',
            avatar: userInfo.avatar || '/images/ai.png',
            id: userInfo.id || userInfo.name
          }
        });
      }
      
      // 初始化IM并加载历史消息
      this.initializeIMAndLoadMessages();
      
      // 设置消息接收监听器
      this.setupMessageListener();
      
      // 检查用户是否已被屏蔽
      if (this.data.chatInfo && this.data.chatInfo.id) {
        this.checkUserBlockedStatus();
      }
      
    } catch (error) {
      console.error('页面加载失败:', error);
      this.setData({
        error: '页面加载失败，请重试',
        loading: false
      });
    }
  },

  /**
   * 设置消息接收监听器
   */
  setupMessageListener() {
    // 监听接收新消息
    wx.$TUIKit.on(wx.TencentCloudChat.EVENT.MESSAGE_RECEIVED, this.onMessageReceived, this);
    
    // 监听消息变更
    wx.$TUIKit.on(wx.TencentCloudChat.EVENT.MESSAGE_MODIFIED, this.onMessageModified, this);
    
    // 监听消息撤回
    wx.$TUIKit.on(wx.TencentCloudChat.EVENT.MESSAGE_REVOKED, this.onMessageRevoked, this);
  },

  /**
   * 获取自己的头像URL
   */
  getOwnAvatarUrl() {
    const app = getApp();
    const userInfo = app.globalData.userInfo;
    
    // 如果全局数据中有avatar_url，直接使用
    if (userInfo && userInfo.avatar_url) {
      return userInfo.avatar_url;
    }
    
    // 否则使用默认头像
    return '/images/ai.png';
  },

  /**
   * 接收到新消息的处理函数
   */
  onMessageReceived(event) {
    const messageList = event.data;
    console.log('接收到新消息:', messageList);
    
    messageList.forEach((message) => {
      // 只处理当前会话的消息
      if (this.data.conversationID && message.conversationID === this.data.conversationID) {
        let avatarUrl;
        
        if (message.flow === 'out') {
          // 自己的消息使用个人信息中的头像
          avatarUrl = this.getOwnAvatarUrl();
        } else {
          // 对方的消息，处理头像URL
          avatarUrl = this.processAvatarUrl(message.avatar, message.from);
        }
        
        // 获取消息的详细信息
        const messageInfo = this.getMessageDetails(message);
        
        // 判断是否应该显示时间分隔符
        const lastMessage = this.data.messages.length > 0 ? 
          this.data.messages[this.data.messages.length - 1] : null;
        const showTimeSeparator = !lastMessage || 
          this.shouldShowMessageTime(message.time, lastMessage.timeRaw);
        
        const newMessage = {
          id: message.ID,
          type: message.flow === 'out' ? 'user' : 'other',
          content: messageInfo.content,
          messageType: messageInfo.messageType,
          time: this.formatMessageTime(message.time),
          timeRaw: message.time, // 保存原始时间戳
          showTimeSeparator: showTimeSeparator, // 是否显示时间分隔符
          avatar: avatarUrl,
          messageObj: message,
          // 图片相关字段
          imageUrl: messageInfo.imageUrl,
          // 文件相关字段
          fileName: messageInfo.fileName,
          fileSize: messageInfo.fileSize,
          fileUrl: messageInfo.fileUrl,
          fileTypeInfo: messageInfo.fileTypeInfo, // 添加文件类型信息
          // 位置相关字段
          location: messageInfo.location,
          // 语音相关字段
          duration: messageInfo.duration,
          audioUrl: messageInfo.audioUrl,
          // 视频相关字段
          videoUrl: messageInfo.videoUrl,
          // 表情相关字段
          faceData: messageInfo.faceData,
          // 撤回状态
          isRevoked: messageInfo.isRevoked
        };
        
        const updatedMessages = [...this.data.messages, newMessage];
        this.setData({
          messages: updatedMessages
        });
        
        // 滚动到底部
        setTimeout(() => {
          this.scrollToBottom();
        }, 100);
      }
    });
  },

  /**
   * 消息变更处理函数
   */
  onMessageModified(event) {
    const message = event.data;
    console.log('消息变更:', message);
    
    // 获取消息的详细信息
    const messageInfo = this.getMessageDetails(message);
    
    // 更新本地消息列表
    const updatedMessages = this.data.messages.map(msg => 
      msg.id === message.ID ? { 
        ...msg, 
        content: messageInfo.content,
        messageType: messageInfo.messageType,
        messageObj: message,
        // 图片相关字段
        imageUrl: messageInfo.imageUrl,
        // 文件相关字段
        fileName: messageInfo.fileName,
        fileSize: messageInfo.fileSize,
        fileUrl: messageInfo.fileUrl,
        fileTypeInfo: messageInfo.fileTypeInfo, // 添加文件类型信息
        // 位置相关字段
        location: messageInfo.location,
        // 语音相关字段
        duration: messageInfo.duration,
        audioUrl: messageInfo.audioUrl,
        // 视频相关字段
        videoUrl: messageInfo.videoUrl,
        // 表情相关字段
        faceData: messageInfo.faceData,
        // 撤回状态
        isRevoked: messageInfo.isRevoked
      } : msg
    );
    
    this.setData({
      messages: updatedMessages
    });
  },

  /**
   * 消息撤回处理函数
   */
  onMessageRevoked(event) {
    const message = event.data;
    console.log('消息撤回:', message);
    
    // 更新本地消息列表
    const updatedMessages = this.data.messages.map(msg => 
      msg.id === message.ID ? { 
        ...msg, 
        content: '消息已撤回',
        isRevoked: true,
        messageObj: message 
      } : msg
    );
    
    this.setData({
      messages: updatedMessages
    });
  },

  /**
   * 从会话ID中提取用户ID
   */
  extractUserIDFromConversationID(conversationID) {
    if (conversationID.startsWith('C2C')) {
      return conversationID.substring(3); // 移除 'C2C' 前缀
    }
    return null;
  },

  /**
   * 初始化IM并加载历史消息
   */
  async initializeIMAndLoadMessages() {
    try {
      this.setData({ loading: true, error: null });
      
      // 检查IM状态
      const status = imManager.checkIMStatus();
      
      if (!status.isLoggedIn) {
        // 尝试从存储中获取登录信息
        const userID = wx.getStorageSync('userID');
        const userSig = wx.getStorageSync('userSig');
        const SDKAppID = wx.getStorageSync('SDKAppID');
        
        if (userID && userSig && SDKAppID) {
          console.log('发现存储的登录信息，尝试重新登录');
          await imManager.initialize(userID, userSig, SDKAppID);
        } else {
          throw new Error('IM未登录，请先登录');
        }
      }
      
      // 如果没有会话ID，创建一个新会话
      if (!this.data.conversationID && this.data.chatInfo && this.data.chatInfo.id) {
        console.log('没有会话ID，创建新会话:', this.data.chatInfo.id);
        this.setData({
          conversationID: `C2C${this.data.chatInfo.id}`
        });
      }
      
      // 加载历史消息
      await this.loadHistoryMessages();
      
    } catch (error) {
      console.error('初始化IM失败:', error);
      this.setData({
        error: error.message || 'IM初始化失败',
        loading: false
      });
    }
  },

  /**
   * 加载历史消息
   */
  async loadHistoryMessages() {
    try {
      console.log('开始加载历史消息...');
      
      if (!this.data.conversationID) {
        console.log('没有会话ID，跳过历史消息加载');
        this.setData({ loading: false });
        return;
      }

      // 获取会话资料
      const conversationProfile = await wx.$TUIKit.getConversationProfile(this.data.conversationID);
      console.log('会话资料:', conversationProfile);

      // 获取历史消息列表
      const messageListOptions = {
        conversationID: this.data.conversationID,
        count: 20, // 每次加载20条消息
        nextReqMessageID: this.data.nextReqMessageID || ''
      };

      const messageListRes = await wx.$TUIKit.getMessageList(messageListOptions);
      console.log('历史消息列表:', messageListRes);

      const { code, data } = messageListRes;
      
      if (code === 0 && data) {
        const { messageList, nextReqMessageID, isCompleted } = data;
        // 格式化消息 - 检查TUIKit返回的消息顺序
        const formattedMessages = this.formatMessages(messageList);
        
        // 更新数据
        this.setData({
          messages: formattedMessages,
          nextReqMessageID: nextReqMessageID || '',
          isCompleted: isCompleted || false,
          conversationProfile: conversationProfile.data.conversation,
          loading: false
        });

        console.log(`加载了 ${formattedMessages.length} 条历史消息`);
        console.log('是否还有更多消息:', !isCompleted);
        
        // 滚动到底部（显示最新消息）
        setTimeout(() => {
          this.scrollToBottom();
        }, 100);
      } else {
        console.error('获取历史消息失败:', code);
        this.setData({
          error: '获取历史消息失败',
          loading: false
        });
      }
      
    } catch (error) {
      console.error('加载历史消息失败:', error);
      // 如果是会话不存在的错误，这是正常的（新会话）
      if (error.message && error.message.includes('not exist')) {
        console.log('新会话，没有历史消息');
        this.setData({
          messages: [],
          loading: false
        });
        return;
      }
      
      this.setData({
        error: '加载历史消息失败',
        loading: false
      });
      wx.showToast({
        title: '加载历史消息失败',
        icon: 'error'
      });
    }
  },

  /**
   * 下拉刷新处理
   */
  async onPullDownRefresh() {
    console.log('=== 下拉刷新触发 ===');
    console.log('当前刷新状态:', this.data.refreshing);
    console.log('是否已完成加载:', this.data.isCompleted);
    console.log('会话ID:', this.data.conversationID);
    console.log('nextReqMessageID:', this.data.nextReqMessageID);
    
    try {
      // 设置刷新状态 - 这里会触发 refresher 动画
      this.setData({
        refreshing: true
      });
      
      // 加载更多历史消息
      await this.loadMoreMessages();
      
    } catch (error) {
      console.error('下拉刷新失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    } finally {
      // 结束刷新状态 - 停止 refresher 动画
      console.log('下拉刷新结束，设置refreshing为false');
      this.setData({
        refreshing: false
      });
    }
  },

  /**
   * 下拉刷新完成回调
   */
  onPullDownRefreshComplete() {
    console.log('下拉刷新完成');
    this.setData({
      refreshing: false
    });
  },

  /**
   * 加载更多历史消息
   */
  async loadMoreMessages() {
    console.log('=== 开始加载更多历史消息 ===');
    console.log('isCompleted:', this.data.isCompleted);
    console.log('conversationID:', this.data.conversationID);
    console.log('nextReqMessageID:', this.data.nextReqMessageID);
    
    try {
      if (this.data.isCompleted || !this.data.conversationID) {
        console.log('没有更多消息或没有会话ID，停止加载');
        return;
      }

      wx.showLoading({
        title: '加载更多...'
      });

      const messageListOptions = {
        conversationID: this.data.conversationID,
        count: 20,
        nextReqMessageID: this.data.nextReqMessageID
      };

      console.log('请求参数:', messageListOptions);
      const messageListRes = await wx.$TUIKit.getMessageList(messageListOptions);
      console.log('更多历史消息响应:', messageListRes);

      const { code, data } = messageListRes;
      
      if (code === 0 && data) {
        const { messageList, nextReqMessageID, isCompleted } = data;
        
        console.log('获取到消息数量:', messageList?.length || 0);
        console.log('新的nextReqMessageID:', nextReqMessageID);
        console.log('是否加载完成:', isCompleted);
        
        // 格式化新消息 - 检查TUIKit返回的消息顺序
        const formattedMessages = this.formatMessages(messageList);
        
        // 将新加载的历史消息添加到现有消息列表前面
        const updatedMessages = [...formattedMessages, ...this.data.messages];
        
        this.setData({
          messages: updatedMessages,
          nextReqMessageID: nextReqMessageID || '',
          isCompleted: isCompleted || false
        });

        console.log(`加载了更多 ${formattedMessages.length} 条消息，当前总消息数: ${updatedMessages.length}`);
        
        if (isCompleted) {
          console.log('已加载全部历史消息');
        }
      } else {
        console.error('获取历史消息失败:', code, data);
        wx.showToast({
          title: '加载失败',
          icon: 'error'
        });
      }
      
    } catch (error) {
      console.error('加载更多消息失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 格式化消息数据
   */
  formatMessages(messageList) {
    if (!messageList || !Array.isArray(messageList)) {
      return [];
    }
    
    const formattedMessages = messageList.map((message, index) => {
      const isFromMe = message.flow === 'out';
      let avatarUrl;
      
      if (isFromMe) {
        // 自己的消息使用个人信息中的头像
        avatarUrl = this.getOwnAvatarUrl();
      } else {
        // 对方的消息，处理头像URL
        avatarUrl = this.processAvatarUrl(message.avatar, message.from);
      }
      
      // 获取消息的详细信息
      const messageInfo = this.getMessageDetails(message);
      
      // 判断是否应该显示时间分隔符
      let showTimeSeparator = false;
      if (index === 0) {
        // 第一条消息总是显示时间
        showTimeSeparator = true;
      } else {
        // 检查与前一条消息的时间间隔
        const previousMessage = messageList[index - 1];
        // 使用原始时间戳进行间隔判断
        showTimeSeparator = this.shouldShowMessageTime(message.time, previousMessage.time);
      }
      
      return {
        id: message.ID || message.sequence || Date.now() + Math.random(),
        type: isFromMe ? 'user' : 'other',
        content: messageInfo.content,
        messageType: messageInfo.messageType,
        time: this.formatMessageTime(message.time),
        timeRaw: message.time, // 保存原始时间戳用于间隔判断
        showTimeSeparator: showTimeSeparator, // 是否显示时间分隔符
        avatar: avatarUrl,
        messageObj: message, // 保存原始消息对象
        // 图片相关字段
        imageUrl: messageInfo.imageUrl,
        // 文件相关字段
        fileName: messageInfo.fileName,
        fileSize: messageInfo.fileSize,
        fileUrl: messageInfo.fileUrl,
        fileTypeInfo: messageInfo.fileTypeInfo, // 添加文件类型信息
        // 位置相关字段
        location: messageInfo.location,
        // 语音相关字段
        duration: messageInfo.duration,
        audioUrl: messageInfo.audioUrl,
        // 视频相关字段
        videoUrl: messageInfo.videoUrl,
        // 表情相关字段
        faceData: messageInfo.faceData,
        // 撤回状态
        isRevoked: messageInfo.isRevoked
      };
    });
    
    return formattedMessages;
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
      isRevoked: false
    };

    switch (message.type) {
      case wx.TencentCloudChat.TYPES.MSG_TEXT:
        messageInfo.content = message.payload.text || '';
        messageInfo.messageType = 'text';
        break;
        
      case wx.TencentCloudChat.TYPES.MSG_IMAGE:
        messageInfo.content = '[图片]';
        messageInfo.messageType = 'image';
        // 获取图片URL，优先使用原图，其次使用大图
        messageInfo.imageUrl = message.payload.imageInfoArray?.[0]?.url || 
                               message.payload.url || 
                               message.payload.imageUrl || '';
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
        // 修复文件URL获取逻辑，优先使用url字段
        messageInfo.fileUrl = message.payload.url || message.payload.fileUrl || '';
        // 添加调试日志
        // console.log('文件消息详情:', {
        //   fileName: messageInfo.fileName,
        //   fileUrl: messageInfo.fileUrl,
        //   fileTypeInfo: messageInfo.fileTypeInfo,
        //   payload: message.payload
        // });
        // 添加文件类型信息
        messageInfo.fileTypeInfo = this.getFileTypeInfo(messageInfo.fileName);
        break;
        
      case wx.TencentCloudChat.TYPES.MSG_FACE:
        messageInfo.content = '[表情]';
        messageInfo.messageType = 'face';
        messageInfo.faceData = message.payload.data || '';
        break;
        
      case wx.TencentCloudChat.TYPES.MSG_LOCATION:
        messageInfo.content = '[位置]';
        messageInfo.messageType = 'location';
        messageInfo.location = {
          latitude: message.payload.latitude,
          longitude: message.payload.longitude,
          address: message.payload.description || ''
        };
        break;
        
      case wx.TencentCloudChat.TYPES.MSG_CUSTOM:
        messageInfo.content = '[自定义消息]';
        messageInfo.messageType = 'custom';
        // 可以根据自定义消息的具体内容进一步处理
        try {
          const customData = JSON.parse(message.payload.data || '{}');
          if (customData.businessID === 'user_defined_status') {
            messageInfo.content = customData.description || '[自定义消息]';
          }
        } catch (e) {
          console.log('解析自定义消息失败:', e);
        }
        break;
        
      case wx.TencentCloudChat.TYPES.MSG_MERGER:
        messageInfo.content = '[合并消息]';
        messageInfo.messageType = 'system';
        break;
        
      case wx.TencentCloudChat.TYPES.MSG_GRP_TIP:
        messageInfo.content = '[群提示消息]';
        messageInfo.messageType = 'system';
        break;
        
      case wx.TencentCloudChat.TYPES.MSG_GRP_SYS_NOTICE:
        messageInfo.content = '[群系统通知]';
        messageInfo.messageType = 'system';
        break;
        
      default:
        messageInfo.content = '[未知消息类型]';
        messageInfo.messageType = 'text';
    }

    // 检查消息是否被撤回
    if (message.status === wx.TencentCloudChat.TYPES.MSG_STATUS_REVOKED) {
      messageInfo.content = '消息已撤回';
      messageInfo.isRevoked = true;
    }

    return messageInfo;
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

  /**
   * 获取消息内容
   */
  getMessageContent(message) {
    switch (message.type) {
      case wx.TencentCloudChat.TYPES.MSG_TEXT:
        return message.payload.text;
      case wx.TencentCloudChat.TYPES.MSG_IMAGE:
        return '[图片]';
      case wx.TencentCloudChat.TYPES.MSG_AUDIO:
        return '[语音]';
      case wx.TencentCloudChat.TYPES.MSG_VIDEO:
        return '[视频]';
      case wx.TencentCloudChat.TYPES.MSG_FILE:
        return '[文件]';
      case wx.TencentCloudChat.TYPES.MSG_FACE:
        return '[表情]';
      case wx.TencentCloudChat.TYPES.MSG_LOCATION:
        return '[位置]';
      case wx.TencentCloudChat.TYPES.MSG_CUSTOM:
        return '[自定义消息]';
      case wx.TencentCloudChat.TYPES.MSG_MERGER:
        return '[合并消息]';
      case wx.TencentCloudChat.TYPES.MSG_GRP_TIP:
        return '[群提示消息]';
      case wx.TencentCloudChat.TYPES.MSG_GRP_SYS_NOTICE:
        return '[群系统通知]';
      default:
        return '[未知消息类型]';
    }
  },

  /**
   * 格式化消息时间 - 使用微信风格格式化
   */
  formatMessageTime(timestamp) {
    return formatTime(timestamp);
  },

  /**
   * 判断是否应该显示时间分隔符
   */
  shouldShowMessageTime(currentTimestamp, previousTimestamp) {
    return shouldShowTimeSeparator(currentTimestamp, previousTimestamp);
  },

  /**
   * 获取当前时间戳
   */
  getCurrentTime() {
    return getCurrentTimestamp();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {
    // 页面渲染完成后，滚动到底部
    this.scrollToBottom()
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 页面显示时，滚动到底部
    this.scrollToBottom();
    
    // 获取当前用户信息
    this.fetchCurrentUserInfo();
  },

  /**
   * 获取当前用户信息
   */
  async fetchCurrentUserInfo() {
    const app = getApp();
    
    // 检查token是否存在
    if (!app.globalData.token) {
      console.error('token不存在，无法获取用户信息');
      return;
    }
    
    try {
      // 使用全局request方法发送请求
      const result = await new Promise((resolve, reject) => {
        app.request({
          url: '/api/users/',
          method: 'GET',
          success: (res) => {
            resolve(res);
          },
          fail: (error) => {
            reject(error);
          }
        });
      });
      
      // 根据后端返回格式判断成功与否
      if (result.code === 0 && result.data) {
        const userInfo = result.data;
        console.log('获取到当前用户信息:', userInfo);
        
        // 更新全局用户信息
        app.globalData.userInfo = {
          ...app.globalData.userInfo,
          id: userInfo.id,
          nickname: userInfo.nickname,
          avatar_url: userInfo.avatar_url,
          phone: userInfo.phone,
          ai_status: userInfo.ai_status,
          ai_online: userInfo.ai_online
        };
        this.setData({
          aiOnline: userInfo.ai_online,
          aiStatus: userInfo.ai_status,
        })
        
        // 更新页面中的头像信息，确保消息显示正确的头像
        this.setData({
          chatInfo: {
            ...this.data.chatInfo,
            // 这里不更新chatInfo，因为chatInfo是聊天对象的信息
            // 但是可以确保getOwnAvatarUrl方法能获取到最新的头像
          }
        });
        
        console.log('用户信息更新成功:', app.globalData.userInfo);
      } else {
        const errorMessage = result.message || result.error || '未知错误';
        console.error('获取用户信息失败:', errorMessage);
      }
    } catch (error) {
      console.error('获取用户信息请求失败:', error);
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {
    // 隐藏所有菜单
    this.hideAllMenus()
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    // 清理监听器
    wx.$TUIKit.off(wx.TencentCloudChat.EVENT.MESSAGE_RECEIVED, this.onMessageReceived, this);
    wx.$TUIKit.off(wx.TencentCloudChat.EVENT.MESSAGE_MODIFIED, this.onMessageModified, this);
    wx.$TUIKit.off(wx.TencentCloudChat.EVENT.MESSAGE_REVOKED, this.onMessageRevoked, this);
  },

  /**
   * 隐藏所有菜单
   */
  hideAllMenus() {
    this.setData({
      showMoreOptions: false,
      showFunctionMenu: false,
      showAiMenu: false,
      showEmojiPicker: false,
      showMessageMenu: false
    })
  },

  /**
   * 滚动到底部
   */
  scrollToBottom() {
    setTimeout(() => {
      // 使用scroll-into-view方式滚动到最后一条消息
      const messages = this.data.messages;
      if (messages && messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        this.setData({
          scrollIntoView: `message-${lastMessage.id}`
        });
        
        // 清空scrollIntoView，避免影响后续滚动
        setTimeout(() => {
          this.setData({
            scrollIntoView: ''
          });
        }, 300);
      }
    }, 100)
  },

  /**
   * 输入框内容变化
   */
  onInput(e) {
    this.setData({
      inputValue: e.detail.value
    })
  },

  /**
   * 发送消息
   */
  async sendMessage() {
    const inputValue = this.data.inputValue.trim();
    const conversationID = this.data.conversationID;
    
    if (!inputValue) {
      wx.showToast({
        title: '请输入消息内容',
        icon: 'none'
      });
      return;
    }
    
    // 检查是否只包含表情
    const emojiOnly = this.isEmojiOnly(inputValue);
    
    // 添加消息到本地列表（乐观更新）
    const currentTime = this.getCurrentTime();
    
    // 判断是否应该显示时间分隔符
    const lastMessage = this.data.messages.length > 0 ? 
      this.data.messages[this.data.messages.length - 1] : null;
    const showTimeSeparator = !lastMessage || 
      this.shouldShowMessageTime(currentTime, lastMessage.timeRaw);
    
    const newMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: emojiOnly ? '[表情]' : inputValue,
      messageType: emojiOnly ? 'face' : 'text', // 根据内容设置消息类型
      time: this.formatMessageTime(currentTime),
      timeRaw: currentTime, // 保存原始时间戳
      showTimeSeparator: showTimeSeparator, // 是否显示时间分隔符
      avatar: this.getOwnAvatarUrl(),
      sendFailed: false,
      faceData: emojiOnly ? inputValue : undefined // 如果是表情，保存表情数据
    };
    
    const updatedMessages = [...this.data.messages, newMessage];
    this.setData({
      messages: updatedMessages,
      inputValue: ''
    });
    
    // 滚动到底部
    setTimeout(() => {
      this.scrollToBottom();
    }, 100);

    try {
      // 发送IM消息
      let message = null;
      let targetUserID = this.extractUserIDFromConversationID(conversationID);
      
      // 如果没有从会话ID中提取到用户ID，使用chatInfo中的信息
      if (!targetUserID) {
        targetUserID = this.data.chatInfo.id || this.data.chatInfo.name;
      }
      
      // 如果还是没有targetUserID，创建一个默认的
      if (!targetUserID) {
        targetUserID = 'default_user';
      }
      
      console.log('发送消息到用户:', targetUserID, '类型:', emojiOnly ? '表情' : '文本');
      
      // 检查好友关系状态（调试用）
      try {
        const friendList = await wx.$TUIKit.getFriendList();
        const isFriend = friendList.data.some(friend => friend.userID === targetUserID);
        console.log('目标用户好友状态:', isFriend, '好友列表:', friendList.data.map(f => f.userID));
      } catch (friendError) {
        console.log('检查好友关系失败:', friendError);
      }
      
      if (emojiOnly) {
        // 创建表情消息
        message = wx.$TUIKit.createFaceMessage({
          to: targetUserID,
          conversationType: wx.TencentCloudChat.TYPES.CONV_C2C,
          payload: {
            index: 1, // 使用默认表情索引
            data: inputValue // 表情数据
          }
        });
      } else {
        // 创建文本消息
        message = wx.$TUIKit.createTextMessage({
          to: targetUserID,
          conversationType: wx.TencentCloudChat.TYPES.CONV_C2C,
          payload: {
            text: inputValue
          }
        });
      }
      
      // 发送消息
      const sendPromise = wx.$TUIKit.sendMessage(message);
      const imResponse = await sendPromise;
      console.log('消息发送成功:', imResponse);
      
      // 如果没有会话ID，设置会话ID
      if (!conversationID && imResponse.data.conversationID) {
        this.setData({
          conversationID: imResponse.data.conversationID
        });
      }
      
      // 更新本地消息的ID为实际消息ID
      const updatedMessagesWithID = this.data.messages.map(msg => 
        msg.id === newMessage.id ? { ...msg, id: message.ID, messageObj: message } : msg
      );
      
      this.setData({
        messages: updatedMessagesWithID
      });

    } catch (error) {
      console.error('发送消息失败:', error);
      
      // 检查是否是好友关系错误
      if (error.code === 20011) {
        console.log('好友关系检查失败，尝试添加好友');
        
        // 显示提示对话框
        wx.showModal({
          title: '无法发送消息',
          content: '您需要先添加对方为好友才能发送消息，是否现在添加好友？',
          confirmText: '添加好友',
          cancelText: '取消',
          success: async (res) => {
            if (res.confirm) {
              try {
                await this.addFriend(targetUserID);
                // 添加好友成功后重新发送消息
                await this.retrySendMessage(message);
              } catch (addError) {
                console.error('添加好友失败:', addError);
                wx.showToast({
                  title: '添加好友失败',
                  icon: 'none'
                });
              }
            } else {
              // 用户取消，更新消息状态为发送失败
              const failedMessages = this.data.messages.map(msg => 
                msg.id === newMessage.id ? { ...msg, sendFailed: true } : msg
              );
              this.setData({
                messages: failedMessages
              });
            }
          }
        });
      } else {
        // 其他类型的错误
        const failedMessages = this.data.messages.map(msg => 
          msg.id === newMessage.id ? { ...msg, sendFailed: true } : msg
        );
        
        this.setData({
          messages: failedMessages
        });
        
        wx.showToast({
          title: '发送失败',
          icon: 'error'
        });
      }
    }
  },

  /**
   * 重试发送消息
   */
  async retrySendMessage(message) {
    try {
      console.log('重试发送消息:', message);
      
      // 重新发送消息
      const imResponse = await wx.$TUIKit.sendMessage(message);
      console.log('重试发送成功:', imResponse);
      
      wx.showToast({
        title: '消息发送成功',
        icon: 'success'
      });
      
    } catch (error) {
      console.error('重试发送失败:', error);
      wx.showToast({
        title: '发送失败',
        icon: 'error'
      });
    }
  },

  /**
   * 添加好友
   */
  async addFriend(userID) {
    try {
      console.log('添加好友:', userID);
      
      const addFriendRes = await wx.$TUIKit.addFriend({
        to: userID,
        source: 'AddSource_Type_Android',
        remark: this.data.chatInfo.name || '好友'
      });
      
      console.log('添加好友结果:', addFriendRes);
      
      if (addFriendRes.code === 0) {
        wx.showToast({
          title: '好友申请已发送',
          icon: 'success'
        });
      } else {
        throw new Error(addFriendRes.message || '添加好友失败');
      }
      
    } catch (error) {
      console.error('添加好友失败:', error);
      throw error;
    }
  },

  /**
   * 获取当前时间
   */
  getCurrentTime() {
    const date = new Date()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  },

  /**
   * 修改消息
   */
  async modifyMessage(message) {
    try {
      if (!message || !message.ID) {
        console.error('无效的消息对象');
        return;
      }

      // 弹出输入框让用户输入新的消息内容
      const { content } = await this.showEditDialog('修改消息', '请输入新的消息内容:', message.payload.text || '');
      
      if (!content || content.trim() === '') {
        console.log('用户取消修改或内容为空');
        return;
      }

      // 修改消息
      const modifyRes = await wx.$TUIKit.modifyMessage({
        messageID: message.ID,
        payload: {
          text: content.trim()
        }
      });

      console.log('消息修改结果:', modifyRes);

      if (modifyRes.code === 0) {
        // 更新本地消息列表中的消息
        const updatedMessages = this.data.messages.map(msg => {
          if (msg.messageObj && msg.messageObj.ID === message.ID) {
            return {
              ...msg,
              content: content.trim(),
              messageObj: modifyRes.data.message
            };
          }
          return msg;
        });

        this.setData({
          messages: updatedMessages
        });

        wx.showToast({
          title: '消息已修改',
          icon: 'success'
        });
      } else {
        throw new Error(modifyRes.message || '修改失败');
      }

    } catch (error) {
      console.error('修改消息失败:', error);
      wx.showToast({
        title: '修改消息失败',
        icon: 'error'
      });
    }
  },

  /**
   * 撤回消息
   */
  async revokeMessage(message) {
    try {
      if (!message || !message.ID) {
        console.error('无效的消息对象');
        return;
      }

      const confirmRes = await this.showConfirmDialog('撤回消息', '确定要撤回这条消息吗？');
      
      if (!confirmRes) {
        console.log('用户取消撤回');
        return;
      }

      // 撤回消息
      const revokeRes = await wx.$TUIKit.revokeMessage({
        messageID: message.ID
      });

      console.log('消息撤回结果:', revokeRes);

      if (revokeRes.code === 0) {
        // 更新本地消息列表中的消息状态
        const updatedMessages = this.data.messages.map(msg => {
          if (msg.messageObj && msg.messageObj.ID === message.ID) {
            return {
              ...msg,
              content: '[消息已撤回]',
              messageObj: revokeRes.data.message,
              isRevoked: true
            };
          }
          return msg;
        });

        this.setData({
          messages: updatedMessages
        });

        wx.showToast({
          title: '消息已撤回',
          icon: 'success'
        });
      } else {
        throw new Error(revokeRes.message || '撤回失败');
      }

    } catch (error) {
      console.error('撤回消息失败:', error);
      wx.showToast({
        title: '撤回消息失败',
        icon: 'error'
      });
    }
  },

  /**
   * 删除消息
   */
  async deleteMessage(message) {
    console.log('删除消息:', message);
    try {
      if (!message || !message.ID) {
        console.error('无效的消息对象');
        return;
      }

      const confirmRes = await this.showConfirmDialog('删除消息', '确定要删除这条消息吗？删除后无法恢复。');
      
      if (!confirmRes) {
        console.log('用户取消删除');
        return;
      }

      // 删除消息
      const deleteRes = await wx.$TUIKit.deleteMessage({
        messageID: message.ID
      });

      console.log('消息删除结果:', deleteRes);

      if (deleteRes.code === 0) {
        // 从本地消息列表中移除消息
        const updatedMessages = this.data.messages.filter(msg => 
          !(msg.messageObj && msg.messageObj.ID === message.ID)
        );

        this.setData({
          messages: updatedMessages
        });

        wx.showToast({
          title: '消息已删除',
          icon: 'success'
        });
      } else {
        throw new Error(deleteRes.message || '删除失败');
      }

    } catch (error) {
      console.error('删除消息失败:', error);
      wx.showToast({
        title: '删除消息失败',
        icon: 'error'
      });
    }
  },

  /**
   * 显示编辑对话框
   */
  showEditDialog(title, placeholder, defaultValue) {
    return new Promise((resolve) => {
      wx.showModal({
        title: title,
        editable: true,
        placeholderText: placeholder,
        content: defaultValue,
        success: (res) => {
          if (res.confirm) {
            resolve({ content: res.content });
          } else {
            resolve(null);
          }
        }
      });
    });
  },

  /**
   * 显示确认对话框
   */
  showConfirmDialog(title, content) {
    return new Promise((resolve) => {
      wx.showModal({
        title: title,
        content: content,
        success: (res) => {
          resolve(res.confirm);
        }
      });
    });
  },

  /**
   * 切换更多选项菜单
   */
  toggleMoreOptions() {
    this.setData({
      showMoreOptions: !this.data.showMoreOptions,
      showFunctionMenu: false,
      showAiMenu: false
    })
  },

  /**
   * 切换功能菜单
   */
  showPlusMenu() {
    this.setData({
      showFunctionMenu: !this.data.showFunctionMenu,
      showMoreOptions: false,
      showAiMenu: false
    })
  },

  /**
   * 切换AI分身菜单
   */
  toggleAiMenu() {
    this.setData({
      showAiMenu: !this.data.showAiMenu,
      showMoreOptions: false,
      showFunctionMenu: false
    })
  },

  /**
   * 切换AI分身状态
   */
  async toggleAiOnline(e) {
    const isOn = !this.data.aiOnline;
    console.log('切换AI状态:', isOn);
    
    // 先更新UI状态（乐观更新）
    this.setData({
      aiOnline: isOn,
      aiStatus: isOn ? 'online' : 'offline'
    });

    try {
      // 调用后端接口更新设置
      const app = getApp();
      const result = await new Promise((resolve, reject) => {
        app.request({
          url: '/api/users/settings',
          method: 'PUT',
          data: {
            auto_reply_enabled: isOn
          },
          success: (res) => {
            resolve(res);
          },
          fail: (error) => {
            reject(error);
          }
        });
      });

      // 检查后端响应
      if (result.message === '用户设置更新成功') {
        console.log('AI状态更新成功:', isOn ? '上线' : '下线');
        
        // 更新全局用户信息
        if (app.globalData.userInfo) {
          app.globalData.userInfo.ai_online = isOn;
          app.globalData.userInfo.ai_status = isOn ? 'online' : 'offline';
        }
        
        // 显示成功提示
        wx.showToast({
          title: isOn ? 'AI已上线' : 'AI已下线',
          icon: 'success',
          duration: 1500
        });
      } else {
        throw new Error(result.error || result.message || '更新失败');
      }
    } catch (error) {
      console.error('更新AI状态失败:', error);
      
      // 回滚UI状态
      this.setData({
        aiOnline: !isOn,
        aiStatus: !isOn ? 'online' : 'offline'
      });
      
      // 显示错误提示
      wx.showToast({
        title: '状态更新失败',
        icon: 'error',
        duration: 2000
      });
    }
  },

  /**
   * 点击AI分身按钮
   */
  onAiButtonClick() {
    // 如果AI在线，发送AI建议消息
    if (this.data.aiOnline) {
      const { messages } = this.data
      const aiSuggestion = {
        id: Date.now(),
        type: 'other',
        content: '根据我们的对话，我有一个建议...',
        time: this.getCurrentTime(),
        avatar: '/images/ai.png'
      }

      this.setData({
        messages: [...messages, aiSuggestion]
      })

      this.scrollToBottom()
    } else {
      // AI不在线时显示菜单
      this.toggleAiMenu()
    }
  },

  /**
   * 切换语音输入模式
   */
  toggleVoiceMode() {
    this.setData({
      isVoiceMode: !this.data.isVoiceMode
    })
  },

  /**
   * 开始录音
   */
  startRecording() {
    this.setData({ isRecording: true })
    // 这里应该调用录音API，暂时用模拟
    console.log('开始录音')
  },

  /**
   * 结束录音
   */
  stopRecording() {
    this.setData({ isRecording: false })
    // 这里应该停止录音并处理音频文件，暂时用模拟
    console.log('停止录音')
    // 模拟发送语音消息
    this.sendVoiceMessage()
  },

  /**
   * 发送语音消息
   */
  sendVoiceMessage() {
    const { messages } = this.data
    // 模拟语音消息
    const voiceMessage = {
      id: Date.now(),
      type: 'user',
      content: '[语音消息]',
      time: this.getCurrentTime(),
      avatar: this.getOwnAvatarUrl(),
      isVoice: true
    }

    this.setData({
      messages: [...messages, voiceMessage]
    })

    this.scrollToBottom()
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack()
  },
  /**
   * 点击功能项
   */
  onFunctionItemClick(e) {
    const functionType = e.currentTarget.dataset.type;
    console.log('=== 点击功能项 ===');
    console.log('功能类型:', functionType);
    console.log('事件对象:', e);
    console.log('当前时间:', new Date().toISOString());
    
    // 根据不同功能类型执行不同操作
    switch (functionType) {
      case 'image':
        console.log('调用选择图片');
        this.selectImage()
        break;
      case 'file':
        console.log('调用选择文件');
        this.selectFile()
        break;
      case 'location':
        console.log('调用选择位置');
        console.log('当前页面数据:', this.data);
        console.log('showFunctionMenu状态:', this.data.showFunctionMenu);
        this.selectLocation()
        break;
      case 'emoji':
        console.log('调用选择表情');
        this.selectEmoji()
        break;
    }

    // 关闭菜单
    this.setData({
      showFunctionMenu: false
    });
  },
  /**
   * 选择图片
   */
  async selectImage() {
    try {
      // 检查权限
      const authSetting = await wx.getSetting();
      console.log('当前权限设置:', authSetting.authSetting);
      
      const res = await wx.chooseImage({
        count: 9,
        sizeType: ['original', 'compressed'],
        sourceType: ['album', 'camera']
      });
      
      console.log('选择的图片:', res.tempFilePaths);
      
      // 逐个发送图片
      for (const tempFilePath of res.tempFilePaths) {
        await this.sendImageMessage(tempFilePath);
      }
      
      this.hideAllMenus();
    } catch (error) {
      console.error('选择图片失败:', error);
      
      // 根据错误类型给出不同提示
      let errorMessage = '选择图片失败';
      if (error.errMsg && error.errMsg.includes('auth deny')) {
        errorMessage = '请允许访问相册或相机';
      } else if (error.errMsg && error.errMsg.includes('cancel')) {
        console.log('用户取消选择图片');
        return; // 用户取消，不显示错误提示
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'error'
      });
    }
  },

  /**
   * 发送图片消息
   */
  async sendImageMessage(filePath) {
    try {
      const targetUserID = this.extractUserIDFromConversationID(this.data.conversationID) || this.data.chatInfo.id || this.data.chatInfo.name;
      
      console.log('准备发送图片消息:', { targetUserID, filePath });
      
      // 检查IM状态
      if (!wx.$TUIKit) {
        throw new Error('IM未初始化');
      }
      
      // 检查文件是否存在
      if (!filePath) {
        throw new Error('图片文件路径无效');
      }
      
      // 创建图片消息 - 使用与TUIKit兼容的格式
      let message;
      try {
        // 构造与TUIKit兼容的文件对象
        const fileObject = {
          type: 'image',
          tempFiles: [{
            tempFilePath: filePath
          }]
        };
        
        console.log('构造的文件对象:', fileObject);
        
        // 使用TUIKit兼容的格式创建图片消息
        message = wx.$TUIKit.createImageMessage({
          to: targetUserID,
          conversationType: wx.TencentCloudChat.TYPES.CONV_C2C,
          payload: {
            file: fileObject
          },
          onProgress: (event) => {
            console.log('图片上传进度:', event);
          }
        });
      } catch (error1) {
        console.warn('TUIKit格式创建图片消息失败，尝试直接文件路径:', error1);
        try {
          // 方法2：直接使用文件路径
          message = wx.$TUIKit.createImageMessage({
            to: targetUserID,
            conversationType: wx.TencentCloudChat.TYPES.CONV_C2C,
            payload: {
              file: filePath
            },
            onProgress: (event) => {
              console.log('图片上传进度:', event);
            }
          });
        } catch (error2) {
          console.warn('直接文件路径创建图片消息失败，尝试对象格式:', error2);
          try {
            // 方法3：使用文件对象格式
            message = wx.$TUIKit.createImageMessage({
              to: targetUserID,
              conversationType: wx.TencentCloudChat.TYPES.CONV_C2C,
              payload: {
                file: {
                  url: filePath,
                  name: `image_${Date.now()}.jpg`
                }
              },
              onProgress: (event) => {
                console.log('图片上传进度:', event);
              }
            });
          } catch (error3) {
            console.warn('对象格式创建图片消息失败，尝试完整格式:', error3);
            // 方法4：使用完整的文件信息
            const fileName = filePath.split('/').pop() || `image_${Date.now()}.jpg`;
            message = wx.$TUIKit.createImageMessage({
              to: targetUserID,
              conversationType: wx.TencentCloudChat.TYPES.CONV_C2C,
              payload: {
                file: {
                  name: fileName,
                  type: 'jpg',
                  url: filePath,
                  size: 0
                }
              },
              onProgress: (event) => {
                console.log('图片上传进度:', event);
              }
            });
          }
        }
      }
      
      console.log('图片消息创建成功:', message);
      
      // 发送消息
      const imResponse = await wx.$TUIKit.sendMessage(message);
      console.log('图片消息发送成功:', imResponse);
      
      // 如果没有会话ID，设置会话ID
      if (!this.data.conversationID && imResponse.data.conversationID) {
        this.setData({
          conversationID: imResponse.data.conversationID
        });
      }
      
      // 添加到本地消息列表
      const newMessage = {
        id: message.ID,
        type: 'user',
        content: '[图片]',
        time: this.getCurrentTime(),
        avatar: this.getOwnAvatarUrl(),
        messageObj: message,
        messageType: 'image',
        imageUrl: filePath
      };
      
      const updatedMessages = [...this.data.messages, newMessage];
      this.setData({
        messages: updatedMessages
      });
      
      this.scrollToBottom();
      
    } catch (error) {
      console.error('发送图片消息失败:', error);
      
      // 提供更详细的错误信息
      let errorMessage = '发送图片失败';
      if (error.message) {
        if (error.message.includes('network')) {
          errorMessage = '网络错误，请检查网络连接';
        } else if (error.message.includes('file')) {
          errorMessage = '图片文件格式不支持';
        } else if (error.message.includes('size')) {
          errorMessage = '图片文件过大';
        } else if (error.message.includes('20011')) {
          errorMessage = '需要先添加好友';
        } else if (error.message.includes('undefined')) {
          errorMessage = '图片文件无效';
        }
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'error'
      });
    }
  },

  /**
   * 选择文件
   */
  async selectFile() {
    try {
      // 检查IM状态
      if (!wx.$TUIKit) {
        console.error('TUIKit未初始化');
        wx.showToast({
          title: 'IM未初始化，请稍后重试',
          icon: 'error'
        });
        return;
      }
      
      // 检查IM登录状态 - 使用imManager的状态检查
      const imStatus = imManager.checkIMStatus();
      console.log('当前IM状态:', imStatus);
      
      if (!imStatus.isLoggedIn) {
        console.error('IM未登录');
        wx.showToast({
          title: 'IM未登录，请稍后重试',
          icon: 'error'
        });
        return;
      }
      
      // 使用腾讯官方推荐的方式选择文件
      const res = await wx.chooseMessageFile({
        count: 1,
        type: 'all' // 支持所有文件类型，与官方示例一致
      });
      await this.sendFileMessage(res);
      this.hideAllMenus();
    } catch (error) {
      console.error('选择文件失败:', error);
      
      // 根据错误类型给出不同提示
      let errorMessage = '选择文件失败';
      if (error.errMsg && error.errMsg.includes('auth deny')) {
        errorMessage = '请允许访问文件';
      } else if (error.errMsg && error.errMsg.includes('cancel')) {
        console.log('用户取消选择文件');
        return; // 用户取消，不显示错误提示
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'error'
      });
    }
  },

  /**
   * 发送文件消息
   */
  async sendFileMessage(file) {
    try {
      const targetUserID = this.extractUserIDFromConversationID(this.data.conversationID) || this.data.chatInfo.id || this.data.chatInfo.name;
      console.log('准备发送文件消息:', { targetUserID, file: file.name, size: file.size, path: file.path });
      // 检查IM状态
      if (!wx.$TUIKit) {
        throw new Error('IM未初始化');
      }
      
      // 检查文件大小并显示友好的提示
      const maxSize = 100 * 1024 * 1024; // 100MB
      if (file.size > maxSize) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(0);
        wx.showModal({
          title: '文件过大',
          content: `文件大小为 ${sizeMB}MB，超过了 ${maxSizeMB}MB 的限制，请选择较小的文件。`,
          showCancel: false,
          confirmText: '知道了'
        });
        return;
      }
      
      // 检查登录状态
      const imStatus = imManager.checkIMStatus();
      if (!imStatus.isLoggedIn) {
        throw new Error('IM未登录，当前状态: ' + JSON.stringify(imStatus));
      }
      
      // 创建文件消息 - 使用正确的文件格式
      const message = wx.$TUIKit.createFileMessage({ 
        to: targetUserID, 
        conversationType: wx.TencentCloudChat.TYPES.CONV_C2C, 
        payload: { file: file }, // 使用包装后的微信格式文件对象
        onProgress: (event) => {
          const percent = Math.round((event.loaded / event.total) * 100);
          console.log(`文件上传进度: ${percent}%`);
        } 
      });
      
      console.log('文件消息创建成功:', message);
      
      // 发送消息
      const imResponse = await wx.$TUIKit.sendMessage(message);
      console.log('文件消息发送成功:', imResponse);
      
      // 如果没有会话ID，设置会话ID
      if (!this.data.conversationID && imResponse.data.conversationID) {
        this.setData({
          conversationID: imResponse.data.conversationID
        });
      }
      
      // 添加到本地消息列表
      const newMessage = {
        id: message.ID,
        type: 'user',
        content: '[文件]',
        time: this.getCurrentTime(),
        avatar: this.getOwnAvatarUrl(),
        messageObj: message,
        messageType: 'file',
        fileName: file.tempFiles[0].name,
        fileSize: this.formatFileSize(file.tempFiles[0].size),
        fileUrl: imResponse.data.message.payload.url, // 修复文件URL获取
        fileTypeInfo: this.getFileTypeInfo(file.tempFiles[0].name) // 添加文件类型信息
      };
      
      // 添加调试日志
      console.log('新文件消息创建:', {
        fileName: newMessage.fileName,
        fileUrl: newMessage.fileUrl,
        fileTypeInfo: newMessage.fileTypeInfo,
        imResponse: imResponse.data,
        messagePayload: message.payload
      });
      
      const updatedMessages = [...this.data.messages, newMessage];
      this.setData({
        messages: updatedMessages
      });
      
      this.scrollToBottom();
      
    } catch (error) {
      console.error('发送文件消息失败:', error);
      
      // 提供更友好的错误处理
      let errorMessage = '发送文件失败，请重试';
      let showDetail = false;
      
      if (error.message) {
        if (error.message.includes('network')) {
          errorMessage = '网络连接失败，请检查网络后重试';
        } else if (error.message.includes('20011')) {
          errorMessage = '需要先添加对方为好友才能发送文件';
        } else if (error.message.includes('2400')) {
          errorMessage = '文件上传失败，可能是文件格式不支持或网络问题';
          showDetail = true;
        } else if (error.message.includes('未初始化') || error.message.includes('未登录')) {
          errorMessage = 'IM服务未就绪，请稍后重试';
        }
      }
      
      if (showDetail) {
        wx.showModal({
          title: '文件发送失败',
          content: `${errorMessage}\n\n详细信息：${error.message}`,
          showCancel: false,
          confirmText: '知道了'
        });
      } else {
        wx.showToast({
          title: errorMessage,
          icon: 'error',
          duration: 3000
        });
      }
    }
  },

  /**
   * 预览文件
   */
  async previewFile(e) {
    try {
      const message = e.currentTarget.dataset.message;
      console.log('message', message);
      if (!message) {
        console.error('未获取到消息数据');
        wx.showToast({
          title: '文件信息获取失败',
          icon: 'error'
        });
        return;
      }
      
      const { fileName, fileUrl } = message;
      
      if (!fileUrl) {
        console.error('文件URL为空:', message);
        wx.showToast({
          title: '文件链接无效',
          icon: 'error'
        });
        return;
      }
      
      console.log('准备预览文件:', { fileName, fileUrl });
      
      // 显示加载提示
      wx.showLoading({
        title: '正在打开文件...',
        mask: true
      });
      
      // 检查文件类型，决定如何处理
      const fileExtension = this.getFileExtension(fileName);
      const isImageFile = this.isImageFile(fileExtension);
      const isTextFile = this.isTextFile(fileExtension);
      
      if (isImageFile) {
        // 图片文件直接预览
        wx.hideLoading();
        wx.previewImage({
          urls: [fileUrl],
          current: fileUrl,
          fail: (error) => {
            console.error('图片预览失败:', error);
            wx.showToast({
              title: '图片预览失败',
              icon: 'error'
            });
          }
        });
      } else if (isTextFile) {
        // 文本文件下载后查看内容
        try {
          const downloadResult = await wx.downloadFile({
            url: fileUrl,
            success: (res) => {
              if (res.statusCode === 200) {
                // 读取文件内容
                wx.getFileSystemManager().readFile({
                  filePath: res.tempFilePath,
                  encoding: 'utf8',
                  success: (readResult) => {
                    wx.hideLoading();
                    // 显示文本内容
                    wx.showModal({
                      title: fileName,
                      content: readResult.data.length > 500 ? 
                        readResult.data.substring(0, 500) + '...' : 
                        readResult.data,
                      showCancel: true,
                      cancelText: '关闭',
                      confirmText: readResult.data.length > 500 ? '查看全部' : '确定',
                      success: (modalRes) => {
                        if (modalRes.confirm && readResult.data.length > 500) {
                          // 如果内容很长，可以尝试用其他方式显示
                          this.showLongTextContent(fileName, readResult.data);
                        }
                      }
                    });
                  },
                  fail: (readError) => {
                    wx.hideLoading();
                    console.error('读取文件失败:', readError);
                    wx.showToast({
                      title: '文件读取失败',
                      icon: 'error'
                    });
                  }
                });
              } else {
                wx.hideLoading();
                wx.showToast({
                  title: '文件下载失败',
                  icon: 'error'
                });
              }
            },
            fail: (error) => {
              wx.hideLoading();
              console.error('文件下载失败:', error);
              wx.showToast({
                title: '文件下载失败',
                icon: 'error'
              });
            }
          });
        } catch (downloadError) {
          wx.hideLoading();
          console.error('下载文件异常:', downloadError);
          wx.showToast({
            title: '文件下载异常',
            icon: 'error'
          });
        }
      } else {
        // 其他类型文件尝试用系统程序打开
        try {
          const downloadResult = await wx.downloadFile({
            url: fileUrl,
            success: (res) => {
              wx.hideLoading();
              if (res.statusCode === 200) {
                // 使用系统程序打开文件
                wx.openDocument({
                  filePath: res.tempFilePath,
                  showMenu: true,
                  success: () => {
                    console.log('文件打开成功');
                  },
                  fail: (error) => {
                    console.error('文件打开失败:', error);
                    wx.showModal({
                      title: '无法打开文件',
                      content: `文件 "${fileName}" 无法在当前环境中打开，请尝试在其他应用中打开。`,
                      showCancel: false,
                      confirmText: '知道了'
                    });
                  }
                });
              } else {
                wx.showToast({
                  title: '文件下载失败',
                  icon: 'error'
                });
              }
            },
            fail: (error) => {
              wx.hideLoading();
              console.error('文件下载失败:', error);
              wx.showToast({
                title: '文件下载失败',
                icon: 'error'
              });
            }
          });
        } catch (error) {
          wx.hideLoading();
          console.error('处理文件异常:', error);
          wx.showToast({
            title: '文件处理异常',
            icon: 'error'
          });
        }
      }
      
    } catch (error) {
      wx.hideLoading();
      console.error('预览文件失败:', error);
      wx.showToast({
        title: '预览文件失败',
        icon: 'error'
      });
    }
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
   * 获取文件扩展名
   */
  getFileExtension(fileName) {
    if (!fileName) return '';
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex > -1 ? fileName.substring(lastDotIndex + 1).toLowerCase() : '';
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
   * 显示长文本内容（可以扩展为专门的页面）
   */
  showLongTextContent(fileName, content) {
    // 这里可以实现一个专门的文本查看页面，或者简化处理
    wx.showModal({
      title: fileName,
      content: '文件内容较长，建议在电脑上查看完整内容。',
      showCancel: false,
      confirmText: '知道了'
    });
  },

  /**
   * 选择位置
   */
  async selectLocation() {
    console.log('=== 开始选择位置 ===');
    console.log('当前页面实例:', this);
    console.log('当前时间:', new Date().toISOString());
    
    try {
      console.log('检查位置权限...');
      // 检查位置权限
      const authSetting = await wx.getSetting();
      console.log('当前权限设置:', authSetting.authSetting);
      
      // 如果没有位置权限，先请求权限
      if (!authSetting.authSetting['scope.userLocation']) {
        try {
          await wx.authorize({
            scope: 'scope.userLocation'
          });
          console.log('位置权限授权成功');
        } catch (authError) {
          console.log('位置权限授权失败，引导用户手动开启');
          wx.showModal({
            title: '位置权限',
            content: '需要位置权限来发送位置信息，请在设置中开启',
            confirmText: '去设置',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting();
              }
            }
          });
          return;
        }
      }
      
      console.log('开始调用 wx.chooseLocation');
      const res = await wx.chooseLocation({
        latitude: 0,
        longitude: 0
      });
      console.log('wx.chooseLocation 返回结果:', res);
      
      // 检查用户是否取消了选择位置
      if (!res) {
        console.log('用户取消选择位置');
        
        // 显示确认框，询问是否重新选择
        wx.showModal({
          title: '提示',
          content: '已取消选择位置，是否重新选择？',
          confirmText: '重新选择',
          cancelText: '取消',
          success: (modalRes) => {
            if (modalRes.confirm) {
              // 用户点击重新选择，再次调用选择位置
              this.selectLocation();
            }
          }
        });
        return;
      }
      
      // 验证选择的位置数据
      if (typeof res.latitude !== 'number' || typeof res.longitude !== 'number') {
        throw new Error('位置信息不完整，缺少经纬度');
      }
      
      await this.sendLocationMessage(res);
      this.hideAllMenus();
      
    } catch (error) {
      console.error('选择位置失败:', error);
      
      // 根据错误类型给出不同提示
      let errorMessage = '选择位置失败';
      if (error.errMsg && error.errMsg.includes('auth deny')) {
        errorMessage = '请允许访问位置信息';
      } else if (error.errMsg && error.errMsg.includes('cancel')) {
        console.log('用户取消选择位置');
        return; // 用户取消，不显示错误提示
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'error'
      });
    }
  },

  /**
   * 发送位置消息
   */
  async sendLocationMessage(location) {
    try {
      // 验证位置参数
      if (!location) {
        throw new Error('位置信息为空');
      }
      
      if (typeof location.latitude !== 'number' || typeof location.longitude !== 'number') {
        throw new Error('位置信息缺少经纬度数据');
      }
      
      const targetUserID = this.extractUserIDFromConversationID(this.data.conversationID) || this.data.chatInfo.id || this.data.chatInfo.name;
      
      console.log('准备发送位置消息:', { targetUserID, location });
      
      // 检查IM状态
      if (!wx.$TUIKit) {
        throw new Error('IM未初始化');
      }
      
      // 创建位置消息
      const message = wx.$TUIKit.createLocationMessage({
        to: targetUserID,
        conversationType: wx.TencentCloudChat.TYPES.CONV_C2C,
        payload: {
          latitude: location.latitude,
          longitude: location.longitude,
          description: location.address || location.name || '未知位置'
        }
      });
      
      console.log('位置消息创建成功:', message);
      
      // 发送消息
      const imResponse = await wx.$TUIKit.sendMessage(message);
      console.log('位置消息发送成功:', imResponse);
      
      // 如果没有会话ID，设置会话ID
      if (!this.data.conversationID && imResponse.data.conversationID) {
        this.setData({
          conversationID: imResponse.data.conversationID
        });
      }
      
      // 添加到本地消息列表
      const newMessage = {
        id: message.ID,
        type: 'user',
        content: '[位置]',
        time: this.getCurrentTime(),
        avatar: this.getOwnAvatarUrl(),
        messageObj: message,
        messageType: 'location',
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address || location.name || '未知位置'
        }
      };
      
      const updatedMessages = [...this.data.messages, newMessage];
      this.setData({
        messages: updatedMessages
      });
      
      this.scrollToBottom();
      
    } catch (error) {
      console.error('发送位置消息失败:', error);
      
      // 提供更详细的错误信息
      let errorMessage = '发送位置失败';
      if (error.message) {
        if (error.message.includes('network')) {
          errorMessage = '网络错误，请检查网络连接';
        } else if (error.message.includes('位置信息为空') || error.message.includes('位置信息不完整') || error.message.includes('位置信息缺少经纬度')) {
          errorMessage = '位置信息获取失败，请重新选择';
        } else if (error.message.includes('20011')) {
          errorMessage = '需要先添加好友';
        }
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'error'
      });
    }
  },

  /**
   * 选择表情
   */
  selectEmoji() {
    // 先隐藏其他菜单，但不隐藏表情选择器
    this.setData({
      showMoreOptions: false,
      showFunctionMenu: false,
      showAiMenu: false,
      showMessageMenu: false
    });
    
    // 然后显示表情选择器
    this.setData({
      showEmojiPicker: true
    });
  },

  /**
   * 选择表情添加到输入框
   */
  onEmojiSelect(e) {
    try {
      const emoji = e.currentTarget.dataset.emoji;
      
      // 将表情添加到输入框
      const currentValue = this.data.inputValue || '';
      const newValue = currentValue + emoji;
      
      this.setData({
        inputValue: newValue
      });
      
      // 保持表情选择器打开，让用户可以继续添加表情
      // 不关闭表情选择器
      
      // 让输入框重新获得焦点
      setTimeout(() => {
        // 获取输入框实例并设置焦点
        const inputComponent = this.selectComponent('#messageInput');
        if (inputComponent) {
          inputComponent.focus();
        }
      }, 100);
      
    } catch (error) {
      console.error('添加表情失败:', error);
      wx.showToast({
        title: '添加表情失败',
        icon: 'error'
      });
    }
  },

  /**
   * 发送表情消息
   */
  async sendFaceMessage(emoji) {
    try {
      const targetUserID = this.extractUserIDFromConversationID(this.data.conversationID) || this.data.chatInfo.id || this.data.chatInfo.name;
      
      console.log('准备发送表情消息:', { targetUserID, emoji });
      
      // 检查IM状态
      if (!wx.$TUIKit) {
        throw new Error('IM未初始化');
      }
      
      // 创建表情消息
      const message = wx.$TUIKit.createFaceMessage({
        to: targetUserID,
        conversationType: wx.TencentCloudChat.TYPES.CONV_C2C,
        payload: {
          index: emoji.index || 1, // 表情索引
          data: emoji.data || emoji // 表情数据
        }
      });
      
      console.log('表情消息创建成功:', message);
      
      // 发送消息
      const imResponse = await wx.$TUIKit.sendMessage(message);
      console.log('表情消息发送成功:', imResponse);
      
      // 如果没有会话ID，设置会话ID
      if (!this.data.conversationID && imResponse.data.conversationID) {
        this.setData({
          conversationID: imResponse.data.conversationID
        });
      }
      
      // 添加到本地消息列表
      const newMessage = {
        id: message.ID,
        type: 'user',
        content: '[表情]',
        time: this.getCurrentTime(),
        avatar: this.getOwnAvatarUrl(),
        messageObj: message,
        messageType: 'face',
        faceData: emoji.data || emoji
      };
      
      const updatedMessages = [...this.data.messages, newMessage];
      this.setData({
        messages: updatedMessages
      });
      
      this.scrollToBottom();
      
    } catch (error) {
      console.error('发送表情消息失败:', error);
      
      // 提供更详细的错误信息
      let errorMessage = '发送表情失败';
      if (error.message) {
        if (error.message.includes('network')) {
          errorMessage = '网络错误，请检查网络连接';
        } else if (error.message.includes('face')) {
          errorMessage = '表情格式不支持';
        } else if (error.message.includes('20011')) {
          errorMessage = '需要先添加好友';
        }
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'error'
      });
    }
  },

  /**
   * 检测输入内容是否只包含表情
   */
  isEmojiOnly(text) {
    if (!text || text.trim() === '') {
      return false;
    }
    
    // 移除空格
    const cleanText = text.trim();
    
    // 检查是否只包含表情字符
    // 表情通常在Unicode范围内的特定区间
    const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu;
    
    // 移除所有表情字符后，检查是否还有其他字符
    const textWithoutEmoji = cleanText.replace(emojiRegex, '');
    
    // 如果移除表情后没有其他字符，说明只包含表情
    return textWithoutEmoji.trim() === '' && emojiRegex.test(cleanText);
  },

  /**
   * 阻止默认事件和事件冒泡
   */
  preventDefault() {
    // 空方法，仅用于阻止事件冒泡
  },

  /**
   * 隐藏表情选择器
   */
  hideEmojiPicker() {
    this.setData({
      showEmojiPicker: false
    });
  },

  /**
   * 点击页面空白处，关闭所有菜单
   */
  onPageTap() {
    this.hideAllMenus()
  },

  /**
   * 点击菜单外部，关闭菜单
   */
  onOutsideTap(e) {
    // 检查点击目标是否在菜单外部
    const { target } = e
    if (!target.dataset.menu) {
      this.hideAllMenus()
    }
  },

  /**
   * 导航到预览页面
   */
  navigateToPreview() {
    const { chatInfo } = this.data
    console.log('chatInfo:', chatInfo)
    const userId = chatInfo.id || chatInfo.name
    wx.navigateTo({
      url: `/subpages/preview/preview?type=avatar&userId=${userId}`
    })
  },

  /**
   * 分享名片
   */
  shareCard() {
    wx.navigateTo({
      url: '/subpages/share/share'
    })
  },

  /**
   * 屏蔽用户
   */
  /**
   * 屏蔽用户
   */
  async blockUser() {
    try {
      // 获取目标用户ID
      const targetUserID = this.extractUserIDFromConversationID(this.data.conversationID) || 
                          this.data.chatInfo.id || 
                          this.data.chatInfo.name;
      
      if (!targetUserID) {
        wx.showToast({
          title: '无法获取用户信息',
          icon: 'error'
        });
        this.hideAllMenus();
        return;
      }

      // 显示确认对话框
      wx.showModal({
        title: '确认屏蔽',
        content: `屏蔽后，您将不再收到${this.data.chatInfo.name || targetUserID}的消息，确定要屏蔽吗？`,
        success: async (res) => {
          if (res.confirm) {
            try {
              // 显示加载提示
              wx.showLoading({
                title: '正在屏蔽...'
              });

              // 调用腾讯云IM添加黑名单接口
              const imResponse = await wx.$TUIKit.addToBlacklist({
                userIDList: [targetUserID]
              });

              console.log('添加黑名单成功:', imResponse);

              wx.hideLoading();
              
              // 更新本地状态
              this.setData({
                isUserBlocked: true
              });
              
              // 显示成功提示
              wx.showToast({
                title: '已屏蔽用户',
                icon: 'success'
              });

              // 可选：离开当前聊天页面
              setTimeout(() => {
                wx.navigateBack();
              }, 1500);

            } catch (error) {
              wx.hideLoading();
              console.error('屏蔽用户失败:', error);
              
              // 根据错误码给出具体提示
              let errorMessage = '屏蔽失败，请重试';
              if (error.code) {
                switch (error.code) {
                  case 20007:
                    errorMessage = '无法屏蔽自己';
                    break;
                  case 50001:
                    errorMessage = '参数错误';
                    break;
                  case 70401:
                    errorMessage = '黑名单数量已达上限（1000人）';
                    break;
                  default:
                    errorMessage = `屏蔽失败：${error.message || '未知错误'}`;
                }
              }

              wx.showToast({
                title: errorMessage,
                icon: 'error',
                duration: 3000
              });
            }
          }
        }
      });

    } catch (error) {
      console.error('屏蔽用户过程出错:', error);
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'error'
      });
    }
    
    this.hideAllMenus();
  },

  /**
   * 检查用户屏蔽状态
   */
  async checkUserBlockedStatus() {
    try {
      if (!this.data.chatInfo || !this.data.chatInfo.id) {
        return;
      }

      const targetUserID = this.data.chatInfo.id;
      console.log('检查用户屏蔽状态:', targetUserID);

      // 调用腾讯云IM获取黑名单列表
      const blacklistResponse = await wx.$TUIKit.getBlacklist();
      console.log('获取黑名单列表成功:', blacklistResponse);

      if (blacklistResponse.code === 0 && blacklistResponse.data) {
        // 检查目标用户是否在黑名单中
        const isBlocked = blacklistResponse.data.some(user => user.userID === targetUserID);
        console.log('用户屏蔽状态:', isBlocked);

        this.setData({
          isUserBlocked: isBlocked
        });
      } else {
        console.warn('获取黑名单列表失败:', blacklistResponse);
      }

    } catch (error) {
      console.error('检查用户屏蔽状态失败:', error);
      // 检查失败时保持默认状态（未屏蔽）
    }
  },

  /**
   * 解除屏蔽用户
   */
  async unblockUser() {
    try {
      if (!this.data.chatInfo || !this.data.chatInfo.id) {
        wx.showToast({
          title: '用户信息无效',
          icon: 'error'
        });
        return;
      }

      const targetUserID = this.data.chatInfo.id;
      
      wx.showModal({
        title: '确认解除屏蔽',
        content: `确定要解除对${this.data.chatInfo.name}的屏蔽吗？解除后你们可以正常交流。`,
        success: async (res) => {
          if (res.confirm) {
            try {
              wx.showLoading({
                title: '解除屏蔽中...',
                mask: true
              });

              console.log('开始解除屏蔽用户:', targetUserID);

              // 调用腾讯云IM的移出黑名单接口
              const response = await wx.$TUIKit.removeFromBlacklist({
                userIDList: [targetUserID]
              });

              wx.hideLoading();

              if (response.code === 0) {
                console.log('解除屏蔽成功:', response);
                
                // 更新本地状态
                this.setData({
                  isUserBlocked: false
                });

                wx.showToast({
                  title: '解除屏蔽成功',
                  icon: 'success',
                  duration: 2000
                });

              } else {
                console.error('解除屏蔽失败:', response);
                
                // 根据错误码给出具体提示
                let errorMessage = '解除屏蔽失败，请重试';
                if (response.code) {
                  switch (response.code) {
                    case 50001:
                      errorMessage = '参数错误';
                      break;
                    case 70402:
                      errorMessage = '用户不在黑名单中';
                      break;
                    default:
                      errorMessage = `解除屏蔽失败：${response.message || '未知错误'}`;
                  }
                }

                wx.showToast({
                  title: errorMessage,
                  icon: 'error',
                  duration: 3000
                });
              }

            } catch (error) {
              wx.hideLoading();
              console.error('解除屏蔽用户失败:', error);
              
              wx.showToast({
                title: '操作失败，请重试',
                icon: 'error',
                duration: 3000
              });
            }
          }
        }
      });

    } catch (error) {
      console.error('解除屏蔽过程出错:', error);
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'error'
      });
    }
    
    this.hideAllMenus();
  },

  /**
   * 举报用户
   */
  reportUser() {
    wx.showModal({
      title: '确认举报',
      content: '举报后，我们会尽快处理您的举报信息，感谢您的反馈。',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '举报成功',
            icon: 'success'
          })
        }
      }
    })
    this.hideAllMenus()
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    // 加载更多消息
    console.log('加载更多消息')
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    const { chatInfo } = this.data
    return {
      title: `与${chatInfo.name}的对话`,
      path: `/subpages/conversation/conversation?userName=${encodeURIComponent(chatInfo.name)}`
    }
  },

  /**
   * 导航到用户资料页面
   */
  navigateToUserProfile() {
    console.log('导航到用户资料页面')
    wx.switchTab({
      url: '/pages/profile/profile'
    })
  },

  /**
   * 导航到聊天列表页面
   */
  navigateToChat() {
    wx.navigateTo({
      url: '/pages/chat/chat'
    })
  },

  /**
   * 预览图片
   */
  previewImage(e) {
    const { src } = e.currentTarget.dataset;
    wx.previewImage({
      current: src,
      urls: [src]
    });
  },

  /**
   * 播放语音
   */
  playAudio(e) {
    const { message } = e.currentTarget.dataset;
    wx.showToast({
      title: '语音播放功能开发中',
      icon: 'none'
    });
  },

  /**
   * 复制消息
   */
  copyMessage(e) {
    const { message } = e.currentTarget.dataset;
    if (message.messageType === 'text' || !message.messageType) {
      wx.setClipboardData({
        data: message.content,
        success: () => {
          wx.showToast({
            title: '已复制到剪贴板',
            icon: 'success'
          });
        }
      });
    } else {
      wx.showToast({
        title: '该消息类型不支持复制',
        icon: 'none'
      });
    }
    this.hideAllMenus();
  },

  /**
   * 消息长按处理
   */
  onMessageLongPress(e) {
    const { message } = e.currentTarget.dataset;
    const { x, y } = e.changedTouches[0];
    
    this.setData({
      showMessageMenu: true,
      selectedMessage: message,
      menuPosition: {
        left: x,
        top: y
      }
    });
  },

  /**
   * 输入框获得焦点
   */
  onInputFocus() {
    console.log('输入框获得焦点');
    // 可以在这里添加输入框获得焦点时的逻辑
    // 例如：隐藏表情选择器等
    this.setData({
      showEmojiPicker: false
    });
  },

  /**
   * 输入框失去焦点
   */
  onInputBlur() {
    console.log('输入框失去焦点');
    // 可以在这里添加输入框失去焦点时的逻辑
  },

  /**
   * 获取用户资料
   */
  async getUserProfile(userID) {
    try {
      console.log('获取用户资料:', userID);
      
      if (!wx.$TUIKit) {
        console.error('TUIKit未初始化');
        return;
      }

      // 获取用户资料
      const userProfile = await wx.$TUIKit.getUserProfile({
        userIDList: [userID]
      });

      console.log('用户资料获取结果:', userProfile);

      if (userProfile.code === 0 && userProfile.data && userProfile.data.length > 0) {
        const profile = userProfile.data[0];
        const nickname = profile.nick || profile.userID; // 优先显示昵称，没有则显示userID
        
        // 处理头像URL
        const processedAvatar = this.processAvatarUrl(profile.avatar, userID);
        
        // 更新聊天对象信息
        this.setData({
          chatInfo: {
            ...this.data.chatInfo,
            name: nickname,
            nickname: profile.nick || '',
            avatar: processedAvatar
          }
        });

        // 更新页面标题
        wx.setNavigationBarTitle({
          title: nickname,
        });

        console.log('用户资料更新成功:', nickname);
      } else {
        console.warn('获取用户资料失败:', userProfile);
      }
    } catch (error) {
      console.error('获取用户资料异常:', error);
    }
  },

  /**
   * 处理头像URL，确保在小程序中可以正常显示
   */
  processAvatarUrl: function(avatarUrl, userId) {
    const app = getApp();
    if (!avatarUrl) {
      return '/images/ai.png';
    }
    
    // 如果是其他外部URL，直接返回
    if (avatarUrl.startsWith('http://') || avatarUrl.startsWith('https://')) {
      return avatarUrl;
    }
    
    // 如果是相对路径，需要获取临时URL
    this.getTempAvatarUrl(avatarUrl, userId);
    // 立即返回默认头像，异步获取临时URL后会更新
    return '/images/ai.png';
  },

  /**
   * 获取临时头像URL
   */
  getTempAvatarUrl: function(avatarKey, userId) {
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
          // 更新聊天对象信息中的头像
          this.setData({
            'chatInfo.avatar': res.url
          });
          
          // 同时更新消息列表中的头像
          const updatedMessages = this.data.messages.map(msg => {
            if (msg.type === 'other' && msg.messageObj && msg.messageObj.from === userId) {
              return { ...msg, avatar: res.url };
            }
            return msg;
          });
          
          this.setData({
            messages: updatedMessages
          });
          
        } else {
          console.warn('获取临时头像URL失败:', res.message);
        }
      },
      fail: (error) => {
        console.error('获取临时头像URL请求失败:', error);
      }
    });
  },
})