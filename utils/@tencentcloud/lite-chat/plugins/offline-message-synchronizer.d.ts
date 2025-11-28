declare const offlineMessageSynchronizer: {
  [key: string]: any;
};
      
export default offlineMessageSynchronizer;
declare module '@tencentcloud/lite-chat/plugins/offline-message-synchronizer' {
  export default offlineMessageSynchronizer;
}
  