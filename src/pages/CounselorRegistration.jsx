import { useState } from "react";
import { SPORTS_LIST, LOCATION_LIST } from "../data/counselorDb";
import "./CounselorRegistration.css";

const initialForm = {
  counselor_name: "",
  gender: "남성",
  experience_years: 0,
  specialized_sports: [],
  specialized_areas: "", 
  qualification_level: "",
  certifications: "", 
  counseling_locations: [],
  introduction: "",
  booking_link: ""
};

const CounselorRegistration = () => {
  const [formData, setFormData] = useState(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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
    setLoading(true);
    setError(null);
    
    // Format parsing for clean logging/emails
    const finalData = {
      ...formData,
      experience_years: parseInt(formData.experience_years) || 0,
    };
    
    try {
        const response = await fetch('https://formspree.io/f/xpqorydp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(finalData)
        });

        if (response.ok) {
            setSubmitted(true);
            setFormData(initialForm);
        } else {
            setError("전송에 실패했습니다. 형식이나 연결을 확인해주세요.");
        }
    } catch (err) {
        console.error('Submission error:', err);
        setError("서버 에러가 발생했습니다. 관리자에게 문의해주세요.");
    } finally {
        setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="page-container registration-container">
        <div className="registration-wrapper glass-panel glow-panel text-center fade-in" style={{ padding: '60px 40px', maxWidth: '600px', margin: '0 auto' }}>
          <h2 className="heading-h1 neon-text" style={{ marginBottom: '20px' }}>등록 신청이 완료되었습니다!</h2>
          <p className="desc" style={{ marginBottom: '40px' }}>
            TUFLY 전문가 심사팀에서 접수된 내용을 검토한 후, 개별 연락 드리겠습니다. 지원해 주셔서 감사합니다.
          </p>
          <button className="btn-primary" onClick={() => setSubmitted(false)}>추가로 등록하기</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container registration-container">
      <div className="registration-header text-center">
        <h1 className="heading-h1 neon-text">🤝 상담사 파트너 등록</h1>
        <p className="desc desc-lg text-gradient-primary" style={{ marginTop: 'var(--spacing-md)' }}>
          선수들의 잠재력을 끌어올려 줄 전문 상담사님을 기다립니다.
        </p>
      </div>

      <div className="registration-wrapper">
        <div className="registration-form-wrapper glass-panel glow-panel">
          <form className="registration-form" onSubmit={handleSubmit}>
            
            <h2 className="section-title">1. 기본 정보</h2>
            <div className="form-row">
              <div className="form-group">
                <label>이름 / 상담사명 *</label>
                <input
                  type="text"
                  name="counselor_name"
                  value={formData.counselor_name}
                  onChange={handleInputChange}
                  className="glass-input"
                  required
                />
              </div>
              <div className="form-group">
                <label>성별</label>
                <div className="radio-group">
                  {["남성", "여성"].map(gender => (
                    <label key={gender} className="radio-label">
                      <input
                        type="radio"
                        name="gender"
                        value={gender}
                        checked={formData.gender === gender}
                        onChange={handleInputChange}
                      />
                      <span className="radio-custom"></span>
                      {gender}
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>상담 경력 (년) *</label>
                <input
                  type="number"
                  name="experience_years"
                  min="0"
                  value={formData.experience_years}
                  onChange={handleInputChange}
                  className="glass-input"
                  required
                />
              </div>
              <div className="form-group">
                <label>자격 수준 표기 (예: 석사급/2급) *</label>
                <input
                  type="text"
                  name="qualification_level"
                  value={formData.qualification_level}
                  onChange={handleInputChange}
                  className="glass-input"
                  placeholder="예: 박사과정/3급"
                  required
                />
              </div>
            </div>

            <h2 className="section-title">2. 전문 분야</h2>
            <div className="form-group">
              <label>주 상담 종목 (복수 선택)</label>
              <div className="chip-container">
                {SPORTS_LIST.map((sport) => (
                  <button
                    type="button"
                    key={sport}
                    className={`chip ${formData.specialized_sports.includes(sport) ? 'selected' : ''}`}
                    onClick={() => handleMultiselectChange("specialized_sports", sport)}
                  >
                    {sport}
                  </button>
                ))}
            </div>
            </div>

            <div className="form-group">
              <label>상담사 전문 분야 (콤마로 구분하여 입력) *</label>
              <input
                type="text"
                name="specialized_areas"
                value={formData.specialized_areas}
                onChange={handleInputChange}
                className="glass-input"
                placeholder="예: 슬럼프 극복, 루틴 개발, 자신감 회복"
                required
              />
            </div>

            <div className="form-group">
              <label>보유 자격증 (콤마로 구분하여 입력) *</label>
              <input
                type="text"
                name="certifications"
                value={formData.certifications}
                onChange={handleInputChange}
                className="glass-input"
                placeholder="예: 스포츠심리상담사 1급, 일반 심리상담사 2급"
                required
              />
            </div>

            <h2 className="section-title">3. 상담 운영</h2>
            <div className="form-group">
              <label>상담 가능 지역 (복수 선택)</label>
              <div className="chip-container">
                {LOCATION_LIST.map((loc) => (
                  <button
                    type="button"
                    key={loc}
                    className={`chip ${formData.counseling_locations.includes(loc) ? 'selected' : ''}`}
                    onClick={() => handleMultiselectChange("counseling_locations", loc)}
                  >
                    {loc}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>상담 예약 링크 (예: 캘린더/플랫폼 주소)</label>
              <input
                type="url"
                name="booking_link"
                value={formData.booking_link}
                onChange={handleInputChange}
                className="glass-input"
                placeholder="https://"
              />
            </div>

            <div className="form-group">
              <label>상담사 소개글 *</label>
              <textarea
                name="introduction"
                value={formData.introduction}
                onChange={handleInputChange}
                className="glass-input textarea"
                placeholder="본인의 철학, 강점, 선수들에게 전하고 싶은 말을 남겨주세요."
                rows="5"
                required
              ></textarea>
            </div>

            {error && (
                <div className="form-message error glass-panel" style={{ borderColor: '#ff4d4f', marginTop: '16px' }}>
                    {error}
                </div>
            )}

            <button type="submit" className="btn-primary submit-btn" disabled={loading}>
              {loading ? "전송 중..." : "등록 제출하기"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CounselorRegistration;
