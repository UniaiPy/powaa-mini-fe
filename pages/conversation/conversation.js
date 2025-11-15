// pages/conversation/conversation.js
// 导入IM管理器
import imManager from '../../utils/imManager.js';

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
    menuPosition: { left: 0, top: 0 }
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    console.log('会话页面加载，参数:', options);
    
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
            name: userID,
            avatar: '/images/ai.png'
          };
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
   * 接收到新消息的处理函数
   */
  onMessageReceived(event) {
    const messageList = event.data;
    console.log('接收到新消息:', messageList);
    
    messageList.forEach((message) => {
      // 只处理当前会话的消息
      if (this.data.conversationID && message.conversationID === this.data.conversationID) {
        const newMessage = {
          id: message.ID,
          type: message.flow === 'out' ? 'user' : 'other',
          content: this.getMessageContent(message),
          time: this.formatMessageTime(message.time),
          avatar: message.flow === 'out' ? '/images/ai.png' : (message.avatar || '/images/ai.png'),
          messageObj: message
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
    const updatedMessages = this.data.messages.map(msg => 
      msg.id === message.ID ? { 
        ...msg, 
        content: this.getMessageContent(message),
        messageObj: message 
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

        console.log(`加载了 ${formattedMessages.length} 条历史消息`);
        console.log('是否还有更多消息:', !isCompleted);
        
        // 滚动到底部
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
   * 加载更多历史消息
   */
  async loadMoreMessages() {
    try {
      if (this.data.isCompleted || !this.data.conversationID) {
        console.log('没有更多消息或没有会话ID');
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
      console.log('更多历史消息:', messageListRes);

      const { code, data } = messageListRes;
      
      if (code === 0 && data) {
        const { messageList, nextReqMessageID, isCompleted } = data;
        
        // 格式化新消息
        const formattedMessages = this.formatMessages(messageList);
        
        // 将新消息添加到现有消息列表前面
        const updatedMessages = [...formattedMessages, ...this.data.messages];
        
        this.setData({
          messages: updatedMessages,
          nextReqMessageID: nextReqMessageID || '',
          isCompleted: isCompleted || false
        });

        console.log(`加载了更多 ${formattedMessages.length} 条消息`);
      }
      
    } catch (error) {
      console.error('加载更多消息失败:', error);
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
    
    return messageList.map(message => {
      const isFromMe = message.flow === 'out';
      
      return {
        id: message.ID || message.sequence || Date.now() + Math.random(),
        type: isFromMe ? 'user' : 'other',
        content: this.getMessageContent(message),
        time: this.formatMessageTime(message.time),
        avatar: isFromMe ? '/images/ai.png' : (message.avatar || '/images/ai.png'),
        messageObj: message // 保存原始消息对象
      };
    }).reverse(); // 反转消息顺序，使最新消息在底部
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
   * 格式化消息时间
   */
  formatMessageTime(timestamp) {
    if (!timestamp) return '';
    
    // 检查时间戳格式，如果是秒级时间戳，转换为毫秒级
    const timestampMs = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
    const date = new Date(timestampMs);
    
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    
    return `${hours}:${minutes}`;
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
    this.scrollToBottom()
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
      const query = wx.createSelectorQuery()
      query.select('#chat-container').boundingClientRect()
      query.selectViewport().scrollOffset()
      query.exec(res => {
        if (res && res[0] && res[1]) {
          wx.pageScrollTo({
            scrollTop: res[1].scrollTop + res[0].height,
            duration: 0
          })
        }
      })
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
    
    // 添加消息到本地列表（乐观更新）
    const newMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      time: this.getCurrentTime(),
      avatar: '/images/ai.png',
      sendFailed: false
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
      
      console.log('发送消息到用户:', targetUserID);
      
      // 检查好友关系状态（调试用）
      try {
        const friendList = await wx.$TUIKit.getFriendList();
        const isFriend = friendList.data.some(friend => friend.userID === targetUserID);
        console.log('目标用户好友状态:', isFriend, '好友列表:', friendList.data.map(f => f.userID));
      } catch (friendError) {
        console.log('检查好友关系失败:', friendError);
      }
      
      // 创建文本消息
      message = wx.$TUIKit.createTextMessage({
        to: targetUserID,
        conversationType: wx.TencentCloudChat.TYPES.CONV_C2C,
        payload: {
          text: inputValue.trim()
        }
      });
      
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
  toggleAiOnline(e) {
    const isOn = !this.data.aiOnline;
    console.log('切换AI状态:', isOn);
    this.setData({
      aiOnline: isOn,
      aiStatus: isOn ? 'online' : 'offline'
    });

    // 可以在这里添加AI状态切换的逻辑
    if (isOn) {
      // AI上线逻辑
      console.log('AI已上线');
    } else {
      // AI下线逻辑
      console.log('AI已下线');
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
      avatar: '/images/ai.png',
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
    // console.log('点击了功能:', functionType);
    
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
      wx.showToast({
        title: '选择图片失败',
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
      
      // 创建图片消息
      const message = wx.$TUIKit.createImageMessage({
        to: targetUserID,
        conversationType: wx.TencentCloudChat.TYPES.CONV_C2C,
        payload: {
          file: filePath
        },
        onProgress: (event) => {
          console.log('图片上传进度:', event);
        }
      });
      
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
        avatar: '/images/ai.png',
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
      wx.showToast({
        title: '发送图片失败',
        icon: 'error'
      });
    }
  },

  /**
   * 选择文件
   */
  async selectFile() {
    try {
      const res = await wx.chooseMessageFile({
        count: 10,
        type: 'file'
      });
      
      console.log('选择的文件:', res.tempFiles);
      
      // 逐个发送文件
      for (const tempFile of res.tempFiles) {
        await this.sendFileMessage(tempFile);
      }
      
      this.hideAllMenus();
    } catch (error) {
      console.error('选择文件失败:', error);
      wx.showToast({
        title: '选择文件失败',
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
      
      // 创建文件消息
      const message = wx.$TUIKit.createFileMessage({
        to: targetUserID,
        conversationType: wx.TencentCloudChat.TYPES.CONV_C2C,
        payload: {
          file: file
        },
        onProgress: (event) => {
          console.log('文件上传进度:', event);
        }
      });
      
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
        avatar: '/images/ai.png',
        messageObj: message,
        messageType: 'file',
        fileName: file.name,
        fileSize: file.size
      };
      
      const updatedMessages = [...this.data.messages, newMessage];
      this.setData({
        messages: updatedMessages
      });
      
      this.scrollToBottom();
      
    } catch (error) {
      console.error('发送文件消息失败:', error);
      wx.showToast({
        title: '发送文件失败',
        icon: 'error'
      });
    }
  },

  /**
   * 选择位置
   */
  async selectLocation() {
    try {
      const res = await wx.chooseLocation({
        latitude: 0,
        longitude: 0
      });
      
      console.log('选择的位置:', res);
      
      await this.sendLocationMessage(res);
      this.hideAllMenus();
      
    } catch (error) {
      console.error('选择位置失败:', error);
      wx.showToast({
        title: '选择位置失败',
        icon: 'error'
      });
    }
  },

  /**
   * 发送位置消息
   */
  async sendLocationMessage(location) {
    try {
      const targetUserID = this.extractUserIDFromConversationID(this.data.conversationID) || this.data.chatInfo.id || this.data.chatInfo.name;
      
      // 创建位置消息
      const message = wx.$TUIKit.createLocationMessage({
        to: targetUserID,
        conversationType: wx.TencentCloudChat.TYPES.CONV_C2C,
        payload: {
          latitude: location.latitude,
          longitude: location.longitude,
          description: location.address || location.name
        }
      });
      
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
        avatar: '/images/ai.png',
        messageObj: message,
        messageType: 'location',
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address || location.name
        }
      };
      
      const updatedMessages = [...this.data.messages, newMessage];
      this.setData({
        messages: updatedMessages
      });
      
      this.scrollToBottom();
      
    } catch (error) {
      console.error('发送位置消息失败:', error);
      wx.showToast({
        title: '发送位置失败',
        icon: 'error'
      });
    }
  },

  /**
   * 选择表情
   */
  selectEmoji() {
    // 显示表情选择器
    this.setData({
      showEmojiPicker: true
    });
    
    this.hideAllMenus();
  },

  /**
   * 选择表情并发送
   */
  async onEmojiSelect(emoji) {
    try {
      await this.sendFaceMessage(emoji);
      
      // 隐藏表情选择器
      this.setData({
        showEmojiPicker: false
      });
      
    } catch (error) {
      console.error('发送表情失败:', error);
      wx.showToast({
        title: '发送表情失败',
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
      
      // 创建表情消息
      const message = wx.$TUIKit.createFaceMessage({
        to: targetUserID,
        conversationType: wx.TencentCloudChat.TYPES.CONV_C2C,
        payload: {
          index: emoji.index || 1, // 表情索引
          data: emoji.data || emoji // 表情数据
        }
      });
      
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
        avatar: '/images/ai.png',
        messageObj: message,
        messageType: 'face',
        faceData: emoji
      };
      
      const updatedMessages = [...this.data.messages, newMessage];
      this.setData({
        messages: updatedMessages
      });
      
      this.scrollToBottom();
      
    } catch (error) {
      console.error('发送表情消息失败:', error);
      wx.showToast({
        title: '发送表情失败',
        icon: 'error'
      });
    }
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
    wx.navigateTo({
      url: '/pages/preview/preview?type=avatar'
    })
  },



  /**
   * 分享名片
   */
  shareCard() {
    wx.navigateTo({
      url: '/pages/share/share'
    })
  },

  /**
   * 屏蔽用户
   */
  blockUser() {
    wx.showModal({
      title: '确认屏蔽',
      content: '屏蔽后，您将不再收到该用户的消息，确定要屏蔽吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '已屏蔽用户',
            icon: 'success'
          })
        }
      }
    })
    this.hideAllMenus()
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
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    // 下拉加载历史消息
    console.log('下拉加载历史消息')
    wx.stopPullDownRefresh()
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
      path: `/pages/conversation/conversation?userName=${encodeURIComponent(chatInfo.name)}`
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
  }
})