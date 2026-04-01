import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import './Home.css';

const Home = () => {
  const scoreBarRef = useRef(null);

  useEffect(() => {
    // Scroll Fade-Up Animation and Score Bar Animation
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          // If it's a fade-up element
          if (entry.target.classList.contains('fade-up')) {
            entry.target.classList.add('in-view');
          }
          // If it's the score bar section
          if (entry.target.classList.contains('score-row')) {
            const barBefore = entry.target.querySelector('.score-bar.before');
            const barAfter = entry.target.querySelector('.score-bar.after');
            if (barBefore) barBefore.classList.add('fill-before');
            if (barAfter) barAfter.classList.add('fill-after');
          }
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15 });

    const fadeElements = document.querySelectorAll('.fade-up, .score-row');
    fadeElements.forEach(el => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <div className="home">
      {/* ── HERO ── */}
      <section className="tufly-hero">
        <div className="hero-bg"></div>
        <div className="hero-grid"></div>
        <div className="hero-main">
          <div className="hero-content">
            <p className="hero-tag fade-up">TUFLY MENTAL TRAINING</p>
            <h1 className="hero-main-title fade-up" style={{ transitionDelay: '0.1s' }}>
              멘탈을<br/><span>터프하게.</span>
            </h1>
            <p className="hero-sub fade-up" style={{ transitionDelay: '0.2s' }}>
              모든 승리는 심리에서 시작되고,<br/>그 심리는 훈련으로 완성된다.
            </p>
            <div className="hero-cta fade-up" style={{ transitionDelay: '0.3s' }}>
              <Link to="/reservation" className="hero-btn">상담 예약하기</Link>
              <Link to="/service" className="hero-ghost">서비스 알아보기 →</Link>
            </div>
          </div>
          <div className="hero-image-wrap fade-up" style={{ transitionDelay: '0.2s' }}>
            <img src="/imagesources/tufly_main.jpg" alt="Mental Training" className="hero-main-img" />
          </div>
        </div>

        <div className="hero-stats fade-up" style={{ transitionDelay: '0.4s' }}>
          <div className="stat-item">
            <div className="stat-num"><span>5,000</span>+</div>
            <div className="stat-label">심리 상담 세션</div>
          </div>
          <div className="stat-item">
            <div className="stat-num"><span>250</span>+</div>
            <div className="stat-label">멘탈 콘텐츠 보유</div>
          </div>
          <div className="stat-item">
            <div className="stat-num"><span>18</span>+</div>
            <div className="stat-label">프로구단 심리훈련</div>
          </div>
        </div>
      </section>

      {/* ── CREDENTIAL BAND ── */}
      <div className="cred-band">
        <span className="cred-item">국내 프로스포츠 최초 스포츠심리상담사</span>
        <span className="cred-item">IZOF 수행프로파일 우수논문상</span>
        <span className="cred-item">특허 등록 10-2680767</span>
        <span className="cred-item">2023 벤처기업 선정</span>
        <span className="cred-item">2025 문화체육관광부 스포츠산업 초기창업 보육기관</span>
        <span className="cred-item">인천라이징스타 5기 지원기업</span>
        <span className="cred-item">스포츠심리학의 정석 세종도서 선정</span>
      </div>

      {/* ── EFFECT SECTION ── */}
      <section className="home-section effect-section fade-up" id="effect">
        <div className="section-eyebrow">Proven Results</div>
        <div className="section-title">단 1회 교육으로<br/>자기효능감이 달라진다</div>
        <div className="effect-grid">
          <div className="effect-visual">
            <div className="score-comparison">
              <div className="score-row">
                <span className="score-label">사용 전</span>
                <div className="score-bar-wrap"><div className="score-bar before"></div></div>
                <span className="score-num before">3.1점</span>
              </div>
              <div className="score-row">
                <span className="score-label">사용 후</span>
                <div className="score-bar-wrap"><div className="score-bar after"></div></div>
                <span className="score-num after">8.5점</span>
              </div>
            </div>
            <div className="effect-arrow">↑</div>
            <p className="effect-caption">단 1회의 교육으로 자기효능감<br/>평균 <strong>3.1점 → 8.5점</strong> 향상</p>
          </div>
          <div className="effect-items">
            <div className="effect-item">
              <h4>자기효능감 향상</h4>
              <p>단 1회 교육만으로 다양한 영역에서 자기효능감이 현저히 향상됩니다. 사용 전 평균 3.1점에서 8.5점으로 도달.</p>
            </div>
            <div className="effect-item">
              <h4>신기록 예측 100% IZOF</h4>
              <p>평균 16주 이내 신기록 수립 100% 예측. 스포츠 종목·포지션별 특화된 질문으로 선수 기술, 체력, 심리 항목을 정밀 파악합니다.</p>
            </div>
            <div className="effect-item">
              <h4>개인 & 팀 맞춤형 프로그램</h4>
              <p>불안 컨트롤, 멘탈 플랜, 주기화 계획, 재집중 계획, 자기암시로 구성된 개인 프로그램과 팀 정체성·응집력·리더십 팀 프로그램.</p>
            </div>
            <div className="effect-item">
              <h4>검증된 상담 프로세스</h4>
              <p>상담예약 → 초기 면접 & 심리검사 → 멘탈 트레이닝 진행. 터플리 자체 상담 경력 검증 시스템과 교육 제도를 갖춘 전문 상담사 매칭.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── IZOF FEATURE ── */}
      <section className="home-section izof-section fade-up" id="izof">
        <div className="section-eyebrow">Core Technology</div>
        <div className="section-title">특허받은<br/>IZOF 기술력</div>
        <div className="izof-grid">
          <div>
            <div className="izof-number">100<sup>%</sup></div>
            <p className="izof-desc">
              IZOF(Individual Zone of Optimal Functioning) 수행프로파일 기법으로 선수 맞춤 최적 수행 구간을 예측합니다.<br/><br/>
              평균 16주 이내 신기록 수립 100% 예측 달성. 한국스포츠심리학회 우수논문상 수상 연구 기반의 과학적 방법론입니다.
            </p>
            <div className="izof-tags">
              <span className="tag">특허 제 10-2680767 호</span>
              <span className="tag">선수 기술 · 체력 · 심리 분석</span>
              <span className="tag">요구수준 vs 현재수준 갭 분석</span>
              <span className="tag">훈련요구 자동 산출</span>
            </div>
          </div>
          <div>
            <div className="izof-box">
              <p style={{fontSize:'12px', letterSpacing:'2px', color:'var(--accent)', marginBottom:'20px'}}>IZOF 수행 프로파일 항목</p>
              <div style={{display:'flex', flexDirection:'column', gap:'12px'}}>
                <div className="izof-box-row">
                  <span className="row-title">기술 동작</span>
                  <span className="row-desc">티샷 · 세컨샷 · 어프로치 · 퍼팅 · 자동 스윙</span>
                </div>
                <div className="izof-box-row">
                  <span className="row-title">체력</span>
                  <span className="row-desc">유산소 · 근력 · 유연성 · 순발력</span>
                </div>
                <div className="izof-box-row">
                  <span className="row-title">심리</span>
                  <span className="row-desc">집중 · 감정조절 · 긴장조절 · 자신감 · 이미지</span>
                </div>
              </div>
              <div className="izof-summary">
                <p>요구 점수와 현재 점수의 차이로 <strong style={{color:'var(--white)'}}>훈련 우선순위</strong>를 과학적으로 도출합니다.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PROFESSOR KIM INTRO (Adapted to Theme) ── */}
      <section className="home-section prof-section fade-up">
        <div className="section-eyebrow">Expertise</div>
        <div className="section-title">스포츠심리학의 대가<br/>김병준 교수</div>
        <div className="section-desc">20년 이상의 현장 경험과 학문적 깊이를 바탕으로 선수의 잠재력을 깨웁니다.</div>
        
        <div className="prof-grid">
          <div className="prof-image-wrap">
            <img src="/imagesources/prof_kim.jpg" alt="Professor Kim Byung-jun" />
          </div>
          <div className="prof-card">
            <h3 className="prof-name">김 병 준 <span>교수</span></h3>
            <ul className="prof-list">
              <li><ChevronRight size={16} /> 1급 스포츠심리상담사</li>
              <li><ChevronRight size={16} /> 한국스포츠심리학회 18대 회장</li>
              <li><ChevronRight size={16} /> 서울대학교 체육교육과 학/석사</li>
              <li><ChevronRight size={16} /> 미 노스캐롤라이나대학교 스포츠심리학 박사</li>
              <li><ChevronRight size={16} /> 인하대학교 체육교육과 교수 (19년)</li>
            </ul>
            <div className="prof-tags">
              <span className="tag">흥국생명배구단</span>
              <span className="tag">한화생명</span>
              <span className="tag">KGC 인삼공사</span>
              <span className="tag">FC 안양</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── REVIEWS ── */}
      <section className="home-section reviews-section fade-up" id="reviews">
        <div className="section-eyebrow">Real Stories</div>
        <div className="section-title">선수들이 직접 말하는<br/>터플리 효과</div>
        <div className="section-desc">2007년부터 수천 회의 심리상담 세션과 함께 쌓아온 실제 성과입니다.</div>

        <div className="reviews-grid">
          <div className="review-card featured">
            <div className="review-dash">"</div>
            <span className="review-sport">골프</span>
            <p className="review-quote">부산에서 왔어요. 우승하려면 성지순례하듯이 골프 멘탈의 메카를 다녀와야 한다고 추천받아서요.</p>
            <p className="review-context">2등 습관에서 벗어나기 위해 우승을 목표로 특A급 선수의 멘탈을 장착한 후 실제로 우승을 달성한 골퍼 (2017년)</p>
          </div>
          <div className="review-card">
            <div className="review-dash">"</div>
            <span className="review-sport">취업</span>
            <p className="review-quote">1,000:1의 경쟁률,<br/>이것도 되네요.</p>
            <p className="review-context">터플리의 드레스 리허설로 현대자동차 생산직 입사 1,000:1 면접을 뚫고 합격한 취업준비생 (2023년)</p>
          </div>
          <div className="review-card">
            <div className="review-dash">"</div>
            <span className="review-sport">배구 · KGC인삼공사</span>
            <p className="review-quote">파이널세트 강자,<br/>5세트 해결사.</p>
            <p className="review-context">터플리의 '팀 자신감 모듈' 2회 도입 후 언론으로부터 받은 찬사. (2019–2020년)</p>
          </div>
          <div className="review-card">
            <div className="review-dash">"</div>
            <span className="review-sport">축구 · FC안양</span>
            <p className="review-quote">심리를 배웠는데 승부가 달라지는 신기한 경험.</p>
            <p className="review-context">Win Unique·Win Unite·Win Ugly 'U감성 프로젝트' 참가 선수 소감 (2015년) / 이후 2024년 리그 우승</p>
          </div>
          <div className="review-card">
            <div className="review-dash">"</div>
            <span className="review-sport">바둑 · 프로기사</span>
            <p className="review-quote">슬럼프를 딛고 우승해서 더 감사합니다.</p>
            <p className="review-context">LG배 세계 챔피언, 명인, 국수산맥 세계대회 우승, 아시안게임 단체 우승 성과를 낸 프로기사 (2012–현재)</p>
          </div>
          <div className="review-card">
            <div className="review-dash">"</div>
            <span className="review-sport">군 · 8기동사단</span>
            <p className="review-quote">이어지는 정훈 프로그램이 이 내용을 덮을 수 없다. 모두 취소한다.</p>
            <p className="review-context">한미연합훈련 최정예 장병 대상 정신무장 특강 후 8기동사단 사단장 발언 (2024년)</p>
          </div>
          <div className="review-card">
            <div className="review-dash">"</div>
            <span className="review-sport">배드민턴 · 인하대</span>
            <p className="review-quote">"감독님이 이 책으로 훈련 일기를 쓰라고 하셨어요. 그 후로 신기하게도 메달행진이 시작되었어요"</p>
            <p className="review-context">터플리 대표 김병준 교수의 '긍정의 멘탈트레이닝'을 사용한 선수 (2022년)</p>
          </div>
          <div className="review-card">
            <div className="review-dash">"</div>
            <span className="review-sport">축구 · FC안양</span>
            <p className="review-quote">"심리훈련으로 수퍼멘탈을 갖춰 최고의 경기력을"</p>
            <p className="review-context">2024년 리그우승의 기초를 닦은 'All 4 one 프로젝트' (2014년)</p>
          </div>
        </div>
      </section>

      {/* ── ACHIEVEMENTS ── */}
      <section className="home-section achieve-section fade-up" id="achievements">
        <div className="section-eyebrow">Track Record</div>
        <div className="section-title">최초와 최고의 타이틀</div>
        <div className="achieve-grid">
          <div className="achieve-item">
            <div className="achieve-icon">🏆</div>
            <div className="achieve-title">국내 프로스포츠<br/>최초 심리상담사</div>
            <div className="achieve-sub">FC서울 · 2007년</div>
          </div>
          <div className="achieve-item">
            <div className="achieve-icon">📋</div>
            <div className="achieve-title">국내 최다<br/>프로구단 심리훈련</div>
            <div className="achieve-sub">FC서울·GS칼텍스·NC다이노스 외 14개 구단</div>
          </div>
          <div className="achieve-item">
            <div className="achieve-icon">🔬</div>
            <div className="achieve-title">IZOF 수행프로파일<br/>우수논문상</div>
            <div className="achieve-sub">한국스포츠심리학회</div>
          </div>
          <div className="achieve-item">
            <div className="achieve-icon">📱</div>
            <div className="achieve-title">챗GPT 기반<br/>멘탈 앱 Planity</div>
            <div className="achieve-sub">최고수행 셀프톡 생성</div>
          </div>
          <div className="achieve-item">
            <div className="achieve-icon">⚖️</div>
            <div className="achieve-title">선수 심리 분석<br/>특허 등록</div>
            <div className="achieve-sub">제 10-2680767 호</div>
          </div>
          <div className="achieve-item">
            <div className="achieve-icon">📚</div>
            <div className="achieve-title">스포츠심리학의 정석<br/>세종도서 선정</div>
            <div className="achieve-sub">멘탈 훈련 이론서</div>
          </div>
          <div className="achieve-item">
            <div className="achieve-icon">🏢</div>
            <div className="achieve-title">벤처기업 선정 &<br/>정부 지원사업</div>
            <div className="achieve-sub">2023 벤처 · 2025 문체부 지원</div>
          </div>
          <div className="achieve-item">
            <div className="achieve-icon">🌐</div>
            <div className="achieve-title">스포츠 심리교육<br/>콘텐츠 400건+</div>
            <div className="achieve-sub">연간 주기화 프로그램</div>
          </div>
        </div>
      </section>

      {/* ── PROCESS ── */}
      <section className="home-section process-section fade-up" id="process">
        <div className="section-eyebrow">How It Works</div>
        <div className="section-title">3단계 상담 프로세스</div>
        <div className="process-steps">
          <div className="process-step">
            <div className="step-circle">R</div>
            <div className="step-name">Reservation</div>
            <div className="step-detail">전화 또는 온라인으로<br/>상담 예약</div>
          </div>
          <div className="process-step">
            <div className="step-circle">I</div>
            <div className="step-name">Interview</div>
            <div className="step-detail">초기 면접 및<br/>심리검사 진행</div>
          </div>
          <div className="process-step">
            <div className="step-circle">T</div>
            <div className="step-name">Training</div>
            <div className="step-detail">맞춤형 멘탈<br/>트레이닝 시작</div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="cta-section fade-up" id="contact">
        <div className="section-eyebrow">Get Started</div>
        <h2 className="cta-title">지금 바로<br/>시작하세요</h2>
        <p className="cta-sub">순간은 짧지만, 순간을 만드는 준비는 길다.<br/>터플리와 함께 그 준비를 시작하세요.</p>
        <Link to="/reservation" className="hero-btn">상담 예약 신청하기</Link>
      </section>
    </div>
  );
};

export default Home;
