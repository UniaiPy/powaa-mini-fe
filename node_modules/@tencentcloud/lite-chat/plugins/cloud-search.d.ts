declare const cloudSearchPlugin: {
  [key: string]: any;
};
    
export default cloudSearchPlugin;
declare module '@tencentcloud/lite-chat/plugins/cloud-search' {
  export default cloudSearchPlugin;
}
  