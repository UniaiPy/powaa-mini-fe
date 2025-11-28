declare const conversationPlugin: {
  [key: string]: any;
};
  
export default conversationPlugin;
declare module '@tencentcloud/lite-chat/plugins/conversation' {
  export default conversationPlugin;
}
