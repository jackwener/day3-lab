# TypeScript 高级类型体操

## 概述

掌握 TypeScript 类型系统的高级特性 — 条件类型、映射类型、模板字面量类型、递归类型。通过 50+ 实战练习从类型新手进阶为类型体操高手。

## 快速开始

```bash
# 安装类型挑战工具
npm install -g @type-challenges/utils
npx tsc --init
```

## 核心概念

### 条件类型 (Conditional Types)

```typescript
// 提取 Promise 内部类型
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;

type Result = Awaited<Promise<Promise<string>>>; // string
```

### 映射类型 (Mapped Types)

```typescript
// 将所有属性变为可选的深层版本
type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
```

### 模板字面量类型

```typescript
type EventName<T extends string> = `on${Capitalize<T>}`;
type ClickEvent = EventName<"click">; // "onClick"

// 自动生成 getter 类型
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
```

## 实战挑战

- **Easy**: `Pick<T, K>`、`Readonly<T>`、`First<T>`
- **Medium**: `DeepReadonly<T>`、`Flatten<T>`、`TrimLeft<T>`
- **Hard**: `ParseQueryString<T>`、`CamelCase<T>`

## 应用场景

1. **API 类型安全**: 自动推导请求/响应类型
2. **状态管理**: Redux action/reducer 类型推导
3. **表单校验**: 基于 Schema 的类型推导
4. **ORM**: 数据库 Schema → TypeScript 类型映射
