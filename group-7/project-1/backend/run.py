"""
run.py — 开发启动入口
用法: python run.py
"""
import os
from dotenv import load_dotenv

# 加载 .env 文件（优先级高于系统环境变量）
load_dotenv()

from app import create_app  # noqa: E402

if __name__ == "__main__":
    app = create_app()
    port = int(os.environ.get("FLASK_PORT", 5000))
    debug = os.environ.get("FLASK_ENV", "development") == "development"
    app.run(host="127.0.0.1", port=port, debug=debug)
