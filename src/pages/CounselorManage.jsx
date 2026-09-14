import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft, Clock, CheckCircle, XCircle, FileText,
  Brain, Users, Calendar, MessageSquare, LayoutDashboard,
  Monitor, MapPin, PhoneCall, Send, Mail, Phone, Activity
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { db } from '../firebase';
import {
  collection, query, where, getDocs,
  updateDoc, doc, setDoc
} from 'firebase/firestore';
import { generateContentWithFallback } from '../utils/gemini';
import { onCounselingSessionLogged } from '../utils/userLearningProfile';
import './CounselorManage.css';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(str) {
  if (!str) return '-';
  try {
    return new Date(str).toLocaleString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  } catch { return str; }
}

function fmtShort(str) {
  if (!str) return '-';
  try {
    return new Date(str).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  } catch { return str; }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CounselorManage() {
  const { currentUser, userData } = useAuth();
  const [activeTab, setActiveTab] = useState('requests'); // requests | sessions | clients
  const [reservations, setReservations] = useState([]);
  const [mentalTests, setMentalTests] = useState({});
  const [loading, setLoading] = useState(true);

  // Session log state
  const [selectedSession, setSelectedSession] = useState(null);
  const [logText, setLogText] = useState('');
  const [aiSummary, setAiSummary] = useState('');
  const [sessionType, setSessionType] = useState('independent');
  const [clientType, setClientType] = useState('amateur');
  const [generatingAi, setGeneratingAi] = useState(false);
  const [saving, setSaving] = useState(false);

  // Time-suggest state
  const [suggestingId, setSuggestingId] = useState(null); // reservation id being suggested
  const [suggestTime, setSuggestTime] = useState('');     // proposed datetime string

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let snap = await getDocs(
        query(collection(db, 'reservations'), where('counselorEmail', '==', currentUser.email))
      );
      let allDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      if (allDocs.length === 0 && userData?.name) {
        const snap2 = await getDocs(
          query(collection(db, 'reservations'), where('counselorName', '==', userData.name))
        );
        allDocs = snap2.docs.map(d => ({ id: d.id, ...d.data() }));
      }

      allDocs.sort((a, b) => {
        const ta = a.date ? new Date(a.date).getTime() : 0;
        const tb = b.date ? new Date(b.date).getTime() : 0;
        return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta);
      });
      setReservations(allDocs);

      // Fetch mental tests
      const emails = [...new Set(allDocs.map(r => r.clientEmail).filter(Boolean))];
      const testMap = {};
      if (emails.length > 0) {
        const tSnap = await getDocs(
          query(collection(db, 'mental_tests'), where('clientEmail', 'in', emails.slice(0, 10)))
        );
        tSnap.docs.forEach(d => {
          const t = { id: d.id, ...d.data() };
          if (!testMap[t.clientEmail]) testMap[t.clientEmail] = [];
          testMap[t.clientEmail].push(t);
        });
        Object.keys(testMap).forEach(email => {
          testMap[email].sort((a, b) => {
            const ta = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.date || 0).getTime();
            const tb = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.date || 0).getTime();
            return tb - ta;
          });
        });
      }
      setMentalTests(testMap);
    } catch (err) {
      console.error('CounselorManage fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser, userData]);

  useEffect(() => {
    if (currentUser?.email) fetchData();
  }, [fetchData]);

  async function updateStatus(resId, status) {
    try {
      await updateDoc(doc(db, 'reservations', resId), { status });
      setReservations(prev => prev.map(r => r.id === resId ? { ...r, status } : r));
    } catch { alert('상태 업데이트 실패'); }
  }

  async function suggestTimeForReservation(resId) {
    if (!suggestTime.trim()) { alert('제안할 시간을 입력해주세요.'); return; }
    try {
      await updateDoc(doc(db, 'reservations', resId), {
        status: 'suggested',
        suggestedTime: suggestTime,
        suggestedAt: new Date().toISOString()
      });
      setReservations(prev => prev.map(r =>
        r.id === resId ? { ...r, status: 'suggested', suggestedTime: suggestTime } : r
      ));
      setSuggestingId(null);
      setSuggestTime('');
      alert('시간을 제안했습니다. 고객이 확정하면 알림이 표시됩니다.');
    } catch { alert('시간 제안 실패'); }
  }

  async function openSession(session) {
    setSelectedSession(session);
    setLogText('');
    setAiSummary('');
    setSessionType(session.sessionType || 'independent');
    setClientType(session.clientType || 'amateur');
    try {
      const q = query(
        collection(db, 'counseling_logs'),
        where('reservationId', '==', session.id),
        where('counselorId', '==', currentUser.uid)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0].data();
        setLogText(d.rawLog || '');
        setAiSummary(d.aiSummary || '');
        if (d.sessionType) setSessionType(d.sessionType);
        if (d.clientType) setClientType(d.clientType);
      }
    } catch (err) {
      console.error('상담록 불러오기 실패:', err);
    }
  }

  async function saveLog() {
    if (!selectedSession) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'counseling_logs', selectedSession.id), {
        reservationId: selectedSession.id,
        clientId: selectedSession.clientId || null,
        counselorId: currentUser.uid,
        rawLog: logText,
        aiSummary,
        sessionType,
        clientType,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      await updateDoc(doc(db, 'reservations', selectedSession.id), {
        sessionType,
        clientType
      });

      setReservations(prev => prev.map(r => r.id === selectedSession.id ? { ...r, sessionType, clientType } : r));

      alert('상담록과 세션 분류가 저장되었습니다.');
      if (selectedSession.clientId) {
        onCounselingSessionLogged(selectedSession.clientId, {
          counselorScore: null, algorithmScore: null,
        }).catch(() => {});
      }
    } catch (err) {
      console.error(err);
      alert('저장 실패');
    }
    finally { setSaving(false); }
  }

  async function generateAI() {
    if (!logText.trim()) { alert('작성된 상담록이 없습니다.'); return; }
    setGeneratingAi(true);
    try {
      const clientTests = mentalTests[selectedSession.clientEmail] || [];
      const latest = clientTests[0];
      let ctx = '';
      if (latest) {
        ctx = `\n고객의 최근 멘탈 검진:\n- 훈련 시급 항목: ${latest.summary?.topNeeds?.map(t => typeof t === 'string' ? t : t.name).join(', ')}\n- 평균 요구점수: ${latest.summary?.avgReq}`;
      }
      const prompt = `너는 스포츠 심리 상담 전문가를 위한 AI 어시스턴트야.
아래 [원본 메모]를 상담록으로 깔끔하게 정리해줘. 이 메모를 쓴 상담사가 나중에 다시 읽거나, 다른 상담사에게 인계할 때 바로 이해할 수 있는 수준으로.

원본에 없는 내용을 지어내지 말고, 메모에 실제 있는 내용을 근거로 알아서 적절한 섹션과 구조로 재구성해. 메모 성격에 맞게 스스로 판단해서 짜면 돼 — 짧은 메모면 짧게, 상황·평가·기법·효과 데이터·소감처럼 다양한 내용이 섞여 있으면 그에 맞게 항목을 나눠서.
마크다운 기호(**, #, - 등)는 쓰지 말고 순수 텍스트로 작성해.
${ctx}

[원본 메모]
${logText}`;
      const result = await generateContentWithFallback(prompt);
      setAiSummary(result.response.text());
    } catch (err) {
      alert('AI 요약 생성 오류. API 키를 확인해주세요.');
      console.error(err);
    } finally { setGeneratingAi(false); }
  }

  // Derived lists
  const pendingList   = reservations.filter(r => r.status === 'pending');
  const suggestedList = reservations.filter(r => r.status === 'suggested');
  const acceptedList  = reservations.filter(r => r.status === 'accepted' || r.status === 'confirmed');
  const clientMap = {};
  reservations.forEach(r => {
    if (r.clientEmail) {
      if (!clientMap[r.clientEmail]) {
        clientMap[r.clientEmail] = { name: r.clientName, email: r.clientEmail, sessions: 0, lastDate: null };
      }
      clientMap[r.clientEmail].sessions++;
      const d = r.date || r.suggestedTime || r.createdAt;
      if (!clientMap[r.clientEmail].lastDate || d > clientMap[r.clientEmail].lastDate) {
        clientMap[r.clientEmail].lastDate = d;
      }
    }
  });
  const clientList = Object.values(clientMap);

  const tabs = [
    { id: 'requests',  label: '예약 요청',   icon: Clock,     badge: pendingList.length },
    { id: 'suggested', label: '시간 확정 대기', icon: Send,    badge: suggestedList.length },
    { id: 'sessions',  label: '상담 기록',   icon: FileText,  badge: null },
    { id: 'clients',   label: '클라이언트',  icon: Users,     badge: null },
  ];

  if (!userData) return null;

  return (
    <div className="counselor-manage">
      <div className="container">

        {/* ── Header ── */}
        <div className="cm-header">
          <div className="cm-header-left">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Link to="/counselor-dashboard" className="cm-back-btn" style={{ margin: 0, fontSize: '0.8rem' }}>
                <LayoutDashboard size={13} /> 대시보드
              </Link>
              <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
              <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)' }}>상담 관리</span>
            </div>
            <h1>상담 관리</h1>
            <p>예약 요청 수락 및 상담 기록을 관리합니다 — {userData.name} 상담사</p>
          </div>
          <Link to="/messages" className="btn-outline" style={{ gap: 8 }}>
            <MessageSquare size={15} />
            메시지
          </Link>
        </div>

        {/* ── Tab Bar ── */}
        <div className="cm-tabs">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                className={`cm-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => { setActiveTab(tab.id); setSelectedSession(null); }}
              >
                <Icon size={15} />
                {tab.label}
                {tab.badge > 0 && <span className="cm-tab-badge">{tab.badge}</span>}
              </button>
            );
          })}
        </div>

        {/* ══════════════ TAB: REQUESTS ══════════════ */}
        {activeTab === 'requests' && (
          <div className="cm-content">
            <div className="cm-section-title">
              <Clock size={13} />
              신규 예약 요청 ({pendingList.length})
            </div>
            {loading ? (
              <div className="cm-empty"><p>불러오는 중...</p></div>
            ) : pendingList.length === 0 ? (
              <div className="cm-empty">
                <Clock size={42} style={{ display: 'block', margin: '0 auto 14px' }} />
                신규 예약 요청이 없습니다.
              </div>
            ) : (
              <div className="cm-request-list">
                {pendingList.map(res => (
                  <div key={res.id} className="cm-request-card">
                    <div style={{ flex: 1 }}>
                      <div className="cm-req-name">
                        {res.clientName || 'Client'}
                        {/* Scheduling type badge */}
                        {res.schedulingType === 'timeslot' && (
                          <span style={{ fontSize:'0.7rem', fontWeight:800, color:'#38bdf8', background:'rgba(56,189,248,0.12)', padding:'2px 8px', borderRadius:6, marginLeft:6 }}>
                            <Clock size={10} style={{verticalAlign:'middle',marginRight:3}}/>시간 제안형
                          </span>
                        )}
                        {res.schedulingType === 'callback' && (
                          <span style={{ fontSize:'0.7rem', fontWeight:800, color:'#a78bfa', background:'rgba(167,139,250,0.12)', padding:'2px 8px', borderRadius:6, marginLeft:6 }}>
                            <PhoneCall size={10} style={{verticalAlign:'middle',marginRight:3}}/>직접 연락형
                          </span>
                        )}
                        {mentalTests[res.clientEmail] && (
                          <span className="cm-test-alert">
                            <Brain size={11} />
                            멘탈 검진 {mentalTests[res.clientEmail].length}건
                          </span>
                        )}
                      </div>

                      {/* Location */}
                      {res.locationType && (
                        <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.4)', marginBottom:4, display:'flex', alignItems:'center', gap:5 }}>
                          {res.locationType === 'online'
                            ? <><Monitor size={11}/> 온라인</>  
                            : <><MapPin size={11}/> 오프라인 {res.offlineLocation && `— ${res.offlineLocation}`}</>}
                        </div>
                      )}

                      {/* Sport & concern */}
                      {res.sport && (
                        <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.4)', marginBottom:4, display:'flex', alignItems:'center', gap:5 }}>
                          <Activity size={11} className="text-violet-400" /> 종목: {res.sport}
                        </div>
                      )}
                      {(res.concern || res.message) && (
                        <div className="cm-req-message">
                          <strong>상담 고민:</strong> {res.concern || res.message}
                        </div>
                      )}
                      <div className="cm-req-contact" style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <Mail size={11} /> {res.clientEmail} &nbsp;|&nbsp; <Phone size={11} /> {res.clientPhone || '번호 없음'}
                      </div>
                      {res.schedulingType === 'timeslot' && (res.preferredDays?.length > 0 || res.preferredTimes?.length > 0) && (
                        <div style={{ marginTop:8, padding:'8px 12px', background:'rgba(56,189,248,0.06)', borderRadius:8, border:'1px solid rgba(56,189,248,0.15)', fontSize:'0.78rem', color:'rgba(56,189,248,0.9)', display:'flex', flexDirection:'column', gap:4 }}>
                          {res.preferredDays?.length > 0 && <div style={{ display:'flex', alignItems:'center', gap:4 }}><Calendar size={11} /> 가능 요일: {res.preferredDays.join(', ')}요일</div>}
                          {res.preferredTimes?.length > 0 && <div style={{ display:'flex', alignItems:'center', gap:4 }}><Clock size={11} /> 가능 시간: {res.preferredTimes.join(', ')}</div>}
                        </div>
                      )}
                      {res.schedulingType === 'timeslot' && suggestingId === res.id && (
                        <div style={{ marginTop:12, display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                          <input type="datetime-local" className="glass-input" style={{ flex:1, minWidth:200, padding:'8px 12px', fontSize:'0.82rem' }} value={suggestTime} onChange={e => setSuggestTime(e.target.value)} />
                          <button className="cm-btn-accept" style={{ whiteSpace:'nowrap' }} onClick={() => suggestTimeForReservation(res.id)}><Send size={13}/> 제안 전송</button>
                          <button className="cm-btn-reject" onClick={() => setSuggestingId(null)}><XCircle size={13}/> 취소</button>
                        </div>
                      )}
                    </div>
                    <div className="cm-req-actions" style={{ flexDirection:'column', gap:8, alignSelf:'flex-start' }}>
                      {res.schedulingType === 'timeslot' ? (
                        <>
                          <button className="cm-btn-accept" onClick={() => { setSuggestingId(res.id); setSuggestTime(''); }}><Clock size={15}/> 시간 제안</button>
                          <button className="cm-btn-reject" onClick={() => updateStatus(res.id, 'rejected')}><XCircle size={15}/> 거절</button>
                        </>
                      ) : (
                        <>
                          <button className="cm-btn-accept" onClick={() => updateStatus(res.id, 'accepted')}><CheckCircle size={15}/> 수락</button>
                          <button className="cm-btn-reject" onClick={() => updateStatus(res.id, 'rejected')}><XCircle size={15}/> 거절</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Show rejected/accepted briefly */}
            {reservations.filter(r => r.status !== 'pending').length > 0 && (
              <div style={{ marginTop: 32 }}>
                <div className="cm-section-title">
                  <CheckCircle size={13} />
                  처리 완료
                </div>
                <div className="cm-request-list">
                  {reservations.filter(r => r.status !== 'pending').slice(0, 5).map(res => {
                    const color = res.status === 'accepted' ? '#10B981' : '#FB7185';
                    const label = res.status === 'accepted' ? '수락됨' : '거절됨';
                    return (
                      <div key={res.id} className="cm-request-card" style={{ opacity: 0.65 }}>
                        <div>
                          <div className="cm-req-name">
                            {res.clientName}
                            <span style={{ fontSize: '0.72rem', fontWeight: 800, color, background: `${color}18`, padding: '2px 8px', borderRadius: 6 }}>
                              {label}
                            </span>
                          </div>
                          <div className="cm-req-date"><Calendar size={12} />{fmtDate(res.date)}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════ TAB: SUGGESTED ══════════════ */}
        {activeTab === 'suggested' && (
          <div className="cm-content">
            <div className="cm-section-title">
              <Send size={13} />
              시간 제안 완료 — 고객 확정 대기 ({suggestedList.length})
            </div>
            {loading ? (
              <div className="cm-empty"><p>불러오는 중...</p></div>
            ) : suggestedList.length === 0 ? (
              <div className="cm-empty">
                <Send size={42} style={{ display:'block', margin:'0 auto 14px' }} />
                고객 확정을 기다리는 예약이 없습니다.
              </div>
            ) : (
              <div className="cm-request-list">
                {suggestedList.map(res => (
                  <div key={res.id} className="cm-request-card">
                    <div style={{ flex:1 }}>
                      <div className="cm-req-name">
                        {res.clientName}
                        <span style={{ fontSize:'0.7rem', fontWeight:800, color:'#fbbf24', background:'rgba(251,191,36,0.12)', padding:'2px 8px', borderRadius:6, marginLeft:6, display:'inline-flex', alignItems:'center', gap:4 }}>
                          <Clock size={11} className="animate-pulse" /> 고객 확정 대기
                        </span>
                      </div>
                      <div className="cm-req-contact" style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <Mail size={11} /> {res.clientEmail} &nbsp;|&nbsp; <Phone size={11} /> {res.clientPhone}
                      </div>
                      {res.sport && (
                        <div style={{ fontSize:'0.78rem', color:'rgba(255,255,255,0.4)', marginTop:4, display:'flex', alignItems:'center', gap:5 }}>
                          <Activity size={11} className="text-violet-400" /> {res.sport}
                        </div>
                      )}
                      <div style={{ marginTop:10, padding:'10px 14px', background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.2)', borderRadius:10, fontSize:'0.82rem', color:'#fbbf24', fontWeight:600, display:'flex', alignItems:'center', gap:5 }}>
                        <Calendar size={13} /> 제안한 시간: {res.suggestedTime ? new Date(res.suggestedTime).toLocaleString('ko-KR', { year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' }) : '-'}
                      </div>
                    </div>
                    <div className="cm-req-actions" style={{ flexDirection:'column', gap:8, alignSelf:'flex-start' }}>
                      <button className="cm-btn-reject" onClick={() => updateStatus(res.id, 'pending')}>
                        <XCircle size={13}/> 제안 취소
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════ TAB: SESSIONS ══════════════ */}
        {activeTab === 'sessions' && !selectedSession && (
          <div className="cm-content">
            <div className="cm-section-title">
              <FileText size={13} />
              수락된 상담 내역 ({acceptedList.length})
            </div>
            {loading ? (
              <div className="cm-empty"><p>불러오는 중...</p></div>
            ) : acceptedList.length === 0 ? (
              <div className="cm-empty">
                <FileText size={42} style={{ display: 'block', margin: '0 auto 14px' }} />
                수락된 상담이 없습니다.
              </div>
            ) : (
              <div className="cm-session-grid">
                {acceptedList.map(res => (
                  <div key={res.id} className="cm-session-card">
                    <div className="cm-session-date-badge">{fmtShort(res.date)}</div>
                    <div className="cm-session-client">{res.clientName}</div>
                    <div className="cm-session-time">
                      {new Date(res.date).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <button className="btn-outline" style={{ width: '100%', gap: 8 }} onClick={() => openSession(res)}>
                      <FileText size={14} />
                      상담록 작성 / 조회
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Session Detail Log */}
        {activeTab === 'sessions' && selectedSession && (
          <div className="cm-detail-view">
            <button className="cm-back-btn" onClick={() => setSelectedSession(null)}>
              <ChevronLeft size={15} />
              목록으로 돌아가기
            </button>

            <div className="cm-log-workspace">
              {/* Client Info Panel */}
              <div className="cm-client-panel">
                <div className="cm-client-panel-header">
                  <h3>{selectedSession.clientName} 선수 정보</h3>
                  <p>상담 일시: {fmtDate(selectedSession.date)}</p>
                </div>
                <div className="cm-client-panel-body">
                  {selectedSession.message && (
                    <div style={{ marginBottom: 16 }}>
                      <div className="cm-section-title" style={{ marginBottom: 6 }}>요청 사항</div>
                      <div className="cm-req-message">{selectedSession.message}</div>
                    </div>
                  )}
                  <div className="cm-section-title" style={{ marginBottom: 10 }}>멘탈 검진 이력</div>
                  {(mentalTests[selectedSession.clientEmail]?.length > 0) ? (
                    <div className="cm-test-history">
                      {mentalTests[selectedSession.clientEmail].map((test, i) => (
                        <div key={test.id || i} className="cm-test-history-item">
                          <div className="cm-test-history-name">{test.testName}</div>
                          <div className="cm-test-history-date">{test.date || '날짜 미상'}</div>
                          {test.summary?.topNeeds?.[0] && (
                            <div style={{ marginTop: 6, fontSize: '0.76rem', color: '#818CF8' }}>
                              최우선: {typeof test.summary.topNeeds[0] === 'string' ? test.summary.topNeeds[0] : test.summary.topNeeds[0].name}
                            </div>
                          )}
                          {test.testId !== 'self_talk' && (
                            <Link
                              to={`/test-result/${test.id}`}
                              style={{ display: 'block', marginTop: 8, fontSize: '0.75rem', color: '#0EA5E9', fontWeight: 600 }}
                            >
                              결과 상세보기 →
                            </Link>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="cm-no-test">멘탈 검진 기록 없음</div>
                  )}
                </div>
              </div>

              {/* Editor Panel */}
              <div className="cm-editor-panel">
                {/* Log textarea */}
                <div className="cm-editor-card">
                  <div className="cm-editor-card-header">
                    <h3>상담 세션 메모</h3>
                    <button className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.82rem', gap: 6 }} onClick={saveLog} disabled={saving}>
                      {saving ? '저장 중...' : '저장하기'}
                    </button>
                  </div>
                  <div className="cm-session-meta-selectors" style={{ display: 'flex', gap: '12px', padding: '12px 16px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', fontWeight: 600 }}>상담 유형</label>
                      <select 
                        value={sessionType} 
                        onChange={e => setSessionType(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: 'white', fontSize: '0.8rem', outline: 'none' }}
                      >
                        <option value="independent" style={{ background: '#1e1e24' }}>단독 상담 (Independent)</option>
                        <option value="supervised" style={{ background: '#1e1e24' }}>수퍼비전 상담 (Supervised)</option>
                      </select>
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: '4px', fontWeight: 600 }}>클라이언트 유형</label>
                      <select 
                        value={clientType} 
                        onChange={e => setClientType(e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: 'white', fontSize: '0.8rem', outline: 'none' }}
                      >
                        <option value="amateur" style={{ background: '#1e1e24' }}>아마추어 (Amateur)</option>
                        <option value="elite" style={{ background: '#1e1e24' }}>엘리트 선수 (Elite)</option>
                        <option value="professional" style={{ background: '#1e1e24' }}>프로 선수 (Professional)</option>
                        <option value="national" style={{ background: '#1e1e24' }}>국가대표급 (National)</option>
                      </select>
                    </div>
                  </div>
                  <textarea
                    className="cm-textarea"
                    value={logText}
                    onChange={e => setLogText(e.target.value)}
                    placeholder="상담 중 주요 키워드나 내용을 자유롭게 메모하세요."
                  />
                </div>

                {/* AI Summary */}
                <div className="cm-editor-card">
                  <div className="cm-editor-card-header">
                    <h3 className="cm-ai-header">
                      <Brain size={18} />
                      전문가용 AI 요약 리뷰
                    </h3>
                    <button
                      className="btn-primary"
                      style={{ padding: '8px 16px', fontSize: '0.82rem', gap: 6 }}
                      onClick={generateAI}
                      disabled={generatingAi}
                    >
                      {generatingAi ? '분석 중...' : 'AI 리포트 생성'}
                    </button>
                  </div>
                  {aiSummary ? (
                    <>
                      <textarea
                        className="cm-textarea"
                        value={aiSummary}
                        onChange={e => setAiSummary(e.target.value)}
                        placeholder="AI가 정리한 상담록입니다. 자유롭게 수정한 뒤 저장하세요."
                      />
                      <button
                        className="btn-primary"
                        style={{ padding: '8px 16px', fontSize: '0.82rem', gap: 6, marginTop: 12 }}
                        onClick={saveLog}
                        disabled={saving}
                      >
                        {saving ? '저장 중...' : '저장하기'}
                      </button>
                    </>
                  ) : (
                    <div className="cm-ai-empty">
                      메모를 작성하고 AI 리포트를 생성해보세요.<br />
                      터플리 AI가 다음 세션을 위한 통찰을 제공합니다.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════ TAB: CLIENTS ══════════════ */}
        {activeTab === 'clients' && (
          <div className="cm-content">
            <div className="cm-section-title">
              <Users size={13} />
              클라이언트 목록 ({clientList.length})
            </div>
            {loading ? (
              <div className="cm-empty"><p>불러오는 중...</p></div>
            ) : clientList.length === 0 ? (
              <div className="cm-empty">
                <Users size={42} style={{ display: 'block', margin: '0 auto 14px' }} />
                등록된 클라이언트가 없습니다.
              </div>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 18, overflow: 'hidden' }}>
                <table className="cm-client-table">
                  <thead>
                    <tr>
                      <th>이름</th>
                      <th>이메일</th>
                      <th>상담 횟수</th>
                      <th>마지막 상담</th>
                      <th>멘탈 검진</th>
                      <th>메시지</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientList.map((c, i) => (
                      <tr key={i}>
                        <td>
                          <div className="cm-client-name-cell">
                            <div className="cm-client-avatar">
                              <Users size={15} color="#0EA5E9" />
                            </div>
                            {c.name}
                          </div>
                        </td>
                        <td style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>{c.email}</td>
                        <td>
                          <span style={{ fontWeight: 700, color: '#0EA5E9', fontFamily: 'Inter, sans-serif' }}>
                            {c.sessions}
                          </span>
                          <span style={{ color: 'rgba(255,255,255,0.3)', marginLeft: 2 }}>회</span>
                        </td>
                        <td style={{ color: 'rgba(255,255,255,0.45)' }}>{fmtShort(c.lastDate)}</td>
                        <td>
                          {mentalTests[c.email]?.length > 0
                            ? <span className="cm-test-alert"><Brain size={10} />{mentalTests[c.email].length}건</span>
                            : <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem' }}>없음</span>
                          }
                        </td>
                        <td>
                          <Link
                            to="/messages"
                            className="btn-outline"
                            style={{ padding: '5px 12px', fontSize: '0.75rem', gap: 5 }}
                          >
                            <MessageSquare size={12} />
                            메시지
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
