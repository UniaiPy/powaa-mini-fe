declare const richMediaMessagePlugin: {
    [key: string]: any;
  };
    
  export default conversationPlugin;
  declare module '@tencentcloud/lite-chat/plugins/rich-media-message' {
    export default richMediaMessagePlugin;
  }