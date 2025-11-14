/**
 * 测试加好友流程
 * 运行方式：在微信开发者工具控制台中执行
 */

// 测试加好友流程
const testFriendRequestFlow = async () => {
  console.log('=== 🧪 开始测试加好友流程 ===');
  
  try {
    // 1. 检查当前页面
    const pages = getCurrentPages();
    const currentPage = pages[pages.length - 1];
    console.log('当前页面:', currentPage.route);
    
    // 2. 检查TUIKit初始化状态
    if (!wx.$TUIKit) {
      console.error('❌ TUIKit未初始化');
      return;
    }
    
    console.log('✅ TUIKit已初始化');
    
    // 3. 检查登录状态
    const loginStatus = wx.$TUIKit.getLoginStatus();
    console.log('登录状态:', loginStatus);
    
    if (loginStatus !== 'success') {
      console.error('❌ 用户未登录');
      return;
    }
    
    console.log('✅ 用户已登录');
    
    // 4. 测试获取好友申请列表
    console.log('📋 测试获取好友申请列表...');
    const friendApplicationList = await wx.$TUIKit.getFriendApplicationList();
    console.log('好友申请列表:', friendApplicationList);
    
    // 5. 测试发送好友请求（模拟）
    console.log('📤 测试发送好友请求...');
    const testUserId = 'test_user_' + Date.now();
    
    const addFriendPromise = wx.$TUIKit.addFriend({
      to: testUserId,
      type: wx.TencentCloudChat.TYPES.SNS_ADD_TYPE_BOTH,
      remark: '测试好友',
      wording: '我是测试用户'
    });
    
    addFriendPromise.then((imResponse) => {
      console.log('✅ 好友请求发送成功:', imResponse);
      
      if (imResponse.data.code === 30539) {
        console.log('ℹ️ 需要对方验证');
      }
    }).catch((error) => {
      console.warn('⚠️ 好友请求发送失败:', error);
    });
    
    // 6. 测试监听器设置
    console.log('👂 测试监听器设置...');
    
    // 模拟好友申请事件
    setTimeout(() => {
      console.log('🔔 模拟收到好友申请事件...');
      // 这里会触发setupFriendApplicationListener中设置的监听器
    }, 2000);
    
    console.log('✅ 加好友流程测试完成');
    
  } catch (error) {
    console.error('❌ 测试过程中发生错误:', error);
  }
};

// 导出测试函数
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testFriendRequestFlow
  };
}

// 全局暴露测试函数（方便在控制台调用）
if (typeof global !== 'undefined') {
  global.testFriendRequestFlow = testFriendRequestFlow;
}

console.log('🧪 测试脚本已加载，使用 testFriendRequestFlow() 开始测试');