import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { isAdminLoggedIn } from '../../utils/adminAuth'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function AdminLoginPage() {
  const navigate = useNavigate()
  const [email,          setEmail]          = useState('')
  const [password,       setPassword]       = useState('')
  const [error,          setError]          = useState('')
  const [loading,        setLoading]        = useState(false)
  const [showPass,       setShowPass]       = useState(false)
  const [restaurantName, setRestaurantName] = useState('ร้านอาหารของเรา')

  useEffect(() => {
    if (isAdminLoggedIn()) navigate('/admin/dashboard', { replace: true })
    axios.get(`${API_BASE}/api/settings`)
      .then(res => { const name = res.data?.data?.restaurant_name; if (name) setRestaurantName(name) })
      .catch(() => {})
  }, [navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, { email, password })
      localStorage.setItem('admin_token', res.data.token)
      navigate('/admin/dashboard', { replace: true })
    } catch (err) {
      const msg = err.response?.data?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่'
      setError(msg)
      // ถ้า email ไม่ถูกต้อง → ดีดกลับหน้าแรก
      if (err.response?.status === 403) {
        setTimeout(() => navigate('/', { replace: true }), 1800)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col items-center justify-center p-6">

      {/* Decorative blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-[28rem] h-[28rem] bg-purple-600/20 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 right-10 w-40 h-40 bg-orange-500/10 rounded-full blur-2xl" />

      {/* Grid overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.03]"
           style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

      {/* Brand */}
      <div className="relative text-center mb-8">
        <div className="relative inline-flex">
          <div className="absolute inset-0 bg-indigo-500/30 blur-2xl rounded-full" />
          <div className="relative w-20 h-20 bg-white/10 backdrop-blur-xl rounded-3xl flex items-center justify-center text-5xl mx-auto shadow-2xl ring-1 ring-white/20">
            🔧
          </div>
        </div>
        <h1 className="mt-5 text-3xl font-black text-white tracking-tight drop-shadow-lg">Admin Portal</h1>
        <p className="mt-1.5 text-slate-400 text-sm font-medium">{restaurantName} · ระบบหลังบ้าน</p>
      </div>

      {/* Card */}
      <div className="relative w-full max-w-sm">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-[2rem] blur opacity-30" />

        <form
          onSubmit={handleSubmit}
          className="relative bg-slate-900/90 backdrop-blur-xl rounded-[2rem] shadow-2xl p-7 space-y-5 ring-1 ring-white/10"
        >
          <div>
            <h2 className="text-lg font-black text-white">เข้าสู่ระบบ Admin</h2>
            <p className="text-xs text-slate-400 mt-1">เฉพาะผู้ดูแลระบบที่ได้รับอนุญาตเท่านั้น</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/15 border border-red-500/30 rounded-xl px-4 py-3">
              <span className="text-lg flex-shrink-0">⚠️</span>
              <p className="text-sm text-red-300 font-bold leading-snug">{error}</p>
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>✉️</span> อีเมล
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="กรอกอีเมล Admin"
              required
              disabled={loading}
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-slate-500
                focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 focus:outline-none
                disabled:opacity-50 transition-all"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <span>🔑</span> รหัสผ่าน
            </label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="กรอกรหัสผ่าน"
                required
                disabled={loading}
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3.5 pr-12 text-sm text-white placeholder-slate-500
                  focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 focus:outline-none
                  disabled:opacity-50 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors text-base"
              >
                {showPass ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || !email || !password}
            className="group relative w-full overflow-hidden bg-gradient-to-r from-indigo-500 via-indigo-600 to-purple-600 text-white
              rounded-2xl py-4 font-black text-sm shadow-xl shadow-indigo-500/30
              active:scale-[0.98] transition-all
              disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed
              hover:shadow-2xl hover:shadow-indigo-500/40"
          >
            {!loading && (
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            )}
            <span className="relative flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  กำลังตรวจสอบ...
                </>
              ) : (
                <>🔐 เข้าสู่ระบบ</>
              )}
            </span>
          </button>

          {/* Back link */}
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors font-medium"
            >
              ← กลับหน้าหลัก
            </button>
          </div>
        </form>
      </div>

      {/* Lock note */}
      <p className="relative mt-8 text-[11px] text-slate-600 text-center font-medium flex items-center gap-1.5">
        <span>🔒</span>
        ระบบจำกัดการเข้าถึงสำหรับผู้ดูแลระบบที่ได้รับอนุญาตเท่านั้น
      </p>
    </div>
  )
}
