// pages/preview/preview.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    aiStatus: 'active',      // AI分身状态（active/ inactive）
    chatUnreadCount: 0,      // 聊天未读消息数
    showMatchDegreeModal: false, // 是否显示匹配度说明弹窗
    showChatModal: false,     // 是否显示聊天弹窗
    showToast: false,         // 是否显示提示
    toastMessage: '',         // 提示消息
    greetingMessage: '你好，很高兴认识你！' // 打招呼消息
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 获取聊天未读消息数（模拟数据）
    this.setData({
      chatUnreadCount: 3 // 示例数据，实际应从全局状态或API获取
    });
    
    // 保存传递过来的参数
    const app = getApp();
    const currentUserId = app.globalData.userInfo?.id;
    const targetUserId = options.userId || '';
    const type = options.type || '';
    
    this.setData({
      userId: targetUserId,
      type: type,
      // 判断是否为当前用户自己的名片（确保类型一致并进行空值检查）
      isOwnProfile: currentUserId && targetUserId && String(currentUserId) === String(targetUserId)
    });
    // 加载用户个人资料数据
    this.loadProfileData();
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
    const userId = this.data.userId;
    return {
      title: '预览名片',
      path: `/pages/preview/preview?userId=${userId}&type=${this.data.type}`,
      imageUrl: '/images/share-cover.png' // 分享封面图
    };
  },

  /**
   * 导航到个人资料页面
   */
  navigateToProfile: function() {
    const userId = this.data.userId;
    wx.navigateTo({
      url: `/pages/profile/profile?userId=${userId}`
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
    
    if (!message || message.trim() === '') {
      this.showToast('请输入打招呼消息');
      return;
    }
    
    // 显示加载状态
    wx.showLoading({
      title: '发送中...',
    });
    
    // 构建目标用户对象
    const targetUser = {
      id: this.data.userId,
      userID: this.data.userId, // 腾讯云IM使用userID字段
      name: this.data.userInfo?.name || '用户',
      avatar: this.data.avatarUrl || ''
    };
    
    // 检查TUIKit是否已初始化
    if (!wx.$TUIKit) {
      console.error('TUIKit未初始化');
      wx.hideLoading();
      this.showToast('IM服务未初始化，请稍后重试');
      return;
    }
    
    // 调用腾讯云IM添加好友API
    wx.$TUIKit.addFriend({
      to: targetUser.userID,
      source: 'AddSource_Type_Web',
      remark: '',
      wording: message, // 使用打招呼消息作为验证消息
      type: 1, // 单向好友
      addWording: message
    }).then(res => {
      console.log('添加好友成功:', res);
      wx.hideLoading();
      
      // 关闭弹窗
      this.closeChatModal();
      
      // 显示成功提示
      this.showToast('好友请求已发送');
      
      // 跳转到聊天页面
      setTimeout(() => {
        wx.navigateTo({
          url: `/pages/chat/chat?userId=${targetUser.userID}&userName=${encodeURIComponent(targetUser.name)}`
        });
      }, 1000);
      
    }).catch(err => {
      console.error('添加好友失败:', err);
      wx.hideLoading();
      
      // 处理特定错误码
      if (err.code === 10009) {
        this.showToast('已经是好友关系');
        // 已经是好友，直接跳转到聊天页面
        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/chat/chat?userId=${targetUser.userID}&userName=${encodeURIComponent(targetUser.name)}`
          });
        }, 1000);
      } else if (err.code === 10010) {
        this.showToast('好友申请已发送，请等待对方同意');
        this.closeChatModal();
      } else {
        // 尝试通过后端API发送好友请求
        this.sendFriendRequestViaBackend(targetUser, message);
      }
    });
  },

  /**
   * 通过后端API发送好友请求（备用方案）
   */
  sendFriendRequestViaBackend: function(targetUser, message) {
    const app = getApp();
    
    app.request({
      url: '/api/friendships/request',
      method: 'POST',
      data: {
        toUserId: targetUser.userID,
        message: message,
        source: 'preview_page'
      },
      success: (res) => {
        console.log('通过后端发送好友请求成功:', res);
        
        if (res.code === 0) {
          this.closeChatModal();
          this.showToast('好友请求已发送');
        } else {
          this.showToast(res.message || '发送失败，请稍后重试');
        }
      },
      fail: (error) => {
        console.error('通过后端发送好友请求失败:', error);
        this.showToast('网络错误，请稍后重试');
      }
    });
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
    const userId = this.data.userId;
    wx.navigateTo({
      url: `/pages/profile/profile?userId=${userId}`
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
   * 加载用户个人资料数据
   */
  loadProfileData: function() {
    const app = getApp();
    
    wx.showLoading({
      title: '加载中...',
    });
    
    const userId = this.data.userId;
    const requestUrl = `/api/users/profile/${userId}`;
    
    app.request({
      url: requestUrl,
      method: 'GET',
      success: (res) => {
        console.log('获取用户信息成功:', res);
        
        if (res.code === 0 && res.data) {
          // 更新页面数据
          const updateData = {};
          
          // 更新用户基本信息
          if (res.data.userInfo) {
            updateData.userInfo = res.data.userInfo;
            // 更新打招呼消息中的用户名
            if (res.data.userInfo.name) {
              updateData.greetingMessage = `你好，${res.data.userInfo.name}！很高兴认识你！`;
            }
          }
          
          // 更新联系信息
          if (res.data.contactInfo) {
            updateData.contactInfo = res.data.contactInfo;
          }
          
          // 更新社交媒体列表
          if (res.data.socialMediaList) {
            updateData.socialMediaList = res.data.socialMediaList;
          }
          
          // 更新头像
          if (res.data.avatar_url) {
            updateData.avatarUrl = res.data.avatar_url;
          }
          
          // 设置页面数据
          this.setData(updateData);
        } else {
          this.showToast(res.message || '获取用户信息失败');
        }
      },
      fail: (error) => {
        console.error('获取用户信息失败:', error);
        this.showToast('网络错误，请稍后重试');
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },

  // 复制社交媒体链接
  copySocialMedia(e) {
    const url = e.currentTarget.dataset.url
    wx.setClipboardData({
      data: url,
      success: () => {
        wx.showToast({
          title: '链接已复制',
          icon: 'success'
        })
      },
      fail: () => {
        this.showToast('复制失败');
      }
    })
  }
})