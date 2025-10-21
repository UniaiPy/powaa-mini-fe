// pages/avatar/avatar.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    messages: [
      {
        id: 1,
        type: 'ai',
        content: '你好！我是你的AI分身助手。我可以帮你做很多事情，比如创建AI头像、生成智能对话、分析数据等。有什么我可以帮助你的吗？',
        timestamp: Date.now() - 1800000
      },
      {
        id: 2,
        type: 'user',
        content: '我想创建一个个性化的AI分身头像',
        timestamp: Date.now() - 1740000
      },
      {
        id: 3,
        type: 'ai',
        content: '太好了！我们有多种AI头像风格可以选择，包括写实风格、漫画风格、动漫风格等。你有什么特别的偏好吗？',
        timestamp: Date.now() - 1680000
      }
    ],
    inputValue: '',
    showFunctionMenu: false,
    showAIMenu: false,
    showModelMenu: false,
    isAIToggleOn: true,
    selectedModel: '高级模型',
    aiStatus: 'online',
    inputType: 'text' // 'text' 或 'voice'
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 初始化聊天滚动到底部
    setTimeout(() => {
      this.scrollToBottom();
    }, 100);
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 可以在这里处理页面显示时的逻辑
  },

  /**
   * 输入框内容变化
   */
  onInput(e) {
    this.setData({
      inputValue: e.detail.value
    });
  },

  /**
   * 发送消息
   */
  sendMessage() {
    const content = this.data.inputValue.trim();
    if (!content) return;

    // 添加用户消息
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: content,
      timestamp: Date.now()
    };

    this.setData({
      messages: [...this.data.messages, userMessage],
      inputValue: ''
    });

    // 滚动到底部
    this.scrollToBottom();

    // 模拟AI回复
    this.simulateAIResponse();
  },

  /**
   * 模拟AI回复
   */
  simulateAIResponse() {
    // 模拟网络延迟
    setTimeout(() => {
      const aiResponses = [
        '这个想法很不错！我可以帮你实现这个功能。',
        '感谢你的提问，我会为你详细解答。',
        '关于这个问题，我有几点建议...',
        '让我思考一下如何最好地帮助你。',
        '好的，我理解了你的需求，接下来我们可以这样做...'
      ];

      const randomIndex = Math.floor(Math.random() * aiResponses.length);
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: aiResponses[randomIndex],
        timestamp: Date.now()
      };

      this.setData({
        messages: [...this.data.messages, aiMessage]
      });

      // 滚动到底部
      this.scrollToBottom();
    }, 1000);
  },

  /**
   * 切换功能菜单显示
   */
  toggleFunctionMenu() {
    this.setData({
      showFunctionMenu: !this.data.showFunctionMenu,
      showAIMenu: false,
      showModelMenu: false
    });
  },

  /**
   * 切换AI菜单显示
   */
  toggleAIMenu() {
    this.setData({
      showAIMenu: !this.data.showAIMenu,
      showFunctionMenu: false,
      showModelMenu: false
    });
  },

  /**
   * 切换模型菜单显示
   */
  toggleModelMenu() {
    this.setData({
      showModelMenu: !this.data.showModelMenu,
      showFunctionMenu: false,
      showAIMenu: false
    });
  },

  /**
   * 切换AI状态
   */
  toggleAIStatus() {
    const isOn = !this.data.isAIToggleOn;
    this.setData({
      isAIToggleOn: isOn,
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
   * 选择模型
   */
  selectModel(e) {
    const modelName = e.currentTarget.dataset.model;
    this.setData({
      selectedModel: modelName,
      showModelMenu: false
    });
    console.log('选择了模型:', modelName);
  },

  /**
   * 切换输入类型（文本/语音）
   */
  toggleInputType() {
    this.setData({
      inputType: this.data.inputType === 'text' ? 'voice' : 'text'
    });
  },

  /**
   * 按住说话开始
   */
  startVoiceRecording() {
    console.log('开始录音');
    // 这里可以添加微信小程序的录音API调用
  },

  /**
   * 结束录音并发送
   */
  stopVoiceRecording() {
    console.log('结束录音');
    // 这里可以添加录音处理和发送逻辑
    
    // 模拟语音转文本并发送
    const voiceContent = '这是一段语音消息';
    const voiceMessage = {
      id: Date.now(),
      type: 'user',
      content: voiceContent,
      isVoice: true,
      timestamp: Date.now()
    };

    this.setData({
      messages: [...this.data.messages, voiceMessage]
    });

    // 滚动到底部
    this.scrollToBottom();

    // 模拟AI回复
    this.simulateAIResponse();
  },

  /**
   * 点击功能项
   */
  onFunctionItemClick(e) {
    const functionType = e.currentTarget.dataset.type;
    console.log('点击了功能:', functionType);
    
    // 根据不同功能类型执行不同操作
    switch (functionType) {
      case 'image':
        console.log('选择图片');
        break;
      case 'file':
        console.log('选择文件');
        break;
      case 'location':
        console.log('发送位置');
        break;
      case 'emoji':
        console.log('选择表情');
        break;
    }

    // 关闭菜单
    this.setData({
      showFunctionMenu: false
    });
  },

  /**
   * 点击返回按钮
   */
  onBackPress() {
    wx.navigateBack();
  },

  /**
   * 滚动到底部
   */
  scrollToBottom() {
    wx.createSelectorQuery().select('.chat-container').boundingClientRect((rect) => {
      if (rect) {
        // 滚动到底部
        wx.pageScrollTo({
          scrollTop: rect.height,
          duration: 300
        });
      }
    }).exec();
  },

  /**
   * 点击AI报告图标
   */
  onAIReportClick() {
    console.log('查看AI报告');
    // 这里可以添加跳转到AI报告页面的逻辑
  },

  /**
   * 点击空白区域关闭所有菜单
   */
  onBackgroundTap() {
    this.setData({
      showFunctionMenu: false,
      showAIMenu: false,
      showModelMenu: false
    });
  },

  /**
   * 阻止事件冒泡
   */
  preventBubbling() {
    // 阻止事件冒泡到父元素
  }
});