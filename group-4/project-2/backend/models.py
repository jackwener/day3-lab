from typing import Any, List, Optional
from pydantic import BaseModel


# ─── 通用响应包装 ──────────────────────────────────────────────
class ApiResponse(BaseModel):
    code: str = "OK"
    message: str = "success"
    data: Any = None


def ok(data: Any = None, message: str = "success") -> dict:
    return {"code": "OK", "message": message, "data": data}


def err(code: str, message: str) -> dict:
    return {"code": code, "message": message, "data": None}


# ─── 请求体 ───────────────────────────────────────────────────
class InitRitualRequest(BaseModel):
    source: Optional[str] = "web"
    enableDice: Optional[bool] = True


class RevealRequest(BaseModel):
    selectedCardIds: List[str]


class ChoiceRequest(BaseModel):
    fateChoice: str  # "accept" | "change"


# ─── 数据结构 ─────────────────────────────────────────────────
class DiceRoll(BaseModel):
    face: int
    label: str
    rotation: str


class CardSummary(BaseModel):
    id: str
    title: str
    subtitle: str
    type: str
    phase: str
    rarity: str
    coverUrl: Optional[str] = None
    tags: Optional[List[str]] = None


class CardDetail(BaseModel):
    id: str
    title: str
    subtitle: str
    description: Optional[str] = None
    type: str
    phase: str
    rarity: str
    coverUrl: Optional[str] = None
    illustrationUrl: Optional[str] = None
    tags: Optional[List[str]] = None
    unlockStatus: str = "unlocked"
    timesDrawn: int = 0
    lastDrawnAt: Optional[str] = None


class RevealedPhase(BaseModel):
    phase: str
    label: str
    labelEn: str
    subLabel: str
    rarity: str
    card: CardSummary


class Ending(BaseModel):
    id: str
    title: str
    summary: str
    description: str
    mood: str
    themeColor: str


class Personality(BaseModel):
    id: str
    label: str
    description: str


class Attribute(BaseModel):
    key: str
    label: str
    icon: str
    value: int
    color: str
    unit: str


class QuoteHighlight(BaseModel):
    word: str
    color: str


class Quote(BaseModel):
    text: str
    highlights: List[QuoteHighlight]


class SystemTerms(BaseModel):
    karmaPoints: str
    dimensionRank: str


class ShareCard(BaseModel):
    title: str
    subtitle: str
    imageUrl: str


class ReportPayload(BaseModel):
    ritualId: str
    fateChoice: str
    diceRoll: DiceRoll
    phases: List[RevealedPhase]
    ending: Ending
    personality: Personality
    attributes: List[Attribute]
    quote: Quote
    systemTerms: SystemTerms
    shareCard: ShareCard
    historyId: str


class Pagination(BaseModel):
    page: int
    pageSize: int
    total: int


class HistorySummary(BaseModel):
    historyId: str
    ritualId: str
    createdAt: str
    endingTitle: Optional[str] = None
    personalityLabel: Optional[str] = None
    coverCards: List[str] = []
