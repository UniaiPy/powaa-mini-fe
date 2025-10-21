# 小瓦AI分身 微信小程序

## 项目简介
这是一个基于微信小程序的AI分身聊天应用，用户可以通过微信一键登录并与AI分身进行聊天交互。

## 项目结构
```
powaa-mini-fe/
├── app.js             # 小程序入口文件
├── app.json           # 小程序全局配置
├── app.wxss           # 小程序全局样式
├── project.config.json # 小程序项目配置
├── pages/             # 页面文件夹
│   ├── login/         # 登录页面
│   │   ├── login.js
│   │   ├── login.wxml
│   │   └── login.wxss
│   └── chat/          # 聊天页面
│       ├── chat.js
│       ├── chat.wxml
│       └── chat.wxss
├── images/            # 图片资源文件夹
```

## 功能特性

### 1. 微信一键登录
- 用户可以通过微信一键授权登录
- 支持用户协议和隐私政策确认
- 自动保存登录状态

### 2. AI聊天功能
- 支持文字消息发送和接收
- 显示消息发送时间
- 支持消息复制功能
- 支持清空聊天记录
- 显示AI输入状态

## 需要提供的图片资源

以下是项目所需的图片资源，请将这些图片放置在 `images` 文件夹中：

1. 用户头像占位图: `user-avatar.png`
2. AI头像: `ai-avatar.png`
3. 微信图标: `wechat-icon.png`

## 开发说明

### 技术栈
- 微信小程序原生开发
- JavaScript
- WXML/WXSS

### 主要API接口
- 微信登录: `wx.login()`
- 获取用户信息: `wx.getUserProfile()`
- 网络请求: 封装在 app.js 中的 request 方法

### 页面导航
- 登录页面: `/pages/login/login`
- 聊天页面: `/pages/chat/chat`

## 运行说明

1. 使用微信开发者工具打开本项目
2. 配置小程序的appid
3. 编译运行即可查看效果

## 注意事项

1. 确保已在 `app.json` 中正确配置页面路径
2. 图片资源需要按照要求提供
3. 网络请求需要在微信开发者工具中配置合法的域名
