import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { fundApi } from '../services/api'
import {
  Card,
  Row,
  Col,
  Input,
  Button,
  Tag,
  Progress,
  Statistic,
  Divider,
  Space,
  Typography,
  Rate,
  Descriptions,
  Tabs,
  Table,
  Empty,
  Grid,
} from 'antd'
import {
  SearchOutlined,
  RiseOutlined,
  FallOutlined,
  ThunderboltOutlined,
  SafetyCertificateOutlined,
  TrophyOutlined,
  BarChartOutlined,
  NotificationOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  MinusOutlined,
} from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography



const sentimentConfig = {
  positive: { color: '#cf1322', bg: '#fff1f0', border: '#ffa39e', icon: <ArrowUpOutlined />, label: '利好' },
  negative: { color: '#3f8600', bg: '#f6ffed', border: '#b7eb8f', icon: <ArrowDownOutlined />, label: '利空' },
  neutral: { color: '#666', bg: '#fafafa', border: '#d9d9d9', icon: <MinusOutlined />, label: '中性' },
}

const hotFunds = [
  { name: '易方达蓝筹精选混合', code: '005827' },
  { name: '中欧医疗健康混合', code: '003095' },
  { name: '景顺长城新兴成长混合', code: '260108' },
  { name: '招商中证白酒指数', code: '161725' },
  { name: '天弘中证光伏产业', code: '011102' },
]

export default function DiagnosisPage() {
  const [searchParams] = useSearchParams()
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchValue, setSearchValue] = useState('')
  const [fundData, setFundData] = useState<any>(null)
  const [returnsData, setReturnsData] = useState<any>(null)
  const [newsData, setNewsData] = useState<any[]>([])
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md

  useEffect(() => {
    // 从 URL 参数中读取基金代码并自动诊断
    const code = searchParams.get('code')
    if (code) {
      setSearchValue(code)
      // 延迟执行以确保状态已更新
      setTimeout(() => {
        handleSearchWithCode(code)
      }, 100)
    }
  }, [searchParams])

  const handleSearchWithCode = async (code: string) => {
    setLoading(true)
    try {
      const [diag, ret, news] = await Promise.all([
        fundApi.getDiagnosis(code),
        fundApi.getReturns(code),
        fundApi.getHoldingsNews(code),
      ])
      setFundData(diag)
      setReturnsData(ret)
      setNewsData(news?.news || [])
      setSearched(true)
    } catch {
      setFundData(null)
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = async () => {
    const code = searchValue.trim()
    if (!code) return
    setLoading(true)
    try {
      const [diag, ret, news] = await Promise.all([
        fundApi.getDiagnosis(code),
        fundApi.getReturns(code),
        fundApi.getHoldingsNews(code),
      ])
      setFundData(diag)
      setReturnsData(ret)
      setNewsData(news?.news || [])
      setSearched(true)
    } catch {
      setFundData(null)
      setSearched(true)
    } finally {
      setLoading(false)
    }
  }

  const holdingsColumns = [
    { title: '序号', dataIndex: 'key', width: 60, render: (v: string) => <Text type="secondary">{v}</Text> },
    {
      title: '股票名称',
      dataIndex: 'name',
      render: (v: string, r: { code: string }) => (
        <div>
          <Text strong>{v}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{r.code}</Text>
        </div>
      ),
    },
    // TODO: 行业信息获取不稳定，暂时注释
    // {
    //   title: '行业',
    //   dataIndex: 'industry',
    //   render: (v: string) => <Tag color="blue">{v}</Tag>,
    // },
    {
      title: '占比',
      dataIndex: 'ratio',
      render: (v: number) => (
        <div style={{ minWidth: 120 }}>
          <Progress percent={v * 5} size="small" format={() => `${v}%`} />
        </div>
      ),
    },
  ]

  return (
    <div>
      <Title level={3} style={{ marginBottom: 8 }}>
        <ThunderboltOutlined style={{ color: '#1677ff', marginRight: 8 }} />
        基金诊断
      </Title>
      <Paragraph type="secondary" style={{ marginBottom: 24 }}>
        输入基金名称或代码，获取全面的基金健康诊断报告
      </Paragraph>

      {/* 搜索区域 */}
      <Card
        style={{
          marginBottom: 24,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
        }}
      >
        <div style={{ textAlign: 'center', padding: isMobile ? '12px 0' : '20px 0' }}>
          <Title level={4} style={{ color: '#fff', marginBottom: 16 }}>
            智能基金诊断
          </Title>
          <div style={{ maxWidth: 600, margin: '0 auto', padding: isMobile ? '0 8px' : 0 }}>
            <Input.Search
              placeholder="请输入基金名称或代码，如：005827"
              enterButton={<><SearchOutlined /> {isMobile ? '诊断' : '开始诊断'}</>}
              size="large"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onSearch={handleSearch}
              style={{ boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
            />
          </div>
          <div style={{ marginTop: 16 }}>
            <Text style={{ color: 'rgba(255,255,255,0.8)', marginRight: 8 }}>热门基金：</Text>
            {hotFunds.map((fund) => (
              <Tag
                key={fund.code}
                style={{
                  cursor: 'pointer',
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: '#fff',
                  marginBottom: 4,
                  marginRight: 4,
                }}
                onClick={() => {
                  setSearchValue(fund.code)
                  setSearched(true)
                }}
              >
                {fund.name}
              </Tag>
            ))}
          </div>
        </div>
      </Card>

      {/* 诊断结果 */}
      {loading ? (
        <Card style={{ textAlign: 'center', padding: '40px 0' }}>
          <Empty description="正在诊断中..." />
        </Card>
      ) : searched && fundData ? (
        <>
          {/* 基金概览 */}
          <Card style={{ marginBottom: 24 }}>
            <Row gutter={24} align="middle">
              <Col flex="auto">
                <Space align="center" size="middle">
                  <Title level={4} style={{ margin: 0 }}>
                    {fundData.fund_name}
                  </Title>
                  <Tag color="blue">{fundData.fund_type}</Tag>
                  <Text type="secondary">{fundData.fund_code}</Text>
                </Space>
                <div style={{ marginTop: 8 }}>
                  <Text type="secondary">
                    基金经理：{fundData.manager} | 基金公司：{fundData.company} | 规模：{fundData.scale}
                  </Text>
                </div>
              </Col>
              <Col>
                <Statistic
                  title="最新净值"
                  value={fundData.nav}
                  precision={4}
                  valueStyle={{ color: fundData.nav_change > 0 ? '#cf1322' : '#3f8600' }}
                  prefix={fundData.nav_change > 0 ? <RiseOutlined /> : <FallOutlined />}
                  suffix={
                    <Text
                      style={{
                        fontSize: 14,
                        color: fundData.nav_change > 0 ? '#cf1322' : '#3f8600',
                      }}
                    >
                      {fundData.nav_change > 0 ? '+' : ''}{fundData.nav_change}%
                    </Text>
                  }
                />
              </Col>
            </Row>
          </Card>

          {/* 诊断评分 */}
          <Row gutter={24} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={8}>
              <Card
                style={{ height: '100%', textAlign: 'center' }}
                styles={{ body: { padding: '32px 24px' } }}
              >
                <Title level={5}>
                  <TrophyOutlined style={{ color: '#faad14', marginRight: 8 }} />
                  综合评级
                </Title>
                <div style={{ margin: '16px 0' }}>
                  <Rate disabled defaultValue={fundData.rating} style={{ fontSize: 32 }} />
                </div>
                <Tag color="gold" style={{ fontSize: 14, padding: '4px 16px' }}>
                  {fundData.rating_label}
                </Tag>
              </Card>
            </Col>
            <Col xs={24} lg={16}>
              <Card style={{ height: '100%' }}>
                <Title level={5}>
                  <BarChartOutlined style={{ color: '#1677ff', marginRight: 8 }} />
                  诊断维度
                </Title>
                <Row gutter={[24, 16]} style={{ marginTop: 16 }}>
                  {[
                    { label: '收益能力', value: fundData.scores?.returns || 0, color: '#cf1322' },
                    { label: '风控能力', value: fundData.scores?.risk_control || 0, color: '#1677ff' },
                    { label: '稳定性', value: fundData.scores?.stability || 0, color: '#52c41a' },
                    { label: '择时能力', value: fundData.scores?.timing || 0, color: '#faad14' },
                    { label: '选股能力', value: fundData.scores?.stock_picking || 0, color: '#722ed1' },
                  ].map((item) => (
                    <Col xs={12} sm={8} key={item.label}>
                      <div style={{ textAlign: 'center' }}>
                        <Progress
                          type="dashboard"
                          percent={item.value}
                          size={80}
                          strokeColor={item.color}
                          format={(v) => <span style={{ fontSize: 16, fontWeight: 'bold' }}>{v}</span>}
                        />
                        <div style={{ marginTop: 4 }}>
                          <Text type="secondary">{item.label}</Text>
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              </Card>
            </Col>
          </Row>

          {/* 持仓股资讯 */}
          <Card style={{ marginBottom: 24 }}>
            <Title level={5} style={{ marginBottom: 16 }}>
              <NotificationOutlined style={{ color: '#fa541c', marginRight: 8 }} />
              持仓股近期资讯
            </Title>
            {newsData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                <p>暂无持仓股相关资讯</p>
              </div>
            ) : (
              <Row gutter={[12, 12]}>
                {newsData.map((news: any) => {
                  const cfg = sentimentConfig[news.sentiment as keyof typeof sentimentConfig] || sentimentConfig.neutral
                  return (
                    <Col xs={24} md={12} key={news.id}>
                      <Card
                        size="small"
                        hoverable
                        style={{ borderLeft: `3px solid ${cfg.border}`, background: cfg.bg }}
                        styles={{ body: { padding: '12px 16px' } }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                          <div style={{ flex: 1 }}>
                            <Space size={4} style={{ marginBottom: 4 }}>
                              <Tag color={cfg.color === '#cf1322' ? 'red' : cfg.color === '#3f8600' ? 'green' : 'default'} style={{ margin: 0 }}>
                                {cfg.icon} {cfg.label}
                              </Tag>
                              <Text type="secondary" style={{ fontSize: 12 }}>{news.stock_name} ({news.stock_code})</Text>
                            </Space>
                            <div>
                              <Text strong style={{ fontSize: 13, cursor: 'pointer' }}>{news.title}</Text>
                            </div>
                            <Space style={{ marginTop: 4 }}>
                              <Text type="secondary" style={{ fontSize: 11 }}>{news.source}</Text>
                            </Space>
                          </div>
                        </div>
                      </Card>
                    </Col>
                  )
                })}
              </Row>
            )}
          </Card>

          {/* 收益与持仓 */}
          <Card>
            <Tabs
              items={[
                {
                  key: 'returns',
                  label: '历史收益',
                  children: (
                    <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }}>
                      {returnsData?.returns && Object.entries({
                        '近1月': returnsData.returns.month_1,
                        '近3月': returnsData.returns.month_3,
                        '近6月': returnsData.returns.month_6,
                        '近1年': returnsData.returns.year_1,
                        '近3年': returnsData.returns.year_3,
                        '成立以来': returnsData.returns.since_inception,
                      }).map(([period, value]: [string, any]) => (
                        <Descriptions.Item key={period} label={period}>
                          <Text
                            strong
                            style={{ color: value > 0 ? '#cf1322' : '#3f8600', fontSize: 16 }}
                          >
                            {value > 0 ? '+' : ''}{value}%
                          </Text>
                        </Descriptions.Item>
                      ))}
                    </Descriptions>
                  ),
                },
                {
                  key: 'holdings',
                  label: '前十大持仓',
                  children: (
                    <Table
                      columns={holdingsColumns}
                      dataSource={(returnsData?.holdings || []).map((h: any, i: number) => ({
                        key: String(i + 1),
                        name: h.stock_name,
                        code: h.stock_code,
                        // industry: h.industry,  // 行业列已注释
                        ratio: h.weight,
                      }))}
                      pagination={false}
                      size="middle"
                    />
                  ),
                },
                {
                  key: 'suggestion',
                  label: (
                    <span>
                      <SafetyCertificateOutlined /> 投资建议
                    </span>
                  ),
                  children: (
                    <div style={{ padding: '8px 0' }}>
                      <Paragraph>
                        <Text strong style={{ fontSize: 16 }}>诊断结论：</Text>
                      </Paragraph>
                      <Paragraph>
                        {returnsData?.advice?.conclusion || '暂无诊断结论'}
                      </Paragraph>
                      <Divider />
                      <Paragraph>
                        <Text strong style={{ fontSize: 16 }}>建议：</Text>
                      </Paragraph>
                      <ul>
                        {(returnsData?.advice?.suggestions || []).map((s: string, i: number) => (
                          <li key={i}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  ),
                },
              ]}
            />
          </Card>
        </>
      ) : searched && !fundData ? (
        <Card style={{ textAlign: 'center', padding: '40px 0' }}>
          <Empty description="未找到该基金，请检查基金代码" />
        </Card>
      ) : (
        <Card style={{ textAlign: 'center', padding: '40px 0' }}>
          <Empty description="输入基金名称或代码，开始诊断之旅" />
        </Card>
      )}
    </div>
  )
}
