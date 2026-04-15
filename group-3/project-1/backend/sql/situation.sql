-- 局势周数据表
CREATE TABLE IF NOT EXISTS situation_week (
    week_number    INT           NOT NULL COMMENT '周编号（从 1 开始）',
    start_date     DATE          DEFAULT NULL COMMENT '周起始日期',
    end_date       DATE          DEFAULT NULL COMMENT '周结束日期',
    situation_score INT          DEFAULT NULL COMMENT '局势分值',
    summary        VARCHAR(500)  DEFAULT NULL COMMENT '周总结',
    created_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at     TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (week_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='局势周数据表';

-- 主题基金表
CREATE TABLE IF NOT EXISTS thematic_fund (
    id           INT            NOT NULL AUTO_INCREMENT,
    week_number  INT            NOT NULL COMMENT '所属周编号',
    theme        VARCHAR(50)    NOT NULL COMMENT '主题（如原油、黄金、煤炭）',
    fund_name    VARCHAR(100)   NOT NULL COMMENT '基金名称',
    return_rate  DECIMAL(10,2)  DEFAULT NULL COMMENT '收益率',
    created_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    KEY idx_week (week_number),
    CONSTRAINT fk_thematic_week FOREIGN KEY (week_number) REFERENCES situation_week(week_number) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='主题基金表';

-- 小规模基金表
CREATE TABLE IF NOT EXISTS small_scale_fund (
    id           INT            NOT NULL AUTO_INCREMENT,
    week_number  INT            NOT NULL COMMENT '所属周编号',
    fund_name    VARCHAR(100)   NOT NULL COMMENT '基金名称',
    company      VARCHAR(50)    DEFAULT NULL COMMENT '基金公司',
    scale        DECIMAL(10,2)  DEFAULT NULL COMMENT '基金规模（亿）',
    return_rate  DECIMAL(10,2)  DEFAULT NULL COMMENT '收益率',
    created_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at   TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (id),
    KEY idx_week (week_number),
    CONSTRAINT fk_small_scale_week FOREIGN KEY (week_number) REFERENCES situation_week(week_number) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='小规模基金表';
