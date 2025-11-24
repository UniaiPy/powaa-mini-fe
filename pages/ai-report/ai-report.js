// pages/ai-report/ai-report.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    userInfo: {
      avatar: '',
      nickname: ''
    },
    reportTime: '',
    unreadCount: 0,
    // 报告数据
    reportData: null,
    isLoading: true,
    error: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    // 从后端获取AI报告数据
    this.fetchAIReportData();

  },
  onShow: function () {
    // 从全局变量获取用户信息
    const globalUserInfo = getApp().globalData.userInfo;
    if (globalUserInfo) {
      this.setData({
        userInfo: {
          avatar: globalUserInfo.avatar_url || '',
          nickname: globalUserInfo.nickname || '用户'
        }
      });
    }
  },
  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    // 当数据加载完成后再初始化雷达图
    if (this.data.reportData && !this.data.isLoading) {
      this.initializeRadarChart();
    }
  },

  /**
   * 从后端获取AI报告数据
   */
  fetchAIReportData: function() {
    const that = this;
    const app = getApp();
    
    wx.showLoading({
      title: '加载报告中...',
    });

    app.request({
      url: '/api/ai-avatars', // 使用相对路径，app会自动拼接baseUrl
      method: 'GET',
      success: function(res) {
        console.log('AI报告数据获取成功:', res);
        that.setData({
          reportData: res,
          reportTime: res.reportTime || that.formatCurrentTime(),
          isLoading: false
        });
        // 数据加载完成后初始化雷达图
        that.initializeRadarChart();
      },
      fail: function(error) {
        console.error('获取AI报告失败:', error);
        that.handleReportError('获取报告数据失败');
      },
      complete: function() {
        wx.hideLoading();
      }
    });
  },

  /**
   * 处理报告加载错误
   */
  handleReportError: function(errorMsg) {
    this.setData({
      error: errorMsg,
      isLoading: false,
      reportTime: this.formatCurrentTime(),
      // 使用默认数据，确保页面能够显示，与后端格式保持一致
      reportData: {
        personality_labels: ['开放性', '尽责性', '外向性', '亲和性', '情绪稳定性', '参与度', '社交动机', '质量导向', '情感共鸣'],
        personality_scores: [50, 50, 50, 50, 50, 50, 50, 50, 50],
        personality_traits: [
          {name: '开放性', description: 'AI分析中...', score: 50},
          {name: '尽责性', description: 'AI分析中...', score: 50},
          {name: '外向性', description: 'AI分析中...', score: 50},
          {name: '亲和性', description: 'AI分析中...', score: 50},
          {name: '情绪稳定性', description: 'AI分析中...', score: 50},
          {name: '参与度', description: 'AI分析中...', score: 50},
          {name: '社交动机', description: 'AI分析中...', score: 50},
          {name: '质量导向', description: 'AI分析中...', score: 50},
          {name: '情感共鸣', description: 'AI分析中...', score: 50}
        ],
        analysis_sources: [
          {title: '分析处理中', description: '系统正在收集和分析您的AI分身数据'}
        ]
      }
    });
    // 仍然尝试绘制雷达图，使用默认数据
    this.initializeRadarChart();
  },

  /**
   * 格式化当前时间
   */
  formatCurrentTime: function() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  },

  /**
   * 初始化雷达图
   */
  initializeRadarChart: function () {
    const query = wx.createSelectorQuery();
    query.select('#personalityRadar')
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        
        // 设置Canvas尺寸和分辨率
        const windowInfo = wx.getWindowInfo();
        const dpr = windowInfo.pixelRatio || 1;
        const { width, height } = res[0];
        
        // 设置Canvas的实际宽高（解决压缩问题）
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        
        // 设置绘制比例
        ctx.scale(dpr, dpr);
        
        // 雷达图数据 - 使用后端返回的标签和数据
        const labels = this.data.reportData && this.data.reportData.personality_labels 
          ? this.data.reportData.personality_labels 
          : ['开放性', '尽责性', '外向性', '亲和性', '情绪稳定性', '参与度', '社交动机', '质量导向', '情感共鸣'];
        const data = this.data.reportData && this.data.reportData.personality_scores 
          ? this.data.reportData.personality_scores 
          : [50, 50, 50, 50, 50, 50, 50, 50, 50];
        const colors = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#06B6D4', '#10B981'];
        
        const centerX = width / 2;
        const centerY = height / 2;
        // 调整半径计算方式，确保雷达图完全显示且不被压缩
        const radius = Math.min(width, height) * 0.35;
        
        // 绘制雷达图
        this.drawRadarChart(ctx, centerX, centerY, radius, labels, data, colors);
      })
    
  },

  /**
   * 绘制雷达图
   */
  drawRadarChart: function (ctx, centerX, centerY, radius, labels, data, colors) {
    // 优先使用后端数据标签，如果没有则使用与initializeRadarChart一致的默认标签
    const personalityLabels = this.data.reportData && this.data.reportData.personality_labels 
      ? this.data.reportData.personality_labels 
      : (labels && labels.length > 0 ? labels : ['开放性', '尽责性', '外向性', '亲和性', '情绪稳定性', '参与度', '社交动机', '质量导向', '情感共鸣']);
    const angleStep = (2 * Math.PI) / personalityLabels.length;
    const levels = 4; // 网格层数

    // 绘制背景网格
    ctx.strokeStyle = 'rgba(0,0,0,0.1)';
    ctx.fillStyle = 'white';
    ctx.lineWidth = 1;
    
    // 绘制同心圆网格
    for (let level = 1; level <= levels; level++) {
      const levelRadius = (radius / levels) * level;
      ctx.beginPath();
      
      for (let i = 0; i < labels.length; i++) {
        const angle = -Math.PI / 2 + i * angleStep;
        const x = centerX + Math.cos(angle) * levelRadius;
        const y = centerY + Math.sin(angle) * levelRadius;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.closePath();
      ctx.stroke();
    }
    
    // 绘制从中心到各顶点的线
    for (let i = 0; i < labels.length; i++) {
      const angle = -Math.PI / 2 + i * angleStep;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    
    // 绘制数据区域
    ctx.beginPath();
    ctx.fillStyle = 'rgba(139, 92, 246, 0.2)';
    ctx.strokeStyle = 'rgb(139, 92, 246)';
    ctx.lineWidth = 3;
    
    for (let i = 0; i < data.length; i++) {
      const value = data[i] / 100; // 归一化到0-1范围
      const angle = -Math.PI / 2 + i * angleStep;
      const x = centerX + Math.cos(angle) * radius * value;
      const y = centerY + Math.sin(angle) * radius * value;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    
    // 绘制数据点
    for (let i = 0; i < data.length; i++) {
      const value = data[i] / 100;
      const angle = -Math.PI / 2 + i * angleStep;
      const x = centerX + Math.cos(angle) * radius * value;
      const y = centerY + Math.sin(angle) * radius * value;
      
      // 绘制点的外圈
      ctx.fillStyle = colors[i];
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();
      
      // 绘制点的内圈
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // 绘制标签
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#374151';
    
    for (let i = 0; i < personalityLabels.length; i++) {
      const angle = -Math.PI / 2 + i * angleStep;
      const labelRadius = radius + 20;
      const x = centerX + Math.cos(angle) * labelRadius;
      const y = centerY + Math.sin(angle) * labelRadius;
      
      ctx.fillText(personalityLabels[i], x, y);
    }
  },

  // 设置报告生成时间的方法已被formatCurrentTime替代

  /**
   * 更新未读消息数量
   */
  updateUnreadCount: function () {
    // 在实际应用中，这里会从存储或API获取未读消息数量
    // 这里使用模拟数据
    const unreadCount = 5;
    this.setData({
      unreadCount: unreadCount
    });
  },

  /**
   * 返回上一页
   */
  goBack: function () {
    console.log('AI报告页面：点击返回按钮');
    wx.navigateBack();
  },

  /**
   * 导航到聊天页面
   */
  navigateToChat: function () {
    wx.navigateTo({
      url: '/pages/chat/chat'
    });
  },

  /**
   * 导航到AI分身页面
   */
  navigateToAvatar: function () {
    wx.navigateTo({
      url: '/pages/avatar/avatar'
    });
  },

  /**
   * 导航到名片页面
   */
  navigateToProfile: function () {
    wx.navigateTo({
      url: '/pages/profile/profile'
    });
  }
});