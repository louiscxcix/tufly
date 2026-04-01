import './Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="container footer-container">
        <div className="footer-brand">
          <h2 className="text-gradient-primary">TUFLY</h2>
          <p>스포츠 심리상담의 새로운 기준</p>
        </div>
        <div className="footer-contact">
          <h4>Contact Us</h4>
          <p>Email: tuflyofficial@gmail.com</p>
          <p>Tel: 010-6802-3488</p>
          <p>주소: 인천광역시 미추홀구 인하로 100, 인하대학교 서호관 106호</p>
        </div>
        <div className="footer-links">
          <h4>바로가기</h4>
          <ul>
            <li><a href="/service">서비스 소개</a></li>
            <li><a href="/portfolio">포트폴리오</a></li>
            <li><a href="/reservation">상담 예약</a></li>
          </ul>
        </div>
      </div>
      <div className="footer-bottom text-center">
        <p>&copy; {new Date().getFullYear()} Tufly. All Rights Reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
