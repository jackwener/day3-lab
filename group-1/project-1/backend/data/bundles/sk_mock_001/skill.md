# React 组件设计模式

## 概述

提供 React 高级组件设计的完整方法论，涵盖 HOC、Render Props、Compound Components、自定义 Hooks 等现代开发模式。帮助开发者编写可复用、可测试、可维护的组件代码。

## 快速开始

```bash
# 安装依赖
npx @skillhub/react-patterns init

# 启动示例项目
npm run dev
```

## 核心模式

### 1. Compound Components（复合组件）

```tsx
// 使用 Context 实现组件间隐式通信
<Select onChange={handleChange}>
  <Select.Trigger>选择选项</Select.Trigger>
  <Select.Options>
    <Select.Option value="a">选项 A</Select.Option>
    <Select.Option value="b">选项 B</Select.Option>
  </Select.Options>
</Select>
```

### 2. 自定义 Hooks 提取逻辑

```tsx
function useToggle(initial = false) {
  const [state, setState] = useState(initial);
  const toggle = useCallback(() => setState(s => !s), []);
  return [state, toggle] as const;
}
```

### 3. Render Props 与高阶组件

```tsx
// 灵活的渲染委托模式
<DataFetcher url="/api/users">
  {({ data, loading }) => loading ? <Spinner /> : <UserList users={data} />}
</DataFetcher>
```

## 设计原则

- **单一职责**: 每个组件只做一件事
- **开闭原则**: 对扩展开放，对修改关闭
- **组合优于继承**: 使用 Hooks 和组合模式替代类继承
- **关注点分离**: UI 逻辑与业务逻辑解耦

## 最佳实践

1. 优先使用自定义 Hooks 提取可复用逻辑
2. 使用 TypeScript 泛型增强组件类型安全
3. 合理使用 `React.memo` 和 `useMemo` 避免不必要渲染
4. 组件 Props 设计遵循最小接口原则

## 适用场景

- 中大型 React 项目的架构设计
- 组件库 / Design System 开发
- 团队代码规范统一
