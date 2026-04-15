import { useState, useEffect } from 'react'
import {
  Card,
  Row,
  Col,
  Table,
  Tag,
  Typography,
  Space,
  Button,
  Modal,
  Input,
  List,
  Empty,
  Popconfirm,
  message,
  Statistic,
  Divider,
  Alert,
  Grid,
} from 'antd'
import {
  StarFilled,
  PlusOutlined,
  DeleteOutlined,
  SearchOutlined,
  RiseOutlined,
  FallOutlined,
  EyeOutlined,
  FundOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

const { Title, Text, Paragraph } = Typography

import { watchlistApi, marketApi } from '../services/api'

interface WatchlistFund {
  key: string
  name: string
  code: string
  type: string
  nav: number
  dayChange: number
  weekChange: number
  monthChange: number
  addedDate: string
  cost?: number
  shares?: number
}

const renderChange = (value: number) => (
  <Text strong style={{ color: value > 0 ? '#cf1322' : value < 0 ? '#3f8600' : '#666' }}>
    {value > 0 ? '+' : ''}{value.toFixed(2)}%
  </Text>
)

export default function WatchlistPage() {
  const [watchlist, setWatchlist] = useState<WatchlistFund[]>([])
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [availableFunds, setAvailableFunds] = useState<any[]>([])
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md
  const navigate = useNavigate()

  const loadWatchlist = async () => {
    try {
      // 获取自选列表（只包含 fund_code）
      const watchlistData = await watchlistApi.getList()
      
      // 获取所有基金信息
      const allFundsRes = await marketApi.getFunds({ page_size: 100 })
      const allFundsMap = new Map()
      ;(allFundsRes.list || []).forEach((f: any) => {
        allFundsMap.set(f.fund_code, f)
      })

      // 合并数据
      const list = (watchlistData || []).map((item: any, i: number) => {
        const fundInfo = allFundsMap.get(item.fund_code) || {}
        return {
          key: String(i),
          name: fundInfo.fund_name || item.fund_code,
          code: item.fund_code,
          type: fundInfo.fund_type || '-',
          nav: fundInfo.nav || 0,
          dayChange: fundInfo.day_change || 0,
          weekChange: fundInfo.week_change || 0,
          monthChange: fundInfo.month_change || 0,
          addedDate: item.added_at?.split('T')[0] || '',
        }
      })
      setWatchlist(list)
    } catch (error) {
      console.error('加载自选列表失败:', error)
    }
  }

  useEffect(() => {
    loadWatchlist()
    // Load available funds from market API for adding
    marketApi.getFunds({ page_size: 20 }).then((res) => {
      setAvailableFunds((res.list || []).map((f: any) => ({
        name: f.fund_name,
        code: f.fund_code,
        type: f.fund_type,
      })))
    }).catch(() => {})
  }, [])

  const handleAdd = async (fund: { name: string; code: string; type: string }) => {
    if (watchlist.some((f) => f.code === fund.code)) {
      message.warning('该基金已在自选列表中')
      return
    }
    try {
      await watchlistApi.add(fund.code)
      message.success(`已添加 ${fund.name} 到自选`)
      loadWatchlist()
    } catch (e: any) {
      message.error(e.message || '添加失败')
    }
  }

  const handleRemove = async (code: string) => {
    try {
      await watchlistApi.remove(code)
      message.success('已移出自选')
      loadWatchlist()
    } catch {
      message.error('操作失败')
    }
  }

  const handleDiagnose = (code: string) => {
    // 跳转到诊断页面，并通过 URL 参数传递基金代码
    navigate(`/diagnosis?code=${code}`)
  }

  // 计算汇总（当前版本不支持成本价和份额）
  const totalValue = 0
  const totalCost = 0
  const totalProfit = 0
  const totalProfitRate = 0

  const columns = [
    {
      title: '基金名称',
      dataIndex: 'name',
      render: (v: string, r: WatchlistFund) => (
        <div>
          <Space>
            <StarFilled style={{ color: '#faad14', fontSize: 14 }} />
            <Text strong>{v}</Text>
          </Space>
          <br />
          <Text type="secondary" style={{ fontSize: 12, marginLeft: 22 }}>{r.code}</Text>
        </div>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 90,
      render: (v: string) => <Tag>{v}</Tag>,
    },
    {
      title: '最新净值',
      dataIndex: 'nav',
      width: 100,
      render: (v: number) => <Text strong>{v.toFixed(4)}</Text>,
    },
    {
      title: '日涨跌',
      dataIndex: 'dayChange',
      width: 90,
      render: renderChange,
      sorter: (a: WatchlistFund, b: WatchlistFund) => a.dayChange - b.dayChange,
    },
    {
      title: '近1周',
      dataIndex: 'weekChange',
      width: 90,
      render: renderChange,
      sorter: (a: WatchlistFund, b: WatchlistFund) => a.weekChange - b.weekChange,
    },
    {
      title: '近1月',
      dataIndex: 'monthChange',
      width: 90,
      render: renderChange,
      sorter: (a: WatchlistFund, b: WatchlistFund) => a.monthChange - b.monthChange,
    },
    {
      title: '添加日期',
      dataIndex: 'addedDate',
      width: 110,
      render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: unknown, r: WatchlistFund) => (
        <Space>
          <Button 
            type="link" 
            size="small" 
            icon={<EyeOutlined />}
            onClick={() => handleDiagnose(r.code)}
          >
            诊断
          </Button>
          <Popconfirm
            title="确定移出自选吗？"
            onConfirm={() => handleRemove(r.code)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ]

  const filteredAvailable = availableFunds.filter(
    (f) =>
      !watchlist.some((w) => w.code === f.code) &&
      (!searchText || f.name.includes(searchText) || f.code.includes(searchText))
  )

  return (
    <div>
      <Title level={isMobile ? 4 : 3} style={{ marginBottom: 8 }}>
        <StarFilled style={{ color: '#faad14', marginRight: 8 }} />
        我的自选
      </Title>
      <Paragraph type="secondary" style={{ marginBottom: 24 }}>
        管理您关注的基金，实时跟踪净值与收益变化
      </Paragraph>

      {/* 汇总卡片（当前版本不支持成本价和份额） */}
      {false && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col xs={12} sm={6}>
            <Card size="small" hoverable>
              <Statistic
                title="持仓总市值"
                value={totalValue}
                precision={2}
                prefix="¥"
                valueStyle={{ fontSize: 20 }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" hoverable>
              <Statistic
                title="总投入成本"
                value={totalCost}
                precision={2}
                prefix="¥"
                valueStyle={{ fontSize: 20, color: '#666' }}
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" hoverable>
              <Statistic
                title="持仓总收益"
                value={totalProfit}
                precision={2}
                prefix={totalProfit >= 0 ? <RiseOutlined /> : <FallOutlined />}
                valueStyle={{ fontSize: 20, color: totalProfit >= 0 ? '#cf1322' : '#3f8600' }}
                suffix="¥"
              />
            </Card>
          </Col>
          <Col xs={12} sm={6}>
            <Card size="small" hoverable>
              <Statistic
                title="总收益率"
                value={totalProfitRate}
                precision={2}
                prefix={totalProfitRate >= 0 ? <RiseOutlined /> : <FallOutlined />}
                valueStyle={{ fontSize: 20, color: totalProfitRate >= 0 ? '#cf1322' : '#3f8600' }}
                suffix="%"
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 自选列表 */}
      <Card
        title={
          <Space>
            <FundOutlined style={{ color: '#1677ff' }} />
            <span>自选基金列表</span>
            <Tag color="blue">{watchlist.length} 只</Tag>
          </Space>
        }
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModalOpen(true)}>
            添加自选
          </Button>
        }
      >
        {watchlist.length > 0 ? (
          <Table
            columns={columns}
            dataSource={watchlist}
            pagination={false}
            size="middle"
            scroll={{ x: 900 }}
          />
        ) : (
          <Empty description="暂无自选基金，点击上方按钮添加">
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddModalOpen(true)}>
              添加自选基金
            </Button>
          </Empty>
        )}
      </Card>

      {/* 添加基金弹窗 */}
      <Modal
        title="添加自选基金"
        open={addModalOpen}
        onCancel={() => { setAddModalOpen(false); setSearchText('') }}
        footer={null}
        width={isMobile ? '90vw' : 480}
      >
        <Input
          placeholder="搜索基金名称或代码"
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ marginBottom: 16 }}
          allowClear
        />
        <Divider style={{ margin: '8px 0' }} />
        <List
          dataSource={filteredAvailable}
          locale={{ emptyText: '没有更多可添加的基金' }}
          renderItem={(fund) => (
            <List.Item
              actions={[
                <Button
                  key="add"
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => handleAdd(fund)}
                >
                  添加
                </Button>,
              ]}
            >
              <List.Item.Meta
                title={
                  <Space>
                    <Text strong>{fund.name}</Text>
                    <Tag>{fund.type}</Tag>
                  </Space>
                }
                description={fund.code}
              />
            </List.Item>
          )}
        />
      </Modal>
    </div>
  )
}
