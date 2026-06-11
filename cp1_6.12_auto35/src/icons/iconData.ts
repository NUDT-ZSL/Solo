export interface IconItem {
  id: string;
  name: string;
  category: string;
  tags: string[];
  pathData: string;
  viewBox: string;
}

export interface IconCategory {
  id: string;
  name: string;
  icons: IconItem[];
}

export const iconCategories: IconCategory[] = [
  {
    id: 'arrows',
    name: '箭头',
    icons: [
      { id: 'arrow-up', name: '向上箭头', category: 'arrows', tags: ['arrow', 'up', '方向', '上'], pathData: 'M12 4l-8 8h5v8h6v-8h5z', viewBox: '0 0 24 24' },
      { id: 'arrow-down', name: '向下箭头', category: 'arrows', tags: ['arrow', 'down', '方向', '下'], pathData: 'M12 20l8-8h-5V4h-6v8H4z', viewBox: '0 0 24 24' },
      { id: 'arrow-left', name: '向左箭头', category: 'arrows', tags: ['arrow', 'left', '方向', '左'], pathData: 'M4 12l8-8v5h8v6h-8v5z', viewBox: '0 0 24 24' },
      { id: 'arrow-right', name: '向右箭头', category: 'arrows', tags: ['arrow', 'right', '方向', '右'], pathData: 'M20 12l-8 8v-5H4v-6h8V4z', viewBox: '0 0 24 24' },
      { id: 'arrow-up-right', name: '右上箭头', category: 'arrows', tags: ['arrow', 'up-right', '右上'], pathData: 'M7 17L17 7M7 7h10v10', viewBox: '0 0 24 24' },
      { id: 'arrow-up-left', name: '左上箭头', category: 'arrows', tags: ['arrow', 'up-left', '左上'], pathData: 'M17 17L7 7M17 7H7v10', viewBox: '0 0 24 24' },
      { id: 'arrow-down-right', name: '右下箭头', category: 'arrows', tags: ['arrow', 'down-right', '右下'], pathData: 'M7 7l10 10M7 17h10V7', viewBox: '0 0 24 24' },
      { id: 'arrow-down-left', name: '左下箭头', category: 'arrows', tags: ['arrow', 'down-left', '左下'], pathData: 'M17 7L7 17M17 17H7V7', viewBox: '0 0 24 24' },
      { id: 'arrow-double-up', name: '双向上箭头', category: 'arrows', tags: ['arrow', 'double', 'up', '双上'], pathData: 'M7 13l5-5 5 5M7 19l5-5 5 5', viewBox: '0 0 24 24' },
      { id: 'arrow-double-down', name: '双向下箭头', category: 'arrows', tags: ['arrow', 'double', 'down', '双下'], pathData: 'M7 6l5 5 5-5M7 11l5 5 5-5', viewBox: '0 0 24 24' },
      { id: 'arrow-double-left', name: '双向左箭头', category: 'arrows', tags: ['arrow', 'double', 'left', '双左'], pathData: 'M11 7l-5 5 5 5M16 7l-5 5 5 5', viewBox: '0 0 24 24' },
      { id: 'arrow-double-right', name: '双向右箭头', category: 'arrows', tags: ['arrow', 'double', 'right', '双右'], pathData: 'M13 7l5 5-5 5M8 7l5 5-5 5', viewBox: '0 0 24 24' },
      { id: 'arrow-circle-up', name: '圆形向上箭头', category: 'arrows', tags: ['arrow', 'circle', 'up', '圆形上'], pathData: 'M12 2a10 10 0 100 20 10 10 0 000-20zm-1 14V8l-4 4 1.41 1.41L11 10.83V16h2z', viewBox: '0 0 24 24' },
      { id: 'arrow-circle-down', name: '圆形向下箭头', category: 'arrows', tags: ['arrow', 'circle', 'down', '圆形下'], pathData: 'M12 2a10 10 0 100 20 10 10 0 000-20zm1 10v8l4-4-1.41-1.41L13 17.17V8h-2z', viewBox: '0 0 24 24' },
      { id: 'arrow-turn-right', name: '转弯右箭头', category: 'arrows', tags: ['arrow', 'turn', 'right', '转弯'], pathData: 'M17 17l5-5-5-5v3H6V5H4v12h13v3z', viewBox: '0 0 24 24' },
      { id: 'arrow-turn-left', name: '转弯左箭头', category: 'arrows', tags: ['arrow', 'turn', 'left', '转弯'], pathData: 'M7 7l-5 5 5 5v-3h11v5h2V8H7z', viewBox: '0 0 24 24' },
    ]
  },
  {
    id: 'social',
    name: '社交',
    icons: [
      { id: 'heart', name: '爱心', category: 'social', tags: ['heart', 'love', '喜欢', '心'], pathData: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z', viewBox: '0 0 24 24' },
      { id: 'star', name: '星星', category: 'social', tags: ['star', '收藏', '星'], pathData: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z', viewBox: '0 0 24 24' },
      { id: 'thumbs-up', name: '点赞', category: 'social', tags: ['like', 'thumb', 'up', '赞'], pathData: 'M9 21h9c.83 0 1.54-.5 1.85-1.26l3.03-7.08c.09-.23.12-.47.12-.66v-2c0-1.1-.9-2-2-2h-6.31l.95-4.57.03-.32c0-.41-.17-.79-.44-1.06L14.17 1 7.59 7.59C7.22 7.95 7 8.45 7 9v10c0 1.1.9 2 2 2h9v-5H9v5z', viewBox: '0 0 24 24' },
      { id: 'thumbs-down', name: '踩', category: 'social', tags: ['dislike', 'thumb', 'down', '踩'], pathData: 'M15 3H6c-.83 0-1.54.5-1.85 1.26l-3.03 7.08c-.09.23-.12.47-.12.66v2c0 1.1.9 2 2 2h6.31l-.95 4.57-.03.32c0 .41.17.79.44 1.06L9.83 23l6.59-6.59c.36-.36.58-.86.58-1.41V5c0-1.1-.9-2-2-2h-9v5h9V3z', viewBox: '0 0 24 24' },
      { id: 'share', name: '分享', category: 'social', tags: ['share', '分享'], pathData: 'M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z', viewBox: '0 0 24 24' },
      { id: 'comment', name: '评论', category: 'social', tags: ['comment', 'chat', '评论', '聊天'], pathData: 'M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18zM18 14H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z', viewBox: '0 0 24 24' },
      { id: 'user', name: '用户', category: 'social', tags: ['user', 'profile', '用户', '个人'], pathData: 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z', viewBox: '0 0 24 24' },
      { id: 'users', name: '用户组', category: 'social', tags: ['users', 'group', '团队', '组'], pathData: 'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z', viewBox: '0 0 24 24' },
      { id: 'bookmark', name: '书签', category: 'social', tags: ['bookmark', 'save', '书签', '保存'], pathData: 'M17 3H7c-1.1 0-1.99.9-1.99 2L5 21l7-3 7 3V5c0-1.1-.9-2-2-2z', viewBox: '0 0 24 24' },
      { id: 'gift', name: '礼物', category: 'social', tags: ['gift', 'present', '礼物'], pathData: 'M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z', viewBox: '0 0 24 24' },
      { id: 'bell', name: '通知铃', category: 'social', tags: ['bell', 'notification', '通知', '铃'], pathData: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z', viewBox: '0 0 24 24' },
      { id: 'eye', name: '眼睛', category: 'social', tags: ['eye', 'view', '看', '视图'], pathData: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z', viewBox: '0 0 24 24' },
      { id: 'flag', name: '旗帜', category: 'social', tags: ['flag', 'report', '旗帜', '标记'], pathData: 'M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6z', viewBox: '0 0 24 24' },
      { id: 'chat', name: '聊天气泡', category: 'social', tags: ['chat', 'bubble', '聊天气泡'], pathData: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z', viewBox: '0 0 24 24' },
      { id: 'smile', name: '笑脸', category: 'social', tags: ['smile', 'happy', '笑', '开心'], pathData: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z', viewBox: '0 0 24 24' },
      { id: 'tag', name: '标签', category: 'social', tags: ['tag', 'label', '标签'], pathData: 'M21.41 11.58l-9-9C12.05 2.22 11.55 2 11 2H4c-1.1 0-2 .9-2 2v7c0 .55.22 1.05.59 1.42l9 9c.36.36.86.58 1.41.58.55 0 1.05-.22 1.41-.59l7-7c.37-.36.59-.86.59-1.41 0-.55-.23-1.06-.59-1.42zM5.5 7C4.67 7 4 6.33 4 5.5S4.67 4 5.5 4 7 4.67 7 5.5 6.33 7 5.5 7z', viewBox: '0 0 24 24' },
    ]
  },
  {
    id: 'devices',
    name: '设备',
    icons: [
      { id: 'phone', name: '手机', category: 'devices', tags: ['phone', 'mobile', '手机', '移动'], pathData: 'M15 1H9c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h6c1.1 0 2-.9 2-2V3c0-1.1-.9-2-2-2zm-2 18h-2v-1h2v1zm3-4H8V4h8v11z', viewBox: '0 0 24 24' },
      { id: 'laptop', name: '笔记本', category: 'devices', tags: ['laptop', 'notebook', '笔记本电脑'], pathData: 'M20 18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z', viewBox: '0 0 24 24' },
      { id: 'desktop', name: '桌面电脑', category: 'devices', tags: ['desktop', 'computer', 'pc', '电脑'], pathData: 'M21 2H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h7v2H8v2h8v-2h-2v-2h7c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H3V4h18v12z', viewBox: '0 0 24 24' },
      { id: 'tablet', name: '平板', category: 'devices', tags: ['tablet', 'ipad', '平板'], pathData: 'M18 0H6C4.34 0 3 1.34 3 3v18c0 1.66 1.34 3 3 3h12c1.66 0 3-1.34 3-3V3c0-1.66-1.34-3-3-3zm-4 22h-4v-1h4v1zm5.25-3H4.75V3h14.5v16z', viewBox: '0 0 24 24' },
      { id: 'tv', name: '电视', category: 'devices', tags: ['tv', 'television', '电视'], pathData: 'M21 3H3c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h5v2h8v-2h5c1.1 0 1.99-.9 1.99-2L23 5c0-1.1-.9-2-2-2zm0 14H3V5h18v12z', viewBox: '0 0 24 24' },
      { id: 'watch', name: '手表', category: 'devices', tags: ['watch', 'smartwatch', '手表'], pathData: 'M20 12c0-2.54-1.19-4.81-3.04-6.27L16 0H8l-.95 5.73C5.19 7.19 4 9.45 4 12s1.19 4.81 3.05 6.27L8 24h8l.96-5.73C18.81 16.81 20 14.54 20 12zM6 12c0-3.31 2.69-6 6-6s6 2.69 6 6-2.69 6-6 6-6-2.69-6-6z', viewBox: '0 0 24 24' },
      { id: 'camera', name: '相机', category: 'devices', tags: ['camera', 'photo', '相机', '照片'], pathData: 'M12 15.2c1.77 0 3.2-1.43 3.2-3.2s-1.43-3.2-3.2-3.2-3.2 1.43-3.2 3.2 1.43 3.2 3.2 3.2zm8.88-8.24l-1.04-3.1C19.5 3.35 18.82 3 18.06 3H5.94c-.77 0-1.44.35-1.78.86l-1.04 3.1C2.41 7.69 2 8.62 2 9.66v7.84C2 19.33 3.67 21 5.5 21h13c1.83 0 3.5-1.67 3.5-3.5V9.66c0-1.04-.41-1.97-1.12-2.7zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z', viewBox: '0 0 24 24' },
      { id: 'headphones', name: '耳机', category: 'devices', tags: ['headphones', 'audio', '耳机', '音乐'], pathData: 'M12 3c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z', viewBox: '0 0 24 24' },
      { id: 'speaker', name: '扬声器', category: 'devices', tags: ['speaker', 'audio', '音箱'], pathData: 'M17 2H7c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-5 16c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-12c-.83 0-1.5-.67-1.5-1.5S11.17 3 12 3s1.5.67 1.5 1.5S12.83 6 12 6z', viewBox: '0 0 24 24' },
      { id: 'mic', name: '麦克风', category: 'devices', tags: ['mic', 'microphone', '麦克风'], pathData: 'M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z', viewBox: '0 0 24 24' },
      { id: 'keyboard', name: '键盘', category: 'devices', tags: ['keyboard', 'input', '键盘'], pathData: 'M20 5H4c-1.1 0-1.99.9-1.99 2L2 17c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 2H5v-2h2v2zm0-3H5V8h2v2zm9 7H8v-2h8v2zm0-4h-2v-2h2v2zm0-3h-2V8h2v2zm3 3h-2v-2h2v2zm0-3h-2V8h2v2z', viewBox: '0 0 24 24' },
      { id: 'mouse', name: '鼠标', category: 'devices', tags: ['mouse', 'input', '鼠标'], pathData: 'M13 1.07V9h7c0-4.08-3.05-7.44-7-7.93zM4 15c0 4.42 3.58 8 8 8s8-3.58 8-8v-4H4v4zm7-13.93C7.05 1.56 4 4.92 4 9h7V1.07z', viewBox: '0 0 24 24' },
      { id: 'printer', name: '打印机', category: 'devices', tags: ['printer', 'print', '打印'], pathData: 'M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z', viewBox: '0 0 24 24' },
      { id: 'battery', name: '电池', category: 'devices', tags: ['battery', 'charge', '电池', '电量'], pathData: 'M17 4h-3V2h-4v2H7c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-1 14H8V6h8v12z', viewBox: '0 0 24 24' },
      { id: 'wifi', name: 'WiFi', category: 'devices', tags: ['wifi', 'wireless', '网络', '无线'], pathData: 'M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z', viewBox: '0 0 24 24' },
      { id: 'bluetooth', name: '蓝牙', category: 'devices', tags: ['bluetooth', '蓝牙'], pathData: 'M17.71 7.71L12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4.29zM13 5.83l1.88 1.88L13 9.59V5.83zm1.88 10.46L13 18.17v-3.76l1.88 1.88z', viewBox: '0 0 24 24' },
    ]
  },
  {
    id: 'shapes',
    name: '形状',
    icons: [
      { id: 'circle', name: '圆形', category: 'shapes', tags: ['circle', 'round', '圆形'], pathData: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z', viewBox: '0 0 24 24' },
      { id: 'square', name: '正方形', category: 'shapes', tags: ['square', '矩形', '方形'], pathData: 'M3 3v18h18V3H3zm16 16H5V5h14v14z', viewBox: '0 0 24 24' },
      { id: 'triangle', name: '三角形', category: 'shapes', tags: ['triangle', '三角形'], pathData: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z', viewBox: '0 0 24 24' },
      { id: 'diamond', name: '菱形', category: 'shapes', tags: ['diamond', 'rhombus', '菱形'], pathData: 'M12 2L2 12l10 10 10-10L12 2zm0 18L4 12l8-8 8 8-8 8z', viewBox: '0 0 24 24' },
      { id: 'pentagon', name: '五边形', category: 'shapes', tags: ['pentagon', '五边形'], pathData: 'M12 2L2 9.5l3.8 11.6h12.4L22 9.5 12 2zm0 2.5l7.5 5.7-2.9 8.8H7.4L4.5 10.2 12 4.5z', viewBox: '0 0 24 24' },
      { id: 'hexagon', name: '六边形', category: 'shapes', tags: ['hexagon', '六边形'], pathData: 'M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.31L19 8.5v7l-7 4.19L5 15.5v-7L12 4.31z', viewBox: '0 0 24 24' },
      { id: 'octagon', name: '八边形', category: 'shapes', tags: ['octagon', '八边形'], pathData: 'M12 2L7.5 3.5 3.5 7.5 2 12l1.5 4.5 4 4L12 22l4.5-1.5 4-4L22 12l-1.5-4.5-4-4L12 2zm0 2.5l3.5 1.04 2.96 2.96L19.5 12l-1.04 3.5-2.96 2.96L12 19.5l-3.5-1.04-2.96-2.96L4.5 12l1.04-3.5 2.96-2.96L12 4.5z', viewBox: '0 0 24 24' },
      { id: 'star-outline', name: '空心星', category: 'shapes', tags: ['star', 'outline', '空心星'], pathData: 'M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z', viewBox: '0 0 24 24' },
      { id: 'heart-outline', name: '空心爱心', category: 'shapes', tags: ['heart', 'outline', '空心心'], pathData: 'M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z', viewBox: '0 0 24 24' },
      { id: 'cross', name: '十字', category: 'shapes', tags: ['cross', 'plus', '十字'], pathData: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z', viewBox: '0 0 24 24' },
      { id: 'minus', name: '减号', category: 'shapes', tags: ['minus', 'remove', '减'], pathData: 'M19 13H5v-2h14v2z', viewBox: '0 0 24 24' },
      { id: 'check', name: '勾选', category: 'shapes', tags: ['check', 'done', 'ok', '对勾'], pathData: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z', viewBox: '0 0 24 24' },
      { id: 'close', name: '关闭', category: 'shapes', tags: ['close', 'x', '叉'], pathData: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z', viewBox: '0 0 24 24' },
      { id: 'play', name: '播放', category: 'shapes', tags: ['play', 'start', '播放'], pathData: 'M8 5v14l11-7z', viewBox: '0 0 24 24' },
      { id: 'pause', name: '暂停', category: 'shapes', tags: ['pause', '暂停'], pathData: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z', viewBox: '0 0 24 24' },
      { id: 'stop', name: '停止', category: 'shapes', tags: ['stop', '停止'], pathData: 'M6 6h12v12H6z', viewBox: '0 0 24 24' },
    ]
  }
];

export const getAllIcons = (): IconItem[] => {
  return iconCategories.flatMap(cat => cat.icons);
};

export const filterIcons = (keyword: string, categoryId?: string): IconItem[] => {
  const allIcons = categoryId 
    ? iconCategories.find(c => c.id === categoryId)?.icons || []
    : getAllIcons();
  
  if (!keyword.trim()) return allIcons;
  
  const lowerKeyword = keyword.toLowerCase();
  return allIcons.filter(icon => 
    icon.name.toLowerCase().includes(lowerKeyword) ||
    icon.tags.some(tag => tag.toLowerCase().includes(lowerKeyword)) ||
    icon.id.toLowerCase().includes(lowerKeyword)
  );
};
