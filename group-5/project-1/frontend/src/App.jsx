/**
 * M5-RA 研报智能分析助手 — 主应用组件
 * 对齐 Spec 06 功能规格：Header + Sidebar + Main + InputArea
 * 对齐 Spec 08 §3：React Hooks + useState + useEffect
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Layout, Button, Input, Card, Tag, Spin, Empty, Modal, Select,
  Typography, Space, Tooltip, Badge, Upload, Progress, theme, ConfigProvider, App as AntApp,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, SendOutlined, RobotOutlined,
  UserOutlined, MessageOutlined, QuestionCircleOutlined,
  ExperimentOutlined, CloudOutlined, DesktopOutlined,
  UploadOutlined, ThunderboltOutlined, SwapOutlined,
} from '@ant-design/icons';
import zhCN from 'antd/locale/zh_CN';
import ReactMarkdown from 'react-markdown';
import './App.css';
import {
  getCapabilities, getSessions, createSession, deleteSession,
  getSessionRecords, ask, getProviders, uploadFile, getFileStatus,
  triggerAnalyze, getAnalyzeStatus, getSessionFiles, getSessionAnalyze,
} from './api';

const { Header, Sider, Content } = Layout;
const { TextArea } = Input;
const { Title, Text, Paragraph } = Typography;

function M5RAApp() {
  const { token } = theme.useToken();
  const { message: messageApi, modal } = AntApp.useApp();
  const chatEndRef = useRef(null);
  const sessionIdRef = useRef(null);       // 追踪当前会话 ID，防止异步竞态
  const fileTimerRef = useRef(null);       // 文件解析轮询定时器
  const analyzeTimerRef = useRef(null);    // 深度分析轮询定时器

  // ==================== React State（对齐 Spec 06 §8） ====================
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [records, setRecords] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [capabilities, setCapabilities] = useState({
    copaw_configured: false, bailian_configured: false, model: null,
  });
  const [providers, setProviders] = useState([]);
  const [currentProvider, setCurrentProvider] = useState(null);
  // 文件上传状态（FE-2）
  const [uploadedFile, setUploadedFile] = useState(null);   // {file_id, file_name, parse_status, parse_progress}
  const [uploading, setUploading] = useState(false);
  // 深度分析状态（FE-5）
  const [analyzeResult, setAnalyzeResult] = useState(null);  // {analyze_id, status, progress, result}
  const [analyzing, setAnalyzing] = useState(false);
  const [showReport, setShowReport] = useState(false);

  // ==================== 初始化 ====================
  useEffect(() => {
    loadCapabilities();
    loadSessions();
    loadProviders();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [records, loading]);

  // ==================== 数据加载 ====================
  const loadCapabilities = async () => {
    try {
      const data = await getCapabilities();
      setCapabilities(data);
    } catch (err) {
      console.error('加载能力状态失败:', err);
    }
  };

  const loadSessions = async () => {
    try {
      const data = await getSessions();
      setSessions(data.sessions || []);
      if (data.sessions?.length > 0 && !currentSession) {
        setCurrentSession(data.sessions[0]);
      }
    } catch (err) {
      messageApi.error('加载会话列表失败');
    }
  };

  const loadRecords = useCallback(async (sessionId) => {
    if (!sessionId) return;
    try {
      const data = await getSessionRecords(sessionId);
      if (sessionIdRef.current !== sessionId) return; // 防竞态
      setRecords(data.records || []);
    } catch (err) {
      if (sessionIdRef.current !== sessionId) return;
      messageApi.error('加载历史记录失败');
    }
  }, [messageApi]);

  const loadProviders = async () => {
    try {
      const data = await getProviders();
      setProviders(data.providers || []);
      setCurrentProvider(data.default);
    } catch (err) {
      console.error('加载模型列表失败:', err);
    }
  };

  useEffect(() => {
    // 清理旧轮询定时器
    if (fileTimerRef.current) { clearInterval(fileTimerRef.current); fileTimerRef.current = null; }
    if (analyzeTimerRef.current) { clearInterval(analyzeTimerRef.current); analyzeTimerRef.current = null; }

    if (currentSession) {
      const sid = currentSession.session_id;
      sessionIdRef.current = sid;
      loadRecords(sid);
      loadSessionFiles(sid);
      loadSessionAnalyze(sid);
      setShowReport(false);
    } else {
      sessionIdRef.current = null;
    }

    return () => {
      if (fileTimerRef.current) { clearInterval(fileTimerRef.current); fileTimerRef.current = null; }
      if (analyzeTimerRef.current) { clearInterval(analyzeTimerRef.current); analyzeTimerRef.current = null; }
    };
  }, [currentSession, loadRecords]);

  const loadSessionFiles = async (sessionId) => {
    try {
      const data = await getSessionFiles(sessionId);
      if (sessionIdRef.current !== sessionId) return; // 防竞态：会话已切走
      const files = data.files || [];
      if (files.length > 0) {
        const latest = files[0];
        setUploadedFile({
          file_id: latest.file_id,
          file_name: latest.file_name,
          parse_status: latest.parse_status,
          parse_progress: latest.parse_progress,
        });
        if (latest.parse_status === 'parsing' || latest.parse_status === 'pending') {
          pollFileStatus(latest.file_id);
        }
      } else {
        setUploadedFile(null);
      }
    } catch (err) {
      if (sessionIdRef.current !== sessionId) return;
      console.error('加载会话文件失败:', err);
      setUploadedFile(null);
    }
  };

  const loadSessionAnalyze = async (sessionId) => {
    try {
      const data = await getSessionAnalyze(sessionId);
      if (sessionIdRef.current !== sessionId) return; // 防竞态
      if (data.analyze) {
        setAnalyzeResult(data.analyze);
        if (data.analyze.status === 'queued' || data.analyze.status === 'analyzing') {
          setAnalyzing(true);
          pollAnalyzeStatus(data.analyze.analyze_id);
        } else {
          setAnalyzing(false);
        }
      } else {
        setAnalyzeResult(null);
        setAnalyzing(false);
      }
    } catch (err) {
      if (sessionIdRef.current !== sessionId) return;
      console.error('加载会话分析状态失败:', err);
      setAnalyzeResult(null);
      setAnalyzing(false);
    }
  };

  // ==================== 事件处理 ====================
  const handleCreateSession = async () => {
    try {
      const data = await createSession();
      setSessions([data, ...sessions]);
      setCurrentSession(data);
      setRecords([]);
      messageApi.success('新会话已创建');
    } catch (err) {
      messageApi.error('创建会话失败');
    }
  };

  const handleDeleteSession = (sessionId, e) => {
    e.stopPropagation();
    modal.confirm({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这个会话吗？',
      okText: '删除', okType: 'danger', cancelText: '取消',
      onOk: async () => {
        try {
          await deleteSession(sessionId);
          const newSessions = sessions.filter(s => s.session_id !== sessionId);
          setSessions(newSessions);
          if (currentSession?.session_id === sessionId) {
            setCurrentSession(newSessions.length > 0 ? newSessions[0] : null);
            setRecords([]);
          }
          messageApi.success('会话已删除');
        } catch (err) {
          messageApi.error('删除会话失败');
        }
      },
    });
  };

  // ==================== 文件上传处理（FE-2）====================
  const handleUpload = async (file) => {
    if (!currentSession) { messageApi.warning('请先创建一个会话'); return false; }
    const allowed = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowed.includes(file.type)) {
      messageApi.error('仅支持 PDF/DOC/DOCX 文件'); return false;
    }
    if (file.size > 100 * 1024 * 1024) {
      messageApi.error('文件不超过 100MB'); return false;
    }
    setUploading(true);
    try {
      const data = await uploadFile(currentSession.session_id, file);
      if (data.error) { messageApi.error(data.error.message || '上传失败'); return false; }
      setUploadedFile({ file_id: data.file_id, file_name: data.file_name, parse_status: 'pending', parse_progress: 0 });
      messageApi.success(`${data.file_name} 上传成功`);
      // 轮询解析进度
      pollFileStatus(data.file_id);
      loadSessions();
    } catch (err) {
      messageApi.error('上传失败: ' + (err.message || ''));
    } finally {
      setUploading(false);
    }
    return false; // 阻止 antd 默认上传
  };

  const pollFileStatus = (fileId) => {
    if (fileTimerRef.current) clearInterval(fileTimerRef.current);
    const timer = setInterval(async () => {
      if (sessionIdRef.current === null) { clearInterval(timer); fileTimerRef.current = null; return; }
      try {
        const data = await getFileStatus(fileId);
        setUploadedFile(prev => prev && prev.file_id === fileId ? { ...prev, parse_status: data.parse_status, parse_progress: data.parse_progress } : prev);
        if (data.parse_status === 'done' || data.parse_status === 'failed') {
          clearInterval(timer);
          fileTimerRef.current = null;
          if (data.parse_status === 'done') messageApi.success('文件解析完成');
          else messageApi.error('文件解析失败');
        }
      } catch { clearInterval(timer); fileTimerRef.current = null; }
    }, 1000);
    fileTimerRef.current = timer;
  };

  // ==================== 深度分析处理（FE-5）====================
  const handleTriggerAnalyze = async () => {
    if (!currentSession || !uploadedFile?.file_id) {
      messageApi.warning('请先上传文件'); return;
    }
    if (uploadedFile.parse_status !== 'done') {
      messageApi.warning('请等待文件解析完成'); return;
    }
    setAnalyzing(true);
    setAnalyzeResult(null);
    try {
      const data = await triggerAnalyze(currentSession.session_id, uploadedFile.file_id);
      // 轮询分析状态
      pollAnalyzeStatus(data.analyze_id);
    } catch (err) {
      messageApi.error('触发分析失败');
      setAnalyzing(false);
    }
  };

  const pollAnalyzeStatus = (analyzeId) => {
    if (analyzeTimerRef.current) clearInterval(analyzeTimerRef.current);
    const timer = setInterval(async () => {
      if (sessionIdRef.current === null) { clearInterval(timer); analyzeTimerRef.current = null; setAnalyzing(false); return; }
      try {
        const data = await getAnalyzeStatus(analyzeId);
        setAnalyzeResult(data);
        if (data.status === 'completed' || data.status === 'failed') {
          clearInterval(timer);
          analyzeTimerRef.current = null;
          setAnalyzing(false);
          if (data.status === 'completed') {
            messageApi.success('深度分析完成');
            setShowReport(true);
          } else {
            messageApi.error('分析失败: ' + (data.error || ''));
          }
        }
      } catch { clearInterval(timer); analyzeTimerRef.current = null; setAnalyzing(false); }
    }, 1500);
    analyzeTimerRef.current = timer;
  };

  const handleSend = async () => {
    if (!query.trim()) { messageApi.warning('请输入问题'); return; }
    if (!currentSession) { messageApi.warning('请先创建或选择一个会话'); return; }
    if (query.length > 500) { messageApi.warning('问题过长，最多500字符'); return; }

    setLoading(true);
    try {
      const data = await ask(query, currentSession.session_id, uploadedFile?.file_id, currentProvider);
      const newRecord = {
        id: Date.now().toString(), query,
        answer: data.answer, llm_used: data.llm_used, model: data.model,
        answer_source: data.answer_source, response_time_ms: data.response_time_ms,
        timestamp: new Date().toISOString(),
      };
      setRecords(prev => [...prev, newRecord]);
      setQuery('');
      loadSessions();
    } catch (err) {
      messageApi.error(err.message || '发送失败');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ==================== 辅助函数 ====================
  const getSourceTag = (source) => {
    switch (source) {
      case 'copaw': return <Tag icon={<CloudOutlined />} color="blue">CoPaw</Tag>;
      case 'bailian': return <Tag icon={<ExperimentOutlined />} color="green">百炼</Tag>;
      case 'demo': return <Tag icon={<DesktopOutlined />} color="default">离线演示</Tag>;
      default: return <Tag color="default">{source}</Tag>;
    }
  };

  const getCapabilityTag = () => {
    if (capabilities.copaw_configured) return <Tag color="blue">CoPaw 已连接</Tag>;
    if (capabilities.bailian_configured) return <Tag color="green">百炼 已连接</Tag>;
    return <Tag color="default">离线演示</Tag>;
  };

  const faqQuestions = [
    { icon: '📊', text: '如何分析财报' },
    { icon: '⭐', text: '评级说明什么' },
    { icon: '🎯', text: '目标价怎么看' },
    { icon: '📈', text: '行业对比方法' },
    { icon: '💰', text: '估值指标解读' },
    { icon: '⚠️', text: '风险提示' },
  ];

  // ==================== 渲染 ====================
  return (
    <Layout style={{ height: '100vh' }}>
      {/* Header — 对齐 Spec 06 §2 */}
      <Header className="ira-header">
        <Space align="center">
          <RobotOutlined style={{ fontSize: 22, color: '#00e5ff' }} />
          <Title level={4} style={{ margin: 0, color: '#fff' }}>M5-RA · 研报智能分析助手</Title>
        </Space>
        <Space>
          {/* 模型切换 — 对齐 Spec 06 §7 大模型切换组件 */}
          <Select
            value={currentProvider}
            onChange={setCurrentProvider}
            style={{ minWidth: 140 }}
            size="small"
            options={providers.map(p => ({
              value: p.id, label: p.name, disabled: !p.available,
            }))}
            placeholder="选择模型"
          />
          {getCapabilityTag()}
        </Space>
      </Header>

      <Layout>
        {/* Sidebar — 对齐 Spec 06 §3 会话管理 */}
        <Sider width={280} className="ira-sider" theme="light">
          <div style={{ padding: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} block size="large" onClick={handleCreateSession}>
              新建会话
            </Button>
          </div>
          <div className="session-list">
            {sessions.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无会话" />
            ) : (
              sessions.map(session => (
                <div
                  key={session.session_id}
                  className={`session-item ${currentSession?.session_id === session.session_id ? 'active' : ''}`}
                  onClick={() => setCurrentSession(session)}
                >
                  <div className="session-item-content">
                    <MessageOutlined style={{ color: '#00e5ff', marginRight: 8, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text ellipsis strong style={{ display: 'block', fontSize: 13 }}>{session.title}</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>{session.query_count} 条对话</Text>
                    </div>
                    <Tooltip title="删除会话">
                      <Button type="text" size="small" danger icon={<DeleteOutlined />} className="delete-btn"
                        onClick={(e) => handleDeleteSession(session.session_id, e)} />
                    </Tooltip>
                  </div>
                </div>
              ))
            )}
          </div>
        </Sider>

        {/* Main Content — 对齐 Spec 06 §4 内容区三态 */}
        <Content className="ira-content">
          {!currentSession ? (
            /* 空状态 */
            <div className="center-placeholder">
              <Empty
                image={<RobotOutlined style={{ fontSize: 64, color: '#00e5ff', filter: 'drop-shadow(0 0 16px rgba(0,229,255,0.4))' }} />}
                description={
                  <Space direction="vertical" size={4}>
                    <Text type="secondary" style={{ fontSize: 16 }}>欢迎使用研报智能分析助手</Text>
                    <Text type="secondary">请创建或选择一个会话开始</Text>
                  </Space>
                }
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateSession}>创建新会话</Button>
              </Empty>
            </div>
          ) : records.length === 0 && !loading ? (
            /* FAQ 常见问题 — 对齐 Spec 06 §4.3 */
            <div className="faq-container">
              <div className="faq-header">
                <QuestionCircleOutlined style={{ fontSize: 20, color: '#00e5ff' }} />
                <Title level={5} style={{ margin: 0 }}>试试问我这些问题</Title>
              </div>
              <div className="faq-grid">
                {faqQuestions.map((q, i) => (
                  <Card key={i} hoverable size="small" className="faq-card" onClick={() => setQuery(q.text)}>
                    <Space><span style={{ fontSize: 20 }}>{q.icon}</span><Text>{q.text}</Text></Space>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            /* 对话历史 */
            <div className="chat-history">
              {records.map(record => (
                <div key={record.id} className="message-group">
                  <div className="message user-message">
                    <div className="user-bubble"><Text style={{ color: '#fff' }}>{record.query}</Text></div>
                    <div className="avatar user-avatar"><UserOutlined /></div>
                  </div>
                  <div className="message ai-message">
                    <div className="avatar ai-avatar"><RobotOutlined /></div>
                    <div className="ai-bubble">
                      <div className="ai-meta">
                        {getSourceTag(record.answer_source)}
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(record.timestamp).toLocaleTimeString()}
                          {record.response_time_ms && ` · ${record.response_time_ms}ms`}
                        </Text>
                      </div>
                      <div className="ai-answer markdown-body">
                        <ReactMarkdown>{record.answer}</ReactMarkdown>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="message ai-message">
                  <div className="avatar ai-avatar"><RobotOutlined /></div>
                  <div className="ai-bubble loading-bubble">
                    <Spin size="small" /><Text type="secondary" style={{ marginLeft: 8 }}>思考中...</Text>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* 深度分析报告弹窗（FE-5） */}
          <Modal
            title="深度分析报告"
            open={showReport}
            onCancel={() => setShowReport(false)}
            footer={null}
            width={720}
            styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
          >
            {analyzeResult?.result ? (
              <div className="report-content markdown-body">
                <ReactMarkdown>{analyzeResult.result}</ReactMarkdown>
              </div>
            ) : <Empty description="暂无报告数据" />}
          </Modal>

          {/* 输入区域 — 对齐 Spec 06 §5 */}
          {currentSession && (
            <div className="input-area">
              {/* 文件上传状态条（FE-2） */}
              {uploadedFile && (
                <div className="file-status-bar">
                  <Space>
                    <UploadOutlined />
                    <Text ellipsis style={{ maxWidth: 200 }}>{uploadedFile.file_name}</Text>
                    {uploadedFile.parse_status === 'parsing' && (
                      <Progress percent={uploadedFile.parse_progress} size="small" style={{ width: 120 }} />
                    )}
                    {uploadedFile.parse_status === 'done' && <Tag color="success">解析完成</Tag>}
                    {uploadedFile.parse_status === 'failed' && <Tag color="error">解析失败</Tag>}
                    {uploadedFile.parse_status === 'pending' && <Tag>等待解析</Tag>}
                  </Space>
                  <Button type="text" size="small" danger icon={<DeleteOutlined />}
                    onClick={() => setUploadedFile(null)} />
                </div>
              )}
              <div className="input-wrapper">
                {/* 文件上传按钮（FE-2） */}
                <Upload
                  beforeUpload={handleUpload}
                  showUploadList={false}
                  accept=".pdf,.doc,.docx"
                  disabled={uploading}
                >
                  <Tooltip title="上传研报文件（PDF/Word）">
                    <Button className="action-btn upload-btn" icon={<UploadOutlined />} loading={uploading}>上传</Button>
                  </Tooltip>
                </Upload>
                <TextArea
                  value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={handleKeyDown}
                  placeholder="请输入您的投研问题，按 Enter 发送，Shift+Enter 换行..."
                  autoSize={{ minRows: 2, maxRows: 5 }} maxLength={500} showCount
                  disabled={loading} style={{ resize: 'none' }}
                />
                <Button className="action-btn send-btn" type="primary" icon={<SendOutlined />} loading={loading}
                  disabled={!query.trim()} onClick={handleSend}>
                  发送
                </Button>
                {/* 深度分析按钮（FE-5） */}
                <Tooltip title={!uploadedFile?.file_id ? '请先上传文件' : uploadedFile.parse_status !== 'done' ? '等待文件解析完成' : '基于研报生成深度分析报告'}>
                  <Button
                    className={`action-btn analyze-btn ${uploadedFile?.parse_status === 'done' ? 'analyze-ready' : ''}`}
                    icon={<ThunderboltOutlined />}
                    loading={analyzing}
                    disabled={!uploadedFile?.file_id || uploadedFile.parse_status !== 'done' || analyzing}
                    onClick={handleTriggerAnalyze}
                  >
                    深度分析
                  </Button>
                </Tooltip>
              </div>
              {/* 分析进度条 */}
              {analyzing && analyzeResult && (
                <Progress percent={analyzeResult.progress || 0} status="active" style={{ marginTop: 8 }} />
              )}
              {/* 查看报告入口 */}
              {analyzeResult?.status === 'completed' && !showReport && (
                <div style={{ marginTop: 8, textAlign: 'center' }}>
                  <Button type="link" icon={<ExperimentOutlined />} onClick={() => setShowReport(true)}>
                    查看深度分析报告
                  </Button>
                </div>
              )}
            </div>
          )}
        </Content>
      </Layout>
    </Layout>
  );
}

export default function App() {
  return (
    <ConfigProvider locale={zhCN} theme={{
      algorithm: theme.darkAlgorithm,
      token: {
        colorPrimary: '#00e5ff',
        colorBgContainer: '#111827',
        colorBgElevated: '#1e2a42',
        colorBgLayout: '#0a0e1a',
        colorBorder: 'rgba(0, 229, 255, 0.12)',
        colorText: '#e8eaf6',
        colorTextSecondary: '#90a4ae',
        borderRadius: 10,
        fontFamily: "'Noto Sans SC', -apple-system, BlinkMacSystemFont, sans-serif",
      },
    }}>
      <AntApp>
        <M5RAApp />
      </AntApp>
    </ConfigProvider>
  );
}
