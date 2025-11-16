# COS 配置快速指南

## 🚨 紧急修复完成

**"ReferenceError: process is not defined"** 错误已修复！

## 📋 配置清单

### 1. 必需配置项

打开 `config/cos.js` 文件，修改以下配置：

```javascript
const COS_CONFIG = {
  SecretId: "YOUR_SECRET_ID_HERE", // 🔑 必填：腾讯云SecretId
  SecretKey: "YOUR_SECRET_KEY_HERE", // 🔑 必填：腾讯云SecretKey
  Bucket: "", // 📦 必填：存储桶名称
  Region: "", // 🌍 必填：地域
  Domain: "", // 🌐 必填：访问域名
  // ... 其他配置保持不变
};
```

### 2. 获取配置信息

#### 🔑 获取 SecretId 和 SecretKey

1. 访问 [腾讯云访问管理控制台](https://console.cloud.tencent.com/cam/capi)
2. 创建或选择子用户
3. 新建密钥 → 复制 SecretId 和 SecretKey

#### 📦 创建存储桶

1. 访问 [腾讯云 COS 控制台](https://console.cloud.tencent.com/cos5)
2. 创建存储桶 → 设置名称和地域
3. 记录存储桶名称（如：`my-app-bucket-1234567890`）

#### 🌐 配置域名

域名格式：`https://[bucket-name].cos.[region].myqcloud.com`

示例：

- 存储桶：`my-app-bucket-1234567890`
- 地域：`ap-guangzhou`
- 域名：`https://my-app-bucket-1234567890.cos.ap-guangzhou.myqcloud.com`

### 3. 域名白名单配置

在微信开发者工具中：

1. 点击右上角"详情"
2. 选择"本地设置"
3. 在"不校验合法域名"处打勾 ✅
4. 或在项目配置中添加域名到白名单

## 🧪 验证配置

### 方法 1：使用验证工具

1. 打开小程序测试页面
2. 点击"验证 COS 配置"按钮
3. 查看验证结果和建议

### 方法 2：使用综合验证

1. 点击"验证修复状态"按钮
2. 查看完整的修复状态报告
3. 确保所有关键检查项都通过

## 🎯 测试步骤

1. **配置验证** → 点击"验证 COS 配置"
2. **状态检查** → 点击"验证修复状态"
3. **功能测试** → 点击"测试新上传工具"
4. **文件选择** → 点击"测试文件选择"

## ❓ 常见问题

### Q: process is not defined 错误

A: ✅ 已修复！已移除所有 process.env 引用

### Q: 域名配置错误

A: 确保域名格式正确：`https://bucket.cos.region.myqcloud.com`

### Q: 权限不足

A: 确保 SecretId/SecretKey 有 COS 操作权限

### Q: 上传失败

A: 检查存储桶是否存在，域名是否正确

## 📞 获取帮助

如果仍有问题，请：

1. 查看测试页面的详细日志
2. 确认所有配置项都已正确填写
3. 检查网络连接和域名白名单设置

---

**🎉 修复完成！现在可以正常使用文件上传功能了。**
