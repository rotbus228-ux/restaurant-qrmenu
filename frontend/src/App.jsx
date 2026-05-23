import { BrowserRouter, Routes, Route } from 'react-router-dom'
import WelcomePage          from './pages/index'
import TablePage            from './pages/client/[table_id]'
import AdminDashboard       from './pages/admin/dashboard'
import MenuManage           from './pages/admin/menu-manage'
import TableDashboard       from './pages/admin/tables'
import AdminLoginPage       from './pages/admin/login'
import AdminProtectedRoute  from './components/AdminProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── หน้าต้อนรับ / เลือกโต๊ะ ── */}
        <Route path="/" element={<WelcomePage />} />

        {/* ── Client: หน้าสั่งอาหาร ── */}
        <Route path="/table/:tableId" element={<TablePage />} />

        {/* ── Admin Login ── */}
        <Route path="/admin/login" element={<AdminLoginPage />} />

        {/* ── Admin (Protected) ── */}
        <Route path="/admin" element={
          <AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>
        } />
        <Route path="/admin/dashboard" element={
          <AdminProtectedRoute><AdminDashboard /></AdminProtectedRoute>
        } />
        <Route path="/admin/menu" element={
          <AdminProtectedRoute><MenuManage /></AdminProtectedRoute>
        } />
        <Route path="/admin/tables" element={
          <AdminProtectedRoute><TableDashboard /></AdminProtectedRoute>
        } />

        {/* ── 404 ── */}
        <Route path="*" element={
          <div className="flex items-center justify-center min-h-screen text-gray-400 bg-gray-50">
            <div className="text-center space-y-3">
              <p className="text-7xl">🍽️</p>
              <p className="text-2xl font-bold text-gray-600">404</p>
              <p className="text-gray-400">ไม่พบหน้าที่ต้องการ</p>
              <a href="/" className="inline-block mt-2 px-4 py-2 bg-orange-500 text-white rounded-xl text-sm font-medium">
                กลับหน้าหลัก
              </a>
            </div>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  )
}
