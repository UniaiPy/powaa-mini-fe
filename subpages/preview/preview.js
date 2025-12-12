// subpages/preview/preview.js
import TencentCloudChat from '../../utils/@tencentcloud/lite-chat/professional';
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
    greetingMessage: '你好，很高兴认识你！', // 打招呼消息
    matchDegreeContent: '',   // 匹配度说明内容
    isLoadingMatchDegree: false, // 是否正在加载匹配度说明
    matchDegreeCache: {}      // 匹配度缓存
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
    const fromElseCard = options.shareElseCard || false;
    const isFromProfile = options.isFromProfile || false;
    console.log('options:', options);
    this.setData({
      fromElseCard: fromElseCard
    })
    if (currentUserId !== targetUserId) {
      this.setData({
        shareElseCard: true
      })
    }
    if(isFromProfile){
      this.setData({
        isFromShare: false
      });
    }else{
      this.setData({
        isFromShare: true
      });
      // 如果是通过分享进入页面并且是分享者自己的名片时，将分享者的userId存储到本地缓存
      if (currentUserId !== targetUserId && !fromElseCard) {
        wx.setStorageSync('sharedUserId', targetUserId);
        console.log('sharedUserId:', targetUserId);
      }
    }


    this.setData({
      userId: targetUserId,
      type: type,
      // 判断是否为当前用户自己的名片（确保类型一致并进行空值检查）
      isOwnProfile: currentUserId && targetUserId && String(currentUserId) === String(targetUserId),
      // 是否通过分享进入页面
      // isFromShare: isFromShare
    });
    // 加载用户个人资料数据
    this.loadProfileData();

    if(app.isLoggedIn()){
      // 如果用户已登录，检查AI分身是否已完成训练
      this.checkIsTrained();
    }else{
      // 如果用户未登录，隐藏分享菜单
      wx.hideShareMenu({
        menus: ['shareAppMessage', 'shareTimeline']
      })
    }
    
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
  showToastInfo: function() {
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
  },
  // 检查AI分身是否已完成训练
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
        wx.showShareMenu({
          menus: ['shareAppMessage', 'shareTimeline']
        })
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
   * 显示匹配度说明
   * 点击时调用匹配度分析接口，使用流式输出
   */
  showMatchDegree: function() {
    const app = getApp();
    
    // 检查用户是否登录
    if (!app.isLoggedIn()) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 1500
      });
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/login/login'
        });
      }, 1500);
      return;
    }
    if(!app.checkUserInfoComplete()){
      return;
    }
    if(!this.data.isTrained){
      this.showToastInfo();
      return;
    }
    
    const userId = String(app.globalData.userInfo?.id || '');
    const targetUserId = String(this.data.userId || '');
    
    if (!userId || !targetUserId) {
      this.showToast('用户信息不完整');
      return;
    }
    
    // 生成缓存键
    const cacheKey = `${userId}_${targetUserId}`;
    
    // 检查是否有缓存数据且未过期
    const cachedData = this.getCachedMatchDegree(cacheKey);
    if (cachedData) {
      this.setData({
        showMatchDegreeModal: true,
        matchDegreeContent: cachedData.content,
        isLoadingMatchDegree: false
      });
      return;
    }
    
    // 设置初始状态，初始内容为空
    this.setData({
      showMatchDegreeModal: true,
      matchDegreeContent: '',
      isLoadingMatchDegree: true
    });
    
    // 调用匹配度分析接口
    this.fetchMatchDegree(userId, targetUserId, cacheKey);
  },
  
  /**
   * 获取匹配度分析结果
   * 实现SSE流式响应，每次只解析新增的数据块并逐步更新内容
   */
  fetchMatchDegree: function(userId, targetUserId, cacheKey) {
    const app = getApp();
    const baseUrl = 'http://ai.powaa.cn';
    const url = `${baseUrl}/ai/match/compare`;
    
    const requestData = {
      userId: userId,
      targetUserId: targetUserId
    };
    
    wx.request({
      timeout: 100000,
      responseType: 'text',
      url: url,
      method: 'POST',
      data: requestData,
      header: {
        'content-type': 'application/json',
        'Authorization': app.globalData.token ? `Bearer ${app.globalData.token}` : ''
      },
      success: (res) => {
        this.setData({ isLoadingMatchDegree: false });
        try {
          // 处理完整的响应数据
          let accumulatedContent = '';
          if (res.data) {
            // 如果响应是字符串类型，尝试解析
            if (typeof res.data === 'string') {
              // 检查是否是 SSE 格式数据
              if (res.data.includes('data:')) {
                const testArr = res.data.split('data:');
                testArr.forEach(item => {
                  if (item.trim()) {
                    const parsedBlock = JSON.parse(item);
                    if (parsedBlock.content) {
                      accumulatedContent += parsedBlock.content;
                    }
                  }
                });
              } else {
                // 直接使用响应内容
                accumulatedContent = res.data;
              }
            } else if (res.data.content) {
              // 如果响应是对象且包含 content 字段
              accumulatedContent = res.data.content;
              
            }
          }
          
          
          // 更新页面内容
          if (accumulatedContent && accumulatedContent !== '<div style="text-align: center; color: #666; padding: 20px 0;">正在分析匹配度...</div>') {
            const processedContent = this.processMatchDegreeContent(accumulatedContent);
            this.setData({ matchDegreeContent: processedContent });
            // 保存缓存
            this.cacheMatchDegree(cacheKey, processedContent);
          } else {
            // 如果没有有效内容，显示默认文本
            const defaultContent = '<div style="text-align: center; color: #666; padding: 20px 0;">暂无匹配度数据</div>';
            this.setData({ matchDegreeContent: defaultContent });
          }
        } catch (err) {
          console.error('处理响应数据异常！', err);
          // 发生错误时显示默认文本
          const defaultContent = '<div style="text-align: center; color: #666; padding: 20px 0;">匹配度数据加载失败</div>';
          this.setData({ matchDegreeContent: defaultContent });
        }
      },
      fail: (err) => {
        console.error('请求匹配度数据失败！', err);
        this.setData({ 
          isLoadingMatchDegree: false,
          matchDegreeContent: '<div style="text-align: center; color: #666; padding: 20px 0;">匹配度数据加载失败</div>'
        });
      }
    })
  },
  // 处理匹配度内容格式
  processMatchDegreeContent(content) {
        // 将换行符替换为<br/>标签
        content = content.replace(/\n/g, '<br/>');
        // 将指定文本改为加粗体
        content = content.replace(/匹配点：/g, '<span class="font-bold">匹配点</span>');
        content = content.replace(/分歧点：/g, '<span class="font-bold">分歧点</span>');
        content = content.replace(/分析说明：/g, '<span class="font-bold">分析说明</span>');
    // 提取总体匹配度数值
    const totalMatchRegex = /总体匹配度：(\d+)\s*\/\s*(\d+)/;
    const totalMatchMatch = content.match(totalMatchRegex);
    console.log(totalMatchMatch);
    let totalMatchPercent = 0;
    
    if (totalMatchMatch) {
      const total = parseInt(totalMatchMatch[1]);
      const max = parseInt(totalMatchMatch[2]);
      totalMatchPercent = Math.round((total / max) * 100);
      // 替换为百分比格式并添加紫色样式
      content = content.replace(totalMatchRegex, `总体匹配度：<span class="text-purple-500 font-bold">${totalMatchPercent}%</span>`);
    }
    
    // 提取人格契合度数值
    const personalityMatchRegex = /人格契合度：(\d+)\s*\/\s*(\d+)/;
    const personalityMatchMatch = content.match(personalityMatchRegex);
    
    if (personalityMatchMatch) {
      const total = parseInt(personalityMatchMatch[1]);
      const max = parseInt(personalityMatchMatch[2]);
      const personalityMatchPercent = Math.round((total / max) * 100);
      // 替换为百分比格式并添加蓝色样式
      content = content.replace(personalityMatchRegex, `人格契合度：<span class="text-blue-500 font-bold">${personalityMatchPercent}%</span>`);
    }
    
    // 根据总体匹配度标记用户类型
    if (totalMatchPercent >= 90) {
      // 标记为高匹配户
      this.setData({
        highMatchUser: true
      });
    } else if (totalMatchPercent >= 80 && totalMatchPercent < 90) {
      // 标记为高潜力用户
      this.setData({
        highPotentialUser: true
      });
    }
    
    return content;
  },

  /**
   * 缓存匹配度结果
   */
  cacheMatchDegree: function(cacheKey, content) {
    try {
      const cacheData = {
        content: content,
        timestamp: Date.now()
      };
      
      // 更新内存缓存
      const cache = this.data.matchDegreeCache;
      cache[cacheKey] = cacheData;
      this.setData({ matchDegreeCache: cache });
      
      // 保存到本地存储
      wx.setStorageSync('matchDegreeCache', cache);
    } catch (e) {
      console.error('缓存匹配度结果失败:', e);
    }
  },
  
  /**
   * 获取缓存的匹配度结果
   */
  getCachedMatchDegree: function(cacheKey) {
    try {
      // 先从内存缓存获取
      const memoryCache = this.data.matchDegreeCache;
      if (memoryCache[cacheKey]) {
        const cachedTime = memoryCache[cacheKey].timestamp;
        // 缓存有效期为30分钟
        if (Date.now() - cachedTime < 30 * 60 * 1000) {
          return memoryCache[cacheKey];
        }
      }
      
      // 从本地存储获取
      const storageCache = wx.getStorageSync('matchDegreeCache') || {};
      if (storageCache[cacheKey]) {
        const cachedTime = storageCache[cacheKey].timestamp;
        // 缓存有效期为30分钟
        if (Date.now() - cachedTime < 30 * 60 * 1000) {
          // 更新内存缓存
          const cache = this.data.matchDegreeCache;
          cache[cacheKey] = storageCache[cacheKey];
          this.setData({ matchDegreeCache: cache });
          return storageCache[cacheKey];
        }
      }
    } catch (e) {
      console.error('获取缓存匹配度失败:', e);
    }
    return null;
  },

  /**
   * 关闭匹配度说明弹窗
   */
  /**
   * 关闭匹配度说明弹窗
   */
  closeMatchDegree: function() {
    this.setData({
      showMatchDegreeModal: false,
      isLoadingMatchDegree: false
      // 保留matchDegreeContent以便下次快速显示缓存内容
    });
  },

  /**
   * 开始聊天
   */
  startChat: function() {
    const app = getApp();
    const targetUserId = this.data.userId;
    
    // 检查用户是否登录
    if (!app.isLoggedIn()) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 1500
      });
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/login/login'
        });
      }, 1500);
      return;
    }
    if(!app.checkUserInfoComplete()){
      return;
    }
    if(!this.data.isTrained){
      this.showToastInfo();
      return;
    }
    
    // 调用后端接口检查好友关系
    app.request({
      url: `/api/friendships/check/${targetUserId}`,
      method: 'GET',
      allowAnonymous: true, // 允许匿名访问
      success: (res) => {
        if (res.success && res.data.is_friend) {
          // 是好友，直接跳转聊天会话页面
          wx.navigateTo({
            url: `/subpages/conversation/conversation?conversationID=C2C${targetUserId}`
          });
        } else {
          // 不是好友，并且不是分享者自己名片时  显示打招呼弹窗
          if(this.data.fromElseCard){
            this.setData({
              showChatModal: true
            });
          }else{
            //不是好友，并且是分享者自己名片时,跳转到chat页面展示待联系tab 并切换到pending tab  tab页面不能带参数，使用全局变量传递
            // 检查是否有来自分享的userId
            const sharedUserId = wx.getStorageSync('sharedUserId')
            console.log('分享者ID:', sharedUserId)
            if (sharedUserId) {
              // 检查是否已经发送过好友请求（避免重复发送）
              const hasSentRequest = wx.getStorageSync(`sentFriendRequest_${sharedUserId}`)
              console.log('是否已发送好友请求:', hasSentRequest)
              if (!hasSentRequest) {
                // 发送好友请求
                app.sendAutoFriendRequest(sharedUserId).then(isSuccess => {
                  console.log('是否成功发送好友请求:', isSuccess)
                  if(isSuccess){
                    app.globalData.tabParams = { activeSection: 'pending'};
                    wx.switchTab({
                      url: '/pages/chat/chat'
                    });
                  }
                })
              }else{
                //已经收到发送好友请求，并且还没有同意好友申请
                app.globalData.tabParams = { activeSection: 'pending'};
                wx.switchTab({
                  url: '/pages/chat/chat'
                });
              }
            }
          }
        }
      },
      fail: (error) => {
        console.error('检查好友关系失败:', error);
        // 失败时默认显示打招呼弹窗
        this.setData({
          showChatModal: true
        });
      }
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
    const app = getApp();
    
    if (!message || message.trim() === '') {
      this.showToast('请输入打招呼消息');
      return;
    }
    
    // 检查用户是否登录
    if (!app.isLoggedIn()) {
      wx.showToast({
        title: '请先登录',
        icon: 'none',
        duration: 1500
      });
      setTimeout(() => {
        wx.navigateTo({
          url: '/pages/login/login'
        });
      }, 1500);
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
    
    // app实例已在函数顶部定义，无需重复声明
    
    // 检查TUIKit是否已初始化
    if (!wx.$TUIKit) {
      console.error('TUIKit未初始化，尝试初始化');
      
      // 尝试初始化TUIKit
      if (app.globalData.token && app.globalData.userInfo) {
        console.log('用户已登录，尝试获取IM配置并初始化TUIKit');
        app.getIMConfigFromServer(app.globalData.token).then(() => {
          // 等待一小段时间让初始化完成
          setTimeout(() => {
            if (wx.$TUIKit) {
              console.log('TUIKit初始化成功，重新执行添加好友');
              this.addFriend(targetUser, message);
            } else {
              console.error('TUIKit初始化失败');
              wx.hideLoading();
              this.showToast('IM服务初始化失败，请稍后重试');
            }
          }, 1000);
        }).catch((error) => {
          console.error('获取IM配置失败:', error);
          wx.hideLoading();
          this.showToast('IM服务配置获取失败，请稍后重试');
        });
      } else {
        console.error('用户未登录，无法初始化TUIKit');
        wx.hideLoading();
        this.showToast('请先登录后再使用此功能');
      }
      return;
    }
    
    // 调用腾讯云IM添加好友API
    console.log('=== 开始发送好友请求 ===');
    console.log('发送方用户ID:', wx.$chat_userID);
    console.log('接收方用户ID:', targetUser.userID);
    console.log('目标用户对象:', targetUser);
    console.log('当前用户信息:', app.globalData.userInfo);
    
    // 检查腾讯云IM常量值
    console.log('=== 腾讯云IM好友类型常量 ===');
    console.log('SNS_ADD_TYPE_SINGLE:', TencentCloudChat.TYPES.SNS_ADD_TYPE_SINGLE);
    console.log('SNS_ADD_TYPE_BOTH:', TencentCloudChat.TYPES.SNS_ADD_TYPE_BOTH);
    console.log('SNS_ADD_TYPE_FOLLOW:', TencentCloudChat.TYPES.SNS_ADD_TYPE_FOLLOW);
    
    // 添加双向好友
    wx.$TUIKit.addFriend({
      to: targetUser.userID,
      source: 'AddSource_Type_Web',
      remark: '',
      wording: message, // 使用打招呼消息作为验证消息
      type: TencentCloudChat.TYPES.SNS_ADD_TYPE_BOTH, // 双向好友，需要对方确认
      addWording: message
    }).then(res => {
      console.log('=== TUIKit添加好友成功 ===');
      console.log('完整响应:', JSON.stringify(res, null, 2));
      
      // 检查响应中的关键信息
      if (res.data) {
        console.log('响应数据:', res.data);
        if (res.data.code === 0) {
          console.log('✅ 好友请求已成功发送到腾讯云IM服务器');
          console.log('目标用户:', targetUser.userID, '应该能在待联系列表中看到此请求');
          
          // 立即检查好友申请状态
          setTimeout(() => {
            console.log('=== 检查好友申请状态 ===');
            // 异步函数处理好友申请列表获取
            const getFriendApplications = async () => {
              try {
                let appResponse;
                if (typeof wx.$TUIKit.getFriendApplicationList === 'function') {
                  // SDK v3 或兼容版本
                  appResponse = await wx.$TUIKit.getFriendApplicationList();
                } else if (typeof wx.$TUIKit.getFriendList === 'function') {
                  // SDK v4 或其他版本，尝试使用 getFriendList 作为替代
                  console.log('⚠️ getFriendApplicationList 方法不存在，尝试使用 getFriendList 替代');
                  appResponse = await wx.$TUIKit.getFriendList();
                } else {
                  // 无可用API，返回空列表
                  console.log('⚠️ 无可用的好友申请列表API');
                  return;
                }
                console.log('发送方的好友申请列表:', JSON.stringify(appResponse, null, 2));
              } catch (err) {
                console.error('获取发送方好友申请失败:', err);
              }
            };
            // 调用异步函数
            getFriendApplications();
          }, 1000);
          
        } else if (res.data.code === 30539) {
          console.log('⚠️ 好友申请已存在，无需重复申请');
          this.showToast('好友申请已存在，无需重复申请');
        } else {
          console.log('⚠️ 其他响应码:', res.data.code, res.data.message);
          this.showToast(`操作失败: ${res.data.message || '未知错误'}`);
        }
      }
      
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
      console.error('=== TUIKit添加好友失败 ===');
      console.error('完整错误信息:', JSON.stringify(err, null, 2));
      console.error('错误码:', err.code);
      console.error('错误消息:', err.message);
      console.error('错误类型:', typeof err);
      
      wx.hideLoading();
      
      // 处理特定错误码
      if (err.code === 10009) {
        console.log('✅ 已经是好友关系');
        this.showToast('已经是好友关系');
        // 已经是好友，直接跳转到聊天页面
        setTimeout(() => {
          wx.navigateTo({
            url: `/pages/chat/chat?userId=${targetUser.userID}&userName=${encodeURIComponent(targetUser.name)}`
          });
        }, 1000);
      } else if (err.code === 10010) {
        console.log('⏰ 好友申请已发送，等待对方同意');
        this.showToast('好友申请已发送，请等待对方同意');
        this.closeChatModal();
      } else if (err.code === 20009) {
        console.log('❌ 非好友无法发送消息，需要先加好友');
        this.showToast('需要先添加好友才能发送消息');
      } else if (err.code === 30001) {
        console.log('❌ 服务器内部错误');
        this.showToast('服务器错误，请稍后重试');
      } else if (err.code === 50001) {
        console.log('❌ 网络连接失败');
        this.showToast('网络连接失败，请检查网络');
      } else {
        console.log('❌ 其他错误:', err.message);
        this.showToast(`添加好友失败: ${err.message || '未知错误'}`);
        
        // 尝试通过后端API发送好友请求（备用方案）
        this.sendFriendRequestViaBackend(targetUser, message);
      }
    });
  },

  /**
   * 通过后端API发送好友请求（备用方案）
   */
  sendFriendRequestViaBackend: function(targetUser, message) {
    const app = getApp();
    
    console.log('通过后端API发送好友请求');
    console.log('目标用户信息:', targetUser);
    console.log('当前用户信息:', app.globalData.userInfo);
    console.log('请求参数:', {
      toUserId: targetUser.userID,
      message: message,
      source: 'preview_page'
    });
    
    app.request({
      url: '/api/friendships/request',
      method: 'POST',
      data: {
        id: targetUser.userID,
        message: message,
        source: 'preview_page'
      },
      success: (res) => {
        console.log('通过后端发送好友请求成功 - 目标用户:', targetUser.userID, '响应:', res);
        console.log('成功响应详情:', JSON.stringify(res, null, 2));
        
        if (res.code === 0) {
          this.closeChatModal();
          this.showToast('好友请求已发送');
        } else {
          console.error('后端API返回错误:', res);
          this.showToast(res.message || '发送失败，请稍后重试');
        }
      },
      fail: (error) => {
        console.error('通过后端发送好友请求失败:', error);
        console.error('请求失败详情:', JSON.stringify(error, null, 2));
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
      allowAnonymous: true, // 允许匿名访问，解决分享页面未登录用户无法访问的问题
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
  },
  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    console.log('shareElseCard:', this.data.shareElseCard)
    return {
      title: `${this.data.userInfo.name}的AI名片`,
      path: `/subpages/preview/preview?type=profile&userId=${this.data.userId}&shareElseCard=${this.data.shareElseCard}`,
      imageUrl: this.data.avatarUrl
    }
  },
  onShareTimeline() {
    return {
      title: `${this.data.userInfo.name}的AI名片`,
      path: `/subpages/preview/preview?type=profile&userId=${this.data.userId}&shareElseCard=${this.data.shareElseCard}`,
      imageUrl: this.data.avatarUrl
    }
  }
})