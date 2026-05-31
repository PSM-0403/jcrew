import { create } from 'zustand';
import { fetchPendingPayments } from '../api/db';

export const useAppStore = create((set) => ({
  role:            null,
  showSignup:      false,
  tab:             'home',
  memberId:        null,
  loading:         true,
  toast:           null,
  feedback:        {},
  pendingPayments: [],

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

  addPendingPayment: (entry) =>
    set(state => ({ pendingPayments: [...state.pendingPayments, entry] })),
  removePendingPayment: (id) =>
    set(state => ({ pendingPayments: state.pendingPayments.filter(p => p.id !== id) })),
}));
