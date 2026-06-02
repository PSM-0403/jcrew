import { create } from 'zustand';
import {
  fetchMembers, fetchPendingMembers,
  insertMember, approveMember, rejectMember,
  updateMemberPaid, updateMemberNote, addPayment, deleteMember, updateMemberGender,
} from '../api/db';
import { useAppStore } from './appStore';

const toast = (msg, type) => useAppStore.getState().showToast(msg, type);

export const useMemberStore = create((set, get) => ({
  members:        [],
  pendingMembers: [],

  load: async () => {
    const [mbrs, pend] = await Promise.all([fetchMembers(), fetchPendingMembers()]);
    set({ members: mbrs, pendingMembers: pend });
  },

  // 가입신청: DB 생성 후 ID가 필요해서 API-first
  signup: async (form) => {
    await insertMember(form);
    const pend = await fetchPendingMembers();
    set({ pendingMembers: pend });
    useAppStore.getState().setShowSignup(false);
    toast(`${form.name}님 가입 신청 완료! 관리자 승인 후 로그인 가능합니다.`);
  },

  // 승인: 복잡한 상태 전환 → load()로 전체 동기화
  approve: async (pendingId) => {
    const pending = get().pendingMembers.find(m => m.pendingId === pendingId);
    await approveMember(pendingId);
    await get().load();
    toast(`${pending?.name}님 가입 승인 완료!`);
  },

  // 반려: 낙관적 + 롤백
  reject: async (pendingId) => {
    const pending = get().pendingMembers.find(m => m.pendingId === pendingId);
    const prevPending = get().pendingMembers;
    set(state => ({ pendingMembers: state.pendingMembers.filter(m => m.pendingId !== pendingId) }));
    try {
      await rejectMember(pendingId);
      toast(`${pending?.name}님 가입 신청 반려`, 'err');
    } catch {
      set({ pendingMembers: prevPending });
      toast('반려 실패', 'err');
    }
  },

  // 납부 처리: 낙관적 + 롤백
  togglePaid: async (mId, months = 0) => {
    const m = get().members.find(m => m.id === mId);
    if (!m) return;
    if (m.paid && months > 0) { toast(`${m.name}님은 이미 납부 완료 상태입니다.`, 'err'); return; }
    if (months < 0 || months > 12) { toast('유효하지 않은 기간입니다.', 'err'); return; }
    const next = months > 0 ? true : !m.paid;
    const prevMembers = get().members;
    const today = new Date().toISOString().slice(0, 10);
    const history = m.paymentHistory ?? [];
    const alreadyToday = history.some(h => h.date === today);
    const updatedHistory = next && months > 0 && !alreadyToday ? [...history, { date: today, months }] : history;
    set(state => ({
      members: state.members.map(m =>
        m.id === mId ? { ...m, paid: next, paymentHistory: updatedHistory } : m
      ),
    }));
    try {
      await updateMemberPaid(mId, next);
      if (next && months > 0) await addPayment(mId, months);
      toast(`${m.name}님 수강료 ${next ? `납부 처리${months > 0 ? ` (${months}개월)` : ''}` : '미납 처리'} 완료`);
    } catch {
      set({ members: prevMembers });
      toast('처리 실패. 다시 시도해주세요.', 'err');
    }
  },

  // 메모 수정: 낙관적 + 롤백
  updateNote: async (mId, note) => {
    const prevMembers = get().members;
    set(state => ({ members: state.members.map(m => m.id === mId ? { ...m, note } : m) }));
    try {
      await updateMemberNote(mId, note);
    } catch {
      set({ members: prevMembers });
      toast('저장 실패', 'err');
    }
  },

  // 성별 수정: 낙관적 + 롤백
  updateGender: async (mId, gender) => {
    const prev = get().members;
    set(state => ({ members: state.members.map(m => m.id === mId ? { ...m, gender } : m) }));
    try {
      await updateMemberGender(mId, gender);
    } catch {
      set({ members: prev });
      toast('저장 실패', 'err');
    }
  },

  // 회원 삭제: 낙관적 + 롤백
  deleteMember: async (mId) => {
    const prevMembers = get().members;
    const m = get().members.find(m => m.id === mId);
    set(state => ({ members: state.members.filter(m => m.id !== mId) }));
    try {
      await deleteMember(mId);
      toast(`${m?.name}님이 삭제되었습니다.`, 'err');
    } catch {
      set({ members: prevMembers });
      toast('삭제 실패', 'err');
    }
  },

  updateMemberClasses: (mId, classId, assign) => {
    set(state => ({
      members: state.members.map(m => {
        if (m.id !== mId) return m;
        const classes = assign
          ? [...(m.classes ?? []), classId]
          : (m.classes ?? []).filter(id => id !== classId);
        return { ...m, classes };
      }),
    }));
  },

  updatePaidState: (mId, paid) => {
    set(state => ({ members: state.members.map(m => m.id === mId ? { ...m, paid } : m) }));
  },

  setMembers: (members) => set({ members }),
}));
