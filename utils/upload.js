/**
 * 文件上传工具
 * 支持图片和通用文件上传到OSS
 * 支持获取私有图片临时访问URL
 * 使用ECS扮演RAM角色获取STS临时凭证直接上传到OSS
 */

/**
 * 获取STS临时访问凭证
 * @param {string} type - 上传类型，'file'或'image'
 * @returns {Promise} - 返回Promise对象，包含STS临时凭证
 */
async function getSTSCredentials(type = 'file') {
  const app = getApp();
  const token = app.globalData.token;
  const isValidToken = token && typeof token === 'string' && token.trim().length > 0;

  return new Promise((resolve, reject) => {
    // 调用后端API获取STS临时凭证
    wx.request({
      url: app.globalData.baseUrl + '/api/upload/credentials',
      method: 'GET',
      data: {
        type: type
      },
      header: {
        'Authorization': isValidToken ? `Bearer ${token}` : ''
      },
      success: (res) => {
        try {
          const responseData = res.data;
          
          if (responseData && responseData.success && responseData.data) {
            resolve({
              accessKeyId: responseData.data.accessKeyId,
              accessKeySecret: responseData.data.accessKeySecret,
              securityToken: responseData.data.securityToken,
              bucket: responseData.data.bucket,
              endpoint: responseData.data.endpoint,
              region: responseData.data.region,
              expiration: responseData.data.expiration
            });
          } else {
            const errorMsg = responseData && responseData.message 
              ? `获取STS凭证失败: ${responseData.message}` 
              : '获取STS凭证失败: 服务器返回数据格式不正确';
            reject(new Error(errorMsg));
          }
        } catch (error) {
          console.error('处理STS凭证响应时发生异常:', error);
          reject(new Error('处理STS凭证响应失败'));
        }
      },
      fail: (err) => {
        console.error('获取STS凭证失败:', err);
        reject(new Error('网络错误，获取STS凭证失败'));
      }
    });
  });
}

/**
 * 生成OSS上传路径
 * @param {string} filePath - 本地文件路径
 * @param {string} folder - 存储文件夹
 * @returns {string} - 返回OSS上传路径
 */
function generateOssKey(filePath, folder = 'images') {
  // 从文件路径中提取文件名
  const fileName = filePath.substr(filePath.lastIndexOf('/') + 1);
  // 生成唯一文件名，避免重复
  const timestamp = new Date().getTime();
  const random = Math.floor(Math.random() * 10000);
  return `${folder}/${timestamp}_${random}_${fileName}`;
}

/**
 * 通用文件上传方法 - 使用STS临时凭证直接上传到OSS
 * @param {Object} options - 上传配置
 * @param {string} options.filePath - 要上传的文件路径
 * @param {string} [options.type='file'] - 上传类型，'file'或'image'
 * @param {string} [options.folder='files'] - 存储文件夹名称
 * @param {boolean} [options.showLoading=true] - 是否显示加载提示
 * @param {string} [options.loadingTitle='上传中...'] - 加载提示文字
 * @returns {Promise} - 返回Promise对象
 */
async function uploadFile(options) {
  const {
    filePath,
    type = 'file', // 'file' 或 'image'
    folder = type === 'image' ? 'images' : 'files',
    showLoading = true,
    loadingTitle = '上传中...'
  } = options;

  // 验证参数
  if (!filePath) {
    throw new Error('文件路径不能为空');
  }

  try {
    // 显示加载提示
    if (showLoading) {
      wx.showLoading({
        title: loadingTitle,
      });
    }

    // 1. 获取STS临时凭证
    const stsCredentials = await getSTSCredentials(type);
    console.log('✅ 获取STS临时凭证成功:', stsCredentials);

    // 2. 生成OSS上传路径
    const ossKey = generateOssKey(filePath, folder);
    console.log('✅ 生成OSS上传路径:', ossKey);

    // 3. 直接上传到OSS
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: `https://${stsCredentials.bucket}.${stsCredentials.endpoint}`,
        filePath: filePath,
        name: 'file',
        formData: {
          'key': ossKey,
          'policy': stsCredentials.policy || '',
          'OSSAccessKeyId': stsCredentials.accessKeyId,
          'success_action_status': '200',
          'signature': stsCredentials.signature || '',
          'x-oss-security-token': stsCredentials.securityToken
        },
        success: (res) => {
          try {
            if (res.statusCode === 200) {
              // 上传成功
              const ossUrl = `https://${stsCredentials.bucket}.${stsCredentials.endpoint}/${ossKey}`;
              resolve({
                success: true,
                url: ossUrl,
                key: ossKey,
                message: '上传成功',
                data: {
                  url: ossUrl,
                  key: ossKey
                }
              });
            } else {
              // 上传失败
              reject(new Error(`OSS上传失败，状态码: ${res.statusCode}`));
            }
          } catch (error) {
            reject(error);
          }
        },
        fail: (err) => {
          console.error('OSS上传失败:', err);
          reject(new Error('网络错误，OSS上传失败'));
        },
        complete: () => {
          // 隐藏加载提示
          if (showLoading) {
            wx.hideLoading();
          }
        }
      });
    });
  } catch (error) {
    // 隐藏加载提示
    if (showLoading) {
      wx.hideLoading();
    }
    throw error;
  }
}

/**
 * 图片上传方法（专用）
 * @param {Object} options - 上传配置
 * @param {string} options.filePath - 要上传的图片路径
 * @param {string} [options.folder='images'] - 存储文件夹名称
 * @param {boolean} [options.showLoading=true] - 是否显示加载提示
 * @param {string} [options.loadingTitle='上传中...'] - 加载提示文字
 * @returns {Promise} - 返回Promise对象
 */
function uploadImage(options) {
  return uploadFile({
    ...options,
    type: 'image',
    folder: options.folder || 'images'
  });
}

/**
 * 文件上传方法（专用）
 * @param {Object} options - 上传配置
 * @param {string} options.filePath - 要上传的文件路径
 * @param {string} [options.folder='files'] - 存储文件夹名称
 * @param {boolean} [options.showLoading=true] - 是否显示加载提示
 * @param {string} [options.loadingTitle='上传中...'] - 加载提示文字
 * @returns {Promise} - 返回Promise对象
 */
function uploadGenericFile(options) {
  return uploadFile({
    ...options,
    type: 'file',
    folder: options.folder || 'files'
  });
}

/**
 * 压缩图片并上传
 * @param {Object} options - 上传配置
 * @param {string} options.filePath - 要上传的图片路径
 * @param {number} [options.sizeLimit=2] - 文件大小限制（MB），超过则压缩
 * @param {number} [options.quality=75] - 压缩质量（0-100）
 * @param {string} [options.folder='images'] - 存储文件夹名称
 * @param {boolean} [options.showLoading=true] - 是否显示加载提示
 * @param {string} [options.loadingTitle='上传中...'] - 加载提示文字
 * @returns {Promise} - 返回Promise对象
 */
function compressAndUploadImage(options) {
  const {
    filePath,
    sizeLimit = 2, // MB
    quality = 75,
    folder = 'images',
    showLoading = true,
    loadingTitle = '上传中...'
  } = options;

  return new Promise((resolve, reject) => {
    // 检查文件大小
    const fs = wx.getFileSystemManager();
    
    try {
      const fileInfo = fs.getFileInfoSync(filePath);
      
      // 如果文件大小超过限制，先压缩
      if (fileInfo.size > sizeLimit * 1024 * 1024) {
        wx.compressImage({
          src: filePath,
          quality: quality,
          success: (res) => {
            // 使用压缩后的图片上传
            uploadImage({
              filePath: res.tempFilePath,
              folder: folder,
              showLoading: showLoading,
              loadingTitle: loadingTitle
            }).then(resolve).catch(reject);
          },
          fail: (err) => {
            console.error('图片压缩失败:', err);
            // 压缩失败时，尝试直接上传原图
            uploadImage({
              filePath: filePath,
              folder: folder,
              showLoading: showLoading,
              loadingTitle: loadingTitle
            }).then(resolve).catch(reject);
          }
        });
      } else {
        // 文件大小符合要求，直接上传
        uploadImage({
          filePath: filePath,
          folder: folder,
          showLoading: showLoading,
          loadingTitle: loadingTitle
        }).then(resolve).catch(reject);
      }
    } catch (error) {
      console.error('获取文件信息失败:', error);
      // 获取文件信息失败时，尝试直接上传
      uploadImage({
        filePath: filePath,
        folder: folder,
        showLoading: showLoading,
        loadingTitle: loadingTitle
      }).then(resolve).catch(reject);
    }
  });
}

/**
 * 获取私有图片临时访问URL
 * @param {Object} options - 配置参数
 * @param {string} options.key - OSS文件键
 * @param {number} [options.expires=3600] - URL有效期（秒），默认1小时
 * @param {boolean} [options.showLoading=false] - 是否显示加载提示
 * @returns {Promise} - 返回Promise对象，包含临时访问URL
 */
function getSignedUrl(options) {
  const {
    key,
    expires = 3600,
    showLoading = false
  } = options;

  return new Promise((resolve, reject) => {
    // 验证参数
    if (!key) {
      reject(new Error('OSS文件键不能为空'));
      return;
    }

    // 获取应用实例和token
    const app = getApp();
    const token = app.globalData.token;
    const isValidToken = token && typeof token === 'string' && token.trim().length > 0;

    // 确定获取签名URL接口
    const signedUrlApi = app.globalData.baseUrl + '/api/upload/signed-url';

    // 显示加载提示
    if (showLoading) {
      wx.showLoading({
        title: '获取访问链接中...',
      });
    }

    // 发送请求获取临时URL
    wx.request({
      url: signedUrlApi,
      method: 'GET',
      data: {
        key: key,
        expires: expires
      },
      header: {
        'Authorization': isValidToken ? `Bearer ${token}` : ''
      },
      success: (res) => {
        try {
          const responseData = res.data;
          
          console.log('获取临时URL响应数据:', responseData);
          
          if (responseData && responseData.success && responseData.data && responseData.data.url) {
            resolve({
              success: true,
              url: responseData.data.url,
              message: responseData.message || '获取临时URL成功',
              data: responseData.data
            });
          } else {
            // 构建更明确的错误信息
            const errorMsg = responseData && responseData.message 
              ? `获取临时URL失败: ${responseData.message}` 
              : '获取临时URL失败: 服务器返回数据格式不正确';
            reject(new Error(errorMsg));
          }
        } catch (error) {
          console.error('处理临时URL响应时发生异常:', error);
          reject(new Error('处理临时URL响应失败'));
        }
      },
      fail: (err) => {
        console.error('获取临时URL失败:', err);
        reject(new Error('网络错误，获取临时URL失败'));
      },
      complete: () => {
        // 隐藏加载提示
        if (showLoading) {
          wx.hideLoading();
        }
      }
    });
  });
}

/**
 * 使用OSS文件键显示图片
 * @param {Object} options - 配置参数
 * @param {string} options.key - OSS文件键
 * @param {number} [options.expires=3600] - URL有效期（秒），默认1小时
 * @returns {Promise} - 返回Promise对象，包含临时访问URL
 */
function getImageUrl(options) {
  return getSignedUrl(options);
}

/**
 * 创建IM文件消息（使用测试验证成功的微信格式）
 * @param {Object} options - 配置参数
 * @param {string} options.to - 接收者ID
 * @param {string} options.conversationType - 会话类型，默认'C2C'
 * @param {Object} options.file - 文件对象（来自wx.chooseMessageFile的返回）
 * @returns {Object} - 返回创建的文件消息对象
 */
function createIMFileMessage(options) {
  const {
    to,
    conversationType = 'C2C',
    file
  } = options;

  if (!wx.$TUIKit || !wx.TencentCloudChat) {
    throw new Error('IM未初始化，无法创建文件消息');
  }

  if (!to) {
    throw new Error('接收者ID不能为空');
  }

  if (!file) {
    throw new Error('文件对象不能为空');
  }

  // 使用测试验证成功的微信格式
  const wxFile = {
    type: 'file',
    tempFiles: [{
      tempFilePath: file.path,
      name: file.name,
      size: file.size
    }]
  };

  const message = wx.$TUIKit.createFileMessage({
    to: to,
    conversationType: wx.TencentCloudChat.TYPES.CONV_C2C,
    payload: {
      file: wxFile
    }
  });

  console.log('✅ 使用微信格式创建文件消息成功:', message);
  return message;
}

/**
 * 发送文件消息到IM
 * @param {Object} options - 配置参数
 * @param {string} options.to - 接收者ID
 * @param {Object} options.file - 文件对象（来自wx.chooseMessageFile的返回）
 * @param {boolean} [options.showLoading=true] - 是否显示加载提示
 * @returns {Promise} - 返回Promise对象
 */
function sendFileMessage(options) {
  const {
    to,
    file,
    showLoading = true
  } = options;

  return new Promise(async (resolve, reject) => {
    try {
      // 显示加载提示
      if (showLoading) {
        wx.showLoading({
          title: '发送文件中...',
        });
      }

      // 创建文件消息
      const message = createIMFileMessage({
        to: to,
        file: file
      });

      // 创建会话ID
      const conversationID = `C2C${to}`;

      // 发送消息
      const result = await wx.$TUIKit.sendMessage(message, {
        conversationID: conversationID
      });

      console.log('✅ 文件消息发送成功:', result);
      resolve({
        success: true,
        message: result,
        data: {
          conversationID: conversationID,
          messageID: result.data.messageID,
          file: {
            name: file.name,
            size: file.size
          }
        }
      });

    } catch (error) {
      console.error('❌ 文件消息发送失败:', error);
      reject(error);
    } finally {
      // 隐藏加载提示
      if (showLoading) {
        wx.hideLoading();
      }
    }
  });
}

/**
 * 选择文件并发送到IM
 * @param {Object} options - 配置参数
 * @param {string} options.to - 接收者ID
 * @param {number} [options.count=1] - 选择文件数量限制
 * @param {string} [options.type='file'] - 文件类型
 * @returns {Promise} - 返回Promise对象
 */
function chooseAndSendFile(options) {
  const {
    to,
    count = 1,
    type = 'file'
  } = options;

  return new Promise(async (resolve, reject) => {
    try {
      // 选择文件
      const chooseResult = await wx.chooseMessageFile({
        count: count,
        type: type
      });

      if (!chooseResult.tempFiles || chooseResult.tempFiles.length === 0) {
        reject(new Error('未选择文件'));
        return;
      }

      const file = chooseResult.tempFiles[0];
      console.log('📁 选择文件成功:', {
        name: file.name,
        size: file.size,
        path: file.path
      });

      // 发送文件消息
      const sendResult = await sendFileMessage({
        to: to,
        file: file
      });

      resolve({
        success: true,
        file: file,
        message: sendResult
      });

    } catch (error) {
      console.error('❌ 选择并发送文件失败:', error);
      reject(error);
    }
  });
}

module.exports = {
  uploadFile,
  uploadImage,
  uploadGenericFile,
  compressAndUploadImage,
  getSignedUrl,
  getImageUrl,
  createIMFileMessage,
  sendFileMessage,
  chooseAndSendFile
};