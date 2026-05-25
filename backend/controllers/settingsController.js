const supabase = require('../config/supabase');

module.exports = {
  getSettings: async (req, res) => {
    try {
      const { data, error } = await supabase.from('restaurant_settings').select('key, value');
      if (error) throw error;
      const settings = {};
      (data || []).forEach(row => { settings[row.key] = row.value; });
      res.json({ success: true, data: settings });
    } catch (err) {
      console.error('[getSettings]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  setSetting: async (req, res) => {
    const { key } = req.params;
    const { value } = req.body;
    try {
      const { error } = await supabase
        .from('restaurant_settings')
        .upsert({ key, value, updated_at: new Date() }, { onConflict: 'key' });
      if (error) throw error;
      res.json({ success: true });
    } catch (err) {
      console.error('[setSetting]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },
};
