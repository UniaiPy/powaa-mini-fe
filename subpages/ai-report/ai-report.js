// subpages/ai-report/ai-report.js
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

    // 通过后端接口获取AI报告数据
    app.request({
      url: '/api/ai-avatars/report', // 后端接口会自动请求AI报告接口
      method: 'POST',
      success: function(res) {
        console.log('AI报告接口获取成功:', res);
        
        // 转换新接口返回的数据格式以适配现有页面
        const personalityTraitsData = res.personalityTraits || {};
        const aiReportText = res.aiReport || '';
        
        // 定义特质名称映射
        const traitNameMapping = {
          'extraversion': '外向性',
          'openness': '开放性',
          'conscientiousness': '尽责性',
          'agreeableness': '宜人性',
          'emotionalStability': '情绪稳定性',
          'engagement': '投入度',
          'quality': '优质性',
          'resonance': '同频度',
          'socialMotivation': '社交目的'
        };
        
        // 按特定顺序组织特质
        const orderedTraits = ['extraversion', 'openness', 'conscientiousness',
                             'agreeableness', 'emotionalStability', 'engagement',
                             'quality', 'resonance', 'socialMotivation'];
        
        // 构建前端所需的personality_traits和personality_scores
        const personality_traits = [];
        const personality_scores = [];
        const personality_labels = [];
        
        for (const traitKey of orderedTraits) {
              if (traitKey in personalityTraitsData) {
                  const traitData = personalityTraitsData[traitKey];
                  const traitScore = typeof traitData === 'number' ? traitData : (traitData?.score || 50);
                  const traitDesc = typeof traitData === 'object' ? (traitData?.description || 'AI分析中...') : 'AI分析中...';
                  const traitName = traitNameMapping[traitKey] || traitKey;
                  
                  personality_traits.push({
                      'name': traitName,
                      'description': traitDesc,
                      'score': traitScore
                  });
                  personality_scores.push(traitScore);
                  personality_labels.push(traitName);
              } else {
                  // 如果某个特质缺失，使用默认值
                  const traitName = traitNameMapping[traitKey] || traitKey;
                  personality_traits.push({
                      'name': traitName,
                      'description': 'AI分析中...',
                      'score': 50
                  });
                  personality_scores.push(50);
                  personality_labels.push(traitName);
              }
          }
        
        // 构建analysis_sources
        const analysis_sources = [
            {'title': 'AI人格分析', 'description': aiReportText}
        ];
        
        // 构建最终的formattedData
        const formattedData = {
            personality_labels: personality_labels,
            personality_scores: personality_scores,
            personality_traits: personality_traits,
            report_summary: aiReportText || 'AI分析中...',
            aiReport: aiReportText,
            analysis_sources: analysis_sources
        };
        
        that.setData({
          reportData: formattedData,
          reportTime: that.formatCurrentTime(),
          isLoading: false,
          reportSummary: formattedData.report_summary
        });
        
        // 隐藏加载提示
        wx.hideLoading();
        
        // 数据加载完成后初始化雷达图
        that.initializeRadarChart();
      },
      fail: function(error) {
        console.error('AI报告接口获取失败:', error);
        that.handleReportError('获取报告数据失败');
        wx.hideLoading();
      }
    });
  },

  /**
   * 处理报告加载错误
   */
  handleReportError: function(errorMsg) {
    // 使用与成功获取数据时相同的逻辑构建默认数据
    // 定义特质名称映射
    const traitNameMapping = {
      'extraversion': '外向性',
      'openness': '开放性',
      'conscientiousness': '尽责性',
      'agreeableness': '宜人性',
      'emotionalStability': '情绪稳定性',
      'engagement': '投入度',
      'quality': '优质性',
      'resonance': '同频度',
      'socialMotivation': '社交目的'
    };
    
    // 按特定顺序组织特质
    const orderedTraits = ['extraversion', 'openness', 'conscientiousness',
                         'agreeableness', 'emotionalStability', 'engagement',
                         'quality', 'resonance', 'socialMotivation'];
    
    // 构建前端所需的personality_traits和personality_scores
    const personality_traits = [];
    const personality_scores = [];
    const personality_labels = [];
    
    for (const traitKey of orderedTraits) {
      // 使用默认值
      const traitName = traitNameMapping[traitKey] || traitKey;
      personality_traits.push({
        'name': traitName,
        'description': 'AI分析中...',
        'score': 50
      });
      personality_scores.push(50);
      personality_labels.push(traitName);
    }
    
    // 构建analysis_sources
    const analysis_sources = [
      {'title': 'AI人格分析', 'description': '系统正在收集和分析您的AI分身数据'}
    ];
    
    // 构建最终的formattedData，与成功获取数据时的格式保持一致
    const formattedData = {
      personality_labels: personality_labels,
      personality_scores: personality_scores,
      personality_traits: personality_traits,
      report_summary: 'AI分析中...',
      aiReport: '',
      analysis_sources: analysis_sources
    };
    
    this.setData({
      error: errorMsg,
      isLoading: false,
      reportTime: this.formatCurrentTime(),
      reportData: formattedData,
      reportSummary: formattedData.report_summary
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