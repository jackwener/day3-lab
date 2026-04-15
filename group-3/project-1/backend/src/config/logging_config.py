"""日志配置模块

提供统一的日志配置，支持控制台输出和文件输出。

Usage:
    from src.config import get_logger

    logger = get_logger(__name__)
    logger.info("这是一条信息日志")
    logger.error("这是一条错误日志")
"""

import os
import logging
from logging.handlers import RotatingFileHandler

# 项目根目录
_PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

# 日志目录
LOG_DIR = os.path.join(_PROJECT_ROOT, 'logs')

# 默认配置
DEFAULT_LOG_FILE = 'app.log'
DEFAULT_LOG_LEVEL = logging.INFO
DEFAULT_MAX_BYTES = 10 * 1024 * 1024  # 10 MB
DEFAULT_BACKUP_COUNT = 5

# 日志格式
CONSOLE_FORMAT = '%(asctime)s [%(levelname)s] %(name)s - %(message)s'
FILE_FORMAT = '%(asctime)s [%(levelname)s] %(name)s (%(filename)s:%(lineno)d) - %(message)s'
DATE_FORMAT = '%Y-%m-%d %H:%M:%S'

_initialized = False


def setup_logger(
    log_file: str = DEFAULT_LOG_FILE,
    log_level: int = DEFAULT_LOG_LEVEL,
    max_bytes: int = DEFAULT_MAX_BYTES,
    backup_count: int = DEFAULT_BACKUP_COUNT,
) -> None:
    """配置根日志器，设置控制台和文件两个 handler。

    只会初始化一次，重复调用无效。

    Args:
        log_file: 日志文件名，保存在 logs/ 目录下
        log_level: 日志级别，默认 INFO
        max_bytes: 单个日志文件最大字节数，默认 10MB
        backup_count: 保留的历史日志文件数量，默认 5
    """
    global _initialized
    if _initialized:
        return
    _initialized = True

    os.makedirs(LOG_DIR, exist_ok=True)

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)

    # 控制台 handler
    console_handler = logging.StreamHandler()
    console_handler.setLevel(log_level)
    console_handler.setFormatter(logging.Formatter(CONSOLE_FORMAT, datefmt=DATE_FORMAT))
    root_logger.addHandler(console_handler)

    # 文件 handler（RotatingFileHandler 自动轮转）
    file_path = os.path.join(LOG_DIR, log_file)
    file_handler = RotatingFileHandler(
        file_path,
        maxBytes=max_bytes,
        backupCount=backup_count,
        encoding='utf-8',
    )
    file_handler.setLevel(log_level)
    file_handler.setFormatter(logging.Formatter(FILE_FORMAT, datefmt=DATE_FORMAT))
    root_logger.addHandler(file_handler)


def get_logger(name: str) -> logging.Logger:
    """获取指定名称的 logger。

    首次调用时会自动执行 setup_logger() 初始化。

    Args:
        name: logger 名称，通常传 __name__

    Returns:
        配置好的 Logger 实例
    """
    setup_logger()
    return logging.getLogger(name)
