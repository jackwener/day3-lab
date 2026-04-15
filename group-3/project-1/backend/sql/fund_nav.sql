-- 基金净值表（基于 fund_open_fund_info_em 接口 - 累计净值走势）
CREATE TABLE IF NOT EXISTS fund_nav (
    fund_code    VARCHAR(10)    NOT NULL COMMENT '基金代码',
    nav_date     VARCHAR(8)     NOT NULL COMMENT '净值日期(yyyyMMdd)',
    accumulated_nav DECIMAL(10, 4) DEFAULT NULL COMMENT '累计净值',
    daily_growth    DECIMAL(10, 4) DEFAULT NULL COMMENT '日增长率(%)',
    created_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (fund_code, nav_date),
    INDEX idx_nav_date (nav_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='基金净值表';
