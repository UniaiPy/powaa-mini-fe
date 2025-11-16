/**
 * 时间格式化工具函数
 * 实现微信风格的时间显示规则
 */

/**
 * 格式化时间 - 微信风格
 * @param {number} timestamp - 时间戳（秒或毫秒）
 * @returns {string} 格式化后的时间字符串
 */
function formatTime(timestamp) {
  if (!timestamp) return '';
  
  // 检查时间戳格式，如果是秒级时间戳（10位数），转换为毫秒级
  const timestampMs = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
  
  const date = new Date(timestampMs);
  const now = new Date();
  
  // 获取各个时间点的零点时间戳
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - (24 * 60 * 60 * 1000);
  const sixDaysAgoStart = todayStart - (6 * 24 * 60 * 60 * 1000);
  const sevenDaysAgoStart = todayStart - (7 * 24 * 60 * 60 * 1000);
  
  const messageTime = date.getTime();
  
  // 格式化时间部分 HH:mm
  const formatTime = (d) => {
    return d.getHours().toString().padStart(2, '0') + ':' + 
           d.getMinutes().toString().padStart(2, '0');
  };
  
  // 1. 大于等于今天零点时间戳，显示格式 HH:mm
  if (messageTime >= todayStart) {
    return formatTime(date);
  }
  // 2. 大于等于昨天零点时间戳，显示格式 昨天 + HH:mm
  else if (messageTime >= yesterdayStart) {
    return '昨天 ' + formatTime(date);
  }
  // 3. 大于等于往前6天的零点时间戳，显示格式星期 + HH:mm
  else if (messageTime >= sixDaysAgoStart) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[date.getDay()] + ' ' + formatTime(date);
  }
  // 4. 大于等于往前7天的零点时间戳，显示格式星期 + HH:mm
  else if (messageTime >= sevenDaysAgoStart) {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return weekdays[date.getDay()] + ' ' + formatTime(date);
  }
  // 5. 超过7天，显示格式 YYYY/MM/DD HH:mm
  else {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}/${month}/${day} ${formatTime(date)}`;
  }
}

/**
 * 简化版时间格式化 - 仅显示时分
 * @param {number} timestamp - 时间戳（秒或毫秒）
 * @returns {string} 格式化后的时间字符串
 */
function formatTimeShort(timestamp) {
  if (!timestamp) return '';
  
  // 检查时间戳格式，如果是秒级时间戳，转换为毫秒级
  const timestampMs = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
  const date = new Date(timestampMs);
  
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${hours}:${minutes}`;
}

/**
 * 判断两条消息的时间间隔是否超过指定分钟数
 * @param {number} timestamp1 - 第一条消息时间戳
 * @param {number} timestamp2 - 第二条消息时间戳
 * @param {number} intervalMinutes - 间隔分钟数，默认5分钟
 * @returns {boolean} 是否超过间隔
 */
function shouldShowTimeSeparator(timestamp1, timestamp2, intervalMinutes = 5) {
  if (!timestamp1 || !timestamp2) return true;
  
  // 转换为毫秒级时间戳
  const time1 = timestamp1 < 10000000000 ? timestamp1 * 1000 : timestamp1;
  const time2 = timestamp2 < 10000000000 ? timestamp2 * 1000 : timestamp2;
  
  const intervalMs = intervalMinutes * 60 * 1000;
  return Math.abs(time2 - time1) >= intervalMs;
}

/**
 * 获取当前时间戳
 * @returns {number} 当前时间戳（毫秒）
 */
function getCurrentTimestamp() {
  return Date.now();
}

module.exports = {
  formatTime,
  formatTimeShort,
  shouldShowTimeSeparator,
  getCurrentTimestamp
};