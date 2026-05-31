import { create } from 'zustand';
import { fetchMonthAttendance, fetchCancellations, saveAttendance, toggleCancellation } from '../api/db';
import { useAppStore } from './appStore';

export const useAttendanceStore = create((set, get) => ({
  attendance:    {}, // { [classId]: { [date]: { [memberId]: status } } }
  cancellations: {}, // { [classId]: [date, ...] }
  year:  new Date().getFullYear(),
  month: new Date().getMonth() + 1,

  load: async () => {
    const { year, month } = get();
    const [att, canc] = await Promise.all([
      fetchMonthAttendance(year, month),
      fetchCancellations(year, month),
    ]);
    set({ attendance: att, cancellations: canc });
  },

  setMonth: async (year, month) => {
    set({ year, month, attendance: {}, cancellations: {} });
    await get().load();
  },

  mark: async (classId, mId, date, status) => {
    const prev = get().attendance;
    set(state => ({
      attendance: {
        ...state.attendance,
        [classId]: {
          ...(state.attendance[classId] ?? {}),
          [date]: {
            ...((state.attendance[classId] ?? {})[date] ?? {}),
            [mId]: status,
          },
        },
      },
    }));
    try {
      await saveAttendance(mId, classId, status, date);
    } catch {
      set({ attendance: prev });
      useAppStore.getState().showToast('출석 저장 실패. 다시 시도해주세요.', 'err');
    }
  },

  setCancellation: async (classId, date, cancel) => {
    const prev = get().cancellations;
    set(state => {
      const list = state.cancellations[classId] ?? [];
      return {
        cancellations: {
          ...state.cancellations,
          [classId]: cancel
            ? [...list, date]
            : list.filter(d => d !== date),
        },
      };
    });
    try {
      await toggleCancellation(classId, date, cancel);
    } catch {
      set({ cancellations: prev });
      useAppStore.getState().showToast('휴강 처리 실패', 'err');
    }
  },
}));
