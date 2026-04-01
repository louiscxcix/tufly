import { useState } from "react";
import { Link } from "react-router-dom";
import { counselor_db, SPORTS_LIST, LOCATION_LIST, AREAS_OF_CONCERN } from "../data/counselorDb";
import { getGeminiRecommendation } from "../utils/gemini";
import "./CounselorRecommendation.css";

const CounselorRecommendation = () => {
  const [formData, setFormData] = useState({
    name: "",
    sport: SPORTS_LIST[0],
    areas_of_concern: [],
    preferred_location: [],
    preferred_gender: "상관없음",
    preferred_experience_level: "상관없음",
    privacy_consent: false,
    terms_consent: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleMultiselectChange = (name, value) => {
    setFormData((prev) => {
      const currentList = prev[name];
      if (currentList.includes(value)) {
        return { ...prev, [name]: currentList.filter((item) => item !== value) };
      } else {
        return { ...prev, [name]: [...currentList, value] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setResult(null);

    // Validate
    if (!formData.name.trim()) {
      setError("이름을 입력해주세요.");
      return;
    }
    if (formData.areas_of_concern.length === 0) {
      setError("도움이 필요한 분야를 최소 1개 이상 선택해주세요.");
      return;
    }
    if (!formData.privacy_consent || !formData.terms_consent) {
      setError("필수 동의 항목을 체크해주세요.");
      return;
    }

    setIsLoading(true);

    try {
      const recommendation = await getGeminiRecommendation(formData, counselor_db);
      setResult(recommendation);
    } catch (err) {
      setError(err.message || "추천 결과를 가져오는 데 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container recommendation-container">
      <div className="recommendation-header text-center">
        <h1 className="heading-h1 neon-text">🥇 선수를 위한 맞춤 상담사 추천 AI</h1>
        <p className="desc desc-lg text-gradient-primary" style={{ marginTop: 'var(--spacing-md)' }}>
          당신의 마음을 가장 잘 이해하는 전문가를 찾아드릴게요.
        </p>
      </div>

      <div className="recommendation-wrapper">
        <div className="recommendation-form-wrapper glass-panel glow-panel">
          <form className="recommendation-form" onSubmit={handleSubmit}>
            <h2 className="section-title">1. 선수 정보를 알려주세요.</h2>
            
            <div className="form-row">
              <div className="form-group">
                <label>이름</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="glass-input"
                  placeholder="예: 홍길동"
                />
              </div>
              <div className="form-group">
                <label>소속 운동 종목</label>
                <select
                  name="sport"
                  value={formData.sport}
                  onChange={handleInputChange}
                  className="glass-input custom-select"
                >
                  {SPORTS_LIST.map((sport) => (
                    <option key={sport} value={sport}>{sport}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>어떤 도움이 필요하신가요? (주요 고민 분야, 복수 선택 가능)</label>
              <div className="chip-container">
                {AREAS_OF_CONCERN.map((area) => (
                  <button
                    type="button"
                    key={area}
                    className={`chip ${formData.areas_of_concern.includes(area) ? 'selected' : ''}`}
                    onClick={() => handleMultiselectChange("areas_of_concern", area)}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>

            <h2 className="section-title">2. 원하시는 상담 조건이 있나요?</h2>
            
            <div className="form-group">
              <label>선호 상담 지역/방식 (복수 선택 가능)</label>
              <div className="chip-container">
                {LOCATION_LIST.map((loc) => (
                  <button
                    type="button"
                    key={loc}
                    className={`chip ${formData.preferred_location.includes(loc) ? 'selected' : ''}`}
                    onClick={() => handleMultiselectChange("preferred_location", loc)}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>선호 상담사 성별</label>
                <div className="radio-group">
                  {["남성", "여성", "상관없음"].map(gender => (
                    <label key={gender} className="radio-label">
                      <input
                        type="radio"
                        name="preferred_gender"
                        value={gender}
                        checked={formData.preferred_gender === gender}
                        onChange={handleInputChange}
                      />
                      <span className="radio-custom"></span>
                      {gender}
                    </label>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label>선호 상담사 전문성 수준</label>
                <select
                  name="preferred_experience_level"
                  value={formData.preferred_experience_level}
                  onChange={handleInputChange}
                  className="glass-input custom-select"
                >
                  {["상관없음", "석사급 이상", "박사급 이상"].map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </div>
            </div>

            <h2 className="section-title">3. 마지막으로 동의해주세요.</h2>
            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="privacy_consent"
                  checked={formData.privacy_consent}
                  onChange={handleInputChange}
                />
                개인정보 수집 및 이용에 동의합니다. (필수)
              </label>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="terms_consent"
                  checked={formData.terms_consent}
                  onChange={handleInputChange}
                />
                상담 유의사항을 확인했으며, 이에 동의합니다. (필수)
              </label>
            </div>

            {error && <div className="form-message error">{error}</div>}

            <button type="submit" className="btn-primary submit-btn ai-btn" disabled={isLoading}>
              {isLoading ? "AI가 상담사를 찾고 있습니다..." : "AI에게 추천 요청하기 🚀"}
            </button>
          </form>
        </div>

        {/* Result Area */}
        {result && (
          <div className="recommendation-result glass-panel fade-in">
            <h2 className="result-title neon-text">✨ 추천 결과</h2>
            <div className="result-content markdown-body">
              {/* This might be markdown, normally you'd use react-markdown, but we'll render it simply for now */}
              {result.recommendation_text.split('\n').map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
            </div>
            
            {result.booking_link && (
              <a href={result.booking_link} target="_blank" rel="noreferrer" className="btn-primary" style={{ display: 'inline-block', marginTop: 'var(--spacing-xl)', textDecoration: 'none' }}>
                상담 예약하기
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CounselorRecommendation;
