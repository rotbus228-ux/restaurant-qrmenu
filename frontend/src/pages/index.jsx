import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const API_BASE        = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const RESTAURANT_NAME = 'อร่อยจัง แซ่บเวอร์'
const TABLE_COUNT     = 10

export default function WelcomePage() {
  const [tableId,       setTableId]       = useState('')
  const [customerCount, setCustomerCount] = useState(1)
  const [tableStatuses, setTableStatuses] = useState({})  // { [tableNumber]: status }
  const [loadingTables, setLoadingTables] = useState(true)
  const navigate = useNavigate()

  /* ── โหลดสถานะโต๊ะทั้งหมด ── */
  useEffect(() => {
    axios.get(`${API_BASE}/api/tables`)
      .then(res => {
        const map = {}
        for (const t of res.data?.data ?? []) {
          map[String(t.table_number)] = t.status   // 'vacant' | 'occupied' | 'paid'
        }
        setTableStatuses(map)
      })
      .catch(() => { /* ถ้า API ล้มเหลวก็ปล่อยให้เลือกได้ทุกโต๊ะ */ })
      .finally(() => setLoadingTables(false))
  }, [])

  const isOccupied = (n) => {
    const s = tableStatuses[String(n)]
    return s === 'occupied' || s === 'paid'
  }

  const handleConfirm = async () => {
    if (!tableId || isOccupied(tableId)) return
    // ล็อกโต๊ะเป็น occupied ทันทีที่ลูกค้าเลือก
    try {
      await axios.put(`${API_BASE}/api/tables/${tableId}/status`, { status: 'occupied' })
    } catch { /* ถ้า API ล้มเหลวก็ยังนำทางต่อได้ */ }
    navigate(`/table/${tableId}`, { state: { customerCount: Number(customerCount) } })
  }

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
      <div className="relative text-center mb-10 animate-[fadeIn_0.6s_ease-out]">
        <div className="relative inline-flex">
          <div className="absolute inset-0 bg-white/30 blur-2xl rounded-full" />
          <div className="relative w-24 h-24 bg-white/25 backdrop-blur-xl rounded-3xl flex items-center justify-center text-6xl mx-auto shadow-2xl ring-1 ring-white/40 hover:scale-105 hover:rotate-3 transition-transform duration-500">
            🍜
          </div>
        </div>
        <h1 className="mt-5 text-4xl font-black text-white tracking-tight drop-shadow-lg">
          {RESTAURANT_NAME}
        </h1>
        <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm ring-1 ring-white/20">
          <span className="w-1.5 h-1.5 rounded-full bg-green-300 animate-pulse" />
          <p className="text-orange-50 text-xs font-medium tracking-wide">อาหารไทยต้นตำรับ • รสชาติจัดจ้าน</p>
        </div>
      </div>

      {/* ─── Card ─── */}
      <div className="relative w-full max-w-sm">
        {/* Card glow effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-300 to-rose-300 rounded-[2rem] blur opacity-40" />

        <div className="relative bg-white/95 backdrop-blur-xl rounded-[2rem] shadow-2xl p-7 space-y-6 ring-1 ring-white/60">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-gray-900">ยินดีต้อนรับ</h2>
              <span className="text-2xl animate-[wave_2s_ease-in-out_infinite] origin-bottom-right">🎉</span>
            </div>
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">กรุณาเลือกโต๊ะและจำนวนลูกค้าก่อนสั่งอาหาร</p>
          </div>

          {/* Table Select */}
          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
              <span className="text-base">🪑</span> หมายเลขโต๊ะ
            </label>
            <div className="relative group">
              <select
                value={tableId}
                onChange={e => setTableId(e.target.value)}
                className="w-full border-2 border-gray-200 rounded-2xl px-4 py-3.5 text-base font-bold text-gray-800 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 focus:outline-none appearance-none bg-gradient-to-br from-white to-gray-50 cursor-pointer transition-all hover:border-orange-300 hover:shadow-md"
              >
                <option value="">-- เลือกโต๊ะ --</option>
                {Array.from({ length: TABLE_COUNT }, (_, i) => i + 1).map(n => {
                  const occupied = !loadingTables && isOccupied(n)
                  return (
                    <option key={n} value={n} disabled={occupied}>
                      โต๊ะที่ {n}{occupied ? ' 🚫 มีคนใช้อยู่' : ''}
                    </option>
                  )
                })}
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-orange-500 transition-transform group-focus-within:rotate-180">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
              </div>
            </div>

            {/* Table status grid (visual) */}
            {!loadingTables && Object.keys(tableStatuses).length > 0 && (
              <div className="mt-3 grid grid-cols-5 gap-1.5">
                {Array.from({ length: TABLE_COUNT }, (_, i) => i + 1).map(n => {
                  const s = tableStatuses[String(n)]
                  const isOcc = s === 'occupied' || s === 'paid'
                  return (
                    <button
                      key={n}
                      type="button"
                      disabled={isOcc}
                      onClick={() => !isOcc && setTableId(String(n))}
                      className={`h-10 rounded-xl text-xs font-black transition-all
                        ${tableId === String(n)
                          ? 'ring-2 ring-orange-500 scale-110 shadow-lg shadow-orange-200'
                          : ''}
                        ${isOcc
                          ? 'bg-red-100 text-red-400 cursor-not-allowed opacity-70'
                          : s === 'vacant' || !s
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 cursor-pointer'
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                      {n}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Legend */}
            {!loadingTables && (
              <div className="mt-2 flex gap-3 text-[10px] text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-100 border border-emerald-300" />ว่าง</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-100 border border-red-300" />มีคนใช้อยู่</span>
              </div>
            )}
          </div>

          {/* Customer Count */}
          <div>
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
              <span className="text-base">👥</span> จำนวนลูกค้า (คน)
            </label>
            <div className="flex items-center gap-3 bg-gradient-to-br from-gray-50 to-gray-100 p-2 rounded-2xl">
              <button
                type="button"
                onClick={() => setCustomerCount(c => Math.max(1, c - 1))}
                className="w-12 h-12 rounded-xl bg-white text-gray-700 text-2xl font-black flex items-center justify-center active:scale-90 hover:bg-orange-50 hover:text-orange-600 transition-all shadow-sm select-none ring-1 ring-gray-200"
              >
                −
              </button>
              <input
                type="number"
                min={1}
                max={20}
                value={customerCount}
                onChange={e => setCustomerCount(Math.max(1, Number(e.target.value) || 1))}
                className="flex-1 bg-transparent border-0 px-3 py-2.5 text-center text-3xl font-black text-gray-900 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => setCustomerCount(c => Math.min(20, c + 1))}
                className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white text-2xl font-black flex items-center justify-center active:scale-90 hover:shadow-lg hover:shadow-orange-300 transition-all shadow-md select-none"
              >
                +
              </button>
            </div>
          </div>

          {/* Confirm */}
          <button
            onClick={handleConfirm}
            disabled={!tableId || isOccupied(tableId)}
            className="group relative w-full overflow-hidden bg-gradient-to-r from-orange-500 via-orange-600 to-rose-500 text-white rounded-2xl py-4 font-black text-base shadow-xl shadow-orange-400/40 active:scale-[0.98] transition-all disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed disabled:shadow-none hover:shadow-2xl hover:shadow-orange-400/50"
          >
            {tableId && !isOccupied(tableId) && (
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            )}
            <span className="relative flex items-center justify-center gap-2">
              {isOccupied(tableId) ? (
                <>🚫 โต๊ะนี้มีคนใช้อยู่แล้ว</>
              ) : tableId ? (
                <>
                  <span>เข้าสู่เมนูโต๊ะที่ {tableId}</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                </>
              ) : (
                <>⬆️ กรุณาเลือกโต๊ะก่อนนะคะ</>
              )}
            </span>
          </button>
        </div>
      </div>

      {/* ─── Admin link ─── */}
      <div className="relative mt-10 flex gap-3 flex-wrap justify-center">
        <a href="/admin/login" className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md ring-1 ring-white/20 text-white/80 text-sm font-medium hover:bg-white/20 hover:text-white transition-all">
          <span>🔧</span>
          <span>Admin Dashboard</span>
          <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
        </a>
        <a href="/admin/login" className="group inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md ring-1 ring-white/20 text-white/80 text-sm font-medium hover:bg-white/20 hover:text-white transition-all">
          <span>🪑</span>
          <span>สถานะโต๊ะ</span>
          <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7"/></svg>
        </a>
      </div>

      {/* ─── Inline keyframes ─── */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes wave   { 0%,60%,100% { transform: rotate(0deg); } 10%,30% { transform: rotate(14deg); } 20% { transform: rotate(-8deg); } 40% { transform: rotate(-4deg); } 50% { transform: rotate(10deg); } }
      `}</style>
    </div>
  )
}
