-- 交易日期表（基于 data/trade_date.csv）
CREATE TABLE IF NOT EXISTS trade_date (
    nature_date       VARCHAR(8) NOT NULL COMMENT '自然日(yyyyMMdd)',
    trade_date        VARCHAR(8) NOT NULL COMMENT '对应交易日(yyyyMMdd)',
    is_trading_day    TINYINT    NOT NULL DEFAULT 0 COMMENT '是否交易日(1=是,0=否)',
    trade_date_before VARCHAR(8) NOT NULL COMMENT '前一交易日(yyyyMMdd)',
    PRIMARY KEY (nature_date),
    INDEX idx_trade_date (trade_date),
    INDEX idx_is_trading_day (is_trading_day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='交易日期表';
