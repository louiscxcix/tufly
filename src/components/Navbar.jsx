import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, User } from 'lucide-react';
import { auth, googleProvider, signInWithPopup, signOut } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import './Navbar.css';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(null);
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    if (user) {
      await signOut(auth);
    } else {
      try {
        await signInWithPopup(auth, googleProvider);
      } catch (error) {
        console.error("Login failed", error);
        alert("로그인 중 오류가 발생했습니다. (Firebase API 키 설정을 확인해주세요)");
      }
    }
  };

  const toggleMenu = () => setIsOpen(!isOpen);

  const navLinks = [
    { name: '홈', path: '/' },
    { name: '상담 서비스', path: '/service' },
    { name: '포트폴리오', path: '/portfolio' },
    { name: '멘탈 검진', path: '/test' },
    { name: '맞춤 상담 추천', path: '/recommendation' },
    { name: '상담 예약', path: '/reservation' },
    { name: '상담사 등록', path: '/counselor-registration' },
    { name: 'Admin', path: '/admin/counselor' },
  ];

  return (
    <nav className="navbar glass-panel">
      <div className="navbar-container container">
        <Link to="/" className="navbar-logo">
          <img src="/logo_white.png" alt="TUFLY" className="navbar-logo-img" style={{ height: '40px', width: 'auto', display: 'block' }} />
        </Link>
        
        <div className={`nav-menu ${isOpen ? 'active' : ''}`}>
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              {link.name}
            </Link>
          ))}
          <button className="btn-primary login-btn" onClick={handleLogin}>
            {user ? (
               <div style={{ display: 'flex', alignItems: 'center' }}>
                 <img src={user.photoURL} alt="profile" style={{ width: '24px', borderRadius: '50%', marginRight: '8px' }} />
                 <span>로그아웃</span>
               </div>
            ) : (
               <div style={{ display: 'flex', alignItems: 'center' }}>
                 <User size={18} style={{ marginRight: '8px' }} />
                 <span>Google 로그인</span>
               </div>
            )}
          </button>
        </div>
        
        <button className="menu-icon" onClick={toggleMenu}>
          {isOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
