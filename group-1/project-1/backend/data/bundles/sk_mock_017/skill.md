# Jest + Testing Library 测试指南

## 概述

前端测试完整方法论。单元测试、集成测试最佳实践，TDD 开发流程，Mock 策略，覆盖率优化，CI 集成方案。

## 快速开始

```bash
npm install -D jest @testing-library/react @testing-library/jest-dom
npx jest --init
```

## 测试金字塔

```
         /\
        /  \       E2E 测试 (少量)
       /----\      Cypress / Playwright
      /      \
     /--------\    集成测试 (适量)
    / Testing  \   Testing Library
   /  Library   \
  /--------------\  单元测试 (大量)
 /    Jest        \ 纯函数 + Hooks
```

## 组件测试

```tsx
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

test("搜索功能应正确过滤结果", async () => {
  render(<SearchPage />);

  // 输入搜索关键词
  const input = screen.getByPlaceholderText("搜索技能...");
  fireEvent.change(input, { target: { value: "React" } });

  // 等待结果
  await waitFor(() => {
    expect(screen.getByText("React 组件模式")).toBeInTheDocument();
    expect(screen.queryByText("Python 入门")).not.toBeInTheDocument();
  });
});
```

## Hook 测试

```tsx
import { renderHook, act } from "@testing-library/react";

test("useCounter 应正确递增", () => {
  const { result } = renderHook(() => useCounter(0));

  act(() => result.current.increment());

  expect(result.current.count).toBe(1);
});
```

## Mock 策略

```typescript
// 模拟 API 调用
jest.mock("../api", () => ({
  fetchUsers: jest.fn().mockResolvedValue([
    { id: 1, name: "张三" },
    { id: 2, name: "李四" },
  ]),
}));

// 模拟浏览器 API
Object.defineProperty(window, "matchMedia", {
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    addEventListener: jest.fn(),
  })),
});
```
