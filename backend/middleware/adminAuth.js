const jwt = require('jsonwebtoken')

const JWT_SECRET   = process.env.JWT_SECRET   || 'changeme_restaurant_secret'
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'rotbus228@gmail.com').split(',').map(e => e.trim())

module.exports = function adminAuth(req, res, next) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'กรุณาเข้าสู่ระบบก่อน' })
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET)
    if (!ADMIN_EMAILS.includes(payload.email)) {
      return res.status(403).json({ success: false, message: 'ไม่มีสิทธิ์เข้าถึงส่วน Admin' })
    }
    req.admin = payload
    next()
  } catch {
    return res.status(401).json({ success: false, message: 'Token ไม่ถูกต้องหรือหมดอายุ' })
  }
}
