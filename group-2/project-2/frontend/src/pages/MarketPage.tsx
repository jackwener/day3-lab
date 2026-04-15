import { useState, useEffect } from 'react'
import {
  Card,
  Row,
  Col,
  Table,
  Tag,
  Typography,
  Statistic,
  Segmented,
  Input,
  Space,
  Tooltip,
  Badge,
  Grid,
} from 'antd'
import {
  RiseOutlined,
  FallOutlined,
  LineChartOutlined,
  FireOutlined,
  StarOutlined,
  StarFilled,
  SearchOutlined,
} from '@ant-design/icons'

import { marketApi, watchlistApi } from '../services/api'

const { Title, Text, Paragraph } = Typography

const riskColorMap: Record<string, string> = {
  '低': 'green',
  '中': 'blue',
  '中高': 'orange',
  '高': 'red',
}

export default function MarketPage() {
  const [fundType, setFundType] = useState<string>('全部')
  const [searchText, setSearchText] = useState('')
  const [marketIndices, setMarketIndices] = useState<any[]>([])
  const [fundsData, setFundsData] = useState<any[]>([])
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md
  const [starredFunds, setStarredFunds] = useState<Set<string>>(new Set())

  useEffect(() => {
    marketApi.getIndices().then(setMarketIndices).catch(() => {})
    marketApi.getFunds({ page_size: 20 }).then((res) => {
      setFundsData(res.list || [])
    }).catch(() => {})
    // 加载已收藏的基金列表
    watchlistApi.getList().then((list) => {
      const codes = new Set(list.map((item: any) => item.fund_code))
      setStarredFunds(codes)
    }).catch(() => {})
  }, [])

  const toggleStar = async (fundCode: string) => {
    try {
      if (starredFunds.has(fundCode)) {
        // 取消收藏
        await watchlistApi.remove(fundCode)
        setStarredFunds((prev) => {
          const next = new Set(prev)
          next.delete(fundCode)
          return next
        })
      } else {
        // 添加收藏
        await watchlistApi.add(fundCode)
        setStarredFunds((prev) => {
          const next = new Set(prev)
          next.add(fundCode)
          return next
        })
      }
    } catch (error) {
      console.error('收藏操作失败:', error)
    }
  }

  const renderChange = (value: number) => (
    <Text strong style={{ color: value > 0 ? '#cf1322' : value < 0 ? '#3f8600' : '#666' }}>
      {value > 0 ? '+' : ''}{value.toFixed(2)}%
    </Text>
  )

  const filteredFunds = fundsData.filter((fund: any) => {
    const typeMatch = fundType === '全部' || fund.fund_type === fundType
    const searchMatch =
      !searchText ||
      fund.fund_name?.includes(searchText) ||
      fund.fund_code?.includes(searchText)
    return typeMatch && searchMatch
  }).map((f: any, i: number) => ({ ...f, key: String(i) }))

  const columns = [
    {
      title: '',
      dataIndex: 'fund_code',
      width: 40,
      render: (_: string, record: any) => (
        <span onClick={() => toggleStar(record.fund_code)} style={{ cursor: 'pointer', fontSize: 16 }}>
          {starredFunds.has(record.fund_code) ? (
            <StarFilled style={{ color: '#faad14' }} />
          ) : (
            <StarOutlined style={{ color: '#d9d9d9' }} />
          )}
        </span>
      ),
    },
    {
      title: '基金名称',
      dataIndex: 'fund_name',
      render: (v: string, r: any) => (
        <div>
          <Text strong>{v}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>{r.fund_code}</Text>
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'fund_type',
      width: 90,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: '最新净值',
      dataIndex: 'nav',
      width: 100,
      render: (v: number) => <Text strong>{v.toFixed(4)}</Text>,
    },
    { title: '日涨跌', dataIndex: 'day_change', width: 90, render: renderChange, sorter: (a: any, b: any) => a.day_change - b.day_change },
    { title: '近1周', dataIndex: 'week_change', width: 90, render: renderChange, sorter: (a: any, b: any) => a.week_change - b.week_change },
    { title: '近1月', dataIndex: 'month_change', width: 90, render: renderChange, sorter: (a: any, b: any) => a.month_change - b.month_change },
    { title: '近1年', dataIndex: 'year_change', width: 90, render: renderChange, sorter: (a: any, b: any) => a.year_change - b.year_change },
    {
      title: '规模',
      dataIndex: 'scale',
      width: 100,
    },
    {
      title: '风险等级',
      dataIndex: 'risk_level',
      width: 90,
      render: (v: string) => <Tag color={riskColorMap[v] || 'default'}>{v}风险</Tag>,
    },
  ]

  return (
    <div>
      <Title level={isMobile ? 4 : 3} style={{ marginBottom: 8 }}>
        <LineChartOutlined style={{ color: '#1677ff', marginRight: 8 }} />
        基金行情
      </Title>
      <Paragraph type="secondary" style={{ marginBottom: 24 }}>
        实时追踪基金净值变化与市场行情动态
      </Paragraph>

      {/* 大盘指数 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        {marketIndices.map((index) => (
          <Col xs={12} sm={6} key={index.code}>
            <Card
              hoverable
              size="small"
              style={{
                borderTop: `3px solid ${index.change >= 0 ? '#cf1322' : '#3f8600'}`,
              }}
            >
              <Statistic
                title={
                  <Space>
                    <Text strong>{index.name}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{index.code}</Text>
                  </Space>
                }
                value={index.value}
                precision={2}
                valueStyle={{
                  color: index.change >= 0 ? '#cf1322' : '#3f8600',
                  fontSize: 20,
                }}
                prefix={index.change >= 0 ? <RiseOutlined /> : <FallOutlined />}
              />
              <div style={{ marginTop: 4 }}>
                <Text style={{ color: index.change >= 0 ? '#cf1322' : '#3f8600', fontSize: 13 }}>
                  {index.change >= 0 ? '+' : ''}{index.change}%
                </Text>
                <Text type="secondary" style={{ fontSize: 12, marginLeft: 12 }}>
                  成交 {index.volume}
                </Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* 基金列表 */}
      <Card
        title={
          <Space>
            <FireOutlined style={{ color: '#fa541c' }} />
            <span>基金列表</span>
            <Badge count={filteredFunds.length} style={{ backgroundColor: '#1677ff' }} />
          </Space>
        }
        extra={
          <Tooltip title="数据来源于后端接口">
            <Tag color="processing">实时数据</Tag>
          </Tooltip>
        }
      >
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <Segmented
            options={['全部', '混合型', '指数型']}
            value={fundType}
            onChange={(v) => setFundType(v as string)}
          />
          <Input
            placeholder="搜索基金名称/代码"
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: isMobile ? '100%' : 240 }}
            allowClear
          />
        </div>
        <Table
          columns={columns}
          dataSource={filteredFunds}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          size="middle"
          scroll={{ x: 900 }}
        />
      </Card>
    </div>
  )
}
