export const testConfigs = {
  special_test: { id: 'special_test', title: '🌟 특수 검사', description: '특정 상황에 특화된 심층 심리 상태를 확인합니다.', categories: [] },
  self_management: { id: 'self_management', title: '📋 자기관리 검사', description: '일상적인 루틴과 멘탈 관리 습관을 점검합니다.', categories: [] },
  burnout: { id: 'burnout', title: '🔥 번아웃 검사', description: '선수의 심리적 탈진 상태와 스트레스 지수를 진단합니다.', categories: [] },
  izof_mental: { id: 'izof_mental', title: '🧠 IZOF-멘탈', description: '스포츠 상황에서의 이상적인 심리 상태(IZOF)를 측정합니다.', categories: [] },
  izof_physical: { id: 'izof_physical', title: '💪 IZOF-체력', description: '신체적 준비도와 최적의 신체 리듬 상태를 점검합니다.', categories: [] },
  izof_tt: { id: 'izof_tt', title: '🏓 IZOF-기술(탁구)', description: '탁구 종목에 특화된 기술 수행 프로파일 검사입니다.', categories: [] },
  izof_golf: {
    id: 'izof_golf',
    title: '🏌️ 골프 IZOF (현재 예시)',
    description: '요구(시합 때 필요한 수준)와 현재 수준을 비교하여 골프 멘탈 훈련 요구를 파악합니다.',
    categories: [
      {
        id: 'skill',
        title: '기술 동작',
        items: [
          { key: 'tee_shot', name: '티샷 정확성' },
          { key: 'second_shot', name: '세컨샷 핀에 좀더 가까이 붙이기' },
          { key: 'approach', name: '어프로치 정확성' },
          { key: 'long_putt', name: '롱 퍼팅' },
          { key: 'short_putt', name: '숏 퍼팅' },
          { key: 'auto_swing', name: '본능적 / 자동적 스윙' }
        ]
      },
      {
        id: 'physical',
        title: '체력',
        items: [
          { key: 'aerobic', name: '유산소 체력' },
          { key: 'strength', name: '근력' },
          { key: 'flexibility', name: '유연성' },
          { key: 'agility', name: '순발력' }
        ]
      },
      {
        id: 'mental',
        title: '심리',
        items: [
          { key: 'present_focus', name: '현재집중', desc: '과거·미래 신경 안 쓰기' },
          { key: 'emotion_control', name: '감정 / 생각 조절', desc: '목표에만 집중' },
          { key: 'tension_control', name: '긴장조절', desc: '적당한 긴장 유지 · 시합 전 편안함 · 긍정마음' },
          { key: 'confidence', name: '자신감', desc: '부정적 생각 안 함' },
          { key: 'imagery', name: '성공궤적 이미지그리기' },
          { key: 'enjoyment', name: '재미 / 즐긴다' },
          { key: 'dedication', name: '헌신 / 집념' }
        ]
      }
    ]
  },
  izof_soccer_gk: { id: 'izof_soccer_gk', title: '⚽ IZOF-기술(축구 GK)', description: '축구 골키퍼 포지션에 특화된 기술 수행 프로파일 검사입니다.', categories: [] },
  izof_soccer_df: { id: 'izof_soccer_df', title: '⚽ IZOF-기술(축구 DF)', description: '축구 수비수 포지션에 특화된 기술 수행 프로파일 검사입니다.', categories: [] },
  izof_soccer_mf: { id: 'izof_soccer_mf', title: '⚽ IZOF-기술(축구 MF)', description: '축구 미드필더 포지션에 특화된 기술 수행 프로파일 검사입니다.', categories: [] },
  izof_soccer_fw: { id: 'izof_soccer_fw', title: '⚽ IZOF-기술(축구 FW)', description: '축구 공격수 포지션에 특화된 기술 수행 프로파일 검사입니다.', categories: [] },
  izof_baseball_p: { id: 'izof_baseball_p', title: '⚾ IZOF-기술(야구 투수)', description: '야구 투수 포지션에 특화된 기술 수행 프로파일 검사입니다.', categories: [] },
  izof_baseball_b: { id: 'izof_baseball_b', title: '⚾ IZOF-기술(야구 타자)', description: '야구 타자 특화 기술 수행 프로파일 검사입니다.', categories: [] },
  izof_billiards: { id: 'izof_billiards', title: '🎱 IZOF-기술(당구)', description: '당구 종목의 고도의 집중력을 측정하는 프로파일 검사입니다.', categories: [] },
  izof_gymnastics: { id: 'izof_gymnastics', title: '🤸‍♀️ IZOF-기술(리듬체조)', description: '리듬체조 선수를 위한 퍼포먼스 프로파일 검사입니다.', categories: [] },
  izof_baduk: { id: 'izof_baduk', title: '⚫ IZOF-기술(바둑)', description: '바둑 기사를 위한 고도의 인지/심리 프로파일 검사입니다.', categories: [] },
  izof_ballet: { id: 'izof_ballet', title: '🩰 IZOF-기술(발레)', description: '발레 무용수의 예술성과 테크닉을 위한 프로파일 검사입니다.', categories: [] },
  izof_badminton: { id: 'izof_badminton', title: '🏸 IZOF-기술(배드민턴)', description: '배드민턴 특유의 순발력과 판단력을 위한 프로파일 검사입니다.', categories: [] },
  izof_shooting: { id: 'izof_shooting', title: '🎯 IZOF-기술(사격)', description: '사격 특유의 타겟 집중력을 평가하는 프로파일 검사입니다.', categories: [] },
  izof_swim: { id: 'izof_swim', title: '🏊 IZOF-기술(수영)', description: '수영 종목의 리듬과 멘탈 안정성을 평가합니다.', categories: [] },
  izof_archery: { id: 'izof_archery', title: '🏹 IZOF-기술(양궁)', description: '양궁 선수의 극도의 긴장 조절과 침착성을 평가합니다.', categories: [] },
  izof_judo: { id: 'izof_judo', title: '🥋 IZOF-기술(유도)', description: '유도 종목의 폭발적 파워 및 투지 퍼포먼스를 점검합니다.', categories: [] },
};

export const getTestList = () => {
  return Object.values(testConfigs).map(test => ({
    id: test.id,
    title: test.title,
    description: test.description
  }));
};
