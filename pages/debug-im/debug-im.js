const app = getApp()
import imManager from '../../utils/imManager.js'

Page({
  data: {
    imStatus: null,
    error: null,
    friendApplications: [],
    debugInfo: {}
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
      
      this.setData({ 
        imStatus: status,
        debugInfo: {
          ...status,
          timestamp: new Date().toISOString()
        }
      });

      // 如果IM已登录，检查好友申请
      if (status.isLoggedIn) {
        await this.checkFriendApplications();
      }

    } catch (error) {
      console.error('检查IM状态失败:', error);
      this.setData({ error: error.message });
    }
  },

  // 检查好友申请列表
  async checkFriendApplications() {
    console.log('开始检查好友申请列表...');
    
    try {
      // 等待IM登录完成
      await imManager.waitForLogin(10000);
      
      if (!wx.$TUIKit) {
        throw new Error('IM SDK未初始化');
      }
      
      // 获取好友申请列表
      const friendApplicationList = await wx.$TUIKit.getFriendApplicationList();
      console.log('好友申请原始数据:', friendApplicationList);
      console.log('数据类型:', typeof friendApplicationList);
      console.log('data字段:', friendApplicationList.data);
      console.log('data字段类型:', typeof friendApplicationList.data);
      
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
        
        console.log('处理后的申请列表:', applications);
        console.log('申请列表类型:', Array.isArray(applications) ? '数组' : typeof applications);
        
        // 确保是数组才进行过滤
        if (!Array.isArray(applications)) {
          throw new Error('申请列表不是数组格式');
        }
        
        // 过滤出收到的申请（别人发给你的）
        const receivedApplications = applications.filter(app => 
          app.type === wx.TencentCloudChat.TYPES.SNS_APPLICATION_SENT_TO_ME
        );
        
        console.log('收到的好友申请数量:', receivedApplications.length);
        
        if (receivedApplications.length > 0) {
          const applicationList = receivedApplications.map(app => ({
            userID: app.from,
            nickname: app.nickname || app.from,
            avatar: app.avatar || '/static/images/default-avatar.png',
            addWording: app.addWording || '请求添加您为好友',
            time: this.formatTime(app.addTime),
            source: app.source || '未知来源'
          }));
          
          this.setData({
            friendApplications: applicationList,
            debugInfo: {
              ...this.data.debugInfo,
              friendApplications: `找到 ${applicationList.length} 个好友申请`,
              rawData: friendApplicationList,
              processedApplications: applications
            }
          });
          
          console.log('处理后的好友申请列表:', applicationList);
        } else {
          this.setData({
            friendApplications: [],
            debugInfo: {
              ...this.data.debugInfo,
              friendApplications: '暂无好友申请',
              rawData: friendApplicationList,
              processedApplications: applications
            }
          });
          console.log('暂无好友申请');
        }
      } else {
        throw new Error(`获取好友申请失败: ${friendApplicationList.message}`);
      }
      
    } catch (error) {
      console.error('检查好友申请失败:', error);
      this.setData({
        debugInfo: {
          ...this.data.debugInfo,
          friendApplications: `检查失败: ${error.message}`
        }
      });
    }
  },

  // 格式化时间
  formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  },

  // 重新检查
  reload: function() {
    this.setData({ error: null });
    this.checkIMStatus();
  }
});