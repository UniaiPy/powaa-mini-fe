// pages/fullscreen-map/fullscreen-map.js
Page({
  /**
   * 页面的初始数据
   */
  data: {
    longitude: 0,
    latitude: 0,
    name: '',
    address: '',
    markers: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const { longitude, latitude, name, address } = options;
    
    this.setData({
      longitude: Number(longitude),
      latitude: Number(latitude),
      name: decodeURIComponent(name),
      address: decodeURIComponent(address),
      markers: [{
        id: 1,
        longitude: Number(longitude),
        latitude: Number(latitude),
        width: 30,
        height: 40,
        callout: {
          content: decodeURIComponent(name),
          color: '#000',
          fontSize: 14,
          borderRadius: 4,
          bgColor: '#fff',
          padding: 8,
          display: 'BYCLICK'
        }
      }]
    });
    
    // 设置页面标题
    // wx.setNavigationBarTitle({
    //   title: decodeURIComponent(name)
    // });
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {
    // 创建地图上下文
    this.mapContext = wx.createMapContext('fullscreenMap');
  }
});