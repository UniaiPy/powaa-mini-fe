/**
 * 文件上传工具
 * 支持图片和通用文件上传到OSS
 * 支持获取私有图片临时访问URL
 */

const app = getApp();

/**
 * 通用文件上传方法
 * @param {Object} options - 上传配置
 * @param {string} options.filePath - 要上传的文件路径
 * @param {string} [options.type='file'] - 上传类型，'file'或'image'
 * @param {string} [options.folder='files'] - 存储文件夹名称
 * @param {boolean} [options.showLoading=true] - 是否显示加载提示
 * @param {string} [options.loadingTitle='上传中...'] - 加载提示文字
 * @returns {Promise} - 返回Promise对象
 */
function uploadFile(options) {
  const {
    filePath,
    type = 'file', // 'file' 或 'image'
    folder = type === 'image' ? 'images' : 'files',
    showLoading = true,
    loadingTitle = '上传中...'
  } = options;

  return new Promise((resolve, reject) => {
    // 验证参数
    if (!filePath) {
      reject(new Error('文件路径不能为空'));
      return;
    }

    // 获取应用实例和token
    const app = getApp();
    const token = app.globalData.token;
    const isValidToken = token && typeof token === 'string' && token.trim().length > 0;

    // 确定上传接口
    const uploadUrl = app.globalData.baseUrl + `/api/upload/${type}`;

    // 显示加载提示
    if (showLoading) {
      wx.showLoading({
        title: loadingTitle,
      });
    }

    // 执行上传
    wx.uploadFile({
      url: uploadUrl,
      filePath: filePath,
      name: 'file', // 必须与后端参数名一致
      formData: {
        folder: folder
      },
      header: {
        'Authorization': isValidToken ? `Bearer ${token}` : ''
      },
      success: (res) => {
        try {
          // 解析响应数据
          let responseData;
          try {
            responseData = JSON.parse(res.data);
          } catch (e) {
            throw new Error('无效的响应格式');
          }

          // 处理响应
          if (responseData.success && responseData.data && responseData.data.url) {
            // 上传成功 - 格式1: {success: true, data: {url: 'xxx', key: 'xxx'}}
            resolve({
              success: true,
              url: responseData.data.url,
              key: responseData.data.key || null, // 获取OSS文件键
              message: responseData.message || '上传成功',
              data: responseData.data
            });
          } else if (responseData.success && responseData.url) {
            // 上传成功 - 格式2: {success: true, url: 'xxx', key: 'xxx'}
            resolve({
              success: true,
              url: responseData.url,
              key: responseData.key || null, // 获取OSS文件键
              message: responseData.message || '上传成功',
              data: responseData
            });
          } else {
            // 上传失败
            reject(new Error(responseData.message || '上传失败'));
          }
        } catch (error) {
          reject(error);
        }
      },
      fail: (err) => {
        console.error('上传失败:', err);
        reject(new Error('网络错误，上传失败'));
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

module.exports = {
  uploadFile,
  uploadImage,
  uploadGenericFile,
  compressAndUploadImage,
  getSignedUrl,
  getImageUrl
};