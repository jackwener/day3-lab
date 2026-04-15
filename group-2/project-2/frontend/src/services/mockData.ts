/**
 * Mock 数据 - 用于演示模式 (URL 带有 ?demo=1)
 * 基金智投助手(chat)不使用mock,仍然调用真实API
 */

// 行情指数 mock
export const mockIndices = [
  { code: '000001', name: '上证指数', value: 3250.50, change: 0.85, volume: '3852亿' },
  { code: '399001', name: '深证成指', value: 10876.32, change: 1.12, volume: '5123亿' },
  { code: '399006', name: '创业板指', value: 2198.45, change: -0.35, volume: '2567亿' },
  { code: '000016', name: '上证50', value: 2685.20, change: 0.52, volume: '1234亿' },
]

// 基金列表 mock
export const mockFunds = [
  { fund_code: '005827', fund_name: '易方达蓝筹精选混合', fund_type: '混合型', nav: 2.1254, day_change: 1.25, week_change: 2.34, month_change: 5.67, year_change: 15.32, scale: '450亿', risk_level: '中高' },
  { fund_code: '003095', fund_name: '中欧医疗健康混合', fund_type: '混合型', nav: 3.2156, day_change: -0.85, week_change: 1.12, month_change: 3.45, year_change: -5.67, scale: '380亿', risk_level: '中高' },
  { fund_code: '260108', fund_name: '景顺长城新兴成长混合', fund_type: '混合型', nav: 4.5678, day_change: 0.92, week_change: 2.15, month_change: 6.78, year_change: 22.45, scale: '320亿', risk_level: '高' },
  { fund_code: '161725', fund_name: '招商中证白酒指数', fund_type: '指数型', nav: 1.3421, day_change: 1.56, week_change: 3.21, month_change: 8.92, year_change: 18.76, scale: '280亿', risk_level: '高' },
  { fund_code: '011102', fund_name: '天弘中证光伏产业', fund_type: '指数型', nav: 0.9876, day_change: -1.23, week_change: -2.45, month_change: -4.56, year_change: -12.34, scale: '150亿', risk_level: '高' },
  { fund_code: '110011', fund_name: '易方达中小盘混合', fund_type: '混合型', nav: 5.6789, day_change: 0.78, week_change: 1.89, month_change: 4.32, year_change: 12.56, scale: '220亿', risk_level: '中高' },
  { fund_code: '000001', fund_name: '华夏成长混合', fund_type: '混合型', nav: 1.8765, day_change: 0.45, week_change: 1.23, month_change: 3.21, year_change: 8.76, scale: '180亿', risk_level: '中' },
  { fund_code: '519732', fund_name: '交银定期支付双息平衡混合', fund_type: '混合型', nav: 2.3456, day_change: 0.34, week_change: 0.89, month_change: 2.34, year_change: 6.78, scale: '120亿', risk_level: '中' },
]

// 自选列表 mock
export const mockWatchlist = [
  { fund_code: '005827', added_at: '2024-01-15T10:30:00' },
  { fund_code: '003095', added_at: '2024-02-20T14:20:00' },
  { fund_code: '161725', added_at: '2024-03-10T09:15:00' },
]

// 资讯文章 mock
export const mockArticles = [
  {
    title: '2024年二季度A股市场展望:结构性机会依然存在',
    summary: '随着一季报披露完毕,市场对企业盈利的担忧逐渐消散。我们认为二季度A股仍将呈现结构性行情,科技创新、消费升级等领域值得重点关注。',
    category: '市场展望',
    author: '南方基金研究部',
    source: '南方基金',
    published_at: '2024-04-10T08:00:00',
    views: 12500,
    likes: 234,
    cover_image: 'https://picsum.photos/seed/market1/800/400',
    tags: ['A股', '宏观', '投资策略'],
    original_url: 'https://example.com/article/1',
  },
  {
    title: '新能源产业链深度分析:光伏板块估值修复可期',
    summary: '经过前期调整,光伏板块估值已处于历史低位。随着海外需求回暖和国内政策支持,板块有望迎来估值修复行情。',
    category: '行业动态',
    author: '行业研究员',
    source: '券商中国',
    published_at: '2024-04-08T10:30:00',
    views: 8900,
    likes: 156,
    cover_image: 'https://picsum.photos/seed/energy1/800/400',
    tags: ['新能源', '光伏', '估值'],
    original_url: 'https://example.com/article/2',
  },
  {
    title: '量化投资新趋势:AI赋能的指数增强策略',
    summary: '人工智能技术在量化投资领域的应用日益深入,机器学习模型在选股、择时等方面展现出显著优势,为投资者带来新的阿尔法来源。',
    category: '投资策略',
    author: '量化投资部',
    source: '中国基金报',
    published_at: '2024-04-05T14:00:00',
    views: 15600,
    likes: 412,
    cover_image: 'https://picsum.photos/seed/quant1/800/400',
    tags: ['量化投资', 'AI', '指数增强'],
    original_url: 'https://example.com/article/3',
  },
  {
    title: 'ESG投资实践:可持续投资的机遇与挑战',
    summary: 'ESG理念正逐步成为中国资本市场的重要投资逻辑。本文探讨了ESG投资的实践路径,以及在碳中和背景下的投资机会。',
    category: '产品分析',
    author: '产品经理',
    source: '证券时报',
    published_at: '2024-04-03T09:00:00',
    views: 6700,
    likes: 98,
    cover_image: 'https://picsum.photos/seed/esg1/800/400',
    tags: ['ESG', '可持续投资', '碳中和'],
    original_url: '',
  },
  {
    title: '债券市场周报:利率债配置价值显现',
    summary: '在经济复苏放缓的背景下,利率债的配置价值逐步凸显。建议投资者关注中长期利率债的配置机会,同时警惕信用风险。',
    category: '市场展望',
    author: '固定收益部',
    source: '南方基金',
    published_at: '2024-04-01T16:00:00',
    views: 4500,
    likes: 67,
    cover_image: 'https://picsum.photos/seed/bond1/800/400',
    tags: ['债券', '利率', '配置'],
    original_url: 'https://example.com/article/5',
  },
]

export const mockHotTags = ['A股', '宏观', '量化投资', 'AI', 'ESG', '债券', '定投', '新能源', 'REITs', 'QDII', '金融科技', '资产配置', '投资策略', '可持续投资']

// 基金诊断 mock
export const mockDiagnosis = {
  fund_code: '005827',
  fund_name: '易方达蓝筹精选混合',
  fund_type: '混合型',
  manager: '张坤',
  company: '易方达基金',
  scale: '450亿',
  nav: 2.1254,
  nav_change: 1.25,
  rating: 4,
  rating_label: '优秀',
  scores: {
    returns: 85,
    risk_control: 78,
    stability: 82,
    timing: 75,
    stock_picking: 88,
  },
}

// 基金收益 mock
export const mockReturns = {
  returns: {
    month_1: 3.45,
    month_3: 8.92,
    month_6: 12.34,
    year_1: 15.32,
    year_3: 45.67,
    since_inception: 112.54,
  },
  holdings: [
    { stock_code: '600519', stock_name: '贵州茅台', industry: '白酒', weight: 9.8 },
    { stock_code: '000858', stock_name: '五粮液', industry: '白酒', weight: 7.5 },
    { stock_code: '000333', stock_name: '美的集团', industry: '家电', weight: 6.2 },
    { stock_code: '600036', stock_name: '招商银行', industry: '银行', weight: 5.8 },
    { stock_code: '000661', stock_name: '长春高新', industry: '医药', weight: 4.9 },
    { stock_code: '601888', stock_name: '中国中免', industry: '零售', weight: 4.5 },
    { stock_code: '300750', stock_name: '宁德时代', industry: '新能源', weight: 4.2 },
    { stock_code: '600276', stock_name: '恒瑞医药', industry: '医药', weight: 3.8 },
    { stock_code: '000568', stock_name: '泸州老窖', industry: '白酒', weight: 3.5 },
    { stock_code: '600809', stock_name: '山西汾酒', industry: '白酒', weight: 3.2 },
  ],
  advice: {
    conclusion: '该基金长期业绩优秀,基金经理张坤投资风格稳定,善于精选优质蓝筹股。基金规模较大,流动性管理良好。建议长期持有,适合风险承受能力较高的投资者。',
    suggestions: [
      '基金长期业绩优秀,建议持有期不少于1年',
      '关注基金经理变动情况,如更换经理需重新评估',
      '基金规模较大,可能影响灵活性,但流动性风险较低',
      '行业集中度较高,白酒板块波动可能影响基金表现',
      '适合定投,可平滑市场波动带来的风险',
    ],
  },
}

// 持仓股资讯 mock
export const mockHoldingsNews = [
  {
    id: 1,
    stock_code: '600519',
    stock_name: '贵州茅台',
    title: '贵州茅台发布2023年年报:净利润同比增长19.16%',
    sentiment: 'positive',
    source: '证券时报',
    published_at: '2024-04-10T08:30:00',
  },
  {
    id: 2,
    stock_code: '000858',
    stock_name: '五粮液',
    title: '五粮液一季度业绩预告:预计净利润同比增长12%',
    sentiment: 'positive',
    source: '中国基金报',
    published_at: '2024-04-09T10:00:00',
  },
  {
    id: 3,
    stock_code: '300750',
    stock_name: '宁德时代',
    title: '宁德时代海外订单持续放量,欧洲市场份额提升',
    sentiment: 'positive',
    source: '券商中国',
    published_at: '2024-04-08T14:20:00',
  },
  {
    id: 4,
    stock_code: '600036',
    stock_name: '招商银行',
    title: '招商银行资产质量稳定,不良贷款率保持在较低水平',
    sentiment: 'neutral',
    source: '证券日报',
    published_at: '2024-04-07T09:15:00',
  },
]
