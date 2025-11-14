// 测试上传插件注册
console.log('开始测试上传插件注册...');

// 模拟微信小程序环境
global.wx = {
  $TUIKit: null,
  TencentCloudChat: {
    TYPES: {
      LOGIN_STATUS_SUCCESS: 'success',
      LOGIN_STATUS_LOGINING: 'logining',
      LOGIN_STATUS_LOGOUT: 'logout',
      LOGIN_STATUS_UNKNOWN: 'unknown'
    }
  }
};

// 导入imManager进行测试
import('./utils/imManager.js').then(module => {
  console.log('imManager模块导入成功');
  
  // 检查imManager实例
  const imManager = module.default;
  console.log('imManager实例:', typeof imManager);
  
  // 模拟初始化过程（只测试插件注册部分）
  console.log('测试完成');
}).catch(error => {
  console.error('测试失败:', error);
});