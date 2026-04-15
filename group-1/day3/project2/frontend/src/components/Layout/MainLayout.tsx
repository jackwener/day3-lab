import { Outlet } from 'react-router-dom'
import BottomNav from './BottomNav'
import ParticleBackground from '../ParticleBackground'
import './MainLayout.css'

export default function MainLayout() {
  return (
    <div className="mobile-container">
      {/* 金色粒子背景 */}
      <ParticleBackground />

      <main className="main-content">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  )
}
