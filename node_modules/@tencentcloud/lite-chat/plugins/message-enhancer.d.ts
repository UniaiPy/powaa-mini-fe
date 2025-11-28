declare const messageEnhancerPlugin: {
  [key: string]: any;
};
    
export default messageEnhancerPlugin;
declare module '@tencentcloud/lite-chat/plugins/message-enhancer' {
  export default messageEnhancerPlugin;
}
