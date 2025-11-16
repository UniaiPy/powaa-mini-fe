// COS配置文件
// 微信小程序环境配置，请根据实际情况修改以下配置

const COS_CONFIG = {
  // 腾讯云COS配置 - 请填入真实的配置信息
  SecretId: 'YOUR_SECRET_ID_HERE', // 替换为您的腾讯云SecretId
  SecretKey: 'YOUR_SECRET_KEY_HERE', // 替换为您的腾讯云SecretKey
  // COS存储桶配置
  Bucket: '', // 替换为您的存储桶名称
  Region: '', // 替换为您的地域
  // 文件上传配置 - 自动生成域名
  Domain: '', // 替换为您的COS域名，格式如：https://bucket-name.cos.region.myqcloud.com
  
  // 上传限制
  MaxFileSize: 100 * 1024 * 1024, // 100MB
  AllowedFileTypes: [
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', // 图片
    'mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv',   // 视频
    'mp3', 'wav', 'flac', 'aac', 'm4a',         // 音频
    'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', // 文档
    'txt', 'md', 'zip', 'rar', '7z'             // 其他
  ]
}

export default COS_CONFIG