## [4.1.0] (2025-11-20)
## Feature
- 支持富媒体消息秒传
- 支持抖音小游戏
- 支持微信小游戏
## Fix
- 修复 `isPeerRead` 不准确问题
- 修复 uniapp 打包 app 在部分 ios 机型下图片上传失败问题
- 修复 Live 自定义通知解析问题
- 优化 `acceptFriendApplication` 参数校验
- 优化 `joinGroup` 返回值格式

## [4.0.0] (2025-11-06)
V4 SDK (@tencentcloud/lite-chat) 是 V3 SDK (@tencentcloud/chat) 新架构版本。
- 体积优化，按需集成：
  - 提供精简版、标准版、完整版，支持开发者按需引入，精简版包体积 200 KB 左右。
- 简化集成流程：
  - V4 架构简化了富媒体消息的上传流程，无需额外引入和注册上传插件。
- 面向未来的持续迭代：
  - V4 版本与 V3 保持高度兼容，且未来所有的新功能和技术迭代都将基于 V4 版本进行持续新增。

## [1.6.0] (2025-10-28)
## Feature
- 增加群消息指定功能
  - `pinGroupMessage`：置顶或取消置顶群消息
  - `getPinnedGroupMessageList`：获取已置顶的群消息列表
- `getGroupMemberList` 返回值增加 nameCard
## Optimization
- 优化日志打印和上报
## Fix
- 修复会话 lastMessage 为群提示消息时，payload 为空的问题

## [1.5.2] (2025-10-17)
## Fix
- 修复撤回消息 revokerInfo 不更新问题
- 修复删除会话不抛出 `CONVERSATION_LIST_UPDATED` 事件问题
- 修复服务端 API 创建群，其他用户加入群聊，群内用户收不到 `CONVERSATION_LIST_UPDATED` 事件问题

## [1.5.1] (2025-10-13)
## 精简版
#### Feature
- 适配 uni-app 打包 App 和 H5

## [1.5.0] (2025-09-28)
## 精简版
#### Feature
- getUserProfile 支持缓存陌生人资料
- updateMyProfile 支持更新自定义字段
- 支持 live 获取云控配置和云控配置变更通知
- 支持禁用独立域名

#### Fix
- 优化发送消息成功上屏重复的问题
- 优化新建会话群资料不完善和未读总数不更新的问题

## 标准版
#### Feature
- 支持获取 live 进房前消息
- 支持 live 消息返回用户等级字段 level
- 支持 live 发送组合消息
- 支持获取直播群在线成员列表 groupID 纬度频控

#### Fix
- 优化 live 长轮询启动时序
- 优化重复加入同一个直播群报错的问题
- 优化群提示消息引起的会话未读数跳变问题


## [1.4.1] (2025-09-05)
## 精简版
#### Feature
- 优化 websocket 重连策略，提升稳定性
- 支持精简版与标准版、完整版共享 chat 实例

#### Fix
- 解决漫游拉完后，切换会话重新进入时重复从后台拉消息的问题

## [1.4.0] (2025-08-29)
## 精简版
#### Feature
- websocket 支持 ipv6 域名
- 支持弱网环境下消息补偿

#### Fix
- 解决重复登录问题

## [1.3.0] (2025-08-06)
## 精简版
#### Feature
- 适配桌面版微信（mac 4.x 和 windows 3.9.x）小程序

## 标准版
#### Feature
- 支持社群
- 支持直播群
  - `getGroupOnlineMemberCount`: 获取直播群在线成员人数
  - `getGroupMemberList`: 获取直播群成员列表
  - `deleteGroupMember`: 删除直播群成员
  - `markGroupMemberList`: 标记直播群成员
- 支持群计数器
  - `setGroupCounters`: 设置群计数器
  - `increaseGroupCounter`: 递增群计数器
  - `decreaseGroupCounter`: 递减群计数器
  - `getGroupCounters`: 获取群计数器
- 支持消息扩展
  - `setMessageExtensions`: 设置消息扩展
  - `getMessageExtensions`: 获取消息扩展
  - `deleteMessageExtensions`: 删除消息扩展
- 支持消息全局免打扰
  - `setAllReceiveMessageOpt`: 设置全局消息免打扰选项
  - `getAllReceiveMessageOpt`: 获取全局消息免打扰选项
- `setAllMessageRead`: 将所有会话的未读消息设置为已读
- `clearHistoryMessage`: 清空单聊或群聊本地及云端的消息（不删除会话）


## 完整版
#### Feature
- 支持会话分组
  - `setConversationCustomData`: 设置自定义会话数据
  - `markConversationList`: 标记会话
  - `getConversationGroupList`: 获取会话分组列表
  - `createConversationGroup`: 创建会话分组
  - `deleteConversationGroup`: 删除会话分组
  - `renameConversationGroup`: 重命名会话分组
  - `addConversationsToGroup`: 添加会话到一个会话分组
  - `deleteConversationsFromGroup`: 从一个会话分组中删除会话
- 支持话题
  - `getJoinedCommunityList`: 获取支持话题的社群列表
  - `createTopicInCommunity`: 创建话题
  - `deleteTopicFromCommunity`: 删除话题
  - `updateTopicProfile`: 更新话题资料
  - `getTopicList`: 获取话题列表

## [1.2.1] (2025-07-08)
## 精简版
#### Feature
- `create`: 创建 SDK 实例
- `destroy`: 销毁 SDK 实例
- `on`: 监听事件
- `off`: 取消监听事件
- `login`: 登录
- `logout`: 登出
- `getLoginUser`: 已登录返回登录用户的 userID，未登录返回空字符串
- `createTextMessage`: 创建文本消息
- `createCustomMessage`: 创建自定义消息
- `sendMessage`: 发送消息（支持单聊和群聊消息）
- `getMyProfile`: 获取个人资料
- `getUserProfile`: 获取其他用户资料
- `updateMyProfile`: 更新个人资料
- `setSelfStatus`: 设置自己的自定义状态
- `getUserStatus`: 查询用户状态
- `subscribeUserStatus`: 订阅用户状态
- `unsubscribeUserStatus`: 取消订阅用户状态
- 支持在小程序插件环境中集成 SDK

## 标准版
#### Feature
- `createFaceMessage`: 创建表情消息
- `createTextAtMessage`: 创建文本@消息
- `createForwardMessage`: 创建转发消息
- `createLocationMessage`: 创建地理位置消息
- `createMergerMessage`: 创建合并消息
- `downloadMergerMessage`: 下载合并消息
- `translateText`: 翻译文本消息
- `convertVoiceToText`: 语音转文字
- `addMessageReaction`: 添加消息回应
- `removeMessageReaction`: 删除消息回应
- `getMessageReactions`: 批量获取多条消息回应信息
- `getAllUserListOfMessageReaction`: 分页拉取指定消息回应的用户列表
- `sendMessageReadReceipt`: 发送消息已读回执
- `getMessageReadReceiptList`: 获取消息已读回执列表
- `getGroupMessageReadMemberList`: 获取群消息已读（或未读）群成员列表
- `findMessage`: 根据 messageID 查询会话的本地消息
- `getMessageList`: 获取历史消息列表（支获取单聊）
- `getMessageListHopping`: 根据指定的消息 sequence(群聊) 或 time(单聊) 获取历史消息（支获取单聊）
- `modifyMessage`: 修改消息
- `searchCloudMessages`: 搜索云端消息
- `searchCloudUsers`: 搜索云端用户
- `searchCloudGroupMembers`: 搜索云端群成员列表
- `searchCloudGroups`: 搜索云端群组列表
- `getConversationList`: 获取会话列表
- `getConversationProfile`: 获取会话资料
- `getTotalUnreadMessageCount`: 获取消息未读总数
- `setMessageRead`: 已读上报
- `pinConversation`: 会话置顶
- `deleteConversation`: 删除会话
- `setMessageRemindType`: 消息免打扰
- `setConversationDraft`: 会话草稿
- `getGroupList`: 获取已加入的群组列表
- `getGroupProfile`: 获取群资料
- `createGroup`: 创建群组
- `dismissGroup`: 解散群组
- `updateGroupProfile`: 更新群资料
- `joinGroup`: 申请加群
- `quitGroup`: 主动退群
- `searchGroupByID`: 通过群ID搜索群组
- `getGroupOnlineMemberCount`: 获取群在线人数
- `getGroupApplicationList`: 获取加群申请列表
- `handleGroupApplication`: 处理加群申请和邀请进群申请
- `initGroupAttributes`: 初始化群属性
- `setGroupAttributes`: 设置群属性
- `deleteGroupAttributes`: 删除群属性
- `getGroupAttributes`: 获取群属性
- `getGroupMemberList`: 获取群成员列表
- `getGroupMemberProfile`: 获取群成员资料
- `addGroupMember`: 添加群成员
- `deleteGroupMember`: 删除群成员
- `setGroupMemberMuteTime`: 设置群成员禁言
- `setGroupMemberRole`: 设置群成员角色
- `setGroupMemberNameCard`: 设置群成员名片
- `setGroupMemberCustomField`: 设置群成员自定义字段
- `addSignalingListener`: 监听信令事件
- `removeSignalingListener`: 移除监听信令事件
- `invite`: 邀请某个人
- `cancel`: 邀请发起者取消邀请
- `accept`: 被邀请人接收邀请
- `reject`: 被邀请人拒绝邀请
- `modifyInvitation`: 修改邀请信令
- 支持断网重连恢复群撤回通知

## 完整版
#### Feature
- `getBlacklist`: 获取黑名单列表
- `addToBlacklist`: 添加用户到黑名单列表
- `removeFromBlacklist`: 从黑名单列表中移除用户
- `getFriendList`: 获取好友列表
- `addFriend`: 添加好友
- `deleteFriend`: 删除好友
- `checkFriend`: 检验好友关系
- `getFriendProfile`: 获取好友全量资料
- `updateFriend`: 更新好友关系链数据
- `getFriendApplicationList`: 获取好友申请列表
- `acceptFriendApplication`: 接受好友申请
- `refuseFriendApplication`: 拒绝好友申请
- `deleteFriendApplication`: 删除好友申请
- `setFriendApplicationRead`: 设置好友申请已读
- `getFriendGroupList`: 获取好友分组列表
- `createFriendGroup`: 创建好友分组
- `deleteFriendGroup`: 删除好友分组
- `addToFriendGroup`: 添加好友到分组
- `removeFromFriendGroup`: 从分组中移除好友
- `renameFriendGroup`: 修改好友分组名称
- `followUser`: 关注用户
- `unfollowUser`: 取消关注
- `getMyFollowersList`: 获取我的粉丝列表
- `getMyFollowingList`: 获取我的关注列表
- `getMutualFollowersList`: 获取互关列表
- `getUserFollowInfo`: 获取指定用户的 关注/粉丝/互关 数量信息
- `checkFollowType`: 检查指定用户的关注关系

## [1.2.0] (2025-06-19)
## Core
#### Feature
- `createTextMessage`: 创建文本消息
- `subscribeUserStatus`: 订阅用户状态
- `unsubscribeUserStatus`: 取消订阅用户状态

## Plugins
### conversation
#### Feature
- `setMessageRead`: 已读上报
- `pinConversation`: 会话置顶
- `deleteConversation`: 删除会话
- `setMessageRemindType`: 消息免打扰
- `setConversationDraft`: 会话草稿
- 群@消息展示

### message-enhancer
#### Feature
- `createFaceMessage`: 创建表情消息
- `createTextAtMessage`: 创建文本@消息
- `createForwardMessage`: 创建转发消息
- `createMergerMessage`: 创建合并消息
- `downloadMergerMessage`: 下载合并消息
- `translateText`: 翻译文本消息
- `convertVoiceToText`: 语音转文字
- `addMessageReaction`: 添加消息回应
- `removeMessageReaction`: 删除消息回应
- `getMessageReactions`: 批量获取多条消息回应信息
- `getAllUserListOfMessageReaction`: 分页拉取指定消息回应的用户列表
- `sendMessageReadReceipt`: 发送消息已读回执
- `getMessageReadReceiptList`: 获取消息已读回执列表
- `getGroupMessageReadMemberList`: 获取群消息已读（或未读）群成员列表
- `findMessage`: 根据 messageID 查询会话的本地消息
- `getMessageList`: 获取历史消息列表（支获取单聊）
- `getMessageListHopping`: 根据指定的消息 sequence(群聊) 或 time(单聊) 获取历史消息（支获取单聊）
- 从 message-enhancer 插件移除 `createTextMessage`

### cloud-search
#### Feature
- `searchCloudMessages`: 搜索云端消息
- `searchCloudUsers`: 搜索云端用户
- `searchCloudGroupMembers`: 搜索云端群成员列表

### group
#### Feature
- `getGroupList`: 获取已加入的群组列表
- `getGroupProfile`: 获取群资料
- `createGroup`: 创建群组
- `dismissGroup`: 解散群组
- `updateGroupProfile`: 更新群资料
- `joinGroup`: 申请加群
- `quitGroup`: 主动退群
- `searchGroupByID`: 通过群ID搜索群组
- `getGroupOnlineMemberCount`: 获取群在线人数
- `getGroupApplicationList`: 获取加群申请列表
- `handleGroupApplication`: 处理加群申请和邀请进群申请
- `initGroupAttributes`: 初始化群属性
- `setGroupAttributes`: 设置群属性
- `deleteGroupAttributes`: 删除群属性
- `getGroupAttributes`: 获取群属性
- `getGroupMemberList`: 获取群成员列表
- `getGroupMemberProfile`: 获取群成员资料
- `addGroupMember`: 添加群成员
- `deleteGroupMember`: 删除群成员
- `setGroupMemberMuteTime`: 设置群成员禁言
- `setGroupMemberRole`: 设置群成员角色
- `setGroupMemberNameCard`: 设置群成员名片
- `setGroupMemberCustomField`: 设置群成员自定义字段
注意： 以上接口均不支持社群和直播群。

### friend
#### Feature
- `getBlacklist`: 获取黑名单列表
- `addToBlacklist`: 添加用户到黑名单列表
- `removeFromBlacklist`: 从黑名单列表中移除用户
- `getFriendList`: 获取好友列表
- `addFriend`: 添加好友
- `deleteFriend`: 删除好友
- `checkFriend`: 检验好友关系
- `getFriendProfile`: 获取好友全量资料
- `updateFriend`: 更新好友关系链数据
- `getFriendApplicationList`: 获取好友申请列表
- `acceptFriendApplication`: 接受好友申请
- `refuseFriendApplication`: 拒绝好友申请
- `deleteFriendApplication`: 删除好友申请
- `setFriendApplicationRead`: 设置好友申请已读
- `getFriendGroupList`: 获取好友分组列表
- `createFriendGroup`: 创建好友分组
- `deleteFriendGroup`: 删除好友分组
- `addToFriendGroup`: 添加好友到分组
- `removeFromFriendGroup`: 从分组中移除好友
- `renameFriendGroup`: 修改好友分组名称

# 1.1.1 (2025-04-29)
## Core
#### Feature
- 优化 SDK 导出方式，兼容 require 引用。
- 增加插件 ts 类型声明。
# 1.1.0 (2025-04-18)
新增插件注册功能，新增会话管理、富媒体消息和消息增强插件。
## Core
#### Feature
- `use`: 注册插件
- `sendMessage`: 支持发送群消息   

## Plugins
### conversation
参考教程：[集成会话插件](https://cloud.tencent.com/document/product/269/117335#4fab05e6-27ac-4f78-9bb8-d5bb31f2138a)。
#### Feature
- `getConversationList`: 获取会话列表
- `getConversationProfile`: 获取会话资料
- `getTotalUnreadMessageCount`: 获取消息未读总数

### rich-media-message
参考教程：[集成富媒体消息插件](https://cloud.tencent.com/document/product/269/117335#387fe2f-d973-4161-b9bb-5926396fbb0d)。
#### Feature
- `createImageMessage`: 创建图片消息
- `createAudioMessage`: 创建语音消息
- `createVideoMessage`: 创建视频消息
- `createFileMessage`: 创建文件消息

### message-enhancer
参考教程：[集成消息增强插件](https://cloud.tencent.com/document/product/269/117335#672e1edd-b8b4-4143-baa6-16487e2c321f)
#### Feature
- `createTextMessage`: 创建文本消息
- `deleteMessage`: 删除消息
- `revokeMessage`: 撤回消息
- `resendMessage`: 重发消息
- `getMessageList`: 获取消息列表（仅支持群消息）
- `getMessageListHopping`: 根据指定的消息 sequence 拉取会话的消息列表（仅支持群消息）
- 支持断网恢复群会话历史消息。
# 1.0.0 (2025-03-21)
[Tencent Cloud Lite Chat SDK]() 是 [Tencent Cloud Chat SDK](https://www.npmjs.com/package/@tencentcloud/chat) 的轻量级替代方案，使用微内核架构，内核实现核心功能，并支持通过插件扩展。
## Core
#### Feature
- `create`: 创建 SDK 实例
- `destroy`: 销毁 SDK 实例
- `on`: 监听事件
- `off`: 取消监听事件
- `login`: 登录
- `logout`: 登出
- `getLoginUser`: 已登录返回登录用户的 userID，未登录返回空字符串
- `sendMessage`: 发送消息，只支持 C2C 消息
- `createCustomMessage`: 创建自定义消息
- `getMyProfile`: 获取个人资料
- `getUserProfile`: 获取其他用户资料
- `updateMyProfile`: 更新个人资料
- `setSelfStatus`: 设置自己的自定义状态
- `getUserStatus`: 查询用户状态
- `addSignalingListener`: 监听信令事件
- `removeSignalingListener`: 移除监听信令事件
- `invite`: 邀请某个人
- `cancel`: 邀请发起者取消邀请
- `accept`: 被邀请人接收邀请
- `reject`: 被邀请人拒绝邀请
- `modifyInvitation`: 修改邀请信令
