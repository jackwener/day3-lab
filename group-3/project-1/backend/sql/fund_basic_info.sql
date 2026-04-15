-- 基金基本信息表（基于 fund_individual_basic_info_xq 接口）
CREATE TABLE IF NOT EXISTS fund_basic_info (
    fund_code        VARCHAR(10)   NOT NULL COMMENT '基金代码',
    fund_name        VARCHAR(100)  DEFAULT NULL COMMENT '基金名称',
    fund_full_name   VARCHAR(200)  DEFAULT NULL COMMENT '基金全称',
    establish_date   VARCHAR(8)    DEFAULT NULL COMMENT '成立时间(yyyyMMdd)',
    latest_scale     VARCHAR(50)   DEFAULT NULL COMMENT '最新规模',
    fund_company     VARCHAR(100)  DEFAULT NULL COMMENT '基金公司',
    fund_manager     VARCHAR(100)  DEFAULT NULL COMMENT '基金经理',
    custodian_bank   VARCHAR(100)  DEFAULT NULL COMMENT '托管银行',
    fund_type        VARCHAR(50)   DEFAULT NULL COMMENT '基金类型（一级分类）',
    fund_type_second VARCHAR(100)  DEFAULT NULL COMMENT '基金类型（二级分类）',
    fund_type_xq     VARCHAR(100)  DEFAULT NULL COMMENT '雪球基金类型（原始）',
    fund_type_ttjj   VARCHAR(100)  DEFAULT NULL COMMENT '天天基金类型（原始）',
    fund_theme       VARCHAR(50)   DEFAULT NULL COMMENT '基金主题',
    rating_agency    VARCHAR(50)   DEFAULT NULL COMMENT '评级机构',
    fund_rating      VARCHAR(50)   DEFAULT NULL COMMENT '基金评级',
    investment_strategy TEXT       DEFAULT NULL COMMENT '投资策略',
    investment_objective TEXT      DEFAULT NULL COMMENT '投资目标',
    performance_benchmark VARCHAR(500) DEFAULT NULL COMMENT '业绩比较基准',
    created_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at       TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    PRIMARY KEY (fund_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='基金基本信息表';
