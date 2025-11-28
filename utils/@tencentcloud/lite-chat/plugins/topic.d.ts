declare const topicPlugin: {
  [key: string]: any;
};
    
export default topicPlugin;
declare module '@tencentcloud/lite-chat/plugins/topic' {
  export default topicPlugin;
}
