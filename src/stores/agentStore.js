import { create } from 'zustand';

export const useAgentStore = create((set) => ({
  runningKey: null,
  logs:       [],
  results:    {},

  setRunningKey: (key) => set({ runningKey: key }),
  addLog: (msg, type = 'info') => set(state => ({
    logs: [...state.logs.slice(-50), {
      msg, type,
      time: new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    }],
  })),
  setResult: (key, value) => set(state => ({ results: { ...state.results, [key]: value } })),
  clearLogs: () => set({ logs: [] }),

  // 챗봇
  chatMessages: [{ role: "agent", text: "안녕하세요! 제이크루 농구교실 AI입니다. 무엇이든 물어보세요 🏀" }],
  chatLoading:  false,
  addChatMessage: (msg) => set(state => ({ chatMessages: [...state.chatMessages, msg] })),
  setChatLoading:  (v)   => set({ chatLoading: v }),
  clearChat: () => set({ chatMessages: [{ role: "agent", text: "안녕하세요! 제이크루 농구교실 AI입니다. 무엇이든 물어보세요 🏀" }] }),
}));
