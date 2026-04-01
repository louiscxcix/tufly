import React from 'react';
import { Link } from 'react-router-dom';
import { getTestList } from '../data/testConfigs';
import './MentalTestList.css';

const MentalTestList = () => {
  const tests = getTestList();

  return (
    <div className="test-list-page animate-fade-in">
      <div className="container">
        <div className="section-header">
          <h1 className="section-title">멘탈 검진 플랫폼</h1>
          <p className="section-subtitle">터플리 전문가가 설계한 다양한 심리/멘탈 상태 진단 도구를 통해 현재 상태를 파악하세요.</p>
        </div>
        
        <div className="test-grid">
          {tests.map(test => (
            <Link to={`/test/${test.id}`} key={test.id} className="test-card glass-panel">
              <div className="test-card-content">
                <h2>{test.title}</h2>
                <p>{test.description}</p>
                <span className="btn-outline">검사 시작하기</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MentalTestList;
