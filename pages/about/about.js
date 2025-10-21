// pages/about/about.js

Page({
  data: {
    isOpen: {
      about: false,
      contact: false,
      help: false,
      terms: false,
      privacy: false
    },
    unreadCount: 0
  },

  onLoad: function() {
    // 初始化时更新未读消息数量
    this.updateUnreadCount();
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
      phoneNumber: '18101847172',
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