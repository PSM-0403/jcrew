import { create } from 'zustand';
import { fetchPendingPayments, fetchMakeupRequests } from '../api/db';

export const useAppStore = create((set) => ({
  role:            null,
  showSignup:      false,
  tab:             'home',
  memberId:        null,
  loading:         true,
  toast:           null,
  feedback:        {},
  pendingPayments:      [],
  makeupRequests:       [],
  chatSelectedMemberId: null,
  chatConversations:    [],
  chatMessages:         {},   // { [memberId]: [msg, ...] }
  setChatSelectedMemberId: (id) => set({ chatSelectedMemberId: id }),
  setChatConversations:    (list) => set({ chatConversations: list }),
  setChatMessages:         (memberId, msgs) => set(state => ({ chatMessages: { ...state.chatMessages, [memberId]: msgs } })),
  addChatMessageToStore:   (msg) => set(state => ({
    chatMessages: {
      ...state.chatMessages,
      [msg.member_id]: [...(state.chatMessages[msg.member_id] ?? []), msg],
    },
  })),

  setRole:       (role)    => set({ role }),
  setShowSignup: (v)       => set({ showSignup: v }),
  setTab:        (tab)     => set({ tab }),
  setMemberId:   (id)      => set({ memberId: id }),
  setLoading:    (v)       => set({ loading: v }),
  setFeedback:   (updater) => set(state => ({ feedback: updater(state.feedback) })),

  showToast: (msg, type = 'ok') => {
    set({ toast: { msg, type } });
    setTimeout(() => set({ toast: null }), 3000);
  },

  loadPendingPayments: async () => {
    const data = await fetchPendingPayments();
    set({ pendingPayments: data });
  },
  addPendingPayment:    (entry) => set(state => ({ pendingPayments: [...state.pendingPayments, entry] })),
  removePendingPayment: (id)    => set(state => ({ pendingPayments: state.pendingPayments.filter(p => p.id !== id) })),

  loadMakeupRequests: async () => {
    const data = await fetchMakeupRequests();
    set({ makeupRequests: data });
  },
  addMakeupRequest:    (entry) => set(state => ({ makeupRequests: [...state.makeupRequests, entry] })),
  removeMakeupRequest: (id)    => set(state => ({ makeupRequests: state.makeupRequests.filter(r => r.id !== id) })),
}));
