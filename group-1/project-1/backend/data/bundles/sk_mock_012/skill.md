# Rust 系统编程入门

## 概述

Rust 语言从入门到实战的完整学习路径。掌握所有权系统、生命周期、零成本抽象、并发安全，构建高性能系统级应用。

## 快速开始

```bash
# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# 创建项目
cargo new my-project
cd my-project && cargo run
```

## 所有权核心

```rust
fn main() {
    let s1 = String::from("hello");
    let s2 = s1;          // s1 的所有权移动到 s2
    // println!("{s1}");   // ❌ 编译错误: s1 已失效

    let s3 = s2.clone();  // ✅ 深拷贝
    println!("{s2}, {s3}");
}
```

## 生命周期标注

```rust
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() { x } else { y }
}
```

## 并发安全

```rust
use std::sync::{Arc, Mutex};
use std::thread;

let counter = Arc::new(Mutex::new(0));
let mut handles = vec![];

for _ in 0..10 {
    let counter = Arc::clone(&counter);
    let handle = thread::spawn(move || {
        let mut num = counter.lock().unwrap();
        *num += 1;
    });
    handles.push(handle);
}

for handle in handles { handle.join().unwrap(); }
println!("Result: {}", *counter.lock().unwrap()); // 10
```

## 实战项目

| 项目 | 难度 | 涉及知识 |
|------|------|----------|
| CLI 工具 | ⭐⭐ | clap、文件 I/O |
| Web 服务 | ⭐⭐⭐ | Actix-web、Serde |
| 内存分配器 | ⭐⭐⭐⭐ | unsafe、指针操作 |
