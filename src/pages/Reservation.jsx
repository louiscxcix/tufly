import React, { useState } from 'react';
import './Reservation.css';

const Reservation = () => {
    const [formData, setFormData] = useState({
        user_name: '',
        user_phone: '',
        user_email: '',
        message: ''
    });
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null); // 'success' | 'error' | null

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setStatus(null);

        try {
            const response = await fetch('https://formspree.io/f/xpqorydp', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setStatus('success');
                setFormData({ user_name: '', user_phone: '', user_email: '', message: '' });
            } else {
                setStatus('error');
            }
        } catch (error) {
            console.error('Submission error:', error);
            setStatus('error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="reservation-container page-container">
            <div className="reservation-wrapper container glass-panel glow-panel">
                {/* Left Side: Info */}
                <div className="reservation-info">
                    <h1 className="heading-h1">상담 예약하기</h1>
                    <p className="subtitle text-large text-gradient-primary">
                        최고의 성과를 위한 첫걸음, 지금 시작하세요.
                    </p>
                    <p className="text-medium text-muted desc">
                        연락처를 남겨주시면 확인 후 1-2일 내로 연락 드리겠습니다.
                    </p>

                    <div className="recommendation-box glass-panel">
                        <h4 className="heading-h4" style={{ color: 'var(--color-teal)', marginBottom: 'var(--spacing-md)' }}>
                            이러한 선수에게 심리 상담을 추천합니다
                        </h4>
                        <ul className="recommendation-list">
                            <li>경기 중 높은 압박감을 이겨내기 힘든 선수</li>
                            <li>중요 시합을 앞두고 멘탈 강화를 통해 성적을 올리고 싶은 선수</li>
                            <li>중요한 순간에 집중력을 잃기 쉬운 선수</li>
                            <li>연습 시에 비해 실전에서 경기력이 잘 나오지 않는 선수</li>
                        </ul>
                    </div>
                </div>

                {/* Right Side: Form */}
                <div className="reservation-form-wrapper">
                    <form className="reservation-form" onSubmit={handleSubmit}>
                        <div className="form-group">
                            <label htmlFor="user_name">이름</label>
                            <input 
                                type="text" 
                                id="user_name" 
                                name="user_name" 
                                required 
                                value={formData.user_name}
                                onChange={handleChange}
                                placeholder="홍길동"
                                className="glass-input"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="user_phone">연락처</label>
                            <input 
                                type="tel" 
                                id="user_phone" 
                                name="user_phone" 
                                required 
                                value={formData.user_phone}
                                onChange={handleChange}
                                placeholder="010-0000-0000"
                                className="glass-input"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="user_email">답변 받으실 이메일</label>
                            <input 
                                type="email" 
                                id="user_email" 
                                name="user_email" 
                                required 
                                value={formData.user_email}
                                onChange={handleChange}
                                placeholder="example@tufly.com"
                                className="glass-input"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="message">문의 내용 (선택 기입)</label>
                            <textarea 
                                id="message" 
                                name="message" 
                                rows="5" 
                                value={formData.message}
                                onChange={handleChange}
                                placeholder="현재 겪고 있는 고민이나 원하시는 상담 방향을 자유롭게 남겨주세요."
                                className="glass-input"
                            ></textarea>
                        </div>
                        
                        <button type="submit" className="btn-primary submit-btn" disabled={loading}>
                            {loading ? '전송 중...' : '상담 예약 신청하기'}
                        </button>
                        
                        {status === 'success' && (
                            <div className="form-message success glass-panel" style={{ borderColor: 'var(--color-teal)' }}>
                                예약 신청이 완료되었습니다! 확인 후 빠르게 연락드리겠습니다.
                            </div>
                        )}
                        {status === 'error' && (
                            <div className="form-message error glass-panel" style={{ borderColor: '#ff4d4f' }}>
                                전송에 실패했습니다. 다시 시도해주시거나 관리자에게 문의해주세요.
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Reservation;
