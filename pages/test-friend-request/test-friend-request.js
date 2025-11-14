
// 测试脚本：模拟发送好友请求
const app = getApp()
import imManager from '../../utils/imManager.js'

Page({
  data: {
    imStatus: null,
    testResult: null,
    error: null,
    targetUserId: '38', // 默认测试用户ID
    currentUserId: null
  },

  onLoad: function() {
    this.checkIMStatus();
  },

  // 检查IM状态
  async checkIMStatus() {
    try {
      if (!imManager) {
        this.setData({ error: 'IM管理器不存在' });
        return;
      }

      const status = imManager.checkIMStatus();
      console.log('IM状态:', status);
      
      const currentUserId = app.globalData.userInfo?.userId;
      
      this.setData({ 
        imStatus: status,
        currentUserId: currentUserId
      });

    } catch (error) {
      console.error('检查IM状态失败:', error);
      this.setData({ error: error.message });
    }
  },

  // 发送好友请求
  async sendFriendRequest() {
    try {
      this.setData({ testResult: null, error: null });
      
      if (!imManager || !this.data.imStatus?.isLoggedIn) {
        throw new Error('IM未登录');
      }

      const targetUserId = this.data.targetUserId;
      console.log(`发送好友请求给用户${targetUserId}...`);

      // 等待IM登录完成
      await imManager.waitForLogin(10000);

      // 发送好友请求
      const result = await wx.$TUIKit.addFriend({
        to: targetUserId,
        source: 'AddSource_Type_Web',
        wording: '您好，请求添加您为好友'
      });

      console.log('发送好友请求结果:', result);
      
      if (result.code === 0) {
        this.setData({ 
          testResult: {
            success: true,
            message: `成功向用户${targetUserId}发送好友请求`,
            data: result.data
          }
        });
      } else {
        throw new Error(result.message || '发送好友请求失败');
      }

    } catch (error) {
      console.error('发送好友请求失败:', error);
      this.setData({ 
        error: `发送好友请求失败: ${error.message}`
      });
    }
  },

  // 检查好友申请列表
  async checkFriendApplications() {
    try {
      this.setData({ testResult: null, error: null });
      
      if (!imManager || !this.data.imStatus?.isLoggedIn) {
        throw new Error('IM未登录');
      }

      // 等待IM登录完成
      await imManager.waitForLogin(10000);

      // 获取好友申请列表
      const friendApplicationList = await wx.$TUIKit.getFriendApplicationList();
      console.log('好友申请列表:', friendApplicationList);

      if (friendApplicationList.code === 0) {
        // 检查数据结构
        let applications = [];
        if (friendApplicationList.data) {
          if (Array.isArray(friendApplicationList.data)) {
            applications = friendApplicationList.data;
          } else if (friendApplicationList.data.applicationList && Array.isArray(friendApplicationList.data.applicationList)) {
            applications = friendApplicationList.data.applicationList;
          } else {
            console.warn('未知的data结构:', friendApplicationList.data);
            applications = [];
          }
        }
        
        // 确保是数组才进行处理
        if (!Array.isArray(applications)) {
          throw new Error('申请列表不是数组格式');
        }
        
        // 分类统计
        const sentToMe = applications.filter(app => 
          app.type === wx.TencentCloudChat.TYPES.SNS_APPLICATION_SENT_TO_ME
        );
        const sentFromMe = applications.filter(app => 
          app.type === wx.TencentCloudChat.TYPES.SNS_APPLICATION_SENT_BY_ME
        );

        this.setData({ 
          testResult: {
            success: true,
            message: `好友申请统计：发送给我${sentToMe.length}个，我发送的${sentFromMe.length}个`,
            data: {
              total: applications.length,
              sentToMe: sentToMe.length,
              sentFromMe: sentFromMe.length,
              applications: applications
            }
          }
        });
      } else {
        throw new Error(`获取好友申请列表失败: ${friendApplicationList.message}`);
      }

    } catch (error) {
      console.error('检查好友申请失败:', error);
      this.setData({ 
        error: `检查好友申请失败: ${error.message}`
      });
    }
  },

  // 输入目标用户ID
  onTargetUserIdInput: function(e) {
    this.setData({
      targetUserId: e.detail.value
    });
  },

  // 重新检查状态
  reload: function() {
    this.checkIMStatus();
  }
});