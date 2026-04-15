/**
 * App 主应用壳 — 双角色状态管理 + 视图路由
 * 角色：researcher（研究员）/ compliance（合规审核员）
 *
 * 后端状态：pending → reviewing → passed / failed / warning
 * 前端映射：pending → reviewing → completed → (前端合规流程) submitted → approved / rejected
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { api, pollReviewStatus } from './api';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import ReviewSetup from './components/ReviewSetup';
import ReviewReport from './components/ReviewReport';
import UploadModal from './components/UploadModal';
import DocumentDrawer from './components/DocumentDrawer';

const layout = {
  shell: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #f5f5f7 0%, #ebebed 100%)',
  },
  body: {
    display: 'flex', gap: '16px',
    maxWidth: '1400px', margin: '0 auto',
    padding: '16px 20px',
    minHeight: 'calc(100vh - 64px)',
  },
  main: {
    flex: 1, background: 'rgba(255, 255, 255, 0.72)',
    backdropFilter: 'saturate(180%) blur(20px)',
    WebkitBackdropFilter: 'saturate(180%) blur(20px)',
    borderRadius: '16px',
    border: '0.5px solid rgba(0, 0, 0, 0.06)',
    overflow: 'hidden', display: 'flex', flexDirection: 'column',
    animation: 'fadeIn 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.1s both',
  },
  welcome: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', padding: '60px 40px',
  },
  welcomeIcon: {
    width: '64px', height: '64px', borderRadius: '18px',
    background: 'linear-gradient(135deg, #0071e3, #007aff)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '28px', marginBottom: '20px',
    boxShadow: '0 4px 16px rgba(0, 113, 227, 0.2)',
  },
  welcomeTitle: {
    fontSize: '20px', fontWeight: 600, color: '#1d1d1f',
    letterSpacing: '-0.03em', marginBottom: '8px',
  },
  welcomeDesc: {
    fontSize: '14px', color: '#86868b', textAlign: 'center',
    lineHeight: 1.7, maxWidth: '340px', letterSpacing: '-0.01em',
  },
};

export default function App() {
  const [role, setRole] = useState('researcher');
  const [reports, setReports] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [aiAvailable, setAiAvailable] = useState(true);
  const [reviewing, setReviewing] = useState(false);
  const [reviewProgress, setReviewProgress] = useState(null); // { progress, currentStep }
  const [reviewResult, setReviewResult] = useState(null);
  const [previousResult, setPreviousResult] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  /* 文档预览抽屉状态 */
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerLocation, setDrawerLocation] = useState(null);

  /* 前端合规流程状态（后端不支持，纯前端管理） */
  const complianceMapRef = useRef(new Map()); // reportId → { status, note }

  /* ── 初始化 ── */
  const refreshReports = useCallback(async () => {
    try {
      const list = await api.getReports();
      /* 叠加前端合规状态 */
      const map = complianceMapRef.current;
      list.forEach((r) => {
        const c = map.get(r.id);
        if (c) {
          r.status = c.status;
          r.complianceNote = c.note || null;
        }
      });
      setReports(list);
    } catch (err) {
      console.error('刷新列表失败:', err);
    }
  }, []);

  useEffect(() => {
    refreshReports();
  }, [refreshReports]);

  /* ── 切换角色时清空选中状态 ── */
  const handleRoleChange = useCallback((newRole) => {
    setRole(newRole);
    setSelectedId(null);
    setReviewResult(null);
    setPreviousResult(null);
    setUploadError(null);
  }, []);

  const selectedReport = reports.find(r => r.id === selectedId);

  /* ── 选中研报 → 自动加载审核结果 ── */
  const handleSelect = useCallback(async (id) => {
    setSelectedId(id);
    setReviewResult(null);
    setPreviousResult(null);
    setUploadError(null);
    setReviewProgress(null);
    const report = reports.find(r => r.id === id);
    /* 已完成/已提交/已通过/已驳回 都可查看审核结果 */
    if (report && ['completed', 'submitted', 'approved', 'rejected'].includes(report.status)) {
      try {
        const res = await api.getReviewResult(report.reviewId || id);
        setReviewResult(res);
      } catch { /* ignore */ }
    }
  }, [reports]);

  /* ── 上传研报 + 发起审核（一步完成，对接后端 POST /reviews） ── */
  const handleUploadAndReview = useCallback(async (file, mode, reportType) => {
    setUploadError(null);
    /* 后端一步完成上传+发起审核 */
    const data = await api.createReview(file, mode, reportType);
    const reviewId = data.id;
    setSelectedId(reviewId);
    setReviewResult(null);
    setPreviousResult(null);
    setReviewing(true);
    setReviewProgress({ progress: 0, currentStep: '正在提交…' });
    try {
      /* 轮询审核进度 */
      await pollReviewStatus(reviewId, (s) => {
        setReviewProgress({ progress: s.progress, currentStep: s.currentStep });
      });
      /* 审核完成，拉取详情 */
      const result = await api.getReviewResult(reviewId);
      setReviewResult(result);
      await refreshReports();
    } catch (err) {
      setUploadError(err.message);
      await refreshReports();
    } finally {
      setReviewing(false);
      setReviewProgress(null);
    }
  }, [refreshReports]);

  /* ── 从 ReviewSetup 发起审核（已上传但 pending 的研报） ── */
  const handleStartReview = useCallback(async (mode) => {
    if (!selectedId) return;
    const report = reports.find(r => r.id === selectedId);
    if (!report) return;
    // 注意：后端 POST /reviews 创建时已自动启动审核
    // 这里处理的是查看已存在但 pending 状态的研报，直接轮询
    setReviewing(true);
    setReviewProgress({ progress: 0, currentStep: '等待审核…' });
    try {
      await pollReviewStatus(selectedId, (s) => {
        setReviewProgress({ progress: s.progress, currentStep: s.currentStep });
      });
      const result = await api.getReviewResult(selectedId);
      setReviewResult(result);
      await refreshReports();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setReviewing(false);
      setReviewProgress(null);
    }
  }, [selectedId, reports, refreshReports]);

  /* ── 重新上传修改版 → 新建审核 ── */
  const handleReupload = useCallback(async (file) => {
    if (!selectedId) return;
    setUploading(true);
    setUploadError(null);
    try {
      setPreviousResult(reviewResult);
      const mode = reviewResult?.reviewMode || 'rule';
      /* 重新上传 = 新建一条审核记录 */
      const data = await api.createReview(file, mode);
      const newId = data.id;
      setSelectedId(newId);
      setReviewing(true);
      setReviewProgress({ progress: 0, currentStep: '正在重新审核…' });
      /* 清除旧的合规状态 */
      complianceMapRef.current.delete(selectedId);
      await pollReviewStatus(newId, (s) => {
        setReviewProgress({ progress: s.progress, currentStep: s.currentStep });
      });
      const newResult = await api.getReviewResult(newId);
      setReviewResult(newResult);
      await refreshReports();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
      setReviewing(false);
      setReviewProgress(null);
    }
  }, [selectedId, reviewResult, refreshReports]);

  /* ── 研究员：提交合规审核（纯前端状态流转） ── */
  const handleSubmitCompliance = useCallback(async (reportId) => {
    complianceMapRef.current.set(reportId, { status: 'submitted', note: null });
    setReports((prev) =>
      prev.map((r) => r.id === reportId ? { ...r, status: 'submitted' } : r)
    );
  }, []);

  /* ── 合规审核员：同意（纯前端状态流转） ── */
  const handleApprove = useCallback(async (reportId, note) => {
    complianceMapRef.current.set(reportId, { status: 'approved', note: note || '合规通过' });
    setReports((prev) =>
      prev.map((r) => r.id === reportId
        ? { ...r, status: 'approved', complianceNote: note || '合规通过' }
        : r
      )
    );
  }, []);

  /* ── 合规审核员：驳回（纯前端状态流转） ── */
  const handleReject = useCallback(async (reportId, note) => {
    const reason = note || '存在合规问题，请修改后重新提交';
    complianceMapRef.current.set(reportId, { status: 'rejected', note: reason });
    setReports((prev) =>
      prev.map((r) => r.id === reportId
        ? { ...r, status: 'rejected', complianceNote: reason }
        : r
      )
    );
  }, []);

  /* ── 切换 AI 服务（前端演示用） ── */
  const handleToggleAi = useCallback(() => {
    setAiAvailable((prev) => !prev);
  }, []);

  /* ── 打开文档预览抽屉 ── */
  const handleOpenDocument = useCallback(() => {
    setDrawerLocation(null);
    setDrawerOpen(true);
  }, []);

  /* ── 点击问题定位到文档位置 ── */
  const handleLocateInDocument = useCallback((location) => {
    setDrawerLocation(location);
    if (!drawerOpen) setDrawerOpen(true);
  }, [drawerOpen]);

  /* ── 决定主区域视图 ── */
  const renderMain = () => {
    if (!selectedReport) {
      return (
        <div style={layout.welcome}>
          <div style={layout.welcomeIcon}>📋</div>
          <div style={layout.welcomeTitle}>
            {role === 'researcher' ? '研报合规审核' : '合规审批'}
          </div>
          <div style={layout.welcomeDesc}>
            {role === 'researcher'
              ? <>从左侧选择一份研报，或上传新文件开始审核。<br />支持 PDF / DOCX 格式，≤ 20 MB。</>
              : <>从左侧选择一份待审批研报，<br />查看审核结果后进行同意或驳回操作。</>
            }
          </div>
        </div>
      );
    }

    /* 有审核结果的状态 → 展示报告（双角色都可看） */
    if (reviewResult && ['completed', 'submitted', 'approved', 'rejected'].includes(selectedReport.status)) {
      return (
        <ReviewReport
          result={reviewResult}
          previousResult={previousResult}
          report={selectedReport}
          role={role}
          onReupload={handleReupload}
          onSubmitCompliance={handleSubmitCompliance}
          onApprove={handleApprove}
          onReject={handleReject}
          onOpenDocument={handleOpenDocument}
          onLocateInDocument={handleLocateInDocument}
        />
      );
    }

    /* 研究员：待审核 / 审核中 → 模式选择 + 发起审核 */
    if (role === 'researcher') {
      return (
        <ReviewSetup
          report={selectedReport}
          aiAvailable={aiAvailable}
          reviewing={reviewing}
          onStartReview={handleStartReview}
        />
      );
    }

    /* 合规审核员选中了无结果的研报 */
    return (
      <div style={layout.welcome}>
        <div style={layout.welcomeIcon}>📋</div>
        <div style={layout.welcomeTitle}>暂无审核结果</div>
        <div style={layout.welcomeDesc}>该研报尚未完成审核</div>
      </div>
    );
  };

  return (
    <div style={layout.shell}>
      <Header
        aiAvailable={aiAvailable} onToggleAi={handleToggleAi}
        role={role} onRoleChange={handleRoleChange}
      />
      <div style={layout.body}>
        <Sidebar
          reports={reports}
          selectedId={selectedId}
          onSelect={handleSelect}
          onOpenUpload={() => setShowUploadModal(true)}
          role={role}
        />
        <main style={layout.main}>
          {renderMain()}
        </main>
      </div>
      <UploadModal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        aiAvailable={aiAvailable}
        onUploadAndReview={handleUploadAndReview}
      />
      <DocumentDrawer
        open={drawerOpen}
        onClose={() => { setDrawerOpen(false); setDrawerLocation(null); }}
        fileUrl={selectedId ? api.getFileUrl(selectedId) : ''}
        fileName={selectedReport?.name}
        fileType={selectedReport?.fileType}
        targetLocation={drawerLocation}
      />
    </div>
  );
}
