# Official JavaScript SDK for Tencent Cloud Lite Chat

## About Tencent Cloud Lite Chat

Tencent Cloud Lite Chat provides globally interconnected chat APIs, multi-platform SDKs. Includes message sending/receiving and user management features by default, fulfilling core IM capabilities, with a bundle size under 200 KB. With its flexible plugin architecture, the SDK enables seamless integration of comprehensive IM features. You can selectively include only the features you need, customize plugin combinations, and maintain optimal bundle size.

Lite Chat SDK provides basic version, standard version and professional version. @tencentcloud/lite-chat points to the standard version by default.

## Installation

```javascript
npm install @tencentcloud/lite-chat --save
```

## Getting started

### 1. create an SDK instance

```javascript
import TencentCloudChat from '@tencentcloud/lite-chat';

// Create an SDK instance. 
// The `TencentCloudLiteChat.create()` method returns the same instance for the same `SDKAppID`.
// The SDK instance is usually represented by `chat`.
let chat = TencentCloudLiteChat.create({
  SDKAppID: 0 // Replace `0` with the `SDKAppID` of your Chat app during access.
}); 
```

### 2. Generate UserSig
UserSig is a password used to log in to Tencent Cloud Lite Chat. It is the ciphertext obtained after data such as UserID is encrypted. This [document](https://trtc.io/document/34385) describes how to generate a UserSig.

### 3. Login in to the Lite Chat SDK

```javascript
let promise = chat.login({userID: 'your userID', userSig: 'your userSig'});
promise.then(function(imResponse) {
  console.log(imResponse.data); // Login successful
  if (imResponse.data.repeatLogin === true) {
    // Indicates that the account has logged in and that the current login will be a repeated login.
    console.log(imResponse.data.errorInfo);
  }
}).catch(function(imError) {
  console.warn('login error:', imError); // Error information
});
```

## Switch to basic version

```javascript
import TencentCloudChat from '@tencentcloud/lite-chat/baisc';
```

## Switch to professional version

```javascript
import TencentCloudChat from '@tencentcloud/lite-chat/professional';
```

## Supported Browsers

|  Browser   |  Supported versions  |
|  ----  | ----  |
| Chrome | 16 or higher |
| Edge | 	13 or higher |
| Firefox | 11 or higher |
| Safari | 7 or higher |
| Internet Explorer	 | 10 or higher |
| Opera | 12.1 or higher |
| iOS Safari	| 7 or higher |
| Android Browser | 4.4 (Kitkat) or higher |
