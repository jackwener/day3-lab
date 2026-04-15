import { useState, useEffect } from 'react'
import {
  Card,
  Row,
  Col,
  Tag,
  Typography,
  Space,
  Avatar,
  List,
  Divider,
  Segmented,
  Input,
  Button,
  Tooltip,
  Image,
  Grid,
} from 'antd'
import {
  ReadOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  LikeOutlined,
  LikeFilled,
  FireOutlined,
  TagOutlined,
  SearchOutlined,
  RightOutlined,
} from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

import { insightsApi } from '../services/api'

interface Article {
  id: number
  title: string
  summary: string
  category: string
  source: string
  time: string
  views: number
  likes: number
  cover?: string
  tags: string[]
  isHot?: boolean
  originalUrl?: string  // 原文链接
}

const categories = ['全部', '市场展望', '行业动态', '投资策略', '产品分析']

const categoryColors: Record<string, string> = {
  '市场展望': 'blue',
  '行业动态': 'purple',
  '投资策略': 'green',
  '产品分析': 'orange',
}

export default function InsightsPage() {
  const [activeCategory, setActiveCategory] = useState('全部')
  const [searchText, setSearchText] = useState('')
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md
  const [likedArticles, setLikedArticles] = useState<Set<number>>(new Set())
  const [articles, setArticles] = useState<Article[]>([])
  const [hotTags, setHotTags] = useState<string[]>([])

  useEffect(() => {
    insightsApi.getArticles({ page_size: 20 }).then((res) => {
      const list = (res.list || []).map((a: any, i: number) => ({
        id: i,
        title: a.title,
        summary: a.summary,
        category: a.category,
        source: a.author || a.source || '',
        time: new Date(a.published_at).toLocaleDateString(),
        views: a.views || 0,
        likes: a.likes || 0,
        cover: a.cover_image,
        tags: a.tags || [],
        isHot: (a.views || 0) > 8000,
        originalUrl: a.original_url || '',  // 添加原文链接
      }))
      setArticles(list)
      setHotTags(res.hot_tags || [])
    }).catch(() => {})
  }, [])

  const toggleLike = (id: number) => {
    setLikedArticles((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleArticleClick = (article: Article) => {
    if (article.originalUrl) {
      // 有原文链接，打开新标签页
      window.open(article.originalUrl, '_blank', 'noopener,noreferrer')
    } else {
      // 没有原文链接，可以显示提示或者不做处理
      console.log('该文章暂无原文链接')
    }
  }

  const filteredArticles = articles.filter((article) => {
    const categoryMatch = activeCategory === '全部' || article.category === activeCategory
    const searchMatch =
      !searchText ||
      article.title.includes(searchText) ||
      article.summary.includes(searchText) ||
      article.tags.some((tag) => tag.includes(searchText))
    return categoryMatch && searchMatch
  })

  const hotArticles = articles
    .filter((a) => a.isHot)
    .sort((a, b) => b.views - a.views)

  return (
    <div>
      <Title level={isMobile ? 4 : 3} style={{ marginBottom: 8 }}>
        <ReadOutlined style={{ color: '#1677ff', marginRight: 8 }} />
        基金视点
      </Title>
      <Paragraph type="secondary" style={{ marginBottom: 24 }}>
        汇聚行业洞察与投资观点，助您把握市场脉搏
      </Paragraph>

      <Row gutter={24}>
        {/* 主内容区 */}
        <Col xs={24} lg={17}>
          {/* 置顶文章 */}
          {filteredArticles.length > 0 && activeCategory === '全部' && !searchText && articles.length > 0 && (
            <Card
              hoverable
              style={{ marginBottom: 24, overflow: 'hidden' }}
              styles={{ body: { padding: 0 } }}
            >
              <Row>
                <Col xs={24} md={12}>
                  <Image
                    preview={false}
                    src={articles[0].cover}
                    alt={articles[0].title}
                    style={{ width: '100%', height: 260, objectFit: 'cover' }}
                    fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/+F/PQAJpAN4sKMYKQAAAABJRU5ErkJggg=="
                  />
                </Col>
                <Col xs={24} md={12}>
                  <div style={{ padding: 24 }}>
                    <Space style={{ marginBottom: 8 }}>
                      <Tag color="red">
                        <FireOutlined /> 头条
                      </Tag>
                      <Tag color={categoryColors[articles[0].category]}>
                        {articles[0].category}
                      </Tag>
                    </Space>
                    <Title 
                      level={4} 
                      style={{ 
                        marginBottom: 12,
                        cursor: articles[0].originalUrl ? 'pointer' : 'default',
                      }}
                      onClick={() => handleArticleClick(articles[0])}
                    >
                      {articles[0].title}
                    </Title>
                    <Paragraph type="secondary" ellipsis={{ rows: 3 }}>
                      {articles[0].summary}
                    </Paragraph>
                    <Space style={{ marginTop: 12 }}>
                      <Text type="secondary">
                        <ClockCircleOutlined /> {articles[0].time}
                      </Text>
                      <Text type="secondary">
                        <EyeOutlined /> {articles[0].views.toLocaleString()}
                      </Text>
                    </Space>
                    <div style={{ marginTop: 16 }}>
                      <Button 
                        type="primary"
                        onClick={() => handleArticleClick(articles[0])}
                        disabled={!articles[0].originalUrl}
                      >
                        阅读全文 <RightOutlined />
                      </Button>
                    </div>
                  </div>
                </Col>
              </Row>
            </Card>
          )}

          {/* 筛选栏 */}
          <Card size="small" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <Segmented
                options={categories}
                value={activeCategory}
                onChange={(v) => setActiveCategory(v as string)}
              />
              <Input
                placeholder="搜索文章"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: isMobile ? '100%' : 220 }}
                allowClear
              />
            </div>
          </Card>

          {/* 文章列表 */}
          <List
            itemLayout="vertical"
            dataSource={filteredArticles}
            renderItem={(article) => (
              <Card
                hoverable
                size="small"
                style={{ marginBottom: 12 }}
                styles={{ body: { padding: '16px 20px' } }}
              >
                <div style={{ display: 'flex', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <Space style={{ marginBottom: 6 }}>
                      <Tag color={categoryColors[article.category]}>{article.category}</Tag>
                      {article.isHot && <Tag color="red"><FireOutlined /> 热门</Tag>}
                    </Space>
                    <Title 
                      level={5} 
                      style={{ 
                        margin: '4px 0 8px', 
                        cursor: article.originalUrl ? 'pointer' : 'default',
                        color: article.originalUrl ? '#1677ff' : 'inherit',
                      }}
                      onClick={() => handleArticleClick(article)}
                    >
                      {article.title}
                    </Title>
                    <Paragraph
                      type="secondary"
                      ellipsis={{ rows: 2 }}
                      style={{ marginBottom: 8, fontSize: 13 }}
                    >
                      {article.summary}
                    </Paragraph>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Space size="middle">
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          <Avatar size={18} style={{ backgroundColor: '#1677ff', marginRight: 4 }}>
                            {article.source[0]}
                          </Avatar>
                          {article.source}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          <ClockCircleOutlined /> {article.time}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          <EyeOutlined /> {article.views.toLocaleString()}
                        </Text>
                      </Space>
                      <Tooltip title={likedArticles.has(article.id) ? '取消点赞' : '点赞'}>
                        <span
                          onClick={() => toggleLike(article.id)}
                          style={{ cursor: 'pointer', fontSize: 14 }}
                        >
                          {likedArticles.has(article.id) ? (
                            <LikeFilled style={{ color: '#1677ff' }} />
                          ) : (
                            <LikeOutlined style={{ color: '#999' }} />
                          )}
                          <Text type="secondary" style={{ marginLeft: 4, fontSize: 12 }}>
                            {article.likes + (likedArticles.has(article.id) ? 1 : 0)}
                          </Text>
                        </span>
                      </Tooltip>
                    </div>
                  </div>
                  {article.cover && !isMobile && (
                    <div style={{ flexShrink: 0 }}>
                      <Image
                        preview={false}
                        src={article.cover}
                        alt=""
                        width={160}
                        height={100}
                        style={{ objectFit: 'cover', borderRadius: 8 }}
                        fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/+F/PQAJpAN4sKMYKQAAAABJRU5ErkJggg=="
                      />
                    </div>
                  )}
                </div>
              </Card>
            )}
          />
        </Col>

        {/* 侧边栏 */}
        <Col xs={24} lg={7}>
          {/* 热门文章 */}
          <Card
            title={
              <Space>
                <FireOutlined style={{ color: '#fa541c' }} />
                <span>热门文章</span>
              </Space>
            }
            size="small"
            style={{ marginBottom: 16 }}
          >
            {hotArticles.map((article, index) => (
              <div
                key={article.id}
                onClick={() => handleArticleClick(article)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '10px 0',
                  borderBottom: index < hotArticles.length - 1 ? '1px solid #f0f0f0' : 'none',
                  cursor: article.originalUrl ? 'pointer' : 'default',
                  opacity: article.originalUrl ? 1 : 0.6,
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    background: index === 0 ? '#cf1322' : index === 1 ? '#fa8c16' : '#1677ff',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 'bold',
                    flexShrink: 0,
                  }}
                >
                  {index + 1}
                </div>
                <div>
                  <Text strong style={{ fontSize: 13, lineHeight: 1.4 }}>
                    {article.title}
                  </Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    <EyeOutlined /> {article.views.toLocaleString()} 阅读
                  </Text>
                </div>
              </div>
            ))}
          </Card>

          {/* 热门标签 */}
          <Card
            title={
              <Space>
                <TagOutlined style={{ color: '#722ed1' }} />
                <span>热门标签</span>
              </Space>
            }
            size="small"
          >
            <Space size={[8, 8]} wrap>
              {[
                'A股', '宏观', '量化投资', 'AI', 'ESG', '债券',
                '定投', '新能源', 'REITs', 'QDII', '金融科技',
                '资产配置', '投资策略', '可持续投资',
              ].map((tag) => (
                <Tag
                  key={tag}
                  style={{ cursor: 'pointer', padding: '2px 10px' }}
                  onClick={() => setSearchText(tag)}
                >
                  {tag}
                </Tag>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}
