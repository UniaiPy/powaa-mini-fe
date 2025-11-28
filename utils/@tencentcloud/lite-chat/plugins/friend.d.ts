declare const friendPlugin: {
    [key: string]: any;
  };
    
export default friendPlugin;
declare module '@tencentcloud/lite-chat/plugins/friend' {
  export default friendPlugin;
}
