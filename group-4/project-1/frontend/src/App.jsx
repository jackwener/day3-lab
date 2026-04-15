/**
 * 投研问答助手 v2.0 — 性能优化版
 * 核心修复: ChatInput 独立组件隔离输入状态，避免全局重渲染
 */
import { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef, memo } from 'react';
import {
  Plus, Trash2, Send, X, ChevronRight,
  FileText, BarChart3, TrendingUp, Microscope, Bot,
  Upload, Sparkles, Zap, Building2, Calendar,
  Target, AlertTriangle, ArrowUpRight, ArrowDownRight,
  Copy, Pencil, Check, RefreshCw, PanelRightOpen,
  MessageSquare, Clock, Activity, Layers,
  Star, Info, Search, Hash,
} from 'lucide-react';
import * as api from './api';

// ==================== 常量配置 ====================
const INVESTMENT_ANALYST_PROMPT = `你是一位拥有15年以上经验的资深投资研究分析师，就职于顶级证券研究机构。你精通：
- 宏观经济分析（PEST、宏观周期、货币政策、财政政策）
- 行业趋势研判（波特五力、行业生命周期、赛道竞争格局）
- 公司基本面分析（财务报表分析、护城河评估、管理层评价）
- 估值模型解读（DCF、PE/PB/PS、EV/EBITDA、PEG等）
- 投资策略建议（价值投资、成长投资、事件驱动等）

回答要求：逻辑清晰，使用专业框架（SWOT/PEST/波特五力），数据导向，多角度呈现。
回答末尾附带：⚠️ 风险提示：本分析仅供参考，不构成投资建议。投资有风险，入市需谨慎。`;

const BUILTIN_AGENTS = [
  { id:'report-parser',     name:'研报解析',  Icon:FileText,   color:'blue', description:'上传研报文件，AI自动提取评级、目标价、财务预测等关键信息', type:'file-upload',       accepts:'.pdf,.docx,.doc,.html,.htm', maxFiles:1, maxSize:50*1024*1024 },
  { id:'report-compare',    name:'研报对比',  Icon:BarChart3,  color:'blue', description:'上传2~5份研报，生成多维度横向对比分析表', type:'multi-file-upload', accepts:'.pdf,.docx,.doc,.html,.htm', maxFiles:5, minFiles:2, maxSize:50*1024*1024 },
  { id:'market-data',       name:'实时行情',  Icon:TrendingUp, color:'emerald',description:'自然语言查询个股、指数实时行情与涨跌幅', type:'market-query' },
  { id:'investment-analyst',name:'投研分析',  Icon:Microscope, color:'amber',  description:'资深投研分析师视角，宏观/行业/个股深度解析', type:'system-prompt', systemPrompt:INVESTMENT_ANALYST_PROMPT },
];

const COLORS = {
  blue:  { ring:'ring-blue-500/40',  bg:'bg-blue-500/10', text:'text-blue-400',  icon:'text-blue-400',  badge:'bg-blue-500/20 text-blue-300',  border:'border-blue-200' },
  emerald: { ring:'ring-emerald-500/40', bg:'bg-emerald-500/10',text:'text-emerald-400', icon:'text-emerald-400', badge:'bg-emerald-500/20 text-emerald-300', border:'border-emerald-200' },
  amber:   { ring:'ring-amber-500/40',   bg:'bg-amber-500/10',  text:'text-amber-400',   icon:'text-amber-400',   badge:'bg-amber-500/20 text-amber-300',   border:'border-amber-200' },
  custom:  { ring:'ring-sky-500/40',     bg:'bg-sky-500/10',    text:'text-sky-400',     icon:'text-sky-400',     badge:'bg-sky-500/20 text-sky-300',       border:'border-sky-200' },
};

const PRESET_EMOJIS = ['🤖','💡','📝','🔍','⚡','🎯','📌','🌟','💰','📉','🏦','🔑','💎','🚀','🧩','🎪','🔮','⚙️'];
const SUGGESTED = [
  { q:'上传研报，自动提取评级、目标价与财务预测', agentId:'report-parser', Icon:FileText, color:'blue' },
  { q:'上传多份研报，横向对比各家观点与估值差异', agentId:'report-compare', Icon:BarChart3, color:'blue' },
  { q:'查询贵州茅台今日实时行情', agentId:'market-data', Icon:TrendingUp, color:'emerald' },
  { q:'从投研视角深度分析新能源行业竞争格局', agentId:'investment-analyst', Icon:Microscope, color:'amber' },
];
const RATING_COLORS = { '买入':'text-emerald-400','增持':'text-teal-400','中性':'text-amber-400','减持':'text-orange-400','卖出':'text-rose-400' };
const SOURCE_MAP = {
  copaw:   { label:'CoPaw',   cls:'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  bailian: { label:'千问 AI', cls:'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  demo:    { label:'演示模式', cls:'bg-slate-500/20 text-slate-400 border-slate-500/30' },
};

// ==================== 工具函数 ====================
const fmtTime = iso => iso ? new Date(iso).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}) : '';
const truncate = (s,n=20) => s?.length>n ? s.slice(0,n)+'…' : (s||'新会话');
const fmtVol  = v => { const n=parseInt(v,10);  if(isNaN(n))return v; if(n>=1e8)return(n/1e8).toFixed(2)+'亿股'; if(n>=1e4)return(n/1e4).toFixed(2)+'万股'; return n+'股'; };
const fmtAmt  = v => { const n=parseFloat(v);   if(isNaN(n))return v; if(n>=1e8)return(n/1e8).toFixed(2)+'亿';  if(n>=1e4)return(n/1e4).toFixed(2)+'万';  return n.toFixed(0); };

// ==================== 独立输入组件（核心性能优化）====================
// 将 textarea 状态隔离在此组件内，typing 不再触发 App 全量重渲染
const ChatInput = memo(forwardRef(function ChatInput({ onSubmit, disabled, placeholder }, ref) {
  const [value, setValue]   = useState('');
  const textareaRef         = useRef(null);

  useImperativeHandle(ref, () => ({
    fill: (text) => { setValue(text); textareaRef.current?.focus(); },
    clear: () => setValue(''),
  }));

  const submit = useCallback(() => {
    const trimmed = value.trim();
    if (!trimmed || value.length > 500 || disabled) return;
    onSubmit(trimmed);
    setValue('');
  }, [value, disabled, onSubmit]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  };

  return (
    <div className="flex-shrink-0 px-5 py-4 bg-white border-t border-slate-100">
      <div className="max-w-3xl mx-auto flex gap-3 items-end">
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKey}
            placeholder={placeholder}
            rows={2}
            disabled={disabled}
            className="w-full resize-none px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-300 text-sm text-slate-800 placeholder:text-slate-300 transition-all scrollbar-thin"
          />
          <div className="flex justify-between mt-1.5 px-1">
            <span className={`text-xs ${value.length>500?'text-rose-400 font-medium':'text-slate-300'}`}>{value.length}/500</span>
            {value && <button onClick={()=>setValue('')} className="text-xs text-slate-300 hover:text-slate-500 transition-colors">清空</button>}
          </div>
        </div>
        <button
          onClick={submit}
          disabled={!value.trim()||value.length>500||disabled}
          className="flex-shrink-0 w-11 h-11 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 flex items-center justify-center text-white transition-all duration-200 active:scale-95 shadow-sm shadow-blue-200 disabled:shadow-none mb-8"
        >
          {disabled
            ? <RefreshCw size={16} className="animate-spin text-slate-400"/>
            : <Send size={16}/>
          }
        </button>
      </div>
    </div>
  );
}));

// ==================== 纯展示子组件（全部定义在 App 外部）====================

const SourceBadge = memo(({ source }) => {
  const s = SOURCE_MAP[source] || SOURCE_MAP.demo;
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${s.cls}`}><Sparkles size={10}/>{s.label}</span>;
});

const RatingBadge = memo(({ rating }) => {
  if(!rating) return <span className="text-slate-400">—</span>;
  return <span className={`font-bold ${RATING_COLORS[rating]||'text-slate-400'}`}>{rating}</span>;
});

const ParseCard = memo(({ rec, reportCtx }) => {
  const p = rec.parsed||{};
  const fc = p.financial_forecasts||{};
  const fcItems = [
    ['24营收增速',fc.revenue_growth_2024],['25营收增速',fc.revenue_growth_2025],
    ['24净利润',fc.net_profit_2024],['25净利润',fc.net_profit_2025],
    ['24 PE',fc.pe_2024],['25 PE',fc.pe_2025],['PB',fc.pb],
  ].filter(([,v])=>v);

  return (
    <div className="animate-fade-in-up rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden mb-6">
      <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-blue-50 to-blue-50 border-b border-blue-100/50">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center"><FileText size={16} className="text-blue-600"/></div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-slate-800 text-sm">研报解析结果</div>
          <div className="text-xs text-slate-500 truncate">{rec.filename}</div>
        </div>
        <span className="text-xs text-slate-400">{fmtTime(rec.created_at)}</span>
      </div>

      <div className="grid grid-cols-2 gap-px bg-slate-100 m-5 rounded-xl overflow-hidden border border-slate-100">
        {[
          [Building2,'研报标题',p.title],
          [Building2,'发布机构',p.institution],
          [Calendar, '发布日期',p.publish_date],
          [Hash,     '目标公司',p.target_company],
          [Hash,     '股票代码',p.stock_code],
          [Star,     '评级',   null,<RatingBadge rating={p.rating}/>],
          [Target,   '目标价', p.target_price?`¥ ${p.target_price}`:null],
          [Activity, '报告时股价',p.current_price?`¥ ${p.current_price}`:null],
        ].map(([Icon,label,val,node],i)=>(
          <div key={i} className="flex items-start gap-2.5 bg-white px-3.5 py-3">
            <Icon size={14} className="text-slate-300 mt-0.5 flex-shrink-0"/>
            <div className="min-w-0">
              <div className="text-xs text-slate-400 mb-0.5">{label}</div>
              {node||<div className="text-sm font-medium text-slate-700 truncate">{val||'—'}</div>}
            </div>
          </div>
        ))}
      </div>

      {p.summary&&(
        <div className="px-5 pb-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">核心观点</div>
          <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-3.5">{p.summary}</p>
        </div>
      )}

      {fcItems.length>0&&(
        <div className="px-5 pb-4">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">财务预测</div>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {fcItems.map(([k,v])=>(
              <div key={k} className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="text-xs text-slate-400 mb-1">{k}</div>
                <div className="text-sm font-bold text-slate-800">{v}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {p.risks?.length>0&&(
        <div className="px-5 pb-5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 mb-2"><AlertTriangle size={12}/>风险提示</div>
          <div className="flex flex-wrap gap-2">
            {p.risks.map((r,i)=><span key={i} className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">{r}</span>)}
          </div>
        </div>
      )}

      {reportCtx&&(
        <div className="flex items-center gap-2 px-5 py-3 bg-emerald-50/50 border-t border-emerald-100 text-xs text-emerald-700">
          <Check size={12} className="text-emerald-500"/>解析完成，可在下方继续追问研报内容
        </div>
      )}
    </div>
  );
});

const CompareCard = memo(({ rec }) => {
  const c = rec.comparison||{};
  const rpts = c.reports||[];
  return (
    <div className="animate-fade-in-up rounded-2xl border border-slate-100 bg-white shadow-sm overflow-hidden mb-6">
      <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-blue-50 to-blue-50 border-b border-blue-100/50">
        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center"><BarChart3 size={16} className="text-blue-600"/></div>
        <div>
          <div className="font-semibold text-slate-800 text-sm">研报对比分析</div>
          <div className="text-xs text-slate-500">{c.target_company} · {rec.file_count} 份研报</div>
        </div>
        <span className="ml-auto text-xs text-slate-400">{fmtTime(rec.created_at)}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              {['机构','日期','评级','目标价','24净利润','25净利润','24PE','核心观点'].map(h=>(
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rpts.map((r,i)=>(
              <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-4 py-3 font-semibold text-slate-800 whitespace-nowrap">{r.institution}</td>
                <td className="px-4 py-3 text-slate-500 whitespace-nowrap">{r.publish_date}</td>
                <td className="px-4 py-3 whitespace-nowrap"><RatingBadge rating={r.rating}/></td>
                <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{r.target_price?`¥${r.target_price}`:'—'}</td>
                <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{r.net_profit_2024||'—'}</td>
                <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{r.net_profit_2025||'—'}</td>
                <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{r.pe_2024||'—'}</td>
                <td className="px-4 py-3 text-slate-500 text-xs max-w-[180px]">{r.core_view}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-5 border-t border-slate-100">
        {[
          ['✦ 评级差异',c.rating_summary,'text-blue-600'],
          ['✦ 目标价差异',c.price_summary,'text-blue-600'],
          ['✦ 盈利预测',c.profit_summary,'text-sky-600'],
          ['✦ 观点共识',c.view_consensus,'text-emerald-600'],
          ['✦ 主要分歧',c.view_divergence,'text-amber-600'],
        ].filter(([,v])=>v).map(([label,val,cls])=>(
          <div key={label} className="bg-slate-50 rounded-xl p-3.5">
            <div className={`text-xs font-semibold mb-1 ${cls}`}>{label}</div>
            <p className="text-xs text-slate-600 leading-relaxed">{val}</p>
          </div>
        ))}
        <div className="bg-slate-50 rounded-xl p-3.5 flex gap-6">
          {c.most_bullish&&<div><div className="text-xs font-semibold text-emerald-600 mb-1">最乐观</div><div className="text-sm font-bold text-slate-800">{c.most_bullish}</div></div>}
          {c.most_bearish&&<div><div className="text-xs font-semibold text-rose-500 mb-1">最悲观</div><div className="text-sm font-bold text-slate-800">{c.most_bearish}</div></div>}
        </div>
      </div>
      {c.risk_highlights?.length>0&&(
        <div className="px-5 pb-5 flex items-center gap-2 flex-wrap">
          <AlertTriangle size={12} className="text-amber-400"/>
          {c.risk_highlights.map((r,i)=><span key={i} className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">{r}</span>)}
        </div>
      )}
    </div>
  );
});

const MarketRecord = memo(({ rec }) => (
  <div className="animate-fade-in-up mb-6">
    <div className="flex justify-end mb-2">
      <div className="max-w-[70%] bg-blue-600 text-white px-4 py-3 rounded-2xl rounded-br-md text-sm flex items-center gap-2">
        <Search size={13} className="opacity-70"/>{rec.query}
      </div>
    </div>
    {rec.demo&&<div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-3"><AlertTriangle size={11}/>行情接口暂不可用，以下为演示数据</div>}
    <div className="flex flex-wrap gap-4">
      {(rec.stocks||[]).map((s,i)=>{
        const up=s.change_pct>=0;
        return (
          <div key={i} className={`w-72 rounded-2xl border bg-white shadow-sm overflow-hidden transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${up?'border-red-200':'border-green-200'}`}>
            <div className={`h-1.5 w-full ${up?'bg-gradient-to-r from-red-500 to-red-400':'bg-gradient-to-r from-green-500 to-green-400'}`}/>
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="font-bold text-slate-800 text-base">{s.name}</div>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">{s.code}</div>
                </div>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${up?'bg-red-50':'bg-green-50'}`}>
                  {up?<ArrowUpRight size={20} className="text-red-500"/>:<ArrowDownRight size={20} className="text-green-500"/>}
                </div>
              </div>
              <div className="mb-3">
                <span className="text-3xl font-bold text-slate-900">{s.current}</span>
                <span className={`ml-2 text-base font-semibold ${up?'text-red-500':'text-green-600'}`}>
                  {up?'+':''}{s.change} ({up?'+':''}{s.change_pct}%)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                {[['今开',s.open,''],['昨收',s.prev_close,''],['最高',s.high,'text-red-500'],['最低',s.low,'text-green-600'],['成交量',fmtVol(s.volume),''],['成交额',fmtAmt(s.amount)+'亿','']].map(([k,v,vc])=>(
                  <div key={k} className="flex justify-between">
                    <span className="text-slate-400">{k}</span>
                    <span className={`font-medium text-slate-700 ${vc}`}>{v}</span>
                  </div>
                ))}
              </div>
              {s.date&&<div className="mt-3 text-xs text-slate-300 text-right">{s.date} {s.time}</div>}
            </div>
          </div>
        );
      })}
    </div>
  </div>
));

const QARecord = memo(({ rec }) => (
  <div className="animate-fade-in-up mb-6">
    <div className="flex justify-end mb-3">
      <div className="max-w-[72%] flex flex-col items-end gap-1">
        <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white px-4 py-3 rounded-2xl rounded-br-md text-sm leading-relaxed shadow-sm shadow-blue-200">
          {rec.query}
        </div>
        <span className="text-xs text-slate-400 flex items-center gap-1"><Clock size={10}/>{fmtTime(rec.created_at)}</span>
      </div>
    </div>
    <div className="max-w-[80%]">
      <div className="flex items-center gap-2 mb-2">
        <SourceBadge source={rec.answer_source}/>
        {rec.agent_name&&<span className="text-xs text-blue-400 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">{rec.agent_name}</span>}
      </div>
      <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-md px-5 py-4 shadow-sm">
        <p className="prose-content text-sm text-slate-700">{rec.answer}</p>
      </div>
      {rec.cited_passages?.length>0&&(
        <details className="mt-2 group">
          <summary className="flex items-center gap-1.5 text-xs text-blue-500 cursor-pointer select-none hover:text-blue-700 transition-colors w-fit">
            <Layers size={12}/><span>查看引用来源</span><ChevronRight size={11} className="group-open:rotate-90 transition-transform"/>
          </summary>
          <div className="mt-2 space-y-2">
            {rec.cited_passages.map((p,i)=>(
              <div key={i} className="text-xs border-l-2 border-blue-200 pl-3 py-1 bg-blue-50/50 rounded-r-lg">
                <p className="text-slate-600 mb-1">{p.text}</p>
                <span className="text-slate-400">{p.source_file}{p.page?` · 第${p.page}页`:''}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  </div>
));

// ==================== 主组件 ====================
export default function App() {
  const [sessions,    setSessions]    = useState([]);
  const [curSession,  setCurSession]  = useState(null);
  const [records,     setRecords]     = useState([]);
  const [isSubmitting,setSubmitting]  = useState(false);
  const [caps,        setCaps]        = useState(null);
  const [capsLoading, setCapsLoading] = useState(true);
  const [error,       setError]       = useState(null);
  const [delConfirm,  setDelConfirm]  = useState(null);

  // 智能体面板 — 默认展开
  const [panelOpen,   setPanelOpen]   = useState(true);
  const [agentTab,    setAgentTab]    = useState('builtin');
  const [activeAgent, setActiveAgent] = useState(null);
  const [customAgents,setCustomAgents]= useState([]);

  const [showModal,   setShowModal]   = useState(false);
  const [editingAgent,setEditingAgent]= useState(null);
  const [form,        setForm]        = useState({ name:'', description:'', icon:'🤖', system_prompt:'' });
  const [formErr,     setFormErr]     = useState('');

  const [uploadedFiles,setUploaded]   = useState([]);
  const [isDrag,      setIsDrag]      = useState(false);
  const [isUploading, setUploading]   = useState(false);
  const [reportCtx,   setReportCtx]   = useState(null);

  const endRef      = useRef(null);
  const fileRef     = useRef(null);
  const chatInputRef= useRef(null); // 控制 ChatInput 的 fill / clear

  // ==================== 初始化 ====================
  useEffect(() => { loadCaps(); loadSessions(); loadCustomAgents(); }, []);
  useEffect(() => { if(curSession) loadRecords(curSession.session_id); }, [curSession]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [records]);

  const loadCaps = async () => {
    setCapsLoading(true);
    const r = await api.getCapabilities();
    if (!r.error) setCaps(r);
    setCapsLoading(false);
  };
  const loadSessions = async () => {
    const r = await api.getSessions();
    if (!r.error) {
      setSessions(r.sessions||[]);
      if (r.sessions?.length && !curSession) setCurSession(r.sessions[0]);
    }
  };
  const loadRecords = async id => {
    const r = await api.getRecords(id);
    if (!r.error) {
      const mapped = (r.records||[]).map(x => ({ ...x, _type: x.record_type || 'qa' }));
      setRecords(mapped);
      // 恢复研报上下文：找最后一条解析记录
      const lastParse = [...mapped].reverse().find(x => x._type === 'parse-result');
      if (lastParse) setReportCtx({ text: lastParse.text_preview || '', filename: lastParse.filename });
      else setReportCtx(null);
    } else {
      setRecords([]);
    }
  };
  const loadCustomAgents = async () => {
    const r = await api.getCustomAgents();
    if (!r.error) setCustomAgents(r.agents||[]);
  };

  // ==================== 会话 ====================
  const createSession = async () => {
    const r = await api.createSession();
    if (!r.error) { setSessions(p=>[r,...p]); setCurSession(r); setRecords([]); setReportCtx(null); setUploaded([]); }
    else setError(r.error.message||'创建失败');
  };
  const selectSession = s => { setCurSession(s); setReportCtx(null); setUploaded([]); };
  const deleteSession = async id => {
    const r = await api.deleteSession(id);
    if (!r.error) {
      const next = sessions.filter(s=>s.session_id!==id);
      setSessions(next);
      if (curSession?.session_id===id) { setCurSession(next[0]||null); setRecords([]); }
    } else setError(r.error.message||'删除失败');
    setDelConfirm(null);
  };

  // ==================== 智能体 ====================
  const selectAgent = a => { setActiveAgent(p=>p?.id===a.id?null:a); setUploaded([]); setReportCtx(null); };

  // ==================== 提交（由 ChatInput 回调触发）====================
  const handleSubmit = useCallback(async (text) => {
    if (!curSession) { setError('请先选择或创建会话'); return; }
    setSubmitting(true); setError(null);

    if (activeAgent?.type==='market-query') {
      const r = await api.getMarketData(text, curSession.session_id);
      if (!r.error) {
        setRecords(p=>[...p,{_type:'market-data',id:`m${Date.now()}`,query:text,stocks:r.stocks,demo:r.demo,created_at:new Date().toISOString()}]);
        setSessions(p=>p.map(s=>s.session_id===curSession.session_id?{...s,query_count:(s.query_count||0)+1}:s));
      } else setError(r.error.message||'行情获取失败');
      setSubmitting(false); return;
    }

    const r = await api.ask(text, curSession.session_id, {
      systemPrompt: activeAgent?.systemPrompt||null,
      context: reportCtx?.text||null,
    });
    if (!r.error) {
      setRecords(p=>[...p,{_type:'qa',id:`t${Date.now()}`,query:text,answer:r.answer,answer_source:r.answer_source,cited_passages:r.cited_passages,created_at:new Date().toISOString(),agent_name:activeAgent?.name||null}]);
      setSessions(p=>p.map(s=>s.session_id===curSession.session_id?{...s,query_count:(s.query_count||0)+1}:s));
    } else setError(r.error.message||'提交失败');
    setSubmitting(false);
  }, [curSession, activeAgent, reportCtx]);

  // ==================== 文件上传 ====================
  const handleFiles = fs => setUploaded(Array.from(fs).slice(0, activeAgent?.maxFiles||1));
  const handleDrop  = e  => { e.preventDefault(); setIsDrag(false); handleFiles(e.dataTransfer.files); };
  const handleParse = async () => {
    if (!curSession||!uploadedFiles.length||isUploading) return;
    setUploading(true); setError(null);
    if (activeAgent?.id==='report-parser') {
      const r = await api.parseReport(uploadedFiles[0], curSession.session_id);
      if (!r.error) {
        setRecords(p=>[...p,{_type:'parse-result',id:`p${Date.now()}`,filename:r.filename,parsed:r.parsed,text_preview:r.text_preview,created_at:new Date().toISOString()}]);
        setReportCtx({text:r.text_preview||'',filename:r.filename});
        setUploaded([]);
      } else setError(r.error.message||'解析失败');
    } else {
      const r = await api.compareReports(uploadedFiles, curSession.session_id);
      if (!r.error) {
        setRecords(p=>[...p,{_type:'compare-result',id:`c${Date.now()}`,file_count:r.file_count,comparison:r.comparison,created_at:new Date().toISOString()}]);
        setUploaded([]);
      } else setError(r.error.message||'对比失败');
    }
    setUploading(false);
  };

  // ==================== 自定义智能体 ====================
  const openCreate = () => { setEditingAgent(null); setForm({name:'',description:'',icon:'🤖',system_prompt:''}); setFormErr(''); setShowModal(true); };
  const openEdit   = a => { setEditingAgent(a); setForm({name:a.name,description:a.description||'',icon:a.icon||'🤖',system_prompt:a.system_prompt||''}); setFormErr(''); setShowModal(true); };
  const saveAgent  = async () => {
    if(!form.name.trim()){setFormErr('名称不能为空');return;}
    if(form.name.length>20){setFormErr('名称不超过20字符');return;}
    if(!form.system_prompt.trim()){setFormErr('系统提示词不能为空');return;}
    const r = editingAgent ? await api.updateCustomAgent(editingAgent.agent_id,form) : await api.createCustomAgent(form);
    if(!r.error){await loadCustomAgents();setShowModal(false);}else setFormErr(r.error.message||'保存失败');
  };
  const delCustom  = async id => {
    const r = await api.deleteCustomAgent(id);
    if(!r.error){if(activeAgent?.agent_id===id)setActiveAgent(null);await loadCustomAgents();}else setError(r.error.message);
  };
  const dupAgent   = async a => {
    const r = await api.createCustomAgent({...a,name:a.name.slice(0,17)+'副本'});
    if(!r.error)await loadCustomAgents();
  };

  // ==================== 渲染区块（普通函数，非 JSX 组件）====================

  const renderCapsBadge = () => {
    if (capsLoading) return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-slate-100 text-slate-400 animate-pulse"><RefreshCw size={10}/>加载中</span>;
    if (!caps) return null;
    return (
      <div className="flex items-center gap-2">
        {caps.bailian_configured && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100"><Sparkles size={10}/>千问 · {caps.model||'qwen-turbo'}</span>}
        {!caps.bailian_configured && <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500"><Info size={10}/>演示模式</span>}
      </div>
    );
  };

  const renderUploadZone = () => {
    const isMulti = activeAgent?.type==='multi-file-upload';
    return (
      <div className="px-5 py-4 border-b border-slate-100 bg-white flex-shrink-0">
        <div
          onClick={()=>fileRef.current?.click()}
          onDragOver={e=>{e.preventDefault();setIsDrag(true);}}
          onDragLeave={()=>setIsDrag(false)}
          onDrop={handleDrop}
          className={`relative rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all duration-300 ${isDrag?'border-blue-400 bg-blue-50 scale-[1.01]':'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
        >
          <input ref={fileRef} type="file" accept={activeAgent?.accepts} multiple={isMulti} className="hidden" onChange={e=>handleFiles(e.target.files)}/>
          <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-3 transition-colors ${isDrag?'bg-blue-100':'bg-slate-100'}`}>
            <Upload size={22} className={isDrag?'text-blue-500':'text-slate-400'}/>
          </div>
          <p className="text-sm font-medium text-slate-600 mb-1">{isMulti?'上传 2~5 份研报':'上传研报文件'}</p>
          <p className="text-xs text-slate-400">PDF / Word / HTML · 单文件 ≤ 50MB</p>
        </div>
        {uploadedFiles.length>0&&(
          <div className="mt-3 space-y-2">
            {uploadedFiles.map((f,i)=>(
              <div key={i} className="flex items-center gap-2.5 px-3 py-2.5 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                <FileText size={14} className="text-blue-400 flex-shrink-0"/>
                <span className="flex-1 font-medium text-slate-700 truncate">{f.name}</span>
                <span className="text-xs text-slate-400 flex-shrink-0">{(f.size/1024).toFixed(0)} KB</span>
                <button onClick={()=>setUploaded(p=>p.filter((_,j)=>j!==i))} className="text-slate-300 hover:text-rose-400 transition-colors"><X size={14}/></button>
              </div>
            ))}
            <button onClick={handleParse} disabled={isUploading||(isMulti&&uploadedFiles.length<2)}
              className="mt-1 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-sm font-medium transition-all active:scale-[0.98]">
              {isUploading?<><RefreshCw size={14} className="animate-spin"/>解析中…</>:<><Sparkles size={14}/>{activeAgent?.id==='report-compare'?'开始对比分析':'开始解析研报'}</>}
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderAgentPanel = () => {
    const allBuiltin = BUILTIN_AGENTS;
    const allCustom  = customAgents;

    // 折叠态
    if (!panelOpen) return (
      <div className="w-14 bg-white border-l border-slate-100 flex flex-col items-center pt-3 pb-4 gap-1 flex-shrink-0">
        <button onClick={()=>setPanelOpen(true)} title="展开智能体面板"
          className="w-9 h-9 rounded-xl bg-blue-600 hover:bg-blue-700 flex items-center justify-center mb-3 transition-all active:scale-95 shadow-sm shadow-blue-200">
          <PanelRightOpen size={16} className="text-white"/>
        </button>
        {allBuiltin.map(a=>{
          const c=COLORS[a.color]; const isActive=activeAgent?.id===a.id;
          return (
            <button key={a.id} title={a.name} onClick={()=>selectAgent(a)}
              className={`relative w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${isActive?`${c.bg} ring-2 ${c.ring}`:'hover:bg-slate-100'}`}>
              {isActive&&<span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-blue-500 rounded-r-full"/>}
              <a.Icon size={16} className={isActive?c.icon:'text-slate-400'}/>
            </button>
          );
        })}
        {allCustom.map(a=>{
          const isActive=activeAgent?.agent_id===a.agent_id;
          return (
            <button key={a.agent_id} title={a.name}
              onClick={()=>selectAgent({...a,id:a.agent_id,type:'system-prompt',systemPrompt:a.system_prompt,Icon:Bot,color:'custom'})}
              className={`relative w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all ${isActive?'bg-sky-100 ring-2 ring-sky-500/40':'hover:bg-slate-100'}`}>
              {isActive&&<span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-sky-500 rounded-r-full"/>}
              <span className="text-base leading-none">{a.icon}</span>
            </button>
          );
        })}
      </div>
    );

    // 展开态
    return (
      <div className="w-72 bg-white border-l border-slate-100 flex flex-col flex-shrink-0">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Bot size={16} className="text-blue-500"/>
            <span className="font-semibold text-slate-800 text-sm">智能体</span>
          </div>
          <button onClick={()=>setPanelOpen(false)} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-colors">
            <ChevronRight size={16}/>
          </button>
        </div>

        <div className="flex border-b border-slate-100 px-2 pt-2 flex-shrink-0">
          {[['builtin','内置智能体'],['custom','我的智能体']].map(([val,label])=>(
            <button key={val} onClick={()=>setAgentTab(val)}
              className={`flex-1 flex items-center justify-center gap-1.5 pb-2.5 text-xs font-medium border-b-2 transition-all ${agentTab===val?'border-blue-500 text-blue-600':'border-transparent text-slate-400 hover:text-slate-600'}`}>
              {label}
              {val==='custom'&&allCustom.length>0&&<span className="px-1.5 py-0.5 rounded-full bg-blue-500 text-white text-[10px] leading-none">{allCustom.length}</span>}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-1.5 scrollbar-thin">
          {agentTab==='builtin' && allBuiltin.map(a=>{
            const c=COLORS[a.color]; const isActive=activeAgent?.id===a.id;
            return (
              <button key={a.id} onClick={()=>selectAgent(a)}
                className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all duration-200 ${isActive?`bg-blue-50/80 ${c.border} ring-1 ${c.ring}`:'border-transparent hover:bg-slate-50 hover:border-slate-100'}`}>
                <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5 ${isActive?c.bg:'bg-slate-100'}`}>
                  <a.Icon size={16} className={isActive?c.icon:'text-slate-400'}/>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-slate-800">{a.name}</span>
                    {isActive&&<span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${c.badge}`}>进行中</span>}
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{a.description}</p>
                </div>
              </button>
            );
          })}

          {agentTab==='custom' && (
            <>
              {allCustom.length===0&&(
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-3"><Bot size={18} className="text-slate-300"/></div>
                  <p className="text-xs text-slate-400">暂无自定义智能体</p>
                </div>
              )}
              {allCustom.map(a=>{
                const isActive=activeAgent?.agent_id===a.agent_id;
                return (
                  <div key={a.agent_id}
                    className={`group relative flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-200 ${isActive?'bg-sky-50/80 border-sky-200 ring-1 ring-sky-500/30':'border-transparent hover:bg-slate-50 hover:border-slate-100'}`}
                    onClick={()=>selectAgent({...a,id:a.agent_id,type:'system-prompt',systemPrompt:a.system_prompt,Icon:Bot,color:'custom'})}>
                    <div className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-lg mt-0.5 ${isActive?'bg-sky-100':'bg-slate-100'}`}>{a.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-sm font-semibold text-slate-800">{a.name}</span>
                        {isActive&&<span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-sky-100 text-sky-600">进行中</span>}
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{a.description||'自定义智能体'}</p>
                    </div>
                    <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-0.5" onClick={e=>e.stopPropagation()}>
                      <button onClick={()=>openEdit(a)} className="w-6 h-6 rounded-md hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"><Pencil size={11}/></button>
                      <button onClick={()=>dupAgent(a)} className="w-6 h-6 rounded-md hover:bg-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"><Copy size={11}/></button>
                      <button onClick={()=>delCustom(a.agent_id)} className="w-6 h-6 rounded-md hover:bg-rose-100 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"><Trash2 size={11}/></button>
                    </div>
                  </div>
                );
              })}
              <button onClick={openCreate}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-xs font-medium text-slate-400 hover:text-blue-600 transition-all duration-200 mt-2">
                <Plus size={13}/>创建智能体
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderMainBody = () => {
    if (!curSession) return (
      <div className="flex-1 flex flex-col items-center justify-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
          <MessageSquare size={28} className="text-slate-300"/>
        </div>
        <div className="text-center">
          <p className="text-slate-500 text-base mb-1">选择或创建会话以开始</p>
          <p className="text-slate-400 text-sm">在左侧选择已有会话，或点击新建</p>
        </div>
        <button onClick={createSession} className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-all active:scale-[0.97] shadow-sm shadow-blue-200">
          <Plus size={16}/>新建会话
        </button>
      </div>
    );

    const hasRecs    = records.length>0;
    const isFileAgent= activeAgent&&['file-upload','multi-file-upload'].includes(activeAgent.type);

    return (
      <>
        {isFileAgent && renderUploadZone()}
        {!hasRecs && !isFileAgent && (
          <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
            {activeAgent ? (
              <div className="text-center max-w-sm">
                <div className={`w-14 h-14 rounded-2xl ${COLORS[activeAgent.color||'custom'].bg} flex items-center justify-center mx-auto mb-4`}>
                  {activeAgent.Icon ? <activeAgent.Icon size={24} className={COLORS[activeAgent.color||'custom'].icon}/> : <span className="text-2xl">{activeAgent.icon}</span>}
                </div>
                <h2 className="text-lg font-bold text-slate-800 mb-2">{activeAgent.name}</h2>
                <p className="text-sm text-slate-500 leading-relaxed">{activeAgent.description||'自定义智能体，直接提问即可'}</p>
              </div>
            ) : (
              <>
                <p className="text-slate-400 text-sm font-medium mb-4">快速开始</p>
                <div className="grid grid-cols-2 gap-3 w-full max-w-xl">
                  {SUGGESTED.map((item,i)=>{
                    const agent = BUILTIN_AGENTS.find(a=>a.id===item.agentId);
                    const c = COLORS[item.color||'blue'];
                    return (
                      <button key={i}
                        onClick={()=>{
                          if(agent) selectAgent(agent);
                          // 文件上传类智能体不填充输入框
                          if(agent && !['file-upload','multi-file-upload'].includes(agent.type)) {
                            setTimeout(()=>chatInputRef.current?.fill(item.q), 100);
                          }
                        }}
                        className="group text-left text-sm bg-white hover:bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-xl px-4 py-3.5 transition-all duration-200 active:scale-[0.98] shadow-xs">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className={`w-6 h-6 rounded-lg ${c.bg} flex items-center justify-center`}>
                            <item.Icon size={13} className={c.icon}/>
                          </div>
                          <span className={`text-xs font-semibold ${c.text}`}>{agent?.name}</span>
                        </div>
                        <p className="text-slate-600 group-hover:text-slate-800 leading-relaxed">{item.q}</p>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
        {hasRecs && (
          <div className="flex-1 overflow-y-auto px-6 py-5 scrollbar-thin">
            {records.map((rec,i) => {
              if (rec._type==='parse-result')   return <ParseCard   key={rec.id||i} rec={rec} reportCtx={reportCtx}/>;
              if (rec._type==='compare-result') return <CompareCard key={rec.id||i} rec={rec}/>;
              if (rec._type==='market-data')    return <MarketRecord key={rec.id||i} rec={rec}/>;
              return <QARecord key={rec.id||i} rec={rec}/>;
            })}
            <div ref={endRef}/>
          </div>
        )}
      </>
    );
  };

  // 输入框 placeholder
  const inputPlaceholder = activeAgent?.type==='market-query'
    ? '查询行情，如"贵州茅台今日股价"、"沪深300今日涨跌"…'
    : activeAgent
      ? `向 ${activeAgent.name} 提问…`
      : '输入问题，Enter 发送，Shift+Enter 换行…';

  // ==================== 主渲染 ====================
  return (
    <div className="h-screen flex flex-col bg-noise font-sans antialiased">
      {/* Header */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-3.5 bg-white/90 backdrop-blur border-b border-slate-100 z-10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm shadow-blue-200">
            <Activity size={16} className="text-white"/>
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-none">投研问答助手</h1>
            <p className="text-[10px] text-slate-400 mt-0.5">Investment Research Assistant</p>
          </div>
          <span className="ml-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-500 border border-blue-100">v2.0</span>
        </div>
        {renderCapsBadge()}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-60 bg-white border-r border-slate-100 flex flex-col flex-shrink-0">
          <div className="p-3">
            <button onClick={createSession}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-all duration-200 active:scale-[0.98] shadow-sm shadow-blue-100">
              <Plus size={15}/>新建会话
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-2 pb-3 scrollbar-thin space-y-0.5">
            {sessions.length===0 ? (
              <p className="text-center text-slate-400 text-xs py-6">暂无会话</p>
            ) : sessions.map(s=>{
              const isActive=curSession?.session_id===s.session_id;
              return (
                <div key={s.session_id} onClick={()=>selectSession(s)}
                  className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${isActive?'bg-blue-50 text-blue-700':'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}>
                  <MessageSquare size={13} className={isActive?'text-blue-500':'text-slate-300'}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{truncate(s.title)}</p>
                    <p className={`text-[10px] mt-0.5 ${isActive?'text-blue-400':'text-slate-400'}`}>{s.query_count||0} 条问答</p>
                  </div>
                  <button onClick={e=>{e.stopPropagation();setDelConfirm(s.session_id);}}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md hover:bg-rose-50 flex items-center justify-center text-slate-300 hover:text-rose-400 transition-all">
                    <Trash2 size={12}/>
                  </button>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 flex flex-col bg-slate-50 overflow-hidden">
          {/* 智能体 Banner */}
          {activeAgent && (
            <div className={`flex-shrink-0 flex items-center gap-3 px-5 py-2.5 border-b ${COLORS[activeAgent.color||'custom'].bg} border-opacity-50`}>
              {activeAgent.Icon
                ? <activeAgent.Icon size={15} className={COLORS[activeAgent.color||'custom'].icon}/>
                : <span className="text-base leading-none">{activeAgent.icon}</span>
              }
              <span className="text-sm font-semibold text-slate-700">{activeAgent.name} 模式</span>
              {reportCtx&&<span className="flex items-center gap-1 text-xs bg-white border border-slate-100 rounded-full px-2.5 py-0.5 text-slate-500"><FileText size={10}/>{reportCtx.filename}</span>}
              <button onClick={()=>{setActiveAgent(null);setReportCtx(null);}} className="ml-auto w-6 h-6 rounded-lg hover:bg-white/60 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors">
                <X size={13}/>
              </button>
            </div>
          )}

          {/* 内容区 */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {renderMainBody()}
          </div>

          {/* 输入框 — 独立组件，不随 App 重渲染 */}
          {curSession && (
            <ChatInput
              ref={chatInputRef}
              onSubmit={handleSubmit}
              disabled={isSubmitting}
              placeholder={inputPlaceholder}
            />
          )}
        </main>

        {/* 右侧智能体面板 */}
        {renderAgentPanel()}
      </div>

      {/* 删除会话确认 */}
      {delConfirm && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-fade-in-up">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center"><Trash2 size={18} className="text-rose-500"/></div>
              <div>
                <p className="font-semibold text-slate-800">确认删除会话？</p>
                <p className="text-xs text-slate-400 mt-0.5">此操作不可撤销</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={()=>setDelConfirm(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors">取消</button>
              <button onClick={()=>deleteSession(delConfirm)} className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-sm font-medium transition-all active:scale-[0.97]">确认删除</button>
            </div>
          </div>
        </div>
      )}

      {/* 创建/编辑智能体弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto scrollbar-thin animate-fade-in-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Bot size={18} className="text-blue-500"/>
                <h3 className="font-bold text-slate-800">{editingAgent?'编辑智能体':'创建自定义智能体'}</h3>
              </div>
              <button onClick={()=>setShowModal(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400"><X size={16}/></button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">图标</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_EMOJIS.map(e=>(
                    <button key={e} onClick={()=>setForm(f=>({...f,icon:e}))}
                      className={`w-9 h-9 rounded-xl text-lg border-2 flex items-center justify-center transition-all ${form.icon===e?'border-blue-500 bg-blue-50 scale-110':'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">名称 <span className="text-rose-400 normal-case">*</span></label>
                <div className="relative">
                  <input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} maxLength={20}
                    placeholder="最多20字符" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 text-sm text-slate-800 transition-all"/>
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-300">{form.name.length}/20</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">描述</label>
                <input value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} maxLength={200}
                  placeholder="选填，最多200字符" className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 text-sm text-slate-800 transition-all"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">系统提示词 <span className="text-rose-400 normal-case">*</span></label>
                <div className="relative">
                  <textarea value={form.system_prompt} onChange={e=>setForm(f=>({...f,system_prompt:e.target.value}))}
                    rows={8} maxLength={5000} placeholder="定义智能体的角色、能力范围、回答风格、约束条件…"
                    className="w-full px-3.5 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 text-sm text-slate-800 resize-none transition-all scrollbar-thin"/>
                  <span className="absolute right-3 bottom-3 text-xs text-slate-300">{form.system_prompt.length}/5000</span>
                </div>
              </div>
              {formErr&&<div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-100 text-sm text-rose-600"><AlertTriangle size={13}/>{formErr}</div>}
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100">
              <button onClick={()=>setShowModal(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">取消</button>
              <button onClick={saveAgent} className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all active:scale-[0.97] shadow-sm shadow-blue-200">
                {editingAgent?'保存修改':'创建智能体'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast 错误 */}
      {error && (
        <div onClick={()=>setError(null)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2.5 px-4 py-3 bg-slate-900 text-white rounded-2xl shadow-2xl text-sm cursor-pointer z-50 animate-fade-in-up max-w-sm">
          <AlertTriangle size={15} className="text-rose-400 flex-shrink-0"/>{error}
          <X size={14} className="ml-1 text-white/50"/>
        </div>
      )}
    </div>
  );
}
