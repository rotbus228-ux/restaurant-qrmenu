import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { io } from 'socket.io-client'
import axios from 'axios'

const _BASE           = import.meta.env.VITE_API_URL || 'http://localhost:5000'
const API_BASE        = `${_BASE}/api`
const SOCKET_URL      = _BASE

/* ── ตัวเลือกเสริมแยกตามประเภทหมวดหมู่ ──────────────────────────────────── */
const CATEGORY_CONFIGS = {
  singleDish: {
    type:         'level',
    primaryLabel: 'ระดับความพิเศษ',
    primary: [
      { key: 'normal',  label: 'ธรรมดา', extra: 0  },
      { key: 'special', label: 'พิเศษ',  extra: 15 },
    ],
    toppings: [
      { key: 'egg_fried',  label: 'เพิ่มไข่ดาว',  extra: 10, emoji: '🍳' },
      { key: 'egg_omelet', label: 'เพิ่มไข่เจียว', extra: 10, emoji: '🥚' },
    ],
  },
  noodle: {
    type:         'level',
    primaryLabel: 'ระดับความพิเศษ',
    primary: [
      { key: 'normal',  label: 'ธรรมดา', extra: 0  },
      { key: 'special', label: 'พิเศษ',  extra: 15 },
    ],
    toppings: [
      { key: 'meatball', label: 'เพิ่มลูกชิ้น',    extra: 15, emoji: '🔴' },
      { key: 'meat',     label: 'เพิ่มเนื้อสัตว์',  extra: 20, emoji: '🥩' },
      { key: 'wonton',   label: 'เพิ่มเกี๊ยวกรอบ',  extra: 10, emoji: '🥟' },
    ],
  },
  drink: {
    type:         'sweetness',
    primaryLabel: 'ระดับความหวาน',
    primary: [
      { key: 'less',   label: 'น้อย', extra: 0 },
      { key: 'normal', label: 'ปกติ', extra: 0 },
      { key: 'more',   label: 'มาก',  extra: 0 },
    ],
    toppings: [
      { key: 'whip',     label: 'เพิ่มวิปครีม', extra: 15, emoji: '🍦' },
      { key: 'pearl',    label: 'เพิ่มมุก',      extra: 15, emoji: '🧋' },
      { key: 'icecream', label: 'เพิ่มไอศกรีม', extra: 20, emoji: '🍨' },
    ],
  },
  soup: {
    type:         'serving',
    primaryLabel: 'วิธีเสิร์ฟ',
    primary: [
      { key: 'bowl',   label: 'ใส่ชาม',    extra: 0  },
      { key: 'hotpot', label: 'ใส่หม้อไฟ', extra: 50 },
    ],
    toppings: [
      { key: 'rice', label: 'เพิ่มข้าวเปล่า', extra: 15, emoji: '🍚' },
    ],
  },
  default: {
    type:         'level',
    primaryLabel: 'ระดับความพิเศษ',
    primary: [
      { key: 'normal',  label: 'ธรรมดา', extra: 0  },
      { key: 'special', label: 'พิเศษ',  extra: 15 },
    ],
    toppings: [],
  },
}

function getCategoryConfig(categoryName) {
  const n = (categoryName || '').toLowerCase()
  if (n.includes('จานเดียว'))                                     return CATEGORY_CONFIGS.singleDish
  if (n.includes('เส้น'))                                         return CATEGORY_CONFIGS.noodle
  if (n.includes('เครื่องดื่ม') || n.includes('ของหวาน'))         return CATEGORY_CONFIGS.drink
  if (n.includes('ต้ม') || n.includes('แกง') || n.includes('กับข้าว')) return CATEGORY_CONFIGS.soup
  return CATEGORY_CONFIGS.default
}

const cartKey = (menuId, options, note) => {
  const optStr = options.map(o => o.label).join('|')
  return `${menuId}__${optStr}__${(note || '').trim()}`
}

/* ─────────────────────────────────────────────────────────────────────────────
   ImageWithFallback
───────────────────────────────────────────────────────────────────────────── */
function ImageWithFallback({ src, alt, emoji, className }) {
  const [failed, setFailed] = useState(false)
  if (failed || !src) {
    return (
      <div className={`${className} flex items-center justify-center bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50`}>
        <span className="text-5xl drop-shadow-sm">{emoji}</span>
      </div>
    )
  }
  return (
    <img src={src} alt={alt} className={className} onError={() => setFailed(true)} loading="lazy" />
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   MenuCardSkeleton
───────────────────────────────────────────────────────────────────────────── */
function MenuCardSkeleton({ mode = 'list' }) {
  if (mode === 'grid') {
    return (
      <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100 animate-pulse">
        <div className="h-32 bg-gradient-to-br from-stone-200 to-stone-100" />
        <div className="p-3 space-y-2">
          <div className="h-2 bg-stone-200 rounded-full w-16" />
          <div className="h-3 bg-stone-200 rounded-full w-full" />
          <div className="h-3 bg-stone-200 rounded-full w-2/3" />
          <div className="h-4 bg-stone-200 rounded-full w-1/3 mt-2" />
        </div>
      </div>
    )
  }
  return (
    <div className="flex items-center bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100 animate-pulse">
      <div className="w-[92px] h-[90px] flex-shrink-0 bg-gradient-to-br from-stone-200 to-stone-100" />
      <div className="flex-1 px-3 py-2.5 space-y-2">
        <div className="h-2 bg-stone-200 rounded-full w-16" />
        <div className="h-3 bg-stone-200 rounded-full w-full" />
        <div className="h-2.5 bg-stone-200 rounded-full w-3/4" />
        <div className="flex items-center justify-between mt-1">
          <div className="h-4 bg-stone-200 rounded-full w-14" />
          <div className="w-7 h-7 bg-stone-200 rounded-full" />
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   OptionsModal — uses menu.options from DB
───────────────────────────────────────────────────────────────────────────── */
function OptionsModal({ menu, onConfirm, onClose }) {
  const dbOptions = Array.isArray(menu?.options) ? menu.options : []
  const [selected, setSelected] = useState(new Set())
  const [note,     setNote]     = useState('')

  if (!menu) return null

  const toggleOpt = (id) => setSelected(prev => {
    const next = new Set(prev)
    next.has(id) ? next.delete(id) : next.add(id)
    return next
  })

  const extraTotal = Array.from(selected).reduce((sum, id) => {
    const o = dbOptions.find(o => o.id === id)
    return sum + (Number(o?.extra_price) || 0)
  }, 0)
  const unitPrice = (menu.price || 0) + extraTotal

  const handleConfirm = () => {
    const opts = Array.from(selected).map(id => {
      const o = dbOptions.find(o => o.id === id)
      return { label: o.name, extra: Number(o.extra_price) || 0 }
    })
    onConfirm(opts, note.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-hidden animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]">

        {/* Drag handle (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-stone-300 rounded-full" />
        </div>

        <div className="overflow-y-auto max-h-[92vh] p-5 pb-6 space-y-5">

          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-stone-900 flex items-center gap-2">
              <span className="text-xl">⚙️</span> ปรับแต่งเมนู
            </h2>
            <button onClick={onClose} className="w-9 h-9 bg-stone-100 hover:bg-stone-200 rounded-full flex items-center justify-center text-stone-500 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Menu info */}
          <div className="relative overflow-hidden bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-3 ring-1 ring-orange-100">
            <div className="absolute -top-6 -right-6 w-24 h-24 bg-orange-200/30 rounded-full blur-2xl" />
            <div className="relative flex items-center gap-3">
              <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 ring-2 ring-white shadow-md">
                <ImageWithFallback src={menu.image_url} alt={menu.name} emoji="🍽️" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-stone-900">{menu.name}</p>
                {menu.description && (
                  <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{menu.description}</p>
                )}
                <p className="text-orange-600 font-bold text-sm mt-1">
                  ฿{menu.price} <span className="text-stone-400 font-normal text-xs">ราคาเริ่มต้น</span>
                </p>
              </div>
            </div>
          </div>

          {/* DB Options */}
          {dbOptions.length > 0 && (
            <div>
              <p className="text-[11px] font-black text-stone-500 mb-2.5 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-1 h-3 bg-orange-500 rounded-full" /> ตัวเลือกพิเศษ
              </p>
              <div className="space-y-2">
                {dbOptions.map(opt => {
                  const isSel = selected.has(opt.id)
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleOpt(opt.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 text-sm font-bold transition-all duration-200 ${
                        isSel
                          ? 'border-orange-500 bg-gradient-to-r from-orange-50 to-amber-50 text-orange-700 ring-2 ring-orange-500/20 shadow-sm'
                          : 'border-stone-200 text-stone-600 hover:border-orange-200 hover:bg-stone-50'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        {isSel && (
                          <span className="w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                          </span>
                        )}
                        {!isSel && <span className="w-5 h-5 rounded-full border-2 border-stone-300 flex-shrink-0" />}
                        {opt.name}
                      </span>
                      <span className={`font-black ${isSel ? 'text-orange-600' : 'text-stone-400'}`}>
                        {Number(opt.extra_price) > 0 ? `+฿${Number(opt.extra_price)}` : 'ฟรี'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* หมายเหตุถึงห้องครัว */}
          <div>
            <p className="text-[11px] font-black text-stone-500 mb-2.5 uppercase tracking-widest flex items-center gap-1.5">
              <span className="w-1 h-3 bg-rose-400 rounded-full" />
              📝 หมายเหตุถึงห้องครัว
            </p>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="เช่น เผ็ดน้อย, ไม่ใส่ต้นหอม, ไม่ใส่ผัก..."
              maxLength={100}
              rows={2}
              className="w-full border-2 border-stone-200 rounded-2xl px-4 py-3 text-sm text-stone-700 placeholder-stone-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100 focus:outline-none resize-none transition-all"
            />
            <p className="text-[10px] text-stone-400 mt-1 text-right">{note.length}/100</p>
          </div>

          {/* ราคารวม */}
          <div className="relative overflow-hidden flex items-center justify-between bg-gradient-to-br from-stone-50 to-stone-100 rounded-2xl px-5 py-3.5 ring-1 ring-stone-200">
            <div>
              <p className="text-xs text-stone-500 font-semibold">ราคารวม</p>
              <p className="text-[10px] text-stone-400">1 × ฿{unitPrice}</p>
            </div>
            <span className="text-2xl font-black bg-gradient-to-br from-orange-600 to-rose-600 bg-clip-text text-transparent">
              ฿{unitPrice}
            </span>
          </div>

          {/* ปุ่มยืนยัน */}
          <button
            onClick={handleConfirm}
            className="group relative w-full overflow-hidden bg-gradient-to-r from-orange-500 via-orange-600 to-rose-500 text-white rounded-2xl py-4 font-black text-base shadow-xl shadow-orange-300/50 active:scale-[0.98] transition-all hover:shadow-2xl hover:shadow-orange-400/60"
          >
            <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            <span className="relative flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
              เพิ่มลงตะกร้า · ฿{unitPrice}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   ChangeTableModal
───────────────────────────────────────────────────────────────────────────── */
function ChangeTableModal({ currentTableId, currentCount, tables, onConfirm, onClose }) {
  const [newTable, setNewTable] = useState(String(currentTableId))
  const [newCount, setNewCount] = useState(currentCount)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]" onClick={onClose} />
      <div className="relative w-full sm:max-w-sm bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl p-6 space-y-5 animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]">

        <div className="sm:hidden flex justify-center -mt-2 -mb-1">
          <div className="w-12 h-1.5 bg-stone-300 rounded-full" />
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-stone-900 flex items-center gap-2"><span>🪑</span> เปลี่ยนโต๊ะ</h2>
          <button onClick={onClose} className="w-9 h-9 bg-stone-100 hover:bg-stone-200 rounded-full flex items-center justify-center text-stone-500 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
          <span className="text-base">💡</span>
          <p className="text-xs text-amber-700">รายการในตะกร้าจะยังคงอยู่ครบ ไม่ต้องกังวล</p>
        </div>

        <div>
          <label className="text-xs font-black text-stone-700 uppercase tracking-wider flex items-center gap-1.5 mb-2"><span>🪑</span> หมายเลขโต๊ะ</label>
          <div className="relative group">
            <select
              value={newTable}
              onChange={e => setNewTable(e.target.value)}
              className="w-full border-2 border-stone-200 rounded-2xl px-4 py-3 text-base font-bold text-stone-800 focus:border-orange-500 focus:ring-4 focus:ring-orange-100 focus:outline-none appearance-none bg-white hover:border-orange-300 transition-all cursor-pointer"
            >
              {tables.map(t => (
                <option key={t.table_number} value={String(t.table_number)}>โต๊ะที่ {t.table_number}</option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-orange-500 transition-transform group-focus-within:rotate-180">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
            </div>
          </div>
        </div>

        <div>
          <label className="text-xs font-black text-stone-700 uppercase tracking-wider flex items-center gap-1.5 mb-2"><span>👥</span> จำนวนลูกค้า</label>
          <div className="flex items-center gap-3 bg-stone-50 p-2 rounded-2xl">
            <button
              type="button"
              onClick={() => setNewCount(c => Math.max(1, c - 1))}
              className="w-12 h-12 rounded-xl bg-white text-stone-700 text-2xl font-black flex items-center justify-center active:scale-90 hover:bg-orange-50 hover:text-orange-600 transition-all shadow-sm ring-1 ring-stone-200"
            >−</button>
            <input
              type="number" min={1} max={20}
              value={newCount}
              onChange={e => setNewCount(Math.max(1, Number(e.target.value) || 1))}
              className="flex-1 bg-transparent border-0 px-3 py-2.5 text-center text-3xl font-black text-stone-900 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              type="button"
              onClick={() => setNewCount(c => Math.min(20, c + 1))}
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white text-2xl font-black flex items-center justify-center active:scale-90 hover:shadow-lg hover:shadow-orange-300 transition-all shadow-md"
            >+</button>
          </div>
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold text-sm transition-colors active:scale-95">ยกเลิก</button>
          <button
            onClick={() => onConfirm(newTable, newCount)}
            className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-rose-500 text-white font-black text-sm shadow-lg shadow-orange-300/50 active:scale-95 hover:shadow-xl transition-all"
          >
            ✅ ยืนยัน
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   CheckoutModal — สรุปยอด + QR PromptPay
───────────────────────────────────────────────────────────────────────────── */
function QRPlaceholder() {
  return (
    <div className="relative mx-auto w-52 h-52 flex items-center justify-center">
      {/* outer border */}
      <div className="absolute inset-0 rounded-2xl border-4 border-stone-800" />
      {/* corner marks */}
      {[['top-1 left-1','rounded-tl-xl'],['top-1 right-1','rounded-tr-xl'],['bottom-1 left-1','rounded-bl-xl']].map(([pos, r], i) => (
        <div key={i} className={`absolute ${pos} w-10 h-10 border-4 border-stone-800 ${r} bg-transparent`} />
      ))}
      {/* inner dots pattern */}
      <div className="grid grid-cols-7 gap-1 p-6">
        {[1,0,1,0,1,1,0, 0,1,0,1,0,0,1, 1,0,0,0,1,0,1, 0,1,1,0,0,1,0,
          1,0,1,1,0,0,1, 0,1,0,0,1,0,0, 1,0,0,1,0,1,1].map((v,i) => (
          <div key={i} className={`w-2.5 h-2.5 rounded-[2px] ${v ? 'bg-stone-800' : 'bg-transparent'}`} />
        ))}
      </div>
      {/* label */}
      <div className="absolute -bottom-7 left-0 right-0 text-center">
        <span className="text-[10px] font-black text-stone-400 tracking-wider uppercase">PromptPay QR — ตัวอย่าง</span>
      </div>
    </div>
  )
}

function CheckoutModal({ cart, cartTotal, cartCount, effectiveTableId, effectiveCount, onConfirm, onClose, sending, paymentQrUrl }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]" onClick={!sending ? onClose : undefined} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl max-h-[96vh] overflow-hidden animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]">

        {/* Drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-stone-300 rounded-full" />
        </div>

        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <span>🛒</span> ยืนยันสั่งอาหาร
            </h2>
            {!sending && (
              <button onClick={onClose}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            )}
          </div>
          <p className="text-emerald-100 text-xs mt-1">โต๊ะ {effectiveTableId} · {effectiveCount} คน</p>
        </div>

        <div className="overflow-y-auto max-h-[calc(96vh-80px)] p-5 space-y-5">

          {/* รายการอาหาร */}
          <div>
            <p className="text-[11px] font-black text-stone-500 uppercase tracking-widest mb-2.5 flex items-center gap-1.5">
              <span className="w-1 h-3 bg-orange-500 rounded-full" /> รายการอาหาร ({cartCount} รายการ)
            </p>
            <div className="bg-stone-50 rounded-2xl divide-y divide-stone-100 overflow-hidden">
              {cart.map(item => (
                <div key={item.key} className="px-4 py-3 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-stone-800 line-clamp-1">{item.name}</p>
                    {item.options.length > 0 && (
                      <p className="text-[11px] text-orange-600 font-semibold mt-0.5">
                        {item.options.map(o => o.label).join(', ')}
                      </p>
                    )}
                    {item.note && (
                      <p className="text-[11px] text-rose-500 font-semibold mt-0.5">📝 {item.note}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-black text-stone-800">฿{(item.unitPrice * item.quantity).toLocaleString()}</p>
                    <p className="text-[10px] text-stone-400">฿{item.unitPrice} × {item.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ยอดรวม */}
          <div className="flex items-center justify-between bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl px-5 py-4 ring-1 ring-orange-100">
            <div>
              <p className="text-sm text-stone-600 font-bold">ยอดรวมทั้งหมด</p>
              <p className="text-[10px] text-stone-400">ยังไม่รวม VAT</p>
            </div>
            <p className="text-3xl font-black bg-gradient-to-br from-orange-600 to-rose-600 bg-clip-text text-transparent">
              ฿{cartTotal.toLocaleString()}
            </p>
          </div>

          {/* หมายเหตุ */}
          <div className="flex items-start gap-2.5 bg-amber-50 rounded-2xl px-4 py-3 ring-1 ring-amber-100">
            <span className="text-base flex-shrink-0">💡</span>
            <p className="text-xs text-amber-700 leading-relaxed">
              เมื่อรับประทานอาหารเสร็จแล้ว กดปุ่ม <strong>"เรียกเก็บเงิน"</strong> ในแท็บออเดอร์ เพื่อให้พนักงานมาเช็คบิล
            </p>
          </div>

          {/* ปุ่มยืนยัน */}
          <button
            onClick={onConfirm}
            disabled={sending}
            className="group relative w-full overflow-hidden bg-gradient-to-r from-orange-500 via-orange-600 to-rose-500
              text-white rounded-2xl py-4 font-black text-base shadow-xl shadow-orange-300/50
              active:scale-[0.98] disabled:opacity-60 disabled:scale-100 hover:shadow-2xl transition-all"
          >
            {!sending && (
              <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
            )}
            <span className="relative flex items-center justify-center gap-2">
              {sending ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                  กำลังส่งออเดอร์...
                </>
              ) : (
                <>✅ ยืนยันสั่งอาหาร</>
              )}
            </span>
          </button>

          <button
            onClick={onClose}
            disabled={sending}
            className="w-full py-3 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold text-sm transition-colors disabled:opacity-40"
          >
            ← ยกเลิก / แก้ไขรายการ
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   OrderTracker
───────────────────────────────────────────────────────────────────────────── */
const TRACKING_STEPS = [
  { key: 'pending',          icon: '📋', label: 'รับออเดอร์' },
  { key: 'preparing',        icon: '🍳', label: 'กำลังปรุง' },
  { key: 'serving',          icon: '🚶', label: 'กำลังเสิร์ฟ' },
  { key: 'served',           icon: '✅', label: 'เสิร์ฟแล้ว' },
  { key: 'request_checkout', icon: '🧾', label: 'รอเช็คบิล' },
]

function OrderTracker({ orders, loading }) {
  if (loading) {
    return (
      <div className="mx-4 mt-3 bg-white rounded-3xl shadow-sm border border-stone-100 p-6 space-y-3">
        <div className="h-4 bg-stone-100 rounded-full w-1/3 animate-pulse" />
        <div className="h-3 bg-stone-100 rounded-full w-2/3 animate-pulse" />
        <div className="h-12 bg-stone-50 rounded-2xl animate-pulse" />
      </div>
    )
  }

  const activeOrders = orders.filter(o => ['pending', 'preparing', 'serving', 'served', 'request_checkout'].includes(o.status))
  const doneOrders   = orders.filter(o => ['completed', 'cancelled'].includes(o.status))

  if (!activeOrders.length && !doneOrders.length) {
    return (
      <div className="mx-4 mt-3 bg-white rounded-3xl shadow-sm border border-stone-100 p-10 text-center">
        <div className="w-20 h-20 mx-auto bg-gradient-to-br from-orange-50 to-amber-50 rounded-full flex items-center justify-center text-4xl mb-4">
          📦
        </div>
        <p className="text-stone-700 font-bold">ยังไม่มีออเดอร์</p>
        <p className="text-stone-400 text-xs mt-1">เพิ่มรายการอาหารในแท็บ เมนู แล้วกดยืนยัน</p>
      </div>
    )
  }

  return (
    <div className="mx-4 mt-3 bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <h3 className="text-base font-black text-stone-800 flex items-center gap-2">
          <span className="text-xl">📦</span> สถานะออเดอร์
        </h3>
        {orders.length > 1 && (
          <span className="text-xs text-stone-500 font-bold bg-stone-100 px-2.5 py-1 rounded-full">{orders.length} รายการ</span>
        )}
      </div>

      {activeOrders.map((order, idx) => {
        const stepIdx    = TRACKING_STEPS.findIndex(s => s.key === order.status)
        const activeStep = stepIdx === -1 ? 0 : stepIdx

        return (
          <div key={order.id ?? order.tempId} className={`px-5 pb-5 ${idx > 0 ? 'pt-5 border-t border-stone-100' : 'pt-1'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-stone-500 font-bold flex items-center gap-1.5">
                {order.id ? <>ออเดอร์ <span className="text-stone-700">#{order.id}</span></> : <span className="flex items-center gap-1">ออเดอร์ใหม่ <span className="animate-pulse">⏳</span></span>}
              </span>
              <span className="text-sm font-black text-orange-600">
                ฿{Number(order.total_price || 0).toLocaleString()}
              </span>
            </div>

            {(order.items || []).length > 0 && (
              <div className="mb-4 space-y-1.5 bg-stone-50 rounded-2xl px-3 py-2.5">
                {(order.items || []).map((item, i) => {
                  const opts = Array.isArray(item.options) ? item.options : []
                  return (
                    <div key={i} className="text-xs text-stone-600 flex flex-wrap items-baseline gap-x-1.5">
                      <span className="font-bold text-stone-800">{item.name}</span>
                      <span className="text-stone-400">×{item.quantity}</span>
                      {opts.length > 0 && (
                        <span className="text-orange-500 font-semibold">· {opts.map(o => o.label).join(', ')}</span>
                      )}
                      {item.note && (
                        <span className="text-rose-500 font-bold">[📝 {item.note}]</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex items-start">
              {TRACKING_STEPS.map((step, si) => (
                <div key={step.key} className="flex items-center" style={{ flex: si < TRACKING_STEPS.length - 1 ? '1 1 0%' : 'none' }}>
                  <div className="flex flex-col items-center flex-shrink-0">
                    <div className={`relative w-9 h-9 rounded-full flex items-center justify-center text-sm font-black transition-all duration-500 ${
                      si < activeStep   ? 'bg-gradient-to-br from-emerald-400 to-green-500 text-white shadow-md shadow-green-200'
                      : si === activeStep ? 'bg-gradient-to-br from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-300 ring-4 ring-orange-100'
                      : 'bg-stone-100 text-stone-400'
                    }`}>
                      {si === activeStep && (
                        <span className="absolute inset-0 rounded-full bg-orange-400/50 animate-ping" />
                      )}
                      <span className="relative">{si < activeStep ? '✓' : step.icon}</span>
                    </div>
                    <p className={`text-[10px] mt-1.5 font-black text-center w-14 leading-tight ${
                      si < activeStep   ? 'text-emerald-600'
                      : si === activeStep ? 'text-orange-600'
                      : 'text-stone-300'
                    }`}>
                      {step.label}
                    </p>
                  </div>
                  {si < TRACKING_STEPS.length - 1 && (
                    <div className={`flex-1 h-1 mx-0.5 mb-5 rounded-full transition-all duration-700 ${
                      si < activeStep ? 'bg-gradient-to-r from-emerald-400 to-green-400' : 'bg-stone-100'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {doneOrders.length > 0 && (
        <div className={`px-5 py-4 bg-stone-50 space-y-1.5 ${activeOrders.length > 0 ? 'border-t border-stone-100' : ''}`}>
          {doneOrders.map(order => (
            <div key={order.id ?? order.tempId} className="text-xs text-stone-500 flex items-center gap-2">
              <span className="text-base">{order.status === 'completed' ? '🙏' : '❌'}</span>
              <span>
                {order.id ? <>ออเดอร์ <span className="font-bold">#{order.id}</span></> : 'ออเดอร์'} —
                {order.status === 'completed' ? ' ชำระเงินเรียบร้อย ขอบคุณค่ะ' : ' ยกเลิกแล้ว'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────────
   Category colour helper (presentation only)
───────────────────────────────────────────────────────────────────────────── */
function getCatColor(name = '') {
  const n = name.toLowerCase()
  if (n.includes('จานเดียว'))                                           return { bg: 'bg-amber-50',  text: 'text-amber-700'  }
  if (n.includes('เส้น'))                                               return { bg: 'bg-orange-50', text: 'text-orange-700' }
  if (n.includes('เครื่องดื่ม') || n.includes('ของหวาน'))               return { bg: 'bg-sky-50',    text: 'text-sky-700'    }
  if (n.includes('ต้ม') || n.includes('แกง') || n.includes('กับข้าว')) return { bg: 'bg-rose-50',   text: 'text-rose-700'   }
  return { bg: 'bg-stone-100', text: 'text-stone-500' }
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main Page
───────────────────────────────────────────────────────────────────────────── */
export default function TablePage() {
  const { tableId } = useParams()
  const location    = useLocation()

  const [effectiveTableId,  setEffectiveTableId]  = useState(tableId)
  const [effectiveCount,    setEffectiveCount]    = useState(location.state?.customerCount || 1)
  const [showChangeTable,   setShowChangeTable]   = useState(false)

  const [activeTab,      setActiveTab]      = useState('menu')
  const [categories,     setCategories]     = useState([])
  const [menus,          setMenus]          = useState([])
  const [tables,         setTables]         = useState([])
  const [paymentQrUrl,   setPaymentQrUrl]   = useState('')
  const [restaurantName, setRestaurantName] = useState('ร้านอาหารของเรา')
  const [menuLoading,    setMenuLoading]    = useState(true)
  const [activeCat,      setActiveCat]      = useState(0)

  const [cart,          setCart]          = useState(() => {
    try {
      const saved = localStorage.getItem(`qrmenu_cart_${tableId}`)
      return saved ? JSON.parse(saved) : []
    } catch { return [] }
  })

  const [orders,        setOrders]        = useState([])
  const [ordersLoaded,  setOrdersLoaded]  = useState(false)
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [sending,       setSending]       = useState(false)
  const [connected,     setConnected]     = useState(false)

  const [optionMenu,          setOptionMenu]          = useState(null)
  const [cartBump,            setCartBump]            = useState(0)
  const [viewMode,            setViewMode]            = useState('list')   // 'list' | 'grid'
  const [showCheckout,        setShowCheckout]        = useState(false)
  const [requestingCheckout,  setRequestingCheckout]  = useState(false)
  const [tableClosed,         setTableClosed]         = useState(false)

  const socketRef = useRef(null)

  /* ── Persist cart to localStorage ── */
  useEffect(() => {
    try {
      if (cart.length > 0) {
        localStorage.setItem(`qrmenu_cart_${effectiveTableId}`, JSON.stringify(cart))
      } else {
        localStorage.removeItem(`qrmenu_cart_${effectiveTableId}`)
      }
    } catch {}
  }, [cart, effectiveTableId])

  /* ── Socket ── */
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket'] })
    socketRef.current = socket

    socket.on('connect',    () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    const handleStatusUpdate = ({ order_id, status }) => {
      setOrders(prev =>
        prev.map(o => (o.id === order_id || o.tempId === order_id) ? { ...o, status } : o)
      )
    }
    socket.on('client_receive_status', handleStatusUpdate)
    socket.on('order_status_update',   handleStatusUpdate)

    socket.on('menu_availability_update', ({ menu_id, is_available }) => {
      setMenus(prev => prev.map(m => m.id === menu_id ? { ...m, is_available } : m))
    })

    socket.on('table_closed', ({ table_id }) => {
      const tid = Number(table_id)
      const myId = Number(effectiveTableId || tableId)
      setOrders(prev => prev.map(o =>
        o.table_id === table_id || String(o.table_id) === String(table_id)
          ? { ...o, status: 'completed' }
          : o
      ))
      try { localStorage.removeItem(`qrmenu_cart_${tableId}`) } catch {}
      if (tid === myId) setTableClosed(true)
    })

    socket.on('table_status_update', ({ table_id, status }) => {
      const tid = Number(table_id)
      const myId = Number(effectiveTableId || tableId)
      if (tid === myId && status === 'vacant') {
        setTableClosed(true)
        setCart([])
        try { localStorage.removeItem(`qrmenu_cart_${tableId}`) } catch {}
      }
    })

    return () => socket.disconnect()
  }, [])

  /* ── Fetch menus + categories + tables + settings ── */
  useEffect(() => {
    setMenuLoading(true)
    Promise.allSettled([
      axios.get(`${API_BASE}/categories`),
      axios.get(`${API_BASE}/menus`),
      axios.get(`${API_BASE}/tables`),
      axios.get(`${API_BASE}/settings`),
    ]).then(([catResult, menuResult, tablesResult, settingsResult]) => {
      if (catResult.status === 'fulfilled' && catResult.value.data?.data?.length) {
        setCategories([{ id: 0, name: 'ทั้งหมด' }, ...catResult.value.data.data])
      } else {
        setCategories([{ id: 0, name: 'ทั้งหมด' }])
      }
      if (menuResult.status === 'fulfilled' && menuResult.value.data?.data) {
        setMenus(menuResult.value.data.data.map(m => ({ ...m, price: Number(m.price) })))
      }
      if (tablesResult.status === 'fulfilled') {
        setTables(tablesResult.value.data?.data ?? [])
      }
      if (settingsResult.status === 'fulfilled') {
        const s = settingsResult.value.data?.data || {}
        setPaymentQrUrl(s.payment_qr_url || '')
        if (s.restaurant_name) setRestaurantName(s.restaurant_name)
      }
    }).finally(() => setMenuLoading(false))
  }, [])

  /* ── Fetch orders (public endpoint, รันทันทีที่โหลดหน้า) ── */
  useEffect(() => {
    setOrdersLoading(true)
    axios.get(`${API_BASE}/tables/${effectiveTableId}/orders`)
      .then(r => {
        if (r.data?.data) {
          setOrders(prev => {
            const existingIds = new Set(prev.map(o => o.id).filter(Boolean))
            const incoming = r.data.data.filter(o => !existingIds.has(o.id))
            return [...incoming, ...prev]
          })
        }
        setOrdersLoaded(true)
      })
      .catch(() => setOrdersLoaded(true))
      .finally(() => setOrdersLoading(false))
  }, [effectiveTableId])

  /* ── Derived ── */
  const filtered = activeCat === 0 ? menus : menus.filter(m => m.category_id === activeCat)

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0)
  const cartTotal = cart.reduce((s, i) => s + i.unitPrice * i.quantity, 0)

  const activeOrderCount = orders.filter(o =>
    ['pending', 'preparing', 'serving', 'request_checkout'].includes(o.status)
  ).length

  const canRequestCheckout = orders.some(o => ['pending', 'preparing', 'serving', 'served'].includes(o.status))
  const hasRequestedCheckout = orders.some(o => o.status === 'request_checkout')

  /* ── Cart helpers ── */
  const openOptionModal = useCallback((menu) => {
    setOptionMenu(menu)
  }, [])

  const addCartItem = useCallback((menuId, options, note) => {
    const key = cartKey(menuId, options, note)
    setCart(prev => {
      const existing = prev.find(i => i.key === key)
      if (existing) {
        return prev.map(i => i.key === key ? { ...i, quantity: i.quantity + 1 } : i)
      }
      const menu = menus.find(m => m.id === menuId)
      if (!menu) return prev
      const optionsPrice = options.reduce((s, o) => s + (Number(o.extra) || 0), 0)
      return [...prev, {
        key,
        menuId,
        name:        menu.name,
        basePrice:   menu.price,
        optionsPrice,
        unitPrice:   menu.price + optionsPrice,
        options,
        note:        note || '',
        quantity:    1,
        image_url:   menu.image_url,
      }]
    })
    setOptionMenu(null)
    setCartBump(b => b + 1)
  }, [menus])

  const confirmOption = useCallback((options, note) => {
    if (!optionMenu) return
    addCartItem(optionMenu.id, options, note)
  }, [optionMenu, addCartItem])

  const incrementCart = useCallback((key) => {
    setCart(prev => prev.map(i => i.key === key ? { ...i, quantity: i.quantity + 1 } : i))
  }, [])

  const decrementCart = useCallback((key) => {
    setCart(prev => {
      const item = prev.find(i => i.key === key)
      if (!item) return prev
      if (item.quantity <= 1) return prev.filter(i => i.key !== key)
      return prev.map(i => i.key === key ? { ...i, quantity: i.quantity - 1 } : i)
    })
  }, [])

  /* ── Change table ── */
  const handleChangeTable = useCallback((newTableId, newCount) => {
    setEffectiveTableId(newTableId)
    setEffectiveCount(newCount)
    setShowChangeTable(false)
    setOrders([])
    setOrdersLoaded(false)
  }, [])

  /* ── Request checkout (เรียกเก็บเงิน) ── */
  const requestCheckout = async () => {
    if (requestingCheckout) return
    setRequestingCheckout(true)
    try {
      await axios.post(`${API_BASE}/tables/${effectiveTableId}/request-checkout`)
      setOrders(prev => prev.map(o =>
        ['pending', 'preparing', 'serving', 'served'].includes(o.status)
          ? { ...o, status: 'request_checkout' }
          : o
      ))
    } catch (err) {
      alert(err.response?.data?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setRequestingCheckout(false)
    }
  }

  /* ── Submit order (เรียกจาก CheckoutModal เท่านั้น) ── */
  const submitOrder = async () => {
    if (!cart.length || sending) return
    setSending(true)
    try {
      const res = await axios.post(`${API_BASE}/orders`, {
        table_id:       Number(effectiveTableId),
        customer_count: effectiveCount,
        items: cart.map(i => ({
          menu_id:  i.menuId,
          quantity: i.quantity,
          options:  i.options,
          note:     i.note || undefined,
        })),
      })
      const order = res.data?.data
      if (order) {
        setOrders(prev => [{ ...order, status: order.status || 'pending' }, ...prev])
      }

      setCart([])
      try { localStorage.removeItem(`qrmenu_cart_${effectiveTableId}`) } catch {}
      setShowCheckout(false)
      setActiveTab('orders')
    } catch (err) {
      console.error('[submitOrder]', err)
      alert(err.response?.data?.message || 'เกิดข้อผิดพลาด กรุณาลองใหม่')
    } finally {
      setSending(false)
    }
  }

  const menuQty = (menuId) => cart.filter(i => i.menuId === menuId).reduce((s, i) => s + i.quantity, 0)

  /* ── หน้าขอบคุณ: แสดงเมื่อโต๊ะถูกปิดหรือชำระเงินแล้ว ── */
  if (tableClosed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-400 via-rose-400 to-pink-500 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col items-center gap-5">
          <div className="w-28 h-28 bg-white/20 backdrop-blur-xl rounded-3xl flex items-center justify-center text-6xl shadow-2xl ring-2 ring-white/30">
            🙏
          </div>
          <div>
            <h1 className="text-3xl font-black drop-shadow-lg">ขอบคุณที่ใช้บริการ</h1>
            <p className="mt-2 text-white/80 text-sm font-medium leading-relaxed">
              ชำระเงินเรียบร้อยแล้ว<br />
              โต๊ะที่ {effectiveTableId} พร้อมให้บริการลูกค้าท่านต่อไป
            </p>
          </div>
          <div className="mt-2 bg-white/20 backdrop-blur-sm rounded-2xl px-6 py-4 ring-1 ring-white/30">
            <p className="text-white font-black text-lg">{restaurantName}</p>
            <p className="text-white/70 text-xs mt-0.5">หวังว่าจะได้พบกันอีก 😊</p>
          </div>
          <button
            onClick={() => window.location.href = '/'}
            className="mt-2 px-8 py-3 bg-white text-orange-500 font-black rounded-2xl shadow-xl active:scale-95 transition-all text-sm"
          >
            กลับหน้าหลัก →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-stone-50 select-none flex flex-col">

      {/* ── Modals ── */}
      {optionMenu && (
        <OptionsModal
          menu={optionMenu}
          onConfirm={confirmOption}
          onClose={() => setOptionMenu(null)}
        />
      )}
      {showChangeTable && (
        <ChangeTableModal
          currentTableId={effectiveTableId}
          currentCount={effectiveCount}
          tables={tables}
          onConfirm={handleChangeTable}
          onClose={() => setShowChangeTable(false)}
        />
      )}
      {showCheckout && (
        <CheckoutModal
          cart={cart}
          cartTotal={cartTotal}
          cartCount={cartCount}
          effectiveTableId={effectiveTableId}
          effectiveCount={effectiveCount}
          onConfirm={submitOrder}
          onClose={() => setShowCheckout(false)}
          sending={sending}
          paymentQrUrl={paymentQrUrl}
        />
      )}

      {/* ─── Hero Header ─── */}
      <div className="relative bg-gradient-to-br from-amber-500 via-orange-600 to-rose-600 text-white overflow-hidden flex-shrink-0">
        {/* Decorative blobs */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-yellow-300/20 rounded-full blur-2xl" />
        <div className="absolute top-10 right-1/3 w-32 h-32 bg-orange-200/20 rounded-full blur-2xl" />
        <div className="absolute -bottom-12 -left-8 w-40 h-40 bg-rose-400/30 rounded-full blur-2xl" />
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />

        <div className="relative px-4 pt-6 pb-4">
          {/* Connection pill */}
          <div className="absolute top-3 right-4 inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md px-2 py-0.5 rounded-full ring-1 ring-white/20">
            <span className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-300 animate-pulse' : 'bg-white/40'}`} />
            <span className="text-[10px] text-white/90 font-bold uppercase tracking-wider">{connected ? 'ออนไลน์' : 'ออฟไลน์'}</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="absolute inset-0 bg-white/20 blur-xl rounded-2xl" />
              <div className="relative w-12 h-12 bg-white/25 backdrop-blur-xl rounded-2xl flex items-center justify-center text-2xl ring-1 ring-white/40 shadow-lg">🍜</div>
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-black tracking-tight drop-shadow truncate">{restaurantName}</h1>
              <p className="text-xs text-orange-50/90 font-medium">อาหารไทยต้นตำรับ • รสชาติจัดจ้าน</p>
            </div>
          </div>

          <div className="mt-3.5 flex items-center gap-2 flex-wrap">
            <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md rounded-xl px-3 py-2 ring-1 ring-white/20 shadow-md">
              <span className="text-lg">🪑</span>
              <div>
                <p className="text-[9px] text-orange-50/80 font-black uppercase tracking-widest leading-none">โต๊ะของคุณ</p>
                <p className="text-sm font-black leading-none mt-1">โต๊ะที่ {effectiveTableId}</p>
              </div>
            </div>
            <button
              onClick={() => setShowChangeTable(true)}
              className="bg-white/20 hover:bg-white/30 backdrop-blur-md text-white text-xs font-black px-3 py-2 rounded-xl ring-1 ring-white/20 shadow-md transition-all active:scale-95"
            >
              เปลี่ยน
            </button>
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md rounded-xl px-3 py-2 ring-1 ring-white/20 shadow-md">
              <span className="text-lg">👥</span>
              <div>
                <p className="text-[9px] text-orange-50/80 font-black uppercase tracking-widest leading-none">จำนวนคน</p>
                <p className="text-sm font-black leading-none mt-1">{effectiveCount} คน</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom curve */}
        <div className="h-4 bg-stone-50 rounded-t-[2rem] -mb-px" />
      </div>

      {/* ─── Tab Content ─── */}
      <div className="flex-1 overflow-y-auto pb-24">

        {/* ── TAB: เมนู ── */}
        {activeTab === 'menu' && (
          <>
            {/* Category bar + layout toggle */}
            <div className="sticky top-0 z-10 bg-stone-50/90 backdrop-blur-md border-b border-stone-200/60">
              <div className="flex items-center gap-2 px-4 py-3">
                {/* Scrollable category pills */}
                <div className="flex gap-2 overflow-x-auto scrollbar-none flex-1">
                  {categories.map(cat => {
                    const isActive = activeCat === cat.id
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setActiveCat(cat.id)}
                        className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-black transition-all duration-200 ${
                          isActive
                            ? 'bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-lg shadow-orange-300/40 scale-105'
                            : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:ring-orange-300 hover:text-orange-600'
                        }`}
                      >
                        {cat.name}
                      </button>
                    )
                  })}
                </div>

                {/* View-mode toggle */}
                <button
                  onClick={() => setViewMode(v => v === 'list' ? 'grid' : 'list')}
                  title={viewMode === 'list' ? 'สลับเป็นตาราง' : 'สลับเป็นรายการ'}
                  className="flex-shrink-0 w-9 h-9 rounded-xl bg-white ring-1 ring-stone-200 flex items-center justify-center text-stone-500 hover:ring-orange-400 hover:text-orange-600 transition-all shadow-sm active:scale-90"
                >
                  {viewMode === 'list' ? (
                    /* grid icon */
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                      <rect x="3" y="3" width="7" height="7" rx="1.5"/>
                      <rect x="14" y="3" width="7" height="7" rx="1.5"/>
                      <rect x="3" y="14" width="7" height="7" rx="1.5"/>
                      <rect x="14" y="14" width="7" height="7" rx="1.5"/>
                    </svg>
                  ) : (
                    /* list icon */
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {menuLoading ? (
              <div className={viewMode === 'grid' ? 'grid grid-cols-2 gap-3 p-4' : 'flex flex-col gap-2.5 px-4 py-3'}>
                {[...Array(viewMode === 'grid' ? 6 : 5)].map((_, i) => <MenuCardSkeleton key={i} mode={viewMode} />)}
              </div>
            ) : menus.length === 0 ? (
              <div className="flex justify-center items-center py-20">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto bg-gradient-to-br from-orange-50 to-amber-50 rounded-full flex items-center justify-center text-4xl mb-3">🍽️</div>
                  <p className="text-stone-700 font-bold">ยังไม่มีเมนู</p>
                  <p className="text-xs text-stone-400 mt-1">กรุณาติดต่อพนักงาน</p>
                </div>
              </div>

            ) : viewMode === 'list' ? (

              /* ── LIST VIEW: horizontal cards ── */
              <div className="flex flex-col gap-2.5 px-4 py-3">
                {filtered.map((menu, idx) => {
                  const qty     = menuQty(menu.id)
                  const isAvail = menu.is_available !== false && menu.is_available !== 0
                  const cc      = getCatColor(menu.category_name)

                  return (
                    <div
                      key={menu.id}
                      style={{ animationDelay: `${idx * 28}ms`, animation: 'slideUp 0.3s ease-out both' }}
                      className={`group relative flex overflow-hidden bg-white rounded-2xl shadow-sm border transition-all duration-300 ${
                        !isAvail
                          ? 'border-stone-100 opacity-55'
                          : qty > 0
                            ? 'border-orange-200 shadow-orange-50 hover:shadow-lg hover:shadow-orange-100/60 active:scale-[0.99]'
                            : 'border-stone-100 hover:shadow-lg hover:shadow-orange-100/60 hover:border-orange-100 active:scale-[0.99]'
                      }`}
                    >
                      {/* Left: flush image */}
                      <div className="relative w-[92px] flex-shrink-0 self-stretch">
                        <ImageWithFallback
                          src={menu.image_url}
                          alt={menu.name}
                          emoji={menu.emoji || '🍽️'}
                          className={`w-full h-full object-cover transition-transform duration-500 ${isAvail ? 'group-hover:scale-105' : ''}`}
                        />
                        {/* Unavailable overlay */}
                        {!isAvail && (
                          <div className="absolute inset-0 bg-stone-900/35 flex items-center justify-center">
                            <span className="text-[9px] font-black text-white text-center leading-tight px-1">
                              หมด<br/>ชั่วคราว
                            </span>
                          </div>
                        )}
                        {/* In-cart qty bubble */}
                        {qty > 0 && isAvail && (
                          <div className="absolute top-1.5 left-1.5 min-w-[20px] h-5 bg-orange-500 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 shadow-md ring-1.5 ring-white">
                            ×{qty}
                          </div>
                        )}
                        {/* Badge ribbon */}
                        {menu.badge && isAvail && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[8px] font-black text-center py-0.5 leading-tight">
                            {menu.badge}
                          </div>
                        )}
                      </div>

                      {/* Right: content */}
                      <div className="flex-1 min-w-0 flex flex-col justify-center px-3 py-2.5 gap-0.5">
                        {/* Category pill */}
                        {menu.category_name && (
                          <span className={`self-start text-[9px] font-black px-1.5 py-0.5 rounded-full ${cc.bg} ${cc.text}`}>
                            {menu.category_name}
                          </span>
                        )}

                        {/* Name */}
                        <p className={`text-sm font-bold line-clamp-1 leading-snug ${isAvail ? 'text-stone-800' : 'text-stone-400'}`}>
                          {menu.name}
                        </p>

                        {/* Description */}
                        {menu.description && (
                          <p className="text-[11px] text-stone-400 line-clamp-1">{menu.description}</p>
                        )}

                        {/* Price row + add button */}
                        <div className="flex items-center justify-between mt-1.5">
                          <div className="flex items-baseline gap-1.5 flex-wrap">
                            <span className={`font-black text-base leading-none ${isAvail ? 'bg-gradient-to-br from-orange-600 to-rose-600 bg-clip-text text-transparent' : 'text-stone-400'}`}>
                              ฿{menu.price}
                            </span>
                            {isAvail && Array.isArray(menu.options) && menu.options.length > 0 && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-500 ring-1 ring-orange-200">
                                ⚙️ ปรับแต่งได้
                              </span>
                            )}
                          </div>
                          {isAvail && (
                            <button
                              onClick={() => {
                                const opts = Array.isArray(menu.options) ? menu.options : []
                                if (opts.length === 0) addCartItem(menu.id, [], '')
                                else openOptionModal(menu)
                              }}
                              className="w-8 h-8 flex-shrink-0 bg-gradient-to-br from-orange-500 to-rose-500 text-white rounded-full flex items-center justify-center text-xl font-black shadow-md shadow-orange-200 active:scale-90 hover:scale-110 hover:shadow-lg hover:shadow-orange-300/50 transition-all ring-2 ring-white"
                            >+</button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

            ) : (

              /* ── GRID VIEW: 2-column cards ── */
              <div className="grid grid-cols-2 gap-3 p-4">
                {filtered.map((menu, idx) => {
                  const qty     = menuQty(menu.id)
                  const isAvail = menu.is_available !== false && menu.is_available !== 0
                  const cc      = getCatColor(menu.category_name)

                  return (
                    <div
                      key={menu.id}
                      style={{ animationDelay: `${idx * 28}ms`, animation: 'slideUp 0.3s ease-out both' }}
                      className={`group relative bg-white rounded-2xl overflow-hidden shadow-sm border border-stone-100 transition-all duration-300 ${
                        isAvail
                          ? qty > 0
                            ? 'border-orange-200 hover:shadow-xl hover:shadow-orange-100 hover:-translate-y-1'
                            : 'hover:shadow-xl hover:shadow-orange-100 hover:-translate-y-1 hover:border-orange-200'
                          : 'opacity-60'
                      }`}
                    >
                      <div className="relative h-36 overflow-hidden">
                        <ImageWithFallback
                          src={menu.image_url}
                          alt={menu.name}
                          emoji={menu.emoji || '🍽️'}
                          className={`w-full h-full object-cover transition-transform duration-500 ${isAvail ? 'group-hover:scale-110' : ''}`}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                        {!isAvail ? (
                          <span className="absolute top-2 left-2 bg-stone-800/90 backdrop-blur-sm text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md">
                            🚫 หมด
                          </span>
                        ) : menu.badge ? (
                          <span className="absolute top-2 left-2 bg-gradient-to-r from-orange-500 to-rose-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md">
                            {menu.badge}
                          </span>
                        ) : null}

                        {qty > 0 && isAvail && (
                          <span className="absolute top-2 right-2 bg-white/95 backdrop-blur-sm text-orange-600 text-xs font-black px-2 py-0.5 rounded-full shadow-md ring-1 ring-orange-200">
                            ×{qty}
                          </span>
                        )}

                        {isAvail && (
                          <button
                            onClick={() => {
                              const opts = Array.isArray(menu.options) ? menu.options : []
                              if (opts.length === 0) addCartItem(menu.id, [], '')
                              else openOptionModal(menu)
                            }}
                            className="absolute bottom-2 right-2 w-10 h-10 bg-gradient-to-br from-orange-500 to-rose-500 text-white rounded-full flex items-center justify-center text-2xl font-black shadow-lg shadow-orange-300/50 active:scale-90 hover:scale-110 transition-transform ring-2 ring-white/30"
                          >+</button>
                        )}
                      </div>

                      <div className="p-3">
                        {menu.category_name && (
                          <span className={`inline-block text-[8px] font-black px-1.5 py-0.5 rounded-full mb-1.5 ${cc.bg} ${cc.text}`}>
                            {menu.category_name}
                          </span>
                        )}
                        <p className={`text-sm font-bold line-clamp-2 leading-snug mb-1.5 min-h-[2.5rem] ${isAvail ? 'text-stone-800' : 'text-stone-400'}`}>
                          {menu.name}
                        </p>
                        <div className="flex items-baseline justify-between gap-1">
                          <span className={`font-black text-lg ${isAvail ? 'bg-gradient-to-br from-orange-600 to-rose-600 bg-clip-text text-transparent' : 'text-stone-400'}`}>
                            ฿{menu.price}
                          </span>
                          {isAvail && Array.isArray(menu.options) && menu.options.length > 0 && (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-orange-50 text-orange-500 ring-1 ring-orange-200 flex-shrink-0">
                              ⚙️
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── TAB: ออเดอร์ ── */}
        {activeTab === 'orders' && (
          <div className="py-2">
            <OrderTracker orders={orders} loading={ordersLoading} />

            {/* ปุ่มเรียกเก็บเงิน */}
            {!ordersLoading && (canRequestCheckout || hasRequestedCheckout) && (
              <div className="mx-4 mt-3 mb-4">
                {hasRequestedCheckout ? (
                  <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-4">
                    <div className="text-2xl animate-pulse">🧾</div>
                    <div>
                      <p className="text-sm font-black text-amber-800">ส่งคำขอเช็คบิลแล้ว</p>
                      <p className="text-xs text-amber-600 mt-0.5">กรุณารอพนักงานมาเก็บเงิน</p>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={requestCheckout}
                    disabled={requestingCheckout}
                    className="group relative w-full overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500 text-white rounded-2xl py-4 font-black text-base shadow-xl shadow-orange-300/50 active:scale-[0.98] disabled:opacity-60 transition-all hover:shadow-2xl"
                  >
                    {!requestingCheckout && (
                      <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                    )}
                    <span className="relative flex items-center justify-center gap-2">
                      {requestingCheckout ? (
                        <>
                          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                          กำลังส่งคำขอ...
                        </>
                      ) : (
                        <>🧾 เรียกเก็บเงิน / เช็คบิล</>
                      )}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── TAB: ตะกร้า ── */}
        {activeTab === 'cart' && (
          <div className="px-4 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-stone-900 flex items-center gap-2">
                <span className="text-2xl">🛒</span> ตะกร้าสินค้า
              </h2>
              <p className="text-xs text-stone-500 font-semibold">{cartCount} รายการ · โต๊ะ {effectiveTableId}</p>
            </div>

            {cart.length === 0 ? (
              <div className="py-20 text-center">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-orange-50 to-amber-50 rounded-full flex items-center justify-center text-5xl mb-4 ring-4 ring-orange-100/50">
                  🛒
                </div>
                <p className="text-stone-700 font-black text-lg">ตะกร้าว่างอยู่</p>
                <p className="text-sm text-stone-400 mt-1">ไปเลือกเมนูที่ชอบก่อนนะคะ</p>
                <button
                  onClick={() => setActiveTab('menu')}
                  className="mt-5 inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-rose-500 text-white rounded-2xl text-sm font-black shadow-lg shadow-orange-300/40 active:scale-95 hover:shadow-xl transition-all"
                >
                  ดูเมนู
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-2.5">
                  {cart.map(item => (
                    <div key={item.key} className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm border border-stone-100 hover:shadow-md hover:border-orange-100 transition-all">
                      <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 ring-1 ring-stone-100">
                        <ImageWithFallback src={item.image_url} alt={item.name} emoji="🍽️" className="w-full h-full object-cover" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-stone-800 line-clamp-1">{item.name}</p>
                        {item.options.length > 0 && (
                          <p className="text-[11px] text-orange-600 font-bold mt-0.5 line-clamp-1">
                            + {item.options.map(o => o.label).join(', ')}
                          </p>
                        )}
                        {item.note && (
                          <p className="text-[11px] text-rose-500 font-bold mt-0.5 line-clamp-1">
                            📝 {item.note}
                          </p>
                        )}
                        <div className="flex items-baseline gap-1.5 mt-1">
                          <span className="text-orange-600 font-black text-sm">
                            ฿{(item.unitPrice * item.quantity).toLocaleString()}
                          </span>
                          <span className="text-[10px] text-stone-400 font-medium">฿{item.unitPrice} × {item.quantity}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0 bg-stone-50 rounded-full p-1">
                        <button
                          onClick={() => decrementCart(item.key)}
                          className="w-8 h-8 rounded-full bg-white text-stone-600 font-black text-base flex items-center justify-center active:scale-90 transition-transform shadow-sm ring-1 ring-stone-200 hover:bg-rose-50 hover:text-rose-500"
                        >−</button>
                        <span className="w-5 text-center font-black text-stone-800">{item.quantity}</span>
                        <button
                          onClick={() => incrementCart(item.key)}
                          className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-rose-500 text-white font-black text-base flex items-center justify-center active:scale-90 transition-transform shadow-md"
                        >+</button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="relative overflow-hidden bg-gradient-to-br from-orange-50 via-amber-50 to-rose-50 rounded-2xl px-5 py-4 ring-1 ring-orange-100">
                  <div className="absolute -top-8 -right-8 w-32 h-32 bg-orange-200/30 rounded-full blur-2xl" />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-sm text-stone-700 font-bold">{cartCount} รายการ · {effectiveCount} คน</p>
                      <p className="text-[10px] text-stone-500">ยังไม่รวม VAT</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-orange-600 font-black uppercase tracking-wider">ยอดรวม</p>
                      <p className="text-3xl font-black bg-gradient-to-br from-orange-600 to-rose-600 bg-clip-text text-transparent">฿{cartTotal.toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setShowCheckout(true)}
                  disabled={sending}
                  className="group relative w-full overflow-hidden bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 text-white rounded-2xl py-4 font-black text-base shadow-xl shadow-emerald-300/50 active:scale-[0.98] transition-all disabled:opacity-60 disabled:scale-100 hover:shadow-2xl"
                >
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                  <span className="relative flex items-center justify-center gap-2">
                    🛒 ดูสรุปและยืนยันสั่งอาหาร
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
                  </span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* ─── Bottom Tab Bar ─── */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-xl border-t border-stone-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] flex-shrink-0">
        <div className="flex h-[68px] max-w-md mx-auto">

          <TabButton
            active={activeTab === 'menu'}
            onClick={() => setActiveTab('menu')}
            icon="🍜"
            label="เมนู"
          />

          <TabButton
            active={activeTab === 'orders'}
            onClick={() => setActiveTab('orders')}
            icon="📦"
            label="ออเดอร์"
            badge={activeOrderCount}
            badgeColor="bg-gradient-to-br from-orange-500 to-rose-500"
          />

          <TabButton
            active={activeTab === 'cart'}
            onClick={() => setActiveTab('cart')}
            icon="🛒"
            label="ตะกร้า"
            badge={cartCount}
            badgeColor="bg-gradient-to-br from-rose-500 to-red-600"
            bump={cartBump}
          />
        </div>
      </div>

      {/* ─── Inline keyframes ─── */}
      <style>{`
        @keyframes fadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { scrollbar-width: none; }
      `}</style>
    </div>
  )
}

/* ─── Tab Button sub-component ─── */
function TabButton({ active, onClick, icon, label, badge, badgeColor = 'bg-rose-500', bump = 0 }) {
  return (
    <button
      onClick={onClick}
      className="flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-all group"
    >
      {active && (
        <span className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-gradient-to-r from-orange-500 to-rose-500 rounded-b-full" />
      )}
      <div className={`relative flex items-center justify-center transition-all duration-300 ${active ? 'scale-110 -translate-y-0.5' : 'scale-100'}`}>
        <span className={`text-2xl transition-all ${active ? 'drop-shadow-md' : 'grayscale opacity-60 group-hover:opacity-90 group-hover:grayscale-0'}`}>
          {icon}
        </span>
        {badge > 0 && (
          <span
            key={bump}
            className={`absolute -top-1.5 -right-2.5 min-w-[20px] h-5 ${badgeColor} text-white text-[10px] font-black rounded-full flex items-center justify-center px-1.5 shadow-md ring-2 ring-white animate-bounce`}
          >
            {badge}
          </span>
        )}
      </div>
      <span className={`text-[10px] font-black transition-colors ${active ? 'text-orange-600' : 'text-stone-400'}`}>
        {label}
      </span>
    </button>
  )
}
