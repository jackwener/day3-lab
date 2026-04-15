/**
 * 舆情监控与AI拉取配置路由模块
 * 端点：
 *   GET  /stock/:code/sentiment   — 舆情查询（带24h缓存）
 *   GET  /reports/fetch-config     — AI拉取配置查询
 *   POST /reports/fetch-config     — 更新/新增AI拉取配置
 */
const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// ── 文件路径 ──
const SENTIMENT_FILE = path.join(__dirname, '..', 'data', 'sentiment_cache.json');
const FETCH_CONFIGS_FILE = path.join(__dirname, '..', 'data', 'fetch_configs.json');

// ── 工具函数 ──
function readJSON(file) { return JSON.parse(fs.readFileSync(file, 'utf-8')); }
function writeJSON(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf-8'); }
function genTraceId() { return 'trace_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function genUUID() { return 'cfg_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10); }

function ok(res, data, status = 200) {
  return res.status(status).json({ traceId: genTraceId(), ...data });
}
function err(res, code, message, status = 400, details = {}) {
  return res.status(status).json({ error: { code, message, details, traceId: genTraceId() } });
}

// ── DEMO 股票信息 ──
const DEMO_STOCKS = {
  '600519': { name: '贵州茅台', code: '600519' },
  '000858': { name: '五粮液', code: '000858' },
  '601318': { name: '中国平安', code: '601318' },
  '600036': { name: '招商银行', code: '600036' },
  '000001': { name: '平安银行', code: '000001' },
  '600276': { name: '恒瑞医药', code: '600276' },
};

// ── 舆情 Demo 数据生成 ──
function generateSentimentData(code) {
  const stock = DEMO_STOCKS[code];
  const now = new Date().toISOString();

  if (!stock) {
    return { stock_code: code, stock_name: '未知', sentiments: [], updated_at: now, is_expired: false };
  }

  // 600519 贵州茅台：专属舆情数据
  if (code === '600519') {
    return {
      stock_code: '600519',
      stock_name: '贵州茅台',
      sentiments: [
        {
          id: 'sent_1',
          title: '贵州茅台一季度营收超预期，净利润同比增长15%',
          source: '财联社',
          summary: '贵州茅台2026年一季度实现营业收入420亿元，同比增长18%，净利润210亿元，同比增长15%，超出市场预期。',
          published_at: '2026-04-14T10:30:00Z',
          sentiment: 'positive',
        },
        {
          id: 'sent_2',
          title: '茅台数字化转型加速，i茅台平台用户突破5000万',
          source: '证券时报',
          summary: '贵州茅台数字化营销平台i茅台注册用户突破5000万，线上渠道占比持续提升，推动渠道结构优化。',
          published_at: '2026-04-13T14:20:00Z',
          sentiment: 'positive',
        },
        {
          id: 'sent_3',
          title: '白酒行业库存压力仍存，终端动销分化明显',
          source: '中国证券报',
          summary: '虽然头部品牌表现较好，但白酒行业整体库存压力依然存在，二三线品牌面临较大去库存压力。',
          published_at: '2026-04-12T09:15:00Z',
          sentiment: 'neutral',
        },
        {
          id: 'sent_4',
          title: '外资持续减持A股白酒龙头，北向资金净流出显著',
          source: '第一财经',
          summary: '近一个月北向资金持续减持白酒板块，贵州茅台被净卖出约12亿元，市场对估值水平存在分歧。',
          published_at: '2026-04-11T16:45:00Z',
          sentiment: 'negative',
        },
      ],
      updated_at: now,
      is_expired: false,
    };
  }

  // 600036 招商银行
  if (code === '600036') {
    return {
      stock_code: '600036',
      stock_name: '招商银行',
      sentiments: [
        { id: 'sent_zs_1', title: '招商银行一季度净利润同比增长8%，资产质量持续优化', source: '财联社', summary: '招商银行2026年一季度净利润375亿元，同比增长8%，不良贷款率降至0.89%，资产质量稳中向好。', published_at: '2026-04-14T09:00:00Z', sentiment: 'positive' },
        { id: 'sent_zs_2', title: '招行零售AUM突破14万亿，财富管理龙头地位稳固', source: '证券时报', summary: '招商银行零售客户资产管理规模突破14万亿元，私人银行客户数量同比增长12%。', published_at: '2026-04-13T11:30:00Z', sentiment: 'positive' },
        { id: 'sent_zs_3', title: '银行板块整体承压，息差收窄趋势延续', source: '中国证券报', summary: '商业银行净息差持续收窄，行业平均净息差降至1.55%，对银行盈利能力构成挑战。', published_at: '2026-04-12T08:45:00Z', sentiment: 'neutral' },
        { id: 'sent_zs_4', title: '市场担忧房地产风险敞口，银行股估值受限', source: '第一财经', summary: '部分投资者对银行业房地产相关资产质量仍存担忧，制约板块估值修复。', published_at: '2026-04-11T15:20:00Z', sentiment: 'negative' },
      ],
      updated_at: now,
      is_expired: false,
    };
  }

  // 000858 五粮液
  if (code === '000858') {
    return {
      stock_code: '000858',
      stock_name: '五粮液',
      sentiments: [
        { id: 'sent_wly_1', title: '五粮液一季度营收增长12%，高端白酒需求回暖', source: '财联社', summary: '五粮液2026年一季度实现营收245亿元，同比增长12%，高端产品动销良好。', published_at: '2026-04-14T10:00:00Z', sentiment: 'positive' },
        { id: 'sent_wly_2', title: '五粮液推进渠道数字化改革，经销商体系优化', source: '证券时报', summary: '五粮液持续推进渠道改革，数字化管理覆盖率提升至85%，渠道效率明显改善。', published_at: '2026-04-13T13:00:00Z', sentiment: 'positive' },
        { id: 'sent_wly_3', title: '白酒行业竞争加剧，次高端价格带承压明显', source: '中国证券报', summary: '白酒行业竞争格局加剧，次高端价格带产品面临较大价格压力和库存挑战。', published_at: '2026-04-12T10:30:00Z', sentiment: 'neutral' },
      ],
      updated_at: now,
      is_expired: false,
    };
  }

  // 601318 中国平安
  if (code === '601318') {
    return {
      stock_code: '601318',
      stock_name: '中国平安',
      sentiments: [
        { id: 'sent_pa_1', title: '中国平安一季度新业务价值增长18%，寿险改革成效显现', source: '财联社', summary: '中国平安2026年一季度寿险新业务价值同比增长18%，代理人渠道产能大幅提升。', published_at: '2026-04-14T09:30:00Z', sentiment: 'positive' },
        { id: 'sent_pa_2', title: '平安科技投入持续加大，AI赋能保险主业', source: '证券时报', summary: '中国平安科技专利数超过4万项，AI客服覆盖率达90%，科技赋能效果显著。', published_at: '2026-04-13T14:00:00Z', sentiment: 'positive' },
        { id: 'sent_pa_3', title: '保险行业利率下行压力持续，投资端面临挑战', source: '第一财经', summary: '长期利率下行趋势下，保险公司投资端收益率承压，利差损风险需持续关注。', published_at: '2026-04-12T11:00:00Z', sentiment: 'negative' },
      ],
      updated_at: now,
      is_expired: false,
    };
  }

  // 000001 平安银行
  if (code === '000001') {
    return {
      stock_code: '000001',
      stock_name: '平安银行',
      sentiments: [
        { id: 'sent_pab_1', title: '平安银行零售转型深化，消费金融业务增长强劲', source: '财联社', summary: '平安银行零售贷款余额突破2万亿元，信用卡交易额同比增长15%，零售转型成效显著。', published_at: '2026-04-14T08:30:00Z', sentiment: 'positive' },
        { id: 'sent_pab_2', title: '平安银行对公业务结构优化，绿色信贷占比提升', source: '证券时报', summary: '平安银行绿色信贷余额同比增长35%，对公业务向绿色金融和科技金融转型。', published_at: '2026-04-13T10:00:00Z', sentiment: 'positive' },
        { id: 'sent_pab_3', title: '中小银行竞争加剧，零售金融获客成本上升', source: '中国证券报', summary: '零售金融市场竞争日趋激烈，互联网平台分流效应明显，银行获客成本持续走高。', published_at: '2026-04-12T09:00:00Z', sentiment: 'neutral' },
      ],
      updated_at: now,
      is_expired: false,
    };
  }

  // 600276 恒瑞医药
  if (code === '600276') {
    return {
      stock_code: '600276',
      stock_name: '恒瑞医药',
      sentiments: [
        { id: 'sent_hr_1', title: '恒瑞医药创新药收入占比首超60%，转型里程碑', source: '财联社', summary: '恒瑞医药2026年一季度创新药收入占比达62%，多个重磅品种放量，创新转型成效显著。', published_at: '2026-04-14T10:15:00Z', sentiment: 'positive' },
        { id: 'sent_hr_2', title: '恒瑞两款新药获FDA突破性疗法认定，国际化加速', source: '证券时报', summary: '恒瑞医药两款创新药获得美国FDA突破性疗法认定，海外临床进展顺利。', published_at: '2026-04-13T15:00:00Z', sentiment: 'positive' },
        { id: 'sent_hr_3', title: '医保谈判常态化，创新药定价压力仍存', source: '第一财经', summary: '国家医保谈判持续推进，创新药纳入医保后价格降幅较大，对企业利润率有一定影响。', published_at: '2026-04-12T08:00:00Z', sentiment: 'neutral' },
        { id: 'sent_hr_4', title: 'CXO行业景气度下滑，研发外包需求放缓', source: '中国证券报', summary: '全球CXO行业景气度有所下滑，部分医药企业调整研发投入节奏。', published_at: '2026-04-11T14:00:00Z', sentiment: 'negative' },
      ],
      updated_at: now,
      is_expired: false,
    };
  }

  // 兜底（不会到达，但安全起见）
  return { stock_code: code, stock_name: stock.name, sentiments: [], updated_at: now, is_expired: false };
}

// ── 过期判断常量 ──
const EXPIRE_MS = 24 * 60 * 60 * 1000; // 24小时

// ════════════════════════════════════════════════
// 1. GET /stock/:code/sentiment — 舆情查询
// ════════════════════════════════════════════════
router.get('/stock/:code/sentiment', (req, res) => {
  const code = req.params.code;
  if (!code || !code.trim()) {
    return err(res, 'INVALID_QUERY', '股票代码不能为空');
  }

  // 读取缓存
  let cache = {};
  try { cache = readJSON(SENTIMENT_FILE); } catch (e) { cache = {}; }

  const cached = cache[code];
  const now = Date.now();

  // 缓存有效：24小时内
  if (cached && cached.updated_at && (now - new Date(cached.updated_at).getTime()) < EXPIRE_MS) {
    return ok(res, { ...cached, is_expired: false });
  }

  // 缓存无效或不存在，生成 Demo 数据
  const sentimentData = generateSentimentData(code);

  // 写入缓存（未知股票也缓存）
  cache[code] = sentimentData;
  try { writeJSON(SENTIMENT_FILE, cache); } catch (e) { /* ignore write error */ }

  return ok(res, sentimentData);
});

// ════════════════════════════════════════════════
// 2. GET /reports/fetch-config — AI拉取配置查询
// ════════════════════════════════════════════════
router.get('/reports/fetch-config', (req, res) => {
  let configs = [];
  try { configs = readJSON(FETCH_CONFIGS_FILE); } catch (e) { configs = []; }
  return ok(res, { configs });
});

// ════════════════════════════════════════════════
// 3. POST /reports/fetch-config — 更新/新增AI拉取配置
// ════════════════════════════════════════════════
router.post('/reports/fetch-config', (req, res) => {
  const { config_id, name, url_pattern, schedule, enabled } = req.body || {};

  if (!name) {
    return err(res, 'INVALID_QUERY', '请提供配置名称');
  }

  let configs = [];
  try { configs = readJSON(FETCH_CONFIGS_FILE); } catch (e) { configs = []; }

  if (config_id) {
    // 更新已有配置
    const idx = configs.findIndex(c => c.config_id === config_id);
    if (idx === -1) {
      return err(res, 'CONFIG_NOT_FOUND', `未找到配置 ${config_id}`, 404, { config_id });
    }
    configs[idx].name = name;
    if (url_pattern !== undefined) configs[idx].url_pattern = url_pattern;
    if (schedule !== undefined) configs[idx].schedule = schedule;
    if (enabled !== undefined) configs[idx].enabled = enabled;
    configs[idx].updated_at = new Date().toISOString();

    try { writeJSON(FETCH_CONFIGS_FILE, configs); } catch (e) { /* ignore */ }
    return ok(res, { config: configs[idx] });
  }

  // 新增配置
  const newConfig = {
    config_id: genUUID(),
    name,
    url_pattern: url_pattern || '',
    schedule: schedule || 'daily',
    enabled: enabled !== undefined ? enabled : true,
    last_fetch_at: null,
    created_at: new Date().toISOString(),
  };
  configs.push(newConfig);

  try { writeJSON(FETCH_CONFIGS_FILE, configs); } catch (e) { /* ignore */ }
  return ok(res, { config: newConfig }, 201);
});

module.exports = router;
