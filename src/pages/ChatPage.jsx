import { useState, useEffect, useRef } from "react";
import { supabase } from "../api/supabase";
import { fetchMessages, sendMessage, markMessagesRead, fetchAllConversations, deleteMessage, hideConversation } from "../api/db";
import { MemberAvatar } from "../components/Common";
import { COLORS } from "../constants";
import { useAppStore } from "../stores/appStore";

// ── 회원: 강사 채팅 ────────────────────────────────────────
export function MemberChat({ member }) {
  const [messages, setMessages]   = useState([]);
  const [input, setInput]         = useState("");
  const [sending, setSending]     = useState(false);
  const chatRef = useRef(null);

  useEffect(() => {
    // 메시지 로드 + 읽음 처리
    fetchMessages(member.id).then(msgs => {
      setMessages(msgs);
      markMessagesRead(member.id, 'coach'); // 읽음 처리 → 탭 카운트 자동 감소
    });

    // Realtime 구독
    const channel = supabase
      .channel(`member-chat-${member.id}-${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `member_id=eq.${member.id}`,
      }, payload => {
        setMessages(prev => [...prev, payload.new]);
        if (payload.new.sender_type === 'coach') {
          markMessagesRead(member.id, 'coach');
        }
      })
      .on('postgres_changes', {
        event: 'DELETE', schema: 'public', table: 'messages',
      }, payload => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [member.id]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    try {
      await sendMessage(member.id, content, 'member');
    } catch {
      setInput(content);
    }
    setSending(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "70vh" }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.ORANGE, marginBottom: 12 }}>
        💬 강사와의 채팅
      </div>

      <div ref={chatRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, marginBottom: 12 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "#8899AA", fontSize: 13, paddingTop: 40 }}>
            강사에게서 온 메시지가 없습니다
          </div>
        )}
        {messages.map(msg => {
          const isCoach = msg.sender_type === 'coach';
          return (
            <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isCoach ? "flex-start" : "flex-end" }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 6 }}>
                {isCoach && (
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: `${COLORS.ORANGE}22`, border: `1px solid ${COLORS.ORANGE}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, flexShrink: 0 }}>
                    🏀
                  </div>
                )}
                <div style={{
                  maxWidth: "240px", padding: "10px 14px", fontSize: 13, lineHeight: 1.7, wordBreak: "break-word",
                  borderRadius: isCoach ? "16px 16px 16px 4px" : "16px 16px 4px 16px",
                  background: isCoach ? COLORS.NAVY : COLORS.ORANGE,
                  color: "#fff",
                  border: isCoach ? "1px solid #ffffff11" : "none",
                }}>
                  {msg.content}
                </div>
              </div>
              <div style={{ fontSize: 10, color: "#8899AA", marginTop: 3, paddingLeft: isCoach ? 36 : 0 }}>
                {new Date(msg.created_at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSend()}
          placeholder="강사에게 메시지 보내기"
          style={{ flex: 1, padding: "12px 16px", borderRadius: 12, border: "1px solid #ffffff22", background: COLORS.NAVY, color: "#fff", fontSize: 13, fontFamily: "inherit" }}
        />
        <button onClick={handleSend} disabled={sending || !input.trim()} style={{
          padding: "12px 18px", borderRadius: 12, border: "none", fontSize: 13, fontWeight: 700, fontFamily: "inherit",
          background: sending || !input.trim() ? "#ffffff11" : COLORS.ORANGE,
          color:      sending || !input.trim() ? "#8899AA"   : "#fff",
          cursor: sending || !input.trim() ? "not-allowed" : "pointer",
        }}>전송</button>
      </div>
    </div>
  );
}

// ── 강사: 채팅 관리 ────────────────────────────────────────
export function CoachChat({ members, initMemberId, onClearInit }) {
  const {
    chatSelectedMemberId, setChatSelectedMemberId,
    chatConversations, setChatConversations,
    chatMessages, setChatMessages, addChatMessageToStore,
  } = useAppStore();
  const [input, setInput]   = useState("");
  const [sending, setSending] = useState(false);
  const chatRef = useRef(null);

  const selectedId   = chatSelectedMemberId;
  const setSelectedId = setChatSelectedMemberId;
  const conversations = chatConversations;
  const messages      = chatMessages[selectedId] ?? [];

  const selectedMember = members.find(m => m.id === selectedId);
  const totalUnread = conversations.reduce((s, c) => s + c.unread, 0);

  // 회원 현황에서 채팅 버튼으로 진입 시 자동 선택
  useEffect(() => {
    if (initMemberId) {
      setSelectedId(initMemberId);
      onClearInit?.();
    }
  }, [initMemberId]);

  // 대화 목록 로드
  useEffect(() => {
    fetchAllConversations().then(setChatConversations);

    const channel = supabase
      .channel(`coach-chat-${Date.now()}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
      }, payload => {
        addChatMessageToStore(payload.new);
        setChatConversations(useAppStore.getState().chatConversations.map(c =>
          c.memberId === payload.new.member_id
            ? { ...c, unread: payload.new.sender_type === 'member' ? c.unread + 1 : c.unread, lastAt: payload.new.created_at, lastMessage: payload.new.content, lastSender: payload.new.sender_type }
            : c
        ));
      })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // 대화 선택 시 메시지 로드
  useEffect(() => {
    if (!selectedId) return;
    fetchMessages(selectedId, true).then(msgs => {
      setChatMessages(selectedId, msgs);
      markMessagesRead(selectedId, 'member');
      setChatConversations(useAppStore.getState().chatConversations.map(c =>
        c.memberId === selectedId ? { ...c, unread: 0 } : c
      ));
    });
  }, [selectedId]);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || sending || !selectedId) return;
    const content = input.trim();
    setInput("");
    setSending(true);
    try {
      await sendMessage(selectedId, content, 'coach');
    } catch {
      setInput(content);
    }
    setSending(false);
  };

  return (
    <div style={{ display: "flex", gap: 12, height: "70vh" }}>
      {/* 대화방 목록 (카톡 스타일) */}
      <div style={{ width: 160, flexShrink: 0, display: "flex", flexDirection: "column", borderRight: "1px solid #ffffff11" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", padding: "0 0 10px 0" }}>
          채팅 {totalUnread > 0 && <span style={{ color: COLORS.ORANGE }}>({totalUnread})</span>}
        </div>
        <div style={{ overflowY: "auto", flex: 1, display: "flex", flexDirection: "column" }}>
          {conversations.length === 0 ? (
            <div style={{ fontSize: 11, color: "#8899AA", textAlign: "center", paddingTop: 20 }}>
              대화 없음<br/>회원 현황에서<br/>채팅 시작하세요
            </div>
          ) : conversations.map(conv => {
            const m = members.find(m => m.id === conv.memberId);
            if (!m) return null;
            return (
              <button key={conv.memberId} onClick={() => setSelectedId(conv.memberId)} style={{
                padding: "10px 8px", border: "none", borderBottom: "1px solid #ffffff08",
                background: selectedId === conv.memberId ? `${COLORS.ORANGE}11` : "transparent",
                cursor: "pointer", fontFamily: "inherit", textAlign: "left", display: "flex", alignItems: "center", gap: 8,
              }}>
                <MemberAvatar member={m} size={36} />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{m.name}</span>
                    {conv.unread > 0 && (
                      <span style={{ fontSize: 10, background: COLORS.ORANGE, color: "#fff", borderRadius: 10, padding: "1px 5px", flexShrink: 0 }}>{conv.unread}</span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: "#8899AA", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
                    {conv.lastSender === 'coach' ? '나: ' : ''}{conv.lastMessage}
                  </div>
                  <div style={{ fontSize: 10, color: "#ffffff33", marginTop: 2 }}>
                    {new Date(conv.lastAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 대화창 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {!selectedId ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#8899AA", fontSize: 13 }}>
            회원을 선택하면 대화를 볼 수 있습니다
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{selectedMember?.name}님과의 대화</div>
              <button onClick={async () => {
                if (!window.confirm(`${selectedMember?.name}님과의 채팅방을 나가시겠어요?\n회원은 기존 메시지를 계속 볼 수 있습니다.`)) return;
                await hideConversation(selectedId);
                setChatMessages(selectedId, []);
                setChatConversations(useAppStore.getState().chatConversations.filter(c => c.memberId !== selectedId));
                setSelectedId(null);
              }} style={{ fontSize: 11, color: "#FCA5A5", background: "none", border: "1px solid #EF444433", borderRadius: 8, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit" }}>
                나가기
              </button>
            </div>
            <div ref={chatRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
              {messages.map(msg => {
                const isCoach = msg.sender_type === 'coach';
                return (
                  <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isCoach ? "flex-end" : "flex-start" }}>
                    <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
                      {isCoach && (
                        <button onClick={async () => {
                          await deleteMessage(msg.id);
                          setChatMessages(selectedId, (chatMessages[selectedId] ?? []).filter(m => m.id !== msg.id));
                        }} style={{ fontSize: 10, color: "#8899AA", background: "none", border: "none", cursor: "pointer", padding: "0 2px", flexShrink: 0 }}>✕</button>
                      )}
                      <div style={{
                        maxWidth: "200px", padding: "9px 13px", fontSize: 12, lineHeight: 1.7, wordBreak: "break-word",
                        borderRadius: isCoach ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                        background: isCoach ? COLORS.ORANGE : COLORS.NAVY,
                        color: "#fff", border: isCoach ? "none" : "1px solid #ffffff11",
                      }}>{msg.content}</div>
                    </div>
                    <div style={{ fontSize: 10, color: "#8899AA", marginTop: 2 }}>
                      {new Date(msg.created_at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                placeholder="메시지 입력"
                style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid #ffffff22", background: COLORS.NAVY, color: "#fff", fontSize: 12, fontFamily: "inherit" }}
              />
              <button onClick={handleSend} disabled={sending || !input.trim()} style={{
                padding: "10px 14px", borderRadius: 10, border: "none", fontSize: 12, fontWeight: 700, fontFamily: "inherit",
                background: sending || !input.trim() ? "#ffffff11" : COLORS.ORANGE,
                color:      sending || !input.trim() ? "#8899AA"   : "#fff",
                cursor: sending || !input.trim() ? "not-allowed" : "pointer",
              }}>전송</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
