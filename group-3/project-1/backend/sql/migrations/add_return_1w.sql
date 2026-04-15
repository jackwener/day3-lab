-- 为 fund_performance 表添加近一周涨跌幅字段
ALTER TABLE fund_performance ADD COLUMN return_1w DECIMAL(12, 6) DEFAULT NULL COMMENT '近一周涨跌幅' AFTER nav_date;
