import { useEffect, useState } from "react";

import { useAppStore }         from "./stores/appStore";
import { useMemberStore }      from "./stores/memberStore";
import { useClassStore }       from "./stores/classStore";
import { useAttendanceStore }  from "./stores/attendanceStore";

import { updateMemberPaid, addPayment, enrollMember, unenrollMember, insertPendingPayment, deletePendingPayment, insertMakeupRequest, assignMakeupRequest, fetchMemberUnreadCount } from "./api/db";
import { supabase } from "./api/supabase";

import { Toast, TabBar }   from "./components/Common";
import { LoginPage, SignupPage } from "./pages/Login";
import {
  CoachDashboard, CoachAttendance, CoachClasses, CoachMembers,
  CoachAgentPanel, NoticePage,
} from "./pages/coach/CoachPages";
import {
  MemberHome, MemberMyClasses, MemberChatbot, MemberProfile,
} from "./pages/member/MemberPages";
import { GalleryPage } from "./pages/GalleryPage";
import { MemberChat, CoachChat } from "./pages/ChatPage";

import { COLORS }         from "./constants";
import logo               from "./assets/logo.png";

export default function App() {
  // ── 스토어 ────────────────────────────────────────────────
  const {
    role, showSignup, tab, memberId, loading, toast, feedback, pendingPayments, makeupRequests,
    setRole, setShowSignup, setTab, setMemberId, setLoading, showToast, setFeedback,
    addPendingPayment, removePendingPayment, loadMakeupRequests, addMakeupRequest, removeMakeupRequest,
  } = useAppStore();

  const {
    members, pendingMembers,
    signup, approve, reject, togglePaid, updateNote,
    updateMemberClasses, updatePaidState, setMembers, deleteMember, updateGender, updateMemberInfo,
  } = useMemberStore();

  const { classes, addClass, updateClass, deleteClass, updateEnrolled } = useClassStore();
  const { attendance, cancellations, year, month, mark, setCancellation, setMonth } = useAttendanceStore();

  const me      = members.find(m => m.id === memberId);
  const isCoach = role === "coach";
  const [chatMemberId, setChatMemberId]   = useState(null);
  const [memberUnread, setMemberUnread]   = useState(0);

  // 회원 안읽은 메시지 수 (탭 변경 + 실시간)
  useEffect(() => {
    if (!memberId) return;
    fetchMemberUnreadCount(memberId).then(setMemberUnread);

    const channel = supabase
      .channel(`member-unread-${memberId}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `member_id=eq.${memberId}`,
      }, payload => {
        if (payload.new.sender_type === 'coach') {
          setMemberUnread(n => n + 1);
        }
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [memberId]);

  // 채팅 탭 진입 시 미읽음 초기화
  useEffect(() => {
    if (!isCoach && tab === "messages") setMemberUnread(0);
  }, [tab]);

  // ── 초기 로드 ─────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        await Promise.all([
          useMemberStore.getState().load(),
          useClassStore.getState().load(),
          useAttendanceStore.getState().load(),
          useAppStore.getState().loadPendingPayments(),
          useAppStore.getState().loadMakeupRequests(),
        ]);
      } catch {
        showToast("데이터 로드 실패. 새로고침 해주세요.", "err");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── 핸들러 ────────────────────────────────────────────────
  const handleBankPaymentRequest = async (memo) => {
    const requestedAt = new Date().toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
    const tempEntry = { id: Date.now(), memberId: me.id, memberName: me.name, requestedAt, memo };
    addPendingPayment(tempEntry);
    showToast("이체 완료 신청이 접수됐습니다. 강사 확인 후 처리됩니다.");
    try {
      const saved = await insertPendingPayment(me.id, me.name, requestedAt, memo);
      removePendingPayment(tempEntry.id);
      addPendingPayment(saved);
    } catch {
      removePendingPayment(tempEntry.id);
      showToast("신청 실패. 다시 시도해주세요.", "err");
    }
  };

  const handleCardPayment = async () => {
    const prevPaid = me.paid;
    updatePaidState(me.id, true);
    try {
      await updateMemberPaid(me.id, true);
      await addPayment(me.id, 1);
      showToast("카드 결제가 완료됐습니다!");
    } catch {
      updatePaidState(me.id, prevPaid);
      showToast("결제 실패", "err");
    }
  };

  const handleConfirmPayment = async (paymentId) => {
    const p = pendingPayments.find(p => p.id === paymentId);
    if (!p) return;
    const prevPaid = members.find(m => m.id === p.memberId)?.paid ?? false;
    updatePaidState(p.memberId, true);
    removePendingPayment(paymentId);
    try {
      await deletePendingPayment(paymentId);
      await updateMemberPaid(p.memberId, true);
      await addPayment(p.memberId, 1);
      showToast(`${p.memberName}님 수강료 납부 확인 완료`);
    } catch {
      updatePaidState(p.memberId, prevPaid);
      addPendingPayment(p);
      showToast("확인 실패", "err");
    }
  };

  const handleAssignClass = async (mId, classId, assign) => {
    updateMemberClasses(mId, classId, assign);
    updateEnrolled(classId, assign ? 1 : -1);
    try {
      if (assign) await enrollMember(mId, classId);
      else await unenrollMember(mId, classId);
    } catch {
      updateMemberClasses(mId, classId, !assign);
      updateEnrolled(classId, assign ? -1 : 1);
      showToast("수업 배정 실패", "err");
    }
  };

  const handleMakeupRequest = async (form) => {
    try {
      await insertMakeupRequest({ ...form, memberId: me.id, memberName: me.name });
      await loadMakeupRequests();
      showToast("보강 신청이 접수됐습니다. 강사 확인 후 배정됩니다.");
    } catch {
      showToast("신청 실패. 다시 시도해주세요.", "err");
    }
  };

  const handleAssignMakeup = async (id, assignmentData) => {
    removeMakeupRequest(id);
    try {
      await assignMakeupRequest(id, assignmentData);
      showToast("보강 배정 완료!");
    } catch {
      await loadMakeupRequests();
      showToast("처리 실패", "err");
    }
  };

  const handleCancel = async (classId) => {
    const cls = classes.find(c => c.id === classId);
    updateMemberClasses(memberId, classId, false);
    updateEnrolled(classId, -1);
    try {
      await unenrollMember(memberId, classId);
      showToast(`${cls?.title} 취소되었습니다.`);
    } catch {
      updateMemberClasses(memberId, classId, true);
      updateEnrolled(classId, 1);
      showToast("취소 실패", "err");
    }
  };

  // ── 화면 분기 ─────────────────────────────────────────────
  if (loading) return (
    <div role="status" aria-live="polite" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: COLORS.DARK, color: "#fff", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 40 }}>🏀</div>
      <div style={{ fontSize: 14, color: COLORS.TEXT_MUTED }}>데이터 로딩 중...</div>
    </div>
  );

  if (showSignup) return <SignupPage onSignup={signup} onBack={() => setShowSignup(false)} />;
  if (!role) return (
    <LoginPage
      members={members}
      onCoach={() => { setRole("coach"); setTab("home"); }}
      onMember={(id) => { setMemberId(id); setRole("member"); setTab("home"); }}
      onSignup={() => setShowSignup(true)}
    />
  );

  const coachTabs = [
    { key: "home",       label: pendingMembers.length > 0 ? `대시보드 (${pendingMembers.length})` : "대시보드" },
    { key: "attendance", label: "출석 체크" },
    { key: "classes",    label: "수업 관리" },
    { key: "members",    label: "회원 현황" },
    { key: "gallery",    label: "갤러리" },
    { key: "messages",   label: "채팅" },
    { key: "agent",      label: "AI 에이전트" },
    { key: "notice",     label: "공지" },
  ];
  const memberTabs = [
    { key: "home",     label: "홈" },
    { key: "my",       label: "내 수업" },
    { key: "gallery",  label: "갤러리" },
    { key: "messages", label: memberUnread > 0 ? `채팅 (${memberUnread})` : "채팅" },
    { key: "chat",     label: "AI 챗봇" },
    { key: "notice",   label: "공지" },
    { key: "profile",  label: "내 정보" },
  ];

  return (
    <div style={{ fontFamily: "'Trebuchet MS', sans-serif", background: COLORS.DARK, color: "#fff", minHeight: "100vh" }}>
      <Toast toast={toast} />

      {/* 헤더 */}
      <header style={{ background: COLORS.NAVY, padding: "14px 20px", borderBottom: `1px solid ${COLORS.BORDER_SUBTLE}`, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ background: "#fff", borderRadius: 8, padding: "3px 8px", display: "flex", alignItems: "center" }}>
            <img src={logo} alt="제이크루 농구교실 로고" style={{ height: 28, display: "block" }} />
          </div>
          <div style={{ fontSize: 11, color: COLORS.ORANGE, letterSpacing: 1 }} aria-label={isCoach ? "관리자/강사 모드" : `${me?.name}님`}>
            {isCoach ? "관리자/강사" : me?.name}
          </div>
        </div>
        <button
          onClick={() => { setRole(null); setTab("home"); }}
          aria-label="로그아웃"
          style={{ fontSize: 12, color: COLORS.TEXT_MUTED, background: "none", border: "none", cursor: "pointer" }}
        >
          나가기
        </button>
      </header>

      {/* 미납 배너 */}
      {!isCoach && !me?.paid && (
        <div role="alert" style={{ background: COLORS.DANGER_BG, padding: "10px 20px", fontSize: 13, color: COLORS.DANGER_TEXT }}>
          ⚠ 이번 달 수강료가 미납 상태입니다.
        </div>
      )}

      <TabBar tabs={isCoach ? coachTabs : memberTabs} active={tab} onChange={setTab} />

      <div style={{ padding: "16px 20px", maxWidth: 720, margin: "0 auto" }}>
        {/* ── 강사 ── */}
        {isCoach && tab === "home"       && <CoachDashboard members={members} classes={classes} pendingMembers={pendingMembers} onApprove={approve} onReject={reject} onTogglePaid={togglePaid} pendingPayments={pendingPayments} onConfirmPayment={handleConfirmPayment} makeupRequests={makeupRequests} onAssignMakeup={handleAssignMakeup} />}
        {isCoach && tab === "attendance" && <CoachAttendance members={members} classes={classes} attendance={attendance} cancellations={cancellations} year={year} month={month} onMark={mark} onCancellation={setCancellation} onMonthChange={setMonth} onFeedback={(cId, r) => setFeedback(p => ({ ...p, [cId]: r }))} feedback={feedback} />}
        {isCoach && tab === "classes"    && <CoachClasses classes={classes} onAdd={addClass} onUpdate={updateClass} onDelete={deleteClass} />}
        {isCoach && tab === "members"    && <CoachMembers members={members} classes={classes} onTogglePaid={togglePaid} onAssign={handleAssignClass} onUpdateNote={updateNote} onDelete={deleteMember} onUpdateGender={updateGender} onUpdateInfo={updateMemberInfo} onChat={(mId) => { setChatMemberId(mId); setTab("messages"); }} />}
        {isCoach && tab === "gallery"    && <GalleryPage classes={classes} isCoach />}
        {isCoach && tab === "messages"   && <CoachChat members={members} initMemberId={chatMemberId} onClearInit={() => setChatMemberId(null)} />}
        {isCoach && tab === "agent"      && <CoachAgentPanel members={members} classes={classes} onMembersUpdate={setMembers} />}
        {isCoach && tab === "notice"     && <NoticePage isCoach showToast={showToast} />}

        {/* ── 회원 ── */}
        {!isCoach && tab === "home"    && <MemberHome member={me} classes={classes} onBankPayment={handleBankPaymentRequest} onCardPayment={handleCardPayment} />}
        {!isCoach && tab === "my"      && <MemberMyClasses member={me} classes={classes} onCancel={handleCancel} onMakeupRequest={handleMakeupRequest} />}
        {!isCoach && tab === "gallery"  && <GalleryPage classes={classes.filter(c => (me?.classes ?? []).includes(c.id))} isCoach={false} />}
        {!isCoach && tab === "messages" && <MemberChat member={me} />}
        {!isCoach && tab === "chat"     && <MemberChatbot member={me} classes={classes} />}
        {!isCoach && tab === "notice"  && <NoticePage isCoach={false} showToast={showToast} />}
        {!isCoach && tab === "profile" && <MemberProfile member={me} onUpdate={() => useMemberStore.getState().load()} showToast={showToast} />}
      </div>
    </div>
  );
}
