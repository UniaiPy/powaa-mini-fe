declare const conversationGroupPlugin: {
  [key: string]: any;
};
      
export default conversationGroupPlugin;
declare module '@tencentcloud/lite-chat/plugins/conversation-group' {
  export default conversationGroupPlugin;
}
