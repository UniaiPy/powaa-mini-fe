declare const groupPlugin: {
  [key: string]: any;
};
    
export default groupPlugin;
declare module '@tencentcloud/lite-chat/plugins/group' {
  export default groupPlugin;
}
