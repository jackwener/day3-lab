"""Mock 数据仓库 — 对齐 Spec-10 数据模型"""

FUNDS_DB = {
    "005827": {"fund_code": "005827", "fund_name": "易方达蓝筹精选混合", "fund_type": "混合型", "manager": "张坤", "company": "易方达基金", "scale": "67.62亿", "nav": 2.1563, "nav_change": 1.23, "rating": 4, "rating_label": "优秀", "scores": {"returns": 85, "risk_control": 72, "stability": 78, "timing": 65, "stock_picking": 88}},
    "003095": {"fund_code": "003095", "fund_name": "中欧医疗健康混合A", "fund_type": "混合型", "manager": "葛兰", "company": "中欧基金", "scale": "45.31亿", "nav": 1.8234, "nav_change": -0.56, "rating": 3, "rating_label": "良好", "scores": {"returns": 62, "risk_control": 58, "stability": 55, "timing": 48, "stock_picking": 72}},
    "161725": {"fund_code": "161725", "fund_name": "招商中证白酒指数", "fund_type": "指数型", "manager": "侯昊", "company": "招商基金", "scale": "321.45亿", "nav": 1.5672, "nav_change": 2.34, "rating": 4, "rating_label": "优秀", "scores": {"returns": 82, "risk_control": 65, "stability": 60, "timing": 70, "stock_picking": 75}},
    "011102": {"fund_code": "011102", "fund_name": "天弘中证光伏产业", "fund_type": "指数型", "manager": "林心龙", "company": "天弘基金", "scale": "28.76亿", "nav": 0.8923, "nav_change": -1.87, "rating": 2, "rating_label": "一般", "scores": {"returns": 35, "risk_control": 42, "stability": 38, "timing": 30, "stock_picking": 45}},
    "000051": {"fund_code": "000051", "fund_name": "华夏沪深300ETF联接A", "fund_type": "指数型", "manager": "赵宗庭", "company": "华夏基金", "scale": "156.78亿", "nav": 1.4523, "nav_change": 0.67, "rating": 4, "rating_label": "良好", "scores": {"returns": 70, "risk_control": 75, "stability": 80, "timing": 60, "stock_picking": 65}},
    "270002": {"fund_code": "270002", "fund_name": "广发稳健增长混合A", "fund_type": "混合型", "manager": "傅友兴", "company": "广发基金", "scale": "89.23亿", "nav": 3.2145, "nav_change": 0.34, "rating": 5, "rating_label": "优秀", "scores": {"returns": 88, "risk_control": 85, "stability": 90, "timing": 72, "stock_picking": 82}},
    "160119": {"fund_code": "160119", "fund_name": "南方中证500ETF联接A", "fund_type": "指数型", "manager": "罗文杰", "company": "南方基金", "scale": "112.34亿", "nav": 1.2367, "nav_change": 1.12, "rating": 3, "rating_label": "良好", "scores": {"returns": 68, "risk_control": 62, "stability": 65, "timing": 55, "stock_picking": 60}},
    "260108": {"fund_code": "260108", "fund_name": "景顺长城新兴成长混合", "fund_type": "混合型", "manager": "刘彦春", "company": "景顺长城基金", "scale": "78.45亿", "nav": 2.8976, "nav_change": -0.23, "rating": 4, "rating_label": "优秀", "scores": {"returns": 80, "risk_control": 70, "stability": 72, "timing": 68, "stock_picking": 85}},
    "161005": {"fund_code": "161005", "fund_name": "富国天惠成长混合A", "fund_type": "混合型", "manager": "朱少醒", "company": "富国基金", "scale": "145.67亿", "nav": 4.1234, "nav_change": 0.89, "rating": 5, "rating_label": "优秀", "scores": {"returns": 92, "risk_control": 78, "stability": 82, "timing": 75, "stock_picking": 90}},
    "163406": {"fund_code": "163406", "fund_name": "兴全合润混合", "fund_type": "混合型", "manager": "谢治宇", "company": "兴全基金", "scale": "95.34亿", "nav": 2.5678, "nav_change": -0.45, "rating": 4, "rating_label": "优秀", "scores": {"returns": 78, "risk_control": 82, "stability": 85, "timing": 70, "stock_picking": 80}},
}

FUND_RETURNS_DB = {
    "005827": {
        "returns": {"month_1": 3.21, "month_3": 8.56, "month_6": 12.34, "year_1": 18.76, "year_3": 45.23, "since_inception": 115.63},
        "holdings": [
            {"stock_name": "贵州茅台", "stock_code": "600519", "industry": "食品饮料", "weight": 9.87},
            {"stock_name": "五粮液", "stock_code": "000858", "industry": "食品饮料", "weight": 8.12},
            {"stock_name": "泸州老窖", "stock_code": "000568", "industry": "食品饮料", "weight": 6.45},
            {"stock_name": "招商银行", "stock_code": "600036", "industry": "银行", "weight": 5.23},
            {"stock_name": "中国平安", "stock_code": "601318", "industry": "保险", "weight": 4.89},
            {"stock_name": "美的集团", "stock_code": "000333", "industry": "家用电器", "weight": 4.56},
            {"stock_name": "海尔智家", "stock_code": "600690", "industry": "家用电器", "weight": 3.98},
            {"stock_name": "腾讯控股", "stock_code": "00700", "industry": "互联网", "weight": 3.76},
            {"stock_name": "药明康德", "stock_code": "603259", "industry": "医药", "weight": 3.21},
            {"stock_name": "宁德时代", "stock_code": "300750", "industry": "新能源", "weight": 2.98},
        ],
        "advice": {
            "conclusion": "该基金整体表现优秀，基金经理选股能力突出（评分88），收益能力位于同类前15%。",
            "suggestions": ["持仓偏向消费+金融板块，建议搭配科技类基金分散风险", "基金规模适中，适合中长期持有", "择时能力一般（65分），建议定投降低择时风险", "当前估值中等水平，可适当建仓"],
        },
    },
}

DEFAULT_RETURNS = {
    "returns": {"month_1": 1.5, "month_3": 4.2, "month_6": 7.8, "year_1": 12.3, "year_3": 28.5, "since_inception": 65.2},
    "holdings": [
        {"stock_name": "贵州茅台", "stock_code": "600519", "industry": "食品饮料", "weight": 8.5},
        {"stock_name": "宁德时代", "stock_code": "300750", "industry": "新能源", "weight": 6.2},
        {"stock_name": "招商银行", "stock_code": "600036", "industry": "银行", "weight": 5.8},
        {"stock_name": "中国平安", "stock_code": "601318", "industry": "保险", "weight": 4.5},
        {"stock_name": "美的集团", "stock_code": "000333", "industry": "家用电器", "weight": 4.1},
    ],
    "advice": {"conclusion": "该基金整体表现良好，各项指标处于同类中等偏上水平。", "suggestions": ["建议关注基金经理投资风格与自身风险偏好是否匹配", "可采用定投方式分批建仓", "建议持有期不低于1年"]},
}

HOLDINGS_NEWS_DB = {
    "005827": [
        {"id": "n001", "sentiment": "positive", "stock_name": "贵州茅台", "stock_code": "600519", "title": "茅台一季度营收同比增长18%，超市场预期", "source": "证券时报", "published_at": "2025-04-15T10:30:00Z"},
        {"id": "n002", "sentiment": "positive", "stock_name": "五粮液", "stock_code": "000858", "title": "五粮液提价预期升温，经销商库存处于低位", "source": "中国证券报", "published_at": "2025-04-15T09:15:00Z"},
        {"id": "n003", "sentiment": "negative", "stock_name": "招商银行", "stock_code": "600036", "title": "招商银行不良贷款率环比上升，资产质量承压", "source": "21世纪经济", "published_at": "2025-04-15T07:00:00Z"},
        {"id": "n004", "sentiment": "positive", "stock_name": "宁德时代", "stock_code": "300750", "title": "宁德时代发布新一代钠离子电池，成本降低30%", "source": "新能源观察", "published_at": "2025-04-14T16:00:00Z"},
        {"id": "n005", "sentiment": "neutral", "stock_name": "中国平安", "stock_code": "601318", "title": "平安寿险新业务价值增速放缓，转型效果待观察", "source": "财新网", "published_at": "2025-04-14T14:00:00Z"},
        {"id": "n006", "sentiment": "negative", "stock_name": "药明康德", "stock_code": "603259", "title": "美国拟新增CXO限制条款，药明康德股价承压", "source": "医药经济报", "published_at": "2025-04-14T10:00:00Z"},
    ],
    # 为更多基金添加资讯数据
    "003095": [
        {"id": "n101", "sentiment": "positive", "stock_name": "药明康德", "stock_code": "603259", "title": "药明康德海外订单持续增长，国际化布局加速", "source": "医药经济报", "published_at": "2025-04-15T08:30:00Z"},
        {"id": "n102", "sentiment": "neutral", "stock_name": "迈瑞医疗", "stock_code": "300760", "title": "迈瑞医疗发布新款监护仪产品，市场竞争加剧", "source": "医疗器械信息网", "published_at": "2025-04-14T15:00:00Z"},
        {"id": "n103", "sentiment": "positive", "stock_name": "恒瑞医药", "stock_code": "600276", "title": "恒瑞医药创新药获批上市，研发管线持续丰富", "source": "医药日报", "published_at": "2025-04-14T10:00:00Z"},
        {"id": "n104", "sentiment": "negative", "stock_name": "爱尔眼科", "stock_code": "300015", "title": "爱尔眼科扩张速度放缓，单店营收下降", "source": "健康时报", "published_at": "2025-04-13T16:00:00Z"},
    ],
    "161725": [
        {"id": "n201", "sentiment": "positive", "stock_name": "贵州茅台", "stock_code": "600519", "title": "白酒板块迎来旺季，茅台终端价格稳定上涨", "source": "食品商务网", "published_at": "2025-04-15T09:00:00Z"},
        {"id": "n202", "sentiment": "positive", "stock_name": "五粮液", "stock_code": "000858", "title": "五粮液经典产品提价，渠道利润空间扩大", "source": "酒类营销", "published_at": "2025-04-14T14:00:00Z"},
        {"id": "n203", "sentiment": "neutral", "stock_name": "泸州老窖", "stock_code": "000568", "title": "泸州老窖国窖1573销量平稳，高端市场格局稳定", "source": "糖酒快讯", "published_at": "2025-04-14T08:00:00Z"},
        {"id": "n204", "sentiment": "negative", "stock_name": "山西汾酒", "stock_code": "600809", "title": "汾酒青花系列动销放缓，库存压力增加", "source": "酒业家", "published_at": "2025-04-13T11:00:00Z"},
    ],
}

DEFAULT_HOLDINGS_NEWS = [{"id": "n_def_01", "sentiment": "neutral", "stock_name": "示例股票", "stock_code": "000001", "title": "暂无该基金持仓股相关资讯", "source": "系统提示", "published_at": "2025-04-15T00:00:00Z"}]

MARKET_INDICES = [
    {"name": "上证指数", "value": 3342.66, "change": 0.85, "volume": "3856亿"},
    {"name": "深证成指", "value": 10876.23, "change": -0.32, "volume": "4521亿"},
    {"name": "创业板指", "value": 2187.45, "change": 1.56, "volume": "2134亿"},
    {"name": "沪深300", "value": 3965.78, "change": 0.67, "volume": "1876亿"},
]

MARKET_FUNDS = [
    {"fund_code": "005827", "fund_name": "易方达蓝筹精选混合", "fund_type": "混合型", "nav": 2.1563, "day_change": 1.23, "week_change": 3.45, "month_change": 8.56, "year_change": 18.76, "scale": "67.62亿", "risk_level": "中高"},
    {"fund_code": "003095", "fund_name": "中欧医疗健康混合A", "fund_type": "混合型", "nav": 1.8234, "day_change": -0.56, "week_change": -1.23, "month_change": -3.45, "year_change": -8.92, "scale": "45.31亿", "risk_level": "高"},
    {"fund_code": "161725", "fund_name": "招商中证白酒指数", "fund_type": "指数型", "nav": 1.5672, "day_change": 2.34, "week_change": 5.67, "month_change": 12.34, "year_change": 25.67, "scale": "321.45亿", "risk_level": "中高"},
    {"fund_code": "011102", "fund_name": "天弘中证光伏产业", "fund_type": "指数型", "nav": 0.8923, "day_change": -1.87, "week_change": -4.56, "month_change": -8.23, "year_change": -15.34, "scale": "28.76亿", "risk_level": "高"},
    {"fund_code": "000051", "fund_name": "华夏沪深300ETF联接A", "fund_type": "指数型", "nav": 1.4523, "day_change": 0.67, "week_change": 2.12, "month_change": 5.34, "year_change": 12.45, "scale": "156.78亿", "risk_level": "中"},
    {"fund_code": "270002", "fund_name": "广发稳健增长混合A", "fund_type": "混合型", "nav": 3.2145, "day_change": 0.34, "week_change": 1.23, "month_change": 3.67, "year_change": 9.87, "scale": "89.23亿", "risk_level": "中"},
    {"fund_code": "160119", "fund_name": "南方中证500ETF联接A", "fund_type": "指数型", "nav": 1.2367, "day_change": 1.12, "week_change": 3.45, "month_change": 7.89, "year_change": 16.78, "scale": "112.34亿", "risk_level": "中高"},
    {"fund_code": "260108", "fund_name": "景顺长城新兴成长混合", "fund_type": "混合型", "nav": 2.8976, "day_change": -0.23, "week_change": 0.56, "month_change": 2.34, "year_change": 7.56, "scale": "78.45亿", "risk_level": "中高"},
    {"fund_code": "161005", "fund_name": "富国天惠成长混合A", "fund_type": "混合型", "nav": 4.1234, "day_change": 0.89, "week_change": 2.67, "month_change": 6.78, "year_change": 15.23, "scale": "145.67亿", "risk_level": "中"},
    {"fund_code": "163406", "fund_name": "兴全合润混合", "fund_type": "混合型", "nav": 2.5678, "day_change": -0.45, "week_change": -0.89, "month_change": 1.23, "year_change": 5.67, "scale": "95.34亿", "risk_level": "中"},
]

ARTICLES_DB = [
    # 🔥 热门文章 (views > 8000)
    {"id": "a001", "title": "2025年Q2基金市场展望：结构性机会仍在", "summary": "随着宏观经济逐步复苏，A股市场呈现震荡上行格局。消费、科技、新能源三大赛道将成为下半年基金投资的重点方向。", "category": "市场展望", "author": "基金研究中心", "author_avatar": None, "cover_image": "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=250&fit=crop", "tags": ["宏观", "投资策略", "A股"], "views": 12560, "likes": 342, "published_at": "2025-04-15T08:00:00Z", "original_url": ""},
    {"id": "a002", "title": "AI赋能基金投研：智能量化策略新突破", "summary": "人工智能技术在基金投研领域的应用日趋成熟，多家头部基金公司已将AI模型深度融入投资决策流程。", "category": "行业动态", "author": "金融科技前沿", "author_avatar": None, "cover_image": "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=250&fit=crop", "tags": ["AI", "量化投资", "金融科技"], "views": 10850, "likes": 428, "published_at": "2025-04-15T05:00:00Z", "original_url": ""},
    {"id": "a006", "title": "基金定投策略优化：智能定投 vs 普通定投", "summary": "本文对比分析了智能定投与普通定投在不同市场环境下的表现差异。", "category": "投资策略", "author": "理财规划师", "author_avatar": None, "cover_image": "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=250&fit=crop", "tags": ["定投", "投资策略", "理财"], "views": 9870, "likes": 445, "published_at": "2025-04-13T06:00:00Z", "original_url": ""},
    {"id": "a007", "title": "新能源板块回调，相关基金何去何从？", "summary": "近期新能源板块持续回调，机构分析认为短期调整不改长期向好趋势。", "category": "市场展望", "author": "新能源观察", "author_avatar": None, "cover_image": "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=400&h=250&fit=crop", "tags": ["新能源", "板块分析", "投资时机"], "views": 9240, "likes": 367, "published_at": "2025-04-12T08:00:00Z", "original_url": ""},
    {"id": "a003", "title": "ESG基金迎来发展新机遇，规模突破万亿", "summary": "随着全球可持续发展理念的深入，ESG投资理念在中国市场快速普及。", "category": "行业动态", "author": "绿色金融观察", "author_avatar": None, "cover_image": "https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?w=400&h=250&fit=crop", "tags": ["ESG", "可持续投资", "绿色金融"], "views": 8650, "likes": 298, "published_at": "2025-04-14T10:00:00Z", "original_url": ""},
    # 📄 普通文章 (views < 8000)
    {"id": "a004", "title": "债券基金攻守兼备：低利率时代的配置价值", "summary": "在全球低利率环境下，债券基金凭借其稳健的收益特征，成为资产配置中不可或缺的一环。", "category": "投资策略", "author": "固收研究院", "author_avatar": None, "cover_image": "https://images.unsplash.com/photo-1604594844992-4f98c47d45d4?w=400&h=250&fit=crop", "tags": ["债券", "固收", "资产配置"], "views": 5420, "likes": 156, "published_at": "2025-04-14T08:00:00Z", "original_url": ""},
    {"id": "a005", "title": "公募REITs半年报解读：底层资产表现分化", "summary": "首批公募REITs产品运营数据显示底层资产运营状况分化明显。", "category": "产品分析", "author": "不动产研究", "author_avatar": None, "cover_image": "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&h=250&fit=crop", "tags": ["REITs", "不动产", "另类投资"], "views": 4350, "likes": 123, "published_at": "2025-04-13T10:00:00Z", "original_url": ""},
    {"id": "a008", "title": "跨境QDII基金投资指南：全球资产配置新选择", "summary": "QDII基金为国内投资者提供了便捷的全球资产配置渠道。", "category": "产品分析", "author": "全球投资视野", "author_avatar": None, "cover_image": "https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?w=400&h=250&fit=crop", "tags": ["QDII", "全球配置", "跨境投资"], "views": 3890, "likes": 98, "published_at": "2025-04-12T06:00:00Z", "original_url": ""},
]

HOT_TAGS = ["A股", "宏观", "量化投资", "AI", "ESG", "债券", "定投", "新能源", "REITs", "QDII", "金融科技", "资产配置", "投资策略", "可持续投资"]
