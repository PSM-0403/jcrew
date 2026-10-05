import { create } from 'zustand';
import { fetchMonthAttendance, fetchCancellations, fetchMonthMakeups, saveAttendance, toggleCancellation } from '../api/db';
import { useAppStore } from './appStore';

// 같은 위치({ [classId]: { [date]: { [memberId]: value } } })의 값 하나를 바꾼 새 객체를 돌려준다.
function setCell(map, classId, date, mId, value) {
  const dateMap = { ...((map[classId] ?? {})[date] ?? {}) };
  if (value == null) delete dateMap[mId];
  else dateMap[mId] = value;
  return { ...map, [classId]: { ...(map[classId] ?? {}), [date]: dateMap } };
}

export const useAttendanceStore = create((set, get) => ({
  attendance:    {}, // { [classId]: { [date]: { [memberId]: status } } }
  absenceTypes:  {}, // { [classId]: { [date]: { [memberId]: '사전연락' | '무단' } } }
  makeups:       {}, // { [classId]: { [date]: [memberId, ...] } } 승인된 보강
  cancellations: {}, // { [classId]: [date, ...] }
  year:  new Date().getFullYear(),
  month: new Date().getMonth() + 1,

  load: async () => {
    const { year, month } = get();
    const [att, canc, makeups] = await Promise.all([
      fetchMonthAttendance(year, month),
      fetchCancellations(year, month),
      fetchMonthMakeups(year, month),
    ]);
    set({ attendance: att.attendance, absenceTypes: att.absenceTypes, cancellations: canc, makeups });
  },

  setMonth: async (year, month) => {
    set({ year, month, attendance: {}, absenceTypes: {}, makeups: {}, cancellations: {} });
    await get().load();
  },

  // 출석/결석 버튼. 같은 버튼을 다시 누르면 취소된다.
  // 결석을 새로 누르면 사유는 일단 '무단'으로 두고, 코치가 '사전연락'으로 바꿀 수 있다.
  mark: async (classId, mId, date, status, { isMakeup = false } = {}) => {
    const prev = { attendance: get().attendance, absenceTypes: get().absenceTypes };
    const current = get().attendance[classId]?.[date]?.[mId];
    const next = current === status ? null : status;
    const absenceType = next === '결석' ? '무단' : null;
    set(state => ({
      attendance:   setCell(state.attendance, classId, date, mId, next),
      absenceTypes: setCell(state.absenceTypes, classId, date, mId, absenceType),
    }));
    try {
      await saveAttendance(mId, classId, next, date, { absenceType, isMakeup });
    } catch {
      set(prev);
      useAppStore.getState().showToast('출석 저장 실패. 다시 시도해주세요.', 'err');
    }
  },

  // 결석 사유만 바꾼다 ('사전연락' | '무단').
  setAbsenceType: async (classId, mId, date, absenceType, { isMakeup = false } = {}) => {
    const prev = get().absenceTypes;
    set(state => ({ absenceTypes: setCell(state.absenceTypes, classId, date, mId, absenceType) }));
    try {
      await saveAttendance(mId, classId, '결석', date, { absenceType, isMakeup });
    } catch {
      set({ absenceTypes: prev });
      useAppStore.getState().showToast('결석 사유 저장 실패. 다시 시도해주세요.', 'err');
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
