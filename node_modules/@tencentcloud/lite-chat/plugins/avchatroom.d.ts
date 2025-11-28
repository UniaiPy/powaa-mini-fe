declare const avChatRoomPlugin: {
  [key: string]: any;
};
    
export default avChatRoomPlugin;
declare module '@tencentcloud/lite-chat/plugins/avchatroom' {
  export default avChatRoomPlugin;
}
