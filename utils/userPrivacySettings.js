// 设置用户默认隐私配置 - 在IM登录成功后调用
async function setUserDefaultPrivacySettings() {
  try {
    if (!wx.$TUIKit) {
      console.warn('TUIKit未初始化，跳过隐私设置');
      return;
    }

    // 获取当前用户资料
    const profileRes = await wx.$TUIKit.getMyProfile();
    if (profileRes.code !== 0) {
      console.error('获取用户资料失败:', profileRes);
      return;
    }

    const currentProfile = profileRes.data;
    console.log('当前用户资料:', currentProfile);

    // 检查当前allowType，如果不是NeedConfirm则设置
    if (currentProfile.allowType !== wx.TencentCloudChat.TYPES.ALLOW_TYPE_NEED_CONFIRM) {
      console.log('设置用户隐私配置为需要验证');
      
      const updateRes = await wx.$TUIKit.updateMyProfile({
        allowType: wx.TencentCloudChat.TYPES.ALLOW_TYPE_NEED_CONFIRM
      });

      if (updateRes.code === 0) {
        console.log('✅ 用户隐私配置设置成功：需要验证才能添加好友');
      } else {
        console.error('❌ 设置用户隐私配置失败:', updateRes);
      }
    } else {
      console.log('✅ 用户隐私配置已经是需要验证，跳过设置');
    }
  } catch (error) {
    console.error('设置用户隐私配置出错:', error);
  }
}

// 导出函数
export default {
  setUserDefaultPrivacySettings
};