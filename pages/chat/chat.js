// pages/chat/chat.js
import TencentCloudChat from '@tencentcloud/chat';

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
    // 初始化腾讯云IM
    this.initTencentIM();
  },
  
  // 初始化腾讯云IM
  initTencentIM: function() {
    const app = getApp();
    
    // 首先检查是否已登录
    if (!app.globalData.token || !app.globalData.userInfo) {
      console.error('用户未登录');
      // 使用模拟数据
      this.loadMockData();
      return;
    }
    
    // 从后端获取IM参数
    this.getIMConfigFromServer(app.globalData.token);
  },
  
  // 从后端获取IM配置参数
  getIMConfigFromServer: function(token) {
    const app = getApp();
    
    try {
      // 调用后端API获取IM配置参数
      app.request({
        url: '/api/im/get-config',
        method: 'GET',
        header: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        success: (res) => {
          console.log('IM配置接口响应:', res);
          
          if (res.code === 200 && res.data) {
            const config = res.data;
            console.log('获取到的IM配置:', {
              SDKAppID: config.SDKAppID,
              userID: config.userID,
              userSigLength: config.userSig ? config.userSig.length : 0
            });
            
            // 检查响应数据
            if (config && config.userID && config.userSig && config.SDKAppID) {
              const { userID, userSig, SDKAppID } = config;
              
              // 保存到全局数据
              app.globalData.userID = userID;
              app.globalData.userSig = userSig;
              app.globalData.SDKAppID = SDKAppID;
              
              // 初始化TUIKit
              this.initializeTUIKit(userID, userSig, SDKAppID);
            } else {
              console.error('IM配置参数不完整:', config);
              // 使用模拟数据
              this.loadMockData();
            }
          } else {
            console.error('获取IM配置失败:', res.error || '服务器返回错误');
            // 使用模拟数据
            this.loadMockData();
          }
        },
        fail: (error) => {
          console.error('获取IM配置失败:', error);
          // 使用模拟数据
          this.loadMockData();
        }
      });
    } catch (error) {
      console.error('获取IM配置异常:', error);
      // 使用模拟数据
      this.loadMockData();
    }
  },
  
  // 初始化TUIKit
  initializeTUIKit: function(userID, userSig, SDKAppID) {
    
    try {
      // 初始化TUIKit实例
      wx.$TUIKit = TencentCloudChat.create({
        SDKAppID: parseInt(SDKAppID)
      });
      
      // 保存到全局变量
      wx.$chat_SDKAppID = parseInt(SDKAppID);
      wx.$chat_userID = userID;
      wx.$chat_userSig = userSig;
      wx.TencentCloudChat = TencentCloudChat;
      
      // 登录IM
      wx.$TUIKit.login({
        userID: userID,
        userSig: userSig
      }).then(() => {
        console.log('IM登录成功');
        
        // 设置IM事件监听
        this.setImEventListeners();
        
        this.setData({
          isImInitialized: true
        });
        
        // 加载数据
        this.loadConversationList();
        this.loadFriendRequests();
      }).catch((error) => {
        console.error('IM登录失败:', error);
        // 登录失败时使用模拟数据
        this.loadMockData();
      });
      
    } catch (error) {
      console.error('IM初始化失败:', error);
      // 初始化失败时使用模拟数据
      this.loadMockData();
    }
  },
  
  // 设置IM事件监听
  setImEventListeners: function() {
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
  
  // 加载好友请求列表
  loadFriendRequests: function() {
    wx.showLoading({
      title: '加载好友请求中...',
    });
    
    // 调用后端API获取待处理的好友请求
    const app = getApp();
    app.request({
      url: `/api/friendships/pending`,
      method: 'GET',
      success: (res) => {
        if (res.code === 200 && res.data && res.data.pending_requests) {
          // 验证pending_requests是否为数组
          if (!Array.isArray(res.data.pending_requests)) {
            console.error('好友请求数据格式错误，期望数组，实际收到:', typeof res.data.pending_requests, res.data.pending_requests);
            this.setData({
              pendingList: [],
              originalPendingList: []
            });
            return;
          }
          
          // 处理好友请求数据
          const pendingList = res.data.pending_requests.map(request => {
            return {
              id: request.request_id,
              name: request.sender_nickname || request.sender_id,
              avatar: request.sender_avatar || '',
              message: '请求添加您为好友',
              time: request.request_time
            };
          });
          
          this.setData({
            pendingList: pendingList,
            originalPendingList: pendingList
          });
        } else {
          console.error('获取好友请求失败:', res.message || '未知错误');
          wx.showToast({
            title: '加载好友请求失败',
            icon: 'none'
          });
          // 设置空数组避免后续错误
          this.setData({
            pendingList: [],
            originalPendingList: []
          });
        }
      },
      fail: (err) => {
        console.error('获取好友请求失败:', err);
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
        // 设置空数组避免后续错误
        this.setData({
          pendingList: [],
          originalPendingList: []
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
    
    // 每次页面显示时检查IM是否已初始化，如果已初始化则刷新数据
    if (this.data.isImInitialized) {
      this.loadConversationList();
      this.loadFriendRequests();
    } else if (!this.data.originalContactsList.length) {
      // 如果没有初始化且没有原始数据，则加载模拟数据
      this.loadMockData();
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
          type: wx.$TUIKit.TYPES.CONV_C2C,
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
    
    wx.showLoading({
      title: '处理中...',
    });
    
    try {
      // 如果IM已初始化，调用后端API同意好友请求
      if (this.data.isImInitialized) {
        const app = getApp();
        app.request({
          url: `/api/friendships/approve/${requestId}`,
          method: 'POST',
          success: (res) => {
            if (res.code === 200) {
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
            } else {
              console.error('同意好友请求失败:', res.message);
              wx.showToast({
                title: res.message || '操作失败',
                icon: 'none'
              });
            }
          },
          fail: (error) => {
            console.error('请求失败:', error);
            wx.showToast({
              title: '网络请求失败',
              icon: 'none'
            });
          },
          complete: () => {
            wx.hideLoading();
          }
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
    
    wx.showModal({
      title: '确认拒绝',
      content: `确定要拒绝与${name}的好友请求吗？`,
      success: (res) => {
        if (res.confirm) {
          wx.showLoading({
            title: '处理中...',
          });
          
          try {
            // 如果IM已初始化，调用后端API拒绝好友请求
            if (this.data.isImInitialized) {
              const app = getApp();
              app.request({
                url: `/api/friendships/reject/${requestId}`,
                method: 'POST',
                success: (res) => {
                  if (res.code === 200) {
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
                  } else {
                    console.error('拒绝好友请求失败:', res.message);
                    wx.showToast({
                      title: res.message || '操作失败',
                      icon: 'none'
                    });
                  }
                },
                fail: (error) => {
                  console.error('请求失败:', error);
                  wx.showToast({
                    title: '网络请求失败',
                    icon: 'none'
                  });
                },
                complete: () => {
                  wx.hideLoading();
                }
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
      }
    });
  }
})