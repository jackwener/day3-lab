import { useState } from 'react'
import { BrowserRouter, Routes, Route, useLocation, useOutlet } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ConfigProvider } from 'antd'
import { goldTheme } from './styles/theme'
import { GoldProvider } from './store/GoldContext'
import MainLayout from './components/Layout/MainLayout'
import SplashScreen from './components/SplashScreen'
import Home from './pages/Home'
import GoldHome from './pages/GoldHome'
import GoldAdd from './pages/GoldAdd'
import GiftSell from './pages/GiftSell'
import Calendar from './pages/Calendar'
import Market from './pages/Market'
import Account from './pages/Account'
import Profile from './pages/Profile'

// 页面切换动画组件
function AnimatedPage() {
  const outlet = useOutlet()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{ height: '100%' }}
    >
      {outlet}
    </motion.div>
  )
}

// 带动画的路由包装器
function AnimatedRoutes() {
  const location = useLocation()

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route element={<MainLayout />}>
          <Route element={<AnimatedPage />}>
            <Route path="/" element={<Home />} />
            <Route path="/gold" element={<GoldHome />} />
            <Route path="/gold/add" element={<GoldAdd />} />
            <Route path="/gold/gift-sell" element={<GiftSell />} />
            <Route path="/gold/calendar" element={<Calendar />} />
            <Route path="/market" element={<Market />} />
            <Route path="/account" element={<Account />} />
            <Route path="/profile" element={<Profile />} />
          </Route>
        </Route>
      </Routes>
    </AnimatePresence>
  )
}

function App() {
  const [showSplash, setShowSplash] = useState(true)

  return (
    <ConfigProvider theme={goldTheme}>
      <GoldProvider>
        <BrowserRouter>
          {/* 首屏加载动画 */}
          <SplashScreen onComplete={() => setShowSplash(false)} />

          {/* 主应用内容 - splash 结束后显示 */}
          {!showSplash && <AnimatedRoutes />}
        </BrowserRouter>
      </GoldProvider>
    </ConfigProvider>
  )
}

export default App
