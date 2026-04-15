import { apiRequest } from './client';

/**
 * 创建新仪式会话
 * POST /rituals
 */
export function createRitual() {
  return apiRequest('/rituals', { method: 'POST' });
}

/**
 * 投掷骰子
 * POST /rituals/{ritualId}/dice-roll
 */
export function rollDice(ritualId) {
  return apiRequest(`/rituals/${ritualId}/dice-roll`, { method: 'POST' });
}

/**
 * 获取抽卡池
 * GET /rituals/{ritualId}/draw-pool
 */
export function getDrawPool(ritualId) {
  return apiRequest(`/rituals/${ritualId}/draw-pool`);
}

/**
 * 提交选牌并揭示命运
 * POST /rituals/{ritualId}/reveal
 */
export function submitReveal(ritualId, selectedCardIds) {
  return apiRequest(
    `/rituals/${ritualId}/reveal`,
    {
      method: 'POST',
      body: JSON.stringify({ selectedCardIds }),
    }
  );
}

/**
 * 提交命运选择（改命/认命）
 * POST /rituals/{ritualId}/choice
 */
export function submitChoice(ritualId, fateChoice) {
  return apiRequest(
    `/rituals/${ritualId}/choice`,
    {
      method: 'POST',
      body: JSON.stringify({ fateChoice }),
    }
  );
}

/**
 * 获取最终报告
 * GET /rituals/{ritualId}/report
 */
export function getReport(ritualId) {
  return apiRequest(`/rituals/${ritualId}/report`);
}
