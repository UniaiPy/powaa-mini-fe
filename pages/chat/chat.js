// pages/chat/chat.js
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
    originalContactsList: [], // 保存原始联系人列表
    originalPendingList: [] // 保存原始待联系人列表
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 检查TUIKit是否已在app.js中初始化
    this.checkTUIKitStatus();
  },
  
  // 检查TUIKit状态
  checkTUIKitStatus: function() {
    const app = getApp();
    
    // 检查是否已登录
    if (!app.globalData.token || !app.globalData.userInfo) {
      console.error('用户未登录');
      // 使用模拟数据
      this.loadMockData();
      return;
    }
    
    // 检查TUIKit是否已在app.js中初始化
    if (app.globalData.isTUIKitInitialized && wx.$TUIKit) {
      console.log('TUIKit已在app.js中初始化，直接使用');
      this.setData({
        isImInitialized: true
      });
      
      // 设置页面级别的事件监听
      this.setImEventListeners();
      
      // 加载数据
      this.loadConversationList();
      this.loadFriendRequests();
    } else {
      console.log('TUIKit未初始化，等待app.js初始化完成');
      // 等待一段时间后再次检查
      setTimeout(() => {
        this.checkTUIKitStatus();
      }, 1000);
    }
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
      
      // 监听好友请求（如果存在该事件）
      if (wx.TencentCloudChat.EVENT.FRIEND_REQUEST_LIST_UPDATED) {
        wx.$TUIKit.on(wx.TencentCloudChat.EVENT.FRIEND_REQUEST_LIST_UPDATED, (event) => {
          this.onFriendRequestListUpdated(event);
        });
      }
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
  
  // 加载会话列表
  loadConversationList: function() {
    wx.showLoading({
      title: '加载会话中...',
    });
    
    try {
      // 获取会话列表 - 使用Promise方式
      wx.$TUIKit.getConversationList().then((conversationList) => {
          console.log('获取会话列表成功:', conversationList);
          console.log('会话列表类型:', typeof conversationList);
          console.log('会话列表是否为数组:', Array.isArray(conversationList));
          
          // 处理TUIKit返回的数据格式
          let actualConversationList = conversationList;
          
          // 如果返回的是对象格式 {code: 0, data: {...}}，提取data中的数组
          if (typeof conversationList === 'object' && conversationList !== null && !Array.isArray(conversationList)) {
            if (conversationList.data && Array.isArray(conversationList.data)) {
              console.log('找到data数组:', conversationList.data);
              actualConversationList = conversationList.data;
            } else if (conversationList.data && typeof conversationList.data === 'object' && conversationList.data.conversationList && Array.isArray(conversationList.data.conversationList)) {
              console.log('找到data.conversationList数组:', conversationList.data.conversationList);
              actualConversationList = conversationList.data.conversationList;
            } else {
              console.log('尝试查找数组属性...');
              for (const key in conversationList) {
                if (Array.isArray(conversationList[key])) {
                  console.log(`找到数组属性: ${key}`, conversationList[key]);
                  actualConversationList = conversationList[key];
                  break;
                }
              }
            }
          }
          
          // 验证actualConversationList是否为数组
          if (!Array.isArray(actualConversationList)) {
            console.error('会话列表数据格式错误，期望数组，实际收到:', typeof actualConversationList, actualConversationList);
            // 加载失败时使用模拟数据
            this.loadMockData();
            return;
          }
          
          // 处理会话列表数据
          this.processConversationList(actualConversationList);
        
      }).catch((error) => {
        console.error('获取会话列表失败:', error);
        wx.showToast({
          title: '加载会话失败',
          icon: 'none'
        });
        // 加载失败时使用模拟数据
        this.loadMockData();
      });
      
    } catch (error) {
      console.error('加载会话列表失败:', error);
      wx.showToast({
        title: '加载会话失败',
        icon: 'none'
      });
      // 加载失败时使用模拟数据
      this.loadMockData();
    } finally {
      wx.hideLoading();
    }
  },
  
  // 处理会话列表数据的独立方法
  processConversationList: function(conversationList) {
    console.log('开始处理会话列表，数量:', conversationList.length);
    
    // 处理会话列表数据
    const contactsList = conversationList.map(conversation => {
      console.log('处理会话:', conversation);
      
      // 只处理C2C类型会话
      if (conversation.type !== wx.TencentCloudChat.TYPES.CONV_C2C) {
        console.log('跳过非C2C会话:', conversation.type);
        return null;
      }
      
      // 获取最后一条消息
      const lastMessage = conversation.lastMessage || {};
      
      // 格式化时间
      const time = this.formatTime(lastMessage.time || Date.now());
      
      const contact = {
        id: conversation.userID,
        name: conversation.showName || conversation.userID,
        avatar: conversation.avatar || '',
        lastMessage: lastMessage.nick || lastMessage.payload?.text || '暂无消息',
        time: time,
        unread: conversation.unreadCount || 0
      };
      
      console.log('生成的联系人数据:', contact);
      return contact;
    }).filter(Boolean);
    
    console.log('处理后的联系人列表:', contactsList);
    
    this.setData({
      contactsList: contactsList,
      originalContactsList: contactsList
    });
  },
  
  // 加载好友请求列表（从IM直接获取）
  loadFriendRequests: function() {
    console.log('开始从IM加载好友请求列表...');
    
    // 获取当前用户信息
    const app = getApp();
    const currentUserId = app.globalData.userInfo?.userId || app.globalData.userInfo?.id;
    console.log('当前用户ID:', currentUserId);
    console.log('当前用户信息:', app.globalData.userInfo);
    
    // 检查IM是否已初始化
    if (!app.globalData.isTUIKitInitialized || !wx.$TUIKit) {
      console.error('IM未初始化，无法获取好友申请列表');
      this.setData({
        pendingList: [],
        originalPendingList: []
      });
      wx.showToast({
        title: 'IM未初始化',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: '加载好友请求中...',
    });
    
    // 使用IM SDK获取好友申请列表
    wx.$TUIKit.getFriendApplicationList()
      .then((imResponse) => {
        console.log('IM获取好友申请完整响应:', JSON.stringify(imResponse, null, 2));
        
        // 获取所有好友申请
        const applicationList = imResponse.data.applicationList || [];
        console.log('所有好友申请数量:', applicationList.length);
        
        // 打印所有申请的详细信息，用于调试
        applicationList.forEach((app, index) => {
          console.log(`申请${index + 1}详细信息:`, {
            userID: app.userID,
            nickname: app.nickname,
            type: app.type,
            addTime: app.addTime,
            addSource: app.addSource,
            wording: app.wording,
            status: app.status,
            isFromMe: app.type === wx.TencentCloudChat.TYPES.SNS_APPLICATION_SENT_TO_ME
          });
        });
        
        // 获取收到的好友申请（别人发给当前用户的）
        const pendingApplications = applicationList.filter(app => 
          app.type === wx.TencentCloudChat.TYPES.SNS_APPLICATION_SENT_TO_ME && 
          app.addTime
        );
        
        console.log('过滤后收到的好友申请数量:', pendingApplications.length);
        console.log('申请列表详情:', pendingApplications);
        
        // 打印每个好友申请的详细信息
        pendingApplications.forEach((application, index) => {
          console.log(`好友申请${index + 1}:`, {
            userID: application.userID,
            nickname: application.nickname,
            addTime: application.addTime,
            addSource: application.addSource,
            wording: application.wording,
            type: application.type,
            status: application.status
          });
        });
        
        // 处理好友申请数据
        const pendingList = pendingApplications.map(application => {
          return {
            id: application.userID + '_' + application.addTime, // 使用用户ID和时间戳作为唯一标识
            name: application.nickname || application.userID,
            avatar: application.avatar || '',
            message: application.wording || '请求添加您为好友',
            time: this.formatTime(application.addTime),
            senderId: application.userID,
            receiverId: currentUserId,
            addTime: application.addTime,
            status: application.status,
            type: application.type
          };
        });
        
        console.log('处理后的待联系列表:', pendingList);
        
        this.setData({
          pendingList: pendingList,
          originalPendingList: pendingList
        });
        
        if (pendingList.length === 0) {
          wx.showToast({
            title: '暂无收到的好友请求',
            icon: 'none'
          });
        }
      })
      .catch((error) => {
        console.error('IM获取好友申请失败:', error);
        console.error('错误码:', error.code);
        console.error('错误信息:', error.message);
        
        wx.showToast({
          title: '获取好友申请失败',
          icon: 'none'
        });
        
        // 设置空数组避免后续错误
        this.setData({
          pendingList: [],
          originalPendingList: []
        });
      })
      .finally(() => {
        wx.hideLoading();
      });
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
    
    // 监听好友申请列表更新
    wx.$TUIKit.on(wx.TencentCloudChat.EVENT.FRIEND_APPLICATION_LIST_UPDATED, (event) => {
      console.log('=== 📬 好友申请列表更新事件 ===');
      console.log('事件数据:', JSON.stringify(event, null, 2));
      
      // 重新加载好友申请列表
      this.loadFriendRequests();
      
      // 显示通知
      wx.showToast({
        title: '收到新的好友申请',
        icon: 'none',
        duration: 2000
      });
    });
    
    // 监听好友申请被处理
    wx.$TUIKit.on(wx.TencentCloudChat.EVENT.FRIEND_APPLICATION_PROCESS, (event) => {
      console.log('=== 🔄 好友申请处理事件 ===');
      console.log('事件数据:', JSON.stringify(event, null, 2));
      
      // 重新加载好友申请列表
      this.loadFriendRequests();
    });
    
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
  
  // 格式化时间
  formatTime: function(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      // 今天
      return date.getHours().toString().padStart(2, '0') + ':' + 
             date.getMinutes().toString().padStart(2, '0');
    } else if (diffDays === 1) {
      // 昨天
      return '昨天';
    } else if (diffDays < 7) {
      // 一周内
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return weekdays[date.getDay()];
    } else {
      // 超过一周显示具体日期
      return (date.getMonth() + 1) + '-' + date.getDate();
    }
  },
  
  // 加载模拟数据（备用）
  loadMockData: function() {
    const contacts = [
      {
        id: '1',
        name: '王小明',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
        lastMessage: '你好，很高兴认识你！',
        time: '2分钟前',
        unread: 2
      },
      {
        id: '2',
        name: '李小雅',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
        lastMessage: '谢谢你的分享，很有帮助！',
        time: '1小时前',
        unread: 0
      },
      {
        id: '3',
        name: '陈佳明',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
        lastMessage: '明天见面聊聊项目吧',
        time: '3小时前',
        unread: 1
      },
      {
        id: '4',
        name: '王小雨',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
        lastMessage: '周末一起去看电影吧',
        time: '昨天',
        unread: 0
      },
      {
        id: '5',
        name: '张明华',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
        lastMessage: '数据分析项目合作',
        time: '2天前',
        unread: 0
      }
    ];
    
    const pending = [
      {
        id: 'p1',
        name: '陈思婷',
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&crop=face',
        message: '嗨，我是陈思婷，对你的专业领域很感兴趣，希望能和你交流学习！',
        time: '今天 14:30'
      },
      {
        id: 'p2',
        name: '张明华',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
        message: '你好，我是张明华，看到你在技术领域很有造诣，想请教一些问题。',
        time: '今天 14:25'
      },
      {
        id: 'p3',
        name: '林雨晨',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face',
        message: '嗨！我是林雨晨，我们似乎有很多共同爱好，希望能一起交流分享~',
        time: '今天 14:20'
      },
      {
        id: 'p4',
        name: '王小雨',
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
        message: '你好，我是王小雨，看到你的资料很感兴趣，想认识一下你！',
        time: '昨天 18:45'
      }
    ];
    
    this.setData({
      contactsList: contacts,
      originalContactsList: contacts,
      pendingList: pending,
      originalPendingList: pending
    });
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
    } else if (!this.data.originalContactsList.length) {
      // 如果没有初始化且没有原始数据，则重新检查TUIKit状态
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
      searchResults: [],
      contactsList: this.data.originalContactsList,
      pendingList: this.data.originalPendingList
    });
  },

  // 搜索输入
  onSearchInput: function(e) {
    this.setData({
      searchText: e.detail.value
    });
  },

  // 执行搜索
  performSearch: function() {
    const { searchText, originalContactsList, originalPendingList } = this.data;
    if (!searchText.trim()) {
      this.setData({
        showSearchResults: false,
        searchResults: [],
        contactsList: originalContactsList,
        pendingList: originalPendingList
      });
      return;
    }

    // 合并联系人列表和待联系列表进行搜索
    const allUsers = [...originalContactsList, ...originalPendingList.map(item => ({
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
    
    // 如果IM已初始化，使用TUIKit创建会话
    if (this.data.isImInitialized && wx.$TUIKit) {
      try {
        wx.$TUIKit.createConversation({
          conversationID: 'C2C' + user.id,
          type: wx.TencentCloudChat.TYPES.CONV_C2C,
          userID: user.id
        });
      } catch (error) {
        console.error('创建会话失败:', error);
      }
    }
    
    wx.navigateTo({
      url: `/pages/conversation/conversation?user=${encodeURIComponent(JSON.stringify(user))}`
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
    
    // 从requestId中解析出userID（格式：userID_addTime）
    const userId = requestId.split('_')[0];
    
    wx.showLoading({
      title: '处理中...',
    });
    
    try {
      // 如果IM已初始化，使用IM API同意好友请求
      if (this.data.isImInitialized && wx.$TUIKit) {
        wx.$TUIKit.acceptFriendApplication({
          userID: userId,
          type: wx.TencentCloudChat.TYPES.SNS_APPLICATION_SENT_TO_ME
        })
        .then((imResponse) => {
          console.log('IM同意好友申请成功:', imResponse);
          
          // 移除已处理的请求
          const updatedPendingList = this.data.pendingList.filter(item => item.id !== requestId);
          this.setData({
            pendingList: updatedPendingList,
            originalPendingList: updatedPendingList
          });
          
          wx.showToast({
            title: `已同意与${name}的好友请求`,
            icon: 'success'
          });
          
          // 刷新联系人列表
          this.loadConversationList();
        })
        .catch((error) => {
          console.error('IM同意好友申请失败:', error);
          console.error('错误码:', error.code);
          console.error('错误信息:', error.message);
          
          wx.showToast({
            title: error.message || '操作失败',
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
            pendingList: updatedPendingList,
            originalPendingList: updatedPendingList
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

  // 拒绝好友请求
  rejectMatch: function(e) {
    const requestId = e.currentTarget.dataset.id;
    const name = e.currentTarget.dataset.name;
    
    // 从requestId中解析出userID（格式：userID_addTime）
    const userId = requestId.split('_')[0];
    
    wx.showLoading({
      title: '处理中...',
    });
    
    try {
      // 如果IM已初始化，使用IM API拒绝好友请求
      if (this.data.isImInitialized && wx.$TUIKit) {
        wx.$TUIKit.refuseFriendApplication({
          userID: userId,
          type: wx.TencentCloudChat.TYPES.SNS_APPLICATION_SENT_TO_ME
        })
        .then((imResponse) => {
          console.log('IM拒绝好友申请成功:', imResponse);
          
          // 移除已处理的请求
          const updatedPendingList = this.data.pendingList.filter(item => item.id !== requestId);
          this.setData({
            pendingList: updatedPendingList,
            originalPendingList: updatedPendingList
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
          
          wx.showToast({
            title: error.message || '操作失败',
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
            pendingList: updatedPendingList,
            originalPendingList: updatedPendingList
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
  }
})