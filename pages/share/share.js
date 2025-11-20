// pages/share/share.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    chatUnreadCount: 0, // 聊天未读消息数
    showToast: false,   // 是否显示提示
    toastMessage: '',   // 提示消息
    userSocialMedia: [], // 用户社交媒体列表
    currentUserId: null, // 当前用户ID
    previewUrl: '' // 预览页面URL
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 获取聊天未读消息数（模拟数据）
    this.setData({
      chatUnreadCount: 3 // 示例数据，实际应从全局状态或API获取
    });
    
    // 获取当前用户信息
    const app = getApp();
    const userId = app.globalData.userInfo?.id || '';
    
    if (userId) {
      this.setData({
        currentUserId: userId,
        previewUrl: `/pages/preview/preview?userId=${userId}`
      });
      
      // 获取用户社交媒体信息
      this.fetchUserSocialMedia();
    }
  },
  
  /**
   * 获取用户社交媒体信息
   */
  fetchUserSocialMedia: function() {
    const app = getApp();
    
    app.request({
      url: `/api/users/social-media`,
      method: 'GET',
      success: (res) => {
        if (res.code === 0 && res.data) {
          // 过滤出有效的社交媒体
          const validSocialMedia = res.data.filter(item => item.url);
          
          this.setData({
            userSocialMedia: validSocialMedia
          });
        }
      },
      fail: (err) => {
        console.error('获取用户社交媒体信息失败:', err);
      }
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

  // /**
  //  * 用户点击右上角分享
  //  */
  // onShareAppMessage: function () {
  //   return {
  //     title: '我的AI分身名片',
  //     path: this.data.previewUrl,
  //     imageUrl: '/images/ai.png' // 使用存在的图片作为分享封面
  //   };
  // },
  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    const app = getApp()
    const userId = app.globalData.userInfo.id;
    return {
      title: `${app.globalData.userInfo.nickname}的AI名片`,
      path: `/pages/preview/preview?type=profile&userId=${userId}`,
      imageUrl: '/images/ai.png'
    }
  },
  onShareTimeline() {
    const app = getApp()
    const userId = app.globalData.userInfo.id;
    return {
      title: `${app.globalData.userInfo.nickname}的AI名片`,
      path: `/pages/preview/preview?type=profile&userId=${userId}`,
      imageUrl: '/images/ai.png'
    }
  },

  /**
   * 点击分享平台
   */
  onSharePlatformTap: function(e) {
    const platform = e.currentTarget.dataset.platform;
    const socialId = e.currentTarget.dataset.id;
    console.log('点击分享平台:', platform, socialId);
    // 处理微信相关分享（分享预览页面）
    
    if (platform === 'moments') {
      // 朋友圈分享
      // 弹窗提示点击右上角分享到朋友圈
      wx.showToast({
        title: '点击右上角···分享到朋友圈',
        icon: 'none'
      })
      // wx.showShareImageMenu({
      //   path: '/images/share-cover.png',
      //   success: () => {
      //     this.showToast('分享到朋友圈成功');
      //   },
      //   fail: (err) => {
      //     console.error('朋友圈分享失败:', err);
      //     this.showToast('分享失败');
      //   }
      // });
      
    } else if (socialId) {
      // 处理用户自定义社交媒体（复制链接）
      const socialItem = this.data.userSocialMedia.find(item => item.id === socialId);
      if (socialItem && socialItem.url) {
        wx.setClipboardData({
          data: socialItem.url,
          success: () => {
            // 立即隐藏系统默认提示
            wx.hideToast();
            // 然后显示自定义提示
            this.showToast(`已复制${socialItem.name}链接`);
          },
          fail: () => {
            this.showToast('复制链接失败');
          }
        });
      }
    } else {
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
})