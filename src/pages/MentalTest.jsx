import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { testConfigs } from '../data/testConfigs';
import {
  Chart as ChartJS,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';
import './MentalTest.css';

ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend
);

const MentalTest = () => {
  const { testId } = useParams();
  const navigate = useNavigate();
  const testConfig = testConfigs[testId];
  
  const [userName, setUserName] = useState('');
  const [testDate, setTestDate] = useState(new Date().toISOString().split('T')[0]);
  const [scores, setScores] = useState({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiFeedback, setAiFeedback] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!testConfig) {
      navigate('/test');
      return;
    }
    // Initialize scores to 5 for req and curr
    const initialScores = {};
    testConfig.categories.forEach(cat => {
      cat.items.forEach(item => {
        initialScores[item.key] = { req: 5, curr: 5 };
      });
    });
    setScores(initialScores);
  }, [testId, testConfig, navigate]);

  if (!testConfig || Object.keys(scores).length === 0) return null;

  const handleSliderChange = (key, type, value) => {
    setScores(prev => ({
      ...prev,
      [key]: { ...prev[key], [type]: parseInt(value) }
    }));
  };

  const calculateNeed = (req, curr) => Math.max(0, req - curr);

  const handleComplete = () => {
    setIsCompleted(true);
    setTimeout(() => {
      document.getElementById('summary')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Summary Calculations
  let totalReq = 0;
  let totalCurr = 0;
  let totalNeed = 0;
  let needArray = [];
  let labels = [];
  let reqData = [];
  let currData = [];
  const totalItems = Object.keys(scores).length;

  Object.entries(scores).forEach(([key, val]) => {
    const need = calculateNeed(val.req, val.curr);
    totalReq += val.req;
    totalCurr += val.curr;
    totalNeed += need;
    
    // Find item name
    let itemName = key;
    testConfig.categories.forEach(cat => {
      const match = cat.items.find(i => i.key === key);
      if (match) itemName = match.name;
    });
    
    needArray.push({ key, name: itemName, need });
    labels.push(itemName);
    reqData.push(val.req);
    currData.push(val.curr);
  });

  const avgReq = (totalReq / totalItems).toFixed(1);
  const avgCurr = (totalCurr / totalItems).toFixed(1);
  const avgNeed = (totalNeed / totalItems).toFixed(1);

  const topNeeds = needArray.sort((a, b) => b.need - a.need).slice(0, 3);

  const handleAIAnalysis = () => {
    setIsAnalyzing(true);
    setAiFeedback('');
    
    // Mock simulation of AI analysis
    setTimeout(() => {
      setIsAnalyzing(false);
      const top3Names = topNeeds.map(t => t.name).join(', ');
      setAiFeedback(`
        현재 분석 결과, ${userName || '선수'}님의 가장 우선적인 훈련 과제는 [${top3Names}]입니다. 
        특히 요구 수준과 현재 상태의 격차가 큽니다. 
        이 부분의 멘탈 에너지를 집중적으로 보강한다면 전체적인 경기력 향상이 기대됩니다.
        터플리 전용 멘탈 강화 프로그램을 통해 맞춤형 훈련을 시작해 보세요.
      `);
    }, 1500);
  };

  const chartData = {
    labels,
    datasets: [
      {
        label: '이상적 상태 (요구)',
        data: reqData,
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(255, 99, 132, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(255, 99, 132, 1)',
      },
      {
        label: '현재 상태',
        data: currData,
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(54, 162, 235, 1)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(54, 162, 235, 1)',
      },
    ],
  };

  const chartOptions = {
    scales: {
      r: {
        angleLines: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        pointLabels: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 12,
          },
        },
        ticks: {
          stepSize: 1,
          backdropColor: 'transparent',
          color: 'rgba(255, 255, 255, 0.4)',
          beginAtZero: true,
          max: 10,
        },
        suggestedMin: 0,
        suggestedMax: 10,
      },
    },
    plugins: {
      legend: {
        labels: {
          color: 'white',
        },
      },
    },
  };

  const handleCopyJSON = () => {
    const resultData = {
      testId,
      title: testConfig.title,
      userName,
      testDate,
      results: scores,
      summary: { avgReq, avgCurr, avgNeed, topNeeds }
    };
    navigator.clipboard.writeText(JSON.stringify(resultData, null, 2))
      .then(() => alert('JSON 결과가 클립보드에 복사되었습니다.'))
      .catch(err => console.error("복사 실패:", err));
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="mental-test-page animate-fade-in">
      <div className="container">
        
        <header>
          <h1>{testConfig.title}</h1>
          <p>
            <strong>요구</strong> = 목표 (시합 때 필요한 이상적인 수준) &nbsp;|&nbsp;
            <strong>현재</strong> = 내가 생각하는 현재 상태<br/>
            <strong>훈련요구</strong> = 요구 − 현재 (점수가 높을수록 시급한 훈련 필요)
          </p>
        </header>

        <div className="meta-row">
          <div className="meta-field">
            <label>이름</label>
            <input type="text" value={userName} onChange={e => setUserName(e.target.value)} placeholder="선수 이름" />
          </div>
          <div className="meta-field">
            <label>검사 날짜</label>
            <input type="date" value={testDate} onChange={e => setTestDate(e.target.value)} />
          </div>
        </div>

        {testConfig.categories.map((cat, idx) => (
          <div className="section-card" key={cat.id}>
            <div className="section-title">
              <span className="badge">{idx + 1}</span> {cat.title}
            </div>

            {cat.items.map((item, itemIdx) => {
              const reqScore = scores[item.key]?.req || 5;
              const currScore = scores[item.key]?.curr || 5;
              const needScore = calculateNeed(reqScore, currScore);
              
              let badgeClass = 'low';
              if (needScore >= 4) badgeClass = 'high';
              else if (needScore >= 2) badgeClass = 'medium';

              return (
                <React.Fragment key={item.key}>
                  <div className="item">
                    <div className="item-name">{item.name}</div>
                    {item.desc && <div className="item-desc">{item.desc}</div>}
                    
                    <div className="score-row">
                      <span className="score-label req">요구</span>
                      <input 
                        type="range" 
                        min="1" max="10" 
                        value={reqScore} 
                        onChange={(e) => handleSliderChange(item.key, 'req', e.target.value)}
                        className="req-slider"
                        style={{ '--val': `${((reqScore - 1) / 9) * 100}%` }}
                      />
                      <span className="score-value req">{reqScore}</span>
                    </div>

                    <div className="score-row">
                      <span className="score-label curr">현재</span>
                      <input 
                        type="range" 
                        min="1" max="10" 
                        value={currScore} 
                        onChange={(e) => handleSliderChange(item.key, 'curr', e.target.value)}
                        className="curr-slider"
                        style={{ '--val': `${((currScore - 1) / 9) * 100}%` }}
                      />
                      <span className="score-value curr">{currScore}</span>
                    </div>
                    
                    <div className="range-hint">
                      <span>아주 낮음 (1)</span>
                      <span>매우 높음 (10)</span>
                    </div>

                    <div className="training-need">
                      <span>훈련요구</span>
                      <span className={`need-badge ${badgeClass}`}>{needScore}</span>
                    </div>
                  </div>
                  {itemIdx < cat.items.length - 1 && <hr className="divider" />}
                </React.Fragment>
              );
            })}
          </div>
        ))}

        {!isCompleted && (
          <div className="complete-action">
            <button className="btn-primary btn-large" onClick={handleComplete}>
              검사 완료 및 결과 분석하기
            </button>
            <p className="hint-text">모든 항목을 입력하셨나요? 버튼을 누르면 인공지능 분석과 결과 차트가 생성됩니다.</p>
          </div>
        )}

      {/* Results Section (Revealed on Completion) */}
      {isCompleted && (
        <div className="summary-card fade-in" id="summary">
          <h2>📊 검사 결과 요약</h2>
          
          <div className="summary-grid">
            <div className="summary-item">
              <div className="label">평균 요구</div>
              <div className="val">{avgReq}</div>
            </div>
            <div className="summary-item">
              <div className="label">평균 현재</div>
              <div className="val">{avgCurr}</div>
            </div>
            <div className="summary-item">
              <div className="label">평균 훈련요구</div>
              <div className="val">{avgNeed}</div>
            </div>
          </div>

          <div className="top-needs">
            <h3>🔥 훈련 시급도 상위 항목</h3>
            {topNeeds.map((t) => (
              <div className="top-need-item" key={t.key}>
                <span className="name">{t.name}</span>
                <span className="score">{t.need}점</span>
              </div>
            ))}
          </div>

          <div className="chart-container" style={{ marginTop: '20px' }}>
            <h3>Radar Chart 분석</h3>
            <div className="radar-wrapper">
              <Radar 
                data={chartData} 
                options={{
                  ...chartOptions,
                  maintainAspectRatio: true,
                  responsive: true,
                }} 
              />
            </div>
          </div>

          {!aiFeedback ? (
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button 
                className={`btn btn-primary ${isAnalyzing ? 'analyzing' : ''}`} 
                onClick={handleAIAnalysis}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? '분석 중...' : '🔥 Tufly AI 검진 결과 분석'}
              </button>
            </div>
          ) : (
            <div className="ai-feedback-box animate-slide-in">
              <h4>🤖 AI 결과 분석 레포트</h4>
              <p>{aiFeedback}</p>
            </div>
          )}

          <div className="btn-row">
            <button className="btn btn-secondary" onClick={() => window.print()}>결과표 인쇄 (PDF)</button>
          </div>

          <div className="json-step-section" style={{ marginTop: '40px' }}>
            <details className="json-details">
              <summary className="btn btn-secondary" style={{display: 'inline-block'}}>개발자용 JSON 데이터 확인</summary>
              <div className="json-box">
                <pre>{JSON.stringify({ 
                  testId, 
                  userName, 
                  results: scores, 
                  summary: { avgReq, avgCurr, avgNeed } 
                }, null, 2)}</pre>
              </div>
            </details>
          </div>
        </div>
      )}


      </div>
    </div>
  );
};

export default MentalTest;
