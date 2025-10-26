// pages/search/search.js
Page({
  data: {
    searchText: '',
    showSearchResults: false,
    searchResults: [],
    // 从chat页面复制的联系人数据
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
    ]
  },

  onLoad: function (options) {},
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
      showSearchResults: true
    });
  },
  // 导航到聊天会话页
  navigateToConversation: function(e) {
    const user = e.currentTarget.dataset.user;
    wx.navigateTo({
      url: `/pages/conversation/conversation?user=${encodeURIComponent(JSON.stringify(user))}`
    });
  }
  
  // 搜索相关函数...
})