"""
Investment fortune seed data for the fortune-card ritual experience.
"""
import json
from database import get_connection

# 9 张投资财运牌
CARDS = [
    {
        "id": "card_001",
        "title": "底仓守成",
        "subtitle": "慢，不代表没有复利。",
        "description": "你的过去由稳健积累构成，耐心与纪律帮你避开了最伤筋动骨的回撤。",
        "type": "foundation",
        "phase": "past",
        "rarity": "common",
        "cover_url": "/assets/cards/card-001.webp",
        "illustration_url": "/assets/cards/card-001-detail.webp",
        "tags": json.dumps(["底仓", "复利", "稳健"]),
    },
    {
        "id": "card_002",
        "title": "风口追击",
        "subtitle": "你总能闻到题材升温的味道。",
        "description": "过去的你擅长捕捉热点，但也容易把短期热度误判成长期趋势。",
        "type": "momentum",
        "phase": "past",
        "rarity": "common",
        "cover_url": "/assets/cards/card-002.webp",
        "illustration_url": "/assets/cards/card-002-detail.webp",
        "tags": json.dumps(["热点", "情绪", "题材"]),
    },
    {
        "id": "card_003",
        "title": "现金为王",
        "subtitle": "仓位轻，心就稳。",
        "description": "你正处于重新校准期，手里保留的现金给了你继续选择的底气。",
        "type": "state",
        "phase": "present",
        "rarity": "rare",
        "cover_url": "/assets/cards/card-003.webp",
        "illustration_url": "/assets/cards/card-003-detail.webp",
        "tags": json.dumps(["现金流", "仓位", "防守"]),
    },
    {
        "id": "card_004",
        "title": "赛道换挡",
        "subtitle": "旧逻辑退潮，新逻辑上桌。",
        "description": "你的当前处境提示你及时调仓，把注意力从熟悉板块转向更有增量的方向。",
        "type": "rotation",
        "phase": "present",
        "rarity": "rare",
        "cover_url": "/assets/cards/card-004.webp",
        "illustration_url": "/assets/cards/card-004-detail.webp",
        "tags": json.dumps(["轮动", "调仓", "增量"]),
    },
    {
        "id": "card_005",
        "title": "财星入局",
        "subtitle": "好运会偏爱准备好的人。",
        "description": "未来阶段会出现一次明确机会窗口，只要你敢于执行，就能把好运兑现为收益。",
        "type": "opportunity",
        "phase": "future",
        "rarity": "legendary",
        "cover_url": "/assets/cards/card-005.webp",
        "illustration_url": "/assets/cards/card-005-detail.webp",
        "tags": json.dumps(["机会", "好运", "兑现"]),
    },
    {
        "id": "card_006",
        "title": "收益修复",
        "subtitle": "先补坑，再起飞。",
        "description": "这张牌提醒你别急着翻倍，先把历史回撤修复，账户曲线会更健康。",
        "type": "repair",
        "phase": "past",
        "rarity": "common",
        "cover_url": "/assets/cards/card-006.webp",
        "illustration_url": "/assets/cards/card-006-detail.webp",
        "tags": json.dumps(["修复", "回撤", "节奏"]),
    },
    {
        "id": "card_007",
        "title": "消息面震荡",
        "subtitle": "不确定性本身就是信号。",
        "description": "眼下市场噪音较多，你需要过滤情绪，只保留能进交易系统的事实。",
        "type": "signal",
        "phase": "present",
        "rarity": "rare",
        "cover_url": "/assets/cards/card-007.webp",
        "illustration_url": "/assets/cards/card-007-detail.webp",
        "tags": json.dumps(["消息", "波动", "过滤"]),
    },
    {
        "id": "card_008",
        "title": "复利加速器",
        "subtitle": "一旦跑起来，雪球就不会轻易停。",
        "description": "未来的增长并非一击即中，而是连续正确决策堆出的加速度。",
        "type": "compound",
        "phase": "future",
        "rarity": "legendary",
        "cover_url": "/assets/cards/card-008.webp",
        "illustration_url": "/assets/cards/card-008-detail.webp",
        "tags": json.dumps(["复利", "加速", "纪律"]),
    },
    {
        "id": "card_009",
        "title": "逆势翻红",
        "subtitle": "别人恐惧时，你的窗口正打开。",
        "description": "未来财运来自逆向思考，你越能在低迷时保持方法，越容易拿到超额回报。",
        "type": "contrarian",
        "phase": "future",
        "rarity": "legendary",
        "cover_url": "/assets/cards/card-009.webp",
        "illustration_url": "/assets/cards/card-009-detail.webp",
        "tags": json.dumps(["逆向", "财运", "超额"]),
    },
]

# 6 面骰子（来自 diceResults，注意 mockData 中字段是 rot，规格要求 rotation）
DICE_FACES = [
    {"face": 1, "label": "守财模式", "rotation": "rotateX(0deg) rotateY(0deg)"},
    {"face": 2, "label": "谨慎试探", "rotation": "rotateX(-90deg) rotateY(0deg)"},
    {"face": 3, "label": "趋势成形", "rotation": "rotateY(-90deg) rotateZ(0deg)"},
    {"face": 4, "label": "板块轮动", "rotation": "rotateY(90deg) rotateZ(0deg)"},
    {"face": 5, "label": "偏财升温", "rotation": "rotateX(90deg) rotateY(0deg)"},
    {"face": 6, "label": "财运爆发", "rotation": "rotateY(180deg) rotateZ(0deg)"},
]

# 结局模板
ENDINGS = [
    {
        "id": "ending_001",
        "title": "资金曲线抬头",
        "summary": "接下来一段时间，你的账户更适合稳步抬升而不是暴冲暴跌。",
        "description": "别追求一夜暴富，把命中的顺风期变成可以复用的交易节奏，你的财运就会越来越像实力。",
        "mood": "epic",
        "theme_color": "#FFD700",
    },
    {
        "id": "ending_002",
        "title": "机会窗口已开",
        "summary": "财运不是突然降临，而是你终于站到了风会吹来的地方。",
        "description": "你的判断开始与市场节奏同步，只要控制仓位和出手频率，本轮行情有望带来像样的兑现。",
        "mood": "cosmic",
        "theme_color": "#7B68EE",
    },
    {
        "id": "ending_003",
        "title": "偏财小阳春",
        "summary": "你最近的好运更适合做小步快跑，而不是孤注一掷。",
        "description": "谨慎的你会在一些看似不起眼的机会里积累收益，真正拉开差距的是持续兑现，而不是一次传奇。",
        "mood": "ironic",
        "theme_color": "#20B2AA",
    },
    {
        "id": "ending_004",
        "title": "先守后攻",
        "summary": "你的下一阶段更像是一场耐力赛，先守住本金再等待胜率抬升。",
        "description": "当杂音太多时，最好的财运往往不是赚得最快，而是亏得最少。你这次会赢在耐心和选择。",
        "mood": "philosophical",
        "theme_color": "#FF6B6B",
    },
]

# 人格标签
PERSONALITIES = [
    {
        "id": "personality_001",
        "label": "价值猎手",
        "description": "你天生擅长在喧闹市场里筛出被低估的机会，慢热但后劲足。",
    },
    {
        "id": "personality_002",
        "label": "趋势乘风者",
        "description": "你对资金流向和市场情绪很敏感，一旦踩中主线，爆发力非常强。",
    },
    {
        "id": "personality_003",
        "label": "防守型赢家",
        "description": "你也许不会每次都冲在最前面，但你很少在大回撤里站到错误一侧。",
    },
    {
        "id": "personality_004",
        "label": "财运放大器",
        "description": "你的好运来自执行力，越清晰地把计划落地，偏财越容易落到你手上。",
    },
]

# 引言（来自 reportQuotes）
QUOTES = [
    {
        "text": "这轮财运不会奖励最冲动的人，只会奖励最会在关键时点出手的人。",
        "highlights": json.dumps([
            {"word": "财运", "color": "text-tertiary"},
            {"word": "关键时点", "color": "text-secondary italic underline"},
        ]),
    },
    {
        "text": "真正的好运，是你看懂风险之后依然敢于把握属于自己的机会。",
        "highlights": json.dumps([
            {"word": "好运", "color": "text-tertiary"},
            {"word": "机会", "color": "text-secondary italic underline"},
        ]),
    },
    {
        "text": "投资运最怕犹豫，财运最怕失控，而你要练的是在波动里保持清醒。",
        "highlights": json.dumps([
            {"word": "投资运", "color": "text-tertiary"},
            {"word": "保持清醒", "color": "text-secondary italic underline"},
        ]),
    },
]


def needs_seed(conn) -> bool:
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM cards")
    count = cur.fetchone()[0]
    return count == 0


def run_seed():
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM cards")
    cur.execute("DELETE FROM dice_faces")
    cur.execute("DELETE FROM endings")
    cur.execute("DELETE FROM personalities")
    cur.execute("DELETE FROM quotes")

    for card in CARDS:
        cur.execute("""
            INSERT OR IGNORE INTO cards
            (id, title, subtitle, description, type, phase, rarity, cover_url, illustration_url, tags)
            VALUES (:id, :title, :subtitle, :description, :type, :phase, :rarity,
                    :cover_url, :illustration_url, :tags)
        """, card)

    for dice in DICE_FACES:
        cur.execute("""
            INSERT OR IGNORE INTO dice_faces (face, label, rotation)
            VALUES (:face, :label, :rotation)
        """, dice)

    for ending in ENDINGS:
        cur.execute("""
            INSERT OR IGNORE INTO endings (id, title, summary, description, mood, theme_color)
            VALUES (:id, :title, :summary, :description, :mood, :theme_color)
        """, ending)

    for personality in PERSONALITIES:
        cur.execute("""
            INSERT OR IGNORE INTO personalities (id, label, description)
            VALUES (:id, :label, :description)
        """, personality)

    for quote in QUOTES:
        cur.execute("""
            INSERT INTO quotes (text, highlights) VALUES (:text, :highlights)
        """, quote)

    conn.commit()
    conn.close()
    print("[seed_data] Seed data inserted successfully.")
