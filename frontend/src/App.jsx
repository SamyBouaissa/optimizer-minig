import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Minerals from './pages/Minerals'
import Alloys from './pages/Alloys'
import Calculator from './pages/Calculator'

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/minerals" element={<Minerals />} />
          <Route path="/alloys" element={<Alloys />} />
          <Route path="/calculator" element={<Calculator />} />
        </Routes>
      </Layout>
    </Router>
  )
}

export default App
