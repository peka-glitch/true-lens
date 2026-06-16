import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="navbar">
      <NavLink to="/app" className="navbar-brand">
        🔍 TrueLens
      </NavLink>

      <ul className="navbar-links">
        <li><NavLink to="/app" end>Dashboard</NavLink></li>
        <li><NavLink to="/app/analyze">Analyze</NavLink></li>
        <li><NavLink to="/app/history">History</NavLink></li>
      </ul>

      <div className="navbar-user">
        <NavLink to="/app/profile" className="avatar" title={user?.username}>
          {user?.username?.[0]?.toUpperCase() ?? 'U'}
        </NavLink>
        <button className="btn-logout" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  )
}
