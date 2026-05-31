import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function LandingPage() {
  const navigate = useNavigate()
  const [restaurantName, setRestaurantName] = useState('ร้านอาหารของเรา')

  useEffect(() => {
    axios.get(`${API_BASE}/api/settings`)
      .then(res => {
        const name = res.data?.data?.restaurant_name
        if (name) setRestaurantName(name)
      })
      .catch(() => {})
  }, [])

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-amber-400 via-orange-500 to-rose-600 flex flex-col items-center justify-center p-6">

      {/* ─── Decorative Blobs ─── */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 bg-yellow-300/30 rounded-full blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-[28rem] h-[28rem] bg-rose-400/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="pointer-events-none absolute top-1/3 right-10 w-40 h-40 bg-orange-200/20 rounded-full blur-2xl" />

      {/* Subtle grid pattern overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04]"
           style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

      {/* ─── Brand ─── */}
      <div className="relative text-center mb-12 animate-[fadeIn_0.6s_ease-out]">
        <div className="relative inline-flex">
          <div className="absolute inset-0 bg-white/30 blur-2xl rounded-full" />
          <div className="relative w-28 h-28 bg-white/25 backdrop-blur-xl rounded-3xl flex items-center justify-center text-7xl mx-auto shadow-2xl ring-1 ring-white/40 hover:scale-105 hover:rotate-3 transition-transform duration-500">
            🍜
          </div>
        </div>
        <h1 className="mt-6 text-4xl sm:text-5xl font-black text-white tracking-tight drop-shadow-lg">
          {restaurantName}
        </h1>
        <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
          <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
          <p className="text-orange-50 text-sm font-medium tracking-wide">อาหารไทยต้นตำรับ • รสชาติจัดจ้าน</p>
        </div>
      </div>

      {/* ─── Question ─── */}
      <div className="relative text-center mb-8 animate-[fadeIn_0.8s_ease-out]">
        <h2 className="text-2xl sm:text-3xl font-black text-white drop-shadow-md">
          คุณต้องการทานแบบไหนคะ? 🤔
        </h2>
        <p className="mt-2 text-orange-50/90 text-sm">เลือกประเภทบริการเพื่อเริ่มสั่งอาหาร</p>
      </div>

      {/* ─── 2 Buttons ─── */}
      <div className="relative w-full max-w-md grid grid-cols-1 sm:grid-cols-2 gap-5 animate-[fadeIn_1s_ease-out]">

        {/* ── ทานที่ร้าน ── */}
        <button
          onClick={() => navigate('/dine-in')}
          className="group relative bg-white rounded-3xl p-6 shadow-2xl ring-1 ring-white/40 hover:scale-105 active:scale-95 transition-all duration-300 overflow-hidden"
        >
          {/* Card glow */}
          <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-amber-50 opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="relative flex flex-col items-center text-center space-y-3">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center text-5xl shadow-lg shadow-orange-300/40 group-hover:rotate-6 transition-transform">
              🍽️
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900">ทานที่ร้าน</h3>
              <p className="text-xs text-gray-500 mt-1 leading-snug">นั่งทานในร้าน<br />สั่งจากโต๊ะ</p>
            </div>
            <div className="inline-flex items-center gap-1 text-orange-600 font-bold text-sm pt-1 group-hover:gap-2 transition-all">
              <span>เลือกโต๊ะ</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
            </div>
          </div>
        </button>

        {/* ── ใส่กล่องกลับบ้าน ── */}
        <button
          onClick={() => navigate('/takeaway')}
          className="group relative bg-white rounded-3xl p-6 shadow-2xl ring-1 ring-white/40 hover:scale-105 active:scale-95 transition-all duration-300 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 to-teal-50 opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="relative flex flex-col items-center text-center space-y-3">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-5xl shadow-lg shadow-emerald-300/40 group-hover:rotate-6 transition-transform">
              🥡
            </div>
            <div>
              <h3 className="text-xl font-black text-gray-900">ใส่กล่องกลับบ้าน</h3>
              <p className="text-xs text-gray-500 mt-1 leading-snug">สั่งกลับบ้าน<br />รอรับที่ร้าน</p>
            </div>
            <div className="inline-flex items-center gap-1 text-emerald-600 font-bold text-sm pt-1 group-hover:gap-2 transition-all">
              <span>เริ่มสั่ง</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
            </div>
          </div>
        </button>
      </div>

      {/* ─── Info banner ─── */}
      <div className="relative mt-10 max-w-md w-full">
        <div className="bg-white/10 backdrop-blur-md rounded-2xl px-5 py-4 ring-1 ring-white/20 flex items-center gap-3">
          <div className="text-3xl">✨</div>
          <div className="flex-1">
            <p className="text-white font-bold text-sm">สั่งง่าย รวดเร็ว สะดวก</p>
            <p className="text-orange-50/80 text-xs mt-0.5">ระบบรับออเดอร์อัตโนมัติ ตรงถึงครัวทันที</p>
          </div>
        </div>
      </div>

      {/* ─── Admin link ─── */}
      <div className="relative mt-8 flex gap-3 flex-wrap justify-center">
        <a href="/admin/login" className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md ring-1 ring-white/20 text-white/80 text-xs font-medium hover:bg-white/20 hover:text-white transition-all">
          <span>🔧</span>
          <span>Admin Dashboard</span>
        </a>
        <a href="/admin/tables" className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md ring-1 ring-white/20 text-white/80 text-xs font-medium hover:bg-white/20 hover:text-white transition-all">
          <span>🪑</span>
          <span>สถานะโต๊ะ</span>
        </a>
      </div>

      {/* ─── Inline keyframes ─── */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
