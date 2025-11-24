// pages/avatar/avatar.js
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
    // 是否显示功能菜单
    showFunctionMenu: false,
    // 是否显示AI分身菜单
    showAIMenu: false,
    // 是否显示模型菜单
    showModelMenu: false,
    // 是否显示表情选择器
    showEmojiPicker: false,
    // AI分身是否在线
    aiOnline: true,
    aiStatus: 'online',
    // 当前选择的模型
    selectedModel: '高级模型',
    // 语音录制状态
    isRecording: false,
    // 是否为语音模式
    isVoiceMode: false,
    // 会话ID（固定为C2CAI分身）
    conversationID: 'C2CAI分身',
    // 加载状态
    loading: false,
    // 错误信息
    error: null,
    // 聊天对象信息
    chatInfo: null,
    // 分页加载相关
    nextReqMessageID: '',
    isCompleted: false,
    conversationProfile: null,
    // 表情列表
    emojiList: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '👇', '☝️', '✋', '🤚', '🖐️', '🖖', '👋', '🤏', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🙏', '🤝', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄'],
    // 消息操作菜单相关
    showMessageMenu: false,
    selectedMessage: null,
    menuPosition: { left: 0, top: 0 },
    // 下拉刷新状态
    refreshing: false,
 },
  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {
    // 页面渲染完成后，滚动到底部
    this.scrollToBottom()
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('AI分身页面加载');
    
    // 初始化聊天数据
    this.initializeChat();
    
    // 设置消息接收监听器
    this.setupMessageListener();
    
    // 获取用户信息
    this.getUserInfo();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    
     // 页面显示时，滚动到底部
    this.scrollToBottom();
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {
    // 隐藏所有菜单
    this.hideAllMenus();
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    // 清理监听器
    if (wx.$TUIKit) {
      // 移除消息接收监听器
      wx.$TUIKit.off(wx.TencentCloudChat.EVENT.MESSAGE_RECEIVED, this.onMessageReceived, this);
      // 移除消息变更监听器
      wx.$TUIKit.off(wx.TencentCloudChat.EVENT.MESSAGE_MODIFIED, this.onMessageModified, this);
      // 移除消息撤回监听器
      wx.$TUIKit.off(wx.TencentCloudChat.EVENT.MESSAGE_REVOKED, this.onMessageRevoked, this);
    }
  },

  /**
   * 初始化聊天
   */
  async initializeChat() {
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
          console.log('IM未登录，仅显示欢迎消息');
        }
      }
      
      // 设置AI分身的聊天信息
      const aiInfo = {
        id: 'ai_assistant',
        name: 'AI分身',
        avatar: '/images/ai.png'
      };
      
      this.setData({
        chatInfo: {
          name: aiInfo.name,
          avatar: aiInfo.avatar,
          id: aiInfo.id
        }
      });
      
      // 设置导航栏标题
      wx.setNavigationBarTitle({
        title: aiInfo.name,
      });
      
      // 尝试加载历史消息
      try {
        await this.loadHistoryMessages();
      } catch (error) {
        console.log('加载历史消息失败，显示默认欢迎消息:', error);
        // 如果加载历史消息失败，显示默认欢迎消息
        const welcomeMessage = {
          id: 'welcome-' + Date.now(),
          type: 'ai',
          content: '你好，我是小瓦，你的AI分身！我会根据你对我的要求、个人信息、行为记录等，为你创造专属的AI分身，代表你对外介绍、沟通。多跟我说一些话吧，我可以更好的代表你！',
          messageType: 'text',
          time: formatTime(getCurrentTimestamp()),
          timeRaw: getCurrentTimestamp(),
          showTimeSeparator: true,
          avatar: '/images/ai.png'
        };

        this.setData({
          messages: [welcomeMessage],
          loading: false
        });
      }
      
    } catch (error) {
      console.error('初始化聊天失败:', error);
      this.setData({
        error: error.message || '初始化聊天失败',
        loading: false
      });
    }
  },

  /**
   * 设置消息接收监听器
   */
  setupMessageListener() {
    if (wx.$TUIKit) {
      // 监听接收新消息
      wx.$TUIKit.on(wx.TencentCloudChat.EVENT.MESSAGE_RECEIVED, this.onMessageReceived, this);
      // 监听消息变更
      wx.$TUIKit.on(wx.TencentCloudChat.EVENT.MESSAGE_MODIFIED, this.onMessageModified, this);
      // 监听消息撤回
      wx.$TUIKit.on(wx.TencentCloudChat.EVENT.MESSAGE_REVOKED, this.onMessageRevoked, this);
    }
  },

  /**
   * 获取用户信息
   */
  async getUserInfo() {
    try {
      const app = getApp();
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
        });
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
    }
  },

  /**
   * 加载历史消息
   */
  async loadHistoryMessages() {
    try {
      console.log('开始加载AI分身历史消息...');
      
      if (!this.data.conversationID) {
        console.log('没有会话ID，跳过历史消息加载');
        this.setData({ loading: false });
        return;
      }

      // 获取会话资料
      const conversationProfile = await wx.$TUIKit.getConversationProfile(this.data.conversationID);
      console.log('AI分身会话资料:', conversationProfile);

      // 获取历史消息列表
      const messageListOptions = {
        conversationID: this.data.conversationID,
        count: 20, // 每次加载20条消息
        nextReqMessageID: this.data.nextReqMessageID || ''
      };

      const messageListRes = await wx.$TUIKit.getMessageList(messageListOptions);
      console.log('AI分身历史消息列表:', messageListRes);

      const { code, data } = messageListRes;
      
      if (code === 0 && data) {
        const { messageList, nextReqMessageID, isCompleted } = data;
        // 格式化消息
        const formattedMessages = this.formatMessages(messageList);
        
        // 更新数据
        this.setData({
          messages: formattedMessages,
          nextReqMessageID: nextReqMessageID || '',
          isCompleted: isCompleted || false,
          conversationProfile: conversationProfile.data.conversation,
          loading: false
        });

        console.log(`加载了 ${formattedMessages.length} 条AI分身历史消息`);
        console.log('是否还有更多消息:', !isCompleted);
        
        // 滚动到底部（显示最新消息）
        setTimeout(() => {
          this.scrollToBottom();
        }, 100);
      } else {
        console.error('获取AI分身历史消息失败:', code);
        this.setData({
          error: '获取历史消息失败',
          loading: false
        });
      }
      
    } catch (error) {
      console.error('加载AI分身历史消息失败:', error);
      // 如果是会话不存在的错误，这是正常的（新会话）
      if (error.message && error.message.includes('not exist')) {
        console.log('新AI分身会话，没有历史消息');
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
        // 自己的消息
        avatarUrl = this.getOwnAvatarUrl();
      } else {
        // AI分身的消息
        avatarUrl = '/images/ai.png';
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
        showTimeSeparator = shouldShowTimeSeparator(message.time, previousMessage.time);
      }
      
      return {
        id: message.ID || message.sequence || Date.now() + Math.random(),
        type: isFromMe ? 'user' : 'ai',
        content: messageInfo.content,
        messageType: messageInfo.messageType,
        time: formatTime(message.time),
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
   * 下拉刷新处理
   */
  async onPullDownRefresh() {
    console.log('AI分身页面下拉刷新，加载更多历史消息');
    
    try {
      // 设置刷新状态
      this.setData({
        refreshing: true
      });
      
      // 加载更多历史消息
      await this.loadMoreMessages();
      
    } catch (error) {
      console.error('AI分身页面下拉刷新失败:', error);
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      });
    } finally {
      // 结束刷新状态
      this.setData({
        refreshing: false
      });
      // 通知微信小程序框架下拉刷新已完成
      wx.stopPullDownRefresh();
    }
  },

  /**
   * 下拉刷新完成回调
   */
  onPullDownRefreshComplete() {
    console.log('AI分身页面下拉刷新完成');
    this.setData({
      refreshing: false
    });
  },

  /**
   * 加载更多历史消息
   */
  async loadMoreMessages() {
    try {
      if (this.data.isCompleted || !this.data.conversationID) {
        console.log('AI分身没有更多消息或没有会话ID');
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

      const messageListRes = await wx.$TUIKit.getMessageList(messageListOptions);
      console.log('AI分身更多历史消息:', messageListRes);

      const { code, data } = messageListRes;
      
      if (code === 0 && data) {
        const { messageList, nextReqMessageID, isCompleted } = data;
        
        // 格式化新消息
        const formattedMessages = this.formatMessages(messageList);
        
        // 将新加载的历史消息添加到现有消息列表前面
        const updatedMessages = [...formattedMessages, ...this.data.messages];
        
        this.setData({
          messages: updatedMessages,
          nextReqMessageID: nextReqMessageID || '',
          isCompleted: isCompleted || false
        });

        console.log(`AI分身加载了更多 ${formattedMessages.length} 条消息`);
      }
      
    } catch (error) {
      console.error('AI分身加载更多消息失败:', error);
    } finally {
      wx.hideLoading();
    }
  },

  /**
   * 接收到新消息的处理函数
   */
  onMessageReceived(event) {
    const messageList = event.data;
    console.log('AI分身页面接收到新消息:', messageList);
    
    messageList.forEach((message) => {
      // 只处理AI分身会话的消息
      if (message.conversationID === this.data.conversationID) {
        let avatarUrl;
        
        if (message.flow === 'out') {
          // 自己的消息
          avatarUrl = this.getOwnAvatarUrl();
        } else {
          // AI分身的消息
          avatarUrl = '/images/ai.png';
        }
        
        // 获取消息的详细信息
        const messageInfo = this.getMessageDetails(message);
        
        // 判断是否应该显示时间分隔符
        const lastMessage = this.data.messages.length > 0 ? 
          this.data.messages[this.data.messages.length - 1] : null;
        const showTimeSeparator = !lastMessage || 
          shouldShowTimeSeparator(message.time, lastMessage.timeRaw);
        
        const newMessage = {
          id: message.ID,
          type: message.flow === 'out' ? 'user' : 'ai',
          content: messageInfo.content,
          messageType: messageInfo.messageType,
          time: formatTime(message.time),
          timeRaw: message.time,
          showTimeSeparator: showTimeSeparator,
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
    
    // 更新本地消息列表
    const messageInfo = this.getMessageDetails(message);
    const updatedMessages = this.data.messages.map(msg => 
      msg.id === message.ID ? { 
        ...msg, 
        content: messageInfo.content,
        messageType: messageInfo.messageType,
        messageObj: message,
        imageUrl: messageInfo.imageUrl,
        fileName: messageInfo.fileName,
        fileSize: messageInfo.fileSize,
        fileUrl: messageInfo.fileUrl,
        fileTypeInfo: messageInfo.fileTypeInfo, // 添加文件类型信息
        location: messageInfo.location,
        duration: messageInfo.duration,
        audioUrl: messageInfo.audioUrl,
        videoUrl: messageInfo.videoUrl,
        faceData: messageInfo.faceData,
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
   * 获取自己的头像URL
   */
  getOwnAvatarUrl() {
    const app = getApp();
    const userInfo = app.globalData.userInfo;
    
    if (userInfo && userInfo.avatar_url) {
      return userInfo.avatar_url;
    }
    
    return '/images/ai.png';
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
        console.log('获取的图片URL:', messageInfo.imageUrl);
        console.log('完整消息对象:', JSON.stringify(messageInfo, null, 2));
        
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
        messageInfo.location = {
          latitude: message.payload.latitude,
          longitude: message.payload.longitude,
          address: message.payload.description || ''
        };
        break;
        
      case wx.TencentCloudChat.TYPES.MSG_CUSTOM:
        messageInfo.content = '[自定义消息]';
        messageInfo.messageType = 'custom';
        try {
          const customData = JSON.parse(message.payload.data || '{}');
          if (customData.businessID === 'user_defined_status') {
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

    // 检查消息是否被撤回
    if (message.status === wx.TencentCloudChat.TYPES.MSG_STATUS_REVOKED) {
      messageInfo.content = '消息已撤回';
      messageInfo.isRevoked = true;
    }

    return messageInfo;
  },

  /**
   * 输入框内容变化事件
   */
  onInput(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },

  /**
   * 发送消息
   */
  async sendMessage() {
    const message = this.data.inputValue.trim();
    if (!message) {
      wx.showToast({
        title: '请输入消息内容',
        icon: 'none'
      });
      return;
    }

    // 清空输入框
    this.setData({
      inputValue: ''
    });
    
    // 获取目标用户ID
    const targetUserID = this.extractUserIDFromConversationID(this.data.conversationID);

    // 乐观更新UI：先添加用户消息到界面
    const userMessage = {
      id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'user',
      content: message,
      messageType: 'text',
      time: formatTime(getCurrentTimestamp()),
      timeRaw: getCurrentTimestamp(),
      showTimeSeparator: shouldShowTimeSeparator(
        getCurrentTimestamp(), 
        this.data.messages.length > 0 ? 
        this.data.messages[this.data.messages.length - 1].timeRaw : 0
      ),
      avatar: this.getOwnAvatarUrl(),
      status: 'sending'
    };

    const updatedMessages = [...this.data.messages, userMessage];
    this.setData({
      messages: updatedMessages
    });

    // 滚动到底部
    setTimeout(() => {
      this.scrollToBottom();
    }, 100);

    try {
      // 使用imManager检查IM状态
      const imStatus = imManager.checkIMStatus();
      if (!imStatus.isLoggedIn) {
        throw new Error('IM未登录，当前状态: ' + JSON.stringify(imStatus));
      }

      // 发送消息到IM
      const messageInstance = wx.$TUIKit.createTextMessage({
        to: targetUserID,
        conversationType: wx.TencentCloudChat.TYPES.CONV_C2C,
        payload: {
          text: message
        }
      });

      const messageResult = await wx.$TUIKit.sendMessage(messageInstance);
      console.log('文本消息发送成功:', messageResult);
      
      // 如果没有会话ID，设置会话ID
      if (!this.data.conversationID && messageResult.data.conversationID) {
        this.setData({
          conversationID: messageResult.data.conversationID
        });
      }
      
      // 更新消息ID和状态
      const finalMessages = this.data.messages.map(msg => 
        msg.id === userMessage.id ? { 
          ...msg, 
          id: messageResult.data.message.ID,
          status: 'sent',
          messageObj: messageResult.data.message
        } : msg
      );

      this.setData({
        messages: finalMessages
      });

    } catch (error) {
      console.error('发送消息失败:', error);
      
      // 更新消息状态为发送失败
      const failedMessages = this.data.messages.map(msg => 
        msg.id.startsWith('temp_') && msg.status === 'sending' ? { 
          ...msg, 
          status: 'failed'
        } : msg
      );

      this.setData({
        messages: failedMessages
      });

      // 提供更详细的错误信息
      let errorMessage = '消息发送失败';
      if (error.message) {
        if (error.message.includes('network')) {
          errorMessage = '网络错误，请检查网络连接';
        } else if (error.message.includes('20011')) {
          errorMessage = '需要先添加好友';
        } else if (error.message.includes('未登录')) {
          errorMessage = 'IM未登录，请重新登录';
        }
      }

      wx.showToast({
        title: errorMessage,
        icon: 'error'
      });
    }
  },

  /**
   * 点击表情项
   */
  onEmojiTap(e) {
    const { emoji } = e.currentTarget.dataset;
    const newValue = this.data.inputValue + emoji;
    this.setData({
      inputValue: newValue
    });
  },

  /**
   * 切换表情选择器显示状态
   */
  toggleEmojiPicker() {
    this.setData({
      showEmojiPicker: !this.data.showEmojiPicker,
      showActionMenu: false
    });
  },

  /**
   * 切换功能菜单显示状态
   */
  toggleActionMenu() {
    this.setData({
      showActionMenu: !this.data.showActionMenu,
      showEmojiPicker: false
    });
  },

  /**
   * 隐藏所有菜单
   */
  hideAllMenus() {
    this.setData({
      showEmojiPicker: false,
      showActionMenu: false
    });
  },

  /**
   * 点击菜单项
   */
  onActionMenuTap(e) {
    const { action } = e.currentTarget.dataset;
    
    switch (action) {
      case 'photo':
        this.chooseImage();
        break;
      case 'camera':
        this.takePhoto();
        break;
      case 'file':
        this.selectFile();
        break;
      case 'location':
        this.chooseLocation();
        break;
      case 'voice':
        this.startRecording();
        break;
      case 'video':
        this.chooseVideo();
        break;
      case 'contact':
        this.shareContact();
        break;
    }
    
    // 隐藏菜单
    this.setData({
      showActionMenu: false
    });
  },

  /**
   * 选择图片
   */
  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths;
        if (tempFilePaths.length > 0) {
          this.sendImageMessage(tempFilePaths[0]);
        }
      },
      fail: (error) => {
        console.error('选择图片失败:', error);
      }
    });
  },

  /**
   * 拍照
   */
  takePhoto() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths;
        if (tempFilePaths.length > 0) {
          this.sendImageMessage(tempFilePaths[0]);
        }
      },
      fail: (error) => {
        console.error('拍照失败:', error);
      }
    });
  },

  /**
   * 发送图片消息
   */
  async sendImageMessage(filePath) {
    try {
      
      const targetUserID = this.extractUserIDFromConversationID(this.data.conversationID);
      
      console.log('准备发送图片消息:', { targetUserID, filePath });
      
      // 使用imManager检查IM状态
      const imStatus = imManager.checkIMStatus();
      if (!imStatus.isLoggedIn) {
        throw new Error('IM未登录，当前状态: ' + JSON.stringify(imStatus));
      }
      
      // 检查文件是否存在
      if (!filePath) {
        throw new Error('图片文件路径无效');
      }
      
      // 创建临时消息
      const tempMessage = {
        id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'user',
        content: '[图片]',
        messageType: 'image',
        time: formatTime(getCurrentTimestamp()),
        timeRaw: getCurrentTimestamp(),
        showTimeSeparator: shouldShowTimeSeparator(
          getCurrentTimestamp(), 
          this.data.messages.length > 0 ? 
          this.data.messages[this.data.messages.length - 1].timeRaw : 0
        ),
        avatar: this.getOwnAvatarUrl(),
        imageUrl: filePath,
        status: 'sending',
        progress: 0
      };

      // 乐观更新UI
      const updatedMessages = [...this.data.messages, tempMessage];
      this.setData({
        messages: updatedMessages
      });

      setTimeout(() => {
        this.scrollToBottom();
      }, 100);

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
            const { loaded, total } = event;
            const progress = Math.round((loaded / total) * 100);
            
            // 更新消息进度
            this.updateMessageProgress(tempMessage.id, progress);
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
              const { loaded, total } = event;
              const progress = Math.round((loaded / total) * 100);
              
              // 更新消息进度
              this.updateMessageProgress(tempMessage.id, progress);
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
                const { loaded, total } = event;
                const progress = Math.round((loaded / total) * 100);
                
                // 更新消息进度
                this.updateMessageProgress(tempMessage.id, progress);
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
                const { loaded, total } = event;
                const progress = Math.round((loaded / total) * 100);
                
                // 更新消息进度
                this.updateMessageProgress(tempMessage.id, progress);
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
      
      // 更新消息状态
      console.log('发送成功的图片消息结构:', JSON.stringify(imResponse.data.message.payload, null, 2));
      
      // 获取发送后的图片URL（与conversation.js保持一致）
      const sentImageUrl = imResponse.data.message.payload.imageInfoArray?.[0]?.url || 
                           imResponse.data.message.payload.url || 
                           imResponse.data.message.payload.imageUrl || '';
      console.log('发送后获取的图片URL:', sentImageUrl);
      
      const finalMessages = this.data.messages.map(msg => 
        msg.id === tempMessage.id ? { 
          ...msg, 
          id: imResponse.data.message.ID,
          status: 'sent',
          messageObj: imResponse.data.message,
          imageUrl: sentImageUrl,
          progress: 100
        } : msg
      );

      this.setData({
        messages: finalMessages
      });

    } catch (error) {
      console.error('发送图片失败:', error);
      
      // 更新消息状态为失败
      const failedMessages = this.data.messages.map(msg => 
        msg.id.startsWith('temp_') && msg.status === 'sending' ? { 
          ...msg, 
          status: 'failed'
        } : msg
      );
      
      this.setData({
        messages: failedMessages
      });
      
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
        time: formatTime(getCurrentTimestamp()),
        timeRaw: getCurrentTimestamp(),
        showTimeSeparator: shouldShowTimeSeparator(
          getCurrentTimestamp(), 
          this.data.messages.length > 0 ? 
          this.data.messages[this.data.messages.length - 1].timeRaw : 0
        ),
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
   * 选择位置
   */
  chooseLocation() {
    wx.chooseLocation({
      success: (res) => {
        this.sendLocationMessage(res);
      },
      fail: (error) => {
        console.error('选择位置失败:', error);
      }
    });
  },

  /**
   * 发送位置消息
   */
  async sendLocationMessage(location) {
    try {
      const targetUserID = this.extractUserIDFromConversationID(this.data.conversationID);
      
      console.log('准备发送位置消息:', { targetUserID, location });
      
      // 使用imManager检查IM状态
      const imStatus = imManager.checkIMStatus();
      if (!imStatus.isLoggedIn) {
        throw new Error('IM未登录，当前状态: ' + JSON.stringify(imStatus));
      }
      
      const messageInstance = wx.$TUIKit.createLocationMessage({
        to: targetUserID,
        conversationType: wx.TencentCloudChat.TYPES.CONV_C2C,
        payload: {
          description: location.address || location.name,
          longitude: location.longitude,
          latitude: location.latitude
        }
      });

      const tempMessage = {
        id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'user',
        content: '[位置]',
        messageType: 'location',
        time: formatTime(getCurrentTimestamp()),
        timeRaw: getCurrentTimestamp(),
        showTimeSeparator: shouldShowTimeSeparator(
          getCurrentTimestamp(), 
          this.data.messages.length > 0 ? 
          this.data.messages[this.data.messages.length - 1].timeRaw : 0
        ),
        avatar: this.getOwnAvatarUrl(),
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address || location.name
        },
        status: 'sending'
      };

      const updatedMessages = [...this.data.messages, tempMessage];
      this.setData({
        messages: updatedMessages
      });

      setTimeout(() => {
        this.scrollToBottom();
      }, 100);

      const messageResult = await wx.$TUIKit.sendMessage(messageInstance);
      console.log('位置消息发送成功:', messageResult);
      
      // 如果没有会话ID，设置会话ID
      if (!this.data.conversationID && messageResult.data.conversationID) {
        this.setData({
          conversationID: messageResult.data.conversationID
        });
      }
      
      const finalMessages = this.data.messages.map(msg => 
        msg.id === tempMessage.id ? { 
          ...msg, 
          id: messageResult.data.message.ID,
          status: 'sent',
          messageObj: messageResult.data.message
        } : msg
      );

      this.setData({
        messages: finalMessages
      });

    } catch (error) {
      console.error('发送位置失败:', error);
      
      // 更新消息状态为失败
      const failedMessages = this.data.messages.map(msg => 
        msg.id.startsWith('temp_') && msg.status === 'sending' && msg.messageType === 'location' ? { 
          ...msg, 
          status: 'failed'
        } : msg
      );
      
      this.setData({
        messages: failedMessages
      });
      
      // 显示错误提示
      let errorMessage = '发送位置失败';
      if (error.message && error.message.includes('permission')) {
        errorMessage = '位置权限被拒绝';
      } else if (error.message && error.message.includes('network')) {
        errorMessage = '网络连接异常';
      } else if (error.message && error.message.includes('timeout')) {
        errorMessage = '获取位置超时';
      } else if (error.message && error.message.includes('20011')) {
        errorMessage = '需要先添加好友';
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'error'
      });
    }
  },

  /**
   * 开始录音
   */
  startRecording() {
    wx.showToast({
      title: '录音功能开发中',
      icon: 'none'
    });
  },

  /**
   * 选择视频
   */
  chooseVideo() {
    wx.chooseVideo({
      sourceType: ['album', 'camera'],
      maxDuration: 60,
      camera: 'back',
      success: (res) => {
        this.sendVideoMessage(res.tempFilePath);
      },
      fail: (error) => {
        console.error('选择视频失败:', error);
      }
    });
  },

  /**
   * 发送视频消息
   */
  async sendVideoMessage(filePath) {
    try {
      const targetUserID = this.extractUserIDFromConversationID(this.data.conversationID);
      
      console.log('准备发送视频消息:', { targetUserID, filePath });
      
      // 使用imManager检查IM状态
      const imStatus = imManager.checkIMStatus();
      if (!imStatus.isLoggedIn) {
        throw new Error('IM未登录，当前状态: ' + JSON.stringify(imStatus));
      }
      
      // 检查文件是否存在
      if (!filePath) {
        throw new Error('视频文件路径无效');
      }
      
      const messageInstance = wx.$TUIKit.createVideoMessage({
        to: targetUserID,
        conversationType: wx.TencentCloudChat.TYPES.CONV_C2C,
        payload: {
          file: filePath
        }
      });

      const tempMessage = {
        id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'user',
        content: '[视频]',
        messageType: 'video',
        time: formatTime(getCurrentTimestamp()),
        timeRaw: getCurrentTimestamp(),
        showTimeSeparator: shouldShowTimeSeparator(
          getCurrentTimestamp(), 
          this.data.messages.length > 0 ? 
          this.data.messages[this.data.messages.length - 1].timeRaw : 0
        ),
        avatar: this.getOwnAvatarUrl(),
        videoUrl: filePath,
        status: 'sending'
      };

      const updatedMessages = [...this.data.messages, tempMessage];
      this.setData({
        messages: updatedMessages
      });

      setTimeout(() => {
        this.scrollToBottom();
      }, 100);

      const messageResult = await wx.$TUIKit.sendMessage(messageInstance);
      console.log('视频消息发送成功:', messageResult);
      
      // 如果没有会话ID，设置会话ID
      if (!this.data.conversationID && messageResult.data.conversationID) {
        this.setData({
          conversationID: messageResult.data.conversationID
        });
      }
      
      const finalMessages = this.data.messages.map(msg => 
        msg.id === tempMessage.id ? { 
          ...msg, 
          id: messageResult.data.message.ID,
          status: 'sent',
          messageObj: messageResult.data.message,
          videoUrl: messageResult.data.message.payload.videoUrl
        } : msg
      );

      this.setData({
        messages: finalMessages
      });

    } catch (error) {
      console.error('发送视频失败:', error);
      
      // 更新消息状态为失败
      const failedMessages = this.data.messages.map(msg => 
        msg.id.startsWith('temp_') && msg.status === 'sending' && msg.messageType === 'video' ? { 
          ...msg, 
          status: 'failed'
        } : msg
      );
      
      this.setData({
        messages: failedMessages
      });
      
      // 提供更详细的错误信息
      let errorMessage = '发送视频失败';
      if (error.message) {
        if (error.message.includes('network')) {
          errorMessage = '网络错误，请检查网络连接';
        } else if (error.message.includes('file')) {
          errorMessage = '视频文件格式不支持';
        } else if (error.message.includes('size')) {
          errorMessage = '视频文件过大';
        } else if (error.message.includes('20011')) {
          errorMessage = '需要先添加好友';
        } else if (error.message.includes('undefined')) {
          errorMessage = '视频文件无效';
        }
      }
      
      wx.showToast({
        title: errorMessage,
        icon: 'error'
      });
    }
  },

  /**
   * 分享联系人
   */
  shareContact() {
    wx.showToast({
      title: '分享联系人功能开发中',
      icon: 'none'
    });
  },

  /**
   * 切换功能菜单显示
   */
  showPlusMenu() {
    this.setData({
      showFunctionMenu: !this.data.showFunctionMenu,
      showAIMenu: false,
      showModelMenu: false
    });
  },

  /**
   * 切换AI菜单显示
   */
  toggleAIMenu() {
    this.setData({
      showAIMenu: !this.data.showAIMenu,
      showFunctionMenu: false,
      showModelMenu: false
    });
  },

  /**
   * 切换模型菜单显示
   */
  toggleModelMenu() {
    this.setData({
      showModelMenu: !this.data.showModelMenu,
      showFunctionMenu: false,
      showAIMenu: false
    });
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
   * 选择模型
   */
  selectModel(e) {
    const modelName = e.currentTarget.dataset.model;
    this.setData({
      selectedModel: modelName,
      showModelMenu: false
    });
    console.log('选择了模型:', modelName);
  },

  /**
   * 切换输入类型（文本/语音）
   */
  toggleInputType() {
    this.setData({
      inputType: this.data.inputType === 'text' ? 'voice' : 'text'
    });
  },

  /**
   * 按住说话开始
   */
  startVoiceRecording() {
    console.log('开始录音');
    // 这里可以添加微信小程序的录音API调用
  },

  /**
   * 结束录音并发送
   */
  stopVoiceRecording() {
    console.log('结束录音');
    // 这里可以添加录音处理和发送逻辑
    
    // 模拟语音转文本并发送
    const voiceContent = '这是一段语音消息';
    const voiceMessage = {
      id: Date.now(),
      type: 'user',
      content: voiceContent,
      isVoice: true,
      timestamp: Date.now()
    };

    this.setData({
      messages: [...this.data.messages, voiceMessage]
    });

    // 滚动到底部
    this.scrollToBottom();

    // 模拟AI回复
    this.simulateAIResponse();
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
        this.selectImage()
        break;
      case 'file':
        this.selectFile()
        break;
      case 'location':
        this.selectLocation()
        break;
      case 'emoji':
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
      
      // 检查相册权限
      if (!authSetting.authSetting['scope.writePhotosAlbum']) {
        try {
          await wx.authorize({ scope: 'scope.writePhotosAlbum' });
        } catch (authError) {
          console.log('用户拒绝相册权限:', authError);
          wx.showModal({
            title: '相册权限',
            content: '需要相册权限才能选择图片，请在设置中开启',
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
      
      // 检查相机权限
      if (!authSetting.authSetting['scope.camera']) {
        try {
          await wx.authorize({ scope: 'scope.camera' });
        } catch (authError) {
          console.log('用户拒绝相机权限:', authError);
          wx.showModal({
            title: '相机权限',
            content: '需要相机权限才能拍照，请在设置中开启',
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
      } else if (error.errMsg && error.errMsg.includes('fail auth')) {
        errorMessage = '权限被拒绝，请在设置中开启';
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
      
      // 检查IM登录状态
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
      
      console.log('文件选择成功，数量:', res.tempFiles.length);
      
      await this.sendFileMessage(res);
      // // 逐个发送文件
      // for (let i = 0; i < res.tempFiles.length; i++) {
      //   const tempFile = res.tempFiles[i];
      //   console.log(`\n=== 处理第${i + 1}个文件 ===`);
      //   console.log('文件详细信息:', {
      //     name: tempFile.name,
      //     path: tempFile.path,
      //     size: tempFile.size,
      //     type: tempFile.type,
      //     time: tempFile.time
      //   });
        
      //   // 直接传递文件对象，符合官方示例
        
      // }
      
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
   * 选择位置
   */
  async selectLocation() {
    try {
      // 检查位置权限
      const authSetting = await wx.getSetting();
      console.log('位置权限设置:', authSetting.authSetting);
      
      // 如果没有权限，先请求权限
      if (!authSetting.authSetting['scope.userLocation']) {
        try {
          await wx.authorize({ scope: 'scope.userLocation' });
        } catch (authError) {
          console.log('用户拒绝位置权限:', authError);
          wx.showModal({
            title: '位置权限',
            content: '需要位置权限才能发送位置信息，请在设置中开启',
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
      
      const locationRes = await wx.chooseLocation();
      
      console.log('选择的位置:', locationRes);
      
      // 发送位置消息
      await this.sendLocationMessage(locationRes);
      
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
      } else if (error.errMsg && error.errMsg.includes('fail auth')) {
        errorMessage = '位置权限被拒绝，请在设置中开启';
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
      showFunctionMenu: false,
      showAIMenu: false,
      showModelMenu: false,
      showActionMenu: false
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
      const targetUserID = this.data.chatInfo.id || this.data.chatInfo.name;
      
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
   * 隐藏表情选择器
   */
  hideEmojiPicker() {
    this.setData({
      showEmojiPicker: false
    });
  },

  /**
   * 阻止默认事件和事件冒泡
   */
  preventDefault() {
    // 空方法，仅用于阻止事件冒泡
  },

  /**
   * 点击返回按钮
   */
  onBackPress() {
    wx.navigateBack();
  },

  /**
   * 更新消息状态
   */
  updateMessageStatus(tempId, status, realMessage = null) {
    const messages = this.data.messages.map(msg => {
      if (msg.id === tempId) {
        const updatedMsg = { ...msg, status };
        
        if (status === 'sent' && realMessage) {
          // 用真实消息替换临时消息
          return {
            ...msg,
            id: realMessage.ID,
            status: 'sent',
            messageObj: realMessage
          };
        }
        
        return updatedMsg;
      }
      return msg;
    });

    this.setData({ messages });
    this.scrollToBottom();
  },

  /**
   * 更新消息进度
   */
  updateMessageProgress(tempId, progress) {
    const messages = this.data.messages.map(msg => {
      if (msg.id === tempId) {
        return { ...msg, progress };
      }
      return msg;
    });

    this.setData({ messages });
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
   * 点击AI报告图标
   */

  openAIReport() {
    // 这里可以添加跳转到AI报告页面的逻辑
    wx.navigateTo({
      url: '/pages/ai-report/ai-report',
    });
  },

  /**
   * 点击空白区域关闭所有菜单
   */
  onBackgroundTap() {
    this.hideAllMenus();
  },

  /**
   * 隐藏所有菜单
   */
  hideAllMenus() {
    this.setData({
      showFunctionMenu: false,
      showAIMenu: false,
      showModelMenu: false,
      showEmojiPicker: false,
      showActionMenu: false
    });
  },

  /**
   * 阻止事件冒泡
   */
  preventBubbling() {
    // 阻止事件冒泡到父元素
  },

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
   * 预览图片
   */
  previewImage(e) {
    const { url } = e.currentTarget.dataset;
    console.log('预览图片URL:', url);
    
    const urls = this.data.messages
      .filter(msg => msg.messageType === 'image' && msg.imageUrl)
      .map(msg => msg.imageUrl);
    
    console.log('所有图片URL:', urls);
    
    wx.previewImage({
      current: url,
      urls: urls
    });
  },

  /**
   * 图片加载成功处理
   */
  onImageLoad(e) {
    const { messageId } = e.currentTarget.dataset;
    console.log('图片加载成功:', messageId);
    
    // 更新消息状态，移除错误标记
    const updatedMessages = this.data.messages.map(msg => 
      msg.id === messageId ? { 
        ...msg, 
        imageLoadError: false,
        imageLoadSuccess: true
      } : msg
    );
    
    this.setData({
      messages: updatedMessages
    });
  },

  /**
   * 测试图片URL可访问性
   */
  testImageUrl(url) {
    wx.request({
      url: url,
      method: 'HEAD',
      success: (res) => {
        console.log('图片URL可访问:', url, '状态码:', res.statusCode);
      },
      fail: (error) => {
        console.error('图片URL不可访问:', url, error);
      }
    });
  },

  /**
   * 图片加载失败处理
   */
  onImageError(e) {
    const { messageId } = e.currentTarget.dataset;
    console.error('图片加载失败:', messageId, e.detail);
    
    // 更新消息状态，标记加载错误
    const updatedMessages = this.data.messages.map(msg => 
      msg.id === messageId ? { 
        ...msg, 
        imageLoadError: true,
        imageLoadSuccess: false
      } : msg
    );
    
    this.setData({
      messages: updatedMessages
    });
    
    wx.showToast({
      title: '图片加载失败',
      icon: 'none'
    });
  },

  /**
   * 打开位置
   */
  openLocation(e) {
    const { latitude, longitude, address } = e.currentTarget.dataset;
    
    wx.openLocation({
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      name: address || '位置信息',
      address: address || '',
      scale: 18
    });
  },

  /**
   * 下载文件
   */
  downloadFile(e) {
    const { url, filename } = e.currentTarget.dataset;
    
    wx.downloadFile({
      url: url,
      success: (res) => {
        if (res.statusCode === 200) {
          wx.openDocument({
            filePath: res.tempFilePath,
            showMenu: true,
            success: () => {
              console.log('打开文档成功');
            },
            fail: (error) => {
              console.error('打开文档失败:', error);
              wx.showToast({
                title: '打开文件失败',
                icon: 'none'
              });
            }
          });
        }
      },
      fail: (error) => {
        console.error('下载文件失败:', error);
        wx.showToast({
          title: '下载文件失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 预览文件
   */
  async previewFile(e) {
    try {
      const message = e.currentTarget.dataset.message;
      console.log('预览文件消息:', message);
      
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
      const extension = this.getFileExtension(fileName);
      const isImageFile = this.isImageFile(extension);
      const isTextFile = this.isTextFile(extension);
      
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
   * 显示长文本内容
   */
  showLongTextContent(fileName, content) {
    // 可以考虑跳转到新页面显示完整内容
    // 或者使用其他方式展示
    console.log('显示长文本内容:', fileName, content.length);
    
    wx.showModal({
      title: '提示',
      content: '文件内容过长，建议下载后查看',
      showCancel: true,
      cancelText: '取消',
      confirmText: '下载文件',
      success: (res) => {
        if (res.confirm) {
          // 触发下载
          this.downloadFile({ 
            currentTarget: { 
              dataset: { 
                url: this.data.currentFileUrl, 
                filename: fileName 
              } 
            } 
          });
        }
      }
    });
  },

  /**
   * 播放语音
   */
  playAudio(e) {
    const { url } = e.currentTarget.dataset;
    
    // 如果正在播放，停止播放
    if (this.data.currentAudio && this.data.currentAudio.src === url) {
      this.data.currentAudio.stop();
      this.setData({
        currentAudio: null,
        playingAudioId: null
      });
      return;
    }
    
    // 停止当前播放的音频
    if (this.data.currentAudio) {
      this.data.currentAudio.stop();
    }
    
    // 创建新的音频实例
    const audio = wx.createInnerAudioContext();
    audio.src = url;
    
    audio.onPlay(() => {
      this.setData({
        currentAudio: audio,
        playingAudioId: url
      });
    });
    
    audio.onEnded(() => {
      this.setData({
        currentAudio: null,
        playingAudioId: null
      });
    });
    
    audio.onError((error) => {
      console.error('播放音频失败:', error);
      wx.showToast({
        title: '播放失败',
        icon: 'none'
      });
      this.setData({
        currentAudio: null,
        playingAudioId: null
      });
    });
    
    audio.play();
  },

  /**
   * 播放视频
   */
  playVideo(e) {
    const { url } = e.currentTarget.dataset;
    
    wx.previewMedia({
      sources: [{
        url: url,
        type: 'video'
      }],
      success: () => {
        console.log('播放视频成功');
      },
      fail: (error) => {
        console.error('播放视频失败:', error);
        wx.showToast({
          title: '播放失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 重试发送消息
   */
  async retrySendMessage(e) {
    const { index } = e.currentTarget.dataset;
    const message = this.data.messages[index];
    
    if (!message) return;
    
    // 删除失败的消息
    const updatedMessages = this.data.messages.filter((_, i) => i !== index);
    this.setData({
      messages: updatedMessages
    });
    
    // 根据消息类型重新发送
    switch (message.messageType) {
      case 'text':
        this.setData({
          inputValue: message.content
        });
        setTimeout(() => {
          this.sendMessage();
        }, 100);
        break;
      case 'image':
        if (message.imageUrl) {
          this.sendImageMessage(message.imageUrl);
        }
        break;
      case 'file':
        // 文件重发需要重新选择文件，这里暂时提示
        wx.showToast({
          title: '请重新选择文件',
          icon: 'none'
        });
        break;
      case 'location':
        if (message.location) {
          this.sendLocationMessage(message.location);
        }
        break;
      case 'video':
        if (message.videoUrl) {
          this.sendVideoMessage(message.videoUrl);
        }
        break;
    }
  },

  /**
   * 复制消息内容
   */
  copyMessage(e) {
    const { content } = e.currentTarget.dataset;
    
    wx.setClipboardData({
      data: content,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        });
      },
      fail: () => {
        wx.showToast({
          title: '复制失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 删除消息
   */
  deleteMessage(e) {
    const { index } = e.currentTarget.dataset;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这条消息吗？',
      success: (res) => {
        if (res.confirm) {
          const updatedMessages = this.data.messages.filter((_, i) => i !== index);
          this.setData({
            messages: updatedMessages
          });
        }
      }
    });
  },

  /**
   * 撤回消息
   */
  async revokeMessage(e) {
    const { index } = e.currentTarget.dataset;
    const message = this.data.messages[index];
    
    if (!message || !message.messageObj) return;
    
    try {
      await wx.$TUIKit.revokeMessage(message.messageObj);
      
      // 更新本地消息状态
      const updatedMessages = this.data.messages.map((msg, i) => 
        i === index ? { 
          ...msg, 
          content: '消息已撤回',
          isRevoked: true
        } : msg
      );
      
      this.setData({
        messages: updatedMessages
      });
      
    } catch (error) {
      console.error('撤回消息失败:', error);
      wx.showToast({
        title: '撤回失败',
        icon: 'none'
      });
    }
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  // onPullDownRefresh() {
  //   console.log('下拉刷新');
  //   // 可以在这里实现加载历史消息的逻辑
  //   setTimeout(() => {
  //     wx.stopPullDownRefresh();
  //   }, 1000);
  // },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    // 可以在这里实现加载更多历史消息的逻辑
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
});