import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import axios from 'axios'
import { adminLogout } from '../../utils/adminAuth'

const API_BASE   = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'

/* ─── สีและป้ายตามสถานะ ──────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  vacant: {
    label:     'ว่าง',
    labelEn:   'Available',
    icon:      '✅',
    cardBg:    'bg-gradient-to-br from-emerald-50 to-green-50',
    cardBorder:'border-emerald-200',
    cardRing:  'ring-emerald-300/40',
    badgeBg:   'bg-emerald-500',
    badgeText: 'text-white',
    dot:       'bg-emerald-400',
    glow:      'shadow-emerald-200/60',
    numColor:  'text-emerald-700',
  },
  occupied: {
    label:     'กำลังใช้งาน',
    labelEn:   'Occupied',
    icon:      '🍽️',
    cardBg:    'bg-gradient-to-br from-amber-50 to-orange-50',
    cardBorder:'border-amber-300',
    cardRing:  'ring-amber-300/40',
    badgeBg:   'bg-amber-500',
    badgeText: 'text-white',
    dot:       'bg-amber-400 animate-pulse',
    glow:      'shadow-amber-200/60',
    numColor:  'text-amber-700',
  },
  paid: {
    label:     'จ่ายเงินแล้ว',
    labelEn:   'Paid',
    icon:      '💳',
    cardBg:    'bg-gradient-to-br from-blue-50 to-sky-50',
    cardBorder:'border-blue-300',
    cardRing:  'ring-blue-300/40',
    badgeBg:   'bg-blue-500',
    badgeText: 'text-white',
    dot:       'bg-blue-400 animate-pulse',
    glow:      'shadow-blue-200/60',
    numColor:  'text-blue-700',
  },
}

/* ─── TableCard ──────────────────────────────────────────────────────────── */
function TableCard({ table, onClear, onSetStatus, clearing }) {
  const cfg = STATUS_CONFIG[table.status] ?? STATUS_CONFIG.vacant

  return (
    <div
      className={`relative flex flex-col rounded-3xl border-2 shadow-lg p-4 transition-all duration-300
        ${cfg.cardBg} ${cfg.cardBorder} ${cfg.glow}
        hover:shadow-xl hover:-translate-y-0.5`}
    >
      {/* Status dot */}
      <span className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${cfg.dot}`} />

      {/* Table number */}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-2xl">{cfg.icon}</span>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-stone-400">โต๊ะ</p>
          <p className={`text-2xl font-black leading-none ${cfg.numColor}`}>{table.table_number}</p>
        </div>
      </div>

      {/* Status badge */}
      <span className={`self-start text-[10px] font-black px-2.5 py-1 rounded-full mb-2 ${cfg.badgeBg} ${cfg.badgeText}`}>
        {cfg.label}
      </span>

      {/* Customers */}
      {table.current_customers > 0 && (
        <p className="text-xs text-stone-500 font-semibold mb-1">
          👥 {table.current_customers} คน
        </p>
      )}

      {/* Admin buttons */}
      <div className="mt-auto pt-3 space-y-2">
        {/* Clear table — แสดงเมื่อสถานะเป็น paid */}
        {table.status === 'paid' && (
          <button
            onClick={() => onClear(table.id)}
            disabled={clearing === table.id}
            className="w-full py-2 rounded-2xl bg-gradient-to-r from-blue-500 to-sky-500
              hover:shadow-lg hover:shadow-blue-200 text-white text-xs font-black
              disabled:opacity-50 transition-all active:scale-95"
          >
            {clearing === table.id ? '⏳...' : '🧹 เคลียร์โต๊ะ'}
          </button>
        )}

        {/* Manual status selector */}
        <div className="relative">
          <select
            value={table.status}
            onChange={e => onSetStatus(table.id, e.target.value)}
            className="w-full border border-stone-200 rounded-2xl px-3 py-2 text-xs font-bold
              bg-white/80 appearance-none cursor-pointer focus:outline-none
              focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-all"
          >
            <option value="vacant">✅ ว่าง</option>
            <option value="occupied">🍽️ กำลังใช้งาน</option>
            <option value="paid">💳 จ่ายเงินแล้ว</option>
          </select>
          <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-stone-400"
            fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
      </div>
    </div>
  )
}

/* ─── Main ───────────────────────────────────────────────────────────────── */
export default function TableDashboard() {
  const navigate = useNavigate()
  const logout   = () => { adminLogout(); navigate('/', { replace: true }) }

  const [tables,    setTables]    = useState([])
  const [loading,   setLoading]   = useState(true)
  const [connected, setConnected] = useState(false)
  const [clearing,  setClearing]  = useState(null)  // table.id ที่กำลัง clear
  const [toast,     setToast]     = useState(null)
  const socketRef = useRef(null)

  /* ── Load tables ── */
  const loadTables = async () => {
    try {
      const res = await axios.get(`${API_BASE}/api/tables`)
      setTables(res.data?.data ?? [])
    } catch (err) {
      console.error('[TableDashboard] loadTables', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTables() }, [])

  /* ── Socket ── */
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect',    () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('table_status_update', ({ table_id, status, current_customers }) => {
      setTables(prev => prev.map(t =>
        t.id === table_id
          ? {
              ...t,
              status,
              current_customers: current_customers !== undefined ? current_customers : t.current_customers,
            }
          : t
      ))
    })

    return () => socket.disconnect()
  }, [])

  /* ── Admin: clear table ── */
  const handleClear = async (tableId) => {
    setClearing(tableId)
    try {
      await axios.put(`${API_BASE}/api/tables/${tableId}/status`, { status: 'vacant' })
      showToast('🧹 เคลียร์โต๊ะเรียบร้อย', 'success')
    } catch {
      showToast('❌ เคลียร์โต๊ะไม่สำเร็จ', 'error')
    } finally {
      setClearing(null)
    }
  }

  /* ── Admin: set status manually ── */
  const handleSetStatus = async (tableId, status) => {
    try {
      await axios.put(`${API_BASE}/api/tables/${tableId}/status`, { status })
      showToast(`✅ เปลี่ยนสถานะเป็น "${STATUS_CONFIG[status]?.label}" แล้ว`, 'success')
    } catch {
      showToast('❌ เปลี่ยนสถานะไม่สำเร็จ', 'error')
    }
  }

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2800)
  }

  /* ── Summary counts ── */
  const counts = tables.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-sky-50/20 pb-10">

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-5 py-3.5 rounded-2xl shadow-2xl
          text-sm font-black text-white backdrop-blur-xl ring-1 animate-[slideDown_0.3s_ease-out]
          ${toast.type === 'success'
            ? 'bg-gradient-to-r from-emerald-500 to-green-500 ring-emerald-300/50'
            : 'bg-gradient-to-r from-rose-500 to-red-500 ring-rose-300/50'}`}>
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <header className="relative bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900
        text-white shadow-xl sticky top-0 z-30 overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />

        <div className="relative max-w-5xl mx-auto px-5 py-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/15 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl
              shadow-lg ring-1 ring-white/20">🪑</div>
            <div>
              <h1 className="text-lg font-black">สถานะโต๊ะ Real-time</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-white/30'}`} />
                <p className="text-slate-300 text-xs">{connected ? 'ออนไลน์ · อัปเดตอัตโนมัติ' : 'กำลังเชื่อมต่อ...'}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link to="/admin/dashboard"
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20
                backdrop-blur-md ring-1 ring-white/20 rounded-xl text-xs font-black transition-all">
              ← Dashboard
            </Link>
            <Link to="/admin/menu"
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20
                backdrop-blur-md ring-1 ring-white/20 rounded-xl text-xs font-black transition-all">
              🍽️ เมนู
            </Link>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-200 ring-1 ring-red-400/30 rounded-xl text-xs font-black transition-all"
              title="ออกจากระบบ"
            >
              🔓 <span className="hidden sm:inline">ออก</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* ── Summary strip ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { key: 'vacant',   label: 'ว่าง',           icon: '✅', from: 'from-emerald-500', to: 'to-green-500'  },
            { key: 'occupied', label: 'กำลังใช้งาน',    icon: '🍽️', from: 'from-amber-500',  to: 'to-orange-500' },
            { key: 'paid',     label: 'จ่ายเงินแล้ว',   icon: '💳', from: 'from-blue-500',   to: 'to-sky-500'    },
          ].map(s => (
            <div key={s.key}
              className={`relative overflow-hidden bg-gradient-to-br ${s.from} ${s.to}
                rounded-2xl p-4 text-white shadow-lg`}>
              <div className="absolute -right-4 -bottom-4 text-6xl opacity-20">{s.icon}</div>
              <p className="text-2xl font-black">{counts[s.key] ?? 0}</p>
              <p className="text-xs font-bold opacity-90">{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── Legend ── */}
        <div className="flex flex-wrap gap-2 text-xs">
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
            <span key={key} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full
              border ${cfg.cardBorder} ${cfg.cardBg} font-bold text-stone-700`}>
              <span className={`w-2 h-2 rounded-full ${cfg.dot.replace('animate-pulse','')}`} />
              {cfg.icon} {cfg.label}
            </span>
          ))}
        </div>

        {/* ── Grid ── */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-44 bg-white rounded-3xl animate-pulse border border-slate-100 shadow-sm" />
            ))}
          </div>
        ) : tables.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
            <p className="text-5xl mb-3">🪑</p>
            <p className="font-black text-slate-600">ไม่พบข้อมูลโต๊ะ</p>
            <p className="text-xs text-slate-400 mt-1">ตรวจสอบว่า Backend และ MySQL เปิดอยู่</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {tables.map(table => (
              <TableCard
                key={table.id}
                table={table}
                onClear={handleClear}
                onSetStatus={handleSetStatus}
                clearing={clearing}
              />
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideDown { from { opacity:0; transform:translateY(-12px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </div>
  )
}
