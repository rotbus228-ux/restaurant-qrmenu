import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { io } from 'socket.io-client'
import axios from 'axios'
import { getAuthHeaders, adminLogout, handleAuthError } from '../../utils/adminAuth'

const _BASE      = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const API_BASE   = `${_BASE}/api`
const SOCKET_URL = _BASE

/* ─────────────────────────────────────────────────────────────────────────────
   Helpers
───────────────────────────────────────────────────────────────────────────── */
function elapsed(dateStr) {
  if (!dateStr) return ''
  const mins = Math.floor((Date.now() - new Date(dateStr)) / 60000)
  if (mins < 1)  return 'เพิ่งสั่ง'
  if (mins < 60) return `${mins} นาทีที่แล้ว`
  return `${Math.floor(mins / 60)} ชม. ${mins % 60} นาที`
}

function playAlert() {
  try {
    const ctx  = new (window.AudioContext || window.webkitAudioContext)()
    const play = (freq, start, dur) => {
      const osc  = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.35, ctx.currentTime + start)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + dur)
    }
    play(880, 0,    0.12)
    play(1100, 0.15, 0.12)
    play(1320, 0.30, 0.18)
  } catch (_) {}
}

/* ─────────────────────────────────────────────────────────────────────────────
   Column config
───────────────────────────────────────────────────────────────────────────── */
const COLUMNS = [
  { status: 'pending',   label: 'รอดำเนินการ',  icon: '🔔', dot: 'bg-orange-400',  headerBg: 'from-orange-500 to-amber-500',   accent: 'orange',  pulse: true  },
  { status: 'preparing', label: 'กำลังทำ',      icon: '🍳', dot: 'bg-sky-400',     headerBg: 'from-sky-500 to-indigo-500',     accent: 'sky',     pulse: false },
  { status: 'serving',   label: 'กำลังเสิร์ฟ',  icon: '🚶', dot: 'bg-violet-400',  headerBg: 'from-violet-500 to-fuchsia-500', accent: 'violet',  pulse: false },
  { status: 'served',    label: 'เสิร์ฟแล้ว',   icon: '🍽️', dot: 'bg-emerald-400', headerBg: 'from-emerald-500 to-teal-500',   accent: 'emerald', pulse: false },
]

const NEXT_ACTIONS = {
  pending:   [{ next: 'preparing', label: '🍳 เริ่มทำอาหาร',   primary: true  }, { next: 'cancelled', label: 'ยกเลิก', primary: false }],
  preparing: [{ next: 'serving',   label: '🚶 กำลังไปเสิร์ฟ', primary: true  }],
  serving:   [{ next: 'served',    label: '🍽️ เสิร์ฟแล้ว',    primary: true  }],
  served:    [{ next: 'completed', label: '✅ เช็กบิล',         primary: true  }],
}

/* ─────────────────────────────────────────────────────────────────────────────
   OrderCard — พร้อม Live Timer + Note display
───────────────────────────────────────────────────────────────────────────── */
function OrderCard({ order, isNew, onAction, isLoading }) {
  const [waitMins, setWaitMins] = useState(
    () => Math.floor((Date.now() - new Date(order.created_at)) / 60000)
  )

  useEffect(() => {
    const id = setInterval(() => {
      setWaitMins(Math.floor((Date.now() - new Date(order.created_at)) / 60000))
    }, 30000)
    return () => clearInterval(id)
  }, [order.created_at])

  /* ── Urgency thresholds: 5min = yellow, 10min = red+pulse ── */
  const urgency = waitMins >= 10 ? 'critical' : waitMins >= 5 ? 'warning' : 'normal'

  const cardStyle = {
    normal:   'bg-white border-l-4 border-orange-300',
    warning:  'bg-yellow-50 border-l-4 border-yellow-400 ring-1 ring-yellow-200/60',
    critical: 'bg-red-50 border-l-4 border-red-500 ring-2 ring-red-300/60 animate-pulse',
  }[urgency]

  const timerStyle = {
    normal:   'bg-emerald-100 text-emerald-700',
    warning:  'bg-yellow-200 text-yellow-800',
    critical: 'bg-red-200 text-red-800',
  }[urgency]

  const timerIcon = urgency === 'critical' ? '🔥' : urgency === 'warning' ? '⏰' : '⏱'

  const timerLabel =
    waitMins < 1  ? 'เพิ่งสั่ง' :
    waitMins < 60 ? `${waitMins} นาที` :
                    `${Math.floor(waitMins / 60)}ชม. ${waitMins % 60}น.`

  const actions = NEXT_ACTIONS[order.status] || []

  return (
    <div className={`relative rounded-2xl p-4 shadow-md mb-3 transition-all duration-500 ${cardStyle} ${isNew ? 'ring-2 ring-orange-400 ring-offset-2 ring-offset-slate-900' : ''}`}>

      {/* Card header */}
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-base font-black text-slate-900 bg-slate-900/5 px-2 py-0.5 rounded-lg">
              🪑 โต๊ะ {order.table_number ?? order.table_id}
            </span>
            {isNew && (
              <span className="bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-bounce shadow-md">ใหม่!</span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 mt-1 font-medium">
            #{order.id ?? '–'} · {order.customer_count ? `${order.customer_count} คน · ` : ''}{elapsed(order.created_at)}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-lg font-black text-slate-900">฿{Number(order.total_price || 0).toLocaleString()}</span>
          <span className={`text-[11px] font-black px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${timerStyle}`}>
            <span>{timerIcon}</span> {timerLabel}
          </span>
        </div>
      </div>

      {/* Items + options + note */}
      <div className="space-y-2 mb-3">
        {(order.items || []).map((item, i) => {
          const opts = Array.isArray(item.options) ? item.options : []
          return (
            <div key={i} className="text-sm">
              <div className="flex justify-between items-baseline gap-2">
                <span className="text-slate-800 font-bold line-clamp-1 flex-1">{item.name}</span>
                <span className="text-slate-600 font-black flex-shrink-0 bg-slate-100 px-2 py-0.5 rounded-md text-xs">×{item.quantity}</span>
              </div>
              {opts.length > 0 && (
                <p className="text-xs text-orange-600 font-bold mt-0.5 ml-0.5">
                  ➜ {opts.map(o => o.label).join(' + ')}
                </p>
              )}
              {item.note && (
                <div className="mt-1.5 ml-0.5 bg-yellow-100 border-l-4 border-yellow-400 rounded-r-lg px-2.5 py-1.5 flex items-start gap-1.5">
                  <span className="text-base flex-shrink-0">📓</span>
                  <p className="text-xs text-yellow-900 font-bold leading-snug">
                    <span className="text-[10px] uppercase tracking-wider opacity-70 block mb-0.5">หมายเหตุครัว</span>
                    {item.note}
                  </p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Action buttons */}
      {actions.length > 0 && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-slate-200/70">
          {actions.map(action => (
            <button
              key={action.next}
              onClick={() => onAction(order.id, action.next)}
              disabled={isLoading || !order.id}
              className={`flex-1 py-2.5 rounded-xl text-sm font-black transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
                action.primary
                  ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-md shadow-orange-200 hover:shadow-lg hover:shadow-orange-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 ring-1 ring-slate-200'
              }`}
            >
              {isLoading ? '⏳' : action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   KanbanCol
───────────────────────────────────────────────────────────────────────────── */
function KanbanCol({ col, orders, newIds, onAction, loadingId }) {
  return (
    <div className="flex flex-col min-h-0 bg-slate-800/40 rounded-2xl p-3 ring-1 ring-slate-700/50">
      <div className={`bg-gradient-to-r ${col.headerBg} rounded-xl px-4 py-3 mb-3 flex items-center gap-2.5 shadow-lg`}>
        <div className="relative flex-shrink-0">
          <span className={`w-3 h-3 rounded-full ${col.dot} block`} />
          {col.pulse && orders.length > 0 && (
            <span className={`absolute inset-0 rounded-full ${col.dot} animate-ping opacity-75`} />
          )}
        </div>
        <span className="text-white font-black text-sm flex items-center gap-1.5">
          <span className="text-base">{col.icon}</span> {col.label}
        </span>
        <span className="ml-auto bg-white/30 backdrop-blur-sm text-white text-xs font-black px-2.5 py-0.5 rounded-full ring-1 ring-white/30">{orders.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto pr-1 -mr-1">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <div className="w-16 h-16 bg-slate-700/40 rounded-full flex items-center justify-center text-3xl mb-3 ring-1 ring-slate-700">
              {col.icon}
            </div>
            <p className="text-sm font-bold">ยังไม่มีออเดอร์</p>
          </div>
        ) : (
          orders.map(order => (
            <OrderCard
              key={order.id ?? order.tempId}
              order={order}
              isNew={newIds.has(order.id ?? order.tempId)}
              onAction={onAction}
              isLoading={loadingId === order.id}
            />
          ))
        )}
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   StatCard
───────────────────────────────────────────────────────────────────────────── */
function StatCard({ icon, label, value, accent, suffix }) {
  const styles = {
    indigo:   { bg: 'from-indigo-500/20 to-purple-500/20',  ring: 'ring-indigo-500/30',  text: 'text-indigo-300',  number: 'text-white' },
    rose:     { bg: 'from-rose-500/20 to-pink-500/20',      ring: 'ring-rose-500/30',    text: 'text-rose-300',    number: 'text-white' },
    emerald:  { bg: 'from-emerald-500/20 to-teal-500/20',   ring: 'ring-emerald-500/30', text: 'text-emerald-300', number: 'text-emerald-300' },
  }[accent] || { bg: 'from-slate-700 to-slate-800', ring: 'ring-slate-600', text: 'text-slate-400', number: 'text-white' }

  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${styles.bg} rounded-xl px-3 py-2.5 ring-1 ${styles.ring} backdrop-blur-sm flex items-center gap-2.5 min-w-[148px]`}>
      <div className="absolute -top-6 -right-6 w-20 h-20 bg-white/5 rounded-full blur-xl" />
      <div className="relative w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center text-xl ring-1 ring-white/10 backdrop-blur-md flex-shrink-0">
        {icon}
      </div>
      <div className="relative min-w-0">
        <p className={`text-xl font-black leading-none tabular-nums ${styles.number}`}>{value}{suffix}</p>
        <p className={`text-[10px] leading-none mt-1.5 font-bold ${styles.text} uppercase tracking-wider truncate`}>{label}</p>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Leaderboard
───────────────────────────────────────────────────────────────────────────── */
const MEDAL_STYLES = [
  { medal: '🥇', ring: 'ring-yellow-400',  bar: 'from-yellow-400 to-amber-500', text: 'text-yellow-400' },
  { medal: '🥈', ring: 'ring-slate-300',   bar: 'from-slate-300 to-slate-400',  text: 'text-slate-300' },
  { medal: '🥉', ring: 'ring-amber-700',   bar: 'from-amber-600 to-orange-700', text: 'text-amber-600' },
  { medal: '🏅', ring: 'ring-sky-400',     bar: 'from-sky-400 to-indigo-500',   text: 'text-sky-400' },
  { medal: '🏅', ring: 'ring-violet-400',  bar: 'from-violet-400 to-purple-500',text: 'text-violet-400' },
]

const PERIOD_OPTIONS = [
  { key: 'today', label: 'วันนี้'   },
  { key: 'month', label: 'เดือนนี้' },
  { key: 'year',  label: 'ปีนี้'    },
]

function Leaderboard({ topMenus, period, onPeriodChange }) {
  const maxQty = topMenus.reduce((m, x) => Math.max(m, Number(x.total_qty || 0)), 0) || 1
  const emptyMsg = period === 'month' ? 'ยังไม่มีข้อมูลยอดขายเดือนนี้'
                 : period === 'year'  ? 'ยังไม่มีข้อมูลยอดขายปีนี้'
                 : 'ยังไม่มีข้อมูลยอดขายวันนี้'

  return (
    <div className="bg-slate-800/60 backdrop-blur-sm rounded-2xl px-4 py-3 ring-1 ring-slate-700/50">
      {/* Header row */}
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="text-lg">🏆</span>
        <span className="text-sm font-black text-white">Top 5 เมนูขายดี</span>
        <span className="ml-auto text-[10px] text-slate-500 font-bold uppercase tracking-wider">Leaderboard</span>
      </div>
      {/* Period tabs */}
      <div className="flex gap-1 mb-3">
        {PERIOD_OPTIONS.map(opt => (
          <button
            key={opt.key}
            onClick={() => onPeriodChange(opt.key)}
            className={`flex-1 py-1.5 rounded-xl text-[11px] font-black transition-all
              ${period === opt.key
                ? 'bg-orange-500 text-white shadow-md shadow-orange-500/30'
                : 'bg-slate-700/50 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {topMenus.length === 0 ? (
        <div className="py-6 text-center text-slate-500 text-xs">
          <span className="text-2xl block mb-1">📈</span>
          {emptyMsg}
        </div>
      ) : (
        <div className="space-y-2">
          {topMenus.map((menu, i) => {
            const style = MEDAL_STYLES[i] || MEDAL_STYLES[4]
            const pct   = Math.round((Number(menu.total_qty) / maxQty) * 100)
            return (
              <div key={menu.id} className="flex items-center gap-3 bg-slate-900/40 rounded-xl px-3 py-2 ring-1 ring-slate-700/40">
                <div className={`w-9 h-9 rounded-full bg-slate-900 flex items-center justify-center text-xl ring-2 ${style.ring} shadow-md flex-shrink-0`}>
                  {style.medal}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-sm font-black text-white truncate">{menu.name}</p>
                    <p className={`text-xs font-black flex-shrink-0 ${style.text}`}>#{i + 1}</p>
                  </div>
                  <div className="mt-1.5 h-2 bg-slate-700/60 rounded-full overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${style.bar} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-[10px] text-slate-400 font-bold">{menu.total_qty} จาน</p>
                    <p className="text-[10px] text-emerald-400 font-black tabular-nums">฿{Number(menu.total_sales).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main Dashboard
───────────────────────────────────────────────────────────────────────────── */
export default function AdminDashboard() {
  const navigate = useNavigate()
  const [orders,     setOrders]     = useState([])
  const [newIds,     setNewIds]     = useState(new Set())
  const [loadingId,  setLoadingId]  = useState(null)
  const [connected,  setConnected]  = useState(false)
  const [clock,      setClock]      = useState(new Date())
  const [mobileTab,  setMobileTab]  = useState('pending')
  const [todayStats, setTodayStats] = useState({ totalCustomers: 0, totalOrders: 0, totalSales: 0 })
  const [topMenus,       setTopMenus]       = useState([])
  const [topMenusPeriod, setTopMenusPeriod] = useState('today')
  const [showSidebar,    setShowSidebar]    = useState(true)
  const [closingTableId, setClosingTableId] = useState(null)
  const [restaurantName, setRestaurantName] = useState('ร้านอาหารของเรา')
  const socketRef = useRef(null)

  const logout = () => { adminLogout(); navigate('/', { replace: true }) }

  /* ── Live clock ── */
  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  /* ── Fetch today stats ── */
  const fetchTodayStats = useCallback(() => {
    axios.get(`${API_BASE}/stats/today`, { headers: getAuthHeaders() })
      .then(r => { if (r.data?.data) setTodayStats(r.data.data) })
      .catch(err => handleAuthError(err, navigate))
  }, [navigate])

  /* ── Fetch top menus ── */
  const fetchTopMenus = useCallback((period = 'today') => {
    axios.get(`${API_BASE}/stats/top-menus?period=${period}`, { headers: getAuthHeaders() })
      .then(r => { if (r.data?.data) setTopMenus(r.data.data) })
      .catch(err => handleAuthError(err, navigate))
  }, [navigate])

  useEffect(() => {
    fetchTodayStats()
    fetchTopMenus('today')
    axios.get(`${API_BASE}/settings`)
      .then(res => { const name = res.data?.data?.restaurant_name; if (name) setRestaurantName(name) })
      .catch(() => {})
    const statsId = setInterval(fetchTodayStats, 60000)
    return () => clearInterval(statsId)
  }, [fetchTodayStats, fetchTopMenus])

  /* Re-fetch when period changes */
  useEffect(() => {
    fetchTopMenus(topMenusPeriod)
  }, [topMenusPeriod, fetchTopMenus])

  /* ── Socket.io ── */
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect',    () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('admin_receive_order', (data) => {
      setOrders(prev => {
        const exists = prev.some(o => o.id && o.id === data.id)
        if (exists) return prev
        return [{ ...data, status: data.status || 'pending' }, ...prev]
      })
      setNewIds(prev => {
        const next = new Set(prev)
        next.add(data.id ?? data.tempId)
        return next
      })
      playAlert()
      setTimeout(() => {
        setNewIds(prev => {
          const next = new Set(prev)
          next.delete(data.id ?? data.tempId)
          return next
        })
      }, 10000)
      fetchTodayStats()
      fetchTopMenus()
    })

    socket.on('order_status_update', ({ order_id, status }) => {
      setOrders(prev => prev.map(o => o.id === order_id ? { ...o, status } : o))
      if (status === 'completed' || status === 'cancelled') {
        fetchTodayStats()
        fetchTopMenus()
      }
    })

    socket.on('checkout_requested', ({ table_id, order_ids }) => {
      setOrders(prev => prev.map(o =>
        order_ids.includes(o.id) ? { ...o, status: 'request_checkout' } : o
      ))
      playAlert()
    })

    socket.on('table_closed', ({ table_id }) => {
      setOrders(prev => prev.filter(o => o.table_id !== table_id))
      fetchTodayStats()
      fetchTopMenus()
    })

    socket.on('new_order', (data) => {
      setOrders(prev => {
        const exists = prev.some(o => o.id && o.id === data.id)
        if (exists) return prev
        return [{ ...data, status: data.status || 'pending' }, ...prev]
      })
    })

    return () => socket.disconnect()
  }, [fetchTodayStats, fetchTopMenus])

  /* ── Fetch existing orders on mount ── */
  useEffect(() => {
    axios.get(`${API_BASE}/orders`, { headers: getAuthHeaders() })
      .then(r => {
        if (r.data?.data) {
          const active = r.data.data.filter(o =>
            ['pending', 'preparing', 'serving', 'served', 'request_checkout'].includes(o.status)
          )
          setOrders(active)
        }
      })
      .catch(err => {
        if (!handleAuthError(err, navigate)) console.error('[Dashboard] fetch orders:', err)
      })
  }, [navigate])

  /* ── Update status ── */
  const handleAction = useCallback(async (orderId, newStatus) => {
    if (!orderId) return
    setLoadingId(orderId)
    try {
      await axios.put(`${API_BASE}/orders/${orderId}/status`, { status: newStatus }, { headers: getAuthHeaders() })
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    } catch (err) {
      if (!handleAuthError(err, navigate)) alert('ไม่สามารถอัปเดตสถานะได้ กรุณาตรวจสอบการเชื่อมต่อ')
    } finally {
      setLoadingId(null)
    }
  }, [navigate])

  /* ── Close table ── */
  const handleCloseTable = useCallback(async (tableId) => {
    setClosingTableId(tableId)
    try {
      await axios.post(`${API_BASE}/tables/${tableId}/close`, {}, { headers: getAuthHeaders() })
      setOrders(prev => prev.filter(o => o.table_id !== tableId))
      fetchTodayStats()
      fetchTopMenus()
    } catch (err) {
      if (!handleAuthError(err, navigate)) alert('ไม่สามารถปิดโต๊ะได้ กรุณาลองใหม่')
    } finally {
      setClosingTableId(null)
    }
  }, [navigate, fetchTodayStats, fetchTopMenus])

  /* ── Derived — FIFO sort สำหรับ pending + preparing ── */
  const byFIFO = (a, b) => new Date(a.created_at) - new Date(b.created_at)

  const pending         = orders.filter(o => o.status === 'pending')
  const preparing       = orders.filter(o => o.status === 'preparing')
  const serving         = orders.filter(o => o.status === 'serving')
  const served          = orders.filter(o => o.status === 'served')

  const checkoutOrders  = orders.filter(o => o.status === 'request_checkout')
  const checkoutByTable = checkoutOrders.reduce((acc, o) => {
    const tid = o.table_id
    if (!acc[tid]) acc[tid] = { table_id: tid, table_number: o.table_number ?? tid, orders: [] }
    acc[tid].orders.push(o)
    return acc
  }, {})
  const checkoutGroups = Object.values(checkoutByTable)

  const pendingSorted   = pending.slice().sort(byFIFO)
  const preparingSorted = preparing.slice().sort(byFIFO)

  const activeOrderCount = pending.length + preparing.length + serving.length

  const clockStr = clock.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const dateStr  = clock.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const getColOrders = (status) => {
    if (status === 'pending')   return pendingSorted
    if (status === 'preparing') return preparingSorted
    if (status === 'serving')   return serving
    if (status === 'served')    return served
    return []
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white flex flex-col relative overflow-hidden">

      {/* Decorative ambient blobs */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 -right-32 w-[28rem] h-[28rem] bg-purple-600/10 rounded-full blur-3xl" />

      {/* ─── Top Navigation ─── */}
      <header className="relative bg-slate-900/80 backdrop-blur-xl border-b border-slate-800 px-5 py-3 flex items-center justify-between shadow-xl flex-shrink-0 z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-orange-500/30 blur-lg rounded-2xl" />
            <div className="relative w-11 h-11 bg-gradient-to-br from-orange-500 to-rose-500 rounded-2xl flex items-center justify-center text-xl font-black shadow-lg ring-1 ring-white/10">🍜</div>
          </div>
          <div>
            <h1 className="font-black text-base text-white leading-none flex items-center gap-2">
              Kitchen Display
              <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-md ring-1 ring-emerald-500/30 tracking-wider">LIVE</span>
            </h1>
            <p className="text-xs text-slate-400 leading-none mt-1">{restaurantName} · FIFO Queue</p>
          </div>
        </div>

        <div className="hidden md:block text-center">
          <p className="text-3xl font-black text-white tabular-nums tracking-tight drop-shadow-lg">{clockStr}</p>
          <p className="text-[11px] text-slate-400 font-medium">{dateStr}</p>
        </div>

        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black ring-1 ${connected ? 'bg-emerald-500/20 text-emerald-400 ring-emerald-500/30' : 'bg-red-500/20 text-red-400 ring-red-500/30'}`}>
            <span className="relative flex items-center justify-center w-2 h-2">
              {connected && <span className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-75" />}
              <span className={`relative w-2 h-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-red-400'}`} />
            </span>
            <span className="hidden sm:inline">{connected ? 'เชื่อมต่อแล้ว' : 'ออฟไลน์'}</span>
          </div>
          <button
            onClick={() => setShowSidebar(s => !s)}
            className="hidden lg:flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors ring-1 ring-slate-700"
            title="ซ่อน/แสดง Sidebar"
          >
            {showSidebar ? '◀' : '▶'} Sidebar
          </button>
          <Link to="/admin/tables" className="hidden sm:flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors ring-1 ring-slate-700">
            🪑 สถานะโต๊ะ
          </Link>
          <Link to="/admin/menu" className="hidden sm:flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors ring-1 ring-slate-700">
            📋 จัดการเมนู
          </Link>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 bg-red-900/40 hover:bg-red-800/60 text-red-300 text-xs font-bold px-3 py-1.5 rounded-xl transition-colors ring-1 ring-red-700/50"
            title="ออกจากระบบ"
          >
            🔓 <span className="hidden sm:inline">ออกจากระบบ</span>
          </button>
        </div>
      </header>

      {/* ─── Stats Bar — Premium cards ─── */}
      <div className="relative px-5 py-3 flex items-center gap-2.5 overflow-x-auto scrollbar-none flex-shrink-0 border-b border-slate-800/50 bg-slate-900/30 backdrop-blur-sm">
        <StatCard icon="👥" label="ลูกค้าวันนี้"   value={todayStats.totalCustomers.toLocaleString()} suffix=" คน" accent="indigo" />
        <StatCard icon="🧾" label="ออเดอร์วันนี้"  value={todayStats.totalOrders} accent="rose" />
        <StatCard icon="💰" label="ยอดขายวันนี้"  value={`฿${todayStats.totalSales.toLocaleString()}`} accent="emerald" />

        {/* Mini status badges */}
        <div className="ml-auto hidden lg:flex items-center gap-1.5 flex-shrink-0 pl-2 border-l border-slate-700/50">
          {[
            { label: 'รอ',      value: pending.length,   color: 'bg-orange-500/20 text-orange-300 ring-orange-500/30', icon: '🔔' },
            { label: 'ทำ',      value: preparing.length, color: 'bg-sky-500/20 text-sky-300 ring-sky-500/30',           icon: '🍳' },
            { label: 'เสิร์ฟ',  value: serving.length,   color: 'bg-violet-500/20 text-violet-300 ring-violet-500/30', icon: '🚶' },
            { label: 'เสร็จ',   value: served.length,    color: 'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30', icon: '🍽️' },
          ].map(s => (
            <div key={s.label} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg ring-1 ${s.color}`}>
              <span className="text-sm">{s.icon}</span>
              <span className="text-sm font-black tabular-nums">{s.value}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider hidden xl:inline">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Mobile Tab Bar ─── */}
      <div className="flex sm:hidden border-b border-slate-800 bg-slate-900/60 backdrop-blur-sm flex-shrink-0 relative z-10">
        {COLUMNS.map(col => (
          <button
            key={col.status}
            onClick={() => setMobileTab(col.status)}
            className={`flex-1 py-3 text-sm font-black transition-all relative ${mobileTab === col.status ? 'text-orange-400' : 'text-slate-500'}`}
          >
            {mobileTab === col.status && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-gradient-to-r from-orange-500 to-rose-500 rounded-t-full" />
            )}
            <span className="text-base mr-1">{col.icon}</span>
            <span>{col.label}</span>
            {col.status === 'pending' && pending.length > 0 && (
              <span className="ml-1.5 bg-gradient-to-br from-orange-500 to-rose-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">{pending.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ─── Checkout Requests Banner ─── */}
      {checkoutGroups.length > 0 && (
        <div className="relative px-4 py-3 border-b border-slate-800/50 bg-amber-500/10 backdrop-blur-sm flex-shrink-0 z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg animate-pulse">🧾</span>
            <span className="text-sm font-black text-amber-300">รอเช็คบิล</span>
            <span className="bg-amber-500 text-white text-xs font-black px-2 py-0.5 rounded-full">{checkoutGroups.length} โต๊ะ</span>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
            {checkoutGroups.map(group => {
              const total = group.orders.reduce((s, o) => s + Number(o.total_price || 0), 0)
              const isClosing = closingTableId === group.table_id
              return (
                <div key={group.table_id} className="flex-shrink-0 bg-slate-900/60 rounded-2xl px-4 py-3 ring-1 ring-amber-500/40 flex items-center gap-4 min-w-[240px]">
                  <div>
                    <p className="text-sm font-black text-white flex items-center gap-1.5">
                      🪑 โต๊ะ {group.table_number}
                    </p>
                    <p className="text-xs text-amber-300 font-bold mt-0.5">{group.orders.length} ออเดอร์</p>
                    <p className="text-xl font-black text-emerald-400 mt-1">฿{total.toLocaleString()}</p>
                  </div>
                  <button
                    onClick={() => handleCloseTable(group.table_id)}
                    disabled={isClosing}
                    className="ml-auto flex-shrink-0 bg-gradient-to-br from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-black px-3 py-2.5 rounded-xl shadow-lg shadow-emerald-900/40 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isClosing ? '⏳' : '✅ ยืนยันรับเงิน\n(ปิดโต๊ะ)'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── Main Layout (Kanban + Sidebar) ─── */}
      <main className="relative flex-1 overflow-hidden p-4 z-0">
        <div className={`hidden lg:grid gap-4 h-full ${showSidebar ? 'grid-cols-[1fr_320px]' : 'grid-cols-1'}`}>
          {/* Kanban Board */}
          <div className="grid grid-cols-4 gap-3 h-full min-h-0">
            {COLUMNS.map(col => (
              <KanbanCol
                key={col.status}
                col={col}
                orders={getColOrders(col.status)}
                newIds={newIds}
                onAction={handleAction}
                loadingId={loadingId}
              />
            ))}
          </div>

          {/* Sidebar — Leaderboard */}
          {showSidebar && (
            <aside className="overflow-y-auto pr-1 -mr-1 space-y-4">
              <Leaderboard topMenus={topMenus} period={topMenusPeriod} onPeriodChange={setTopMenusPeriod} />
            </aside>
          )}
        </div>

        {/* Tablet: 4 columns no sidebar */}
        <div className="hidden sm:grid lg:hidden sm:grid-cols-4 gap-3 h-full">
          {COLUMNS.map(col => (
            <KanbanCol
              key={col.status}
              col={col}
              orders={getColOrders(col.status)}
              newIds={newIds}
              onAction={handleAction}
              loadingId={loadingId}
            />
          ))}
        </div>

        {/* Mobile: single column + leaderboard below */}
        <div className="sm:hidden h-full overflow-y-auto space-y-4">
          {(() => {
            const col = COLUMNS.find(c => c.status === mobileTab)
            return (
              <KanbanCol
                col={col}
                orders={getColOrders(mobileTab)}
                newIds={newIds}
                onAction={handleAction}
                loadingId={loadingId}
              />
            )
          })()}
          <Leaderboard topMenus={topMenus} />
        </div>
      </main>

      {/* ─── Footer ─── */}
      <footer className="relative bg-slate-900/80 backdrop-blur-sm border-t border-slate-800 px-5 py-2 flex items-center justify-between flex-shrink-0 z-10">
        <p className="text-[11px] text-slate-500 font-medium">
          Restaurant QR Menu System v2.0 · <span className="text-emerald-400 font-black">FIFO Queue Active</span> · {activeOrderCount} active
        </p>
        <Link to="/admin/menu" className="sm:hidden text-xs text-orange-400 font-black">📋 จัดการเมนู →</Link>
      </footer>

      <style>{`
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { scrollbar-width: none; }
      `}</style>
    </div>
  )
}
