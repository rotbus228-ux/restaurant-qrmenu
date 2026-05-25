const supabase = require('../config/supabase');

const flat = (m) => ({
  ...m,
  category_name: m.categories?.name,
  categories:    undefined,
  options:       (m.menu_options || []).sort((a, b) => a.id - b.id),
  menu_options:  undefined,
});

const menuController = {
  getAllMenus: async (req, res) => {
    try {
      const { category_id } = req.query;
      let q = supabase
        .from('menus')
        .select('*, categories(name), menu_options(id, name, extra_price)')
        .order('category_id')
        .order('name');
      if (category_id) q = q.eq('category_id', category_id);
      const { data, error } = await q;
      if (error) throw error;
      res.json({ success: true, data: data.map(flat) });
    } catch (err) {
      console.error('[getAllMenus]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  getAllCategories: async (req, res) => {
    try {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      console.error('[getAllCategories]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  createCategory: async (req, res) => {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อหมวดหมู่' });
    try {
      const { data, error } = await supabase.from('categories').insert({ name: name.trim() }).select().single();
      if (error) {
        if (error.code === '23505') return res.status(400).json({ success: false, message: `หมวดหมู่ "${name.trim()}" มีอยู่แล้ว` });
        throw error;
      }
      res.status(201).json({ success: true, data });
    } catch (err) {
      console.error('[createCategory]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  deleteCategory: async (req, res) => {
    const { id } = req.params;
    try {
      const { count } = await supabase.from('menus').select('*', { count: 'exact', head: true }).eq('category_id', id);
      if (count > 0) return res.status(400).json({ success: false, message: `ไม่สามารถลบได้ มีเมนูอยู่ ${count} รายการในหมวดนี้` });
      const { data: cat } = await supabase.from('categories').select().eq('id', id).single();
      if (!cat) return res.status(404).json({ success: false, message: 'ไม่พบหมวดหมู่' });
      await supabase.from('categories').delete().eq('id', id);
      res.json({ success: true, message: 'ลบหมวดหมู่สำเร็จ' });
    } catch (err) {
      console.error('[deleteCategory]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  createMenu: async (req, res) => {
    const { category_id, name, description, price, image_url, is_available = true } = req.body;
    if (!category_id || !name || price === undefined) return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
    try {
      const { data, error } = await supabase.from('menus')
        .insert({ category_id, name, description: description || null, price, image_url: image_url || null, is_available: !!is_available })
        .select('*, categories(name), menu_options(id, name, extra_price)')
        .single();
      if (error) throw error;
      res.status(201).json({ success: true, data: flat(data) });
    } catch (err) {
      console.error('[createMenu]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  updateMenu: async (req, res) => {
    const { id } = req.params;
    const { category_id, name, description, price, image_url, is_available } = req.body;
    try {
      const { error } = await supabase.from('menus')
        .update({ category_id, name, description: description || null, price, image_url: image_url || null, is_available: !!is_available, updated_at: new Date() })
        .eq('id', id);
      if (error) throw error;
      const { data: menu } = await supabase.from('menus')
        .select('*, categories(name), menu_options(id, name, extra_price)')
        .eq('id', id).single();
      if (!menu) return res.status(404).json({ success: false, message: 'ไม่พบเมนู' });
      const io = req.app.get('io');
      if (io && is_available !== undefined) io.emit('menu_availability_update', { menu_id: Number(id), is_available: !!menu.is_available });
      res.json({ success: true, data: flat(menu) });
    } catch (err) {
      console.error('[updateMenu]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  updateMenuAvailability: async (req, res) => {
    const { id } = req.params;
    const { is_available } = req.body;
    if (is_available === undefined) return res.status(400).json({ success: false, message: 'ต้องระบุ is_available' });
    try {
      await supabase.from('menus').update({ is_available: !!is_available, updated_at: new Date() }).eq('id', id);
      const io = req.app.get('io');
      if (io) io.emit('menu_availability_update', { menu_id: Number(id), is_available: !!is_available });
      res.json({ success: true, message: 'อัปเดตสถานะเมนูสำเร็จ' });
    } catch (err) {
      console.error('[updateMenuAvailability]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  deleteMenu: async (req, res) => {
    const { id } = req.params;
    try {
      const { data: menu } = await supabase.from('menus').select().eq('id', id).single();
      if (!menu) return res.status(404).json({ success: false, message: 'ไม่พบเมนู' });
      await supabase.from('menus').delete().eq('id', id);
      res.json({ success: true, message: 'ลบเมนูสำเร็จ' });
    } catch (err) {
      console.error('[deleteMenu]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  /* ── Menu Options: replace all options for a menu ── */
  setMenuOptions: async (req, res) => {
    const { id } = req.params;
    const { options } = req.body;
    if (!Array.isArray(options)) return res.status(400).json({ success: false, message: 'options ต้องเป็น array' });
    try {
      await supabase.from('menu_options').delete().eq('menu_id', id);
      if (options.length > 0) {
        const rows = options
          .filter(o => o.name?.trim())
          .map(o => ({ menu_id: Number(id), name: o.name.trim(), extra_price: Number(o.extra_price) || 0 }));
        if (rows.length) {
          const { error } = await supabase.from('menu_options').insert(rows);
          if (error) throw error;
        }
      }
      const { data } = await supabase.from('menu_options').select('id, name, extra_price').eq('menu_id', id).order('id');
      res.json({ success: true, data: data || [] });
    } catch (err) {
      console.error('[setMenuOptions]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  getAllTables: async (req, res) => {
    try {
      const { data, error } = await supabase.from('tables').select('*').order('table_number');
      if (error) throw error;
      res.json({ success: true, data });
    } catch (err) {
      console.error('[getAllTables]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  updateTableStatus: async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!['vacant', 'occupied', 'paid'].includes(status)) return res.status(400).json({ success: false, message: 'สถานะไม่ถูกต้อง' });
    try {
      const upd = { status, updated_at: new Date() };
      if (status === 'vacant') upd.current_customers = 0;
      await supabase.from('tables').update(upd).eq('id', id);
      const io = req.app.get('io');
      if (io) io.emit('table_status_update', { table_id: Number(id), status, current_customers: status === 'vacant' ? 0 : undefined });
      res.json({ success: true, message: `อัปเดตสถานะโต๊ะเป็น ${status} สำเร็จ` });
    } catch (err) {
      console.error('[updateTableStatus]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  updateTableCustomers: async (req, res) => {
    const { id } = req.params;
    const { customer_count } = req.body;
    try {
      const status = customer_count > 0 ? 'occupied' : 'vacant';
      await supabase.from('tables').update({ current_customers: customer_count, status, updated_at: new Date() }).eq('id', id);
      const io = req.app.get('io');
      if (io) io.emit('table_status_update', { table_id: Number(id), status, current_customers: customer_count });
      res.json({ success: true, message: 'อัปเดตสำเร็จ' });
    } catch (err) {
      console.error('[updateTableCustomers]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  addTable: async (req, res) => {
    try {
      const { data: last } = await supabase
        .from('tables').select('table_number').order('table_number', { ascending: false }).limit(1).single();
      const nextNum = (last?.table_number ?? 0) + 1;
      const { data, error } = await supabase
        .from('tables').insert({ table_number: nextNum, status: 'vacant', current_customers: 0 }).select().single();
      if (error) throw error;
      const io = req.app.get('io');
      if (io) io.emit('table_added', data);
      res.status(201).json({ success: true, data });
    } catch (err) {
      console.error('[addTable]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  deleteLastTable: async (req, res) => {
    try {
      const { data: last } = await supabase
        .from('tables').select('*').order('table_number', { ascending: false }).limit(1).single();
      if (!last) return res.status(404).json({ success: false, message: 'ไม่พบโต๊ะ' });
      if (last.status !== 'vacant') return res.status(400).json({ success: false, message: 'โต๊ะสุดท้ายยังไม่ว่าง ไม่สามารถลบได้' });
      const { count } = await supabase.from('tables').select('*', { count: 'exact', head: true });
      if (count <= 1) return res.status(400).json({ success: false, message: 'ต้องมีอย่างน้อย 1 โต๊ะ' });
      await supabase.from('tables').delete().eq('id', last.id);
      const io = req.app.get('io');
      if (io) io.emit('table_removed', { table_id: last.id, table_number: last.table_number });
      res.json({ success: true, message: `ลบโต๊ะที่ ${last.table_number} สำเร็จ` });
    } catch (err) {
      console.error('[deleteLastTable]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },
};

module.exports = menuController;
