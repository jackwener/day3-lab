-- 基金业绩指标表（基于 fund_nav 累计净值计算）
-- 每只基金每个交易日计算 6 个时间段（1m/3m/6m/1y/2y/3y）的业绩指标
CREATE TABLE IF NOT EXISTS fund_performance (
    fund_code              VARCHAR(10)     NOT NULL COMMENT '基金代码',
    nav_date               VARCHAR(8)      NOT NULL COMMENT '净值日期(yyyyMMdd)',

    return_1w              DECIMAL(12, 6)  DEFAULT NULL COMMENT '近一周涨跌幅',

    -- 近1月指标
    return_1m              DECIMAL(12, 6)  DEFAULT NULL COMMENT '近1月收益率',
    annualized_return_1m   DECIMAL(12, 6)  DEFAULT NULL COMMENT '近1月年化收益率',
    volatility_1m          DECIMAL(12, 6)  DEFAULT NULL COMMENT '近1月年化波动率',
    sharpe_ratio_1m        DECIMAL(12, 6)  DEFAULT NULL COMMENT '近1月夏普比率',
    info_ratio_1m          DECIMAL(12, 6)  DEFAULT NULL COMMENT '近1月信息比率',
    max_drawdown_1m        DECIMAL(12, 6)  DEFAULT NULL COMMENT '近1月最大回撤',

    -- 近3月指标
    return_3m              DECIMAL(12, 6)  DEFAULT NULL COMMENT '近3月收益率',
    annualized_return_3m   DECIMAL(12, 6)  DEFAULT NULL COMMENT '近3月年化收益率',
    volatility_3m          DECIMAL(12, 6)  DEFAULT NULL COMMENT '近3月年化波动率',
    sharpe_ratio_3m        DECIMAL(12, 6)  DEFAULT NULL COMMENT '近3月夏普比率',
    info_ratio_3m          DECIMAL(12, 6)  DEFAULT NULL COMMENT '近3月信息比率',
    max_drawdown_3m        DECIMAL(12, 6)  DEFAULT NULL COMMENT '近3月最大回撤',

    -- 近6月指标
    return_6m              DECIMAL(12, 6)  DEFAULT NULL COMMENT '近6月收益率',
    annualized_return_6m   DECIMAL(12, 6)  DEFAULT NULL COMMENT '近6月年化收益率',
    volatility_6m          DECIMAL(12, 6)  DEFAULT NULL COMMENT '近6月年化波动率',
    sharpe_ratio_6m        DECIMAL(12, 6)  DEFAULT NULL COMMENT '近6月夏普比率',
    info_ratio_6m          DECIMAL(12, 6)  DEFAULT NULL COMMENT '近6月信息比率',
    max_drawdown_6m        DECIMAL(12, 6)  DEFAULT NULL COMMENT '近6月最大回撤',
    -- 近1年指标
    return_1y              DECIMAL(12, 6)  DEFAULT NULL COMMENT '近1年收益率',
    annualized_return_1y   DECIMAL(12, 6)  DEFAULT NULL COMMENT '近1年年化收益率',
    volatility_1y          DECIMAL(12, 6)  DEFAULT NULL COMMENT '近1年年化波动率',
    sharpe_ratio_1y        DECIMAL(12, 6)  DEFAULT NULL COMMENT '近1年夏普比率',
    info_ratio_1y          DECIMAL(12, 6)  DEFAULT NULL COMMENT '近1年信息比率',
    max_drawdown_1y        DECIMAL(12, 6)  DEFAULT NULL COMMENT '近1年最大回撤',
    -- 近2年指标
    return_2y              DECIMAL(12, 6)  DEFAULT NULL COMMENT '近2年收益率',
    annualized_return_2y   DECIMAL(12, 6)  DEFAULT NULL COMMENT '近2年年化收益率',
    volatility_2y          DECIMAL(12, 6)  DEFAULT NULL COMMENT '近2年年化波动率',
    sharpe_ratio_2y        DECIMAL(12, 6)  DEFAULT NULL COMMENT '近2年夏普比率',
    info_ratio_2y          DECIMAL(12, 6)  DEFAULT NULL COMMENT '近2年信息比率',
    max_drawdown_2y        DECIMAL(12, 6)  DEFAULT NULL COMMENT '近2年最大回撤',
    -- 近3年指标
    return_3y              DECIMAL(12, 6)  DEFAULT NULL COMMENT '近3年收益率',
    annualized_return_3y   DECIMAL(12, 6)  DEFAULT NULL COMMENT '近3年年化收益率',
    volatility_3y          DECIMAL(12, 6)  DEFAULT NULL COMMENT '近3年年化波动率',
    sharpe_ratio_3y        DECIMAL(12, 6)  DEFAULT NULL COMMENT '近3年夏普比率',
    info_ratio_3y          DECIMAL(12, 6)  DEFAULT NULL COMMENT '近3年信息比率',
    max_drawdown_3y        DECIMAL(12, 6)  DEFAULT NULL COMMENT '近3年最大回撤',
    created_at             TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at             TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (fund_code, nav_date),
    INDEX idx_perf_nav_date (nav_date),
    INDEX idx_perf_fund_code (fund_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='基金业绩指标表';
