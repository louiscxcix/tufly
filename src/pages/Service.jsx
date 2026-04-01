import { Shield, Sparkles, Zap, Award } from 'lucide-react';
import './Service.css';

const services = [
  {
    icon: <Shield size={40} />,
    title: "기본 진단 패키지",
    description: "간단한 상담 및 멘탈 검진 1회",
    price: "100,000원",
    features: ["기본 멘탈 진단 검사", "전문가 1:1 결과 분석", "단기 목표 설정"],
    popular: false
  },
  {
    icon: <Sparkles size={40} />,
    title: "심화 회복 패키지 (5회)",
    description: "전문 상담사 3회 + 김병준 교수 2회",
    price: "1,000,000원",
    features: ["심화 심리 검사", "전문가 및 교수 복합 상담", "불안 및 긴장 완화 솔루션", "리커버리 리포트 제공"],
    popular: true
  },
  {
    icon: <Zap size={40} />,
    title: "성과 향상 패키지 (10회)",
    description: "전문 상담사 7회 + 김병준 교수 3회",
    price: "1,600,000원",
    features: ["최상의 모드(Flow) 진입 훈련", "시합 집중력 강화 훈련", "정기적인 성과 모니터링", "모의 실전 시뮬레이션"],
    popular: false
  },
  {
    icon: <Award size={40} />,
    title: "시합 관리 패키지 (10회)",
    description: "김병준 교수 전문 상담 10회",
    price: "3,000,000원",
    features: ["김병준 교수 1:1 전담 마크", "시합 전후 멘탈 집중 관리", "전화 및 온라인 즉각 피드백", "연간 멘탈 로드맵 설계"],
    popular: false
  }
];

const Service = () => {
  return (
    <div className="service-page animate-fade-in container">
      <div className="page-header text-center">
        <h1 className="text-gradient-primary">상담 서비스</h1>
        <p className="page-subtitle">체계적이고 과학적인 터플리의 전문 멘탈 케어 프로그램</p>
      </div>

      <div className="services-grid">
        {services.map((svc, index) => (
          <div key={index} className={`glass-panel service-card ${svc.popular ? 'popular' : ''}`}>
            {svc.popular && <div className="popular-badge">추천 패키지</div>}
            <div className="service-icon">{svc.icon}</div>
            <h3>{svc.title}</h3>
            <p className="service-desc">{svc.description}</p>
            <div className="service-price">{svc.price}<span> / 부가세 별도</span></div>
            <ul className="service-features">
              {svc.features.map((feature, i) => (
                <li key={i}>{feature}</li>
              ))}
            </ul>
            <button className={svc.popular ? "btn-primary w-100" : "btn-outline w-100"}>
              예약하기
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Service;
