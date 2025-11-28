declare const followPlugin: {
  [key: string]: any;
};
    
export default followPlugin;
declare module '@tencentcloud/lite-chat/plugins/follow' {
  export default followPlugin;
}
