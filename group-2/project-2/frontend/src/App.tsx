import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import AppLayout from './components/AppLayout'
import DiagnosisPage from './pages/DiagnosisPage'
import MarketPage from './pages/MarketPage'
import InsightsPage from './pages/InsightsPage'
import WatchlistPage from './pages/WatchlistPage'

function App() {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 8,
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/diagnosis" element={<DiagnosisPage />} />
            <Route path="/market" element={<MarketPage />} />
            <Route path="/insights" element={<InsightsPage />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
            <Route path="*" element={<Navigate to="/diagnosis" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
