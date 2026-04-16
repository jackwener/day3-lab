"""
Pydantic 数据模型定义
"""
from typing import Optional, List, Any
from pydantic import BaseModel, Field
from datetime import datetime


# ==================== 核心实体模型 ====================

class WeekNode(BaseModel):
    """周节点模型"""
    weekNumber: int = Field(..., description="周编号", ge=1)
    startDate: str = Field(..., description="开始日期 (YYYY-MM-DD)")
    endDate: str = Field(..., description="结束日期 (YYYY-MM-DD)")
    situationScore: int = Field(..., description="局势分值 (0-100)", ge=0, le=100)
    summary: str = Field(..., description="周总结")
    createdAt: str = Field(..., description="创建时间 (ISO8601)")
    updatedAt: str = Field(..., description="更新时间 (ISO8601)")


class ThematicFund(BaseModel):
    """主题基金模型"""
    theme: str = Field(..., description="主题名称")
    fundName: str = Field(..., description="基金名称")
    fundCode: Optional[str] = Field(None, description="基金代码")
    returnRate: float = Field(..., description="收益率 (%)")
    weekNumber: int = Field(..., description="所属周编号", ge=1)


class SmallScaleFund(BaseModel):
    """小规模基金模型"""
    fundName: str = Field(..., description="基金名称")
    fundCode: Optional[str] = Field(None, description="基金代码")
    company: str = Field(..., description="基金公司")
    scale: float = Field(..., description="基金规模 (亿)", lt=5)
    returnRate: float = Field(..., description="收益率 (%)")
    weekNumber: int = Field(..., description="所属周编号", ge=1)


class SituationData(BaseModel):
    """局势数据模型"""
    score: int = Field(..., description="局势分值 (0-100)", ge=0, le=100)
    source: str = Field(..., description="数据来源")
    updatedAt: str = Field(..., description="更新时间 (ISO8601)")


class FundNav(BaseModel):
    """基金净值模型"""
    fundCode: str = Field(..., description="基金代码")
    navDate: str = Field(..., description="净值日期 (YYYY-MM-DD)")
    accumulatedNav: float = Field(..., description="累计净值")
    dailyGrowth: Optional[float] = Field(None, description="日增长率 (%)")


# ==================== 响应模型 ====================

class ErrorDetail(BaseModel):
    """错误详情"""
    code: str = Field(..., description="错误码")
    message: str = Field(..., description="错误信息")
    details: Optional[dict] = Field(None, description="额外详情")


class SuccessResponse(BaseModel):
    """统一成功响应模型"""
    traceId: str = Field(..., description="请求追踪ID")
    data: Any = Field(..., description="响应数据")
    timestamp: str = Field(..., description="响应时间 (ISO8601)")


class ErrorResponse(BaseModel):
    """统一错误响应模型"""
    traceId: str = Field(..., description="请求追踪ID")
    error: ErrorDetail = Field(..., description="错误详情")
    timestamp: str = Field(..., description="响应时间 (ISO8601)")


# ==================== 业务响应数据模型 ====================

class TimelineListResponse(BaseModel):
    """时间线列表响应"""
    weeks: List[WeekNode]


class TimelineDetailResponse(BaseModel):
    """时间线详情响应"""
    weekNumber: int
    startDate: str
    endDate: str
    situationScore: int
    summary: str
    thematicFunds: List[ThematicFund]
    smallScaleFunds: List[SmallScaleFund]


class ThematicFundsResponse(BaseModel):
    """主题基金列表响应"""
    weekNumber: int
    funds: List[dict]  # 简化版，只包含 theme, fundName, returnRate


class SmallScaleFundsResponse(BaseModel):
    """小规模基金列表响应"""
    weekNumber: int
    funds: List[dict]  # 简化版，只包含 fundName, company, scale, returnRate


class NavDataItem(BaseModel):
    """净值数据项"""
    date: str
    accumulatedNav: float
    dailyGrowth: Optional[float]


class FundNavResponse(BaseModel):
    """基金净值响应"""
    fundCode: str
    fundName: str
    period: str
    navData: List[NavDataItem]


class SituationScoreResponse(BaseModel):
    """局势分值响应"""
    score: int
    source: str
    updatedAt: str
