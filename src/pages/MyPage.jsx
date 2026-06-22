import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { useLanguage } from '../context/LanguageContext';
import {
  Brain, Calendar, Clock, ChevronRight, TrendingUp, MessageSquare,
  User, CheckCircle, AlertCircle, XCircle, Sparkles, RefreshCw,
  Target, Shield, Zap, Activity, BarChart2, FileText, Star, GraduationCap,
  Award, BookOpen, PlayCircle, ClipboardList, PenTool, Users, Building, ShieldCheck,
  Heart, Stethoscope, Thermometer
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  buildPillars,
  computeMentalScoreV3,
  getScoreGrade,
  inferArchetype,
  checkSafetyOverrides,
  ARCHETYPES,
} from '../utils/mentalScore';
import { computeCounselingScore } from '../utils/counselingScore';
import { onScoreComputed } from '../utils/userLearningProfile';
import './MyPage.css';

// ── Gemini ──────────────────────────────────────────────
const getGenAI = () => new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

// ── Date helper ──────────────────────────────────────────
const getTestDate = (test) =>
  test.createdAt?.toMillis?.() ||
  (test.createdAt?.seconds ? test.createdAt.seconds * 1000 : null) ||
  new Date(test.date || 0).getTime();

// (counseling score is now computed via AI in loadData)

// ── 상태 뱃지 ────────────────────────────────────────────
const StatusBadge = ({ status, t }) => {
  const map = {
    accepted: { icon: <CheckCircle size={14} />, label: t('mp_status_accepted'),  cls: 'badge-green'  },
    pending:  { icon: <Clock size={14} />,       label: t('mp_status_pending'),  cls: 'badge-yellow' },
    rejected: { icon: <XCircle size={14} />,     label: t('mp_status_rejected'), cls: 'badge-red'    },
  };
  const s = map[status] || { icon: <AlertCircle size={14} />, label: status, cls: '' };
  return (
    <span className={`status-badge ${s.cls}`}>
      {s.icon} {s.label}
    </span>
  );
};

// ─────────────────────────────────────────────────────────
const MyPage = () => {
  const { currentUser, userRole, userData } = useAuth();
  const { t, lang } = useLanguage();

  const [loading, setLoading]               = useState(true);
  const [tests,   setTests]                 = useState([]);
  const [reservations, setReservations]     = useState([]);
  const [counselingLogs, setCounselingLogs] = useState([]);
  const [latestVital, setLatestVital]       = useState(null);

  const [perfScore,     setPerfScore]     = useState(null);
  const [scoreInputs,   setScoreInputs]   = useState({});
  const [archetype,     setArchetype]     = useState('general_adult');
  const [overrides,     setOverrides]     = useState([]);
  const [aiAnalysis,    setAiAnalysis]    = useState('');
  const [aiLoading,     setAiLoading]     = useState(false);
  const [aiGenerated,   setAiGenerated]   = useState(false);

  const [activeTab, setActiveTab] = useState('overview');
  const [expertSubTab, setExpertSubTab] = useState('education');

  const [counselorClients, setCounselorClients] = useState([]);
  const [counselorReservations, setCounselorReservations] = useState([]);
  const [counselorLogsMap, setCounselorLogsMap] = useState({});
  const [expandedClients, setExpandedClients] = useState({});

  const toggleClientExpand = (email) => {
    setExpandedClients(prev => ({ ...prev, [email]: !prev[email] }));
  };

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      if (userRole === 'counselor') {
        let qRes = query(collection(db, 'reservations'), where('counselorEmail', '==', currentUser.email));
        let resSnap = await getDocs(qRes);
        let resDocs = [...resSnap.docs];

        const qCounselor = query(collection(db, 'counselors'), where('linkedEmail', '==', currentUser.email));
        const cSnap = await getDocs(qCounselor);
        let cName = '';
        if (!cSnap.empty) {
          cName = cSnap.docs[0].data().counselor_name || '';
          if (cName) {
            const qResName = query(collection(db, 'reservations'), where('counselorName', '==', cName));
            const nameResSnap = await getDocs(qResName);
            const existingIds = new Set(resDocs.map(d => d.id));
            nameResSnap.docs.forEach(d => {
              if (!existingIds.has(d.id)) {
                resDocs.push(d);
              }
            });
          }
        }

        const resData = resDocs.map(d => ({ id: d.id, ...d.data() }));
        resData.sort((a, b) => {
          const ta = a.date ? new Date(a.date).getTime() : 0;
          const tb = b.date ? new Date(b.date).getTime() : 0;
          return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta);
        });
        setReservations(resData);

        const clientReservations = {};
        const clientNames = {};
        resData.forEach(r => {
          const cEmail = r.clientEmail;
          if (cEmail) {
            clientNames[cEmail] = r.clientName || cEmail.split('@')[0];
            if (!clientReservations[cEmail]) {
              clientReservations[cEmail] = [];
            }
            clientReservations[cEmail].push(r);
          }
        });

        const clientEmails = Object.keys(clientReservations);
        const clientTestsMap = {};

        if (clientEmails.length > 0) {
          for (let i = 0; i < clientEmails.length; i += 10) {
            const chunk = clientEmails.slice(i, i + 10);
            const qTests = query(collection(db, 'mental_tests'), where('clientEmail', 'in', chunk));
            const tSnap = await getDocs(qTests);
            tSnap.docs.forEach(d => {
              const tData = { id: d.id, ...d.data() };
              const cEmail = tData.clientEmail;
              if (cEmail) {
                if (!clientTestsMap[cEmail]) {
                  clientTestsMap[cEmail] = [];
                }
                clientTestsMap[cEmail].push(tData);
              }
            });
          }
        }

        Object.keys(clientTestsMap).forEach(cEmail => {
          clientTestsMap[cEmail].sort((a, b) => {
            const ta = a.createdAt?.toMillis?.() || new Date(a.date || 0).getTime();
            const tb = b.createdAt?.toMillis?.() || new Date(b.date || 0).getTime();
            return tb - ta;
          });
        });

        const resIds = resData.map(r => r.id);
        const logsMap = {};
        const allLogs = [];
        if (resIds.length > 0) {
          for (let i = 0; i < resIds.length; i += 10) {
            const chunk = resIds.slice(i, i + 10);
            const qLogs = query(collection(db, 'counseling_logs'), where('reservationId', 'in', chunk));
            const lSnap = await getDocs(qLogs);
            lSnap.docs.forEach(d => {
              const lData = { id: d.id, ...d.data() };
              logsMap[lData.reservationId] = lData;
              allLogs.push(lData);
            });
          }
        }
        setCounselingLogs(allLogs);

        const structured = clientEmails.map(cEmail => ({
          email: cEmail,
          name: clientNames[cEmail],
          reservations: clientReservations[cEmail] || [],
          tests: clientTestsMap[cEmail] || [],
        }));

        setCounselorClients(structured);
        setCounselorReservations(resData);
        setCounselorLogsMap(logsMap);

      } else {
        let testsData = [];
        const qEmail = query(collection(db, 'mental_tests'), where('clientEmail', '==', currentUser.email));
        const snap   = await getDocs(qEmail);
        testsData    = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (testsData.length === 0) {
          const qUid  = query(collection(db, 'mental_tests'), where('clientId', '==', currentUser.uid));
          const snapU = await getDocs(qUid);
          testsData   = snapU.docs.map(d => ({ id: d.id, ...d.data() }));
        }
        testsData.sort((a, b) => {
          const ta = a.createdAt?.toMillis?.() || new Date(a.date || 0).getTime();
          const tb = b.createdAt?.toMillis?.() || new Date(b.date || 0).getTime();
          return tb - ta;
        });
        setTests(testsData);

        const qRes  = query(collection(db, 'reservations'), where('clientEmail', '==', currentUser.email));
        const resSnap = await getDocs(qRes);
        const resData = resSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        resData.sort((a, b) => {
          const ta = a.date ? new Date(a.date).getTime() : 0;
          const tb = b.date ? new Date(b.date).getTime() : 0;
          return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta);
        });
        setReservations(resData);

        const resIds = resData.map(r => r.id);
        let logsData = [];
        if (resIds.length > 0) {
          const qLogs   = query(collection(db, 'counseling_logs'), where('reservationId', 'in', resIds.slice(0, 10)));
          const logsSnap = await getDocs(qLogs);
          logsData       = logsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          logsData.sort((a, b) => {
            const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
            const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
            return (isNaN(tb) ? 0 : tb) - (isNaN(ta) ? 0 : ta);
          });
        }
        setCounselingLogs(logsData);
 
        // Fetch vitals history from Firestore
        const qVitals = query(collection(db, 'users', currentUser.uid, 'vitals_history'));
        const vitalsSnap = await getDocs(qVitals);
        const vitalsData = vitalsSnap.docs.map(d => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            temperature: data.bodyTemp,
            systolic: data.bpSys,
            diastolic: data.bpDia,
            heartRate: data.bpm,
            respirationRate: data.respRate,
            stressLevel: data.stress,
            date: data.measuredAt
          };
        });
        vitalsData.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
        setLatestVital(vitalsData[0] || null);

        const inferred = inferArchetype(userRole, userData, testsData);
        setArchetype(inferred);
 
        const pillarsFast = buildPillars(testsData, vitalsData, logsData, null);
        setScoreInputs(pillarsFast);
        setPerfScore(computeMentalScoreV3(pillarsFast, inferred));
 
        computeCounselingScore(currentUser.uid, logsData).then(({ score: cs }) => {
          const pillarsReal = buildPillars(testsData, vitalsData, logsData, cs);
          setScoreInputs(pillarsReal);
          const finalScore = computeMentalScoreV3(pillarsReal, inferred);
          setPerfScore(finalScore);
          setOverrides(checkSafetyOverrides(pillarsReal, pillarsReal._subs || {}));
          if (finalScore !== null) {
            onScoreComputed(currentUser.uid, {
              total: finalScore,
              pillars: pillarsReal,
              archetype: inferred,
            }).catch(() => {});
          }
        }).catch(() => {});
      }
    } catch (err) {
      console.error('MyPage load error:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser, userRole, userData]);

  useEffect(() => { loadData(); }, [loadData]);

  const generateAiAnalysis = async () => {
    if (tests.length < 2) return;
    setAiLoading(true);
    try {
      const genAI = getGenAI();
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

      const testSummary = tests.slice(0, 5).map((t, i) => {
        if (t.testId === 'self_talk' && t.scores) {
          return `Test${i+1}(Self-Talk): P+=${t.scores.PP}, P-=${t.scores.PM}, N+=${t.scores.NP}, N-=${t.scores.NM}`;
        }
        if (t.testId === 'burnout' && t.summary) {
          return `Test${i+1}(Burnout): Avg=${t.summary.burnoutAvg}, Stage=${t.summary.burnoutStage}`;
        }
        if (t.summary) {
          const needs = (t.summary.topNeeds || []).map(n => typeof n === 'string' ? n : n.name).join(', ');
          return `Test${i+1}(${t.testName}): Urgency=${t.summary.avgNeed}, Req=${t.summary.avgReq}, Curr=${t.summary.avgCurr}, Weakness=[${needs}]`;
        }
        return '';
      }).filter(Boolean).join('\n');

      const logSummary = counselingLogs.slice(0, 3).map((l, i) =>
        `Log${i+1}: ${(l.rawLog || '').slice(0, 200)}`
      ).join('\n');

      const prompt = `
You are a sports psychology expert. Analyze the mental test data and counseling history of the athlete below and provide a comprehensive performance evaluation.

[Mental Test Data]
${testSummary}

[Counseling History Summary]
${logSummary || 'No history yet'}

[Calculated Performance Score] ${perfScore}/100

Please analyze concisely with the following 3 items (2-3 sentences each):
1. **Overall Mental State Assessment**: Evaluate the current mental state from an expert's perspective.
2. **Strengths**: Mental elements that are well-equipped.
3. **Core Tasks for Improvement**: The most urgent mental elements to strengthen and specific methods.

IMPORTANT: Please reply in ${lang === 'ko' ? 'Korean' : 'English'}.
Do not use markdown headers (##), only use **bold**.
      `;

      const result = await model.generateContent(prompt);
      setAiAnalysis(result.response.text());
      setAiGenerated(true);
    } catch (err) {
      console.error('AI analysis error:', err);
      setAiAnalysis(lang === 'ko' ? 'AI 분석 중 오류가 발생했습니다.' : 'An error occurred during AI analysis.');
    } finally {
      setAiLoading(false);
    }
  };

  // Derived display values (computed before any early returns so student view can use them)
  const grade = perfScore !== null ? getScoreGrade(perfScore, lang) : null;
  const cutoff = Date.now() - 21 * 24 * 60 * 60 * 1000;
  const windowTests = tests.filter(t => getTestDate(t) > cutoff);
  const dashTests = windowTests.filter(test => test.testId !== 'self_talk' && test.testId !== 'burnout' && test.testId !== 'tops' && test.summary);
  const selfTests = windowTests.filter(test => test.testId === 'self_talk');
  const latestDash = dashTests[0];
  const latestSelf = selfTests[0];
  const acceptedRes = reservations.filter(r => r.status === 'accepted');
  const activeInputs = Object.entries(scoreInputs).filter(([k, v]) => !k.startsWith('_') && v != null).length;
  const archetypeInfo = ARCHETYPES[archetype] || ARCHETYPES.general_adult;


  if (!currentUser) {
    return (
      <div className="page-container text-center" style={{ paddingTop: '120px' }}>
        <h2>{t('mp_no_permission')}</h2>
      </div>
    );
  }

  // ── Student Dashboard ──────────────────────────────────
  if (userRole === 'student') {
    return (
      <div className="mypage-root page-container animate-fade-in">
        <div className="container">

          {/* Header */}
          <div className="mypage-hero">
            <div className="hero-left">
              <div className="hero-avatar" style={{ background: 'linear-gradient(135deg, #a78bfa, #7c3aed)' }}>
                <GraduationCap size={28} />
              </div>
              <div>
                <h1 className="heading-h1 neon-text" style={{ fontSize: '2rem', marginBottom: '4px' }}>
                  {userData?.name || currentUser.email.split('@')[0]}
                </h1>
                <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>
                  {currentUser.email} · 학생 회원{userData?.school ? ` · ${userData.school}` : ''}{userData?.grade ? ` ${userData.grade}` : ''}
                </p>
              </div>
            </div>
            <button className="refresh-btn btn-outline" onClick={loadData} disabled={loading}>
              <RefreshCw size={15} className={loading ? 'spin' : ''} />
              {t('mp_refresh')}
            </button>
          </div>

          {loading ? (
            <div className="mypage-loading">
              <div className="loading-spinner" />
              <p>{t('mp_loading_data')}</p>
            </div>
          ) : (
            <div className="tab-panel fade-in">

              {/* 1 ── Mental Score Card */}
              <Link to="/mental-score" className="perf-score-card glass-panel perf-score-card-link">
                <div className="perf-card-header">
                  <div className="perf-title-area">
                    <Activity size={20} />
                    <span>{t('mp_perf_score')}</span>
                    {perfScore !== null && (
                      <span className="perf-powered-by">{t('mp_ai_based')}</span>
                    )}
                  </div>
                  <span style={{ fontSize: '0.78rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
                    {lang === 'ko' ? '상세보기' : 'Details'} <ChevronRight size={14} />
                  </span>
                </div>

                {perfScore === null ? (
                  <div className="perf-insufficient">
                    <div className="perf-score-placeholder">
                      <div className="placeholder-ring">?</div>
                    </div>
                    <div className="perf-insufficient-text">
                      <h3>{t('mp_insufficient_data')}</h3>
                      <p>{t('mp_insufficient_desc')}</p>
                      <span className="btn-primary" style={{ marginTop: '12px', display: 'inline-flex' }}>
                        {t('mp_start_test')}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="perf-score-body">
                    <div className="score-gauge-wrap">
                      <svg className="score-gauge" viewBox="0 0 200 200">
                        <circle cx="100" cy="100" r="83" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14" />
                        <circle
                          cx="100" cy="100" r="83"
                          fill="none"
                          stroke={grade.color}
                          strokeWidth="14"
                          strokeLinecap="round"
                          strokeDasharray={`${(perfScore / 100) * 521} 521`}
                          transform="rotate(-90 100 100)"
                          style={{ filter: `drop-shadow(0 0 10px ${grade.color}66)` }}
                        />
                        <g transform="translate(100, 100)">
                          <text textAnchor="middle" fill="#fff" fontSize="42" fontWeight="800" dy="-5">{perfScore}</text>
                          <text textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="14" fontWeight="500" dy="24">/ 100</text>
                        </g>
                      </svg>
                      <div className="score-grade-badge" style={{ color: grade.color }}>
                        {grade.emoji} {grade.label}
                      </div>
                    </div>
                    <div className="perf-metrics">
                      <div className="perf-metric-item">
                        <Brain size={18} />
                        <span className="pm-label">{t('mp_metric_test')}</span>
                        <span className="pm-value">{tests.length}{lang === 'ko' ? '회' : ''}</span>
                      </div>
                      {latestSelf && (
                        <div className="perf-metric-item">
                          <Zap size={18} />
                          <span className="pm-label">{t('mp_metric_selftalk')}</span>
                          <span className="pm-value">
                            {latestSelf.scores ? latestSelf.scores.PP + latestSelf.scores.NP : '-'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Link>

              {/* 2 ── Bio Data / Biometric Dashboard */}
              <div className="glass-panel" style={{ marginTop: '20px', padding: '24px' }}>
                <div className="ov-card-header" style={{ marginBottom: '18px' }}>
                  <Activity size={18} />
                  <span style={{ fontWeight: 700, fontSize: '1rem' }}>{lang === 'ko' ? '바이오 데이터' : 'Biometric Data'}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
                    {lang === 'ko' ? '최근 기록 기반' : 'Based on recent records'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                  {[
                    { icon: <Heart size={26} />, label: lang === 'ko' ? '심박수' : 'Heart Rate', value: latestVital?.bpm ?? '—', unit: 'bpm', color: '#fb7185' },
                    { icon: <Stethoscope size={26} />, label: lang === 'ko' ? '혈압' : 'Blood Pressure', value: latestVital?.bpSys && latestVital?.bpDia ? `${latestVital.bpSys}/${latestVital.bpDia}` : '—', unit: 'mmHg', color: '#60a5fa' },
                    { icon: <Thermometer size={26} />, label: lang === 'ko' ? '체온' : 'Body Temp', value: latestVital?.bodyTemp ?? '—', unit: '°C', color: '#f87171' },
                    { icon: <Activity size={26} />, label: lang === 'ko' ? '스트레스' : 'Stress', value: latestVital?.stress ?? '—', unit: '%', color: '#fbbf24' },
                  ].map((item, i) => (
                    <div key={i} className="glass-panel" style={{ padding: '16px', textAlign: 'center', borderTop: `2px solid ${item.color}44` }}>
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '32px', marginBottom: '8px', color: item.color }}>{item.icon}</div>
                      <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginBottom: '4px' }}>{item.label}</div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: item.color }}>{item.value}</div>
                      <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>{item.unit}</div>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.28)', marginTop: '14px', textAlign: 'center' }}>
                  {lang === 'ko' ? '📲 웨어러블 기기 연동 시 자동으로 업데이트됩니다.' : '📲 Auto-updates when a wearable device is connected.'}
                </p>
              </div>

              {/* 3 ── Self-Talk */}
              <div className="overview-cards" style={{ marginTop: '20px' }}>
                <div className="ov-card glass-panel">
                  <div className="ov-card-header">
                    <Zap size={18} />
                    <span>{lang === 'ko' ? '셀프톡 (Self-Talk)' : 'Self-Talk'}</span>
                  </div>
                  {latestSelf ? (
                    <>
                      <div className="selftalk-scores" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '12px 0' }}>
                        {[
                          { key: 'PP', label: 'P+', color: '#10b981' },
                          { key: 'PM', label: 'P-', color: '#fbbf24' },
                          { key: 'NP', label: 'N+', color: '#0084ff' },
                          { key: 'NM', label: 'N-', color: '#fb7185' },
                        ].map(s => (
                          <div key={s.key} className="st-score-box" style={{ borderColor: s.color + '44' }}>
                            <span className="st-score-label" style={{ color: s.color }}>{s.label}</span>
                            <span className="st-score-val">{latestSelf.scores?.[s.key] || 0}</span>
                          </div>
                        ))}
                      </div>
                      <Link to="/my-tests" className="ov-link">
                        {t('mp_total_view')} <ChevronRight size={14} />
                      </Link>
                    </>
                  ) : (
                    <>
                      <div className="ai-shortcut-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', flex: 1 }}>
                        <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', textAlign: 'center', margin: 0 }}>
                          {lang === 'ko' ? '아직 셀프톡 기록이 없습니다.' : 'No Self-Talk records yet.'}
                        </p>
                      </div>
                      <Link to="/test/self_talk" className="btn-primary" style={{ width: '100%', marginTop: 'auto' }}>
                        {lang === 'ko' ? '셀프톡 시작' : 'Start Self-Talk'}
                      </Link>
                    </>
                  )}
                </div>

                {/* 4 ── AI Counselor */}
                <div className="ov-card glass-panel ai-shortcut-card">
                  <div className="ov-card-header">
                    <Sparkles size={18} />
                    <span>{t('nav_ai_counselor')}</span>
                  </div>
                  <div className="ai-shortcut-body">
                    <div className="ai-icon-wrap">🧠</div>
                    <p>{t('mp_ai_counselor_desc')}</p>
                  </div>
                  <Link to="/ai-counselor" className="btn-primary" style={{ width: '100%', marginTop: 'auto' }}>
                    {t('mp_ai_counselor_start')}
                  </Link>
                </div>

                {/* 5 ── Mental Test (replaces Mental Training for students) */}
                <div className="ov-card glass-panel">
                  <div className="ov-card-header">
                    <ClipboardList size={18} />
                    <span>{lang === 'ko' ? '멘탈 테스트' : 'Mental Test'}</span>
                  </div>
                  <div className="ai-shortcut-body">
                    <div className="ai-icon-wrap">🧪</div>
                    <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', textAlign: 'center' }}>
                      {lang === 'ko'
                        ? '셀프톡, TOPS 등 다양한 멘탈 테스트로 내 멘탈 상태를 확인해보세요.'
                        : 'Check your mental state with Self-Talk, TOPS, and more mental tests.'}
                    </p>
                  </div>
                  <Link to="/test" className="btn-primary" style={{ width: '100%', marginTop: 'auto' }}>
                    {lang === 'ko' ? '테스트 시작하기' : 'Start Tests'}
                  </Link>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="mypage-root page-container animate-fade-in">
      <div className="container">

        {/* ━━━ Header ━━━ */}
        <div className="mypage-hero">
          <div className="hero-left">
            <div className="hero-avatar">
              <User size={32} />
            </div>
            <div>
              <h1 className="heading-h1 neon-text" style={{ fontSize: '2rem', marginBottom: '4px' }}>
                {currentUser.email.split('@')[0]}
              </h1>
              <p className="text-muted" style={{ margin: 0, fontSize: '0.9rem' }}>
                {currentUser.email} · {userRole === 'counselor' ? t('nav_user_counselor') : t('mp_member_type')}
              </p>
            </div>
          </div>
          <button className="refresh-btn btn-outline" onClick={loadData} disabled={loading}>
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            {t('mp_refresh')}
          </button>
        </div>

        <div className="mypage-tabs">
          {[
            { key: 'overview',   label: `📊 ${t('mp_tab_dashboard')}` },
            userRole !== 'counselor' && { key: 'tests',      label: `🧪 ${t('mp_tab_tests')}` },
            { key: 'counseling', label: `📋 ${t('mp_tab_counseling')}` },
            userRole === 'counselor' && { key: 'expert',     label: `🎓 ${lang === 'ko' ? '교육/인증' : 'Expert'}` },
          ].filter(Boolean).map(tab => (
            <button
              key={tab.key}
              className={`mypage-tab-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="mypage-loading">
            <div className="loading-spinner" />
            <p>{t('mp_loading_data')}</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && userRole !== 'counselor' && (
              <div className="tab-panel fade-in">
                {/* ── Performance Score Card (clickable → detail) ── */}
                <Link to="/mental-score" className="perf-score-card glass-panel perf-score-card-link">
                  <div className="perf-card-header">
                    <div className="perf-title-area">
                      <Activity size={20} />
                      <span>{t('mp_perf_score')}</span>
                      {perfScore !== null && (
                        <span className="perf-powered-by">{t('mp_ai_based')}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {perfScore !== null && tests.length >= 2 && (
                        <button
                          className="ai-analyze-btn btn-primary"
                          onClick={e => { e.preventDefault(); generateAiAnalysis(); }}
                          disabled={aiLoading}
                        >
                          {aiLoading
                            ? <><RefreshCw size={14} className="spin" /> {t('mp_analyzing')}</>
                            : <><Sparkles size={14} /> {t('mp_ai_deep_analyze')}</>
                          }
                        </button>
                      )}
                      <span style={{ fontSize: '0.78rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>
                        {lang === 'ko' ? '상세보기' : 'Details'} <ChevronRight size={14} />
                      </span>
                    </div>
                  </div>

                  {perfScore === null ? (
                    <div className="perf-insufficient">
                      <div className="perf-score-placeholder">
                        <div className="placeholder-ring">?</div>
                      </div>
                      <div className="perf-insufficient-text">
                        <h3>{t('mp_insufficient_data')}</h3>
                        <p>{t('mp_insufficient_desc')}</p>
                        <span className="btn-primary" style={{ marginTop: '12px', display: 'inline-flex' }}>
                          {t('mp_start_test')}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="perf-score-body">
                      <div className="score-gauge-wrap">
                        <svg className="score-gauge" viewBox="0 0 200 200">
                          <circle cx="100" cy="100" r="83" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14" />
                          <circle
                            cx="100" cy="100" r="83"
                            fill="none"
                            stroke={grade.color}
                            strokeWidth="14"
                            strokeLinecap="round"
                            strokeDasharray={`${(perfScore / 100) * 521} 521`}
                            transform="rotate(-90 100 100)"
                            style={{ filter: `drop-shadow(0 0 10px ${grade.color}66)` }}
                          />
                          <g transform="translate(100, 100)">
                            <text textAnchor="middle" fill="#fff" fontSize="42" fontWeight="800" dy="-5">{perfScore}</text>
                            <text textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="14" fontWeight="500" dy="24">/ 100</text>
                          </g>
                        </svg>
                        <div className="score-grade-badge" style={{ color: grade.color }}>
                          {grade.emoji} {grade.label}
                        </div>
                      </div>

                      <div className="perf-metrics">
                        <div className="perf-metric-item">
                          <Brain size={18} />
                          <span className="pm-label">{t('mp_metric_test')}</span>
                          <span className="pm-value">{tests.length}{lang === 'ko' ? '회' : ''}</span>
                        </div>
                        <div className="perf-metric-item">
                          <Users size={18} />
                          <span className="pm-label">{t('mp_metric_session')}</span>
                          <span className="pm-value">{counselingLogs.length}{lang === 'ko' ? '회' : ''}</span>
                        </div>
                        {latestDash && (
                          <div className="perf-metric-item">
                            <Target size={18} />
                            <span className="pm-label">{t('mp_metric_urgency')}</span>
                            <span className="pm-value">{latestDash.summary?.avgNeed}</span>
                          </div>
                        )}
                        {latestSelf && (
                          <div className="perf-metric-item">
                            <Zap size={18} />
                            <span className="pm-label">{t('mp_metric_selftalk')}</span>
                            <span className="pm-value">
                              {latestSelf.scores ? latestSelf.scores.PP + latestSelf.scores.NP : '-'}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="data-window-hint" style={{ width: '100%' }}>
                        <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          {archetypeInfo.emoji} {lang === 'ko' ? archetypeInfo.ko : archetypeInfo.en}
                          {' · '}
                          {lang === 'ko'
                            ? `${activeInputs}개 축 활성 · 클릭하여 상세 분석 보기`
                            : `${activeInputs} pillars active · Click for detailed breakdown`}
                        </span>
                        {overrides.length > 0 && (
                          <span style={{ fontSize: '11px', color: '#fb7185', display: 'flex', alignItems: 'center', gap: '5px', marginTop: 4 }}>
                            ⚠️ {overrides.length}{lang === 'ko' ? '개 주의 알림 — 상세보기에서 확인' : ' alert(s) — see detail page'}
                          </span>
                        )}
                      </div>

                    </div>
                  )}

                  {aiGenerated && aiAnalysis && (
                    <div className="ai-analysis-box">
                      <div className="ai-analysis-header">
                        <Brain size={16} />
                        <span>{t('mp_ai_report_header')}</span>
                      </div>
                      <div className="ai-analysis-content">
                        {aiAnalysis.split('\n').map((line, i) => {
                          if (!line.trim()) return null;
                          const parts = line.split(/(\*\*[^*]+\*\*)/g);
                          return (
                            <p key={i}>
                              {parts.map((part, j) =>
                                part.startsWith('**') && part.endsWith('**')
                                  ? <strong key={j} style={{ color: '#60c0ff' }}>{part.slice(2, -2)}</strong>
                                  : part
                              )}
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </Link>

                {/* 2 ── Bio Data / Biometric Dashboard */}
                <div className="glass-panel" style={{ marginTop: '20px', padding: '24px' }}>
                  <div className="ov-card-header" style={{ marginBottom: '18px' }}>
                    <Activity size={18} />
                    <span style={{ fontWeight: 700, fontSize: '1rem' }}>{lang === 'ko' ? '바이오 데이터' : 'Biometric Data'}</span>
                    <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>
                      {lang === 'ko' ? '최근 기록 기반' : 'Based on recent records'}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                    {[
                      { icon: <Heart size={26} />, label: lang === 'ko' ? '심박수' : 'Heart Rate', value: latestVital?.bpm ?? '—', unit: 'bpm', color: '#fb7185' },
                      { icon: <Stethoscope size={26} />, label: lang === 'ko' ? '혈압' : 'Blood Pressure', value: latestVital?.bpSys && latestVital?.bpDia ? `${latestVital.bpSys}/${latestVital.bpDia}` : '—', unit: 'mmHg', color: '#60a5fa' },
                      { icon: <Thermometer size={26} />, label: lang === 'ko' ? '체온' : 'Body Temp', value: latestVital?.bodyTemp ?? '—', unit: '°C', color: '#f87171' },
                      { icon: <Activity size={26} />, label: lang === 'ko' ? '스트레스' : 'Stress', value: latestVital?.stress ?? '—', unit: '%', color: '#fbbf24' },
                    ].map((item, i) => (
                      <div key={i} className="glass-panel" style={{ padding: '16px', textAlign: 'center', borderTop: `2px solid ${item.color}44` }}>
                        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '32px', marginBottom: '8px', color: item.color }}>{item.icon}</div>
                        <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)', marginBottom: '4px' }}>{item.label}</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 800, color: item.color }}>{item.value}</div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)' }}>{item.unit}</div>
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.28)', marginTop: '14px', textAlign: 'center' }}>
                    {lang === 'ko' ? '📲 웨어러블 기기 및 키오스크 연동 시 자동으로 업데이트됩니다.' : '📲 Auto-updates when a wearable device or kiosk is connected.'}
                  </p>
                </div>

                <div className="overview-cards">
                  <div className="ov-card glass-panel">
                    <div className="ov-card-header">
                      <Brain size={18} />
                      <span>{t('mp_recent_mental_test')}</span>
                    </div>
                    {latestDash ? (
                      <>
                        <div className="ov-main-stat" style={{ color: 'var(--color-primary)' }}>
                          {Math.round(((5 - (latestDash.summary?.avgNeed || 0)) / 5) * 100)}
                          <span className="ov-stat-unit">/ 100</span>
                        </div>
                        <p className="ov-desc">{t('mp_mental_perf_izof')}</p>
                        {latestDash.summary?.topNeeds?.length > 0 && (
                          <div className="ov-tags">
                            {latestDash.summary.topNeeds.slice(0, 2).map((n, i) => (
                              <span key={i} className="ov-tag">
                                {typeof n === 'string' ? n : n.name}
                              </span>
                            ))}
                          </div>
                        )}
                        <Link to="/my-tests" className="ov-link">
                          {t('mp_total_view')} <ChevronRight size={14} />
                        </Link>
                      </>
                    ) : (
                      <>
                        <div className="ai-shortcut-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', flex: 1 }}>
                          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', textAlign: 'center', margin: 0 }}>
                            {t('mp_no_activity')}
                          </p>
                        </div>
                        <Link to="/test" className="btn-primary" style={{ width: '100%', marginTop: 'auto' }}>
                          {t('mp_start_test')}
                        </Link>
                      </>
                    )}
                  </div>

                  <div className="ov-card glass-panel">
                    <div className="ov-card-header">
                      <Calendar size={18} />
                      <span>{t('mp_counseling_status')}</span>
                    </div>
                    {reservations.length > 0 ? (
                      <>
                        <div className="ov-main-stat" style={{ color: '#10b981' }}>
                          {acceptedRes.length}
                          <span className="ov-stat-unit">회</span>
                        </div>
                        <p className="ov-desc">{t('mp_counseling_accepted')}</p>
                        <div className="ov-tags">
                          <span className="ov-tag badge-yellow">
                            {t('mp_status_pending')} {reservations.filter(res => res.status === 'pending').length}
                          </span>
                          <span className="ov-tag badge-green">
                            {t('mp_status_accepted')} {acceptedRes.length}
                          </span>
                        </div>
                        <Link to="/my-counseling" className="ov-link">
                          {t('mp_total_view')} <ChevronRight size={14} />
                        </Link>
                      </>
                    ) : (
                      <>
                        <div className="ai-shortcut-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', flex: 1 }}>
                          <p style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', textAlign: 'center', margin: 0 }}>
                            {t('mp_no_counseling')}
                          </p>
                        </div>
                        <Link to="/counselors" className="btn-primary" style={{ width: '100%', marginTop: 'auto' }}>
                          {t('nav_reservation')}
                        </Link>
                      </>
                    )}
                  </div>

                  <div className="ov-card glass-panel ai-shortcut-card">
                    <div className="ov-card-header">
                      <Sparkles size={18} />
                      <span>{t('nav_ai_counselor')}</span>
                    </div>
                    <div className="ai-shortcut-body">
                      <div className="ai-icon-wrap">🧠</div>
                      <p>{t('mp_ai_counselor_desc')}</p>
                    </div>
                    <Link to="/ai-counselor" className="btn-primary" style={{ width: '100%', marginTop: 'auto' }}>
                      {t('mp_ai_counselor_start')}
                    </Link>
                  </div>
                </div>

                <div className="timeline-section glass-panel">
                  <h3 className="section-title-sm">
                    <Clock size={16} /> {t('mp_recent_activity')}
                  </h3>
                  <div className="timeline">
                    {[
                      ...tests.slice(0, 3).map(testItem => ({
                        type: 'test',
                        label: `${t('mp_test_completed')} — ${testItem.testName}`,
                        date: testItem.date || (testItem.createdAt?.toDate?.()?.toLocaleDateString() || ''),
                        timestamp: testItem.createdAt?.toMillis?.() || new Date(testItem.date || 0).getTime(),
                        icon: <Brain size={14} />,
                        color: '#0084ff',
                      })),
                      ...reservations.slice(0, 3).map(r => ({
                        type: 'res',
                        label: `${t('mp_res_completed')} — ${r.counselorName || '...' }`,
                        date: r.date ? new Date(r.date).toLocaleDateString() : '',
                        timestamp: r.date ? new Date(r.date).getTime() : 0,
                        icon: <Calendar size={14} />,
                        color: '#10b981',
                        status: r.status,
                      })),
                    ]
                      .sort((a, b) => b.timestamp - a.timestamp)
                      .slice(0, 5)
                      .map((item, i) => (
                        <div key={i} className="timeline-item">
                          <div className="timeline-dot" style={{ background: item.color }}>
                            {item.icon}
                          </div>
                          <div className="timeline-content">
                            <span className="timeline-label">{item.label}</span>
                            {item.status && <StatusBadge status={item.status} t={t} />}
                          </div>
                          <span className="timeline-date">{item.date}</span>
                        </div>
                      ))}
                    {tests.length === 0 && reservations.length === 0 && (
                      <p className="text-muted text-center" style={{ padding: '24px 0' }}>
                        {t('mp_no_activity')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'overview' && userRole === 'counselor' && (
              <div className="tab-panel fade-in">
                {/* Counselor Stats Grid */}
                <div className="expert-info-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '24px' }}>
                  <div className="cert-info-item glass-panel">
                    <span className="ci-label">{lang === 'ko' ? '관리 중인 클라이언트' : 'Active Clients'}</span>
                    <span className="ci-val text-purple">{counselorClients.length}명</span>
                  </div>
                  <div className="cert-info-item glass-panel">
                    <span className="ci-label">{lang === 'ko' ? '총 상담 완료' : 'Completed Sessions'}</span>
                    <span className="ci-val text-teal">{counselorReservations.filter(r => r.status === 'accepted').length}회</span>
                  </div>
                  <div className="cert-info-item glass-panel">
                    <span className="ci-label">{lang === 'ko' ? '대기 중인 예약' : 'Pending Requests'}</span>
                    <span className="ci-val text-gold">{counselorReservations.filter(r => r.status === 'pending').length}건</span>
                  </div>
                  <div className="cert-info-item glass-panel">
                    <span className="ci-label">{lang === 'ko' ? '현재 교육 단계' : 'Current Level'}</span>
                    <span className="ci-val text-blue">Level 1</span>
                  </div>
                </div>

                {/* Combined Timeline of Client Activities */}
                <div className="timeline-section glass-panel">
                  <h3 className="section-title-sm">
                    <Clock size={16} /> {lang === 'ko' ? '최근 클라이언트 활동' : 'Recent Client Activities'}
                  </h3>
                  <div className="timeline">
                    {(() => {
                      const activities = [];
                      counselorClients.forEach(client => {
                        client.tests.forEach(test => {
                          activities.push({
                            type: 'test',
                            label: `${client.name} 선수: 멘탈 검사 완료 (${test.testName})`,
                            date: test.date || (test.createdAt?.toDate?.()?.toLocaleDateString() || ''),
                            timestamp: test.createdAt?.toMillis?.() || new Date(test.date || 0).getTime(),
                            icon: <Brain size={14} />,
                            color: '#0084ff',
                          });
                        });
                        client.reservations.forEach(r => {
                          activities.push({
                            type: 'res',
                            label: `${client.name} 선수: 상담 예약 (${r.status === 'accepted' ? '수락됨' : r.status === 'pending' ? '대기 중' : '거절됨'})`,
                            date: r.date ? new Date(r.date).toLocaleDateString() : '',
                            timestamp: r.date ? new Date(r.date).getTime() : 0,
                            icon: <Calendar size={14} />,
                            color: '#10b981',
                            status: r.status,
                          });
                        });
                      });

                      const sorted = activities
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .slice(0, 5);

                      if (sorted.length === 0) {
                        return (
                          <p className="text-muted text-center" style={{ padding: '24px 0' }}>
                            {lang === 'ko' ? '최근 활동 내역이 없습니다.' : 'No recent client activities.'}
                          </p>
                        );
                      }

                      return sorted.map((item, i) => (
                        <div key={i} className="timeline-item">
                          <div className="timeline-dot" style={{ background: item.color }}>
                            {item.icon}
                          </div>
                          <div className="timeline-content">
                            <span className="timeline-label">{item.label}</span>
                            {item.status && <StatusBadge status={item.status} t={t} />}
                          </div>
                          <span className="timeline-date">{item.date}</span>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'tests' && userRole !== 'counselor' && (
              <div className="tab-panel fade-in">
                <div className="tab-panel-header">
                  <h2 className="section-title-md">{t('mp_tab_tests')} ({tests.length})</h2>
                  <Link to="/test" className="btn-primary" style={{ fontSize: '0.85rem' }}>
                    <Brain size={16} /> {t('mp_new_test')}
                  </Link>
                </div>

                {tests.length === 0 ? (
                  <div className="empty-state glass-panel">
                    <Brain size={48} opacity={0.15} />
                    <p>{t('mp_no_tests')}</p>
                    <Link to="/test" className="btn-primary">{t('mp_start_test')}</Link>
                  </div>
                ) : (
                  <div className="tests-grid">
                    {tests.map(test => (
                      <div key={test.id} className="test-card glass-panel">
                        <div className="test-card-top">
                          <span className="test-type-pill">
                            {test.testId === 'self_talk' ? 'Self-Talk' : 'Mental Dashboard'}
                          </span>
                          <span className="test-card-date">
                            <Calendar size={13} />
                            {test.date || (test.createdAt?.toDate?.()?.toLocaleDateString() || '-')}
                          </span>
                        </div>

                        <h4 className="test-card-name">{test.testName}</h4>

                        {test.testId === 'self_talk' && test.scores ? (
                          <div className="selftalk-scores">
                            {[
                              { key: 'PP', label: 'P+', color: '#10b981' },
                              { key: 'PM', label: 'P-', color: '#fbbf24' },
                              { key: 'NP', label: 'N+', color: '#0084ff' },
                              { key: 'NM', label: 'N-', color: '#fb7185' },
                            ].map(s => (
                              <div key={s.key} className="st-score-box" style={{ borderColor: s.color + '44' }}>
                                <span className="st-score-label" style={{ color: s.color }}>{s.label}</span>
                                <span className="st-score-val">{test.scores[s.key] || 0}</span>
                              </div>
                            ))}
                          </div>
                        ) : test.summary ? (
                          <div className="dash-summary">
                            <div className="dash-metric">
                              <span className="dm-label">Req</span>
                              <span className="dm-val">{test.summary.avgReq}</span>
                            </div>
                            <div className="dash-metric">
                              <span className="dm-label">Curr</span>
                              <span className="dm-val">{test.summary.avgCurr}</span>
                            </div>
                            <div className="dash-metric primary">
                              <span className="dm-label">Urgency</span>
                              <span className="dm-val">{test.summary.avgNeed}</span>
                            </div>
                          </div>
                        ) : null}

                        <div className="test-card-footer">
                          <Link to={`/test-result/${test.id}`} className="btn-link">
                            {t('mp_view_detail')} <ChevronRight size={14} />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'counseling' && userRole !== 'counselor' && (
              <div className="tab-panel fade-in">
                <div className="tab-panel-header">
                  <h2 className="section-title-md">{t('mp_counseling_history')} ({reservations.length})</h2>
                  <Link to="/reservation" className="btn-primary" style={{ fontSize: '0.85rem' }}>
                    <Calendar size={16} /> {t('nav_reservation')}
                  </Link>
                </div>

                {reservations.length === 0 ? (
                  <div className="empty-state glass-panel">
                    <Calendar size={48} opacity={0.15} />
                    <p>{t('mp_no_counseling')}</p>
                    <Link to="/counselors" className="btn-primary">{t('mp_find_counselor')}</Link>
                  </div>
                ) : (
                  <div className="counseling-list">
                    {reservations.map(res => {
                      const log = counselingLogs.find(l => l.reservationId === res.id);
                      return (
                        <div key={res.id} className="counseling-item glass-panel">
                          <div className="ci-left">
                            <div className="ci-date-box">
                              <span className="ci-month">
                                {new Date(res.date).toLocaleDateString(lang === 'ko' ? 'ko-KR' : 'en-US', { month: 'short' })}
                              </span>
                              <span className="ci-day">
                                {new Date(res.date).getDate()}
                              </span>
                            </div>
                          </div>

                          <div className="ci-body">
                            <div className="ci-top">
                              <span className="ci-counselor">
                                <User size={15} />
                                {res.counselorName || '...'}
                              </span>
                              <StatusBadge status={res.status} t={t} />
                            </div>
                            <p className="ci-time">
                              <Clock size={13} />
                              {new Date(res.date).toLocaleTimeString(lang === 'ko' ? 'ko-KR' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            {res.message && (
                              <p className="ci-message">{t('mp_request_hint')}: {res.message}</p>
                            )}
                            {log?.aiSummary && (
                              <div className="log-summary-box">
                                <div className="lsb-header">
                                  <Brain size={13} /> {t('mp_ai_summary')}
                                </div>
                                <p className="lsb-text">
                                  {log.aiSummary.slice(0, 200)}{log.aiSummary.length > 200 ? '...' : ''}
                                </p>
                              </div>
                            )}
                          </div>

                          {res.status === 'accepted' && (
                            <div className="ci-actions">
                              <Link to="/messages" className="btn-outline" style={{ fontSize: '0.8rem', padding: '6px 12px' }}>
                                {t('mp_msg_btn')}
                              </Link>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'counseling' && userRole === 'counselor' && (
              <div className="tab-panel fade-in">
                <div className="tab-panel-header">
                  <h2 className="section-title-md">{lang === 'ko' ? '클라이언트별 상담 및 검사 관리' : 'Client Counseling & Tests'} ({counselorClients.length})</h2>
                </div>

                {counselorClients.length === 0 ? (
                  <div className="empty-state glass-panel">
                    <Users size={48} opacity={0.15} />
                    <p>{lang === 'ko' ? '아직 배정되거나 예약한 클라이언트가 없습니다.' : 'No clients managed yet.'}</p>
                  </div>
                ) : (
                  <div className="counseling-list">
                    {counselorClients.map(client => {
                      const isExpanded = expandedClients[client.email];
                      return (
                        <div key={client.email} className="counseling-item glass-panel" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                          <div 
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '8px 0' }}
                            onClick={() => toggleClientExpand(client.email)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                              <div className="ci-date-box" style={{ background: 'rgba(96,192,255,0.1)', color: 'var(--color-primary)' }}>
                                <User size={20} />
                              </div>
                              <div>
                                <h4 style={{ margin: 0, fontSize: '1.05rem', color: '#fff' }}>{client.name}</h4>
                                <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)' }}>{client.email}</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ fontSize: '0.8rem', color: 'var(--color-primary)', background: 'rgba(96,192,255,0.1)', padding: '4px 8px', borderRadius: '6px' }}>
                                {lang === 'ko' ? `상담 ${client.reservations.length}회` : `${client.reservations.length} Sessions`}
                              </span>
                              <span style={{ fontSize: '0.8rem', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '4px 8px', borderRadius: '6px' }}>
                                {lang === 'ko' ? `검사 ${client.tests.length}회` : `${client.tests.length} Tests`}
                              </span>
                              <ChevronRight size={18} style={{ transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="client-detail-expand" style={{ marginTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '16px' }}>
                              
                              <div style={{ marginBottom: '24px' }}>
                                <h5 style={{ margin: '0 0 12px 0', fontSize: '0.92rem', color: '#60c0ff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Calendar size={14} /> {lang === 'ko' ? '상담 기록 히스토리' : 'Counseling History'}
                                </h5>
                                {client.reservations.length === 0 ? (
                                  <p className="text-muted" style={{ fontSize: '0.85rem', margin: 0 }}>{lang === 'ko' ? '상담 예약 기록이 없습니다.' : 'No counseling history.'}</p>
                                ) : (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {client.reservations.map(res => {
                                      const log = counselorLogsMap[res.id];
                                      return (
                                        <div key={res.id} style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>
                                              {new Date(res.date).toLocaleString()}
                                            </span>
                                            <StatusBadge status={res.status} t={t} />
                                          </div>
                                          {res.message && (
                                            <p style={{ margin: '0 0 8px 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                                              <strong>{t('mp_request_hint')}:</strong> {res.message}
                                            </p>
                                          )}
                                          {log && (
                                            <div className="log-summary-box" style={{ margin: 0, marginTop: '8px' }}>
                                              {log.rawLog && (
                                                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', margin: '0 0 6px 0', fontStyle: 'italic' }}>
                                                  📝 {log.rawLog.slice(0, 100)}{log.rawLog.length > 100 ? '...' : ''}
                                                </p>
                                              )}
                                              {log.aiSummary && (
                                                <div style={{ marginTop: '6px', borderTop: '1px dashed rgba(255,255,255,0.06)', paddingTop: '6px' }}>
                                                  <span style={{ fontSize: '0.75rem', color: 'var(--color-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    <Brain size={12} /> {t('mp_ai_summary')}
                                                  </span>
                                                  <p style={{ fontSize: '0.76rem', color: 'rgba(255,255,255,0.7)', margin: '4px 0 0 0' }}>
                                                    {log.aiSummary.slice(0, 150)}{log.aiSummary.length > 150 ? '...' : ''}
                                                  </p>
                                                </div>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                              <div>
                                <h5 style={{ margin: '0 0 12px 0', fontSize: '0.92rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <Brain size={14} /> {lang === 'ko' ? '멘탈 검사 히스토리' : 'Mental Test History'}
                                </h5>
                                {client.tests.length === 0 ? (
                                  <p className="text-muted" style={{ fontSize: '0.85rem', margin: 0 }}>{lang === 'ko' ? '검사 완료 기록이 없습니다.' : 'No mental test records.'}</p>
                                ) : (
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                                    {client.tests.map(test => {
                                      const isSelf = test.testId === 'self_talk';
                                      return (
                                        <div key={test.id} className="test-card glass-panel" style={{ margin: 0, padding: '14px' }}>
                                          <div className="test-card-top" style={{ marginBottom: '10px' }}>
                                            <span className="test-type-pill" style={{ background: isSelf ? 'rgba(16,185,129,0.1)' : 'rgba(96,192,255,0.1)', color: isSelf ? '#10b981' : '#60c0ff' }}>
                                              {isSelf ? 'Self-Talk' : 'Dashboard'}
                                            </span>
                                            <span className="test-card-date" style={{ fontSize: '0.75rem' }}>
                                              {test.date || (test.createdAt?.toDate?.()?.toLocaleDateString() || '-')}
                                            </span>
                                          </div>
                                          <h4 className="test-card-name" style={{ fontSize: '0.92rem', marginBottom: '10px' }}>{test.testName}</h4>
                                          
                                          {isSelf && test.scores ? (
                                            <div className="selftalk-scores" style={{ gap: '4px', justifyContent: 'space-between' }}>
                                              {[{ key: 'PP', label: 'P+', color: '#10b981' },
                                                { key: 'PM', label: 'P-', color: '#fbbf24' },
                                                { key: 'NP', label: 'N+', color: '#0084ff' },
                                                { key: 'NM', label: 'N-', color: '#fb7185' }
                                              ].map(s => (
                                                <div key={s.key} className="st-score-box" style={{ padding: '2px 4px', fontSize: '0.7rem', borderColor: s.color + '22' }}>
                                                  <span style={{ color: s.color, fontWeight: 700 }}>{s.label}</span>
                                                  <span>{test.scores[s.key] || 0}</span>
                                                </div>
                                              ))}
                                            </div>
                                          ) : test.summary ? (
                                            <div className="dash-summary" style={{ justifyContent: 'space-around', margin: '4px 0' }}>
                                              <div className="dash-metric">
                                                <span className="dm-label" style={{ fontSize: '0.65rem' }}>Req</span>
                                                <span className="dm-val" style={{ fontSize: '0.8rem' }}>{test.summary.avgReq}</span>
                                              </div>
                                              <div className="dash-metric">
                                                <span className="dm-label" style={{ fontSize: '0.65rem' }}>Curr</span>
                                                <span className="dm-val" style={{ fontSize: '0.8rem' }}>{test.summary.avgCurr}</span>
                                              </div>
                                              <div className="dash-metric primary">
                                                <span className="dm-label" style={{ fontSize: '0.65rem' }}>Urgency</span>
                                                <span className="dm-val" style={{ fontSize: '0.8rem' }}>{test.summary.avgNeed}</span>
                                              </div>
                                            </div>
                                          ) : null}

                                          <div className="test-card-footer" style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                                            <Link to={`/test-result/${test.id}`} className="btn-link" style={{ fontSize: '0.76rem' }}>
                                              {t('mp_view_detail')} <ChevronRight size={12} />
                                            </Link>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>

                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'expert' && userRole === 'counselor' && (
              <div className="tab-panel fade-in">
                <div className="expert-sub-tabs glass-panel">
                  <button 
                    className={`sub-tab ${expertSubTab === 'education' ? 'active' : ''}`}
                    onClick={() => setExpertSubTab('education')}
                  >
                    {lang === 'ko' ? '교육 과정' : 'Education'}
                  </button>
                  <button 
                    className={`sub-tab ${expertSubTab === 'certification' ? 'active' : ''}`}
                    onClick={() => setExpertSubTab('certification')}
                  >
                    {lang === 'ko' ? '인증 현황' : 'Certification'}
                  </button>
                </div>

                {expertSubTab === 'education' ? (
                  <div className="education-view animate-fade-in">
                    <div className="expert-hero-banner">
                      <div className="hero-tag">TUFLY EXPERT PROGRAM</div>
                      <h2 className="hero-title">{lang === 'ko' ? '스포츠 심리 전문가 되기' : 'Becoming a Sports Psychology Expert'}</h2>
                      <p className="hero-desc">
                        {lang === 'ko' 
                          ? '현장 중심 커리큘럼으로 검증된 심리 전문가를 양성합니다.' 
                          : 'Training verified psychology experts with a field-oriented curriculum.'}
                      </p>
                      <div className="hero-stats">
                        <div className="h-stat">
                          <span className="h-num">3단계</span>
                          <span className="h-lbl">레벨 과정</span>
                        </div>
                        <div className="h-stat">
                          <span className="h-num">47개</span>
                          <span className="h-lbl">커리큘럼</span>
                        </div>
                        <div className="h-stat">
                          <span className="h-num">128명</span>
                          <span className="h-lbl">수료생</span>
                        </div>
                      </div>
                    </div>

                    <div className="level-cards">
                      <div className="expert-sec-label">{lang === 'ko' ? '레벨별 과정' : 'Level Courses'}</div>
                      
                      <div className="level-card lv1">
                        <div className="lv-header">
                          <div className="lv-badge">
                            <div className="lv-icon"><BookOpen size={20} /></div>
                            <div className="lv-info">
                              <span className="lv-name">Level 1 · {lang === 'ko' ? '기초' : 'Basic'}</span>
                              <span className="lv-target">{lang === 'ko' ? '스포츠심리 입문자' : 'Beginners'}</span>
                            </div>
                          </div>
                          <div className="lv-status st-progress">{lang === 'ko' ? '진행 중' : 'In Progress'}</div>
                        </div>
                        <p className="lv-desc">스포츠심리학의 핵심 개념, IZOF 이론, 자기암시·집중력 훈련의 기초를 학습합니다.</p>
                        <div className="lv-prog-wrap">
                          <div className="lv-prog-label">
                            <span>{lang === 'ko' ? '진도율' : 'Progress'}</span>
                            <span>5 / 12 모듈 (42%)</span>
                          </div>
                          <div className="prog-track"><div className="prog-fill fill-blue" style={{ width: '42%' }}></div></div>
                        </div>
                      </div>

                      <div className="level-card lv2 locked">
                        <div className="lv-header">
                          <div className="lv-badge">
                            <div className="lv-icon"><Users size={20} /></div>
                            <div className="lv-info">
                              <span className="lv-name">Level 2 · {lang === 'ko' ? '심화' : 'Advanced'}</span>
                              <span className="lv-target">{lang === 'ko' ? '상담 실무 과정' : 'Clinical Practice'}</span>
                            </div>
                          </div>
                          <div className="lv-status st-locked"><Clock size={12} /> {lang === 'ko' ? '잠금' : 'Locked'}</div>
                        </div>
                        <div className="lock-overlay">
                           <Shield size={24} />
                           <p>Level 1 {lang === 'ko' ? '수료 후 개방' : 'Unlock after Level 1'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="curriculum-list">
                      <div className="expert-sec-label">{lang === 'ko' ? 'Level 1 · 현재 커리큘럼' : 'Level 1 · Current Curriculum'}</div>
                      <div className="curr-item done">
                        <div className="curr-num"><CheckCircle size={14} /></div>
                        <div className="curr-body">
                          <span className="curr-title">스포츠심리학 개론</span>
                          <div className="curr-meta">
                            <span className="curr-type type-video">영상</span>
                            <span className="curr-time">35min</span>
                          </div>
                        </div>
                        <ChevronRight size={16} className="curr-arrow" />
                      </div>
                      <div className="curr-item active">
                        <div className="curr-num"><PlayCircle size={14} /></div>
                        <div className="curr-body">
                          <span className="curr-title">과정단서 설계 실습</span>
                          <div className="curr-meta">
                            <span className="curr-type type-practice">실습</span>
                            <span className="curr-time">45min</span>
                          </div>
                        </div>
                        <ChevronRight size={16} className="curr-arrow" />
                      </div>
                      <div className="curr-item locked">
                        <div className="curr-num"><Clock size={14} /></div>
                        <div className="curr-body">
                          <span className="curr-title">셀프톡 & 자기암시 작성법</span>
                          <div className="curr-meta">
                            <span className="curr-type type-video">영상</span>
                            <span className="curr-time">30min</span>
                          </div>
                        </div>
                        <ChevronRight size={16} className="curr-arrow" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="certification-view animate-fade-in">
                    <div className="cert-hero glass-panel">
                      <div className="cert-badge-main">
                        <Award size={48} color="#fbbf24" />
                      </div>
                      <h2 className="cert-name">TUFLY {lang === 'ko' ? '스포츠심리 전문가' : 'Sports Psychology Expert'}<br/>Level 1</h2>
                      <p className="cert-sub">{lang === 'ko' ? '취득 준비 중 · 42% 달성' : 'Preparing · 42% Achieved'}</p>
                      <div className="cert-id">CERT-ID : TF-2024-L1-0083</div>
                    </div>

                    <div className="cert-info-grid">
                      <div className="cert-info-item glass-panel">
                        <span className="ci-label">현재 레벨</span>
                        <span className="ci-val text-purple">Level 1</span>
                      </div>
                      <div className="cert-info-item glass-panel">
                        <span className="ci-label">취득 예상일</span>
                        <span className="ci-val text-teal">2025.08</span>
                      </div>
                      <div className="cert-info-item glass-panel">
                        <span className="ci-label">수료 모듈</span>
                        <span className="ci-val">5 / 12</span>
                      </div>
                      <div className="cert-info-item glass-panel">
                        <span className="ci-label">누적 실습 시간</span>
                        <span className="ci-val text-gold">14h</span>
                      </div>
                    </div>

                    <div className="expert-sec-label">{lang === 'ko' ? '인증 취득 단계' : 'Certification Steps'}</div>
                    <div className="cert-steps-list glass-panel">
                      {[
                        { title: '기초 이론 이수', desc: '스포츠심리학 개론 + IZOF 이론 완료', status: 'done', icon: <BookOpen size={18} /> },
                        { title: '실습 과제 제출', desc: '과정단서 설계 · 셀프톡 작성 실습 2건', status: 'active', icon: <PenTool size={18} /> },
                        { title: '슈퍼비전 세션', desc: '전문 강사와 1:1 피드백 세션 (2회)', status: 'lock', icon: <Users size={18} /> },
                        { title: '수료 시험 응시', desc: '객관식 40문항 + 사례 논술 2문항', status: 'lock', icon: <ClipboardList size={18} /> },
                        { title: '공식 인증서 발급', desc: '터플리 × 인하대학교 서명 인증서', status: 'lock', icon: <Award size={18} /> },
                      ].map((step, idx) => (
                        <div key={idx} className={`cert-step ${step.status}`}>
                          <div className={`cert-step-icon ${step.status}`}>{step.icon}</div>
                          <div className="cert-step-body">
                            <h4>{step.title}</h4>
                            <p>{step.desc}</p>
                          </div>
                          <div className={`cert-step-tag ${step.status}`}>
                            {step.status === 'done' ? '완료' : step.status === 'active' ? '진행 중' : '대기'}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="expert-sec-label" style={{ marginTop: '20px' }}>{lang === 'ko' ? '수료 후 혜택' : 'Post-Completion Benefits'}</div>
                    <div className="benefits-list">
                      <div className="benefit-item glass-panel">
                        <Building size={20} color="#38bdf8" />
                        <div className="benefit-info">
                          <h5>주요 구단 협업 지원</h5>
                          <p>프로구단 심리 지원 기회 우선 연결</p>
                        </div>
                      </div>
                      <div className="benefit-item glass-panel">
                        <ShieldCheck size={20} color="#10b981" />
                        <div className="benefit-info">
                          <h5>터플리 공인 전문가 등록</h5>
                          <p>앱 내 전문가 풀 등재 및 상담 권한 부여</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default MyPage;
