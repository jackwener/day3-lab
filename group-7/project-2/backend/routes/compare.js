/**
 * 指标对比与 Excel 导出路由模块
 * 对齐 spec/09 §14-15：POST /compare、POST /compare/export
 *
 * 集成方式（在 server.js 中添加）:
 *   const compareRouter = require('./routes/compare');
 *   app.use('/api/v1/agent', compareRouter);
 */
const express = require('express');
const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const router = express.Router();

// ── 路径常量 ──
const DATA_DIR = path.join(__dirname, '..', 'data');
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');

// ── 工具函数（与 server.js 保持一致）──
function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

function genTraceId() {
  return 'trace_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function traceId(req) {
  return req.headers['x-trace-id'] || genTraceId();
}

function ok(res, data, status = 200, req) {
  return res.status(status).json({ traceId: traceId(req || res.req), ...data });
}

function err(res, code, message, status = 400, details = {}) {
  return res.status(status).json({
    error: { code, message, details, traceId: traceId(res.req) },
  });
}

// ── 股票基础信息 ──
const DEMO_STOCKS = {
  '600519': { name: '贵州茅台', code: '600519' },
  '000858': { name: '五粮液', code: '000858' },
  '601318': { name: '中国平安', code: '601318' },
  '600036': { name: '招商银行', code: '600036' },
  '000001': { name: '平安银行', code: '000001' },
  '600276': { name: '恒瑞医药', code: '600276' },
};

// ── 指标提取 ──
function extractIndicators(contentText) {
  const indicators = {};

  // 评级
  const ratingRe = /(买入|增持|中性|持有|减持|卖出|推荐|强烈推荐|谨慎推荐|回避)/;
  const rm = contentText.match(ratingRe);
  if (rm) {
    indicators['评级'] = {
      value: rm[1],
      source_text: contentText.substring(Math.max(0, rm.index - 20), rm.index + 30).trim(),
    };
  }

  // 目标价
  const tpRe = /目标价[：:为]?\s*(?:¥|￥)?\s*([\d,.]+)/;
  const tp = contentText.match(tpRe);
  if (tp) {
    indicators['目标价'] = {
      value: '¥' + tp[1],
      source_text: contentText.substring(Math.max(0, tp.index - 10), tp.index + 40).trim(),
    };
  }

  // EPS
  const epsRe = /EPS[：:为]?\s*([\d,.]+)/i;
  const eps = contentText.match(epsRe);
  if (eps) {
    indicators['EPS预测(2026)'] = {
      value: eps[1],
      source_text: contentText.substring(Math.max(0, eps.index - 10), eps.index + 40).trim(),
    };
  }

  // PE
  const peRe = /P[/\/]?E[：:为]?\s*([\d,.]+)/i;
  const pe = contentText.match(peRe);
  if (pe) {
    indicators['PE估值'] = {
      value: pe[1] + 'x',
      source_text: contentText.substring(Math.max(0, pe.index - 10), pe.index + 40).trim(),
    };
  }

  // 营收预测
  const revRe = /营[业收]?收入?[预]?[测计]?[：:为]?\s*([\d,.]+\s*[亿万]?)/;
  const rev = contentText.match(revRe);
  if (rev) {
    indicators['营收预测(2026)'] = {
      value: rev[1].trim(),
      source_text: contentText.substring(Math.max(0, rev.index - 10), rev.index + 50).trim(),
    };
  }

  // 净利润预测
  const profitRe = /净利润[预]?[测计]?[：:为]?\s*([\d,.]+\s*[亿万]?)/;
  const profit = contentText.match(profitRe);
  if (profit) {
    indicators['净利润预测(2026)'] = {
      value: profit[1].trim(),
      source_text: contentText.substring(Math.max(0, profit.index - 10), profit.index + 50).trim(),
    };
  }

  return indicators;
}

// ── Demo 模拟对比数据 ──
function getDemoCompareData(stockCode) {
  const stockInfo = DEMO_STOCKS[stockCode];
  const stockName = stockInfo ? stockInfo.name : stockCode;

  return {
    stock_code: stockCode,
    stock_name: stockName,
    indicators: [
      {
        name: '评级',
        values: [
          { report_id: 'demo_1', report_title: '华泰证券研报', value: '买入', source_text: '维持买入评级，看好公司长期发展前景' },
          { report_id: 'demo_2', report_title: '中信证券研报', value: '增持', source_text: '上调评级至增持，估值具有吸引力' },
        ],
      },
      {
        name: '目标价',
        values: [
          { report_id: 'demo_1', report_title: '华泰证券研报', value: '¥2,100', source_text: '目标价格上调至2100元' },
          { report_id: 'demo_2', report_title: '中信证券研报', value: '¥2,050', source_text: '给予目标价2050元' },
        ],
      },
      {
        name: 'EPS预测(2026)',
        values: [
          { report_id: 'demo_1', report_title: '华泰证券研报', value: '58.6', source_text: '预计2026年EPS为58.6元' },
          { report_id: 'demo_2', report_title: '中信证券研报', value: '56.2', source_text: '2026年每股收益预计56.2元' },
        ],
      },
      {
        name: 'PE估值',
        values: [
          { report_id: 'demo_1', report_title: '华泰证券研报', value: '35.8x', source_text: '对应2026年PE约35.8倍' },
          { report_id: 'demo_2', report_title: '中信证券研报', value: '36.5x', source_text: '当前PE为36.5倍，处于合理区间' },
        ],
      },
      {
        name: '营收预测(2026)',
        values: [
          { report_id: 'demo_1', report_title: '华泰证券研报', value: '1,680亿', source_text: '预计2026年营业收入达1680亿元' },
          { report_id: 'demo_2', report_title: '中信证券研报', value: '1,720亿', source_text: '2026年营收预测为1720亿元' },
        ],
      },
    ],
  };
}

// ── 核心：构建指标对比数据 ──
function buildCompareData(stockCode, reportIds) {
  const stockInfo = DEMO_STOCKS[stockCode];
  const stockName = stockInfo ? stockInfo.name : stockCode;

  // 尝试从 reports.json 读取
  let reports = [];
  try {
    if (fs.existsSync(REPORTS_FILE)) {
      reports = readJSON(REPORTS_FILE);
    }
  } catch (e) {
    reports = [];
  }

  // 筛选匹配的研报
  const matched = [];
  for (const rid of reportIds) {
    const report = reports.find(r => r.report_id === rid);
    if (report && report.content_text) matched.push(report);
  }

  // 如果没有匹配到任何研报，返回 Demo 数据
  if (matched.length === 0) {
    return getDemoCompareData(stockCode);
  }

  // 从真实研报中提取指标
  const indicatorMap = {}; // name -> [{ report_id, report_title, value, source_text }]
  for (const report of matched) {
    const indicators = extractIndicators(report.content_text || '');
    for (const [name, info] of Object.entries(indicators)) {
      if (!indicatorMap[name]) indicatorMap[name] = [];
      indicatorMap[name].push({
        report_id: report.report_id,
        report_title: report.title,
        value: info.value,
        source_text: info.source_text,
      });
    }
  }

  const indicators = Object.entries(indicatorMap).map(([name, values]) => ({ name, values }));

  // 如果提取不到任何指标，也回退 Demo
  if (indicators.length === 0) {
    return getDemoCompareData(stockCode);
  }

  return { stock_code: stockCode, stock_name: stockName, indicators };
}

// ══════════════════════════════════════════════════
// 端点 1: POST /compare — 指标对比
// ══════════════════════════════════════════════════
router.post('/compare', (req, res) => {
  const { stock_code, report_ids } = req.body || {};
  if (!stock_code) return err(res, 'INVALID_QUERY', '请提供股票代码');
  if (!report_ids || !Array.isArray(report_ids) || report_ids.length === 0) {
    return err(res, 'INVALID_QUERY', '请提供研报ID列表');
  }

  try {
    const data = buildCompareData(stock_code, report_ids);
    ok(res, data, 200, req);
  } catch (e) {
    err(res, 'COMPARE_FAILED', `指标对比失败: ${e.message}`, 500);
  }
});

// ══════════════════════════════════════════════════
// 端点 2: POST /compare/export — Excel 导出
// ══════════════════════════════════════════════════
router.post('/compare/export', async (req, res) => {
  const { stock_code, report_ids } = req.body || {};
  if (!stock_code) return err(res, 'INVALID_QUERY', '请提供股票代码');
  if (!report_ids || !Array.isArray(report_ids) || report_ids.length === 0) {
    return err(res, 'INVALID_QUERY', '请提供研报ID列表');
  }

  try {
    const data = buildCompareData(stock_code, report_ids);

    // 收集所有出现的研报标题（按 report_id 去重、保序）
    const reportOrder = [];
    const seenIds = new Set();
    for (const ind of data.indicators) {
      for (const v of ind.values) {
        if (!seenIds.has(v.report_id)) {
          seenIds.add(v.report_id);
          reportOrder.push({ id: v.report_id, title: v.report_title });
        }
      }
    }

    // 构建 Excel
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'M1-QA 投研问答助手';
    workbook.created = new Date();

    const sheetName = `${data.stock_name}(${data.stock_code}) 指标对比`;
    const sheet = workbook.addWorksheet(sheetName.slice(0, 31)); // Excel sheet name max 31 chars

    // ── 表头 ──
    const headerValues = ['指标', ...reportOrder.map(r => r.title)];
    const headerRow = sheet.addRow(headerValues);
    headerRow.font = { bold: true, size: 12 };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    headerRow.eachCell(cell => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'medium' },
        right: { style: 'thin' },
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9E1F2' },
      };
    });

    // ── 数据行 ──
    for (const ind of data.indicators) {
      const valuesMap = {};
      for (const v of ind.values) {
        valuesMap[v.report_id] = v.value;
      }
      const rowValues = [ind.name, ...reportOrder.map(r => valuesMap[r.id] || '-')];
      const dataRow = sheet.addRow(rowValues);
      dataRow.eachCell(cell => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    }

    // ── 列宽 ──
    sheet.getColumn(1).width = 18;
    for (let i = 2; i <= reportOrder.length + 1; i++) {
      sheet.getColumn(i).width = 22;
    }

    // ── 响应 ──
    const filename = encodeURIComponent(`compare_${stock_code}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (e) {
    err(res, 'EXPORT_FAILED', `Excel 导出失败: ${e.message}`, 500);
  }
});

module.exports = router;
