const express = require('express')
const jwt     = require('jsonwebtoken')
const router  = express.Router()

const JWT_SECRET     = process.env.JWT_SECRET     || 'changeme_restaurant_secret'
const ADMIN_EMAILS   = (process.env.ADMIN_EMAILS  || 'rotbus228@gmail.com').split(',').map(e => e.trim())
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin1234'

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'กรุณากรอกอีเมลและรหัสผ่าน' })
  }
  if (!ADMIN_EMAILS.includes(email)) {
    return res.status(403).json({ success: false, message: 'อีเมลนี้ไม่มีสิทธิ์เข้าถึงระบบ Admin' })
  }
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: 'รหัสผ่านไม่ถูกต้อง' })
  }
  const token = jwt.sign({ email, isAdmin: true }, JWT_SECRET, { expiresIn: '24h' })
  return res.json({ success: true, token, email })
})

module.exports = router
