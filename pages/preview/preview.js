// pages/preview/preview.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    chatUnreadCount: 0,      // 聊天未读消息数
    showMatchDegreeModal: false, // 是否显示匹配度说明弹窗
    showChatModal: false,     // 是否显示聊天弹窗
    showToast: false,         // 是否显示提示
    toastMessage: '',         // 提示消息
    greetingMessage: '你好，李小雅！很高兴认识你，我对你的设计工作很感兴趣，想和你聊聊。' // 打招呼消息
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 获取聊天未读消息数（模拟数据）
    this.setData({
      chatUnreadCount: 3 // 示例数据，实际应从全局状态或API获取
    });
    
    // 加载社交媒体数据
    this.loadSocialMediaData();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 每次显示页面时更新未读消息数
    this.updateUnreadCount();
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {
    
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage: function () {
    return {
      title: '预览名片',
      path: '/pages/preview/preview',
      imageUrl: '/images/share-cover.png' // 分享封面图
    };
  },

  /**
   * 导航到个人资料页面
   */
  navigateToProfile: function() {
    wx.navigateTo({
      url: '/pages/profile/profile'
    });
  },

  /**
   * 打开分享功能
   */
  openShare: function() {
    wx.navigateTo({
      url: '/pages/share/share'
    });
  },

  /**
   * 显示匹配度说明
   */
  showMatchDegree: function() {
    this.setData({
      showMatchDegreeModal: true
    });
  },

  /**
   * 关闭匹配度说明弹窗
   */
  closeMatchDegree: function() {
    this.setData({
      showMatchDegreeModal: false
    });
  },

  /**
   * 开始聊天
   */
  startChat: function() {
    this.setData({
      showChatModal: true
    });
  },

  /**
   * 关闭聊天弹窗
   */
  closeChatModal: function() {
    this.setData({
      showChatModal: false
    });
  },

  /**
   * 发送打招呼消息
   */
  sendGreeting: function() {
    const message = this.data.greetingMessage;
    console.log('发送打招呼消息:', message);
    
    // 关闭弹窗
    this.closeChatModal();
    
    // 显示成功提示
    this.showToast('消息已发送');
    
    // 跳转到聊天页面并传递消息参数
    setTimeout(() => {
      wx.navigateTo({
        url: '/pages/chat/chat?user=李小雅&message=' + encodeURIComponent(message)
      });
    }, 1000);
  },

  /**
   * 输入框内容变化
   */
  onInput: function(e) {
    this.setData({
      greetingMessage: e.detail.value
    });
  },

  /**
   * 显示提示信息
   */
  showToast: function(message) {
    this.setData({
      showToast: true,
      toastMessage: message
    });
    
    // 2秒后自动隐藏
    setTimeout(() => {
      this.setData({
        showToast: false
      });
    }, 2000);
  },

  /**
   * 导航到聊天页面
   */
  navigateToChat: function() {
    wx.navigateTo({
      url: '/pages/chat/chat'
    });
  },

  /**
   * 导航到AI分身页面
   */
  navigateToAvatar: function() {
    wx.navigateTo({
      url: '/pages/avatar/avatar'
    });
  },

  /**
   * 导航到名片页面
   */
  navigateToProfile: function() {
    wx.navigateTo({
      url: '/pages/profile/profile'
    });
  },

  /**
   * 更新未读消息数
   */
  updateUnreadCount: function() {
    // 这里应该从全局状态或API获取实际的未读消息数
    // 示例中使用模拟数据
    this.setData({
      chatUnreadCount: 3
    });
  },

  /**
   * 加载社交媒体数据
   */
  loadSocialMediaData: function() {
    // 模拟社交媒体数据
    const socialMediaList = [
      {
        icon: 'icon-github',
        color: '#333',
        text: 'github.com/xiaoya-design'
      },
      {
        icon: 'icon-dribbble',
        color: '#ea4c89',
        text: 'dribbble.com/xiaoya'
      },
      {
        icon: 'icon-behance',
        color: '#1769ff',
        text: 'behance.net/xiaoya'
      }
    ];
    
    // 实际项目中，这里应该将数据绑定到页面
    // 由于我们在wxml中没有动态生成社交媒体列表，所以这里只是示例
    console.log('社交媒体数据:', socialMediaList);
  },

  /**
   * 复制到剪贴板功能
   */
  copyToClipboard: function(text) {
    wx.setClipboardData({
      data: text,
      success: () => {
        this.showToast('复制成功');
      },
      fail: () => {
        this.showToast('复制失败');
      }
    });
  }
})