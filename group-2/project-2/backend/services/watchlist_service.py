"""自选基金服务 — 使用 JSON 文件持久化存储"""
import json
import os
from datetime import datetime, timezone

# JSON 文件路径
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data')
WATCHLIST_FILE = os.path.join(DATA_DIR, 'watchlist.json')


def _load_watchlist():
    """从 JSON 文件加载自选列表"""
    if not os.path.exists(WATCHLIST_FILE):
        return []
    with open(WATCHLIST_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def _save_watchlist(watchlist):
    """保存自选列表到 JSON 文件"""
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(WATCHLIST_FILE, 'w', encoding='utf-8') as f:
        json.dump(watchlist, f, ensure_ascii=False, indent=2)


def get_watchlist():
    """获取自选列表"""
    return _load_watchlist()


def add_to_watchlist(fund_code):
    """添加自选（只保存基金代码）"""
    watchlist = _load_watchlist()
    
    # 检查是否已存在
    for item in watchlist:
        if item["fund_code"] == fund_code:
            return None, "该基金已在自选列表中"

    new_item = {
        "fund_code": fund_code,
        "added_at": datetime.now(timezone.utc).isoformat(),
    }
    watchlist.append(new_item)
    _save_watchlist(watchlist)
    return new_item, None


def remove_from_watchlist(fund_code):
    """删除自选"""
    watchlist = _load_watchlist()
    
    for i, item in enumerate(watchlist):
        if item["fund_code"] == fund_code:
            watchlist.pop(i)
            _save_watchlist(watchlist)
            return True
    return False
