# Vue 3 + Pinia 企业实战

## 概述

Vue 3 Composition API 深度实战指南。涵盖 Pinia 状态管理最佳实践、VueRouter 4 高级路由、Vite 构建优化、企业级项目架构设计。

## 快速开始

```bash
npm create vue@latest my-project
cd my-project
npm install && npm run dev
```

## Composition API 精髓

### 可组合函数 (Composables)

```typescript
// composables/useFetch.ts
export function useFetch<T>(url: MaybeRef<string>) {
  const data = ref<T | null>(null);
  const loading = ref(true);
  const error = ref<Error | null>(null);

  watchEffect(async () => {
    loading.value = true;
    try {
      const res = await fetch(unref(url));
      data.value = await res.json();
    } catch (e) {
      error.value = e as Error;
    } finally {
      loading.value = false;
    }
  });

  return { data, loading, error };
}
```

### Pinia Store 设计

```typescript
export const useUserStore = defineStore("user", () => {
  const user = ref<User | null>(null);
  const isLoggedIn = computed(() => !!user.value);

  async function login(credentials: LoginForm) {
    const res = await api.login(credentials);
    user.value = res.user;
    localStorage.setItem("token", res.token);
  }

  function logout() {
    user.value = null;
    localStorage.removeItem("token");
  }

  return { user, isLoggedIn, login, logout };
});
```

## 项目架构

```
src/
├── composables/     # 可组合函数
├── stores/          # Pinia stores
├── views/           # 页面组件
├── components/      # 通用组件
├── layouts/         # 布局组件
├── router/          # 路由配置
├── api/             # API 封装
└── utils/           # 工具函数
```

## 性能优化清单

- `defineAsyncComponent` 异步组件加载
- `v-memo` 跳过不变子树的渲染
- `shallowRef` / `shallowReactive` 减少响应式开销
- Vite 分包策略优化首屏加载
