import { useEffect, useRef } from 'react'
import './index.css'

interface Particle {
  x: number
  y: number
  size: number
  speedY: number
  speedX: number
  opacity: number
  phase: number
}

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // 设置 canvas 尺寸
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // 初始化粒子
    const particleCount = 20
    particlesRef.current = []

    for (let i = 0; i < particleCount; i++) {
      particlesRef.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        size: 1 + Math.random() * 2,
        speedY: 0.3 + Math.random() * 0.5,
        speedX: (Math.random() - 0.5) * 0.3,
        opacity: 0.2 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2
      })
    }

    // 动画循环
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particlesRef.current.forEach((particle) => {
        // 更新位置
        particle.y -= particle.speedY
        particle.phase += 0.02
        const sway = Math.sin(particle.phase) * 0.5

        // 到达顶部后从底部重新出现
        if (particle.y < -10) {
          particle.y = canvas.height + 10
          particle.x = Math.random() * canvas.width
        }

        // 绘制粒子
        ctx.beginPath()
        ctx.arc(
          particle.x + sway,
          particle.y,
          particle.size,
          0,
          Math.PI * 2
        )
        ctx.fillStyle = `rgba(212, 168, 67, ${particle.opacity})`
        ctx.fill()

        // 添加微弱光晕
        ctx.beginPath()
        ctx.arc(
          particle.x + sway,
          particle.y,
          particle.size * 2,
          0,
          Math.PI * 2
        )
        const gradient = ctx.createRadialGradient(
          particle.x + sway,
          particle.y,
          0,
          particle.x + sway,
          particle.y,
          particle.size * 3
        )
        gradient.addColorStop(0, `rgba(212, 168, 67, ${particle.opacity * 0.3})`)
        gradient.addColorStop(1, 'rgba(212, 168, 67, 0)')
        ctx.fillStyle = gradient
        ctx.fill()
      })

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      cancelAnimationFrame(animationRef.current)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="particle-background"
      aria-hidden="true"
    />
  )
}
