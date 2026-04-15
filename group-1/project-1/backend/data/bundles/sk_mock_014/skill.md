# React Native 跨平台开发

## 概述

一套代码构建 iOS 和 Android 应用的完整方案。涵盖导航系统、原生模块桥接、性能优化、热更新、应用发布全流程。

## 快速开始

```bash
npx react-native init MyApp --template react-native-template-typescript
cd MyApp

# iOS
npx pod-install && npx react-native run-ios

# Android
npx react-native run-android
```

## 导航系统

```tsx
import { createNativeStackNavigator } from "@react-navigation/native-stack";

const Stack = createNativeStackNavigator<RootStackParamList>();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Detail" component={DetailScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen}
          options={{ headerTransparent: true }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

## 性能优化

```tsx
// 1. 使用 FlashList 替代 FlatList
import { FlashList } from "@shopify/flash-list";

<FlashList
  data={items}
  renderItem={({ item }) => <ItemCard item={item} />}
  estimatedItemSize={80}
/>

// 2. 图片优化
import FastImage from "react-native-fast-image";

<FastImage
  source={{ uri: imageUrl, priority: FastImage.priority.high }}
  style={{ width: 200, height: 200 }}
  resizeMode={FastImage.resizeMode.cover}
/>
```

## 发布流程

1. **代码签名**: iOS Certificate + Provisioning Profile
2. **版本管理**: `react-native-version` 自动递增
3. **构建**: Fastlane 自动化构建打包
4. **分发**: App Store Connect + Google Play Console
5. **热更新**: CodePush 实现无需审核的 OTA 更新
