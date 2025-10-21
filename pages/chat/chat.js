// pages/chat/chat.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    activeSection: 'contacts', // 默认显示联系人
    contactsList: [
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
    ],
    pendingList: [
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
    ],
    showSearch: false,
    searchText: '',
    showSearchResults: false,
    searchResults: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 页面加载时的初始化操作
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
      user.lastMessage.toLowerCase().includes(searchText.toLowerCase())
    );

    this.setData({
      searchResults: results,
      showSearchResults: results.length > 0
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

  // 同意匹配
  acceptMatch: function(e) {
    const name = e.currentTarget.dataset.name;
    wx.showLoading({
      title: '处理中',
    });

    // 模拟网络请求
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: `已同意与${name}的匹配`,
        icon: 'success'
      });

      // 更新待联系列表（移除已同意的用户）
      const pendingList = this.data.pendingList.filter(item => item.name !== name);
      this.setData({
        pendingList: pendingList
      });
    }, 1000);
  }
})