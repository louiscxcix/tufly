import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  ChevronLeft, BookOpen, Users, Award, CheckCircle, Lock,
  Clock, ChevronDown, ChevronUp, Info, ArrowRight,
  Shield, FileCheck, Mic, Star, AlertCircle, Upload, X, ExternalLink,
  Play, Pause, Volume2, VolumeX, Check, Calendar
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, setDoc, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { QUIZ_DATA as LECTURE_QUIZ_DATA } from './LectureQuizScreen';
import './CounselorLMS.css';

// ─── Certification Structure (from spec) ─────────────────────────────────────

const LEVELS = [
  {
    id: 'basic',
    level: 'Level 1',
    name: '기초 과정',
    badge: 'BASIC',
    color: '#38BDF8',
    totalHours: 24,
    sessionTarget: 0,
    sessionNote: null,
    modules: [
      {
        id: 'm1', title: '스포츠 심리 및 IZOF 이론 기초', hours: 12,
        desc: 'IZOF 이론 · 심리적 최적 수행 · 각성 조절 기법 · 집중력 훈련',
        hoursCompleted: 12,
      },
      {
        id: 'm2', title: '터플리 핵심 심리도구 실습', hours: 8,
        desc: '자기효능감 · 셀프토크 구조 · 이미저리 훈련 · 루틴 개발',
        hoursCompleted: 8,
      },
      {
        id: 'm3', title: '심리 측정 도구 해석', hours: 4,
        desc: 'TOPS 검사 · 정신력 검사 · 결과 해석 방법론',
        hoursCompleted: 0,
      },
    ],
    assessments: [
      { title: '기초 이론 필기 테스트', type: '필기', typeColor: '#38BDF8', done: false, note: '10문항 + 구술 2문항' },
      { title: '심리도구 실기 평가', type: '실기', typeColor: '#6366F1', done: false, note: '실습형' },
    ],
    upgradeTrigger: '24시간 교육 수료 완료 + 필기/실기 내부 테스트 합격 시 Level 2 활성화',
    kasp: {
      grade: '3급',
      fullName: '한국스포츠심리학회 스포츠심리상담사 3급',
      effect: '24시간 기초 교육 이수 처리 · 플랫폼 내 기본 상담사 프로필 즉시 활성화',
    },
  },
  {
    id: 'advanced',
    level: 'Level 2',
    name: '심화 과정',
    badge: 'ADVANCED',
    color: '#6366F1',
    totalHours: 8,
    sessionTarget: 10,
    sessionNote: '단독 상담 및 수퍼비전 상담 모두 1건으로 인정',
    modules: [
      {
        id: 'm4', title: '스포츠 종목별 특화 심리 솔루션', hours: 4,
        desc: '골프 · 축구 · 야구 · 농구 등 종목별 특화 심리 접근법',
        hoursCompleted: 0,
      },
      {
        id: 'm5', title: '실전 우승 및 슬럼프 극복 케이스 스터디', hours: 4,
        desc: '실제 현장 사례 분석 · 위기 개입 전략 · 솔루션 워크숍',
        hoursCompleted: 0,
      },
    ],
    assessments: [
      { title: '상담 일지 10건 제출', type: '경력', typeColor: '#10B981', done: false, note: '수퍼비전 포함 인정', isSubmitType: true },
    ],
    upgradeTrigger: '8시간 세미나 수료 + 상담 일지 10건 제출 완료 시 Advanced 등급 부여',
    kasp: {
      grade: '2급',
      fullName: '한국스포츠심리학회 스포츠심리상담사 2급',
      effect: '필수 상담 경력 10건 선 인정 · Advanced 레벨 자동 승급',
    },
  },
  {
    id: 'expert',
    level: 'Level 3',
    name: '마스터 과정',
    badge: 'EXPERT',
    color: '#F59E0B',
    totalHours: 4,
    sessionTarget: 30,
    sessionNote: '프로스포츠 레퍼런스 등록 시 60건 이상 기준 적용',
    modules: [
      {
        id: 'm6', title: '고급 스포츠 심리 수퍼비전 기법', hours: 4,
        desc: '하위 코치 상담 사례 지도법 · 수퍼비전 프레임워크 · 전문가 커뮤니티',
        hoursCompleted: 0,
      },
    ],
    assessments: [
      {
        title: '프로스포츠 레퍼런스 서류 검증', type: '서류', typeColor: '#F59E0B', done: false,
        note: 'K리그 · KBO · KBL · KPGA 등 1시즌 이상 전담 케어',
      },
      { title: '마스터 위원단 면접 (인터뷰)', type: '면접', typeColor: '#FB7185', done: false, note: '위원단 합격 필수' },
    ],
    upgradeTrigger: '4시간 클래스 수료 + 상담 경력 30건 + 프로 레퍼런스 서류 검증 + 마스터 면접 합격',
    kasp: {
      grade: '1급',
      fullName: '한국스포츠심리학회 스포츠심리상담사 1급',
      effect: '누적 상담 경력 면제 · 최고 등급 마스터 면접 스케줄러 즉시 오픈',
    },
  },
];

// ─── Lectures Structure ────────────────────────────────────────────────────────

// desc: 목록 화면에 보이는 한 줄 요약. body: '본문 보기' 확장 시 노출되는 강의 본문(단락 배열).
// keyTerms: 자격 시험 대비 핵심 키워드. 김병준, 《강심장 트레이닝》(개정판, 중앙books) 및 KASP 표준
// 커리큘럼(IZOF·TOPS 등 학술 이론)을 근거로 구성.
const LECTURES = {
  m1: [
    {
      id: 'L1', title: '스포츠 심리학의 개념 및 IZOF 개요', hours: 2,
      desc: '스포츠 심리학 기초 및 최적 수행(IZOF) 모델 소개',
      video: { youtubeId: 'JGVhqR3xNHw' },
      body: [
        '불안은 무조건 나쁜 것이 아니다. 1970년대 북미 스포츠심리학자들이 올림픽 메달리스트와 노메달리스트를 비교 연구한 결과, 두 집단의 기술·체력 수준은 엇비슷했지만 결정적 차이는 "불안을 어떻게 해석했는가"였다. 메달리스트는 불안을 경기력에 도움이 되는 방향으로 활용했고, 노메달리스트는 불안을 자신에 대한 의심과 패배 이미지로 연결시켰다. 이렇게 불안을 수행에 방해가 되는 쪽으로 해석하는 것을 방해불안(debilitative anxiety), 긍정의 에너지로 활용하는 것을 촉진불안(facilitative anxiety)이라 한다. 중요한 것은 불안의 강도(얼마나 느끼는가)가 아니라 해석(어떻게 받아들이는가)이다. 실제로 실력이 뛰어난 선수일수록 같은 불안 증상을 더 긍정적으로 해석하는 경향이 관찰된다.',
        '불안은 인지불안(cognitive anxiety, 근심·걱정·우려 같은 머릿속 불안)과 신체불안(somatic anxiety, 심박수 증가·근육 경직·손에 땀 등 신체 증상)으로 구분된다. 인지불안은 대체로 수행에 나쁜 영향을 주지만, 적당한 신체불안은 오히려 수행에 도움이 될 수 있다. 상담 현장에서는 상담 대상자가 느끼는 불안이 어느 유형에 가까운지, 그리고 그것을 어떻게 해석하고 있는지를 먼저 구분해서 접근해야 한다.',
        'IZOF(Individual Zones of Optimal Functioning, 개인별 최적 수행 존) 이론은 핀란드 스포츠심리학자 유리 하닌(Yuri Hanin)이 제안한 모델로, 선수마다 최고의 기량을 이끄는 감정 상태가 다르다는 것이 핵심이다. 어떤 선수는 약간 긴장되고 흥분될 때, 어떤 선수는 아주 침착하고 이완된 상태에서 최고 수행을 낸다. 이 존(zone)은 긍정적 감정뿐 아니라 부정적으로 보이는 감정(예: 약간의 긴장)까지 포함할 수 있다는 점이 실무적으로 중요하다 — 상담사는 "선수를 무조건 이완시키는 것"이 아니라, 그 선수만의 최적 감정 상태가 무엇인지부터 파악해야 한다. 실전 진단 방법은 과거 최고 수행이 나왔던 순간을 회상시켜, 그때의 에너지 수준과 감정 상태를 구체적으로 기록하고, 어떻게 그 상태에 도달했는지 역으로 분석하는 것이다.',
      ],
      keyTerms: ['방해불안', '촉진불안', '인지불안', '신체불안', 'IZOF(개인별 최적 수행 존)', '유리 하닌'],
    },
    {
      id: 'L2', title: '최적수행 감정 프로파일(IZOF) 실전 분석', hours: 2,
      desc: '개인별 감정 상태 프로파일 분석과 적용 사례',
      video: { youtubeId: 'uepUngEM53o' },
      body: [
        '불안에는 개인차가 존재한다. 같은 압박 상황에서도 심장 박동·호흡이 빨라지는 사람, 속이 거북해지는 사람, 소변이 자주 마려운 사람, 손발이 떨리는 사람, 앞이 캄캄해지는 사람 등 신체 반응 양상이 제각각이다. 흥미로운 점은 불안 상황에서 하품을 하는 선수도 많다는 것이다 — 골프 마지막 홀에서 우승을 앞두고 하품을 한 선수를 두고 해설자가 "정신력이 대단하다, 여유를 보인다"고 평했지만, 사실 하품 역시 불안 반응의 하나일 수 있다. 상담사는 상담 대상자의 개인차를 성급히 일반화하지 말고, 본인이 압박 상황에서 실제로 보이는 신체·인지 반응 목록을 먼저 함께 정리하는 것에서 시작해야 한다.',
        '실전 프로파일링은 체크리스트로 보완한다. ①불안의 강도(앞둔 일에 신경이 쓰인다/잘 못할까봐 걱정된다/목표 달성 실패 걱정/초조함/신체 예민/긴장, 각 1~4점)와 ②같은 항목에 대한 해석(같은 증상이 방해가 되는지 도움이 되는지, -3~+3점)을 함께 측정한다. 강도가 높아도 해석 점수가 플러스라면 이미 불안을 긍정 에너지로 쓰고 있는 상태이고, 마이너스라면 그 지점이 개입 포인트가 된다. 이 체크는 절대적 진단 도구가 아니라 현재 상태를 점검하는 참고 지표로 활용한다.',
        '실전 개입은 네 방향으로 정리된다. (1) 불안 증상 자체를 긍정적으로 재해석하게 한다(호흡이 가빠짐 → 활력이 충전됨, 몸이 굳음 → 기민함이 좋아짐). (2) 초조·공포를 분투·끈기의 긍정적 느낌으로 바꾸어 부른다. (3) 불안을 완전히 없애려 하지 않고 "즐길 수 있어야" 함을 인정시킨다 — 어느 정도 불안해야 제 실력이 나온다. (4) 불안의 유효기간을 설정한다(시합 전후 몇 시간, 발표 전후 몇 분 등)해서, 그 기간에는 회피하지 않고 적극적으로 마주하도록 계획을 세운다.',
      ],
      keyTerms: ['불안의 강도·해석 체크리스트', '개인차', '불안의 유효기간 설정'],
    },
    {
      id: 'L3', title: '운동 각성 조절 기법', hours: 2,
      desc: '심박수 및 근긴장도 조절을 통한 각성 수준 안정화',
      video: { youtubeId: 'tK6dqtfYLqU', start: 9 },
      body: [
        '각성(arousal)은 몸이 전반적으로 얼마나 활성화돼 있는가를 뜻한다. 가장 낮은 수준은 깊은 잠, 가장 높은 수준은 패닉 상태다. 불안이 성립되려면 일정 수준 이상의 각성이 필요하며, 각성이 아주 낮은 상태에서는 불안도 성립되기 어렵다. 각성이 높아질수록 주의 집중의 폭은 점차 좁아지는데, 적당히 좁아지면 불필요한 정보를 걸러내고 필요한 정보에만 집중하는 최적 상태가 되지만, 지나치게 좁아지면 정작 중요한 정보(신호, 상대 움직임)까지 놓쳐 실수로 이어진다. 반대로 각성이 지나치게 낮으면 집중 폭이 과도하게 넓어져 불필요한 자극까지 처리하느라 산만해진다.',
        '중요한 것은 최적의 각성 수준이 종목과 상황마다 다르다는 점이다. 정확성을 요구하는 양궁은 각성 수준을 낮게 유지해야 하지만, 순간적으로 최대 파워를 내야 하는 역도는 반대로 각성을 최대한 끌어올려야 한다. 한 종목 안에서도 상황에 따라 달라진다 — 농구는 패스할 때는 낮게, 리바운드를 다툴 때는 높게, 야구는 도루할 때는 최대로, 투수는 오히려 낮게 유지해야 제구가 흔들리지 않는다. 스키와 사격이 결합된 바이애슬론은 이 전환 자체가 핵심 기술이다 — 질주할 때는 각성을 최대로 끌어올리고, 사격 직전 순식간에 낮춰 침착함을 되찾아야 한다. 상담사는 상담 대상자의 종목·포지션·상황별로 요구되는 각성 수준이 다르다는 것을 전제로 개입을 설계해야 한다.',
        '과각성 상태(지나친 긴장·흥분)에는 이완 기법을 처방한다. 실전에서 자주 쓰이는 방법은 신체적 이완이다 — 배구 선수가 서브 직전 양팔을 크게 벌리고 가슴을 내밀며 심호흡하는 동작이 대표적인데, 이는 팔과 어깨의 긴장을 낮추고 몸 전체의 에너지 수준을 조절하는 효과가 있다. 조금 더 체계적인 방법은 점진적 근이완법(PMR)으로, 몸의 각 부위를 순서대로 힘껏 긴장시켰다가 한 번에 풀어주어 긴장과 이완의 차이를 몸이 스스로 익히게 하는 훈련이다. 신체적 방법은 불안의 원인을 근본적으로 해결하기보다 증상을 일시적으로 낮추는 대증요법에 가깝지만, 시합 직전처럼 긴박한 상황에서는 가장 즉각적이고 실전적인 개입이다.',
        '저각성 상태(무기력·집중력 저하)에는 활성화 기법을 처방한다. 대표적인 방법은 파워 포즈(가슴을 펴고 당당한 자세를 잠깐 취하는 것)와 짧고 강렬한 활성화 루틴이다 — 역도 선수가 시합 직전 코치와 하이파이브를 하거나 볼을 맞으며 순식간에 에너지 수준을 끌어올리는 행동이 그 예다. 상담사는 상담 대상자의 관찰 포인트(과각성: 손에 땀, 목소리 떨림, 빠른 심박 / 저각성: 하품, 무기력한 표정, 불안정한 시선)를 미리 익혀두고, 시합 전 짧은 관찰만으로 어느 쪽 개입이 필요한지 빠르게 판단할 수 있어야 한다.',
      ],
      keyTerms: ['각성(arousal)', '과각성/저각성', '종목별 최적 각성 수준', '점진적 근이완법(PMR)', '파워 포즈', '활성화 루틴'],
    },
    {
      id: 'L4', title: '스포츠 심상의 기초와 현장 실습', hours: 2,
      desc: '시각, 청각, 운동감각을 동원한 심상 훈련 모델',
      video: { youtubeId: 'dO6AlPEIubM' },
      body: [
        '심상 훈련(Imagery Training)은 마음속으로 특정 동작·상황을 생생하게 그려보는 기법으로, 심리신경근 이론(마음속으로 동작을 떠올리면 실제 동작을 하지 않아도 신경·근육이 실제와 유사하게 미세 반응한다는 이론)이 과학적 근거다. 관점에 따라 내적 심상(자신의 시점, 이마에 카메라를 단 것처럼 1인칭으로 느끼는 방식 — 운동감각을 생생히 느끼는 데 효과적)과 외적 심상(3인칭 관찰자 시점, 비디오를 보듯 동작의 전체 흐름·자세를 객관적으로 파악하는 데 유용)으로 나뉜다.',
        '가장 효과적인 형태는 3D 멀티감각 심상이다. 시각뿐 아니라 청각(공 맞는 소리, 관중 소음), 후각(잔디·수영장 냄새), 촉각(그립을 잡는 느낌), 운동감각(몸의 회전과 속도감)까지 통합해 상상할수록 신경계의 반응이 실제 수행에 가까워진다. 활용 상황도 세분화된다 — 동작 전 성공 장면을 미리 그리는 준비 심상, 동작 직후 성공 장면을 다시 떠올리는 리플레이 심상, 실수 직후 그 실수를 성공으로 바꾸는 장면을 상상하는 실수 극복 심상이 대표적이다.',
        '현장 실습은 짧고 구체적인 루틴으로 설계한다. 자유투·퍼팅·프리킥처럼 동작 직전 몇 초의 여유가 있는 상황에서, 성공 장면을 3D 멀티감각으로 그려보는 습관을 들이는 훈련부터 시작한다. 상담사는 상담 대상자에게 "무엇이 보이고, 무엇이 들리고, 몸에 어떤 느낌이 드는지"를 구체적인 언어로 묘사하게 함으로써 심상의 생생함(vividness)을 점검하고 단계적으로 훈련 강도를 높인다.',
      ],
      keyTerms: ['심리신경근 이론', '내적 심상', '외적 심상', '3D 멀티감각 심상', '준비 심상·리플레이 심상·실수 극복 심상'],
    },
    {
      id: 'L5', title: '스포츠 수행 집중력 향상 전략', hours: 2,
      desc: '주의집중 조절법과 경기 중 집중에 방해되는 자극 제어',
      body: [
        '인간의 집중 능력에는 명확한 한계가 있다. 뇌는 여러 일에 동시에 완전히 집중하는 멀티태스킹이 근본적으로 어렵고, 집중 용량은 제한적이며 선택적으로 작동하고, 각성 수준과 밀접하게 연결돼 있다. 집중을 흐트러뜨리는 대표적 원인은 통제 불가능한 것에 마음을 쓰는 것이다 — 심판 판정, 상대의 좋은 플레이, 관중의 함성·야유, 날씨, 지나간 실수, 대진표 같은 것들은 아무리 신경 써도 바뀌지 않는다. 통제 가능한 것(체력 관리, 플레이에 집중하기, 긍정적 자기암시, 시합 전 준비 루틴, 자신의 감정 조절, 동료와의 커뮤니케이션)에 에너지를 재배치하는 것이 집중력 훈련의 핵심 원리다.',
        '실전 개입은 "그만, 통제 밖에 있는 것이다. 잊자"처럼 짧고 즉각적인 자기 신호로 시작한다. 통제 가능/불가능을 순간적으로 구분하는 훈련을 반복하면, 실수 이후에도 감정에 압도되지 않고 다음 플레이로 빠르게 전환하는 재집중(refocusing) 능력이 길러진다. 특히 "하나의 일에 마음을 두 갈래로 쓰지 말라"는 원칙 아래, 지금 이 순간 통제 가능한 단 하나의 행동(다음 스텝, 시선 처리, 호흡)에 온전히 집중하도록 좁혀주는 것이 실전에서 가장 즉각적인 효과를 낸다.',
      ],
      keyTerms: ['통제 가능성 구분', '재집중(refocusing)', '주의 폭'],
    },
    {
      id: 'L6', title: '인지 재구성을 통한 시합 불안 극복', hours: 2,
      desc: '합리적 인지 형성 및 시합 전 불안 감소 기법',
      body: [
        '불안을 극복하는 방식에는 뚜렷한 개인차가 있다. 실무에서 관찰되는 대표 유형은 다음과 같다 — 릴랙스형(몸 상태를 먼저 안정시켜야 풀리는 유형), 루틴 실천형(정해둔 준비 루틴을 철저히 지켜 불안에 마음을 빼앗기지 않는 유형), 초월형(절대적 힘을 가진 존재나 부모님을 떠올리며 결과를 맡기는 유형), 견주기형(상대도 나만큼 불안하다고 여기며 대등한 입장을 확인하는 유형), 자기암시형(시합 직전 "할 수 있어" 식의 자기암시로 다스리는 유형), 선제공격형(먼저 움직여 몸의 긴장을 감각 상승으로 전환하는 유형), 토킹형(동료와의 대화로 불안의 흐름을 끊는 유형), 멘탈 리허설형(시합 전 이미지로 미리 체험하는 유형), 격려·믿음형(리더·동료의 격려를 힘으로 삼는 유형). 상담사는 상담 대상자에게 맞는 유형을 함께 찾아 자신만의 불안 극복 스타일을 명료화해주는 것에서 개입을 시작한다.',
        '부정적 인지(자기암시)를 다루는 실전 기법이 ASDR 논박법이다. ①Aware(자각): 자신이 부정적 자기암시("실수한 거 보니 오늘 망칠 것 같다" 등)를 하고 있음을 알아차린다. 부정적 자기암시는 본인이 자각하지 못한 채 튀어나오는 경우가 많으므로, "앗, 나쁜 말을 하는구나"라고 즉시 알아채는 연습이 먼저다. ②Stop(정지): "그만!"이라고 소리치거나, 손으로 볼을 때리거나, 고개를 흔들거나, 빨간 신호등을 떠올리는 등 물리적·시각적 신호로 흐름을 끊는다. 부정적 자기암시는 초기에 정지시키느냐 여부가 관건이다. ③Dispute(논박): 그 생각의 불합리성을 논리적으로 반박한다("하나의 실수일 뿐이다, 이미 지나간 일이다"). ④Replace(대체): 긍정적 생각으로 바꾼다("결과는 신에게 맡기고 준비한 대로만 한다"). 특히 자기 비난형("이 바보야!")과 부정 예측형("또 실패하는 거 아니야?") 자기암시는 즉시 개입이 필요한 위험 신호로 취급한다.',
      ],
      keyTerms: ['불안 극복 스타일(9유형)', 'ASDR 논박법(자각-정지-논박-대체)', '자기 비난형', '부정 예측형'],
    },
  ],
  m2: [
    {
      id: 'L7', title: '운동 자기효능감 구축 방법론', hours: 2,
      desc: '수행 완수, 대리 경험, 언어적 설득을 통한 효능감 증진',
      body: [
        '성공을 규정하는 기준은 사람마다 다르며, 이는 노력성향(task orientation)과 과시성향(ego orientation)이라는 두 축으로 정리된다. 노력성향은 자기 자신을 비교 기준으로 삼는다 — 얼마나 열심히 노력했고 실력이 향상됐는지가 성공의 척도이며, 지더라도 내용이 좋았다면 성공한 경기로 받아들인다. 과시성향은 타인과의 비교를 기준으로 삼는다 — 남보다 잘했는지가 성공의 척도이며, 내용과 무관하게 이기면 성공, 지면 실패로 규정한다. 두 성향은 배타적이지 않고 개인마다 각각 어느 정도씩 존재한다.',
        '노력성향이 높을수록 자기효능감 구축에 유리한 특성이 나타난다. 실패에도 돌보이는 끈기(자기 자신과 비교하므로 패배해도 쉽게 좌절하지 않는다), 적당히 어려운 상대·과제를 스스로 선택하는 경향(실패를 두려워하지 않는다), 과정 자체에서 재미·흥미를 더 느끼는 경향, "노력하면 반드시 나아진다"는 믿음이 그것이다. 반대로 과시성향이 지나치게 높으면 이길 수 있는 쉬운 상대만 고르거나, 질 것 같으면 쉽게 포기하거나, 실패를 남 탓·상황 탓으로 돌리는 경향이 강해져 장기적인 효능감 형성에 불리하다. 노력성향과 과시성향의 비율이 극단적으로 치우치지 않고 조화를 이루는 것이 이상적이며, 상담사는 과시성향이 지배적인 상담 대상자에게는 "경쟁은 남이 아니라 자신과 하는 것"이라는 관점 전환을 반복적으로 제시해 노력성향의 비중을 높이는 방향으로 개입한다.',
        '효능감은 반두라(Bandura)의 4가지 원천 — 수행 성취 경험(직접 성공해본 경험이 가장 강력한 원천), 대리 경험(비슷한 수준의 타인이 성공하는 모습을 관찰), 언어적 설득(지도자·동료의 격려와 구체적 피드백), 정서적·생리적 상태(불안·각성을 어떻게 해석하는가) — 로 구축된다. 상담 현장에서는 이 네 원천을 각각 어떻게 상담 대상자의 훈련 계획에 의도적으로 배치할 것인지 설계하는 것이 실무 역량이다.',
      ],
      keyTerms: ['노력성향(task orientation)', '과시성향(ego orientation)', '반두라 자기효능감 4원천'],
    },
    {
      id: 'L8', title: '셀프토크(Self-Talk) 유형과 스포츠 적용', hours: 2,
      desc: '긍정적 셀프토크 구조화 및 인지적 전략 수립',
      body: [
        '자기암시(셀프토크)는 성장 과정에서 내면화된 대화법이다. 아이 때는 부모의 긍정 피드백을 자주 받아 그 말을 쉽게 내면화하지만, 성인이 될수록 부정적 자기암시의 빈도가 높아지는 경향이 있다. 부정적 자기암시는 개인이 갖고 있는 신념이기 때문에 자신감을 현저히 떨어뜨리고 집중력·의욕을 낮춘다 — 무엇보다 "온전히 믿을 수 있는 것은 자기 자신뿐인데, 그 자신을 스스로 부정적으로 속단하는" 자기모순적 구조라는 점이 문제다. 게다가 부정적 자기암시가 실제로 실현되면 "역시 내 예측이 맞았다"는 확신이 강화되어 악순환에 빠지기 쉽다.',
        '좋은 자기암시의 조건은 구체적이고 긍정적이며 의미를 담고 있어야 하고, 1인칭 현재형 표현("나는 할 수 있다", "지금 집중한다")일수록 실제 순간에 효과적이다. 실전에서는 상황별로 자기암시를 미리 준비해둔다 — 시합 직전("한 번 해보자", "평소대로 침착하게"), 강한 상대일 때("오늘 다 보여준다", "상대를 지치게 만든다"), 지고 있을 때("기회는 온다", "끝까지 물고 늘어진다"), 막상막할 때("한 번에 하나씩만 하자"), 패했을 때("잘못한 상황을 더 연습하자", "집중력 부족이라 생각하자")처럼 When별 스크립트를 미리 만들어두면 실전에서 감정에 압도되지 않고 즉시 꺼내 쓸 수 있다.',
        '자기암시는 팀 단위로도 교정 가능하다. 한 프로축구팀 수비수들의 자기암시를 분석했더니 대부분이 "골 먹지 말자", "실수하지 말자"처럼 회피형(부정형) 표현을 쓰고 있었고, 실제로 실점 시 위축되어 공을 피하는 행동으로 이어졌다. 이를 "안전 수비, 빠른 역습", "내 발끝에서 공격 시작"처럼 접근형(긍정·행동지향형) 표현으로 교체하자 집중력과 자신감, 실제 역습 성공률까지 개선되었다. 이는 자기암시 교정이 추상적 동기부여가 아니라 관찰 가능한 행동 지표(경기 데이터)로 검증 가능한 개입이라는 점을 보여주는 실전 사례다.',
      ],
      keyTerms: ['긍정/부정 자기암시', '1인칭 현재형 자기암시', 'When별 자기암시 스크립트', '회피형/접근형 표현'],
    },
    {
      id: 'L9', title: '이미저리 훈련 프로그램 설계', hours: 2,
      desc: '선수 개별 맞춤형 이미저리 시간/내용 설계 및 훈련',
      body: [
        'L4에서 다룬 심상(이미저리)의 원리를 실제 개인별 훈련 프로그램으로 설계하는 단계다. 프로그램 설계는 (1) 대상자의 우세 감각(시각형/청각형/운동감각형 중 무엇을 더 생생하게 느끼는지) 진단, (2) 내적/외적 심상 중 무엇이 더 효과적인지 시험, (3) 준비 심상·리플레이 심상·실수 극복 심상을 훈련 일정과 시합 일정에 각각 배치, (4) 회당 시간(보통 5~10분 내외로 짧고 자주)과 빈도를 정하는 순서로 진행한다.',
        '실전 설계 시 흔한 실수는 심상 훈련을 "시합 직전 한 번만" 하는 것으로 오해하는 것이다. 효과적인 이미저리는 평소 훈련이 끝난 뒤 짧게 반복해 습관화하는 것이 핵심이며, 실제 시합과 유사한 압박감·감각을 함께 상상하는 멘탈 리허설(mental rehearsal) 형태로 확장할 수 있다. 멘탈 리허설은 상대의 장단점을 분석하고, 자신의 몸 컨디션을 함께 상상 속에 반영하며, 실제 시합 과정을 감각적으로 미리 체험하는 심리적 준비 과정으로, 단순 이미지 트레이닝보다 한 단계 더 실전에 밀착된 형태다.',
      ],
      keyTerms: ['심상 우세 감각 진단', '멘탈 리허설(mental rehearsal)', '이미저리 훈련 주기 설계'],
    },
    {
      id: 'L10', title: '시합 루틴 및 훈련 루틴 세부 설계', hours: 2,
      desc: '최적 수행을 유도하는 시합 전/중/후의 행동 루틴 설계',
      body: [
        '루틴(routine)은 습관적으로 하는 일정한 행동 절차다. 루틴 설계는 반드시 통제 가능성 구분에서 출발한다 — 통제 가능한 영역(체력 관리, 플레이에 집중하기, 긍정적 자기암시, 시합 전 준비 루틴 실천, 최적의 컨디션 조절, 동작·기술 수행, 동료와의 커뮤니케이션, 자신의 감정 조절, 긴장 풀기, 전략 이미지 트레이닝, 자신의 표정)과 통제 불가능한 영역(부상, 날씨, 심판의 오심, 상대의 좋은 플레이, 팬들의 함성·악플, 불규칙 바운드, 지나간 실수, 감독의 결정, 대진표, 청중의 표정)을 명확히 나눈 뒤, 통제 가능한 요소만으로 루틴을 구성한다. 통제 불가능한 것을 신경 쓰는 것은 "길가의 돌멩이"에 신경 쓰는 것과 같다는 비유를 상담 대상자에게 직접 전달하면 이해가 빠르다.',
        '루틴은 크기에 따라 미니 루틴(한 동작 직전의 짧은 절차 — 서브 전 공을 튀기는 횟수, 킥 전 호흡 등)과 매크로 루틴(시합 당일 아침 기상부터 시합 시작까지의 전체 일과)으로 나뉜다. 좋은 루틴의 조건은 (1) 최적 조건을 항상 일정하게 재현하는 것, (2) 실수 이후 다음 동작으로 빠르게 전환하도록 돕는 실수 극복 루틴을 포함하는 것, (3) 나쁜 말·악플처럼 통제 밖의 자극에 흔들리지 않도록 방패 역할을 하는 것이다. 특히 루틴 실천형 불안 극복 스타일(L6 참고)을 가진 상담 대상자에게는, 루틴을 철저히 지키는 것 자체가 불안 관리 전략이 된다는 점을 강조한다.',
        '설계 실습은 상담 대상자의 종목·포지션에 맞춰 미니 루틴 1개, 매크로 루틴 1개를 함께 작성해보는 것으로 진행한다. 작성 후에는 "이 루틴의 각 단계가 정말 내가 통제할 수 있는 것인가"를 하나씩 재검증하고, 통제 불가능한 요소(예: "관중이 조용해질 때까지 기다린다")가 섞여 있다면 통제 가능한 대체 행동으로 교체한다.',
      ],
      keyTerms: ['통제 가능/불가능 구분표', '미니 루틴·매크로 루틴', '실수 극복 루틴'],
    },
  ],
  m3: [
    {
      id: 'L11', title: 'TOPS(Test of Performance Strategies) 척도 분석', hours: 2,
      desc: '연습 및 경기 상황의 8가지 심리적 요인 측정법',
      body: [
        'TOPS는 연습 상황과 경기 상황에서 선수가 실제로 사용하는 심리 기술 전략을 측정하는 표준화 검사다. 목표 설정, 자동화, 이완, 활성화, 심상, 자기암시, 부정적 사고 조절, 주의 집중 등 앞선 모듈(L1~L10)에서 다룬 개별 기법들이 실제로 얼마나, 어떤 상황에서 사용되고 있는지를 계량적으로 확인하는 도구라는 점에서, L1~L10의 실습 내용과 TOPS 문항을 서로 짝지어 이해하면 검사 해석이 훨씬 정교해진다.',
        '연습 상황 점수와 경기 상황 점수를 비교하는 것이 실전 해석의 핵심이다. 연습에서는 특정 기법(예: 이완, 심상)을 잘 쓰지만 경기 상황 점수가 크게 떨어진다면, 그 선수는 "알고는 있지만 실전에서 꺼내 쓰지 못하는" 상태로 진단할 수 있다. 이 경우 개입의 초점은 새로운 기법을 가르치는 것이 아니라, 이미 알고 있는 기법을 실전과 유사한 압박 상황에서 반복 적용하는 훈련(가혹조건 훈련, L15 참고)에 맞춰야 한다.',
      ],
      keyTerms: ['TOPS(수행 전략 검사)', '연습-경기 상황 점수 비교'],
    },
    {
      id: 'L12', title: '스포츠 심리 측정 해석 및 상담 현장 적용', hours: 2,
      desc: '결과 프로파일 분석을 통한 개인 맞춤 솔루션 수립',
      body: [
        '검사 결과는 그 자체로 상담이 아니라 상담의 출발점이다. TOPS를 비롯한 심리검사 프로파일을 해석할 때는 낮은 점수 항목을 나열하는 것에 그치지 않고, 그 항목이 L1~L10에서 다룬 어떤 구체적 기법과 연결되는지 매핑한 뒤, 상담 대상자가 실제로 실행 가능한 1~2개의 다음 단계로 좁혀 제시해야 한다. 예를 들어 "부정적 사고 조절" 점수가 낮다면 ASDR 논박법(L6)을, "주의 집중" 점수가 낮다면 통제 가능성 구분과 재집중 훈련(L5)을 다음 단계로 연결한다.',
        '상담 현장에서는 검사 결과를 상담 대상자에게 그대로 통보하지 않는다. 특히 낮은 점수를 "약점"으로만 전달하면 부정적 자기암시(L8)를 유발할 위험이 있으므로, "현재 어떤 전략을 더 훈련하면 좋을지 알려주는 지도"라는 프레임으로 전달하는 것이 원칙이다.',
      ],
      keyTerms: ['검사-개입 매핑', '결과 전달 프레이밍'],
    },
  ],
  m4: [
    {
      id: 'L13', title: '축구/풋살 실전 심리 전략', hours: 2,
      desc: '축구 및 풋살 종목의 실전 경기력 극대화를 위한 전술 심리',
      body: [
        '팀 스포츠는 개인 종목과 달리 동료·선후배 관계에서 오는 심리적 부담이 경기력에 직접 영향을 준다. 실제 사례로, 한 프로배구팀의 막내 세터가 세팅 실패 시 선배 공격수들의 은밀한 부정적 반응(관중·벤치는 알아채지 못하는 미묘한 표정·행동)을 반복적으로 겪으며 위축된 경우가 있었다. 상담 개입은 "그 나쁜 반응은 나에 대한 것이 아니라, 자존심을 보호하려는 선배 자신에 관한 것"이라는 관점으로 재해석하게 하는 것이었고, 이후 세터는 집중력을 회복했다. 이는 축구·풋살처럼 포지션 간 상호의존이 강한 종목에서도 동일하게 적용된다 — 실점 이후 동료의 부정적 반응에 위축되는 수비수·골키퍼에게는 같은 방식의 재해석 개입이 유효하다.',
        '자기암시 교정도 팀 단위로 이뤄질 수 있다(L8의 프로축구 수비수 사례 참고) — "골 먹지 말자"식 회피형 자기암시를 "안전 수비, 빠른 역습"같은 접근형·행동지향형 표현으로 바꾸는 것만으로 집중력과 실제 역습 전환 성공률이 개선된 사례가 있다. 축구·풋살 상담에서는 포지션별로 이런 회피형 자기암시 패턴을 사전에 점검하고, 실전 국면(리드 중/추격 중/막상막한 상황)별 접근형 자기암시 스크립트를 팀 전체에 표준화해 배포하는 것이 실무적으로 효과적이다.',
      ],
      keyTerms: ['팀 스포츠 동료 압박', '포지션별 자기암시 스크립트'],
    },
    {
      id: 'L14', title: '골프/양궁 표적 종목 루틴 제어', hours: 2,
      desc: '표적 종목의 심박수 조절 및 고도의 집중 상태 조절',
      body: [
        '골프·양궁처럼 정지 동작에서 고도의 정밀성을 요구하는 표적 종목은 각성 조절(L3)과 미니 루틴(L10)의 중요성이 가장 두드러지는 영역이다. 한국 양궁 국가대표의 사례처럼, 겉으로는 심리적으로 무장 해제된 듯 보여도 금메달이 결정되는 순간 손에 땀이 흥건한 경우가 많다 — 이는 불안이 없는 것이 아니라, 불안을 촉진불안(L1)으로 해석하고 다스리는 자신만의 미니 루틴이 확고하기 때문이다.',
        '표적 종목 루틴 설계의 핵심은 일관성이다. 서브·킥과 달리 골프 스윙·양궁 발사는 완전히 정지된 상태에서 시작되므로, 셋업부터 발사까지의 모든 동작(호흡 타이밍, 조준 시간, 릴리스 신호)을 매번 동일한 순서·리듬으로 반복하는 미니 루틴이 곧 각성 수준을 매번 같은 지점으로 되돌리는 장치가 된다. 상담 개입에서는 상담 대상자의 현재 루틴을 초 단위로 기록하게 한 뒤, 컨디션이 좋았던 날과 나빴던 날의 루틴 소요 시간·순서를 비교해 어긋난 지점을 찾아내는 방식으로 진행한다.',
      ],
      keyTerms: ['표적 종목 각성 조절', '루틴의 일관성(초 단위 재현)'],
    },
  ],
  m5: [
    {
      id: 'L15', title: '메이저 대회 결승전 중압감 대처 사례', hours: 2,
      desc: '압박감이 극대화되는 결승전 상황에서의 멘탈 관리법',
      body: [
        '결승전급 압박은 평소 훈련(practice)과 질적으로 다른 실전(performance) 상황이다. 연습에서 아무리 잘하던 동작도 관중·순위·중계 카메라가 더해지는 순간 전혀 다른 심리적 부하가 걸린다 — 이것이 "연습의 함정"이다. 2004년 아테네 올림픽 400m 자유형에서 박태환 선수가 극심한 긴장으로 준비신호를 출발신호로 착각해 실격당한 사례가 대표적이다. 그는 이 실패를 계기로 4년간 자신만의 집중법(헤드폰으로 좋아하는 음악을 들으며 출발을 준비하는 방식)을 만들었고, 베이징 올림픽에서는 같은 상황에서 금메달을 목에 걸었다. 핵심은 "실전과 유사한 가혹조건에서 미리 훈련했는가"의 차이다.',
        '실전 대비 훈련은 평소 훈련 강도에 일부러 스트레스 요인을 추가하는 방식으로 설계한다 — 관중 소음을 틀어놓고 훈련하기, 심판 판정에 이의를 제기할 수 없는 조건 만들기, 시합처럼 단 한 번의 기회만 허용하는 시뮬레이션(예: 야구의 시뮬레이션 피칭 훈련 — 정해진 스코어·아웃카운트를 부여하고 그 상황에서만 실제 투구하듯 훈련) 등이다. 이런 가혹조건 훈련을 거친 선수는 실제 결승전에서 "이미 겪어본 상황"으로 받아들이기 때문에 압박감이 상대적으로 줄어든다.',
        '결승전 당일 개입은 L1~L10에서 다룬 기법의 통합 적용이다. 불안을 촉진불안으로 재해석(L1), 통제 가능한 것에만 집중(L5), 준비된 매크로·미니 루틴 그대로 실행(L10), 상황별로 미리 준비한 자기암시 스크립트 사용(L8)이 결승전이라고 해서 특별히 다른 것을 새로 시도하지 않고, 평소 훈련한 루틴을 "그대로" 실행하는 것이 원칙이다.',
      ],
      keyTerms: ['연습의 함정', '가혹조건 훈련', '시뮬레이션 훈련', '평소 루틴의 그대로 실행 원칙'],
    },
    {
      id: 'L16', title: '만성 슬럼프 선수의 동기유발 재건 워크숍', hours: 2,
      desc: '장기적 기량 저하를 겪는 선수의 내적 동기 강화 기법',
      body: [
        '슬럼프(slump)는 연습을 계속하는데도 오히려 실력이 떨어지는 현상이다. 실력이 제자리에 정체되는 수행 고원(performance plateau)과 달리, 슬럼프는 기술 변화·체력 저하·피로·의욕 상실 같은 심리적 원인으로 발생한다. 중요한 것은 슬럼프에는 반드시 원인이 존재하며, 그 원인이 해결되는 순간 실력이 완만하게가 아니라 급격하게(벼락같이) 상승하는 패턴을 보인다는 것이다 — 즉 슬럼프 기간에 투자한 노력은 사라지는 것이 아니라 원인 해결 시점까지 축적되어 있다가 한꺼번에 방출된다.',
        '실전 사례: 스윙에 변화를 주던 중 슬럼프에 빠진 프로골퍼는 "감이 사라졌다"며 좌절하다 "성공이 전혀 없다"는 부정적 자기암시로 화를 내는 상태까지 갔다. 개입은 세 단계로 진행됐다. 먼저 슬럼프의 원인을 "기술 적응 과정에서 나타나는 자연스러운 현상"으로 재정의해 실패를 규정하는 프레임을 바꿨다. 다음으로 "잘되는 것과 안 되는 것을 비교해 스키마를 만들어라 — 잘 안 되는 것도 나름의 역할을 한다"는 지침으로, 실수를 성공의 법칙(스키마)을 찾는 재료로 재해석하게 했다. 마지막으로 슬럼프 기간에 예정된 시합의 목표를 "새로운 기술의 테스트"로 합리적으로 바꿔 부담을 낮췄다. 2개월 뒤 이 선수는 슬럼프를 빠르게 벗어나 시즌 첫 우승을 달성했다.',
        '동기유발 재건 워크숍의 실무 절차는 (1) 지금 겪는 것이 슬럼프인지 단순 정체(수행 고원)인지 구분, (2) "슬럼프에는 반드시 원인이 있다"는 긍정적 세계관(L7의 긍정적 세계관 3요소 — 지속성·확장성·자기주도성 참고)을 상담 대상자에게 이해시키는 것, (3) 슬럼프 기간의 목표를 결과(순위·기록)에서 과정(기술 적응·원인 탐색)으로 전환하는 것, (4) 노력성향(L7)의 태도로 슬럼프 기간에도 훈련을 지속하도록 지지하는 것 순으로 진행한다.',
      ],
      keyTerms: ['슬럼프(slump)', '수행 고원(performance plateau)', '슬럼프 극복 그래프', '긍정적 세계관(지속성·확장성·자기주도성)'],
    },
  ],
  m6: [
    {
      id: 'L17', title: '동료 상담사 사례 지도(Supervision) 모델', hours: 2,
      desc: '후배 및 동료 상담사의 실제 상담 케이스 지도 노하우',
      body: [
        '수퍼비전(supervision)은 동료·후배 상담사가 진행한 실제 상담 사례를 함께 검토하며 개입의 타당성을 점검하고 성장을 돕는 과정이다. 좋은 수퍼비전은 결과(상담 대상자의 기록·순위가 좋아졌는가)만으로 평가하지 않고, 과정(어떤 이론적 근거로 어떤 개입을 선택했는가, L1~L16의 어떤 기법을 왜 그 순서로 적용했는가)을 함께 짚는다. 수퍼바이저는 지도받는 상담사가 스스로 판단 근거를 언어화하도록 질문하는 역할이지, 정답을 대신 제시하는 역할이 아니다.',
        '실무 체크리스트는 (1) 초기 진단이 정확했는가(불안 유형, IZOF 최적 존, TOPS 프로파일 등을 근거로 개입을 설계했는가), (2) 선택한 기법이 상담 대상자의 개인차(L2)를 고려했는가, (3) 개입 이후 재평가 지점을 두었는가, (4) 상담 대상자가 스스로 기법을 실전에서 재현할 수 있도록 훈련시켰는가(단발성 상담이 아닌 자립적 활용 능력 이전) 네 가지로 구성한다.',
      ],
      keyTerms: ['수퍼비전 체크리스트', '개입 근거의 언어화'],
    },
    {
      id: 'L18', title: '터플리 자격 심사 및 프로 레퍼런스 기준', hours: 2,
      desc: '최고 등급 자격 획득을 위한 서류 및 현장 평가 프레임워크',
      body: [
        '마스터(Level 3) 등급은 프로 스포츠 현장에서 최소 1시즌 이상 전담 케어한 레퍼런스를 서류로 검증받고, 마스터 위원단 면접을 통과해야 부여된다. 서류 검증에서 중요하게 보는 것은 단순 소속 증빙이 아니라, 실제로 어떤 이론적 틀(IZOF·TOPS·통제 가능성 구분 등)을 근거로 개입을 설계했고 어떤 변화가 관찰되었는지에 대한 구체적 기록이다.',
        '면접에서는 특정 사례를 제시하고 "이 선수에게 지금 어떤 개입을 하겠는가, 왜 그런가"를 즉석에서 답하게 하는 방식으로 진행된다. 이는 이론을 암기했는지가 아니라, L1~L17에서 다룬 이론·기법을 실전 상황에 즉시 연결해 적용할 수 있는지를 평가하기 위함이다. 평가 위원단은 특히 상담 대상자의 개인차를 무시한 획일적 처방(예: 모든 상담 대상자에게 같은 이완 기법만 적용)을 지양하고, 진단-개입-재평가의 순환 구조를 갖췄는지를 중점적으로 확인한다.',
      ],
      keyTerms: ['프로 레퍼런스 서류 검증', '마스터 위원단 면접 평가 기준'],
    },
  ],
};

// ─── Podcasts Structure ────────────────────────────────────────────────────────

const PODCASTS = {
  m1: {
    id: 'ep1',
    title: 'Episode 01 - 스포츠 심리학과 IZOF 이론 기초',
    file: '/assets/podcast_ep01_module1.wav',
    duration: '16:24'
  },
  m2: {
    id: 'ep2',
    title: 'Episode 02 - 터플리 핵심 심리도구 실습',
    file: '/assets/podcast_ep02_module2.wav',
    duration: '19:06'
  },
  m3: {
    id: 'ep3',
    title: 'Episode 03 - 심리 측정 도구 해석',
    file: '/assets/podcast_ep03_module3.wav',
    duration: '18:12'
  }
};

// ─── Podcast Player Component ──────────────────────────────────────────────────

function PodcastPlayer({ podcast, isCompleted, onToggle, color }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, [podcast]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.play().catch(err => console.log("Audio play error:", err));
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (!isCompleted) {
      onToggle();
      alert(`축하합니다! 팟캐스트 청취가 완료되었습니다!\n'${podcast.title}' 학습 이수가 기록되었습니다.`);
    }
  };

  const handleProgressClick = (e) => {
    if (!audioRef.current || duration === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const width = rect.width;
    const newTime = (clickX / width) * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSpeedChange = (rate) => {
    setPlaybackRate(rate);
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
  };

  const formatTime = (timeInSecs) => {
    if (isNaN(timeInSecs)) return '00:00';
    const minutes = Math.floor(timeInSecs / 60);
    const seconds = Math.floor(timeInSecs % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="podcast-player-card" style={{
      background: 'rgba(255, 255, 255, 0.02)',
      border: `1px solid ${isCompleted ? '#10B98130' : 'rgba(255,255,255,0.06)'}`,
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '16px',
      boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.3)',
      backdropFilter: 'blur(4px)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '4px',
        height: '100%',
        background: isCompleted ? '#10B981' : color,
      }} />

      <audio
        ref={audioRef}
        src={podcast.file}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '200px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <span style={{
              fontSize: '0.62rem',
              fontWeight: 800,
              color: isCompleted ? '#10B981' : color,
              background: isCompleted ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.05)',
              padding: '2px 6px',
              borderRadius: '4px',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <Mic size={11} /> 교육용 팟캐스트
            </span>
            {isCompleted && (
              <span style={{ fontSize: '0.68rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '2px', fontWeight: 600 }}>
                <Check size={12} /> 청취 완료
              </span>
            )}
            {isPlaying && (
              <div className="audio-wave-anim">
                <span className="wave-bar bar-1"></span>
                <span className="wave-bar bar-2"></span>
                <span className="wave-bar bar-3"></span>
                <span className="wave-bar bar-4"></span>
              </div>
            )}
          </div>
          <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white', margin: 0 }}>
            {podcast.title}
          </h4>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Speed selector */}
          <div className="playback-speed-selector" style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: '6px', padding: '2px', border: '1px solid rgba(255,255,255,0.08)' }}>
            {[1.0, 1.25, 1.5].map(rate => (
              <button
                key={rate}
                onClick={() => handleSpeedChange(rate)}
                style={{
                  padding: '2px 6px',
                  fontSize: '0.65rem',
                  border: 'none',
                  background: playbackRate === rate ? 'rgba(255,255,255,0.1)' : 'transparent',
                  color: playbackRate === rate ? '#fff' : 'rgba(255,255,255,0.4)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: playbackRate === rate ? 700 : 500
                }}
              >
                {rate}x
              </button>
            ))}
          </div>

          <button
            onClick={onToggle}
            style={{
              padding: '5px 10px',
              fontSize: '0.72rem',
              background: isCompleted ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)',
              border: `1px solid ${isCompleted ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.08)'}`,
              borderRadius: '6px',
              color: isCompleted ? '#10B981' : 'rgba(255,255,255,0.5)',
              cursor: 'pointer',
              fontWeight: 600,
              transition: 'all 0.2s'
            }}
          >
            {isCompleted ? '이수 완료 ✓' : '이수 완료로 표시'}
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
        <button
          onClick={togglePlay}
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: isCompleted ? 'rgba(16, 185, 129, 0.15)' : `${color}15`,
            border: `1px solid ${isCompleted ? '#10B98140' : color + '40'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: isCompleted ? '#10B981' : color,
            transition: 'all 0.2s',
            flexShrink: 0
          }}
        >
          {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" style={{ marginLeft: '2px' }} />}
        </button>

        <div style={{ flex: 1 }}>
          <div
            onClick={handleProgressClick}
            style={{
              height: '6px',
              background: 'rgba(255,255,255,0.06)',
              borderRadius: '3px',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              marginBottom: '6px'
            }}
          >
            <div style={{
              height: '100%',
              width: `${progressPercent}%`,
              background: isCompleted ? '#10B981' : color,
              borderRadius: '3px',
              transition: 'width 0.1s linear'
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter, sans-serif' }}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration || (parseFloat(podcast.duration.split(':')[0]) * 60 + parseFloat(podcast.duration.split(':')[1])))}</span>
          </div>
        </div>

        <button
          onClick={toggleMute}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.3)',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
        </button>
      </div>

      <div style={{
        fontSize: '0.65rem',
        color: 'rgba(255, 255, 255, 0.25)',
        marginTop: '10px',
        textAlign: 'right',
        fontStyle: 'italic'
      }}>
        * 끝까지 청취하시면 자동으로 학습 완료가 기록됩니다.
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCurrentLevel(sessions) {
  if (sessions >= 30) return 'expert';
  if (sessions >= 10) return 'advanced';
  return 'basic';
}

function getOverallPct(sessions, hoursCompleted = 20) {
  // Education weight 50%, sessions weight 50%
  const eduPct = Math.min(hoursCompleted / 24, 1);
  const sessionPct = Math.min(sessions / 30, 1);
  return Math.round((eduPct * 0.5 + sessionPct * 0.5) * 100);
}

// ─── Level Card ───────────────────────────────────────────────────────────────

function LevelCard({
  lv, sessions, isActive, isUnlocked, onScheduleInterview,
  completedLectures = [], onToggleLecture, completedPodcasts = [], onTogglePodcast, hasKasp, kaspLevel,
  completedLectureQuizzes = [],
  open, onToggle
}) {
  const cls = !isUnlocked ? 'lc-locked' : `lc-${lv.id} lc-active`;
  const [openModules, setOpenModules] = useState({});
  const [openLectures, setOpenLectures] = useState({});

  const toggleModule = (modId) => {
    setOpenModules(p => ({ ...p, [modId]: !p[modId] }));
  };

  const toggleLectureBody = (lecId) => {
    setOpenLectures(p => ({ ...p, [lecId]: !p[lecId] }));
  };

  const hoursCompleted = lv.modules.reduce((s, m) => s + m.hoursCompleted, 0);
  const hoursTotal = lv.totalHours;

  const statusLabel = !isUnlocked ? '잠금' : isActive ? '진행 중' : '완료';
  const statusCls   = !isUnlocked ? 'st-locked' : isActive ? 'st-active' : 'st-done';

  return (
    <div className={`lms-level-card ${cls}`}>
      {/* Header */}
      <div className="lms-lc-header" onClick={() => isUnlocked && onToggle()}>
        <div className="lms-lc-header-left">
          <div
            className="lms-lc-icon"
            style={{
              background: isUnlocked ? `${lv.color}18` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${isUnlocked ? lv.color + '35' : 'rgba(255,255,255,0.08)'}`,
            }}
          >
            {!isUnlocked
              ? <Lock size={16} color="rgba(255,255,255,0.2)" />
              : lv.id === 'basic'
                ? <BookOpen size={16} color={lv.color} />
                : lv.id === 'advanced'
                  ? <Award size={16} color={lv.color} />
                  : <Shield size={16} color={lv.color} />
            }
          </div>
          <div>
            <div className="lms-lc-level-label" style={{ color: isUnlocked ? lv.color : 'rgba(255,255,255,0.2)' }}>
              {lv.level}
            </div>
            <div className="lms-lc-name">{lv.name}</div>
            <div className="lms-lc-meta">
              교육 {hoursCompleted}/{hoursTotal}h
              {lv.sessionTarget > 0 && ` · 상담 ${Math.min(sessions, lv.sessionTarget)}/${lv.sessionTarget}건`}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={`lms-lc-status ${statusCls}`}>{statusLabel}</span>
          {isUnlocked && (open ? <ChevronUp size={16} color="rgba(255,255,255,0.3)" /> : <ChevronDown size={16} color="rgba(255,255,255,0.3)" />)}
        </div>
      </div>

      {/* Body */}
      {open && isUnlocked && (
        <div className="lms-lc-body">

          {/* Education Progress Bar */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)' }}>교육 이수 진도</span>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: lv.color, fontFamily: 'Inter, sans-serif' }}>
                {hoursCompleted}h / {hoursTotal}h
              </span>
            </div>
            <div className="lms-progress-track">
              <div
                className="lms-progress-fill"
                style={{ width: `${(hoursCompleted / hoursTotal) * 100}%`, background: lv.color }}
              />
            </div>
          </div>

          {/* Modules */}
          <div className="lms-lc-section-label">
            <BookOpen size={11} />
            교육 모듈
          </div>
          {lv.modules.map(mod => {
            const isModOpen = openModules[mod.id];
            const isModDone = mod.hoursCompleted >= mod.hours;
            const subLectures = LECTURES[mod.id] || [];
            
            return (
              <React.Fragment key={mod.id}>
                <div 
                  className={`lms-module-item ${isModDone ? 'mod-done' : ''}`}
                  onClick={() => toggleModule(mod.id)}
                  style={{ cursor: 'pointer', transition: 'all 0.2s', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}
                >
                  <div
                    className="lms-module-check"
                    style={{
                      background: isModDone ? `${lv.color}18` : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${isModDone ? lv.color + '40' : 'rgba(255,255,255,0.07)'}`,
                      width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                    }}
                  >
                    {isModDone
                      ? <CheckCircle size={14} color={lv.color} />
                      : <Clock size={13} color="rgba(255,255,255,0.2)" />
                    }
                  </div>
                  <div className="lms-module-content" style={{ flex: 1 }}>
                    <div className="lms-module-title" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>
                      {mod.title}
                      <span style={{ fontSize: '0.7rem', color: lv.color, fontWeight: 'normal' }}>
                        ({isModOpen ? '접기' : '강의 리스트 보기'})
                      </span>
                    </div>
                    <div className="lms-module-desc" style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{mod.desc}</div>
                  </div>
                  <div className="lms-module-hours" style={{ color: isModDone ? lv.color : 'rgba(255,255,255,0.3)', fontSize: '0.8rem', fontWeight: 600 }}>
                    {mod.hoursCompleted}/{mod.hours}h
                  </div>
                </div>

                {isModOpen && (
                  <div className="lms-sub-lectures-container" style={{
                    padding: '8px 12px 14px 20px',
                    background: 'rgba(255,255,255,0.01)',
                    borderLeft: `2px dashed ${lv.color}30`,
                    marginLeft: '28px',
                    marginBottom: '12px',
                    borderRadius: '0 0 8px 8px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    {PODCASTS[mod.id] && (
                      <PodcastPlayer 
                        podcast={PODCASTS[mod.id]}
                        isCompleted={(completedPodcasts || []).includes(PODCASTS[mod.id].id)}
                        onToggle={() => onTogglePodcast && onTogglePodcast(PODCASTS[mod.id].id)}
                        color={lv.color}
                      />
                    )}
                    {subLectures.map(lec => {
                      let isLecDone = false;
                      if (lv.id === 'basic' && hasKasp && kaspLevel <= 3) isLecDone = true;
                      else if (lv.id === 'advanced' && hasKasp && kaspLevel <= 2) isLecDone = true;
                      else if (lv.id === 'expert' && hasKasp && kaspLevel === 1) isLecDone = true;
                      else isLecDone = completedLectures.includes(lec.id);

                      const isBodyOpen = !!openLectures[lec.id];
                      return (
                        <div
                          key={lec.id}
                          className="lms-lecture-row"
                          style={{
                            background: 'rgba(255,255,255,0.02)',
                            borderRadius: '8px',
                            border: `1px solid ${isLecDone ? lv.color + '20' : 'rgba(255,255,255,0.04)'}`,
                            overflow: 'hidden'
                          }}
                        >
                          <div
                            onClick={() => lec.body && toggleLectureBody(lec.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 14px',
                              cursor: lec.body ? 'pointer' : 'default'
                            }}
                          >
                            <div style={{ flex: 1, paddingRight: '12px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  background: isLecDone ? `${lv.color}20` : 'rgba(255,255,255,0.05)',
                                  color: isLecDone ? lv.color : 'rgba(255,255,255,0.4)',
                                  padding: '1px 5px',
                                  borderRadius: '4px',
                                  fontFamily: 'Inter, sans-serif'
                                }}>{lec.id}</span>
                                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: isLecDone ? 'white' : 'rgba(255,255,255,0.7)' }}>
                                  {lec.title}
                                </span>
                              </div>
                              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                                {lec.desc}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                              <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'Inter, sans-serif' }}>
                                {lec.hours}h
                              </span>
                              {lec.body && (
                                isBodyOpen
                                  ? <ChevronUp size={14} color="rgba(255,255,255,0.3)" />
                                  : <ChevronDown size={14} color="rgba(255,255,255,0.3)" />
                              )}
                              <button
                                disabled={hasKasp && (
                                  (lv.id === 'basic' && kaspLevel <= 3) ||
                                  (lv.id === 'advanced' && kaspLevel <= 2) ||
                                  (lv.id === 'expert' && kaspLevel === 1)
                                )}
                                onClick={(e) => { e.stopPropagation(); onToggleLecture && onToggleLecture(lec.id); }}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '0.7rem',
                                  background: isLecDone ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)',
                                  border: `1px solid ${isLecDone ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.08)'}`,
                                  borderRadius: '6px',
                                  color: isLecDone ? '#10B981' : 'rgba(255,255,255,0.5)',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                  transition: 'all 0.2s'
                                }}
                              >
                                {isLecDone ? '수강 완료 ✓' : '수강하기'}
                              </button>
                              {LECTURE_QUIZ_DATA[lec.id] && (() => {
                                const quizPassed = completedLectureQuizzes.includes(lec.id);
                                return (
                                  <Link
                                    to={`/counselor-lms/lecture-quiz/${lec.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                    style={{
                                      padding: '4px 8px',
                                      fontSize: '0.7rem',
                                      background: quizPassed ? 'rgba(16,185,129,0.12)' : 'rgba(56,189,248,0.1)',
                                      border: `1px solid ${quizPassed ? 'rgba(16,185,129,0.25)' : 'rgba(56,189,248,0.25)'}`,
                                      borderRadius: '6px',
                                      color: quizPassed ? '#10B981' : '#38BDF8',
                                      cursor: 'pointer',
                                      fontWeight: 600,
                                      textDecoration: 'none',
                                      display: 'inline-flex'
                                    }}
                                  >
                                    {quizPassed ? '퀴즈 통과 ✓' : '퀴즈 응시'}
                                  </Link>
                                );
                              })()}
                            </div>
                          </div>

                          {isBodyOpen && lec.body && (
                            <div style={{
                              padding: '4px 16px 16px',
                              borderTop: '1px solid rgba(255,255,255,0.05)',
                              marginTop: '2px'
                            }}>
                              {lec.video && (
                                <div style={{
                                  position: 'relative',
                                  width: '100%',
                                  paddingTop: '56.25%',
                                  marginTop: '14px',
                                  borderRadius: '10px',
                                  overflow: 'hidden',
                                  background: '#000',
                                  border: `1px solid ${lv.color}25`
                                }}>
                                  <iframe
                                    src={`https://www.youtube.com/embed/${lec.video.youtubeId}${lec.video.start ? `?start=${lec.video.start}` : ''}`}
                                    title={`${lec.id} 강의 영상`}
                                    style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                  />
                                </div>
                              )}
                              {lec.body.map((para, i) => (
                                <p key={i} style={{
                                  fontSize: '0.78rem',
                                  lineHeight: 1.7,
                                  color: 'rgba(255,255,255,0.6)',
                                  marginTop: '12px',
                                  marginBottom: 0
                                }}>
                                  {para}
                                </p>
                              ))}
                              {lec.keyTerms && lec.keyTerms.length > 0 && (
                                <div style={{ marginTop: '14px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                  {lec.keyTerms.map((term, i) => (
                                    <span key={i} style={{
                                      fontSize: '0.68rem',
                                      fontWeight: 600,
                                      color: lv.color,
                                      background: `${lv.color}12`,
                                      border: `1px solid ${lv.color}25`,
                                      borderRadius: '5px',
                                      padding: '2px 8px'
                                    }}>
                                      #{term}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {mod.id === 'm1' && LECTURE_QUIZ_DATA['L1L2'] && (
                      <Link
                        to="/counselor-lms/lecture-quiz/L1L2"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '8px',
                          margin: '10px 16px 4px', padding: '10px 14px',
                          fontSize: '0.78rem', fontWeight: 600,
                          background: completedLectureQuizzes.includes('L1L2') ? 'rgba(16,185,129,0.1)' : 'rgba(56,189,248,0.08)',
                          border: `1px solid ${completedLectureQuizzes.includes('L1L2') ? 'rgba(16,185,129,0.25)' : 'rgba(56,189,248,0.25)'}`,
                          borderRadius: '8px',
                          color: completedLectureQuizzes.includes('L1L2') ? '#10B981' : '#38BDF8',
                          textDecoration: 'none',
                        }}
                      >
                        <Mic size={14} />
                        {completedLectureQuizzes.includes('L1L2') ? 'L1+L2 종합 평가 통과 ✓' : 'L1+L2 종합 평가 응시 (10문항 + 구술)'}
                      </Link>
                    )}
                  </div>
                )}
              </React.Fragment>
            );
          })}

          {/* Assessments */}
          <div className="lms-lc-section-label">
            <FileCheck size={11} />
            평가 · 조건
          </div>
          {lv.assessments.map((a, i) => (
            <div key={i} className={`lms-assess-item ${a.done ? 'asm-done' : ''}`}>
              {a.done
                ? <CheckCircle size={16} color="#10B981" />
                : <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.15)', flexShrink: 0 }} />
              }
              <span className="lms-assess-type" style={{ background: `${a.typeColor}15`, color: a.typeColor, border: `1px solid ${a.typeColor}30` }}>
                {a.type}
              </span>
              <div style={{ flex: 1 }}>
                <div className="lms-assess-title">{a.title}</div>
                {a.note && <div className="lms-assess-note">{a.note}</div>}
              </div>
              {a.type === '필기' && !a.done && isUnlocked && (
                hoursCompleted >= hoursTotal ? (
                  <Link 
                    to={`/counselor-lms/test/${lv.id}`}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      padding: '4px 10px', fontSize: '0.72rem', background: `${lv.color}20`,
                      border: `1px solid ${lv.color}50`, borderRadius: '6px', color: lv.color,
                      textDecoration: 'none', fontWeight: 600, transition: 'all 0.2s', marginLeft: '8px'
                    }}
                  >
                    시험 응시
                  </Link>
                ) : (
                  <button 
                    disabled
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      padding: '4px 10px', fontSize: '0.72rem', background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)', borderRadius: '6px', color: 'rgba(255,255,255,0.3)',
                      cursor: 'not-allowed', fontWeight: 600, marginLeft: '8px'
                    }}
                  >
                    교육 미완료
                  </button>
                )
              )}
              {a.type === '면접' && !a.done && isUnlocked && (
                <button 
                  onClick={(e) => { e.stopPropagation(); onScheduleInterview && onScheduleInterview(); }}
                  style={{
                    padding: '4px 10px', fontSize: '0.72rem', background: '#FB718520',
                    border: '1px solid #FB718550', borderRadius: '6px', color: '#FB7185',
                    cursor: 'pointer', fontWeight: 600, transition: 'all 0.2s', marginLeft: '8px'
                  }}
                >
                  일정 선택
                </button>
              )}
            </div>
          ))}

          {/* Session requirement */}
          {lv.sessionTarget > 0 && (
            <>
              <div className="lms-lc-section-label">
                <Users size={11} />
                상담 경력 조건
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', borderRadius: 12,
                background: sessions >= lv.sessionTarget ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${sessions >= lv.sessionTarget ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.07)'}`,
              }}>
                <div style={{ textAlign: 'center', minWidth: 48 }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: sessions >= lv.sessionTarget ? '#10B981' : lv.color, fontFamily: 'Inter, sans-serif', lineHeight: 1 }}>
                    {Math.min(sessions, lv.sessionTarget)}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.3)' }}>/ {lv.sessionTarget}건</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: sessions >= lv.sessionTarget ? '#10B981' : 'rgba(255,255,255,0.7)' }}>
                    {sessions >= lv.sessionTarget ? '상담 조건 달성 ✓' : `${lv.sessionTarget - sessions}건 더 필요`}
                  </div>
                  <div style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
                    {lv.sessionNote}
                  </div>
                </div>
                <div style={{ marginLeft: 'auto' }}>
                  <div className="lms-progress-track" style={{ width: 80 }}>
                    <div className="lms-progress-fill" style={{
                      width: `${Math.min(sessions / lv.sessionTarget, 1) * 100}%`,
                      background: sessions >= lv.sessionTarget ? '#10B981' : lv.color
                    }} />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* KASP Inline */}
          <div className="lms-kasp-inline">
            <div className="lms-kasp-grade">{lv.kasp.grade}</div>
            <div className="lms-kasp-info">
              <div className="lms-kasp-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Award size={14} className="text-yellow-400" /> {lv.kasp.fullName} 보유 시 즉시 인정
              </div>
              <div className="lms-kasp-effect">{lv.kasp.effect}</div>
            </div>
          </div>

          {/* Upgrade trigger */}
          <div className="lms-upgrade-box">
            <ArrowRight size={14} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>
                승급 트리거
              </div>
              <div className="lms-upgrade-text">{lv.upgradeTrigger}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── KASP Credential Map Card ─────────────────────────────────────────────────

function KaspMapCard({ lv, onApply }) {
  return (
    <div className="lms-kasp-map-card">
      <div className="lms-kasp-map-header">
        <div
          className="lms-kasp-grade-big"
          style={{ background: `${lv.color}15`, color: lv.color, borderColor: `${lv.color}30` }}
        >
          {lv.kasp.grade}
        </div>
        <div className="lms-kasp-arrow">→</div>
        <div className="lms-kasp-result">
          <div className="lms-kasp-result-level" style={{ color: lv.color }}>{lv.level} · {lv.badge}</div>
          <div className="lms-kasp-result-name">{lv.name}</div>
          <div className="lms-kasp-result-effect">{lv.kasp.effect}</div>
        </div>
      </div>
      <div className="lms-kasp-map-footer">
        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)' }}>
          {lv.kasp.fullName}
        </span>
        <button
          className="lms-kasp-apply-btn"
          style={{
            color: lv.color,
            borderColor: `${lv.color}35`,
            background: `${lv.color}0a`,
          }}
          onClick={() => onApply(lv)}
        >
          <FileCheck size={13} />
          자격증 등록 신청
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

// ── Certification Info Modal ───────────────────────────────────────────────────
function CertInfoModal({ onClose }) {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
      padding: '20px'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #15151b 0%, #1a1a24 100%)',
        border: '1px solid rgba(56,189,248,0.2)',
        borderRadius: '20px', padding: '36px', maxWidth: '600px', width: '100%',
        boxShadow: '0 25px 50px rgba(0,0,0,0.6), 0 0 40px rgba(56,189,248,0.05)',
        maxHeight: '85vh', overflowY: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ fontSize: '0.7rem', fontWeight: 800, color: '#38BDF8', letterSpacing: '0.12em', marginBottom: 8, textTransform: 'uppercase' }}>TUFLY EXPERT CERTIFICATION</div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#fff', lineHeight: 1.2 }}>스포츠심리 전문가 인증 프로그램</h2>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.88rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, marginBottom: 28 }}>
          터플리 스포츠심리 전문가 인증은 <strong style={{ color: '#fff' }}>IZOF(Individual Zone of Optimal Functioning) 이론</strong>을 기반으로 한
          현장 실전 중심의 스포츠심리상담 자격 체계입니다. 국내 최고 권위의 <strong style={{ color: '#38BDF8' }}>한국스포츠심리학회 자격증</strong>과 연계하여
          체계적이고 공신력 있는 전문가 양성을 목표로 합니다.
        </p>

        {[{
          level: 'Level 1 · BASIC', color: '#38BDF8',
          title: '기초 과정 (24시간)',
          items: [
            'IZOF 이론 기반 스포츠 심리 기초 교육 (12h)',
            '터플리 핵심 심리도구 실습 (8h)',
            '심리 측정 도구 해석 (4h)',
            '기초 이론 필기 테스트 + 심리도구 실기 평가',
            '한국스포츠심리학회 3급 자격 보유 시 즉시 인정',
          ]
        }, {
          level: 'Level 2 · ADVANCED', color: '#6366F1',
          title: '심화 과정 (8시간 + 상담 10건)',
          items: [
            '종목별 특화 심리 솔루션 세미나 (4h)',
            '실전 케이스 스터디 워크숍 (4h)',
            '상담 일지 10건 제출 (수퍼비전 포함)',
            '한국스포츠심리학회 2급 자격 보유 시 10건 선 인정',
          ]
        }, {
          level: 'Level 3 · EXPERT', color: '#F59E0B',
          title: '마스터 과정 (4시간 + 상담 30건)',
          items: [
            '고급 수퍼비전 기법 클래스 (4h)',
            '상담 경력 30건 이상 (프로스포츠 60건 기준)',
            '프로스포츠 레퍼런스 서류 검증 (K리그·KBO 등)',
            '마스터 위원단 최종 면접 합격',
            '한국스포츠심리학회 1급 자격 보유 시 경력 면제',
          ]
        }].map(sec => (
          <div key={sec.level} style={{ marginBottom: 20, padding: '20px', background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: `1px solid ${sec.color}20` }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: sec.color, letterSpacing: '0.08em', marginBottom: 6 }}>{sec.level}</div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#fff', marginBottom: 14 }}>{sec.title}</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sec.items.map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.82rem', color: 'rgba(255,255,255,0.55)' }}>
                  <CheckCircle size={13} color={sec.color} style={{ flexShrink: 0, marginTop: 2 }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}

        <div style={{ padding: '16px', background: 'rgba(56,189,248,0.07)', border: '1px solid rgba(56,189,248,0.18)', borderRadius: 12, fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
          <strong style={{ color: '#38BDF8' }}>한국스포츠심리학회 자격 연계:</strong> 스포츠심리상담사 1·2·3급 자격증 보유 시
          해당 레벨이 즉시 인정됩니다. 자격증 등록은 '외부 자격 연계' 탭에서 신청하세요.
        </div>
      </div>
    </div>
  );
}

// ── Supervision Material Upload Modal ─────────────────────────────────────────
function SupervisionUploadModal({ onClose, onSubmit, submitting }) {
  const [desc, setDesc] = useState('');
  const [fileName, setFileName] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [clientInitial, setClientInitial] = useState('');

  const canSubmit = desc.trim() && fileName.trim() && sessionDate;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
      padding: '20px'
    }}>
      <div style={{
        background: '#15151b', border: '1px solid rgba(99,102,241,0.25)',
        borderRadius: '18px', padding: '32px', maxWidth: '500px', width: '100%',
        boxShadow: '0 20px 40px rgba(0,0,0,0.5)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, color: '#6366F1', letterSpacing: '0.1em', marginBottom: 4 }}>SUPERVISED SESSION</div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>상담 자료 제출</h3>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: 'rgba(255,255,255,0.5)', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginBottom: 24, lineHeight: 1.6 }}>
          수퍼비전 세션 또는 단독 상담 관련 자료를 어드민에게 제출합니다. 상담 일지, 케이스 보고서, 녹화 요약본 등을 첨부하세요.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 600 }}>상담 일자 *</label>
            <input type="date" value={sessionDate} onChange={e => setSessionDate(e.target.value)}
              style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#fff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 600 }}>내담자 이니셜 (선택)</label>
            <input type="text" value={clientInitial} onChange={e => setClientInitial(e.target.value)}
              placeholder="예: 홍 OO" maxLength={10}
              style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#fff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 600 }}>제출 파일명 *</label>
            <input type="text" value={fileName} onChange={e => setFileName(e.target.value)}
              placeholder="예: supervision_log_2025_01.pdf"
              style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#fff', fontSize: '0.85rem', outline: 'none', boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', marginBottom: 6, fontWeight: 600 }}>상담 내용 요약 (어드민 검토용) *</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={4}
              placeholder="주요 상담 주제, 개입 방법, 결과 등을 간략히 기술해 주세요."
              style={{ width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, color: '#fff', fontSize: '0.82rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', background: 'rgba(255,255,255,0.04)', border: 'none', borderRadius: 8, color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.82rem' }}>취소</button>
          <button
            disabled={!canSubmit || submitting}
            onClick={() => onSubmit({ desc, fileName, sessionDate, clientInitial })}
            style={{ padding: '9px 22px', background: canSubmit && !submitting ? '#6366F1' : 'rgba(99,102,241,0.3)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: canSubmit && !submitting ? 'pointer' : 'not-allowed', fontSize: '0.82rem' }}
          >
            {submitting ? '제출 중...' : <><Upload size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />자료 제출</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CounselorLMS() {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [activeTab, setActiveTab] = useState('roadmap');
  const [totalSessions, setTotalSessions] = useState(0);
  const [independentSessions, setIndependentSessions] = useState(0);
  const [supervisedSessions, setSupervisedSessions] = useState(0);
  const [loading, setLoading] = useState(true);

  // Expanded levels state for interactive path navigation
  const [expandedLevels, setExpandedLevels] = useState({ basic: true, advanced: false, expert: false });

  const handleFocusLevel = (levelId) => {
    setActiveTab('roadmap');
    setExpandedLevels(prev => ({ ...prev, [levelId]: true }));
    setTimeout(() => {
      const element = document.getElementById(`level-card-${levelId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 120);
  };

  // Modals state
  const [showCertInfo, setShowCertInfo] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadingMaterial, setUploadingMaterial] = useState(false);
  const [submittedMaterials, setSubmittedMaterials] = useState([]);
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('');

  // Application submission states
  const [licenseApplications, setLicenseApplications] = useState([]);
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [applyLicenseLevel, setApplyLicenseLevel] = useState(3);
  const [applyFileName, setApplyFileName] = useState('');

  // 1. Live listener for user profile data (so changes reflect immediately)
  useEffect(() => {
    if (!currentUser?.uid) return;
    const unsub = onSnapshot(doc(db, 'users', currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      }
    });
    return () => unsub();
  }, [currentUser]);

  // 2. Live listener for KASP applications (to view status on credentials tab)
  useEffect(() => {
    if (!currentUser?.uid) return;
    const q = query(
      collection(db, 'counselor_license_applications'),
      where('counselorId', '==', currentUser.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setLicenseApplications(data);
    });
    return () => unsub();
  }, [currentUser]);

  // 3. Live listener for submitted supervision materials
  useEffect(() => {
    if (!currentUser?.uid) return;
    const q = query(
      collection(db, 'supervision_materials'),
      where('counselorId', '==', currentUser.uid)
    );
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.submittedAt || '').localeCompare(a.submittedAt || ''));
      setSubmittedMaterials(data);
    });
    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.email || userData?.name) {
      fetchSessions();
    }
  }, [currentUser, userData]);

  async function fetchSessions() {
    setLoading(true);
    try {
      let snap = await getDocs(
        query(collection(db, 'reservations'), where('counselorEmail', '==', currentUser.email))
      );
      let allDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (allDocs.length === 0 && userData?.name) {
        const snap2 = await getDocs(
          query(collection(db, 'reservations'), where('counselorName', '==', userData.name))
        );
        allDocs = snap2.docs.map(d => ({ id: d.id, ...d.data() }));
      }
      const accepted = allDocs.filter(r => r.status === 'accepted');
      const supervised = accepted.filter(r => r.sessionType === 'supervised').length;
      const independent = accepted.length - supervised;

      setTotalSessions(accepted.length);
      setIndependentSessions(independent);
      setSupervisedSessions(supervised);
    } catch (err) {
      console.error('LMS session fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  // Lecture completions toggle
  async function toggleLectureCompletion(lectureId) {
    if (!currentUser?.uid) return;
    const completedLectures = userData?.completed_lectures || [];
    let updated;
    if (completedLectures.includes(lectureId)) {
      updated = completedLectures.filter(id => id !== lectureId);
    } else {
      updated = [...completedLectures, lectureId];
    }
    
    try {
      await setDoc(doc(db, 'users', currentUser.uid), {
        completed_lectures: updated
      }, { merge: true });
    } catch (err) {
      console.error('Error toggling lecture completion:', err);
      alert('수강 완료 동기화 실패');
    }
  }

  // Podcast completions toggle
  async function togglePodcastCompletion(podcastId) {
    if (!currentUser?.uid) return;
    const completedPodcasts = userData?.completed_podcasts || [];
    let updated;
    if (completedPodcasts.includes(podcastId)) {
      updated = completedPodcasts.filter(id => id !== podcastId);
    } else {
      updated = [...completedPodcasts, podcastId];
    }
    
    try {
      await setDoc(doc(db, 'users', currentUser.uid), {
        completed_podcasts: updated
      }, { merge: true });
    } catch (err) {
      console.error('Error toggling podcast completion:', err);
      alert('팟캐스트 청취 상태 동기화 실패');
    }
  }

  // KASP license upload submission
  // NOTE: real Firebase Storage upload (fileUrl) is on hold — Storage now requires the
  // Blaze billing plan (Google policy change, Oct 2024), which hasn't been enabled for
  // this project yet. Reverted to a plain typed filename until that billing decision is
  // made; storage.rules/firebase.json's storage block stay in the repo ready to resume.
  async function submitLicenseApplication(selectedLevel, certFileName) {
    if (!currentUser?.uid) return;
    if (!certFileName.trim()) {
      alert('증빙 서류 파일명을 입력해 주세요.');
      return;
    }
    setUploadingLicense(true);
    try {
      const appId = `license_${Date.now()}`;
      await setDoc(doc(db, 'counselor_license_applications', appId), {
        counselorId: currentUser.uid,
        counselorName: userData?.name || currentUser.email.split('@')[0],
        counselorEmail: currentUser.email,
        licenseLevel: Number(selectedLevel),
        fileUrl: certFileName,
        status: 'pending',
        submittedAt: new Date().toISOString()
      });
      alert('자격증 심사 신청이 성공적으로 접수되었습니다. 어드민 승인 후 등급에 자동 반영됩니다.');
    } catch (err) {
      console.error('Submit license application error:', err);
      alert('자격 신청 제출 실패');
    } finally {
      setUploadingLicense(false);
    }
  }

  // Submit supervision material to admin — same plain-filename hold as above.
  async function submitSupervisionMaterial({ desc, fileName, sessionDate, clientInitial }) {
    if (!currentUser?.uid) return;
    if (!fileName.trim()) {
      alert('증빙 자료 파일명을 입력해 주세요.');
      return;
    }
    setUploadingMaterial(true);
    try {
      await addDoc(collection(db, 'supervision_materials'), {
        counselorId: currentUser.uid,
        counselorName: userData?.name || currentUser.email.split('@')[0],
        counselorEmail: currentUser.email,
        sessionDate,
        clientInitial,
        fileName,
        description: desc,
        status: 'pending',
        submittedAt: new Date().toISOString(),
      });
      setShowUploadModal(false);
      alert('자료가 어드민에게 제출되었습니다. 검토 후 1~3 영업일 내에 처리됩니다.');
    } catch (err) {
      console.error(err);
      alert('제출 중 오류가 발생했습니다.');
    } finally {
      setUploadingMaterial(false);
    }
  }

  // 본인 인증 철회 — 등록된 KASP 인증을 스스로 내려놓는 것만 self-service로 허용.
  // 인증을 부여하는 방향은 반드시 counselor_license_applications 심사 큐를 거쳐야 한다(admin 승인 전용).
  async function resetKaspLicense() {
    if (!currentUser?.uid) return;
    if (!window.confirm('등록된 자격 연계 정보를 초기화하시겠습니까? 일반 진급 규칙이 다시 적용됩니다.')) return;
    try {
      await setDoc(doc(db, 'users', currentUser.uid), {
        has_kasp_license: false,
        kasp_license_level: null,
        current_tufly_level: 'Basic'
      }, { merge: true });
      alert('자격증 등록 정보가 초기화되었습니다. 일반 진급 규칙이 다시 적용됩니다.');
    } catch (err) {
      console.error('Reset KASP error:', err);
      alert('초기화 중 에러가 발생했습니다.');
    }
  }

  async function scheduleInterview() {
    if (!interviewDate || !interviewTime) {
      alert('인터뷰 날짜와 시간을 선택해주세요.');
      return;
    }
    try {
      await setDoc(doc(db, 'users', currentUser.uid), {
        interviewScheduled: true,
        interviewDate,
        interviewTime
      }, { merge: true });
      alert(`마스터 위원단 면접 일정이 등록되었습니다.\n일시: ${interviewDate} ${interviewTime}\n장소: 온라인 ZOOM 회의실 (회의 링크가 이메일로 발송됩니다)`);
      setShowInterviewModal(false);
    } catch (err) {
      console.error('Interview schedule error:', err);
      alert('면접 일정 예약 중 에러가 발생했습니다.');
    }
  }

  function handleApply(lv) {
    // 3급 => Level 1, 2급 => Level 2, 1급 => Level 3 매핑에 따라 기본값 세팅 후
    // 실제 심사 신청 폼("외부 자격 연계" 탭)으로 이동한다. 여기서 즉시 승인되지 않는다 — admin 심사 필요.
    let targetKasp = 3;
    if (lv.id === 'advanced') targetKasp = 2;
    if (lv.id === 'expert') targetKasp = 1;
    setApplyLicenseLevel(targetKasp);
    setActiveTab('credentials');
  }

  // ─── KASP 자격증 기반 레벨 데이터 가공 (Rule 1 & Rule 2) ───────────────────
  const hasKasp = userData?.has_kasp_license || false;
  const kaspLevel = userData?.kasp_license_level || null; // 1, 2, 3
  
  // 1. Level 2 및 Level 3 진입을 위한 실질적인 상담 경력 계산
  // KASP 2급 이상(2급, 1급)인 경우 10건 선 인정
  const kaspBonusSessions = (hasKasp && (kaspLevel === 2 || kaspLevel === 1)) ? 10 : 0;
  const effectiveSessions = totalSessions + kaspBonusSessions;

  // 2. 현재 터플리 레벨 트리거링
  let currentLevelId = 'basic';
  if (hasKasp) {
    if (kaspLevel === 1) currentLevelId = 'expert';
    else if (kaspLevel === 2) currentLevelId = 'advanced';
    else if (kaspLevel === 3) currentLevelId = 'basic';
  } else {
    if (effectiveSessions >= 30) currentLevelId = 'expert';
    else if (effectiveSessions >= 10) currentLevelId = 'advanced';
    else currentLevelId = 'basic';
  }

  // 3. 각 레벨별 모듈 이수 시간 및 평가 완료 여부 보정
  const processedLevels = LEVELS.map(lv => {
    let modules = lv.modules.map(mod => {
      let hoursCompleted = 0;
      
      // KASP 대체인증 규칙 적용
      if (lv.id === 'basic' && hasKasp && kaspLevel <= 3) {
        hoursCompleted = mod.hours;
      } else if (lv.id === 'advanced' && hasKasp && kaspLevel <= 2) {
        hoursCompleted = mod.hours;
      } else if (lv.id === 'expert' && hasKasp && kaspLevel === 1) {
        hoursCompleted = mod.hours;
      } else {
        // 실제 완료된 강의 목록을 조회하여 합산 (각 강의 2시간)
        const modLectures = LECTURES[mod.id] || [];
        const completedCount = modLectures.filter(l => (userData?.completed_lectures || []).includes(l.id)).length;
        hoursCompleted = completedCount * 2;
      }
      return { ...mod, hoursCompleted };
    });

    let assessments = lv.assessments.map(a => {
      let done = a.done;
      if (a.title === '기초 이론 필기 테스트') {
        done = (userData?.completed_tests || []).includes('basic_written_test');
      }
      if (a.type === '면접') {
        done = userData?.interviewCompleted || false;
      }
      // KASP 보유 시 하위 평가 완료 자동 인정
      if (lv.id === 'basic' && hasKasp && kaspLevel <= 3) {
        done = true;
      }
      if (lv.id === 'advanced' && hasKasp && kaspLevel <= 2) {
        done = true;
      }
      if (lv.id === 'expert' && hasKasp && kaspLevel === 1) {
        done = true;
      }
      return { ...a, done };
    });

    // KASP 1급일 때 Expert 경력 요건 면제 처리
    let sessionTarget = lv.sessionTarget;
    let customNote = lv.sessionNote;
    if (lv.id === 'expert' && hasKasp && kaspLevel === 1) {
      sessionTarget = 0;
      customNote = 'KASP 1급 자격으로 인해 상담 경력이 면제되었습니다.';
    }

    return {
      ...lv,
      modules,
      assessments,
      sessionTarget,
      sessionNote: customNote
    };
  });

  // 전체 이수율 계산 (전체 36시간 교육 + 경력 요건 등으로 가중치)
  const totalEduHours = 36;
  const completedEduHours = processedLevels.reduce((sum, lv) => {
    return sum + lv.modules.reduce((s, m) => s + m.hoursCompleted, 0);
  }, 0);

  // Calculate completed lectures dynamically, taking KASP levels into account
  let effectiveCompletedLectures = (userData?.completed_lectures || []).length;
  if (hasKasp) {
    if (kaspLevel === 1) effectiveCompletedLectures = 18;
    else if (kaspLevel === 2) effectiveCompletedLectures = Math.max(effectiveCompletedLectures, 12);
    else if (kaspLevel === 3) effectiveCompletedLectures = Math.max(effectiveCompletedLectures, 6);
  }
  
  const eduPct = completedEduHours / totalEduHours;
  const sessionPct = Math.min(effectiveSessions / 30, 1);
  const overallPct = hasKasp && kaspLevel === 1 ? 100 : Math.round((eduPct * 0.5 + sessionPct * 0.5) * 100);

  // Path node state
  const levelOrder = ['basic', 'advanced', 'expert'];
  function nodeState(id) {
    const ci = levelOrder.indexOf(currentLevelId);
    const ni = levelOrder.indexOf(id);
    if (ni < ci) return 'done';
    if (ni === ci) return 'active';
    return 'locked';
  }

  const tabs = [
    { id: 'roadmap',     label: '레벨 로드맵',   icon: Award },
    { id: 'sessions',    label: '상담 실적',      icon: Users },
    { id: 'credentials', label: '외부 자격 연계', icon: Shield },
  ];

  return (
    <div className="counselor-lms">

      {/* ── Hero ── */}
      <div className="lms-hero">
        <div className="lms-hero-inner">
          <div className="lms-hero-top">
            <Link to="/counselor-dashboard" className="lms-back-btn">
              <ChevronLeft size={14} /> 대시보드로 돌아가기
            </Link>
          </div>
          <div className="lms-hero-system-badge">
            <Star size={9} />
            TUFLY EXPERT CERTIFICATION SYSTEM
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h1 className="lms-hero-title" style={{ margin: 0 }}>스포츠심리 전문가 인증</h1>
            <button
              onClick={() => setShowCertInfo(true)}
              title="인증 프로그램 안내"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(56,189,248,0.15)', border: '1.5px solid rgba(56,189,248,0.4)',
                cursor: 'pointer', color: '#38BDF8', flexShrink: 0,
                transition: 'all 0.2s'
              }}
            >
              <Info size={15} />
            </button>
          </div>
          <p className="lms-hero-desc">
            김병준 교수님의 IZOF 이론을 기반으로 한 현장 실전 중심 자격 인증 시스템입니다.<br />
            한국스포츠심리학회 자격증 보유 시 해당 레벨이 즉시 인정됩니다.
          </p>

          {/* Level Path */}
          <div className="lms-level-path">
            {LEVELS.map((lv, i) => {
              const state = nodeState(lv.id);
              return (
                <React.Fragment key={lv.id}>
                  <div className="lms-path-node" onClick={() => state !== 'locked' && handleFocusLevel(lv.id)} style={{ cursor: state !== 'locked' ? 'pointer' : 'not-allowed' }}>
                    <div className={`lms-path-dot ${state}`} style={{
                      background: state === 'done' ? lv.color : state === 'active' ? `${lv.color}18` : undefined,
                      borderColor: state !== 'locked' ? lv.color : undefined,
                      color: state !== 'locked' ? lv.color : undefined,
                    }}>
                      {state === 'done' ? <CheckCircle size={14} color="#fff" /> : lv.level.replace('Level ', 'L')}
                    </div>
                    <div className="lms-path-label" style={{ color: state === 'locked' ? 'rgba(255,255,255,0.2)' : state === 'active' ? lv.color : 'rgba(255,255,255,0.5)' }}>
                      {lv.badge}
                    </div>
                  </div>
                  {i < LEVELS.length - 1 && (
                    <div className={`lms-path-connector ${nodeState(LEVELS[i + 1].id) !== 'locked' ? 'filled' : ''}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>

          {/* Interactive Premium Dashboard Panel */}
          <div className="lms-interactive-dashboard">
            <div className="dashboard-circular-progress">
              <svg className="progress-ring" width="120" height="120">
                <circle className="progress-ring-circle-bg" stroke="rgba(255,255,255,0.04)" strokeWidth="8" fill="transparent" r="50" cx="60" cy="60" />
                <circle className="progress-ring-circle-fill" stroke="url(#progressGradient)" strokeWidth="8" strokeDasharray="314.16" strokeDashoffset={314.16 - (314.16 * overallPct) / 100} strokeLinecap="round" fill="transparent" r="50" cx="60" cy="60" />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0EA5E9" />
                    <stop offset="100%" stopColor="#38BDF8" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="circular-progress-text">
                <span className="pct-value">{overallPct}%</span>
                <span className="pct-label">인증 진척도</span>
              </div>
            </div>
            <div className="dashboard-stats-grid">
              <div className="stat-grid-card">
                <span className="stat-card-label">교육 시간</span>
                <span className="stat-card-value">{completedEduHours} <span className="unit">/ 36h</span></span>
                <div className="stat-card-progress-bar"><div className="stat-card-progress-fill" style={{ width: `${(completedEduHours/36)*100}%`, background: '#38BDF8' }} /></div>
              </div>
              <div className="stat-grid-card">
                <span className="stat-card-label">이수 강의</span>
                <span className="stat-card-value">{effectiveCompletedLectures} <span className="unit">/ 18개</span></span>
                <div className="stat-card-progress-bar"><div className="stat-card-progress-fill" style={{ width: `${(effectiveCompletedLectures/18)*100}%`, background: '#6366F1' }} /></div>
              </div>
              <div className="stat-grid-card">
                <span className="stat-card-label">팟캐스트 청취</span>
                <span className="stat-card-value">{(userData?.completed_podcasts || []).length} <span className="unit">/ 3개</span></span>
                <div className="stat-card-progress-bar"><div className="stat-card-progress-fill" style={{ width: `${((userData?.completed_podcasts || []).length/3)*100}%`, background: '#10B981' }} /></div>
              </div>
              <div className="stat-grid-card">
                <span className="stat-card-label">상담 실적</span>
                <span className="stat-card-value">{effectiveSessions} <span className="unit">/ 30건</span></span>
                <div className="stat-card-progress-bar"><div className="stat-card-progress-fill" style={{ width: `${Math.min((effectiveSessions/30)*100, 100)}%`, background: '#F59E0B' }} /></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tab Bar ── */}
      <div className="lms-tab-bar">
        <div className="lms-tab-bar-inner">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} className={`lms-tab ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="lms-tab-content">
        <div className="container">

          {/* ════ ROADMAP TAB ════ */}
          {activeTab === 'roadmap' && (
            <div>
              {processedLevels.map((lv, i) => {
                const state = nodeState(lv.id);
                return (
                  <div key={lv.id} id={`level-card-${lv.id}`}>
                    <LevelCard
                      lv={lv}
                      sessions={effectiveSessions}
                      isActive={state === 'active' || state === 'done'}
                      isUnlocked={state !== 'locked'}
                      onScheduleInterview={() => setShowInterviewModal(true)}
                      completedLectures={userData?.completed_lectures}
                      onToggleLecture={toggleLectureCompletion}
                      completedPodcasts={userData?.completed_podcasts}
                      onTogglePodcast={togglePodcastCompletion}
                      completedLectureQuizzes={userData?.completed_lecture_quizzes}
                      hasKasp={hasKasp}
                      kaspLevel={kaspLevel}
                      open={expandedLevels[lv.id]}
                      onToggle={() => setExpandedLevels(p => ({ ...p, [lv.id]: !p[lv.id] }))}
                    />
                  </div>
                );
              })}

              {/* Session type note */}
              <div
                className="lms-info-note"
                style={{ background: 'rgba(14,165,233,0.07)', border: '1px solid rgba(14,165,233,0.18)', marginTop: 8 }}
              >
                <Info size={15} color="#0EA5E9" style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ color: 'rgba(255,255,255,0.55)' }}>
                  <strong style={{ color: '#0EA5E9' }}>경력 인정 기준:</strong> 단독 상담(Independent)과 선배/교수진 지도 하의 수퍼비전(Supervised) 상담 모두 동일하게 1건으로 인정 및 누적됩니다.
                </span>
              </div>
            </div>
          )}

          {/* ════ SESSIONS TAB ════ */}
          {activeTab === 'sessions' && (
            <div>
              {/* Session Type Cards */}
              <div className="lms-sessions-overview">
                <div className="lms-session-type-card" style={{ background: 'rgba(56,189,248,0.06)', border: '1px solid rgba(56,189,248,0.18)' }}>
                  <div className="lms-session-type-label" style={{ color: '#38BDF8' }}>단독 상담</div>
                  <div className="lms-session-type-count" style={{ color: '#38BDF8' }}>{loading ? '…' : independentSessions}</div>
                  <div className="lms-session-type-sub">Independent</div>
                </div>
                <div className="lms-session-type-card" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.18)', position: 'relative' }}>
                  <div className="lms-session-type-label" style={{ color: '#6366F1' }}>수퍼비전 상담</div>
                  <div className="lms-session-type-count" style={{ color: '#6366F1' }}>{loading ? '…' : supervisedSessions}</div>
                  <div className="lms-session-type-sub">Supervised</div>
                  <button
                    onClick={() => setShowUploadModal(true)}
                    style={{
                      marginTop: 12, display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 14px', borderRadius: 20,
                      background: 'rgba(99,102,241,0.18)', border: '1px solid rgba(99,102,241,0.35)',
                      color: '#818CF8', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Upload size={12} /> 자료 제출
                  </button>
                </div>
              </div>

              {/* Submitted materials list */}
              {submittedMaterials.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: '0.73rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>제출된 자료</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {submittedMaterials.map(m => {
                      const sc = m.status === 'approved' ? '#10B981' : m.status === 'rejected' ? '#FB7185' : '#FBBF24';
                      const sl = m.status === 'approved' ? '승인' : m.status === 'rejected' ? '반려' : '검토 중';
                      return (
                        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 10 }}>
                          <FileCheck size={14} color="#6366F1" />
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>{m.fileName || '파일 없음'}</div>
                            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{m.sessionDate} {m.clientInitial && `· ${m.clientInitial}`}</div>
                          </div>
                          <span style={{ fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: `${sc}15`, color: sc, border: `1px solid ${sc}30` }}>{sl}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Info note */}
              <div className="lms-info-note" style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)' }}>
                <CheckCircle size={15} color="#10B981" style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ color: 'rgba(255,255,255,0.55)' }}>
                  단독 상담과 수퍼비전 상담 모두 동일하게 <strong style={{ color: '#10B981' }}>1건</strong>으로 인정됩니다. 실제 상담 <strong style={{ color: '#fff' }}>{totalSessions}건</strong>이 누적되었습니다.
                  {kaspBonusSessions > 0 && <span style={{ color: '#38BDF8' }}> (학회 자격 인정 혜택 +10건이 추가 합산되어 총 {effectiveSessions}건 인정)</span>}
                </span>
              </div>

              {/* Level thresholds */}
              <div className="lms-threshold-section">
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                  레벨별 상담 경력 기준 (대체인증 보정 반영)
                </div>
                {[
                  { label: 'Level 1 → Level 2 승급', sub: 'Advanced 과정 진입 조건', target: 10, color: '#6366F1' },
                  { label: 'Level 2 → Level 3 승급', sub: 'Expert 마스터 과정 진입 조건', target: 30, color: '#F59E0B' },
                  { label: 'Expert 완전 인증', sub: '프로스포츠 레퍼런스 등록 기준', target: 60, color: '#FB7185' },
                ].map((thr, i) => {
                  const isKasp1Exempt = (hasKasp && kaspLevel === 1 && thr.target <= 30);
                  const met = isKasp1Exempt || effectiveSessions >= thr.target;
                  return (
                    <div key={i} className={`lms-threshold-row ${met ? 'thr-met' : ''}`}>
                      {met
                        ? <CheckCircle size={18} color="#10B981" />
                        : <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${thr.color}50`, flexShrink: 0 }} />
                      }
                      <div className="lms-threshold-info">
                        <div className="lms-threshold-label">{thr.label}</div>
                        <div className="lms-threshold-sub">
                          {isKasp1Exempt ? 'KASP 1급 자격 면제 혜택 적용됨' : thr.sub}
                        </div>
                        <div className="lms-progress-track" style={{ width: 180, marginTop: 8 }}>
                          <div className="lms-progress-fill" style={{
                            width: `${isKasp1Exempt ? 100 : Math.min(effectiveSessions / thr.target, 1) * 100}%`,
                            background: met ? '#10B981' : thr.color,
                          }} />
                        </div>
                      </div>
                      <div className="lms-threshold-value" style={{ color: met ? '#10B981' : thr.color }}>
                        {isKasp1Exempt ? '면제' : `${Math.min(effectiveSessions, thr.target)} / ${thr.target}건`}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Client type note */}
              <div className="lms-info-note" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <AlertCircle size={15} color="#F59E0B" style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ color: 'rgba(255,255,255,0.45)' }}>
                  <strong style={{ color: '#F59E0B' }}>Expert 검증:</strong> Level 3 최종 인증 시 클라이언트 유형(Amateur / Elite / Professional / National)을 기준으로 프로스포츠 레퍼런스를 검증합니다.
                </span>
              </div>
            </div>
          )}

          {/* ════ CREDENTIALS TAB ════ */}
          {activeTab === 'credentials' && (
            <div>
              {/* Intro */}
              <div className="lms-kasp-intro">
                <div className="lms-kasp-intro-title">
                  <Shield size={18} />
                  외부 자격증 동등 인정 제도
                </div>
                <div className="lms-kasp-intro-desc">
                  <strong style={{ color: '#F59E0B' }}>한국스포츠심리학회 스포츠심리상담사</strong> 자격증 보유 시, 아래 매핑 기준에 따라
                  하위 필수 교육 및 경력을 자동으로 Pass 처리하고 해당 레벨을 즉시 부여합니다.
                  자격증 원본 또는 사본을 등록하시면 운영팀 검토 후 1~3 영업일 내에 처리됩니다.
                </div>
              </div>

              {/* Current registered license info */}
              {hasKasp && (
                <div className="lms-kasp-current-status" style={{
                  background: 'rgba(16,185,129,0.06)',
                  border: '1px solid rgba(16,185,129,0.2)',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  marginBottom: '20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle size={16} color="#10B981" />
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white' }}>
                        한국스포츠심리학회 스포츠심리상담사 {kaspLevel}급 등록 완료
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>
                      대체인증 규칙에 의해 터플리 {currentLevelId === 'expert' ? 'Level 3 (Expert)' : currentLevelId === 'advanced' ? 'Level 2 (Advanced)' : 'Level 1 (Basic)'} 혜택이 적용되고 있습니다.
                    </div>
                  </div>
                  <button 
                    onClick={resetKaspLicense}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(251,113,133,0.1)',
                      border: '1px solid rgba(251,113,133,0.3)',
                      color: '#FB7185',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    자격 연계 해제 (초기화)
                  </button>
                </div>
              )}

              {/* 자격증 업로드 신청 양식 */}
              <div className="lms-kasp-form-card" style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.06)',
                padding: '24px',
                borderRadius: '16px',
                marginBottom: '20px'
              }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'white', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Shield size={16} color="#F59E0B" />
                  학회 자격증 증빙서류 업로드 신청
                </h3>
                <p style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.4)', marginBottom: '20px' }}>
                  한국스포츠심리학회 스포츠심리상담사 자격증 증빙 서류를 업로드하여 인증을 신청해 주세요.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '20px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.73rem', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', fontWeight: 600 }}>자격 등급</label>
                    <select
                      value={applyLicenseLevel}
                      onChange={e => setApplyLicenseLevel(Number(e.target.value))}
                      style={{
                        width: '100%', padding: '9px 12px', background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'white',
                        fontSize: '0.82rem', outline: 'none'
                      }}
                    >
                      <option value={3} style={{ background: '#15151b' }}>3급 (Level 1 기본 인정)</option>
                      <option value={2} style={{ background: '#15151b' }}>2급 (Level 2 승급 & 10건 선 인정)</option>
                      <option value={1} style={{ background: '#15151b' }}>1급 (Level 3 최고등급 & 경력 면제)</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.73rem', color: 'rgba(255,255,255,0.4)', marginBottom: '6px', fontWeight: 600 }}>증빙 자료 파일명</label>
                    <input
                      type="text"
                      placeholder="예: kasp_license_cert_3.pdf"
                      value={applyFileName}
                      onChange={e => setApplyFileName(e.target.value)}
                      style={{
                        width: '100%', padding: '9px 14px', background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'white',
                        fontSize: '0.82rem', outline: 'none'
                      }}
                    />
                    <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', marginTop: '6px' }}>
                      실제 파일 업로드는 준비 중입니다. 파일명을 적어 제출하면 운영팀이 이메일/별도 채널로 원본을 받아 대조합니다.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    disabled={uploadingLicense}
                    onClick={() => submitLicenseApplication(applyLicenseLevel, applyFileName)}
                    className="btn-primary"
                    style={{
                      padding: '10px 24px', fontSize: '0.82rem', gap: '8px', cursor: 'pointer'
                    }}
                  >
                    {uploadingLicense ? '신청 중...' : '인증 요청 제출'}
                  </button>
                </div>
              </div>

              {/* 검토 대기 및 심사 완료 내역 리스트 */}
              {licenseApplications.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>
                    자격증 심사 신청 내역
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {licenseApplications.map(app => {
                      const badgeColor = app.status === 'approved' ? '#10B981' : app.status === 'rejected' ? '#FB7185' : '#FBBF24';
                      const badgeLabel = app.status === 'approved' ? '승인 완료' : app.status === 'rejected' ? '반려됨' : '심사 중';
                      return (
                        <div key={app.id} style={{
                          padding: '16px 20px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.04)',
                          borderRadius: '14px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                            <div>
                              <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>
                                한국스포츠심리학회 자격증 {app.licenseLevel}급 신청
                              </span>
                              <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                                파일: {app.fileUrl} &nbsp;|&nbsp; 신청일: {new Date(app.submittedAt).toLocaleDateString('ko-KR')}
                              </div>
                            </div>
                            <span style={{
                              fontSize: '0.68rem', fontWeight: 800, padding: '3px 8px', borderRadius: '6px',
                              background: `${badgeColor}15`, color: badgeColor, border: `1px solid ${badgeColor}30`
                            }}>
                              {badgeLabel}
                            </span>
                          </div>
                          
                          {/* Interactive Pipeline Stepper */}
                          <div className="status-stepper-container">
                            <div className="stepper-line-bg">
                              <div className="stepper-line-fill" style={{
                                width: app.status === 'approved' ? '100%' : app.status === 'rejected' ? '100%' : '50%',
                                background: app.status === 'approved' ? '#10B981' : app.status === 'rejected' ? '#FB7185' : '#FBBF24'
                              }} />
                            </div>
                            <div className="stepper-nodes">
                              <div className="stepper-node active">
                                <div className="stepper-node-dot">1</div>
                                <span className="stepper-node-label">신청 접수</span>
                              </div>
                              <div className={`stepper-node ${app.status !== 'pending' ? 'active' : ''}`}>
                                <div className="stepper-node-dot" style={{ background: app.status === 'rejected' ? '#FB7185' : undefined }}>2</div>
                                <span className="stepper-node-label">어드민 검토</span>
                              </div>
                              <div className={`stepper-node ${app.status === 'approved' ? 'active' : ''}`}>
                                <div className="stepper-node-dot">3</div>
                                <span className="stepper-node-label">인증 승인</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* KASP Map Cards */}
              <div className="lms-kasp-cards">
                {processedLevels.map(lv => (
                  <KaspMapCard key={lv.id} lv={lv} onApply={handleApply} />
                ))}
              </div>

              {/* Important note */}
              <div
                className="lms-info-note"
                style={{ background: 'rgba(251,113,133,0.07)', border: '1px solid rgba(251,113,133,0.18)', marginTop: 16 }}
              >
                <AlertCircle size={15} color="#FB7185" style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                  자격증 등록 후 운영팀의 수동 검토가 필요합니다. 허위 자격 등록 시 계정이 제한될 수 있습니다.
                  자격증 유효 기간 및 취소 여부를 반드시 확인 후 신청해주세요.
                </span>
              </div>
            </div>
          )}

        </div>
      </div>


      {/* ── Interview Schedule Modal ── */}
      {showInterviewModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: '#15151b', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px', padding: '28px', maxWidth: '440px', width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)'
          }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'white', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={20} className="text-teal-400" /> 마스터 위원단 면접 예약
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, marginBottom: '20px' }}>
              Level 3 Expert 등급 승급을 위해 마스터 위원단 심사 면접 날짜와 시간을 설정해 주세요.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>면접 희망 날짜</label>
                <input 
                  type="date" 
                  value={interviewDate}
                  onChange={e => setInterviewDate(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'white',
                    fontSize: '0.88rem', outline: 'none'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>면접 희망 시간대</label>
                <select
                  value={interviewTime}
                  onChange={e => setInterviewTime(e.target.value)}
                  style={{
                    width: '100%', padding: '10px 14px', background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'white',
                    fontSize: '0.88rem', outline: 'none'
                  }}
                >
                  <option value="" style={{ background: '#15151b' }}>시간대 선택</option>
                  <option value="10:00 AM" style={{ background: '#15151b' }}>오전 10:00 - 11:00</option>
                  <option value="11:00 AM" style={{ background: '#15151b' }}>오전 11:00 - 12:00</option>
                  <option value="02:00 PM" style={{ background: '#15151b' }}>오후 02:00 - 03:00</option>
                  <option value="04:00 PM" style={{ background: '#15151b' }}>오후 04:00 - 05:00</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button 
                onClick={() => setShowInterviewModal(false)}
                style={{
                  padding: '8px 16px', background: 'rgba(255,255,255,0.04)', border: 'none',
                  borderRadius: '6px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.8rem'
                }}
              >
                취소
              </button>
              <button 
                onClick={scheduleInterview}
                style={{
                  padding: '8px 20px', background: '#FB7185', border: 'none',
                  borderRadius: '6px', color: 'white', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem'
                }}
              >
                예약 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {showUploadModal && (
        <SupervisionUploadModal
          onClose={() => setShowUploadModal(false)}
          onSubmit={submitSupervisionMaterial}
          submitting={uploadingMaterial}
        />
      )}
    </div>
  );
}
