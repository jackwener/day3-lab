import { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import LoginPage from './components/LoginPage'
import MainApp from './components/MainApp'
import { getUser, saveUser, clearUser } from './utils/storage'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState(null)

  useEffect(() => {
    // 检查localStorage中是否有用户信息
    const savedUser = getUser()
    if (savedUser) {
      setUser(savedUser)
      setIsLoggedIn(true)
    }
  }, [])

  const handleLogin = (userData) => {
    saveUser(userData)
    setUser(userData)
    setIsLoggedIn(true)
  }

  const handleLogout = () => {
    clearUser()
    setUser(null)
    setIsLoggedIn(false)
  }

  return (
    <AnimatePresence mode="wait">
      {!isLoggedIn ? (
        <motion.div
          key="login"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <LoginPage onLogin={handleLogin} />
        </motion.div>
      ) : (
        <motion.div
          key="main"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <MainApp user={user} onLogout={handleLogout} />
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default App
