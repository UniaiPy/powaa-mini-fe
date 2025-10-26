import { system } from "./getSystemInfo"

// components/custom-navigation-bar/custom-navigation-bar.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 背景色
    backgroundColor: {
      type: String,
      value: ''
    },
    // 背景，如果设置此参数，会覆盖掉背景色
    background: {
      type: String,
      value: ''
    },
    // 样式 1：slot 会使用左侧及中部区域 2：slot 会使用中部区域 3：透明顶部
    barStyle: {
      type: String,
      value: 1
    },
    color: {
      type: String,
      value: ''
    },
    // 是否显示返回按钮
    showBack: {
      type: Boolean,
      value: true
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    system: {},
  },

  lifetimes: {
    attached () {
      this.setData({
        system
      })
      console.log(system)
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    back () {
      wx.navigateBack()
    }
  }
})

/**
 * 比对当前用户基础库和指定的基础库版本
 * @param {*} v1 
 * @param {*} v2 
 */
function compareVersion(v1, v2) {
  v1 = v1.split('.')
  v2 = v2.split('.')
  const len = Math.max(v1.length, v2.length)

  while (v1.length < len) {
    v1.push('0')
  }
  while (v2.length < len) {
    v2.push('0')
  }

  for (let i = 0; i < len; i++) {
    const num1 = parseInt(v1[i])
    const num2 = parseInt(v2[i])

    if (num1 > num2) {
      return 1
    } else if (num1 < num2) {
      return -1
    }
  }

  return 0
}
