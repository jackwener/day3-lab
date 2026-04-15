const request = require('supertest');
const app = require('../server');

describe('能力探测 API', () => {
  test('GET /api/v1/agent/capabilities 返回配置状态', async () => {
    const res = await request(app).get('/api/v1/agent/capabilities');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('copaw_configured');
    expect(res.body).toHaveProperty('bailian_configured');
  });
});

describe('会话管理 API', () => {
  let sessionId;

  test('POST /api/v1/agent/sessions 创建会话', async () => {
    const res = await request(app).post('/api/v1/agent/sessions').send({ title: 'Test Session' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('session_id');
    sessionId = res.body.session_id;
  });

  test('GET /api/v1/agent/sessions 返回会话列表', async () => {
    const res = await request(app).get('/api/v1/agent/sessions');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.sessions)).toBe(true);
  });

  test('GET /api/v1/agent/sessions/:id/records 返回记录', async () => {
    const res = await request(app).get(`/api/v1/agent/sessions/${sessionId}/records`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.records)).toBe(true);
  });

  test('DELETE /api/v1/agent/sessions/:id 删除会话', async () => {
    const res = await request(app).delete(`/api/v1/agent/sessions/${sessionId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('message');
  });
});

describe('问答 API', () => {
  let sessionId;

  beforeAll(async () => {
    const res = await request(app).post('/api/v1/agent/sessions').send({ title: 'QA Test' });
    sessionId = res.body.session_id;
  });

  test('POST /api/v1/agent/ask 非流式问答', async () => {
    const res = await request(app)
      .post('/api/v1/agent/ask')
      .send({ query: '测试问题', session_id: sessionId, stream: false });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('answer');
    expect(res.body).toHaveProperty('answer_source');
  });

  afterAll(async () => {
    await request(app).delete(`/api/v1/agent/sessions/${sessionId}`);
  });
});

describe('搜索 API', () => {
  test('GET /api/v1/agent/records/search 关键词搜索', async () => {
    const res = await request(app).get('/api/v1/agent/records/search?keyword=test');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('records');
  });

  test('POST /api/v1/agent/records/similar 相似检测', async () => {
    const res = await request(app)
      .post('/api/v1/agent/records/similar')
      .send({ query: '贵州茅台最新评级' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('similar_records');
  });
});

describe('股票 API', () => {
  test('GET /api/v1/agent/stock/600519 返回股票信息', async () => {
    const res = await request(app).get('/api/v1/agent/stock/600519');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('code');
    expect(res.body).toHaveProperty('name');
    expect(res.body).toHaveProperty('summary');
  });
});

describe('研报管理 API', () => {
  test('GET /api/v1/agent/reports 返回研报列表', async () => {
    const res = await request(app).get('/api/v1/agent/reports');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('reports');
  });

  test('POST /api/v1/agent/reports/url URL导入', async () => {
    const res = await request(app)
      .post('/api/v1/agent/reports/url')
      .send({ url: 'https://example.com', title: 'Test Report' });
    // 可能成功或因网络失败，检查不是 500
    expect([200, 201, 400, 422]).toContain(res.status);
  });
});

describe('指标对比 API', () => {
  test('POST /api/v1/agent/compare 返回对比数据', async () => {
    const res = await request(app)
      .post('/api/v1/agent/compare')
      .send({ stock_code: '600519', report_ids: ['demo_1'] });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('indicators');
  });
});

describe('舆情 API', () => {
  test('GET /api/v1/agent/stock/600519/sentiment 返回舆情数据', async () => {
    const res = await request(app).get('/api/v1/agent/stock/600519/sentiment');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('sentiments');
  });
});

describe('AI拉取配置 API', () => {
  test('GET /api/v1/agent/reports/fetch-config 返回配置', async () => {
    const res = await request(app).get('/api/v1/agent/reports/fetch-config');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('configs');
  });

  test('POST /api/v1/agent/reports/fetch-config 创建配置', async () => {
    const res = await request(app)
      .post('/api/v1/agent/reports/fetch-config')
      .send({ name: 'Test Config', url_pattern: 'https://example.com/*', schedule: '0 8 * * *', enabled: true });
    expect([200, 201]).toContain(res.status);
  });
});
