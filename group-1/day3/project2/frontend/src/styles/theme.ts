import type { ThemeConfig } from 'antd'

export const goldTheme: ThemeConfig = {
  token: {
    colorPrimary: '#D4A843',
    colorBgBase: '#0f0f1a',
    colorTextBase: '#ffffff',
    colorBgContainer: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    colorBorder: 'rgba(212,168,67,0.2)',
    colorLink: '#D4A843',
    fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
  components: {
    Button: {
      colorPrimary: '#D4A843',
      algorithm: true,
    },
    Card: {
      colorBgContainer: 'rgba(255,255,255,0.05)',
    },
    Input: {
      colorBgContainer: 'rgba(255,255,255,0.08)',
      colorBorder: 'rgba(212,168,67,0.3)',
    },
    Select: {
      colorBgContainer: 'rgba(255,255,255,0.08)',
    },
    DatePicker: {
      colorBgContainer: 'rgba(255,255,255,0.08)',
    }
  }
}
