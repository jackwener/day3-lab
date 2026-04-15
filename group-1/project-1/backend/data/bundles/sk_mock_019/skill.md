# Flutter 精美 UI 开发

## 概述

Dart + Flutter 跨平台 UI 开发实战。自定义动画系统、响应式布局适配、Riverpod 状态管理、平台差异处理和发布上架。

## 快速开始

```bash
# 安装 Flutter
brew install flutter

# 创建项目
flutter create --org com.example my_app
cd my_app && flutter run
```

## 自定义动画

```dart
class PulseAnimation extends StatefulWidget {
  @override
  _PulseAnimationState createState() => _PulseAnimationState();
}

class _PulseAnimationState extends State<PulseAnimation>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat(reverse: true);

    _animation = Tween<double>(begin: 0.8, end: 1.2)
        .chain(CurveTween(curve: Curves.easeInOut))
        .animate(_controller);
  }

  @override
  Widget build(BuildContext context) {
    return ScaleTransition(scale: _animation, child: widget.child);
  }
}
```

## Riverpod 状态管理

```dart
// 定义 Provider
final userProvider = StateNotifierProvider<UserNotifier, AsyncValue<User>>(
  (ref) => UserNotifier(ref.read(apiProvider)),
);

class UserNotifier extends StateNotifier<AsyncValue<User>> {
  UserNotifier(this._api) : super(const AsyncLoading()) {
    fetchUser();
  }

  final ApiService _api;

  Future<void> fetchUser() async {
    state = const AsyncLoading();
    state = await AsyncValue.guard(() => _api.getUser());
  }
}

// 使用
Consumer(builder: (context, ref, child) {
  final user = ref.watch(userProvider);
  return user.when(
    data: (u) => Text(u.name),
    loading: () => CircularProgressIndicator(),
    error: (e, _) => Text('Error: $e'),
  );
});
```

## UI 组件库

- `google_fonts` — 丰富字体支持
- `flutter_svg` — SVG 图标渲染
- `shimmer` — 骨架屏加载效果
- `flutter_animate` — 声明式动画链
