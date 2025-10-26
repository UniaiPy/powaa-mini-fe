// pages/conversation/conversation.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    // 聊天消息数据
    messages: [
      {
        id: 1,
        type: 'other', // 对方消息
        content: 'Hello! 有什么我可以帮助你的吗？',
        time: '10:30',
        avatar: '/images/ai.png'
      },
      {
        id: 2,
        type: 'user', // 我的消息
        content: '你好，我想了解一下你们的产品功能。',
        time: '10:31',
        avatar: '/images/ai.png'
      },
      {
        id: 3,
        type: 'other', // 对方消息
        content: '我们提供AI智能问答、知识库管理、多端同步等功能。你对哪个功能最感兴趣呢？',
        time: '10:32',
        avatar: '/images/ai.png'
      }
    ],
    // 输入框内容
    inputValue: '',
    // 是否显示更多选项菜单
    showMoreOptions: false,
    // 是否显示功能菜单
    showFunctionMenu: false,
    // 是否显示AI分身菜单
    showAiMenu: false,
    // AI分身是否在线
    aiOnline: true,
    aiStatus: 'online',
    // 当前聊天对象信息
    chatInfo: {
      name: 'AI助手',
      avatar: '/images/ai.png'
    },
    // 语音录制状态
    isRecording: false,
    // 是否为语音模式
    isVoiceMode: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // console.log(decodeURIComponent(options.user));
    let userInfo=JSON.parse(decodeURIComponent(options.user));
    wx.setNavigationBarTitle({
      title: userInfo.name,
    })
    // 从URL参数中获取聊天对象信息
    if (userInfo.id && userInfo.name) {
      this.setData({
        chatInfo: {
          name: userInfo.name || 'AI助手',
          avatar: userInfo.avatar || '/images/ai.png'
        }
      })
    }
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {
    // 页面渲染完成后，滚动到底部
    this.scrollToBottom()
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 页面显示时，滚动到底部
    this.scrollToBottom()
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {
    // 隐藏所有菜单
    this.hideAllMenus()
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {
    // 清理资源
  },

  /**
   * 隐藏所有菜单
   */
  hideAllMenus() {
    this.setData({
      showMoreOptions: false,
      showFunctionMenu: false,
      showAiMenu: false
    })
  },

  /**
   * 滚动到底部
   */
  scrollToBottom() {
    setTimeout(() => {
      const query = wx.createSelectorQuery()
      query.select('#chat-container').boundingClientRect()
      query.selectViewport().scrollOffset()
      query.exec(res => {
        if (res && res[0] && res[1]) {
          wx.pageScrollTo({
            scrollTop: res[1].scrollTop + res[0].height,
            duration: 0
          })
        }
      })
    }, 100)
  },

  /**
   * 输入框内容变化
   */
  onInput(e) {
    this.setData({
      inputValue: e.detail.value
    })
  },

  /**
   * 发送消息
   */
  sendMessage() {
    const { inputValue, messages } = this.data
    if (!inputValue.trim()) return

    // 创建新消息
    const newMessage = {
      id: Date.now(),
      type: 'user',
      content: inputValue.trim(),
      time: this.getCurrentTime(),
      avatar: '/images/ai.png'
    }

    // 更新消息列表
    const updatedMessages = [...messages, newMessage]
    this.setData({
      messages: updatedMessages,
      inputValue: ''
    })

    // 滚动到底部
    this.scrollToBottom()

    // 模拟AI回复
    setTimeout(() => {
      this.simulateAiReply(updatedMessages)
    }, 800)
  },

  /**
   * 模拟AI回复
   */
  simulateAiReply(currentMessages) {
    // 预设一些回复内容
    const replies = [
      '好的，我明白了。',
      '这是个很好的问题！',
      '让我为您详细解释一下。',
      '根据您的需求，我推荐您尝试...',
      '这个功能确实非常实用！'
    ]

    // 随机选择一个回复
    const randomReply = replies[Math.floor(Math.random() * replies.length)]
    
    const aiMessage = {
      id: Date.now(),
      type: 'other',
      content: randomReply,
      time: this.getCurrentTime(),
      avatar: '/images/ai.png'
    }

    this.setData({
      messages: [...currentMessages, aiMessage]
    })

    // 滚动到底部
    this.scrollToBottom()
  },

  /**
   * 获取当前时间
   */
  getCurrentTime() {
    const date = new Date()
    const hours = date.getHours().toString().padStart(2, '0')
    const minutes = date.getMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  },

  /**
   * 切换更多选项菜单
   */
  toggleMoreOptions() {
    this.setData({
      showMoreOptions: !this.data.showMoreOptions,
      showFunctionMenu: false,
      showAiMenu: false
    })
  },

  /**
   * 切换功能菜单
   */
  showPlusMenu() {
    this.setData({
      showFunctionMenu: !this.data.showFunctionMenu,
      showMoreOptions: false,
      showAiMenu: false
    })
  },

  /**
   * 切换AI分身菜单
   */
  toggleAiMenu() {
    this.setData({
      showAiMenu: !this.data.showAiMenu,
      showMoreOptions: false,
      showFunctionMenu: false
    })
  },

  /**
   * 切换AI分身状态
   */
  toggleAiOnline(e) {
    const isOn = !this.data.aiOnline;
    console.log('切换AI状态:', isOn);
    this.setData({
      aiOnline: isOn,
      aiStatus: isOn ? 'online' : 'offline'
    });

    // 可以在这里添加AI状态切换的逻辑
    if (isOn) {
      // AI上线逻辑
      console.log('AI已上线');
    } else {
      // AI下线逻辑
      console.log('AI已下线');
    }
  },

  /**
   * 点击AI分身按钮
   */
  onAiButtonClick() {
    // 如果AI在线，发送AI建议消息
    if (this.data.aiOnline) {
      const { messages } = this.data
      const aiSuggestion = {
        id: Date.now(),
        type: 'other',
        content: '根据我们的对话，我有一个建议...',
        time: this.getCurrentTime(),
        avatar: '/images/ai.png'
      }

      this.setData({
        messages: [...messages, aiSuggestion]
      })

      this.scrollToBottom()
    } else {
      // AI不在线时显示菜单
      this.toggleAiMenu()
    }
  },

  /**
   * 切换语音输入模式
   */
  toggleVoiceMode() {
    this.setData({
      isVoiceMode: !this.data.isVoiceMode
    })
  },

  /**
   * 开始录音
   */
  startRecording() {
    this.setData({ isRecording: true })
    // 这里应该调用录音API，暂时用模拟
    console.log('开始录音')
  },

  /**
   * 结束录音
   */
  stopRecording() {
    this.setData({ isRecording: false })
    // 这里应该停止录音并处理音频文件，暂时用模拟
    console.log('停止录音')
    // 模拟发送语音消息
    this.sendVoiceMessage()
  },

  /**
   * 发送语音消息
   */
  sendVoiceMessage() {
    const { messages } = this.data
    // 模拟语音消息
    const voiceMessage = {
      id: Date.now(),
      type: 'user',
      content: '[语音消息]',
      time: this.getCurrentTime(),
      avatar: '/images/ai.png',
      isVoice: true
    }

    this.setData({
      messages: [...messages, voiceMessage]
    })

    this.scrollToBottom()

    // 模拟AI回复
    setTimeout(() => {
      this.simulateAiReply([...messages, voiceMessage])
    }, 1000)
  },

  /**
   * 返回上一页
   */
  goBack() {
    wx.navigateBack()
  },
  /**
   * 点击功能项
   */
  onFunctionItemClick(e) {
    const functionType = e.currentTarget.dataset.type;
    // console.log('点击了功能:', functionType);
    
    // 根据不同功能类型执行不同操作
    switch (functionType) {
      case 'image':
        this.selectImage()
        break;
      case 'file':
        this.selectFile()
        break;
      case 'location':
        this.selectLocation()
        break;
      case 'emoji':
        this.selectEmoji()
        break;
    }

    // 关闭菜单
    this.setData({
      showFunctionMenu: false
    });
  },
  /**
   * 选择图片
   */
  selectImage() {
    wx.chooseImage({
      count: 9,
      success: (res) => {
        console.log('选择的图片:', res.tempFilePaths)
        // 这里可以处理图片发送逻辑
        this.hideAllMenus()
      }
    })
  },

  /**
   * 选择文件
   */
  selectFile() {
    wx.chooseMessageFile({
      count: 10,
      type: 'file',
      success: (res) => {
        console.log('选择的文件:', res.tempFiles)
        // 这里可以处理文件发送逻辑
        this.hideAllMenus()
      }
    })
  },

  /**
   * 选择位置
   */
  selectLocation() {
    wx.chooseLocation({
      success: (res) => {
        console.log('选择的位置:', res)
        // 这里可以处理位置发送逻辑
        this.hideAllMenus()
      }
    })
  },

  /**
   * 显示表情选择器
   */
  selectEmoji() {
    console.log('显示表情选择器')
    this.hideAllMenus()
  },

  /**
   * 点击页面空白处，关闭所有菜单
   */
  onPageTap() {
    this.hideAllMenus()
  },

  /**
   * 点击菜单外部，关闭菜单
   */
  onOutsideTap(e) {
    // 检查点击目标是否在菜单外部
    const { target } = e
    if (!target.dataset.menu) {
      this.hideAllMenus()
    }
  },

  /**
   * 导航到预览页面
   */
  navigateToPreview() {
    wx.navigateTo({
      url: '/pages/preview/preview?type=avatar'
    })
  },



  /**
   * 分享名片
   */
  shareCard() {
    wx.navigateTo({
      url: '/pages/share/share'
    })
  },

  /**
   * 屏蔽用户
   */
  blockUser() {
    wx.showModal({
      title: '确认屏蔽',
      content: '屏蔽后，您将不再收到该用户的消息，确定要屏蔽吗？',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '已屏蔽用户',
            icon: 'success'
          })
        }
      }
    })
    this.hideAllMenus()
  },

  /**
   * 举报用户
   */
  reportUser() {
    wx.showModal({
      title: '确认举报',
      content: '举报后，我们会尽快处理您的举报信息，感谢您的反馈。',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({
            title: '举报成功',
            icon: 'success'
          })
        }
      }
    })
    this.hideAllMenus()
  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    // 下拉加载历史消息
    console.log('下拉加载历史消息')
    wx.stopPullDownRefresh()
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {
    // 加载更多消息
    console.log('加载更多消息')
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    const { chatInfo } = this.data
    return {
      title: `与${chatInfo.name}的对话`,
      path: `/pages/conversation/conversation?userName=${encodeURIComponent(chatInfo.name)}`
    }
  },

  /**
   * 导航到用户资料页面
   */
  navigateToUserProfile() {
    console.log('导航到用户资料页面')
    wx.switchTab({
      url: '/pages/profile/profile'
    })
  },

  /**
   * 导航到聊天列表页面
   */
  navigateToChat() {
    wx.navigateTo({
      url: '/pages/chat/chat'
    })
  }
})