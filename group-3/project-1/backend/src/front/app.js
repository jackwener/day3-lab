/**
 * 前端主逻辑 — 从 Flask API 拉取数据并渲染
 */
const API_BASE = 'http://127.0.0.1:5000';

/* ---------- 工具函数 ---------- */

function scoreColor(score) {
    if (score <= 20) return 'red';
    if (score <= 50) return 'orange';
    return 'green';
}

function ceasefireClass(pct) {
    if (pct <= 20) return '';        /* red */
    if (pct <= 50) return 'orange';
    return 'green';
}

function retClass(val) {
    return val >= 0 ? 'up' : 'down';
}

function retSign(val) {
    return val >= 0 ? `+${val}%` : `${val}%`;
}

async function api(path) {
    const res = await fetch(`${API_BASE}${path}`);
    const json = await res.json();
    return json.data;
}

/* ---------- 渲染 ---------- */

async function render() {
    const [timelineData, thematicData, smallScaleData] = await Promise.all([
        api('/api/timeline'),
        api('/api/funds/thematic'),
        api('/api/funds/small-scale'),
    ]);

    const weeks = timelineData.weeks || [];
    const container = document.getElementById('timelineContainer');
    container.innerHTML = '';

    weeks.forEach((w, idx) => {
        const card = document.createElement('div');
        card.className = 'week-card';

        const c = scoreColor(w.situationScore);
        const cf = ceasefireClass(100 - w.situationScore); // 停战概率 = 100 - 局势分

        card.innerHTML = `
            <!-- 时间轴圆点 -->
            <div class="timeline-dot" style="top:${idx === 0 ? 22 : 22}px;"></div>

            <!-- 头部 -->
            <div class="week-header">
                <div>
                    <span class="week-title"><span class="week-num">第${w.weekNumber}周</span></span>
                    <span class="week-date">${w.startDate} — ${w.endDate}</span>
                </div>
                <span class="ceasefire-badge ${cf}">⏱ 停战概率 ${100 - w.situationScore}%</span>
            </div>

            <!-- 局势分值 -->
            <div class="score-bar-row">
                <span class="score-value ${c}">${w.situationScore}</span>
                <div class="score-bar">
                    <div class="score-bar-fill ${c}" style="width:${w.situationScore}%"></div>
                </div>
                <span class="score-max">/ 100</span>
            </div>

            <!-- 局势动态 -->
            <span class="section-label label-dynamic">局势动态</span>
            <div class="dynamic-text">${w.summary || '暂无数据'}</div>

            <!-- 主题基金 -->
            <span class="section-label label-thematic">主题基金（区间累计）</span>
            <div class="fund-grid">
                ${thematicData.funds.map(f => `
                    <div class="fund-card">
                        <div class="fund-theme">${f.theme}</div>
                        <div class="fund-name">${f.fundName}</div>
                        <div class="fund-return ${retClass(f.returnRate)}">${retSign(f.returnRate)}</div>
                        <div class="fund-code">${f.code || ''}</div>
                    </div>
                `).join('')}
            </div>

            <!-- 精选小规模基金 -->
            <span class="section-label label-small">精选小规模基金（每家 ≤5 亿，各公司最优）</span>
            <table class="small-fund-table">
                <thead>
                    <tr><th>基金名称</th><th>公司</th><th>规模(亿)</th><th>收益率</th></tr>
                </thead>
                <tbody>
                    ${smallScaleData.funds.map(f => `
                        <tr>
                            <td>${f.fundName}</td>
                            <td>${f.company}</td>
                            <td>${f.scale}</td>
                            <td class="${retClass(f.returnRate)}">${retSign(f.returnRate)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;

        container.appendChild(card);
    });
}

/* ---------- 启动 ---------- */
document.addEventListener('DOMContentLoaded', render);
