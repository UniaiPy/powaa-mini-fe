// pages/profile/profile.js
import TencentCloudChat from '../../utils/@tencentcloud/lite-chat/professional';
Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 编辑状态
    isEditing: false,
    
    // 用户基本信息
    userInfo: {
      name: '点击设置昵称',
      aiStatus: '在线',
      description: ''
    },
    
    // 联系信息
    contactInfo: {
      phone: '',
      wechat: '',
      address: ''
    },
    
    // 社交媒体列表
    socialMediaList: [],
    
    // 头像URL - 直接使用后端返回的临时访问URL
    avatarUrl: '',
    
    // 支持的社交媒体平台（默认为空，将从后端获取）
    platforms: [],
    
    // 模态框状态
    showProfileModal: false,
    showContactModal: false,
    showSocialMediaModal: false,
    showProfileAuthModal: false,
    
    // 编辑状态数据
    // 编辑状态数据
    editProfileDescription: '',     // 个人简介编辑框的临时存储值
    editContactPhone: '',           // 联系电话编辑框的临时存储值
    editContactWechat: '',          // 微信号编辑框的临时存储值
    editContactAddress: '',         // 地址编辑框的临时存储值

    editSocialPlatformIndex: 0,     // 当前选择的社交媒体平台在platforms数组中的索引位置
    editSocialPlatform: null,       // 当前选择的社交媒体平台对象（包含name、icon等信息）
    editSocialPlatformId: null,     // 当前选择的社交媒体平台ID（用于后端查询）

    editSocialPlatformName: '',     // 当前选择的社交媒体平台名称（用于显示）
    editSocialUsername: '',         // 社交媒体用户名编辑框的临时存储值
    editSocialUrl: '',              // 社交媒体主页链接编辑框的临时存储值
    isEditingSocial: false,         // 标记当前是编辑现有社交媒体还是添加新的社交媒体
    editingSocialId: null,          // 当前正在编辑的社交媒体记录ID
    tempAvatarUrl: '',              // 临时头像URL（用于上传预览）
    tempAvatarKey: null,            // 临时头像在OSS存储的key
    tempNickname: ''                // 临时昵称（用于显示编辑前的昵称）
  },
  
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    // 获取社交媒体平台列表
    this.fetchSocialPlatforms()
  },
  
  /**
   * 获取社交媒体平台列表
   */
  fetchSocialPlatforms() {
    const app = getApp();
    if (!app.isLoggedIn()) {
      return;
    }
    // 使用全局request方法发送请求
    app.request({
      url: '/api/users/social-platforms',
      method: 'GET',
      success: (res) => {
        // 根据后端返回格式判断成功与否
        if ((res.code === 0 || res.success) && res.data?.platforms) {
          this.setData({
            platforms: res.data.platforms
          });
          console.log('成功获取社交媒体平台列表:', res.data.platforms);
        } else {
          console.warn('获取社交媒体平台列表失败，使用默认值');
        }
      },
      fail: (err) => {
        console.error('获取社交媒体平台列表请求失败:', err);
      },
      complete: () => {
        // 请求完成后重置标志
      }
    });
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    // 从全局数据获取用户信息
    const app = getApp()
    if (!app.isLoggedIn()) {
      console.warn('用户未登录，无法获取用户信息')
      this.setData({
        isLoggedIn: false
      })
      return;
    }
    this.setData({
      isLoggedIn: true
    })
    const globalUserInfo = app.globalData.userInfo
    console.log('从全局获取用户信息:', globalUserInfo)
    if (globalUserInfo) {
      // 准备更新的数据
      const updateData = {}
      
      // 检查是否需要更新昵称（优先使用全局数据中的昵称）
      if (globalUserInfo.nickname && globalUserInfo.nickname !== this.data.userInfo.name) {
        updateData['userInfo.name'] = globalUserInfo.nickname
      }
      
      // 检查是否需要更新手机号（优先使用全局数据中的手机号）
      if (globalUserInfo.phone_number && globalUserInfo.phone_number !== this.data.contactInfo.phone) {
        updateData['contactInfo.phone'] = globalUserInfo.phone_number
        updateData.editContactPhone = globalUserInfo.phone_number
      }
      
      // 处理头像URL - 后端已返回临时访问URL，可以直接使用
      if (globalUserInfo.avatar_url) {
        this.setData({ avatarUrl: globalUserInfo.avatar_url })
      }
      
      // 有数据更新时才调用setData
      if (Object.keys(updateData).length > 0) {
        this.setData(updateData)
      }
    }

    // 获取最新的用户名片数据
    this.fetchUserProfileData();
    //控制右上角。。。中的分享按钮的显示
    this.checkIsTrained();
    this.checkUserInfoComplete();
  },
  async checkIsTrained() {
    try {
      // 获取当前AI分身的训练状态
      const app = getApp();
      const result = await new Promise((resolve, reject) => {
        app.request({
          url: '/api/ai-avatars/is_trained',
          method: 'GET',
          success: (res) => {
            resolve(res);
          },
          fail: (error) => {
            reject(error);
          }
        });
      });
      // 检查训练状态
      if (result.success && result.data && result.data.status === 'active') {
        // 训练已完成
        this.setData({
          isTrained: true
        })
        if(app.checkUserInfoComplete({ redirect: false })){
          wx.showShareMenu({
            menus: ['shareAppMessage', 'shareTimeline']
          })
        }
      } else {
        // 训练未完成
        this.setData({
          isTrained: false
        })
        wx.hideShareMenu({
          menus: ['shareAppMessage', 'shareTimeline']
        })
      }
    } catch (error) {
      // 处理请求错误
      console.error('获取AI训练状态失败:', error);
    }
  },
  checkUserInfoComplete() {
    const app = getApp()
    if (!app.checkUserInfoComplete({ redirect: false })) {
      this.setData({
        isUserInfoComplete: false
      })
    }else{
      this.setData({
        isUserInfoComplete: true
      })
    }
    
  },
  showToastInfo() {
    const app = getApp()
    if (!app.isLoggedIn()) {
      // 用户未登录，提示登录
      wx.showModal({
      title: '请登录',
      content: '您需要先登录才能分享名片',
      showCancel: true,
      cancelText: '取消',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({
            url: '/pages/login/login'
          })
        }
      }
    })
      return;
    }
    if (!app.checkUserInfoComplete()) {
      return
    }
    if (!this.data.isTrained) {
      // AI分身未训练，提示训练
      wx.showToast({
        title: '请先完成AI分身训练',
        icon: 'none'
      })
      setTimeout(() => {
        wx.switchTab({
          url: '/pages/avatar/avatar'
        })
      }, 2000)
      return
    }
  },
  toggleEditing() {
    this.setData({
      isEditing: !this.data.isEditing
    })
  },
  /**
   * 从后台获取用户名片数据
   */
  fetchUserProfileData() {
    const app = getApp()
    
    // 检查token是否存在
    if (!app.globalData.token) {
      console.error('token不存在，无法获取用户名片数据')
      return
    }
    
    // 使用全局request方法发送请求
    const userId = app.globalData.userInfo?.id || this.data.userInfo?.id;
    app.request({
      url: `/api/users/profile/${userId}`,
      method: 'GET',
      success: async (res) => {
        // 根据后端实际返回格式判断成功与否：code=0表示成功
        if ((res.code === 0 || res.success) && res.data) {
          const profileData = res.data
          const updateData = {}
          
          console.log('获取到的用户名片数据:', profileData)
          
          // 更新用户基本信息
          if (profileData.userInfo) {
            updateData.userInfo = {
              name: profileData.userInfo.name || '请编辑您的昵称',
              aiStatus: profileData.userInfo.aiStatus || '在线',
              description: profileData.userInfo.description || ''
            }
          }
          
          // 更新联系信息
          if (profileData.contactInfo) {
            updateData.contactInfo = {
              phone: profileData.contactInfo.phone || '',
              wechat: profileData.contactInfo.wechat || '',
              address: profileData.contactInfo.address || ''
            }
          }
          
          // 更新社交媒体列表
          if (profileData.socialMediaList && Array.isArray(profileData.socialMediaList)) {
            updateData.socialMediaList = profileData.socialMediaList
          }
          
          // 更新编辑框数据，确保使用当前数据作为回退
          updateData.editProfileDescription = updateData.userInfo?.description || this.data.userInfo.description
          updateData.editContactPhone = updateData.contactInfo?.phone || this.data.contactInfo.phone
          updateData.editContactWechat = updateData.contactInfo?.wechat || this.data.contactInfo.wechat
          updateData.editContactAddress = updateData.contactInfo?.address || this.data.contactInfo.address
          
          // 处理头像URL - 后端已返回临时访问URL，可以直接使用
          if (profileData.avatar_url) {
            updateData.avatarUrl = profileData.avatar_url
          }
          
          // 一次性更新所有数据，确保数据一致性
          if (Object.keys(updateData).length > 0) {
            this.setData(updateData)
          }
        } else {
          // 处理后端返回的错误信息
          const errorMessage = res.message || res.error || '未知错误'
          console.error('获取用户名片数据失败:', errorMessage)
          wx.showToast({
            title: '获取用户信息失败',
            icon: 'none'
          })
        }
      },
      fail: (error) => {
        console.error('网络请求失败:', error)
        wx.showToast({
          title: '网络请求失败',
          icon: 'none'
        })
      },
      complete: () => {
        // 隐藏加载提示
        wx.hideLoading()
      }
    })
  },
  
  /**
   * 关闭头像昵称编辑弹窗
   */
  closeProfileAuthModal() {
    this.setData({
      showProfileAuthModal: false,
      tempAvatarUrl: '',
      tempAvatarKey: null,
      tempNickname: ''
    })
  },
  
  /**
   * 阻止冒泡事件
   */
  preventBubbling() {
    // 防止点击弹窗内容时关闭弹窗
  },
  
  /**
   * 处理头像选择
   */
  onChooseAvatar0(e) {
    const { avatarUrl } = e.detail
    this.setData({
      tempAvatarUrl: avatarUrl
    })
  },

  /**
   * 处理头像选择
   */
  onChooseAvatar(e) {
    const { avatarUrl } = e.detail
    // 导入上传工具
    const { uploadImage } = require('../../utils/upload.js')
    
    // 使用工具方法上传头像
    uploadImage({
      filePath: avatarUrl,
      folder: 'avatars',
      loadingTitle: '头像上传中...'
    })
    .then(result => {
      // 上传成功 - 获取OSS key和临时访问URL（后端已处理）
      const ossKey = result.key; // 获取OSS文件键
      const temporaryUrl = result.url; // 直接使用后端返回的临时访问URL
      
      console.log('头像OSS key:', ossKey);
      console.log('后端返回的临时访问URL:', temporaryUrl);
      
      // 保存OSS key和临时URL
      this.setData({
        tempAvatarKey: ossKey,
        tempAvatarUrl: temporaryUrl
      })
      
      wx.showToast({
        title: '头像上传成功',
        icon: 'success'
      })
    })
    .catch(error => {
      console.error('头像上传失败:', error)
      wx.showToast({
        title: error.message || '头像上传失败',
        icon: 'none'
      })
      // 回退到临时URL，确保用户可以看到选择的头像即使上传失败
      this.setData({
        tempAvatarUrl: avatarUrl,
        tempAvatarKey: null
      })
    })
  },
  
  /**
   * 处理昵称输入
   */
  onNicknameInput(e) {
    this.setData({
      tempNickname: e.detail.value
    })
  },
  
  /**
   * 保存头像和昵称
   */
  saveProfileAuth() {
    const { tempAvatarUrl, tempAvatarKey, tempNickname } = this.data
    
    // 验证昵称
    if (!tempNickname.trim()) {
      wx.showToast({
        title: '昵称不能为空',
        icon: 'none'
      })
      return
    }
    
    // 更新数据
    const updateData = {}
    
    if (tempNickname) {
      updateData['userInfo.name'] = tempNickname
    }
    
    if (tempAvatarUrl) {
      // 处理头像URL，添加尺寸参数
      const avatarUrl = tempAvatarUrl.replace('/0', '/132')
      updateData.avatarUrl = avatarUrl
    }
    
    this.setData(updateData)
    
    // 保存到全局
    const app = getApp()
    if (app.globalData.userInfo) {
      app.globalData.userInfo.nickname = tempNickname || app.globalData.userInfo.nickname
      wx.setStorageSync('userInfo', app.globalData.userInfo)
      if (updateData.avatarUrl) {
        app.globalData.userInfo.avatar_url = updateData.avatarUrl
      }
    }
    
    // 将头像和昵称发送到后端保存
    this.saveWechatInfoToServer({
      nickname: tempNickname,
      avatar_url: tempAvatarKey || updateData.avatarUrl || ''
    })
    
    // 同步更新IM中的用户信息
    this.syncProfileToIM({
      nickname: tempNickname,
      avatarUrl: tempAvatarUrl || updateData.avatarUrl,
      tempAvatarKey: tempAvatarKey || ''
    })
    
    this.setData({
      showProfileAuthModal: false
    })
    
    wx.showToast({
      title: '保存成功',
      icon: 'success'
    })
    
    // 检查用户信息是否完整，如果完整且有分享者ID，则发送好友请求
    // this.checkAndSendAutoFriendRequest()
  },
  /**
   * 显示头像昵称编辑弹窗
   */
  showProfileEditModal() {
    if (!this.data.isLoggedIn) {
      console.log("000")
      return;
    }
    console.log('显示头像昵称编辑弹窗')
    this.setData({
      showProfileAuthModal: true,
      tempAvatarUrl: '',
      tempNickname: this.data.userInfo.name
    })
  },
  createProfile(){
    wx.showModal({
      title: '请登录',
      content: '您需要先登录才能创建名片',
      showCancel: true,
      cancelText: '取消',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) {
          wx.navigateTo({
            url: '/pages/login/login'
          })
        }
      }
    })
  },
  /**
   * 同步用户信息到IM
   */
  syncProfileToIM(profileData) {
    try {
      // 检查IM是否已初始化
      if (!wx.$TUIKit) {
        console.log('IM未初始化，跳过同步到IM')
        return
      }

      // 准备IM更新数据
      const imUpdateData = {}
      
      if (profileData.nickname) {
        imUpdateData.nick = profileData.nickname
      }
      
      if (profileData.tempAvatarKey) {
        imUpdateData.avatar = profileData.tempAvatarKey
      }
      
      if (profileData.selfSignature) {
        imUpdateData.selfSignature = profileData.selfSignature
      }

      // 如果有数据需要更新，则调用IM接口
      if (Object.keys(imUpdateData).length > 0) {
        console.log('开始同步用户信息到IM:', imUpdateData)
        
        wx.$TUIKit.updateMyProfile(imUpdateData)
          .then((response) => {
            console.log('IM用户信息同步成功:', response)
          })
          .catch((error) => {
            console.error('IM用户信息同步失败:', error)
            // 不显示错误提示给用户，因为不影响主要功能
          })
      } else {
        console.log('没有需要同步到IM的数据')
      }
    } catch (error) {
      console.error('同步用户信息到IM时发生错误:', error)
    }
  },

  /**
   * 将微信信息保存到服务器
   */
  saveWechatInfoToServer(userInfo) {
    const app = getApp()
    
    // 检查token是否存在
    if (!app.globalData.token) {
      console.error('token不存在')
      wx.showToast({
        title: '请先登录',
        icon: 'none'
      })
      return
    }
    
    // 检查网络状态
    const checkNetworkStatus = () => {
      return new Promise((resolve, reject) => {
        wx.getNetworkType({
          success: (res) => {
            const networkType = res.networkType
            console.log('当前网络类型:', networkType)
            if (networkType === 'none') {
              reject(new Error('当前无网络连接'))
            } else {
              resolve()
            }
          },
          fail: () => {
            // 无法获取网络状态时，继续执行请求
            resolve()
          }
        })
      })
    }
    
    // 执行请求并使用全局request方法处理网络请求
    checkNetworkStatus()
      .then(() => {
        console.log('网络状态正常，开始保存微信信息')
        
        // 使用全局的request方法发送请求，自动处理token刷新
        app.request({
          url: '/api/users/update-wechat-info',
          method: 'POST',
          data: {
            nickname: userInfo.nickname,
            avatar_url: userInfo.avatar_url
          },
          success: (res) => {
            if (res.success) {
              console.log('保存微信信息到服务器成功')
              wx.showToast({
                title: '保存成功',
                icon: 'success'
              })
              // 检查用户信息是否完整，如果完整且有分享者ID，则发送好友请求
              this.checkAndSendAutoFriendRequest()
            } else {
              console.error('保存微信信息失败:', res)
              wx.showToast({
                title: '保存信息失败: ' + (res.error || '未知错误'),
                icon: 'none'
              })
            }
          },
          fail: (error) => {
            console.error('保存微信信息请求失败:', JSON.stringify(error))
            
            // 显示详细错误信息
            const errorMsg = error.message || '网络错误，请稍后重试'
            wx.showToast({
              title: errorMsg,
              icon: 'none',
              duration: 3000
            })
            
            // 添加重试按钮选项，使用更友好的提示
            setTimeout(() => {
              wx.showModal({
                title: '保存失败',
                content: `无法保存信息：${errorMsg}\n是否重新尝试？`,
                confirmText: '重新尝试',
                cancelText: '取消',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    console.log('用户确认重新尝试保存微信信息')
                    // 重新执行整个流程，包括网络检查
                    this.saveWechatInfoToServer(userInfo)
                  }
                }
              })
            }, 1500)
          }
        })
      })
      .catch(error => {
        console.error('保存微信信息过程中的错误:', error.message)
        wx.showToast({
          title: error.message || '网络错误，请稍后重试',
          icon: 'none',
          duration: 3000
        })
      })
  },
  
  /**
   * 获取微信手机号
   */
  getWechatPhoneNumber(e) {
    console.log('getWechatPhoneNumber方法被调用，事件对象:', e)
    
    if (!e || !e.detail) {
      console.error('事件对象格式错误:', e)
      wx.showToast({
        title: '授权失败，请重试',
        icon: 'none'
      })
      return
    }
    
    console.log('授权状态:', e.detail.errMsg)
    console.log('事件详情完整信息:', JSON.stringify(e.detail))
    
    if (e.detail.errMsg === 'getPhoneNumber:ok') {
      const app = getApp()
      
      // 检查token是否存在
      if (!app.globalData.token) {
        console.error('token不存在')
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        })
        // 跳转到登录页面
        wx.navigateTo({
          url: '/pages/login/login'
        })
        return
      }
      
      // 兼容不同版本的微信小程序
      let encryptedData = null
      let iv = null
      let cloudID = e.detail.cloudID
      
      // 检查可用的加密数据字段
      if (!cloudID) {
        // 尝试获取旧版本的加密数据
        encryptedData = e.detail.encryptedData
        iv = e.detail.iv
        
        console.log('未获取到cloudID，尝试使用旧版本字段:', {
          encryptedData: encryptedData ? '存在' : '不存在',
          iv: iv ? '存在' : '不存在'
        })
        
        // 如果没有任何加密数据，显示错误
        if (!encryptedData && !iv) {
          console.error('未获取到cloudID和旧版本加密数据')
          wx.showToast({
            title: '获取加密信息失败，请检查微信版本',
            icon: 'none'
          })
          return
        }
      } else {
        console.log('成功获取cloudID:', cloudID)
      }
      
      // 根据可用的加密数据类型构建请求数据
      let requestData = {}
      if (cloudID) {
        requestData.cloudID = cloudID
      } else {
        requestData.encryptedData = encryptedData
        requestData.iv = iv
      }
      
      // 执行获取手机号的流程（包含token刷新逻辑）
      this.executeGetPhoneNumber(requestData)
    } else {
      console.log('用户拒绝授权手机号')
      wx.showToast({
        title: '请授权获取手机号',
        icon: 'none'
      })
    }
  },
  
  // 执行获取手机号的流程，包含token刷新和重试逻辑
  executeGetPhoneNumber(requestData) {
    const app = getApp()
    
    wx.showLoading({
      title: '获取手机号中...'
    })
    
    // 使用全局app.request方法
    app.request({
      url: '/api/auth/get-phone-number',
      method: 'POST',
      data: requestData,
      success: (res) => {
        console.log('获取手机号接口响应:', res)
        // 处理正常响应
        if (res.success && res.phone_number) {
          // 更新手机号
          this.setData({
            'contactInfo.phone': res.phone_number,
            editContactPhone: res.phone_number
          })
          
          wx.showToast({
            title: '手机号获取成功',
            icon: 'success'
          })
        } else {
          console.error('获取手机号失败:', res)
          wx.showToast({
            title: '获取手机号失败: ' + (res.error || '未知错误'),
            icon: 'none',
            duration: 3000
          })
        }
      },
      fail: (err) => {
        console.error('获取手机号请求失败:', err)
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        })
      },
      complete: () => {
        wx.hideLoading()
      }
    })
  },
  /**
   * 显示个人资料编辑模态框
   */
  showInfoEditModal() {
    this.setData({
      // editProfileDescription: this.data.userInfo.description,
      showProfileModal: true,
      showContactModal: false
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
    const app = getApp()
    const intro = this.data.editProfileDescription.trim()
    if (!intro) {
      wx.showToast({
        title: '请输入个人简介',
        icon: 'none'
      })
      return
    }
    // 显示加载提示
    wx.showLoading({
      title: '保存中...',
    })
    
    // 调用后端接口保存个人资料
    app.request({
      url: '/api/users/update-profile-intro',
      method: 'POST',
      data: {
        intro: intro
      },
      success: (res) => {
        if (res.code === 0 || res.success) {
          // 更新本地数据
          const updatedUserInfo = {
            ...this.data.userInfo,
            description: intro
          }
          console.log('更新后的userInfo:', updatedUserInfo)
          this.setData({
            userInfo: updatedUserInfo,
            showProfileModal: false
          })
          app.globalData.userInfo.description = intro
          wx.setStorageSync('userInfo', app.globalData.userInfo)
          
          // 同步更新IM中的个人简介
          this.syncProfileToIM({
            selfSignature: intro
          })
          
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          })
          // 检查用户信息是否完整，如果完整且有分享者ID，则发送好友请求
          this.checkAndSendAutoFriendRequest()

        } else {
          wx.showToast({
            title: res.message || res.error || '保存失败',
            icon: 'none'
          })
        }
      },
      fail: (error) => {
        console.error('保存个人资料失败:', error)
        wx.showToast({
          title: '保存失败，请稍后重试',
          icon: 'none'
        })
      },
      complete: () => {
        wx.hideLoading()
      }
    })
  },

  /**
   * 显示联系信息编辑模态框
   */
  showContactEditModal() {
    this.setData({
      showContactModal: true,
      showProfileModal: false
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
    const app = getApp()
    
    // 验证手机号格式（允许****格式的部分隐藏手机号）
    const phoneRegex = /^1[3-9]\d{9}$/;
    if (this.data.editContactPhone && !phoneRegex.test(this.data.editContactPhone) && !this.data.editContactPhone.includes('*')) {
      wx.showToast({
        title: '请输入正确的手机号',
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
    
    // 显示加载提示
    wx.showLoading({
      title: '保存中...',
    })
    
    // 调用后端接口保存联系信息
    app.request({
      url: '/api/users/update-profile-contact',
      method: 'POST',
      data: {
        phone: this.data.editContactPhone,
        wechat: this.data.editContactWechat,
        address: this.data.editContactAddress
      },
      success: (res) => {
        if (res.code === 0 || res.success) {
          // 更新本地数据
          const updatedContactInfo = {
            phone: this.data.editContactPhone,
            wechat: this.data.editContactWechat,
            address: this.data.editContactAddress
          }
          // 保存到全局
          app.globalData.userInfo.phone_number = this.data.editContactPhone
          wx.setStorageSync('userInfo', app.globalData.userInfo)
          this.setData({
            contactInfo: updatedContactInfo,
            showContactModal: false
          })
          
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          })
          
          // 检查用户信息是否完整，如果完整且有分享者ID，则发送好友请求
          this.checkAndSendAutoFriendRequest()
        } else {
          wx.showToast({
            title: res.message || res.error || '保存失败',
            icon: 'none'
          })
        }
      },
      fail: (error) => {
        console.error('保存联系信息失败:', error)
        wx.showToast({
          title: '保存失败，请稍后重试',
          icon: 'none'
        })
      },
      complete: () => {
        wx.hideLoading()
      }
    })
  },

  /**
   * 显示添加社媒模态框
   */
  showSocialMediaEditModal() {
    this.setData({
      editSocialPlatformIndex: 0,
      editSocialPlatform: this.data.platforms[0],
      editSocialPlatformName: '',
      editSocialUsername: '',
      editSocialUrl: '',
      isEditingSocial: false,
      editingSocialId: null,
      showSocialMediaModal: true
    })
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
      }
    })
  },
  
  /**
   * 显示编辑社媒模态框
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
        editSocialPlatformIndex: platform ? platformIndex : 0,
        editSocialPlatform: platform || this.data.platforms[0] || {},
        editSocialPlatformName: platform.name || '',
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
      editSocialPlatform: platform
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
    const app = getApp()
    
    // 用户名和主页链接是否为空
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

    const platformName = this.data.editSocialPlatform.name
    
    // 准备API请求数据
    const requestData = {
      platform_id: this.data.editSocialPlatform.id || '',
      username: this.data.editSocialUsername,
      url: this.data.editSocialUrl,
    }
    
    // 如果是编辑模式，添加id
    if (this.data.isEditingSocial) {
      requestData.id = this.data.editingSocialId
    }
    
    // 显示加载提示
    wx.showLoading({
      title: '保存中...',
    })
    
    // 根据操作类型调用不同的后端接口
    if (this.data.isEditingSocial) {
      // 编辑操作
      app.request({
        url: `/api/users/social-media/${this.data.editingSocialId}`,
        method: 'PUT',
        data: requestData,
        success: (res) => {
          if (res.code === 0 || res.success) {
            // 更新本地数据
            const updatedList = [...this.data.socialMediaList].map(item => {
              if (item.id === this.data.editingSocialId) {
                return {
                  ...item,
                  name: platformName,
                  username: this.data.editSocialUsername,
                  url: this.data.editSocialUrl,
                }
              }
              return item
            })
            
            this.setData({
              socialMediaList: updatedList,
              showSocialMediaModal: false
            })
            
            wx.showToast({
              title: '更新成功',
              icon: 'success'
            })
          } else {
            wx.showToast({
              title: res.message || res.error || '更新失败',
              icon: 'none'
            })
          }
        },
        fail: (error) => {
          console.error('更新社交媒体信息失败:', error)
          wx.showToast({
            title: '更新失败，请稍后重试',
            icon: 'none'
          })
        },
        complete: () => {
          wx.hideLoading()
        }
      })
    } else {
      // 新增操作
      app.request({
        url: '/api/users/social-media',
        method: 'POST',
        data: requestData,
        success: (res) => {
          if (res.code === 0 || res.success) {
            console.log('添加社交媒体成功:', res.data)
            // 添加新项
            const newItem = {
              id: res.data?.id, // 使用后端返回的id或生成临时id
              name: platformName,
              username: this.data.editSocialUsername,
              url: this.data.editSocialUrl,
            }
            const updatedList = [...this.data.socialMediaList, newItem]
            
            this.setData({
              socialMediaList: updatedList,
              showSocialMediaModal: false
            })
            
            wx.showToast({
              title: '添加成功',
              icon: 'success'
            })
          } else {
            wx.showToast({
              title: res.message || res.error || '添加失败',
              icon: 'none'
            })
          }
        },
        fail: (error) => {
          console.error('添加社交媒体信息失败:', error)
          wx.showToast({
            title: '添加失败，请稍后重试',
            icon: 'none'
          })
        },
        complete: () => {
          wx.hideLoading()
        }
      })
    }
  },

  /**
   * 删除社交媒体
   */
  deleteSocialMedia(e) {
    const app = getApp()
    const id = e.currentTarget.dataset.id
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个社交媒体账号吗？',
      success: (res) => {
        if (res.confirm) {
          // 显示加载提示
          wx.showLoading({
            title: '删除中...',
          })
          
          // 调用后端接口删除社交媒体
          app.request({
            url: `/api/users/social-media/${id}`,
            method: 'DELETE',
            success: (res) => {
              if (res.code === 0 || res.success) {
                // 更新本地数据
                const updatedList = this.data.socialMediaList.filter(item => item.id !== id)
                this.setData({
                  socialMediaList: updatedList
                })
                
                wx.showToast({
                  title: '删除成功',
                  icon: 'success'
                })
              } else {
                wx.showToast({
                  title: res.message || res.error || '删除失败',
                  icon: 'none'
                })
              }
            },
            fail: (error) => {
              console.error('删除社交媒体失败:', error)
              wx.showToast({
                title: '删除失败，请稍后重试',
                icon: 'none'
              })
            },
            complete: () => {
              wx.hideLoading()
            }
          })
        }
      }
    })
  },

  /**
   * 从模态框中删除社交媒体
   */
  deleteSocialMediaFromModal() {
    const app = getApp()
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个社交媒体账号吗？',
      success: (res) => {
        if (res.confirm) {
          // 显示加载提示
          wx.showLoading({
            title: '删除中...',
          })
          
          // 调用后端接口删除社交媒体
          app.request({
            url: `/api/users/social-media/${this.data.editingSocialId}`,
            method: 'DELETE',
            success: (res) => {
              if (res.code === 0 || res.success) {
                // 更新本地数据
                const updatedList = this.data.socialMediaList.filter(item => item.id !== this.data.editingSocialId)
                this.setData({
                  socialMediaList: updatedList,
                  showSocialMediaModal: false
                })
                
                wx.showToast({
                  title: '删除成功',
                  icon: 'success'
                })
              } else {
                wx.showToast({
                  title: res.message || res.error || '删除失败',
                  icon: 'none'
                })
              }
            },
            fail: (error) => {
              console.error('删除社交媒体失败:', error)
              wx.showToast({
                title: '删除失败，请稍后重试',
                icon: 'none'
              })
            },
            complete: () => {
              wx.hideLoading()
            }
          })
        }
      }
    })
  },

  /**
   * 处理个人简介输入
   */
  onProfileDescriptionInput(e) {
    this.setData({
      editProfileDescription: e.detail.value
    })
  },

  /**
   * 处理联系电话输入
   */
  onContactPhoneInput(e) {
    this.setData({
      editContactPhone: e.detail.value
    })
  },

  /**
   * 处理微信输入
   */
  onContactWechatInput(e) {
    this.setData({
      editContactWechat: e.detail.value
    })
  },

  /**
   * 处理地址输入
   */
  onContactAddressInput(e) {
    this.setData({
      editContactAddress: e.detail.value
    })
  },
  
  /**
   * 检查用户信息是否完整，如果完整且有分享者ID，则发送好友请求
   */
  checkAndSendAutoFriendRequest() {
    const app = getApp()
    console.log('调用app.checkAndSendFriendRequest()检查并发送好友请求')
    // 调用app级别的检查方法，该方法会检查所有条件（登录状态、信息完整性、AI训练状态等）
    app.checkAndSendFriendRequest()
  },
  


  /**
   * 处理社交媒体用户名输入
   */
  onSocialUsernameInput(e) {
    this.setData({
      editSocialUsername: e.detail.value
    })
  },

  /**
   * 处理社交媒体链接输入
   */
  onSocialUrlInput(e) {
    this.setData({
      editSocialUrl: e.detail.value
    })
  },

  /**
   * 阻止冒泡
   * 在微信小程序中，使用catch前缀绑定事件已经能阻止冒泡
   */
  preventBubbling() {
    // 在微信小程序中，由于事件模型的差异，不需要显式调用stopPropagation
    // 通过在WXML中使用catchtap而不是bindtap来绑定事件可以防止冒泡
  },

  /**
   * 导航到关于页面
   */
  navigateToAbout() {
    wx.navigateTo({
      url: '/subpages/about/about'
    })
  },

  /**
   * 打开预览
   */
  openPreview() {
    const app = getApp();
    // 用户名片信息不完整时，点击无效
    if (!app.checkUserInfoComplete()) {
      return
    }
    const userId = app.globalData.userInfo.id;
    // const userId = 51;
    wx.navigateTo({
      url: `/subpages/preview/preview?isFromProfile=true&type=profile&userId=${userId}`
    })
  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    const app = getApp();
    const userId = app.globalData.userInfo.id;
    return {
      title: `${this.data.userInfo.name}的AI名片`,
      path: `/subpages/preview/preview?type=profile&userId=${userId}`,
      imageUrl: this.data.avatarUrl || '/images/ai.png'
    }
  },
  onShareTimeline() {
    const app = getApp();
    const userId = app.globalData.userInfo.id;
    return {
      title: `${this.data.userInfo.name}的AI名片`,
      path: `/subpages/preview/preview?type=profile&userId=${userId}`,
      imageUrl: this.data.avatarUrl || '/images/ai.png'
    }
  }
})