import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { getAuthHeaders, adminLogout, handleAuthError } from '../../utils/adminAuth'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const EMPTY_FORM = { category_id: '', name: '', description: '', price: '', image_url: '', is_available: true, options: [] }

/* ─── Toggle Switch ─────────────────────────────────────────────────────────── */
function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      style={{ width: '52px' }}
      className={`relative inline-flex h-7 items-center rounded-full transition-all duration-300 shadow-inner
        focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/30
        disabled:opacity-50 disabled:cursor-not-allowed
        ${checked ? 'bg-gradient-to-r from-emerald-400 to-green-500 shadow-emerald-200' : 'bg-slate-300'}`}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-300
        ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

/* ─── CategoryManageSection ─────────────────────────────────────────────────── */
function CategoryManageSection({ categories, onAdd, onDelete, disabled }) {
  const [newName, setNewName] = useState('')
  const [adding,  setAdding]  = useState(false)

  const handleAdd = async () => {
    if (!newName.trim()) return
    setAdding(true)
    await onAdd(newName.trim())
    setNewName('')
    setAdding(false)
  }

  return (
    <div className="relative overflow-hidden bg-white rounded-3xl shadow-sm border border-slate-100 p-5 mb-5 animate-[slideDown_0.3s_ease-out]">
      <div className="absolute -top-8 -right-8 w-32 h-32 bg-indigo-100/40 rounded-full blur-2xl" />
      <h2 className="relative text-base font-black text-slate-800 mb-4 flex items-center gap-2">
        <span className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center text-lg shadow-md text-white">🗂️</span>
        จัดการหมวดหมู่
      </h2>

      <div className="relative flex gap-2 mb-4">
        <input
          type="text"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          placeholder="ชื่อหมวดหมู่ใหม่ เช่น ของหวาน"
          disabled={disabled}
          className="flex-1 border-2 border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none disabled:opacity-50 transition-all"
        />
        <button
          onClick={handleAdd}
          disabled={disabled || adding || !newName.trim()}
          className="px-5 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-lg hover:shadow-indigo-200 disabled:opacity-40 text-white text-sm font-black rounded-xl transition-all active:scale-95"
        >
          {adding ? '⏳' : '➕ เพิ่ม'}
        </button>
      </div>

      {categories.length === 0 ? (
        <p className="relative text-sm text-slate-400 text-center py-4">ยังไม่มีหมวดหมู่</p>
      ) : (
        <div className="relative grid grid-cols-1 sm:grid-cols-2 gap-2">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between bg-gradient-to-br from-slate-50 to-slate-100 hover:from-indigo-50 hover:to-purple-50 rounded-xl px-3 py-2.5 ring-1 ring-slate-100 hover:ring-indigo-200 transition-all">
              <span className="text-sm font-bold text-slate-700 flex items-center gap-2">
                <span className="text-base">🏷️</span> {cat.name}
              </span>
              <button
                onClick={() => onDelete(cat)}
                disabled={disabled}
                title="ลบหมวดหมู่"
                className="w-8 h-8 rounded-lg hover:bg-red-100 text-red-400 hover:text-red-600 disabled:opacity-30 transition-all active:scale-90 flex items-center justify-center"
              >
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── OptionAdder ────────────────────────────────────────────────────────────── */
function OptionAdder({ onAdd }) {
  const [name,  setName]  = useState('')
  const [price, setPrice] = useState('')

  const handleAdd = () => {
    if (!name.trim()) return
    onAdd({ name: name.trim(), extra_price: Number(price) || 0 })
    setName('')
    setPrice('')
  }

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={name}
        onChange={e => setName(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
        placeholder="เช่น เพิ่มไข่ดาว, พิเศษ"
        className="flex-1 border-2 border-dashed border-slate-200 rounded-xl px-3 py-2 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all"
      />
      <input
        type="number"
        min={0}
        value={price}
        onChange={e => setPrice(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleAdd()}
        placeholder="฿0"
        className="w-20 border-2 border-dashed border-slate-200 rounded-xl px-3 py-2 text-sm text-center focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none transition-all"
      />
      <button
        type="button"
        onClick={handleAdd}
        disabled={!name.trim()}
        className="px-3 py-2 bg-indigo-100 hover:bg-indigo-200 disabled:opacity-40 text-indigo-700 rounded-xl text-sm font-black transition-colors"
      >➕</button>
    </div>
  )
}

/* ─── Quick-preset options ────────────────────────────────────────────────── */
const OPTION_PRESETS = [
  { name: 'เพิ่มไข่ดาว',   extra_price: 10  },
  { name: 'พิเศษ',         extra_price: 15  },
  { name: 'ใส่หม้อไฟ',     extra_price: 50  },
  { name: 'ข้าวเปล่า',     extra_price: 15  },
  { name: 'ลูกชิ้น',       extra_price: 15  },
  { name: 'วิปครีม',       extra_price: 15  },
  { name: 'ไม่ใส่ผัก',     extra_price: 0   },
  { name: 'ไม่เผ็ด',       extra_price: 0   },
]

/* ─── Add/Edit Modal ─────────────────────────────────────────────────────────── */
function MenuModal({ open, mode, formData, categories, saving, onChange, onSave, onClose }) {
  /* ⚠️ hooks ต้องอยู่บนสุดก่อน early-return เสมอ */
  const isEdit   = mode === 'edit'
  const [uploading, setUploading] = useState(false)

  if (!open) return null

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await axios.post(`${API_BASE}/api/upload/menu-image`, fd, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
      })
      onChange('image_url', res.data.url)
    } catch (err) {
      alert(err.response?.data?.message || 'อัปโหลดรูปไม่สำเร็จ')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-[2rem] sm:rounded-3xl shadow-2xl max-h-[92vh] overflow-hidden animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]">

        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full" />
        </div>

        {/* Modal header */}
        <div className={`px-6 py-4 ${isEdit ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-100' : 'bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100'}`}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <span className="text-2xl">{isEdit ? '✏️' : '➕'}</span>
              {isEdit ? 'แก้ไขเมนู' : 'เพิ่มเมนูใหม่'}
            </h2>
            <button onClick={onClose} className="w-9 h-9 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-slate-500 transition-colors shadow-sm">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(92vh-72px)] p-6 space-y-4">
          <div>
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2">หมวดหมู่ <span className="text-rose-500">*</span></label>
            <div className="relative">
              <select
                value={formData.category_id}
                onChange={e => onChange('category_id', e.target.value)}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none bg-white appearance-none cursor-pointer transition-all"
              >
                <option value="">-- เลือกหมวดหมู่ --</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/></svg>
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2">ชื่อเมนู <span className="text-rose-500">*</span></label>
            <input
              type="text"
              value={formData.name}
              onChange={e => onChange('name', e.target.value)}
              placeholder="เช่น ข้าวผัดกระเพราหมูสับ"
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2">
              คำอธิบาย <span className="text-slate-400 font-medium normal-case">(ไม่บังคับ)</span>
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={e => onChange('description', e.target.value)}
              placeholder="เช่น ข้าวผัดกะเพราหมูสับ เสิร์ฟพร้อมไข่ดาว รสชาติจัดจ้าน"
              className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none resize-none transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2">ราคา <span className="text-rose-500">*</span></label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">฿</span>
              <input
                type="number" min={0} step={1}
                value={formData.price}
                onChange={e => onChange('price', e.target.value)}
                placeholder="65"
                className="w-full border-2 border-slate-200 rounded-xl pl-9 pr-4 py-3 text-base font-bold focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2">
              รูปภาพเมนู <span className="text-slate-400 font-medium normal-case">(ไม่บังคับ)</span>
            </label>
            <label className={`flex items-center gap-3 w-full border-2 rounded-xl px-4 py-3 cursor-pointer transition-all
              ${uploading ? 'border-indigo-300 bg-indigo-50' : 'border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/40'}`}>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={uploading} />
              <span className="text-2xl flex-shrink-0">{uploading ? '⏳' : '📷'}</span>
              <span className="text-sm text-slate-500 font-medium">
                {uploading ? 'กำลังอัปโหลด...' : 'คลิกเพื่อเลือกรูปภาพ (PNG, JPG, WEBP)'}
              </span>
            </label>
            {formData.image_url && (
              <div className="mt-2 relative w-full h-36 rounded-xl overflow-hidden ring-1 ring-slate-200 bg-slate-50 group">
                <img src={formData.image_url} alt="preview" className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
                <button
                  type="button"
                  onClick={() => onChange('image_url', '')}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >✕</button>
              </div>
            )}
          </div>

          {/* ── Options ── */}
          <div>
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
              ⚙️ ตัวเลือกพิเศษ
              <span className="text-slate-400 font-medium normal-case">(แก้ไขได้เลย)</span>
            </label>

            {/* existing options — inline editable */}
            {(formData.options || []).length > 0 && (
              <div className="space-y-1.5 mb-2">
                {(formData.options || []).map((opt, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-2 py-1.5 ring-1 ring-slate-200 hover:ring-indigo-300 transition-all">
                    <input
                      type="text"
                      value={opt.name}
                      onChange={e => {
                        const next = [...(formData.options || [])]
                        next[i] = { ...next[i], name: e.target.value }
                        onChange('options', next)
                      }}
                      placeholder="ชื่อตัวเลือก"
                      className="flex-1 text-sm font-bold text-slate-700 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-400 focus:bg-white focus:outline-none rounded-lg px-2 py-1 min-w-0 transition-all"
                    />
                    <div className="relative flex-shrink-0">
                      <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold pointer-events-none">+฿</span>
                      <input
                        type="number"
                        min={0}
                        value={opt.extra_price}
                        onChange={e => {
                          const next = [...(formData.options || [])]
                          next[i] = { ...next[i], extra_price: Number(e.target.value) || 0 }
                          onChange('options', next)
                        }}
                        className="w-[72px] text-sm font-black text-orange-600 bg-transparent border border-transparent hover:border-slate-300 focus:border-orange-400 focus:bg-white focus:outline-none rounded-lg pl-6 pr-2 py-1 text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none transition-all"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => onChange('options', (formData.options || []).filter((_, j) => j !== i))}
                      className="w-6 h-6 rounded-full bg-rose-100 hover:bg-rose-200 text-rose-500 flex items-center justify-center text-xs font-black transition-colors flex-shrink-0"
                    >✕</button>
                  </div>
                ))}
              </div>
            )}

            {/* Quick presets */}
            <div className="mb-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">⚡ เพิ่มด่วน</p>
              <div className="flex flex-wrap gap-1.5">
                {OPTION_PRESETS.map(preset => {
                  const added = (formData.options || []).some(o => o.name === preset.name)
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      disabled={added}
                      onClick={() => onChange('options', [...(formData.options || []), { ...preset }])}
                      className={`text-[11px] font-black px-2.5 py-1 rounded-full border transition-all active:scale-95 ${
                        added
                          ? 'bg-indigo-100 border-indigo-200 text-indigo-300 cursor-not-allowed'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700'
                      }`}
                    >
                      {added ? '✓ ' : '＋'}{preset.name}{preset.extra_price > 0 ? ` +฿${preset.extra_price}` : ''}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* add custom option */}
            <OptionAdder onAdd={(opt) => onChange('options', [...(formData.options || []), opt])} />
          </div>

          <div className={`flex items-center justify-between rounded-2xl px-4 py-3 ring-1 ${formData.is_available ? 'bg-emerald-50 ring-emerald-200' : 'bg-rose-50 ring-rose-200'}`}>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{formData.is_available ? '✅' : '🚫'}</span>
              <div>
                <p className="text-sm font-black text-slate-800">สถานะเมนู</p>
                <p className={`text-xs font-bold mt-0.5 ${formData.is_available ? 'text-emerald-600' : 'text-rose-500'}`}>
                  {formData.is_available ? 'พร้อมให้ลูกค้าสั่ง' : 'หมดแล้ว — ลูกค้าจะไม่เห็น'}
                </p>
              </div>
            </div>
            <ToggleSwitch
              checked={formData.is_available}
              onChange={() => onChange('is_available', !formData.is_available)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm active:scale-95 transition-all">
              ยกเลิก
            </button>
            <button
              onClick={onSave}
              disabled={saving || !formData.category_id || !formData.name || !formData.price}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:shadow-lg hover:shadow-indigo-200 text-white font-black text-sm disabled:opacity-50 disabled:hover:shadow-none active:scale-95 transition-all"
            >
              {saving ? '⏳ กำลังบันทึก...' : isEdit ? '💾 บันทึก' : '✅ เพิ่มเมนู'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════ */
export default function MenuManage() {
  const navigate = useNavigate()
  const logout   = () => { adminLogout(); navigate('/', { replace: true }) }

  const [menus,      setMenus]      = useState([])
  const [categories, setCategories] = useState([])
  const [isMock,     setIsMock]     = useState(false)
  const [loading,    setLoading]    = useState(true)
  const [toggling,   setToggling]   = useState({})
  const [toast,      setToast]      = useState(null)
  const [filter,     setFilter]     = useState('all')
  const [modal,      setModal]      = useState({ open: false, mode: 'add', menu: null })
  const [formData,   setFormData]   = useState(EMPTY_FORM)
  const [saving,     setSaving]     = useState(false)
  const [showCatMgr, setShowCatMgr] = useState(false)
  const [search,     setSearch]     = useState('')

  async function loadMenus() {
    setLoading(true)
    try {
      const res  = await axios.get(`${API_BASE}/api/menus`)
      const data = res.data?.data ?? []
      setMenus(data)
      setIsMock(false)
    } catch {
      setIsMock(true)
    } finally {
      setLoading(false)
    }
  }

  async function loadCategories() {
    try {
      const res = await axios.get(`${API_BASE}/api/categories`)
      if (res.data?.data?.length) setCategories(res.data.data)
    } catch { /* no-op */ }
  }

  useEffect(() => {
    loadMenus()
    loadCategories()
  }, [])

  async function handleAddCategory(name) {
    try {
      const res = await axios.post(`${API_BASE}/api/categories`, { name }, { headers: getAuthHeaders() })
      setCategories(prev => [...prev, res.data.data].sort((a, b) => a.name.localeCompare(b.name, 'th')))
      showToast(`✅ เพิ่มหมวดหมู่ "${name}" สำเร็จ`, 'success')
    } catch (err) {
      if (!handleAuthError(err, navigate)) showToast(err.response?.data?.message || '❌ เพิ่มหมวดหมู่ไม่สำเร็จ', 'error')
    }
  }

  async function handleDeleteCategory(cat) {
    if (!window.confirm(`ต้องการลบหมวดหมู่ "${cat.name}" ใช่หรือไม่?`)) return
    try {
      await axios.delete(`${API_BASE}/api/categories/${cat.id}`, { headers: getAuthHeaders() })
      setCategories(prev => prev.filter(c => c.id !== cat.id))
      showToast(`🗑️ ลบหมวดหมู่ "${cat.name}" สำเร็จ`, 'success')
    } catch (err) {
      if (!handleAuthError(err, navigate)) showToast(err.response?.data?.message || '❌ ลบหมวดหมู่ไม่สำเร็จ', 'error')
    }
  }

  async function toggleAvailable(menu) {
    if (toggling[menu.id]) return
    setToggling(p => ({ ...p, [menu.id]: true }))
    const newVal = !menu.is_available
    setMenus(prev => prev.map(m => m.id === menu.id ? { ...m, is_available: newVal } : m))
    try {
      await axios.put(`${API_BASE}/api/menus/${menu.id}/availability`, { is_available: newVal }, { headers: getAuthHeaders() })
      showToast(
        newVal ? `✅ "${menu.name}" เปิดขายแล้ว` : `🚫 "${menu.name}" หมดแล้ว`,
        'success'
      )
    } catch {
      setMenus(prev => prev.map(m => m.id === menu.id ? { ...m, is_available: !newVal } : m))
      showToast('❌ อัปเดตไม่สำเร็จ กรุณาลองใหม่', 'error')
    } finally {
      setToggling(p => ({ ...p, [menu.id]: false }))
    }
  }

  function openAdd() {
    setFormData({ ...EMPTY_FORM, category_id: categories[0]?.id?.toString() || '' })
    setModal({ open: true, mode: 'add', menu: null })
  }

  function openEdit(menu) {
    setFormData({
      category_id:  menu.category_id?.toString() || '',
      name:         menu.name,
      description:  menu.description || '',
      price:        menu.price?.toString() || '',
      image_url:    menu.image_url || '',
      is_available: menu.is_available !== false && menu.is_available !== 0,
      options:      Array.isArray(menu.options) ? menu.options.map(o => ({ name: o.name, extra_price: Number(o.extra_price) || 0 })) : [],
    })
    setModal({ open: true, mode: 'edit', menu })
  }

  function closeModal() { setModal({ open: false, mode: 'add', menu: null }) }
  function changeField(field, value) { setFormData(prev => ({ ...prev, [field]: value })) }

  async function handleSave() {
    if (!formData.category_id || !formData.name || !formData.price) return
    setSaving(true)
    try {
      const payload = {
        category_id:  Number(formData.category_id),
        name:         formData.name.trim(),
        description:  formData.description.trim() || null,
        price:        Number(formData.price),
        image_url:    formData.image_url.trim() || null,
        is_available: formData.is_available,
      }
      const headers = getAuthHeaders()
      let savedMenu
      if (modal.mode === 'add') {
        const res = await axios.post(`${API_BASE}/api/menus`, payload, { headers })
        savedMenu = res.data.data
      } else {
        const res = await axios.put(`${API_BASE}/api/menus/${modal.menu.id}`, payload, { headers })
        savedMenu = res.data.data
      }
      // Save options
      const menuId = savedMenu.id
      const optRes = await axios.put(`${API_BASE}/api/menus/${menuId}/options`, { options: formData.options || [] }, { headers })
      savedMenu = { ...savedMenu, options: optRes.data.data || [] }

      if (modal.mode === 'add') {
        setMenus(prev => [...prev, savedMenu])
        showToast(`✅ เพิ่มเมนู "${payload.name}" สำเร็จ`, 'success')
      } else {
        setMenus(prev => prev.map(m => m.id === menuId ? savedMenu : m))
        showToast(`✅ แก้ไขเมนู "${payload.name}" สำเร็จ`, 'success')
      }
      closeModal()
    } catch {
      showToast('❌ บันทึกไม่สำเร็จ กรุณาลองใหม่', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(menu) {
    if (!window.confirm(`ต้องการลบเมนู "${menu.name}" ใช่หรือไม่?\nการลบไม่สามารถเรียกคืนได้`)) return
    try {
      await axios.delete(`${API_BASE}/api/menus/${menu.id}`, { headers: getAuthHeaders() })
      setMenus(prev => prev.filter(m => m.id !== menu.id))
      showToast(`🗑️ ลบ "${menu.name}" เรียบร้อย`, 'success')
    } catch {
      showToast('❌ ลบไม่สำเร็จ กรุณาลองใหม่', 'error')
    }
  }

  function showToast(msg, type = 'info') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 2800)
  }

  const q = search.trim().toLowerCase()
  const filteredMenus = menus.filter(m => {
    if (filter === 'available'   && !(m.is_available !== false && m.is_available !== 0)) return false
    if (filter === 'unavailable' && !(m.is_available === false || m.is_available === 0)) return false
    if (q && !(`${m.name} ${m.description || ''} ${m.category_name || ''}`.toLowerCase().includes(q))) return false
    return true
  })

  const grouped = filteredMenus.reduce((acc, m) => {
    const cat = m.category_name ?? 'อื่นๆ'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(m)
    return acc
  }, {})

  const availCount   = menus.filter(m => m.is_available !== false && m.is_available !== 0).length
  const unavailCount = menus.length - availCount

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/30 pb-10">

      <MenuModal
        open={modal.open}
        mode={modal.mode}
        formData={formData}
        categories={categories}
        saving={saving}
        onChange={changeField}
        onSave={handleSave}
        onClose={closeModal}
      />

      {/* ── Toast ── */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-5 py-3.5 rounded-2xl shadow-2xl
          text-sm font-black text-white backdrop-blur-xl ring-1 animate-[slideDown_0.3s_ease-out]
          ${toast.type === 'success' ? 'bg-gradient-to-r from-emerald-500 to-green-500 ring-emerald-300/50 shadow-emerald-300/30' : 'bg-gradient-to-r from-rose-500 to-red-500 ring-rose-300/50 shadow-rose-300/30'}`}>
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <header className="relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white shadow-xl sticky top-0 z-30 overflow-hidden">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-purple-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-indigo-400/20 rounded-full blur-3xl" />
        <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }} />

        <div className="relative max-w-5xl mx-auto px-5 py-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 blur-lg rounded-2xl" />
              <div className="relative w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl shadow-lg ring-1 ring-white/30">🍽️</div>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight">จัดการเมนูอาหาร</h1>
              <p className="text-indigo-200 text-xs flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 bg-white/60 rounded-full" />{menus.length} รายการ</span>
                <span className="inline-flex items-center gap-1 bg-emerald-400/20 text-emerald-200 px-2 py-0.5 rounded-full ring-1 ring-emerald-400/30 text-[10px] font-bold">✅ {availCount}</span>
                <span className="inline-flex items-center gap-1 bg-rose-400/20 text-rose-200 px-2 py-0.5 rounded-full ring-1 ring-rose-400/30 text-[10px] font-bold">🚫 {unavailCount}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowCatMgr(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all active:scale-95 ${
                showCatMgr
                  ? 'bg-white text-indigo-700 shadow-lg'
                  : 'bg-white/15 hover:bg-white/25 backdrop-blur-md text-white ring-1 ring-white/20'
              }`}
            >
              🗂️ หมวดหมู่
            </button>
            <button
              onClick={openAdd}
              disabled={isMock}
              title={isMock ? 'เชื่อมต่อ API ไม่ได้' : 'เพิ่มเมนูใหม่'}
              className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-400 to-green-500 hover:shadow-lg hover:shadow-emerald-300/50 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-black transition-all active:scale-95 text-white"
            >
              ➕ เพิ่มเมนู
            </button>
            <Link to="/admin/dashboard" className="flex items-center gap-1.5 px-3 py-2 bg-white/15 hover:bg-white/25 backdrop-blur-md ring-1 ring-white/20 rounded-xl text-xs font-black transition-all">
              <span className="hidden sm:inline">← Dashboard</span>
              <span className="sm:hidden">←</span>
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

      <div className="max-w-5xl mx-auto px-4 py-6">

        {isMock && (
          <div className="mb-5 px-4 py-3.5 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-start gap-3 text-amber-800 text-sm shadow-sm">
            <span className="text-xl flex-shrink-0">⚠️</span>
            <div>
              <p className="font-black mb-0.5">เชื่อมต่อ API ไม่ได้</p>
              <p className="text-xs text-amber-700">ตรวจสอบว่า Backend (port 5000) และ XAMPP MySQL เปิดอยู่</p>
            </div>
          </div>
        )}

        {showCatMgr && (
          <CategoryManageSection
            categories={categories}
            onAdd={handleAddCategory}
            onDelete={handleDeleteCategory}
            disabled={isMock}
          />
        )}

        {/* ── Search + Filter Toolbar ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 mb-5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="ค้นหาเมนู, คำอธิบาย, หมวดหมู่..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-9 py-2.5 text-sm focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 focus:outline-none transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-xs font-black transition-colors" title="ล้างคำค้นหา">
                ×
              </button>
            )}
          </div>

          {/* Filter pills */}
          <div className="flex gap-2 overflow-x-auto scrollbar-none flex-shrink-0">
            {[
              { key: 'all',         label: 'ทั้งหมด',      count: menus.length,   icon: '📋', activeClass: 'from-indigo-500 to-purple-500' },
              { key: 'available',   label: 'พร้อมขาย',     count: availCount,     icon: '✅', activeClass: 'from-emerald-500 to-green-500' },
              { key: 'unavailable', label: 'ปิดอยู่',       count: unavailCount,   icon: '🚫', activeClass: 'from-rose-500 to-red-500' },
            ].map(f => {
              const isActive = filter === f.key
              return (
                <button key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-black transition-all active:scale-95
                    ${isActive
                      ? `bg-gradient-to-r ${f.activeClass} text-white shadow-md`
                      : 'bg-slate-50 text-slate-600 ring-1 ring-slate-200 hover:ring-indigo-300 hover:text-indigo-600'}`}>
                  <span>{f.icon}</span>
                  <span className="hidden sm:inline">{f.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/25' : 'bg-white text-slate-500'}`}>
                    {f.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 bg-slate-200 rounded-xl flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-200 rounded-full w-1/2" />
                  <div className="h-2.5 bg-slate-200 rounded-full w-3/4" />
                  <div className="h-3 bg-slate-200 rounded-full w-1/4" />
                </div>
                <div className="w-12 h-7 bg-slate-200 rounded-full flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {Object.keys(grouped).length === 0 && (
              <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
                <div className="w-24 h-24 mx-auto bg-gradient-to-br from-indigo-50 to-purple-50 rounded-full flex items-center justify-center text-5xl mb-4">🍽️</div>
                <p className="text-slate-700 font-black">ไม่มีเมนูในตัวกรองนี้</p>
                <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนตัวกรอง หรือเพิ่มเมนูใหม่</p>
              </div>
            )}

            {Object.entries(grouped).map(([category, items]) => (
              <section key={category}>
                <div className="flex items-center gap-2 mb-3 px-1">
                  <span className="w-1 h-5 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
                  <h2 className="text-sm font-black text-slate-700 uppercase tracking-wider">{category}</h2>
                  <span className="text-xs text-indigo-700 font-black bg-indigo-100 rounded-full px-2.5 py-0.5">{items.length}</span>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                  {items.map((menu, idx) => {
                    const isAvail = menu.is_available !== false && menu.is_available !== 0
                    return (
                      <div
                        key={menu.id}
                        className={`flex items-center gap-3 px-3 sm:px-4 py-3 transition-colors group
                          ${idx !== 0 ? 'border-t border-slate-100' : ''}
                          ${!isAvail ? 'bg-slate-50/60' : 'hover:bg-indigo-50/30'}`}
                      >
                        <div className={`w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 ring-1 ${isAvail ? 'ring-orange-100 shadow-sm' : 'ring-slate-200 grayscale opacity-70'} bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center`}>
                          {menu.image_url ? (
                            <img src={menu.image_url} alt={menu.name} className="w-full h-full object-cover" onError={e => e.target.style.display='none'} />
                          ) : (
                            <span className="text-2xl">{isAvail ? '🍜' : '🚫'}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className={`text-sm font-black truncate ${isAvail ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                              {menu.name}
                            </p>
                            <span className={`sm:hidden inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${isAvail ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          </div>
                          {menu.description && (
                            <p className="text-xs text-slate-400 truncate mt-0.5">{menu.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <p className={`text-sm font-black ${isAvail ? 'bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent' : 'text-slate-400'}`}>
                              ฿{Number(menu.price).toFixed(0)}
                            </p>
                            <span className={`hidden sm:inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ring-1 ${isAvail ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-rose-50 text-rose-600 ring-rose-200'}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isAvail ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                              {isAvail ? 'พร้อมขาย' : 'ปิด'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => openEdit(menu)} disabled={isMock} title="แก้ไข"
                            className="w-9 h-9 rounded-lg hover:bg-indigo-100 text-indigo-500 hover:text-indigo-700 disabled:opacity-30 transition-all active:scale-90 flex items-center justify-center text-base">
                            ✏️
                          </button>
                          <button onClick={() => handleDelete(menu)} disabled={isMock} title="ลบ"
                            className="hidden sm:flex w-9 h-9 rounded-lg hover:bg-rose-100 text-rose-500 hover:text-rose-700 disabled:opacity-30 transition-all active:scale-90 items-center justify-center text-base">
                            🗑️
                          </button>
                          <div className="pl-2 ml-1 border-l border-slate-200">
                            <ToggleSwitch
                              checked={isAvail}
                              onChange={() => toggleAvailable(menu)}
                              disabled={toggling[menu.id]}
                            />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* ─── Inline keyframes ─── */}
      <style>{`
        @keyframes fadeIn    { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp   { from { opacity: 0; transform: translateY(24px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
        .scrollbar-none::-webkit-scrollbar { display: none; }
        .scrollbar-none { scrollbar-width: none; }
      `}</style>
    </div>
  )
}
