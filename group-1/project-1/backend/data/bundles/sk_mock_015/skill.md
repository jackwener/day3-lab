# Web 安全攻防实战

## 概述

OWASP Top 10 安全漏洞的攻击手法与防御策略。涵盖 XSS、CSRF、SQL 注入、SSRF、认证绕过等常见攻击的原理分析和修复方案。

## 安全检查清单

### XSS 防护

```javascript
// ❌ 危险: 直接插入 HTML
element.innerHTML = userInput;

// ✅ 安全: 使用 textContent
element.textContent = userInput;

// ✅ 安全: React 自动转义
return <div>{userInput}</div>;

// ⚠️ 仍需注意: dangerouslySetInnerHTML
// 必须使用 DOMPurify 清洗
import DOMPurify from "dompurify";
const clean = DOMPurify.sanitize(dirtyHtml);
```

### SQL 注入防护

```python
# ❌ 危险: 字符串拼接
cursor.execute(f"SELECT * FROM users WHERE id = {user_id}")

# ✅ 安全: 参数化查询
cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
```

### CSRF 防护

```python
# Flask-WTF 自动 CSRF 保护
from flask_wtf.csrf import CSRFProtect
csrf = CSRFProtect(app)

# 前端请求携带 CSRF Token
headers: { "X-CSRF-Token": getCookie("csrf_token") }
```

## OWASP Top 10 速查

| 排名 | 漏洞类型 | 防御要点 |
|------|----------|----------|
| A01 | 访问控制失效 | RBAC + 最小权限 |
| A02 | 加密失败 | HTTPS + bcrypt |
| A03 | 注入攻击 | 参数化查询 |
| A07 | XSS | CSP + 转义输出 |
| A08 | 不安全反序列化 | 白名单校验 |
| A10 | SSRF | URL 白名单 |

## 安全响应头

```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self'";
add_header X-Content-Type-Options "nosniff";
add_header X-Frame-Options "DENY";
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains";
```
