declare const signalingPlugin: {
    [key: string]: any;
  };
      
  export default signalingPlugin;
  declare module '@tencentcloud/lite-chat/plugins/signaling' {
    export default signalingPlugin;
  }