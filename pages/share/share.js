// pages/share/share.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    chatUnreadCount: 0, // 聊天未读消息数
    showToast: false,   // 是否显示提示
    toastMessage: ''    // 提示消息
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 获取聊天未读消息数（模拟数据）
    this.setData({
      chatUnreadCount: 3 // 示例数据，实际应从全局状态或API获取
    });
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
      title: '分享给好友',
      path: '/pages/share/share',
      imageUrl: '/images/share-cover.png' // 分享封面图
    };
  },

  /**
   * 点击分享平台
   */
  onSharePlatformTap: function(e) {
    const platform = e.currentTarget.dataset.platform;
    
    // 根据不同平台执行不同的分享逻辑
    switch(platform) {
      case 'wechat':
        this.showToast('分享给微信好友');
        break;
      case 'wechat-group':
        this.showToast('分享到微信群');
        break;
      case 'moments':
        this.showToast('分享到朋友圈');
        break;
      case 'weibo':
        this.showToast('分享到微博');
        break;
      case 'qq':
        this.showToast('分享给QQ好友');
        break;
      case 'other':
        this.showToast('分享到其他平台');
        break;
      default:
        this.showToast('分享功能开发中');
    }
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
   * 返回上一页
   */
  navigateBack: function() {
    wx.navigateBack();
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
  }
})