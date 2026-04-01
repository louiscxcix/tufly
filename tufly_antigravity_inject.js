/**
 * ============================================================
 *  TUFLY — Antigravity Content Injection Script
 *  사용법: Antigravity 프로젝트의 페이지 설정 > Custom Script 또는
 *          Custom HTML 영역에 이 파일 전체를 붙여넣으세요.
 *
 *  ✅ 기존 Antigravity 디자인(레이아웃, 색상, 폰트)은 유지됩니다.
 *  ✅ 아래 섹션들이 페이지 하단에 추가됩니다:
 *     1. 효과성 수치 (자기효능감 3.1 → 8.5)
 *     2. 실제 후기 카드
 *     3. 수상·인증 배지
 *     4. 상담 프로세스
 * ============================================================
 */

(function () {
  'use strict';

  /* ── 1. 스타일 주입 (Antigravity 고유 변수를 덮어쓰지 않음) ── */
  const style = document.createElement('style');
  style.textContent = `
    /* Tufly Injection — namespace: tfy- */
    .tfy-section {
      padding: 80px 5vw;
      font-family: inherit;
    }
    .tfy-eyebrow {
      font-size: 11px;
      letter-spacing: 4px;
      text-transform: uppercase;
      opacity: .5;
      margin-bottom: 12px;
    }
    .tfy-heading {
      font-size: clamp(28px, 4vw, 52px);
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 40px;
    }

    /* ── 효과 수치 ── */
    .tfy-metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 20px;
      margin-bottom: 60px;
    }
    .tfy-metric-card {
      border: 1px solid rgba(128,128,128,0.2);
      border-radius: 12px;
      padding: 28px 24px;
      transition: border-color .3s, transform .3s;
    }
    .tfy-metric-card:hover {
      border-color: rgba(26,92,255,0.5);
      transform: translateY(-3px);
    }
    .tfy-metric-num {
      font-size: 48px;
      font-weight: 900;
      line-height: 1;
      color: #1a5cff;
    }
    .tfy-metric-label {
      font-size: 13px;
      margin-top: 8px;
      opacity: .7;
      line-height: 1.5;
    }

    /* 자기효능감 바 */
    .tfy-score-block { margin-bottom: 40px; }
    .tfy-score-row {
      display: flex; align-items: center; gap: 16px; margin-bottom: 12px;
    }
    .tfy-score-row-label { font-size: 12px; width: 56px; opacity: .6; }
    .tfy-score-bar-outer {
      flex: 1; height: 8px; border-radius: 4px;
      background: rgba(128,128,128,0.15); overflow: hidden;
    }
    .tfy-score-bar-inner {
      height: 100%; border-radius: 4px;
      transition: width 1.4s cubic-bezier(.25,.46,.45,.94);
    }
    .tfy-score-bar-before { width: 31%; background: rgba(128,128,128,0.4); }
    .tfy-score-bar-after  { width: 85%; background: linear-gradient(90deg, #1a5cff, #00c2ff); }
    .tfy-score-val { font-size: 20px; font-weight: 800; width: 50px; text-align: right; }
    .tfy-score-val.after { color: #1a5cff; }

    /* ── 리뷰 카드 ── */
    .tfy-reviews-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 20px;
    }
    .tfy-review-card {
      border: 1px solid rgba(128,128,128,0.18);
      border-radius: 12px;
      padding: 28px;
      position: relative;
      transition: border-color .3s, transform .3s;
    }
    .tfy-review-card:hover {
      border-color: rgba(26,92,255,0.4);
      transform: translateY(-4px);
    }
    .tfy-review-card.tfy-featured {
      grid-column: span 2;
      background: rgba(26,92,255,0.05);
      border-color: rgba(26,92,255,0.25);
    }
    @media(max-width:640px){ .tfy-review-card.tfy-featured { grid-column: span 1; } }
    .tfy-sport-tag {
      display: inline-block;
      font-size: 10px; font-weight: 700; letter-spacing: 2px;
      padding: 3px 10px; border-radius: 20px;
      background: rgba(26,92,255,0.12); color: #1a5cff;
      margin-bottom: 14px;
    }
    .tfy-review-quote {
      font-size: 15px; font-weight: 700; line-height: 1.7;
      margin-bottom: 12px;
    }
    .tfy-review-card.tfy-featured .tfy-review-quote { font-size: 18px; }
    .tfy-review-context { font-size: 12px; opacity: .55; line-height: 1.7; }
    .tfy-big-quote {
      position: absolute; top: 20px; right: 24px;
      font-size: 64px; font-weight: 900; opacity: .06; line-height: 1;
      pointer-events: none;
    }

    /* ── 인증 배지 ── */
    .tfy-badges {
      display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px;
    }
    .tfy-badge {
      padding: 10px 18px;
      border: 1px solid rgba(128,128,128,0.25);
      border-radius: 30px;
      font-size: 12px; font-weight: 600;
      transition: border-color .2s, background .2s;
    }
    .tfy-badge:hover {
      border-color: #1a5cff;
      background: rgba(26,92,255,0.07);
    }
    .tfy-badge .tfy-badge-icon { margin-right: 6px; }

    /* ── 프로세스 ── */
    .tfy-process {
      display: flex; gap: 0;
      position: relative; margin-top: 48px;
    }
    .tfy-process::before {
      content:'';
      position: absolute; top: 32px; left: 5%; right: 5%; height: 2px;
      background: linear-gradient(90deg, #1a5cff, #00c2ff);
    }
    .tfy-process-step {
      flex: 1; text-align: center; position: relative; z-index: 1;
    }
    .tfy-step-dot {
      width: 64px; height: 64px; border-radius: 50%;
      margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;
      border: 2px solid #1a5cff;
      font-size: 22px; font-weight: 900; color: #1a5cff;
      background: var(--ag-bg, #fff);   /* Antigravity 배경색 변수 사용 */
    }
    .tfy-step-name { font-size: 14px; font-weight: 700; margin-bottom: 6px; }
    .tfy-step-detail { font-size: 12px; opacity: .55; line-height: 1.6; }
    @media(max-width:600px){
      .tfy-process { flex-direction: column; gap: 24px; }
      .tfy-process::before { display: none; }
    }

    /* ── 구분선 ── */
    .tfy-divider {
      border: none; border-top: 1px solid rgba(128,128,128,0.12);
      margin: 0 5vw;
    }
  `;
  document.head.appendChild(style);

  /* ── 2. HTML 컨텐츠 정의 ── */
  const html = `

  <!-- [TUFLY] 효과성 섹션 -->
  <div class="tfy-section" id="tfy-effect">
    <p class="tfy-eyebrow">Proven Results</p>
    <h2 class="tfy-heading">숫자로 증명하는<br/>터플리 효과</h2>

    <!-- 핵심 수치 -->
    <div class="tfy-metrics">
      <div class="tfy-metric-card">
        <div class="tfy-metric-num">5,000<span style="font-size:24px">+</span></div>
        <div class="tfy-metric-label">누적 심리상담 세션</div>
      </div>
      <div class="tfy-metric-card">
        <div class="tfy-metric-num">250<span style="font-size:24px">+</span></div>
        <div class="tfy-metric-label">멘탈 트레이닝 콘텐츠 보유</div>
      </div>
      <div class="tfy-metric-card">
        <div class="tfy-metric-num">18<span style="font-size:24px">+</span></div>
        <div class="tfy-metric-label">프로구단·기업 심리훈련</div>
      </div>
      <div class="tfy-metric-card">
        <div class="tfy-metric-num">100<span style="font-size:24px">%</span></div>
        <div class="tfy-metric-label">IZOF 기반 신기록 예측 적중률<br/><small style="font-size:10px;opacity:.6">(평균 16주 이내)</small></div>
      </div>
    </div>

    <!-- 자기효능감 바 -->
    <div class="tfy-score-block">
      <p style="font-size:13px;opacity:.6;margin-bottom:16px;">단 1회 교육 후 자기효능감 변화</p>
      <div class="tfy-score-row">
        <span class="tfy-score-row-label">사용 전</span>
        <div class="tfy-score-bar-outer"><div class="tfy-score-bar-inner tfy-score-bar-before"></div></div>
        <span class="tfy-score-val before">3.1점</span>
      </div>
      <div class="tfy-score-row">
        <span class="tfy-score-row-label">사용 후</span>
        <div class="tfy-score-bar-outer"><div class="tfy-score-bar-inner tfy-score-bar-after"></div></div>
        <span class="tfy-score-val after">8.5점</span>
      </div>
    </div>
  </div>

  <hr class="tfy-divider"/>

  <!-- [TUFLY] 후기 섹션 -->
  <div class="tfy-section" id="tfy-reviews">
    <p class="tfy-eyebrow">Real Stories</p>
    <h2 class="tfy-heading">선수들이 직접 말하는<br/>터플리</h2>

    <div class="tfy-reviews-grid">
      <div class="tfy-review-card tfy-featured">
        <div class="tfy-big-quote">"</div>
        <span class="tfy-sport-tag">골프</span>
        <p class="tfy-review-quote">부산에서 왔어요. 우승하려면 성지순례하듯이 골프 멘탈의 메카를 다녀와야 한다고 추천받아서요.</p>
        <p class="tfy-review-context">2등 습관에서 벗어나 우승을 달성한 골퍼 · 2017년</p>
      </div>
      <div class="tfy-review-card">
        <div class="tfy-big-quote">"</div>
        <span class="tfy-sport-tag">취업</span>
        <p class="tfy-review-quote">1,000:1의 경쟁률, 이것도 되네요.</p>
        <p class="tfy-review-context">드레스 리허설로 현대자동차 1,000:1 면접 합격 · 2023년</p>
      </div>
      <div class="tfy-review-card">
        <div class="tfy-big-quote">"</div>
        <span class="tfy-sport-tag">배구 · KGC인삼공사</span>
        <p class="tfy-review-quote">파이널세트 강자, 5세트 해결사.</p>
        <p class="tfy-review-context">팀 자신감 모듈 도입 후 언론 찬사 · 2019–2020년</p>
      </div>
      <div class="tfy-review-card">
        <div class="tfy-big-quote">"</div>
        <span class="tfy-sport-tag">축구 · FC안양</span>
        <p class="tfy-review-quote">심리를 배웠는데 승부가 달라지는 신기한 경험.</p>
        <p class="tfy-review-context">U감성 프로젝트 참가 선수 · 이후 2024년 리그 우승</p>
      </div>
      <div class="tfy-review-card">
        <div class="tfy-big-quote">"</div>
        <span class="tfy-sport-tag">바둑 · 프로기사</span>
        <p class="tfy-review-quote">슬럼프를 딛고 우승해서 더 감사합니다.</p>
        <p class="tfy-review-context">LG배 세계 챔피언, 아시안게임 우승 · 2012–현재</p>
      </div>
      <div class="tfy-review-card">
        <div class="tfy-big-quote">"</div>
        <span class="tfy-sport-tag">군 · 8기동사단</span>
        <p class="tfy-review-quote">이어지는 정훈 프로그램이 이 내용을 덮을 수 없다. 모두 취소한다.</p>
        <p class="tfy-review-context">한미연합훈련 장병 대상 특강 후 사단장 발언 · 2024년</p>
      </div>
    </div>
  </div>

  <hr class="tfy-divider"/>

  <!-- [TUFLY] 인증·수상 섹션 -->
  <div class="tfy-section" id="tfy-credentials">
    <p class="tfy-eyebrow">Credentials</p>
    <h2 class="tfy-heading">최초와 최고의<br/>타이틀</h2>
    <div class="tfy-badges">
      <span class="tfy-badge"><span class="tfy-badge-icon">🏆</span>국내 프로스포츠 최초 스포츠심리상담사 (FC서울)</span>
      <span class="tfy-badge"><span class="tfy-badge-icon">🔬</span>IZOF 수행프로파일 우수논문상 — 한국스포츠심리학회</span>
      <span class="tfy-badge"><span class="tfy-badge-icon">⚖️</span>특허 제 10-2680767 호</span>
      <span class="tfy-badge"><span class="tfy-badge-icon">📚</span>스포츠심리학의 정석 — 세종도서 선정</span>
      <span class="tfy-badge"><span class="tfy-badge-icon">🏢</span>2023 벤처기업 선정</span>
      <span class="tfy-badge"><span class="tfy-badge-icon">🎯</span>2025 문화체육관광부 스포츠산업 초기창업 보육기관</span>
      <span class="tfy-badge"><span class="tfy-badge-icon">🚀</span>2025 인천라이징스타 5기 지원기업</span>
      <span class="tfy-badge"><span class="tfy-badge-icon">📱</span>챗GPT 기반 멘탈 앱 Planity 출시</span>
    </div>
  </div>

  <hr class="tfy-divider"/>

  <!-- [TUFLY] 상담 프로세스 섹션 -->
  <div class="tfy-section" id="tfy-process">
    <p class="tfy-eyebrow">How It Works</p>
    <h2 class="tfy-heading">3단계 상담 프로세스</h2>
    <div class="tfy-process">
      <div class="tfy-process-step">
        <div class="tfy-step-dot">R</div>
        <div class="tfy-step-name">Reservation</div>
        <div class="tfy-step-detail">전화 또는<br/>온라인 예약</div>
      </div>
      <div class="tfy-process-step">
        <div class="tfy-step-dot">I</div>
        <div class="tfy-step-name">Interview</div>
        <div class="tfy-step-detail">초기 면접 &<br/>심리검사</div>
      </div>
      <div class="tfy-process-step">
        <div class="tfy-step-dot">T</div>
        <div class="tfy-step-name">Training</div>
        <div class="tfy-step-detail">맞춤형 멘탈<br/>트레이닝</div>
      </div>
    </div>
  </div>

  `;

  /* ── 3. DOM 삽입 ── */
  // Antigravity는 보통 <main> 또는 최상위 컨텐츠 컨테이너를 사용합니다.
  // 아래 셀렉터들을 순서대로 시도하여 적절한 위치에 삽입합니다.
  const INSERTION_SELECTORS = [
    '[data-section="content-end"]',   // Antigravity 커스텀 앵커 (있을 경우)
    'main > section:last-of-type',     // 마지막 섹션 뒤
    'main',                            // main 태그 끝
    '#content',                        // 일반적인 컨텐츠 영역
    'body',                            // 최후 폴백
  ];

  let inserted = false;
  for (const sel of INSERTION_SELECTORS) {
    const el = document.querySelector(sel);
    if (el) {
      el.insertAdjacentHTML('beforeend', html);
      inserted = true;
      console.log('[TUFLY] Content injected into:', sel);
      break;
    }
  }
  if (!inserted) {
    document.body.insertAdjacentHTML('beforeend', html);
    console.log('[TUFLY] Content injected into body (fallback)');
  }

  /* ── 4. 선택: 스크롤 진입 시 애니메이션 (IntersectionObserver) ── */
  // Antigravity에 이미 애니메이션이 있다면 이 블록은 제거해도 됩니다.
  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.opacity = '1';
          e.target.style.transform = 'translateY(0)';
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.15 });

    document.querySelectorAll(
      '.tfy-metric-card, .tfy-review-card, .tfy-badge, .tfy-process-step'
    ).forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity .6s ease, transform .6s ease';
      obs.observe(el);
    });
  }

})(); // IIFE 끝 — 전역 오염 없음
