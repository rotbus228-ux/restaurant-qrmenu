import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

export default function TakeawayPage() {
  const navigate = useNavigate()
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [pax, setPax] = useState(1)
  const [restaurantName, setRestaurantName] = useState('ร้านอาหารของเรา')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    axios.get(`${API_BASE}/api/settings`)
      .then(res => {
        const name = res.data?.data?.restaurant_name
        if (name) setRestaurantName(name)
      })
      .catch(() => {})
  }, [])

  const handleStart = () => {
    if (!customerName.trim() || !phone.trim()) return
    // เก็บข้อมูล takeaway customer ไว้ใน sessionStorage เพื่อให้หน้าเมนูใช้
    sessionStorage.setItem('takeaway_info', JSON.stringify({
      name: customerName.trim(),
      phone: phone.trim(),
      pax: Number(pax),
      type: 'takeaway',
      createdAt: new Date().toISOString(),
    }))
    // ใช้ table_id แบบพิเศษ "takeaway" เพื่อให้ระบบเดิมรู้ว่าเป็นกล่องกลับบ้าน
    navigate('/table/takeaway', { state: { customerCount: Number(pax), takeaway: true, name: customerName, phone } })
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 flex flex-col items-center justify-center p-6">

      {/* Decorative */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 bg-emerald-300/30 rounded-full blur-3xl animate-pulse" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 w-[28rem] h-[28rem] bg-teal-400/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />

      {/* Back btn */}
      <button
        onClick={() => navigate('/')}
        className="absolute top-5 left-5 inline-flex items-center gap-1 px-3 py-2 rounded-full bg-white/15 backdrop-blur-md ring-1 ring-white/20 text-white text-xs font-bold hover:bg-white/25 transition-all"
      >
        ← กลับ
      </button>

      {/* Brand */}
      <div className="relative text-center mb-8 animate-[fadeIn_0.6s_ease-out]">
        <div className="relative inline-flex">
          <div className="absolute inset-0 bg-white/30 blur-2xl rounded-full" />
          <div className="relative w-24 h-24 bg-white/25 backdrop-blur-xl rounded-3xl flex items-center justify-center text-6xl mx-auto shadow-2xl ring-1 ring-white/40">
            🥡
          </div>
        </div>
        <h1 className="mt-5 text-3xl font-black text-white tracking-tight drop-shadow-lg">
          ใส่กล่องกลับบ้าน
        </h1>
        <p className="mt-2 text-emerald-50/90 text-sm">{restaurantName}</p>
      </div>

      {/* Card */}
      <div className="relative w-full max-w-sm">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-300 to-teal-300 rounded-[2rem] blur opacity-40" />

        <div className="relative bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl p-7 space-y-5 ring-1 ring-white/60">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-gray-900">ข้อมูลผู้สั่ง</h2>
              <span className="text-2xl">📝</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">กรอกข้อมูลเพื่อสั่งอาหารกลับบ้าน</p>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
              <span className="text-base">👤</span> ชื่อผู้สั่ง
            </label>
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="กรอกชื่อของคุณ"
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base font-bold text-gray-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 focus:outline-none bg-gradient-to-br from-white to-gray-50 transition-all hover:border-emerald-300"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
              <span className="text-base">📱</span> เบอร์โทรศัพท์
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 10))}
              placeholder="08x-xxx-xxxx"
              className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base font-bold text-gray-800 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 focus:outline-none bg-gradient-to-br from-white to-gray-50 transition-all hover:border-emerald-300"
            />
          </div>

          {/* Pax */}
          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
              <span className="text-base">👥</span> จำนวนคน
            </label>
            <div className="flex items-center gap-3 bg-gradient-to-br from-gray-50 to-gray-100 p-2 rounded-2xl">
              <button
                type="button"
                onClick={() => setPax(c => Math.max(1, c - 1))}
                className="w-12 h-12 rounded-xl bg-white text-gray-700 text-2xl font-black flex items-center justify-center active:scale-90 hover:bg-emerald-50 hover:text-emerald-600 transition-all shadow-sm select-none ring-1 ring-gray-200"
              >
                −
              </button>
              <div className="flex-1 text-center text-3xl font-black text-gray-900">{pax}</div>
              <button
                type="button"
                onClick={() => setPax(c => Math.min(20, c + 1))}
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white text-2xl font-black flex items-center justify-center active:scale-90 hover:shadow-lg hover:shadow-emerald-300 transition-all shadow-md select-none"
              >
                +
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            onClick={handleStart}
            disabled={!customerName.trim() || !phone.trim() || submitting}
            className="group relative w-full overflow-hidden bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-500 text-white rounded-2xl py-4 font-black text-base shadow-xl shadow-emerald-400/40 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-2xl"
          >
            <span className="relative flex items-center justify-center gap-2">
              <span>🍱 เริ่มสั่งอาหาร</span>
              <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
            </span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  )
}
