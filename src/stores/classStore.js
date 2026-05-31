import { create } from 'zustand';
import { fetchClasses, insertClass, editClass, removeClass } from '../api/db';
import { useAppStore } from './appStore';

const toast = (msg, type) => useAppStore.getState().showToast(msg, type);

export const useClassStore = create((set, get) => ({
  classes: [],

  load: async () => {
    const cls = await fetchClasses();
    set({ classes: cls });
  },

  // 수업 개설: DB 생성 ID 필요해서 API-first
  addClass: async (data) => {
    const created = await insertClass(data);
    set(state => ({ classes: [...state.classes, created] }));
    toast(`${data.title} 수업이 개설되었습니다!`);
  },

  // 수업 수정: 낙관적 + 롤백
  updateClass: async (updated) => {
    const prevClasses = get().classes;
    set(state => ({ classes: state.classes.map(c => c.id === updated.id ? updated : c) }));
    try {
      await editClass(updated.id, updated);
      toast(`${updated.title} 수업이 수정되었습니다.`);
    } catch {
      set({ classes: prevClasses });
      toast('수정 실패', 'err');
    }
  },

  // 수업 삭제: 낙관적 + 롤백
  deleteClass: async (classId) => {
    const cls = get().classes.find(c => c.id === classId);
    const prevClasses = get().classes;
    set(state => ({ classes: state.classes.filter(c => c.id !== classId) }));
    try {
      await removeClass(classId);
      toast(`${cls?.title} 수업이 삭제되었습니다.`, 'err');
    } catch {
      set({ classes: prevClasses });
      toast('삭제 실패', 'err');
    }
  },

  updateEnrolled: (classId, delta) => {
    set(state => ({
      classes: state.classes.map(c =>
        c.id === classId ? { ...c, enrolled: c.enrolled + delta } : c
      ),
    }));
  },
}));
