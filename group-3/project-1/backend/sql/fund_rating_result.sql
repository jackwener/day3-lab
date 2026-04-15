-- 基金评级结果表（由模型训练生成）
CREATE TABLE IF NOT EXISTS fund_rating_result (
    fund_code                VARCHAR(10)     NOT NULL COMMENT '基金代码',
    rating_date              VARCHAR(10)     NOT NULL COMMENT '评级日期(yyyy-MM-dd)',
    rating                   CHAR(1)         NOT NULL COMMENT '评级(A/B/C/D/E)',
    rating_desc              VARCHAR(20)     DEFAULT NULL COMMENT '评级描述',
    predicted_excess_return  DECIMAL(12, 6)  DEFAULT NULL COMMENT '预测超额收益',
    created_at               TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at               TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (fund_code, rating_date),
    INDEX idx_rating_date (rating_date),
    INDEX idx_rating (rating)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='基金评级结果表';
