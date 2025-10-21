// components/bottom-nav/bottom-nav.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    unreadCount: {
      type: Number,
      value: 0
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 导航到聊天页面
    navigateToChat: function() {
      wx.navigateTo({
        url: '/pages/chat/chat'
      });
    },

    // 导航到AI分身页面
    navigateToAvatar: function() {
      wx.navigateTo({
        url: '/pages/avatar/avatar'
      });
    },

    // 导航到名片页面
    navigateToProfile: function() {
      wx.navigateTo({
        url: '/pages/profile/profile'
      });
    }
  }
})