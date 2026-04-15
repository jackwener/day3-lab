import { useReducer, useCallback } from 'react';
import { rollDice } from '../api/ritualApi';

const STATES = {
  LOADING: 'loading',
  DICE: 'dice',
  DRAW: 'draw',
  REVEAL: 'reveal',
  REPORT: 'report',
};

const initialState = {
  currentState: STATES.LOADING,
  selectedCards: [],       // 字符串 ID 数组
  diceResult: null,
  fateChoice: null,        // 'change' | 'accept'
  // 新增 API 相关状态
  ritualId: null,          // 会话 ID
  profile: null,           // 后端返回的整套文案配置
  diceRoll: null,          // { face, label, rotation }
  cardPool: [],            // 卡池数组
  drawPrompt: null,        // 抽卡阶段文案
  revealData: null,        // reveal 返回的 phases 数据
  reportData: null,        // report 返回的完整 ReportPayload
  loading: false,          // 加载中
  error: null,             // 错误信息
};

function ritualReducer(state, action) {
  switch (action.type) {
    case 'SET_STATE':
      return { ...state, currentState: action.payload };
    case 'SET_RITUAL_ID':
      return { ...state, ritualId: action.payload };
    case 'SET_PROFILE':
      return { ...state, profile: action.payload };
    case 'SET_DICE_ROLL':
      return { ...state, diceRoll: action.payload, diceResult: action.payload };
    case 'SET_CARD_POOL':
      return { ...state, cardPool: action.payload };
    case 'SET_DRAW_PROMPT':
      return { ...state, drawPrompt: action.payload };
    case 'SET_SELECTED_CARDS':
      return { ...state, selectedCards: action.payload };
    case 'SET_REVEAL_DATA':
      return { ...state, revealData: action.payload };
    case 'SET_REPORT_DATA':
      return { ...state, reportData: action.payload };
    case 'SET_FATE_CHOICE':
      return { ...state, fateChoice: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'RESTART':
      return {
        ...initialState,
        currentState: STATES.LOADING,
      };
    default:
      return state;
  }
}

export default function useRitualState() {
  const [state, dispatch] = useReducer(ritualReducer, initialState);

  const goToNextStateImpl = useCallback((currentPageState) => {
    const map = {
      [STATES.LOADING]: STATES.DICE,
      [STATES.DICE]: STATES.DRAW,
      [STATES.DRAW]: STATES.REVEAL,
      [STATES.REVEAL]: STATES.REPORT,
      [STATES.REPORT]: STATES.LOADING,
    };
    const next = map[currentPageState] || STATES.LOADING;
    dispatch({ type: 'SET_STATE', payload: next });
  }, []);

  const skipDice = useCallback(async (ritualId) => {
    if (!ritualId) {
      dispatch({ type: 'SET_ERROR', payload: '财富仪式尚未初始化完成，请稍候。' });
      return;
    }

    try {
      const result = await rollDice(ritualId);
      if (result) {
        dispatch({ type: 'SET_DICE_ROLL', payload: result.diceRoll || result });
        dispatch({ type: 'SET_STATE', payload: STATES.DRAW });
      }
    } catch (e) {
      console.warn('[skipDice] rollDice failed:', e);
      dispatch({ type: 'SET_ERROR', payload: '市场骰子投掷失败，请重试。' });
    }
  }, []);

  const setSelectedCards = useCallback((cards) => {
    dispatch({ type: 'SET_SELECTED_CARDS', payload: cards });
  }, []);

  const changeFate = useCallback(() => {
    dispatch({ type: 'SET_FATE_CHOICE', payload: 'change' });
    dispatch({ type: 'SET_STATE', payload: STATES.REPORT });
  }, []);

  const acceptFate = useCallback(() => {
    dispatch({ type: 'SET_FATE_CHOICE', payload: 'accept' });
    dispatch({ type: 'SET_STATE', payload: STATES.REPORT });
  }, []);

  const restart = useCallback(() => {
    dispatch({ type: 'RESTART' });
  }, []);

  return {
    // 状态
    currentState: state.currentState,
    selectedCards: state.selectedCards,
    diceResult: state.diceResult,
    fateChoice: state.fateChoice,
    ritualId: state.ritualId,
    profile: state.profile,
    diceRoll: state.diceRoll,
    cardPool: state.cardPool,
    drawPrompt: state.drawPrompt,
    revealData: state.revealData,
    reportData: state.reportData,
    loading: state.loading,
    error: state.error,
    // actions
    dispatch,
    goToNextState: goToNextStateImpl,
    skipDice,
    selectCard: setSelectedCards,
    changeFate,
    acceptFate,
    restart,
    STATES,
  };
}
