// subpages/about/about.js

Page({
  data: {
    isOpen: {
      about: false,
      contact: false,
      help: false,
      terms: false,
      privacy: false
    },
    unreadCount: 0,
    // 新增：存储从API获取的内容
    aboutContent: '',
    termsContent: '',
    privacyContent: '',
    helpContent: '',
    contactInfo: {
      phone: '18101847172',
      wechat: '小瓦AI分身'
    }
  },

  onLoad: function(options) {
    // 初始化时更新未读消息数量
    this.updateUnreadCount();
    // 加载官方信息
    this.loadOfficialInfo();
    
    // 检查是否有指定要展开的部分
    if (options.section) {
      // 延迟展开，确保内容已经加载
      setTimeout(() => {
        this.setData({
          [`isOpen.${options.section}`]: true
        });
      }, 500);
    }
  },

  // 加载官方信息
  loadOfficialInfo: function() {
    const app = getApp();
    
    // 定义类型与ID的映射关系
    const typeIdMap = {
      'about': 1,     // 关于我们对应的ID
      'terms': 4,     // 用户协议对应的ID
      'privacy': 5,   // 隐私政策对应的ID
      'faq': 3        // 常见问题对应的ID
    };
    
    // 遍历需要加载的类型
    Object.keys(typeIdMap).forEach(type => {
      const id = typeIdMap[type];
      
      app.request({
        url: `/api/official/${id}`,
        method: 'GET',
        success: (res) => {
          // 注意：app.request可能有不同的数据结构处理，根据实际实现调整
          if (res.data) {
            if (type === 'faq') {
              // FAQ对应help
              this.setData({
                helpContent: res.data.content
              });
            } else {
              this.setData({
                [type + 'Content']: res.data.content
              });
            }
          } else {
            console.warn(`获取${type}信息返回数据格式不正确:`, res);
          }
        },
        fail: (err) => {
          console.error(`获取${type}信息失败:`, err);
          // 可以保留默认内容或显示错误提示
          wx.showToast({
            title: `加载${type === 'faq' ? '帮助' : type === 'about' ? '关于我们' : type === 'terms' ? '用户协议' : '隐私政策'}信息失败`,
            icon: 'none',
            duration: 2000
          });
        }
      });
    });
  },

  // 切换区块显示/隐藏
  toggleSection: function(e) {
    const section = e.currentTarget.dataset.section;
    const isOpen = this.data.isOpen;
    
    this.setData({
      [`isOpen.${section}`]: !isOpen[section]
    });
  },

  // 导航到预览页面
  navigateToPreview: function() {
    wx.navigateTo({
      url: '../preview/preview'
    });
  },

  // 拨打电话
  makePhoneCall: function() {
    wx.makePhoneCall({
      phoneNumber: this.data.contactInfo.phone,
      success: function() {
        console.log('拨打电话成功');
      },
      fail: function() {
        console.log('拨打电话失败');
      }
    });
  },

  // 导航到聊天页面
  navigateToChat: function() {
    wx.switchTab({
      url: '../chat/chat'
    });
  },

  // 导航到AI分身页面
  navigateToAvatar: function() {
    wx.switchTab({
      url: '../avatar/avatar'
    });
  },

  // 导航到名片页面
  navigateToProfile: function() {
    wx.switchTab({
      url: '../profile/profile'
    });
  },

  // 更新未读消息数量
  updateUnreadCount: function() {
    // 在实际应用中，这里应该从全局状态或本地存储中获取未读消息数量
    // 这里模拟从本地存储获取
    try {
      const unreadCount = wx.getStorageSync('chatUnreadCount') || 0;
      this.setData({
        unreadCount: parseInt(unreadCount)
      });
    } catch (e) {
      console.error('获取未读消息数量失败', e);
    }
  },

  // 监听页面显示，每次显示时更新未读消息数量
  onShow: function() {
    this.updateUnreadCount();
  }
});