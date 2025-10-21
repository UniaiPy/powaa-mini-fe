// pages/ai-report/ai-report.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    reportTime: '',
    unreadCount: 0
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setReportTime();
    this.updateUnreadCount();
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    // 延迟初始化雷达图，确保Canvas已经渲染完成
    setTimeout(() => {
      this.initializeRadarChart();
    }, 300);
  },

  /**
   * 初始化雷达图
   */
  initializeRadarChart: function () {
    const ctx = wx.createCanvasContext('personalityRadar', this);
    
    // 雷达图数据
    const labels = ['开放性', '尽责性', '外向性', '宜人性', '情绪稳定', '连接动因', '表达风格', '互动偏好', '成长导向'];
    const data = [89, 92, 85, 88, 91, 83, 87, 79, 86];
    const colors = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#8B5CF6', '#06B6D4', '#10B981'];
    
    // 获取Canvas尺寸
    const query = wx.createSelectorQuery().in(this);
    query.select('#personalityRadar')
      .boundingClientRect(res => {
        if (res) {
          const width = res.width;
          const height = res.height;
          const centerX = width / 2;
          const centerY = height / 2;
          const radius = Math.min(width, height) * 0.4;
          
          // 绘制雷达图
          this.drawRadarChart(ctx, centerX, centerY, radius, labels, data, colors);
          ctx.draw();
        }
      })
      .exec();
  },

  /**
   * 绘制雷达图
   */
  drawRadarChart: function (ctx, centerX, centerY, radius, labels, data, colors) {
    const angleStep = (2 * Math.PI) / labels.length;
    const levels = 4; // 网格层数
    
    // 绘制背景网格
    ctx.setStrokeStyle('rgba(0,0,0,0.1)');
    ctx.setFillStyle('white');
    ctx.setLineWidth(1);
    
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
    ctx.setFillStyle('rgba(139, 92, 246, 0.2)');
    ctx.setStrokeStyle('rgb(139, 92, 246)');
    ctx.setLineWidth(3);
    
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
      ctx.setFillStyle(colors[i]);
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();
      
      // 绘制点的内圈
      ctx.setFillStyle('white');
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, 2 * Math.PI);
      ctx.fill();
    }
    
    // 绘制标签
    ctx.setFontSize(12);
    ctx.setTextAlign('center');
    ctx.setTextBaseline('middle');
    ctx.setFillStyle('#374151');
    
    for (let i = 0; i < labels.length; i++) {
      const angle = -Math.PI / 2 + i * angleStep;
      const labelRadius = radius + 20;
      const x = centerX + Math.cos(angle) * labelRadius;
      const y = centerY + Math.sin(angle) * labelRadius;
      
      ctx.fillText(labels[i], x, y);
    }
  },

  /**
   * 设置报告生成时间
   */
  setReportTime: function () {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    const timeString = `${year}-${month}-${day} ${hours}:${minutes}`;
    this.setData({
      reportTime: timeString
    });
  },

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