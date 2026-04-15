import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { HomeOutlined, TrophyOutlined, PlusOutlined, AccountBookOutlined, UserOutlined } from '@ant-design/icons'
import './BottomNav.css'

interface NavItem {
  key: string
  path: string
  icon: React.ReactNode
  label: string
}

const navItems: NavItem[] = [
  { key: 'home', path: '/', icon: <HomeOutlined />, label: '动态' },
  { key: 'gold', path: '/gold', icon: <TrophyOutlined />, label: '攒金' },
  { key: 'add', path: '/gold/add', icon: <PlusOutlined />, label: '' },
  { key: 'account', path: '/account', icon: <AccountBookOutlined />, label: '记账' },
  { key: 'profile', path: '/profile', icon: <UserOutlined />, label: '我的' },
]

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-content">
        {navItems.map((item) => {
          const active = isActive(item.path)
          const isAddButton = item.key === 'add'

          if (isAddButton) {
            return (
              <motion.button
                key={item.key}
                className="nav-item nav-add-button"
                onClick={() => navigate(item.path)}
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="add-button-inner">
                  {item.icon}
                </div>
              </motion.button>
            )
          }

          return (
            <motion.button
              key={item.key}
              className={`nav-item ${active ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
              whileTap={{ scale: 0.9 }}
            >
              <motion.div
                className="nav-icon"
                animate={{
                  color: active ? '#D4A843' : 'rgba(255,255,255,0.5)',
                  scale: active ? 1.1 : 1,
                }}
                transition={{ duration: 0.2 }}
              >
                {item.icon}
              </motion.div>
              <motion.span
                className="nav-label"
                animate={{
                  color: active ? '#D4A843' : 'rgba(255,255,255,0.5)',
                }}
                transition={{ duration: 0.2 }}
              >
                {item.label}
              </motion.span>
              {active && (
                <motion.div
                  className="nav-indicator"
                  layoutId="navIndicator"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </motion.button>
          )
        })}
      </div>
    </nav>
  )
}
