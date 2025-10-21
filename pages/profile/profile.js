// pages/profile/profile.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 用户基本信息
    userInfo: {
      name: 'AI助手',
      aiStatus: '在线',
      statusColor: '#10B981',
      description: '我是您的智能AI助手，可以帮助您完成各种任务，提供专业建议，解答各类问题。无论是工作、学习还是生活中的疑问，都可以随时向我咨询。'
    },
    
    // 联系信息
    contactInfo: {
      phone: '138****8888',
      wechat: 'AI_assistant_888',
      address: '北京市朝阳区'
    },
    
    // 社交媒体列表
    socialMediaList: [
      {
        id: '1',
        name: 'GitHub',
        username: 'AI-Assistant',
        url: 'https://github.com/AI-Assistant',
        icon: 'icon-github',
        iconColor: 'text-gray-700'
      },
      {
        id: '2',
        name: '知乎',
        username: 'AI助手官方',
        url: 'https://zhihu.com/people/ai-assistant',
        icon: 'icon-zhihu',
        iconColor: 'text-blue-500'
      }
    ],
    
    // 支持的社交媒体平台
    platforms: [
      { name: 'GitHub', icon: 'icon-github', iconColor: 'text-gray-700' },
      { name: '知乎', icon: 'icon-zhihu', iconColor: 'text-blue-500' },
      { name: '微博', icon: 'icon-weibo', iconColor: 'text-red-500' },
      { name: '掘金', icon: 'icon-juejin', iconColor: 'text-blue-600' },
      { name: '微信', icon: 'icon-wechat', iconColor: 'text-green-600' },
      { name: '自定义', icon: '', iconColor: 'text-gray-600' }
    ],
    
    // 模态框状态
    showProfileModal: false,
    showContactModal: false,
    showSocialMediaModal: false,
    
    // 编辑状态数据
    editProfileDescription: '',
    editContactPhone: '',
    editContactWechat: '',
    editContactAddress: '',
    editSocialPlatformIndex: 0,
    editSocialPlatform: null,
    editCustomPlatformName: '',
    editSocialUsername: '',
    editSocialUrl: '',
    isEditingSocial: false,
    editingSocialId: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 初始化编辑数据
    this.setData({
      editProfileDescription: this.data.userInfo.description,
      editContactPhone: this.data.contactInfo.phone,
      editContactWechat: this.data.contactInfo.wechat,
      editContactAddress: this.data.contactInfo.address
    })
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 页面显示时的逻辑
  },

  /**
   * 导航到关于页面
   */
  navigateToAbout() {
    wx.showToast({
      title: '导航到关于页面',
      icon: 'none'
    })
  },

  /**
   * 打开预览
   */
  openPreview() {
    wx.showToast({
      title: '打开预览模式',
      icon: 'none'
    })
  },

  /**
   * 打开分享
   */
  openShare() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
  },

  /**
   * 显示个人资料编辑模态框
   */
  showProfileEditModal() {
    this.setData({
      editProfileDescription: this.data.userInfo.description,
      showProfileModal: true
    })
  },

  /**
   * 关闭个人资料编辑模态框
   */
  closeProfileEditModal() {
    this.setData({
      showProfileModal: false
    })
  },

  /**
   * 保存个人资料编辑
   */
  saveProfileEdit() {
    const updatedUserInfo = {
      ...this.data.userInfo,
      description: this.data.editProfileDescription
    }
    
    this.setData({
      userInfo: updatedUserInfo,
      showProfileModal: false
    })
    
    wx.showToast({
      title: '保存成功',
      icon: 'success'
    })
  },

  /**
   * 显示联系信息编辑模态框
   */
  showContactEditModal() {
    this.setData({
      editContactPhone: this.data.contactInfo.phone,
      editContactWechat: this.data.contactInfo.wechat,
      editContactAddress: this.data.contactInfo.address,
      showContactModal: true
    })
  },

  /**
   * 关闭联系信息编辑模态框
   */
  closeContactEditModal() {
    this.setData({
      showContactModal: false
    })
  },

  /**
   * 保存联系信息编辑
   */
  saveContactEdit() {
    // 简单验证
    if (!this.data.editContactPhone) {
      wx.showToast({
        title: '请输入手机号码',
        icon: 'none'
      })
      return
    }
    
    if (!this.data.editContactWechat) {
      wx.showToast({
        title: '请输入微信号',
        icon: 'none'
      })
      return
    }
    
    const updatedContactInfo = {
      phone: this.data.editContactPhone,
      wechat: this.data.editContactWechat,
      address: this.data.editContactAddress
    }
    
    this.setData({
      contactInfo: updatedContactInfo,
      showContactModal: false
    })
    
    wx.showToast({
      title: '保存成功',
      icon: 'success'
    })
  },

  /**
   * 显示社交媒体编辑模态框
   */
  showSocialMediaEditModal() {
    this.setData({
      editSocialPlatformIndex: 0,
      editSocialPlatform: this.data.platforms[0],
      editCustomPlatformName: '',
      editSocialUsername: '',
      editSocialUrl: '',
      isEditingSocial: false,
      editingSocialId: null,
      showSocialMediaModal: true
    })
  },

  /**
   * 编辑社交媒体
   */
  editSocialMedia(e) {
    const id = e.currentTarget.dataset.id
    const socialItem = this.data.socialMediaList.find(item => item.id === id)
    
    if (socialItem) {
      // 查找平台索引
      let platformIndex = 0
      const platform = this.data.platforms.find((p, index) => {
        platformIndex = index
        return p.name === socialItem.name
      })
      
      this.setData({
        editSocialPlatformIndex: platform ? platformIndex : 5, // 5 是自定义选项的索引
        editSocialPlatform: platform || { name: '自定义', icon: '', iconColor: 'text-gray-600' },
        editCustomPlatformName: platform ? '' : socialItem.name,
        editSocialUsername: socialItem.username,
        editSocialUrl: socialItem.url,
        isEditingSocial: true,
        editingSocialId: id,
        showSocialMediaModal: true
      })
    }
  },

  /**
   * 平台选择变化
   */
  onPlatformChange(e) {
    const index = e.detail.value
    const platform = this.data.platforms[index]
    
    this.setData({
      editSocialPlatformIndex: index,
      editSocialPlatform: platform,
      editCustomPlatformName: platform.name === '自定义' ? this.data.editCustomPlatformName : ''
    })
  },

  /**
   * 关闭社交媒体编辑模态框
   */
  closeSocialMediaEditModal() {
    this.setData({
      showSocialMediaModal: false
    })
  },

  /**
   * 保存社交媒体编辑
   */
  saveSocialMediaEdit() {
    // 简单验证
    if (this.data.editSocialPlatform.name === '自定义' && !this.data.editCustomPlatformName) {
      wx.showToast({
        title: '请输入自定义平台名称',
        icon: 'none'
      })
      return
    }
    
    if (!this.data.editSocialUsername) {
      wx.showToast({
        title: '请输入用户名',
        icon: 'none'
      })
      return
    }
    
    if (!this.data.editSocialUrl) {
      wx.showToast({
        title: '请输入主页链接',
        icon: 'none'
      })
      return
    }
    
    let updatedList = [...this.data.socialMediaList]
    const platformName = this.data.editSocialPlatform.name === '自定义' ? this.data.editCustomPlatformName : this.data.editSocialPlatform.name
    
    if (this.data.isEditingSocial) {
      // 编辑现有项
      updatedList = updatedList.map(item => {
        if (item.id === this.data.editingSocialId) {
          return {
            ...item,
            name: platformName,
            username: this.data.editSocialUsername,
            url: this.data.editSocialUrl,
            icon: this.data.editSocialPlatform.icon || '',
            iconColor: this.data.editSocialPlatform.iconColor
          }
        }
        return item
      })
    } else {
      // 添加新项
      const newItem = {
        id: Date.now().toString(),
        name: platformName,
        username: this.data.editSocialUsername,
        url: this.data.editSocialUrl,
        icon: this.data.editSocialPlatform.icon || '',
        iconColor: this.data.editSocialPlatform.iconColor
      }
      updatedList.push(newItem)
    }
    
    this.setData({
      socialMediaList: updatedList,
      showSocialMediaModal: false
    })
    
    wx.showToast({
      title: this.data.isEditingSocial ? '更新成功' : '添加成功',
      icon: 'success'
    })
  },

  /**
   * 删除社交媒体
   */
  deleteSocialMedia(e) {
    const id = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个社交媒体账号吗？',
      success: (res) => {
        if (res.confirm) {
          const updatedList = this.data.socialMediaList.filter(item => item.id !== id)
          this.setData({
            socialMediaList: updatedList
          })
          
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          })
        }
      }
    })
  },

  /**
   * 从模态框中删除社交媒体
   */
  deleteSocialMediaFromModal() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个社交媒体账号吗？',
      success: (res) => {
        if (res.confirm) {
          const updatedList = this.data.socialMediaList.filter(item => item.id !== this.data.editingSocialId)
          this.setData({
            socialMediaList: updatedList,
            showSocialMediaModal: false
          })
          
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          })
        }
      }
    })
  },

  /**
   * 阻止冒泡
   */
  preventBubbling() {
    // 阻止事件冒泡到模态框背景
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: `${this.data.userInfo.name}的AI名片`,
      path: '/pages/profile/profile',
      imageUrl: '/images/ai.png'
    }
  }
})