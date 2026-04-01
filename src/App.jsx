import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import Home from './pages/Home'
import Service from './pages/Service'
import Portfolio from './pages/Portfolio'
import Reservation from './pages/Reservation'
import MentalTestList from './pages/MentalTestList'
import MentalTest from './pages/MentalTest'
import CounselorRecommendation from './pages/CounselorRecommendation'
import CounselorRegistration from './pages/CounselorRegistration'
import AdminCounselor from './pages/AdminCounselor'

function App() {
  return (
    <div className="app-container" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main className="main-content" style={{ flex: 1, marginTop: '1px' }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/service" element={<Service />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/reservation" element={<Reservation />} />
          <Route path="/test" element={<MentalTestList />} />
          <Route path="/test/:testId" element={<MentalTest />} />
          <Route path="/recommendation" element={<CounselorRecommendation />} />
          <Route path="/counselor-registration" element={<CounselorRegistration />} />
          <Route path="/admin/counselor" element={<AdminCounselor />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

export default App
