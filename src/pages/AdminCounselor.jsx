import { useState } from "react";
import { SPORTS_LIST, LOCATION_LIST } from "../data/counselorDb";
import "./AdminCounselor.css";

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

const AdminCounselor = () => {
  const [formData, setFormData] = useState(initialForm);
  const [generatedJson, setGeneratedJson] = useState("");
  const [copied, setCopied] = useState(false);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    setCopied(false);
    
    // Parse areas and certs into arrays based on comma
    const finalData = {
      ...formData,
      experience_years: parseInt(formData.experience_years) || 0,
      specialized_areas: formData.specialized_areas.split(',').map(s => s.trim()).filter(Boolean),
      certifications: formData.certifications.split(',').map(s => s.trim()).filter(Boolean)
    };
    
    // Stringify format matching the js objects
    // It's useful to remove quotes on keys if possible, but JSON.stringify adds quotes.
    // The user can copy the standard JSON block directly into counselorDb.js anyway.
    const jsonStr = JSON.stringify(finalData, null, 2);
    setGeneratedJson(jsonStr + ",");
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page-container admin-container">
      <div className="admin-header text-center">
        <h1 className="heading-h1 neon-text" style={{ color: "#F59E0B" }}>⚙️ [Admin] 상담사 DB 생성기</h1>
        <p className="desc desc-lg" style={{ marginTop: 'var(--spacing-md)' }}>
          상담사 양식을 채워 JSON 코드를 생성하고 counselorDb.js에 붙여넣으세요.
        </p>
      </div>

      <div className="admin-wrapper">
        <div className="admin-form-wrapper glass-panel glow-panel" style={{ padding: '40px' }}>
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>이름</label>
                <input type="text" name="counselor_name" value={formData.counselor_name} onChange={handleInputChange} className="glass-input" required />
              </div>
              <div className="form-group">
                <label>성별</label>
                <select name="gender" value={formData.gender} onChange={handleInputChange} className="glass-input custom-select" required>
                  <option value="남성">남성</option>
                  <option value="여성">여성</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>상담 경력 (년)</label>
                <input type="number" name="experience_years" min="0" value={formData.experience_years} onChange={handleInputChange} className="glass-input" required />
              </div>
              <div className="form-group">
                <label>자격 수준 표기</label>
                <input type="text" name="qualification_level" value={formData.qualification_level} onChange={handleInputChange} className="glass-input" placeholder="예: 석사급/2급" required />
              </div>
            </div>

            <div className="form-group">
              <label>상담사 전문 분야 (콤마로 구분)</label>
              <input type="text" name="specialized_areas" value={formData.specialized_areas} onChange={handleInputChange} className="glass-input" placeholder="예: 슬럼프 극복, 부상 후 심리 회복" required />
            </div>

            <div className="form-group">
              <label>보유 자격증 (콤마로 구분)</label>
              <input type="text" name="certifications" value={formData.certifications} onChange={handleInputChange} className="glass-input" placeholder="예: 스포츠심리상담사 1급, 일반 심리상담사 2급" required />
            </div>

            <div className="form-row">
                <div className="form-group">
                  <label>전문 스포츠</label>
                  <div className="chip-container mini">
                    {SPORTS_LIST.slice(0, 15).map((sport) => (
                      <button type="button" key={sport} className={`chip ${formData.specialized_sports.includes(sport) ? 'selected' : ''}`} onClick={() => handleMultiselectChange("specialized_sports", sport)}>
                        {sport}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>가능 지역</label>
                  <div className="chip-container mini">
                    {LOCATION_LIST.slice(0, 5).map((loc) => (
                      <button type="button" key={loc} className={`chip ${formData.counseling_locations.includes(loc) ? 'selected' : ''}`} onClick={() => handleMultiselectChange("counseling_locations", loc)}>
                        {loc}
                      </button>
                    ))}
                    <button type="button" className={`chip ${formData.counseling_locations.includes('비대면(온라인)') ? 'selected' : ''}`} onClick={() => handleMultiselectChange("counseling_locations", '비대면(온라인)')}>비대면(온라인)</button>
                    <button type="button" className={`chip ${formData.counseling_locations.includes('비대면(전화)') ? 'selected' : ''}`} onClick={() => handleMultiselectChange("counseling_locations", '비대면(전화)')}>비대면(전화)</button>
                  </div>
                </div>
            </div>

            <div className="form-group">
              <label>상담사 소개글</label>
              <textarea name="introduction" value={formData.introduction} onChange={handleInputChange} className="glass-input" rows="3" required></textarea>
            </div>
            
            <div className="form-group">
              <label>예약 링크</label>
              <input type="url" name="booking_link" value={formData.booking_link} onChange={handleInputChange} className="glass-input" placeholder="https://" />
            </div>

            <button type="submit" className="btn-primary submit-btn" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}>
              JSON 코드 생성하기
            </button>
          </form>
        </div>
        
        {generatedJson && (
          <div className="json-output-wrapper glass-panel glow-panel fade-in" style={{ marginTop: '24px', padding: '24px', position: 'relative' }}>
            <h3 className="section-title text-gradient-primary" style={{ border: 'none', marginBottom: '16px', marginTop: 0 }}>📋 생성된 코드</h3>
            <button className={`btn-primary copy-btn ${copied ? 'copied' : ''}`} onClick={handleCopy}>
              {copied ? '✔ 복사됨' : '📑 코드 복사'}
            </button>
            <pre className="json-box">
              <code>{generatedJson}</code>
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminCounselor;
