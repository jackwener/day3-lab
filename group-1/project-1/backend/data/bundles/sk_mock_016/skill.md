# Tailwind CSS 高效开发

## 概述

Tailwind CSS 原子化样式实战指南。自定义设计系统搭建、响应式布局方案、暗色模式实现、组件库开发最佳实践。

## 快速开始

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

## 设计系统定制

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f5ff',
          500: '#3b82f6',
          900: '#1e3a5f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
  ],
}
```

## 组件模式

### 卡片组件

```html
<div class="group rounded-xl border border-gray-200 p-6
            hover:border-blue-300 hover:shadow-lg
            transition-all duration-200
            dark:border-gray-700 dark:bg-gray-800">
  <h3 class="text-lg font-semibold text-gray-900 dark:text-white
             group-hover:text-blue-600">
    标题
  </h3>
  <p class="mt-2 text-sm text-gray-500 line-clamp-2">
    描述文本内容...
  </p>
</div>
```

### 响应式布局

```html
<div class="grid grid-cols-1 gap-6
            sm:grid-cols-2
            lg:grid-cols-3
            xl:grid-cols-4">
  <!-- 自适应卡片网格 -->
</div>
```

## 暗色模式

```html
<!-- class 策略 -->
<html class="dark">
  <body class="bg-white dark:bg-gray-900
               text-gray-900 dark:text-gray-100">
  </body>
</html>
```

## 优化技巧

1. **@apply 谨慎使用**: 优先使用工具类组合
2. **JIT 模式**: 按需生成样式，零冗余 CSS
3. **PurgeCSS**: 生产构建自动移除未使用样式
4. **组件抽象**: 高频组合抽为 React/Vue 组件而非 @apply
