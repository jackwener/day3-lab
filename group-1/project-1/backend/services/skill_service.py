"""技能查询服务：过滤/排序/分页/计数/关键词搜索。"""

from models.skill import to_summary, to_detail
from models.category import is_valid_category, CATEGORY_WHITELIST
from models.skill import VALID_SORT_OPTIONS


class SkillService:
    """封装 Storage 之上的业务查询逻辑。"""

    def __init__(self, storage, ranking_service):
        self.storage = storage
        self.ranking = ranking_service

    def list_skills(self, q: str = "", category: str = "",
                    tags: str = "", sort: str = "hot",
                    page: int = 1, page_size: int = 12):
        """列表查询，返回 (summary_items, total)。"""
        filters = {}
        if q:
            filters["q"] = q
        if category:
            filters["category"] = category
        if tags:
            filters["tags"] = tags

        items, total = self.storage.list_skills(
            filters=filters, sort=sort, page=page, page_size=page_size,
        )
        summaries = [to_summary(s) for s in items]
        return summaries, total

    def get_skill_detail(self, skill_id: str):
        """获取技能详情，自动 +1 浏览次数并刷新 hot_score。"""
        skill = self.storage.get_skill(skill_id)
        if not skill:
            return None
        # 副作用：view_count +1
        self.storage.increment_view(skill_id)
        self.ranking.recompute(skill_id)
        # 重新读取更新后的数据
        skill = self.storage.get_skill(skill_id)
        detail = to_detail(skill)
        # 如果 skill_md_html 为空但有 skill_md，则自动渲染
        if not detail.get("skill_md_html") and detail.get("skill_md"):
            from services.md_render import render_markdown
            detail["skill_md_html"] = render_markdown(detail["skill_md"])
        return detail

    def get_tags(self):
        """标签频率 Top 20。"""
        return self.storage.get_tags_frequency()

    def get_categories(self):
        """分类白名单 + 动态 count。"""
        return self.storage.list_categories()

    @staticmethod
    def validate_list_params(q, category, sort, page, page_size):
        """校验列表查询参数，返回 (error_code, details) 或 None。"""
        from utils.errors import ErrorCode

        # q 长度
        if q and len(q) > 200:
            return ErrorCode.INVALID_QUERY, {"field": "q", "max": 200}

        # category 枚举
        if category and not is_valid_category(category):
            return (ErrorCode.INVALID_CATEGORY,
                    {"field": "category",
                     "allowed": CATEGORY_WHITELIST})

        # sort 枚举
        if sort and sort not in VALID_SORT_OPTIONS:
            return ErrorCode.INVALID_QUERY, {"field": "sort", "max": 4}

        # page_size 范围
        try:
            ps = int(page_size)
            if ps < 1 or ps > 50:
                return ErrorCode.INVALID_PAGE, {"field": "page_size"}
        except (ValueError, TypeError):
            return ErrorCode.INVALID_PAGE, {"field": "page_size"}

        # page >= 1
        try:
            p = int(page)
            if p < 1:
                return ErrorCode.INVALID_PAGE, {"field": "page"}
        except (ValueError, TypeError):
            return ErrorCode.INVALID_PAGE, {"field": "page"}

        return None
