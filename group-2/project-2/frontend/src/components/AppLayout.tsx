import { useState, useEffect } from 'react'
import { Layout, Menu, theme, Typography, Avatar, Space, Badge, Drawer, Grid, Alert } from 'antd'
import {
  FundOutlined,
  LineChartOutlined,
  ReadOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  UserOutlined,
  StarOutlined,
  ExperimentOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import FundChatBot from './FundChatBot'

const { Header, Sider, Content } = Layout
const { useBreakpoint } = Grid

const menuItems = [
  { key: '/diagnosis', icon: <FundOutlined />, label: '基金诊断' },
  { key: '/market', icon: <LineChartOutlined />, label: '基金行情' },
  { key: '/insights', icon: <ReadOutlined />, label: '基金视点' },
  { key: '/watchlist', icon: <StarOutlined />, label: '我的自选' },
]

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isDemo, setIsDemo] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const screens = useBreakpoint()
  const isMobile = !screens.md

  useEffect(() => {
    // 检测是否为演示模式
    const params = new URLSearchParams(window.location.search)
    setIsDemo(params.get('demo') === '1')
  }, [location.search])

  const {
    token: { colorBgContainer, borderRadiusLG },
  } = theme.useToken()

  const selectedKey = menuItems.find((item) =>
    location.pathname.startsWith(item.key)
  )?.key || '/diagnosis'

  const handleMenuClick = (key: string) => {
    navigate(key)
    if (isMobile) setDrawerOpen(false)
  }

  const siderContent = (
    <>
      <div
        style={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <FundOutlined style={{ color: '#1677ff', fontSize: 24, marginRight: isMobile || !collapsed ? 10 : 0 }} />
        {(isMobile || !collapsed) && (
          <Typography.Text
            strong
            style={{ color: '#fff', fontSize: 18, whiteSpace: 'nowrap' }}
          >
            基金管家
          </Typography.Text>
        )}
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[selectedKey]}
        items={menuItems}
        onClick={({ key }) => handleMenuClick(key)}
        style={{ marginTop: 8 }}
      />
    </>
  )

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Desktop Sider */}
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          style={{
            overflow: 'auto',
            height: '100vh',
            position: 'fixed',
            left: 0,
            top: 0,
            bottom: 0,
            zIndex: 100,
          }}
          theme="dark"
        >
          {siderContent}
        </Sider>
      )}

      {/* Mobile Drawer */}
      {isMobile && (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          closable={false}
          width={200}
          styles={{ body: { padding: 0, background: '#001529' } }}
        >
          {siderContent}
        </Drawer>
      )}

      <Layout
        style={{
          marginLeft: isMobile ? 0 : (collapsed ? 80 : 200),
          transition: 'all 0.2s',
        }}
      >
        {/* 演示模式提示条 */}
        {isDemo && (
          <Alert
            message={
              <Space>
                <ExperimentOutlined />
                <strong>演示模式</strong>
                <span style={{ fontSize: 12 }}>（基金智投助手使用真实数据，其他功能使用模拟数据）</span>
              </Space>
            }
            type="info"
            showIcon={false}
            closable
            style={{
              position: 'sticky',
              top: 0,
              zIndex: 100,
              borderRadius: 0,
            }}
          />
        )}
        <Header
          style={{
            padding: isMobile ? '0 12px' : '0 24px',
            background: colorBgContainer,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            position: 'sticky',
            top: 0,
            zIndex: 99,
          }}
        >
          <Space>
            <span
              onClick={() => isMobile ? setDrawerOpen(!drawerOpen) : setCollapsed(!collapsed)}
              style={{ fontSize: 18, cursor: 'pointer', padding: '0 8px' }}
            >
              {isMobile ? <MenuUnfoldOutlined /> : (collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />)}
            </span>
          </Space>
          <Space size="middle">
            <Badge count={3} size="small">
              <BellOutlined style={{ fontSize: 18, cursor: 'pointer' }} />
            </Badge>
            <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
          </Space>
        </Header>
        <Content
          style={{
            margin: isMobile ? 12 : 24,
            padding: isMobile ? 12 : 24,
            background: colorBgContainer,
            borderRadius: borderRadiusLG,
            minHeight: isMobile ? 'calc(100vh - 64px - 24px)' : 'calc(100vh - 64px - 48px)',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
      <FundChatBot />
    </Layout>
  )
}
