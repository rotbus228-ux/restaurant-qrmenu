const multer = require('multer');
const supabase = require('../config/supabase');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('ต้องเป็นไฟล์รูปภาพเท่านั้น'));
    cb(null, true);
  },
});

const uploadMenuImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'ไม่พบไฟล์รูปภาพ' });

  const ext = req.file.originalname.split('.').pop().toLowerCase() || 'jpg';
  const filename = `menu_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

  try {
    const { error } = await supabase.storage
      .from('menu-images')
      .upload(filename, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (error) throw error;

    const { data } = supabase.storage.from('menu-images').getPublicUrl(filename);
    res.json({ success: true, url: data.publicUrl });
  } catch (err) {
    console.error('[uploadMenuImage]', err);
    res.status(500).json({ success: false, message: err.message || 'อัปโหลดไม่สำเร็จ' });
  }
};

module.exports = { upload, uploadMenuImage };
