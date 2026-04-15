/**
 * Header — 品牌标题 + 能力状态芯片 + 健康指示灯。
 * 对齐 TASK-12, 06 §2。
 */

function Header({ healthStatus, capabilities, children }) {
  // ── 能力芯片渲染（对齐 06 §2.1） ──
  const renderChips = () => {
    if (!capabilities) {
      return <span className="chip chip-gray">加载中…</span>;
    }

    const chips = [];
    const caps = capabilities.caps || capabilities;

    if (caps.copaw_configured) {
      chips.push(
        <span key="copaw" className="chip chip-green">
          CoPaw 桥接
        </span>
      );
    }
    if (caps.bailian_configured) {
      chips.push(
        <span key="bailian" className="chip chip-blue">
          百炼 · {caps.model || "qwen-turbo"}
        </span>
      );
    }
    if (chips.length === 0) {
      chips.push(
        <span key="offline" className="chip chip-gray">
          离线演示
        </span>
      );
    }

    return chips;
  };

  // ── 健康指示灯颜色（对齐 06 §2.2） ──
  const dotColor =
    healthStatus === "UP"
      ? "green"
      : healthStatus === "DEGRADED"
      ? "yellow"
      : "red";

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="brand">
          <div className="brand-icon">📊</div>
          <div className="brand-text">
            <span className="brand-name">投研问答助手</span>
            <span className="brand-sub">Investment Research AI</span>
          </div>
        </div>
        {children}
      </div>
      <div className="header-right">
        {renderChips()}
        <span
          className={`health-dot ${dotColor}`}
          title={`健康状态: ${healthStatus}`}
        />
      </div>
    </header>
  );
}

export default Header;
