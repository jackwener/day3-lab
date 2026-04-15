import json
import random
import string
import ssl
import urllib.request
import urllib.error
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any

from database import get_connection

# Phase metadata (from fatePhases in mockData.js)
PHASE_META = [
    {"key": "past",    "label": "过去", "labelEn": "PAST",    "subLabel": "起因", "rarity": "common"},
    {"key": "present", "label": "现在", "labelEn": "PRESENT", "subLabel": "纠缠", "rarity": "rare"},
    {"key": "future",  "label": "未来", "labelEn": "FUTURE",  "subLabel": "劫数", "rarity": "legendary"},
]

# Attributes template (5维，from task spec)
ATTRIBUTE_TEMPLATES = [
    {"key": "wealth",      "label": "偏财热度", "icon": "savings", "color": "primary",   "unit": "%"},
    {"key": "timing",      "label": "出手时机", "icon": "schedule", "color": "secondary", "unit": "%"},
    {"key": "conviction",  "label": "持仓信念", "icon": "trending_up", "color": "tertiary",  "unit": "%"},
    {"key": "riskControl", "label": "风控纪律", "icon": "shield", "color": "primary",   "unit": "%"},
    {"key": "fortune",     "label": "财运磁场", "icon": "auto_awesome", "color": "secondary", "unit": "%"},
]


RITUAL_PROFILE = {
    "brand": "投资财运神谕局",
    "loading": {
        "title": "正在校准你的财富磁场...",
        "subtitle": "读取持仓情绪、资金流向与偏财波动",
        "statusPill": "Fortune signal syncing",
    },
    "dicePrompt": {
        "title": "市场开盘仪式",
        "description": "先投掷市场骰子，确认今天更适合守仓、试仓，还是主动出击。",
        "actionLabel": "掷出今日财运面",
        "skipLabel": "直接进入选牌",
    },
    "drawPrompt": {
        "stageBadge": "财富三相推演",
        "title": "选择三张投资命运牌",
        "helper": "它们会分别解释你的资金过去、当下仓位，以及下一步财运走向。",
        "footerHint": "选牌时别只看好运，先看自己能不能接得住这波机会。",
        "progressLabel": "已选财运牌",
    },
    "decisionPrompt": {
        "title": "未来走势已经显影",
        "subtitle": "你可以接受当前剧本，也可以消耗一次改命机会，重抽未来牌。",
        "changeLabel": "重写未来仓位",
        "acceptLabel": "接受当前走势",
        "warning": "每次强行改命，都会降低你的短线运气稳定度。",
        "costLabel": "改命成本：机会成本 + 风险偏移",
    },
    "reportHero": {
        "eyebrow": "Investment Fortune Synthesis",
        "title": "今日投资财运报告",
    },
}


# 南方基金公开列表回退池（优先使用公开来源成功抓取结果）
SOUTHERN_FUND_FALLBACK_POOL = [
    {
        "code": "005827",
        "name": "南方量化新趋势灵活配置混合C",
        "manager": "南方基金",
        "strategy": "偏成长+宽基风格轮动，兼顾波动控制，适合有一定进取性预算的仓位调整。",
        "reason": "通过多因子风格转换跟随市场节奏，便于在财运阶段性分歧时实现弹性加减。",
        "market": "公募",
        "url": "https://fund.eastmoney.com/005827.html",
    },
    {
        "code": "001632",
        "name": "南方中证500成长",
        "manager": "南方基金",
        "strategy": "中证500成长因子暴露，偏成长成长股配置，强化中盘弹性。",
        "reason": "过去与未来的成长偏好阶段里更容易形成连续性仓位信号。",
        "market": "公募",
        "url": "https://fund.eastmoney.com/001632.html",
    },
    {
        "code": "002909",
        "name": "南方可持续低波策略股票",
        "manager": "南方基金",
        "strategy": "低波防御+成长叠加，偏稳健持仓。",
        "reason": "当前财运提示偏向‘守中有进’，可先关注回撤更可控的风格。",
        "market": "公募",
        "url": "https://fund.eastmoney.com/002909.html",
    },
    {
        "code": "001682",
        "name": "南方中证500",
        "manager": "南方基金",
        "strategy": "中证500指数化投资，偏成长中盘与量价同步。",
        "reason": "用于今日财运走向时可作为趋势延续的“基准仓位”对照。",
        "market": "公募",
        "url": "https://fund.eastmoney.com/001682.html",
    },
    {
        "code": "020480",
        "name": "南方收益宝货币C",
        "manager": "南方基金",
        "strategy": "货币基金，偏现金管理与低波动流动性仓位。",
        "reason": "当财运显示稳健取向时，先用“回撤可控”的现金侧仓位做过渡。",
        "market": "公募",
        "url": "https://fund.eastmoney.com/020480.html",
    },
]

_FUND_CACHE = None


def _normalize_attr_value(attributes: List[Dict[str, Any]], key: str, default: int = 65) -> int:
    for item in attributes:
        if item.get("key") == key:
            try:
                value = int(item.get("value", default))
            except (TypeError, ValueError):
                return default
            return max(0, min(100, value))
    return default


def _derive_fortune_profile(
    phases: List[Dict[str, Any]],
    attributes: List[Dict[str, Any]],
    fate_choice: Optional[str],
) -> Dict[str, int]:
    profile = {
        "growth": 0,
        "defense": 0,
        "rotation": 0,
        "stability": 0,
        "timing_sensitivity": 0,
    }

    risk_control = _normalize_attr_value(attributes, "riskControl", 65)
    conviction = _normalize_attr_value(attributes, "conviction", 65)
    timing = _normalize_attr_value(attributes, "timing", 60)
    wealth = _normalize_attr_value(attributes, "wealth", 60)
    fortune = _normalize_attr_value(attributes, "fortune", 60)

    if risk_control >= 78:
        profile["growth"] += 2
    elif risk_control <= 45:
        profile["defense"] += 2

    if conviction >= 76:
        profile["growth"] += 1
    elif conviction <= 45:
        profile["defense"] += 1

    if timing >= 70:
        profile["growth"] += 1
    elif timing <= 38:
        profile["defense"] += 1
        profile["stability"] += 1

    if fortune >= 74:
        profile["timing_sensitivity"] += 1
    elif fortune <= 45:
        profile["stability"] += 1

    if wealth >= 75:
        profile["growth"] += 1
    elif wealth <= 45:
        profile["defense"] += 1

    growth_keywords = {"复利", "机会", "财星", "超额", "成长", "增长", "进攻", "加速", "主旋律"}
    defense_keywords = {"现金", "修复", "回撤", "防守", "稳健", "防御", "底仓", "复原", "回报"}
    rotation_keywords = {"轮动", "调仓", "换挡", "赛道", "风格"}

    for phase in phases or []:
        card = phase.get("card") or {}
        text = " ".join([
            str(card.get("title", "")),
            str(card.get("subtitle", "")),
            str(card.get("description", "")),
            str(phase.get("statusSummary", "")),
            str(phase.get("interpretation", "")),
        ]).lower()
        for token in growth_keywords:
            if token in text:
                profile["growth"] += 1
        for token in defense_keywords:
            if token in text:
                profile["defense"] += 1
        for token in rotation_keywords:
            if token in text:
                profile["rotation"] += 1

    if fate_choice == "change":
        profile["growth"] += 1
        profile["timing_sensitivity"] += 1

    if sum(profile.values()) == 0:
        profile["stability"] += 1
    return profile


def _infer_fund_tags(candidate: Dict[str, Any]) -> set[str]:
    text = " ".join([
        str(candidate.get("name", "")),
        str(candidate.get("strategy", "")),
        str(candidate.get("reason", "")),
    ]).lower()

    tags = set()
    if any(token in text for token in ["低波", "防御", "稳健", "防守", "货币", "债"]):
        tags.add("defensive")
    if any(token in text for token in ["成长", "成长股", "成长因子", "趋势", "超额", "增长", "弹性"]):
        tags.add("growth")
    if any(token in text for token in ["宽基", "轮动", "灵活", "多策略", "策略", "配置", "混合"]):
        tags.add("rotation")
    if any(token in text for token in ["指数", "指数化", "基准"]):
        tags.add("balanced")
    if not tags:
        tags.add("balanced")
    return tags


def _score_fund(candidate: Dict[str, Any], profile: Dict[str, int]) -> float:
    tags = _infer_fund_tags(candidate)
    score = 0.0
    # 以财运画像主导评分，避免关键词误导导致“收益宝货币C”被解释成进攻型
    score += profile["growth"] * (1.4 if "growth" in tags and "defensive" not in tags else 0.6)
    score += profile["defense"] * (1.4 if "defensive" in tags else 0.2)
    score += profile["rotation"] * (1.1 if "rotation" in tags else 0.2)
    score += profile["timing_sensitivity"] * (0.9 if ("rotation" in tags or "growth" in tags) else 0.25)
    score += profile["stability"] * (1.2 if "balanced" in tags else 0.2)
    # 轻度抖动，保留“同类近似时有随机试探感”
    score += random.uniform(0, 0.3)
    return score


def _derive_fund_profile_hint(name: str) -> Dict[str, str]:
    if "货币" in name:
        return {
            "strategy": "货币基金，偏现金管理与低波动流动性仓位。",
            "reason": "当财运显示稳健取向时，先用“回撤可控”的现金侧仓位做过渡。",
        }
    if "债" in name:
        return {
            "strategy": "债券/债性基金，偏风险缓释，适合对冲阶段性下行。",
            "reason": "当局势提示防守或风险上行时，优先考虑债性配置平滑波动。",
        }
    if "货" in name and "宝" in name:
        return {
            "strategy": "偏现金管理与流动性为主的稳健型仓位。",
            "reason": "用于阶段性试探仓位，先保留可回撤空间以便后续切换。",
        }
    if any(k in name for k in ["成长", "新趋势", "成长股", "成长因子"]):
        return {
            "strategy": "成长取向策略，适合窗口打开时提高弹性与参与度。",
            "reason": "当前局势偏进攻或动量延续时，先放大可承受范围内的试仓。",
        }
    if any(k in name for k in ["宽基", "配置", "策略", "轮动"]):
        return {
            "strategy": "宽基/策略型配置，兼顾进攻与波动控制。",
            "reason": "在财运转折期，作为中性试探仓可兼顾参与与止损。",
        }
    return {
        "strategy": "南方公募风格标的，适合当前财运局势下做结构化试探。",
        "reason": "可作为当下财运局势对应的过渡仓位参考。",
    }


def _find_best_fund(
    candidates: List[Dict[str, Any]],
    phases: List[Dict[str, Any]],
    attributes: List[Dict[str, Any]],
    fate_choice: Optional[str],
    seed: Optional[str] = None,
) -> Dict[str, Any]:
    if not candidates:
        return {}

    profile = _derive_fortune_profile(phases, attributes, fate_choice)
    ranked = []
    for item in candidates:
        ranked.append((item, _score_fund(item, profile)))
    ranked.sort(key=lambda x: x[1], reverse=True)

    top_n = min(3, len(ranked))
    top_items = [item[0] for item in ranked[:top_n]]
    rand = random.Random(seed)
    return rand.choice(top_items)


def _tag_to_reason(profile: Dict[str, int], candidate: Dict[str, str]) -> str:
    tags = _infer_fund_tags(candidate)
    label_map = {
        "growth": "进攻型",
        "defensive": "防守型",
        "rotation": "轮动型",
        "balanced": "基准型",
    }
    tag_scores = {
        "growth": (profile["growth"] + 0.2 * profile["timing_sensitivity"] + 0.1 * profile["rotation"]),
        "defensive": (profile["defense"] + profile["stability"] + 0.1 * profile["timing_sensitivity"]),
        "rotation": (profile["rotation"] + 0.2 * profile["timing_sensitivity"] + 0.1 * profile["growth"]),
        "balanced": (profile["stability"] + 0.1 * profile["defense"]),
    }
    if tags:
        strongest = max(tags, key=lambda tag: tag_scores.get(tag, 0))
    else:
        strongest = "balanced"
        tags = {"balanced"}
    prefix = label_map.get(strongest, "试探型")
    trend = "顺势" if profile["growth"] >= profile["defense"] else "稳健"
    if strongest in {"defensive", "balanced"} and profile["growth"] < profile["defense"]:
        trend = "稳健"
    elif strongest in {"growth", "rotation"} and profile["growth"] >= profile["defense"]:
        trend = "顺势"
    return f"{prefix}{trend}组合，匹配当前财运局势用于试探性仓位过渡。"


def _fetch_south_funds_from_eastmoney() -> List[Dict[str, str]]:
    """Try to fetch public south fund candidates from EastMoney JS source."""
    try:
        req = urllib.request.Request(
            "https://fund.eastmoney.com/js/fundcode_search.js",
            headers={"User-Agent": "Mozilla/5.0"},
        )
        context = ssl._create_unverified_context()
        with urllib.request.urlopen(req, context=context, timeout=4) as resp:
            raw = resp.read().decode("utf-8", errors="ignore")
    except (urllib.error.URLError, OSError, ValueError, TimeoutError):
        return []

    marker = raw.find("var r = ")
    if marker == -1:
        return []

    start = raw.find("[", marker)
    end = raw.rfind("]")
    if start == -1 or end == -1 or end <= start:
        return []

    try:
        rows = json.loads(raw[start : end + 1])
    except Exception:
        return []

    result = []
    for row in rows:
        if not isinstance(row, list) or len(row) < 3:
            continue
        name = row[2] or ""
        if "南方" not in name:
            continue
        code = row[0]
        if not code:
            continue
        name = str(name)
        hint = _derive_fund_profile_hint(name)
        result.append(
            {
                "code": str(code),
                "name": name,
                "manager": "南方基金",
                "strategy": hint["strategy"],
                "reason": hint["reason"],
                "market": "公募",
                "url": f"https://fund.eastmoney.com/{code}.html",
            }
        )

    return result


def _get_recommended_fund(
    phases: Optional[List[Dict[str, Any]]] = None,
    attributes: Optional[List[Dict[str, Any]]] = None,
    fate_choice: Optional[str] = None,
    seed: Optional[str] = None,
) -> Dict[str, str]:
    global _FUND_CACHE
    if _FUND_CACHE is None:
        candidates = _fetch_south_funds_from_eastmoney()
        if candidates:
            _FUND_CACHE = candidates
        else:
            _FUND_CACHE = SOUTHERN_FUND_FALLBACK_POOL

    selected = _find_best_fund(
        _FUND_CACHE,
        phases or [],
        attributes or [],
        fate_choice,
        seed,
    )
    if not selected:
        return {}

    selected = dict(selected)
    profile = _derive_fortune_profile(
        phases or [],
        attributes or [],
        fate_choice,
    )
    selected["reason"] = _tag_to_reason(profile, selected)
    return selected


def _now_iso() -> str:
    tz_cn = timezone(timedelta(hours=8))
    return datetime.now(tz_cn).isoformat()


def _gen_id(prefix: str) -> str:
    today = datetime.now().strftime("%Y%m%d")
    suffix = "".join(random.choices(string.ascii_lowercase + string.digits, k=4))
    return f"{prefix}_{today}_{suffix}"


def _phase_story(phase_key: str, card: Dict[str, Any], choice: Optional[str] = None) -> Dict[str, str]:
    if phase_key == "past":
        return {
            "statusTitle": "资金来路",
            "statusSummary": f"过去这段时间，你的账户节奏被「{card['title']}」主导。",
            "interpretation": f"{card['description']} 这说明你原本更依赖 {card['subtitle']} 这类安全感，而不是一把梭的高波动收益。",
        }
    if phase_key == "present":
        return {
            "statusTitle": "当前仓位",
            "statusSummary": f"眼下你正站在「{card['title']}」的节点上。",
            "interpretation": f"{card['description']} 现在最重要的不是追求最大收益，而是先判断你能承受多大的回撤与多快的节奏。",
        }

    future_suffix = "你选择接受原有走势，让运势自然兑现。" if choice == "accept" else "你触发了改命分支，未来被重新洗牌，机会与风险都会一起放大。"
    return {
        "statusTitle": "未来财运",
        "statusSummary": f"未来一段时间，「{card['title']}」会成为你的主旋律。",
        "interpretation": f"{card['description']} {future_suffix}",
    }


def create_ritual(enable_dice: bool = True) -> Dict[str, Any]:
    ritual_id = _gen_id("ritual")
    conn = get_connection()
    cur = conn.cursor()

    # Fetch all 9 cards as the draw pool
    cur.execute("SELECT id FROM cards ORDER BY id")
    card_ids = [row["id"] for row in cur.fetchall()]

    cur.execute("""
        INSERT INTO rituals (id, state, enable_dice, draw_count, card_pool, created_at)
        VALUES (?, 'initialized', ?, 3, ?, ?)
    """, (ritual_id, 1 if enable_dice else 0, json.dumps(card_ids), _now_iso()))

    conn.commit()
    conn.close()

    return {
        "ritualId": ritual_id,
        "state": "initialized",
        "enableDice": enable_dice,
        "drawCount": 3,
        "profile": RITUAL_PROFILE,
    }


def _get_ritual(conn, ritual_id: str) -> Optional[Dict]:
    cur = conn.cursor()
    cur.execute("SELECT * FROM rituals WHERE id = ?", (ritual_id,))
    row = cur.fetchone()
    if row is None:
        return None
    return dict(row)


def roll_dice(ritual_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    ritual = _get_ritual(conn, ritual_id)
    if ritual is None:
        conn.close()
        return None

    if ritual["state"] not in ("initialized",):
        conn.close()
        return {"error": "RITUAL_STATE_INVALID", "message": f"当前状态 {ritual['state']} 不允许投骰子"}

    # Random dice face 1-6
    cur = conn.cursor()
    cur.execute("SELECT * FROM dice_faces ORDER BY RANDOM() LIMIT 1")
    row = cur.fetchone()
    dice = dict(row)

    cur.execute("""
        UPDATE rituals SET state='dice_rolled', dice_face=?, dice_label=?, dice_rotation=?
        WHERE id=?
    """, (dice["face"], dice["label"], dice["rotation"], ritual_id))
    conn.commit()
    conn.close()

    return {
        "ritualId": ritual_id,
        "state": "dice_rolled",
        "diceRoll": {
            "face": dice["face"],
            "label": dice["label"],
            "rotation": dice["rotation"],
        },
        "dicePrompt": RITUAL_PROFILE["dicePrompt"],
    }


def get_draw_pool(ritual_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    ritual = _get_ritual(conn, ritual_id)
    if ritual is None:
        conn.close()
        return None

    if ritual["state"] not in ("dice_rolled", "drawing"):
        conn.close()
        return {"error": "RITUAL_STATE_INVALID", "message": f"当前状态 {ritual['state']} 不允许获取卡池"}

    card_pool_ids = json.loads(ritual["card_pool"] or "[]")
    cur = conn.cursor()
    placeholders = ",".join("?" * len(card_pool_ids))
    cur.execute(f"SELECT * FROM cards WHERE id IN ({placeholders})", card_pool_ids)
    rows = cur.fetchall()

    cards = []
    for row in rows:
        r = dict(row)
        cards.append({
            "id": r["id"],
            "title": r["title"],
            "subtitle": r["subtitle"],
            "description": r["description"],
            "type": r["type"],
            "phase": r["phase"],
            "rarity": r["rarity"],
            "coverUrl": r.get("cover_url"),
            "tags": json.loads(r["tags"]) if r.get("tags") else [],
        })

    # Update state to drawing
    cur.execute("UPDATE rituals SET state='drawing' WHERE id=?", (ritual_id,))
    conn.commit()
    conn.close()

    return {
        "ritualId": ritual_id,
        "state": "drawing",
        "cards": cards,
        "drawPrompt": RITUAL_PROFILE["drawPrompt"],
    }


def reveal_cards(ritual_id: str, selected_card_ids: List[str]) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    ritual = _get_ritual(conn, ritual_id)
    if ritual is None:
        conn.close()
        return None

    if ritual["state"] != "drawing":
        conn.close()
        return {"error": "RITUAL_STATE_INVALID", "message": f"当前状态 {ritual['state']} 不允许揭示卡牌"}

    # Validate selections
    if len(selected_card_ids) != 3:
        conn.close()
        return {"error": "VALIDATION_ERROR", "message": "selectedCardIds must contain exactly 3 items"}

    if len(set(selected_card_ids)) != len(selected_card_ids):
        conn.close()
        return {"error": "VALIDATION_ERROR", "message": "selectedCardIds must not contain duplicates"}

    card_pool_ids = json.loads(ritual["card_pool"] or "[]")
    for cid in selected_card_ids:
        if cid not in card_pool_ids:
            conn.close()
            return {"error": "VALIDATION_ERROR", "message": f"Card {cid} is not in current draw pool"}

    # Fetch selected cards
    cur = conn.cursor()
    placeholders = ",".join("?" * len(selected_card_ids))
    cur.execute(f"SELECT * FROM cards WHERE id IN ({placeholders})", selected_card_ids)
    card_map = {row["id"]: dict(row) for row in cur.fetchall()}

    # Build phases: assign cards to past/present/future in order
    phases = []
    for i, phase_meta in enumerate(PHASE_META):
        card_id = selected_card_ids[i]
        card = card_map[card_id]
        phases.append({
            "phase": phase_meta["key"],
            "label": phase_meta["label"],
            "labelEn": phase_meta["labelEn"],
            "subLabel": phase_meta["subLabel"],
            "rarity": phase_meta["rarity"],
            "card": {
                "id": card["id"],
                "title": card["title"],
                "subtitle": card["subtitle"],
                "description": card["description"],
                "type": card["type"],
                "phase": card["phase"],
                "rarity": card["rarity"],
                "tags": json.loads(card["tags"]) if card.get("tags") else [],
            },
            **_phase_story(phase_meta["key"], card),
        })

    # 每次展示时打乱牌阵顺序（每局一次）
    random.shuffle(phases)

    # Pick ending + personality based on selected cards' rarities
    rarities = [card_map[cid]["rarity"] for cid in selected_card_ids]
    legendary_count = rarities.count("legendary")
    if legendary_count >= 2:
        ending_offset = 0  # epic
    elif legendary_count == 1:
        ending_offset = 1  # cosmic
    else:
        ending_offset = random.randint(2, 3)  # ironic / philosophical

    cur.execute("SELECT id FROM endings LIMIT 1 OFFSET ?", (ending_offset,))
    ending_row = cur.fetchone()
    if ending_row is None:
        cur.execute("SELECT id FROM endings ORDER BY RANDOM() LIMIT 1")
        ending_row = cur.fetchone()
    ending_id = ending_row["id"]

    cur.execute("SELECT id FROM personalities ORDER BY RANDOM() LIMIT 1")
    personality_id = cur.fetchone()["id"]

    # Generate 5 random attributes
    attributes = []
    for tmpl in ATTRIBUTE_TEMPLATES:
        attributes.append({**tmpl, "value": random.randint(30, 95)})

    cur.execute("SELECT id FROM quotes ORDER BY RANDOM() LIMIT 1")
    quote_id = cur.fetchone()["id"]

    cur.execute("""
        UPDATE rituals SET
            state='revealed',
            selected_card_ids=?,
            phases=?,
            ending_id=?,
            personality_id=?,
            attributes=?,
            quote_id=?
        WHERE id=?
    """, (
        json.dumps(selected_card_ids),
        json.dumps(phases),
        ending_id,
        personality_id,
        json.dumps(attributes),
        quote_id,
        ritual_id,
    ))
    conn.commit()
    conn.close()

    return {
        "ritualId": ritual_id,
        "state": "revealed",
        "phases": phases,
        "availableChoices": ["accept", "change"],
        "decisionPrompt": RITUAL_PROFILE["decisionPrompt"],
    }


def submit_choice(ritual_id: str, fate_choice: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    ritual = _get_ritual(conn, ritual_id)
    if ritual is None:
        conn.close()
        return None

    if ritual["state"] == "finalized":
        conn.close()
        return {"error": "RITUAL_ALREADY_FINALIZED", "message": "会话已完成，不可再次改命"}

    if ritual["state"] != "revealed":
        conn.close()
        return {"error": "RITUAL_STATE_INVALID", "message": f"当前状态 {ritual['state']} 不允许提交命运选择"}

    if fate_choice not in ("accept", "change"):
        conn.close()
        return {"error": "VALIDATION_ERROR", "message": "fateChoice must be 'accept' or 'change'"}

    cur = conn.cursor()

    # If "change": re-randomize the future phase card
    if fate_choice == "change":
        phases = json.loads(ritual["phases"] or "[]")
        card_pool_ids = json.loads(ritual["card_pool"] or "[]")
        selected_ids = json.loads(ritual["selected_card_ids"] or "[]")
        # Pick a new card for future (index 2) from pool, not in selected
        available = [c for c in card_pool_ids if c not in selected_ids[:2]]
        if available:
            new_future_id = random.choice(available)
            selected_ids[2] = new_future_id
            # Update future phase card
            cur.execute("SELECT * FROM cards WHERE id=?", (new_future_id,))
            new_card = dict(cur.fetchone())
            if len(phases) >= 3:
                future_idx = next((idx for idx, item in enumerate(phases) if item.get("phase") == "future"), None)
                update_idx = future_idx if future_idx is not None else 2
                phases[update_idx]["card"] = {
                    "id": new_card["id"],
                    "title": new_card["title"],
                    "subtitle": new_card["subtitle"],
                    "description": new_card["description"],
                    "type": new_card["type"],
                    "phase": new_card["phase"],
                    "rarity": new_card["rarity"],
                    "tags": json.loads(new_card["tags"]) if new_card.get("tags") else [],
                }
                phases[update_idx].update(_phase_story("future", new_card, fate_choice))

            cur.execute("""
                UPDATE rituals SET
                    selected_card_ids=?,
                    phases=?,
                    fate_choice=?,
                    state='finalized'
                WHERE id=?
            """, (json.dumps(selected_ids), json.dumps(phases), fate_choice, ritual_id))
        else:
            cur.execute("UPDATE rituals SET fate_choice=?, state='finalized' WHERE id=?",
                        (fate_choice, ritual_id))
    else:
        cur.execute("UPDATE rituals SET fate_choice=?, state='finalized' WHERE id=?",
                    (fate_choice, ritual_id))

    conn.commit()
    conn.close()

    return {
        "ritualId": ritual_id,
        "state": "finalized",
        "fateChoice": fate_choice,
        "reportReady": True,
    }


def get_report(ritual_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    ritual = _get_ritual(conn, ritual_id)
    if ritual is None:
        conn.close()
        return None

    if ritual["state"] != "finalized":
        conn.close()
        return {"error": "RITUAL_STATE_INVALID", "message": f"当前状态 {ritual['state']} 报告尚未生成"}

    cur = conn.cursor()

    # Dice roll
    dice_roll = {
        "face": ritual["dice_face"],
        "label": ritual["dice_label"],
        "rotation": ritual["dice_rotation"],
    }

    # Phases
    phases = json.loads(ritual["phases"] or "[]")

    # Ending
    cur.execute("SELECT * FROM endings WHERE id=?", (ritual["ending_id"],))
    ending_row = dict(cur.fetchone())
    ending = {
        "id": ending_row["id"],
        "title": ending_row["title"],
        "summary": ending_row["summary"],
        "description": ending_row["description"],
        "mood": ending_row["mood"],
        "themeColor": ending_row["theme_color"],
    }

    # Personality
    cur.execute("SELECT * FROM personalities WHERE id=?", (ritual["personality_id"],))
    p_row = dict(cur.fetchone())
    personality = {
        "id": p_row["id"],
        "label": p_row["label"],
        "description": p_row["description"],
    }

    # Attributes
    attributes = json.loads(ritual["attributes"] or "[]")

    # Quote
    cur.execute("SELECT * FROM quotes WHERE id=?", (ritual["quote_id"],))
    q_row = dict(cur.fetchone())
    quote = {
        "text": q_row["text"],
        "highlights": json.loads(q_row["highlights"]),
    }

    # System terms (static, from mockData)
    system_terms = {"karmaPoints": "+18.6%", "dimensionRank": "进攻偏稳"}

    # Ensure history record exists
    history_id = ritual.get("history_id")
    if not history_id:
        history_id = _gen_id("history")
        selected_cards = json.loads(ritual["selected_card_ids"] or "[]")
        cur.execute("""
            INSERT OR IGNORE INTO history
            (id, ritual_id, ending_title, personality_label, cover_cards, report_snapshot, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            history_id,
            ritual_id,
            ending["title"],
            personality["label"],
            json.dumps(selected_cards),
            "",
            ritual["created_at"],
        ))
        cur.execute("UPDATE rituals SET history_id=? WHERE id=?", (history_id, ritual_id))
        conn.commit()

    share_card = {
        "title": "今日财运裁决",
        "subtitle": personality["label"],
        "imageUrl": f"/assets/share/{ritual_id}.png",
    }

    hero = {
        **RITUAL_PROFILE["reportHero"],
        "summary": ending["summary"],
    }

    phases_with_story = []
    for item in phases:
        phase_key = item["phase"]
        card = item["card"]
        phases_with_story.append({
            **item,
            **_phase_story(phase_key, card, ritual["fate_choice"]),
        })

    conn.close()

    return {
        "ritualId": ritual_id,
        "fateChoice": ritual["fate_choice"],
        "recommendedFund": _get_recommended_fund(
            phases=phases,
            attributes=attributes,
            fate_choice=ritual["fate_choice"],
            seed=ritual_id,
        ),
        "diceRoll": dice_roll,
        "phases": phases_with_story,
        "ending": ending,
        "personality": personality,
        "attributes": attributes,
        "quote": quote,
        "systemTerms": system_terms,
        "hero": hero,
        "decisionPrompt": RITUAL_PROFILE["decisionPrompt"],
        "shareCard": share_card,
        "historyId": history_id,
    }
