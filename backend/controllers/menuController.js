const pool = require('../config/db');

const menuController = {
  getAllMenus: async (req, res) => {
    try {
      const { category_id } = req.query;
      let query = `
        SELECT m.*, c.name AS category_name
        FROM menus m
        JOIN categories c ON m.category_id = c.id
      `;
      const params = [];
      if (category_id) {
        query += ' WHERE m.category_id = $1';
        params.push(category_id);
      }
      query += ' ORDER BY m.category_id, m.name';
      const { rows: menus } = await pool.query(query, params);
      res.json({ success: true, data: menus });
    } catch (err) {
      console.error('[menuController.getAllMenus]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  getAllCategories: async (req, res) => {
    try {
      const { rows: categories } = await pool.query('SELECT * FROM categories ORDER BY name');
      res.json({ success: true, data: categories });
    } catch (err) {
      console.error('[menuController.getAllCategories]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  createCategory: async (req, res) => {
    const { name } = req.body;
    if (!name?.trim()) {
      return res.status(400).json({ success: false, message: 'กรุณาระบุชื่อหมวดหมู่' });
    }
    try {
      const { rows: [cat] } = await pool.query(
        'INSERT INTO categories (name) VALUES ($1) RETURNING *',
        [name.trim()]
      );
      res.status(201).json({ success: true, data: cat });
    } catch (err) {
      console.error('[menuController.createCategory]', err);
      if (err.code === '23505') {
        return res.status(400).json({ success: false, message: `หมวดหมู่ "${name.trim()}" มีอยู่แล้ว` });
      }
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  deleteCategory: async (req, res) => {
    const { id } = req.params;
    try {
      const { rows: [{ cnt }] } = await pool.query(
        'SELECT COUNT(*) AS cnt FROM menus WHERE category_id = $1', [id]
      );
      if (Number(cnt) > 0) {
        return res.status(400).json({
          success: false,
          message: `ไม่สามารถลบได้ มีเมนูอยู่ ${cnt} รายการในหมวดนี้`,
        });
      }
      const { rows: [cat] } = await pool.query('SELECT * FROM categories WHERE id = $1', [id]);
      if (!cat) return res.status(404).json({ success: false, message: 'ไม่พบหมวดหมู่' });
      await pool.query('DELETE FROM categories WHERE id = $1', [id]);
      res.json({ success: true, message: 'ลบหมวดหมู่สำเร็จ' });
    } catch (err) {
      console.error('[menuController.deleteCategory]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  createMenu: async (req, res) => {
    const { category_id, name, description, price, image_url, is_available = true } = req.body;
    if (!category_id || !name || price === undefined) {
      return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
    }
    try {
      const { rows: [inserted] } = await pool.query(
        `INSERT INTO menus (category_id, name, description, price, image_url, is_available)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
        [category_id, name, description || null, price, image_url || null, !!is_available]
      );
      const { rows: [menu] } = await pool.query(
        `SELECT m.*, c.name AS category_name FROM menus m JOIN categories c ON m.category_id = c.id WHERE m.id = $1`,
        [inserted.id]
      );
      res.status(201).json({ success: true, data: menu });
    } catch (err) {
      console.error('[menuController.createMenu]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  updateMenu: async (req, res) => {
    const { id } = req.params;
    const { category_id, name, description, price, image_url, is_available } = req.body;
    try {
      await pool.query(
        `UPDATE menus SET category_id=$1, name=$2, description=$3, price=$4,
         image_url=$5, is_available=$6, updated_at=NOW() WHERE id=$7`,
        [category_id, name, description || null, price, image_url || null, !!is_available, id]
      );
      const { rows: [menu] } = await pool.query(
        `SELECT m.*, c.name AS category_name FROM menus m JOIN categories c ON m.category_id = c.id WHERE m.id = $1`,
        [id]
      );
      if (!menu) return res.status(404).json({ success: false, message: 'ไม่พบเมนู' });

      const io = req.app.get('io');
      if (io && is_available !== undefined) {
        io.emit('menu_availability_update', { menu_id: Number(id), is_available: !!menu.is_available });
      }
      res.json({ success: true, data: menu });
    } catch (err) {
      console.error('[menuController.updateMenu]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  updateMenuAvailability: async (req, res) => {
    const { id } = req.params;
    const { is_available } = req.body;
    if (is_available === undefined) {
      return res.status(400).json({ success: false, message: 'ต้องระบุ is_available' });
    }
    try {
      await pool.query(
        'UPDATE menus SET is_available=$1, updated_at=NOW() WHERE id=$2',
        [!!is_available, id]
      );
      const io = req.app.get('io');
      if (io) {
        io.emit('menu_availability_update', { menu_id: Number(id), is_available: !!is_available });
      }
      res.json({ success: true, message: 'อัปเดตสถานะเมนูสำเร็จ' });
    } catch (err) {
      console.error('[menuController.updateMenuAvailability]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  deleteMenu: async (req, res) => {
    const { id } = req.params;
    try {
      const { rows: [menu] } = await pool.query('SELECT * FROM menus WHERE id=$1', [id]);
      if (!menu) return res.status(404).json({ success: false, message: 'ไม่พบเมนู' });
      await pool.query('DELETE FROM menus WHERE id=$1', [id]);
      res.json({ success: true, message: 'ลบเมนูสำเร็จ' });
    } catch (err) {
      console.error('[menuController.deleteMenu]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  getAllTables: async (req, res) => {
    try {
      const { rows: tables } = await pool.query('SELECT * FROM tables ORDER BY table_number');
      res.json({ success: true, data: tables });
    } catch (err) {
      console.error('[menuController.getAllTables]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  updateTableStatus: async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const valid = ['vacant', 'occupied', 'paid'];
    if (!valid.includes(status)) {
      return res.status(400).json({ success: false, message: 'สถานะไม่ถูกต้อง (vacant/occupied/paid)' });
    }
    try {
      await pool.query(
        `UPDATE tables SET status=$1,
         current_customers = CASE WHEN $2='vacant' THEN 0 ELSE current_customers END,
         updated_at=NOW() WHERE id=$3`,
        [status, status, id]
      );
      const io = req.app.get('io');
      if (io) {
        io.emit('table_status_update', {
          table_id: Number(id),
          status,
          current_customers: status === 'vacant' ? 0 : undefined,
        });
      }
      res.json({ success: true, message: `อัปเดตสถานะโต๊ะเป็น ${status} สำเร็จ` });
    } catch (err) {
      console.error('[menuController.updateTableStatus]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  updateTableCustomers: async (req, res) => {
    const { id } = req.params;
    const { customer_count } = req.body;
    try {
      const status = customer_count > 0 ? 'occupied' : 'vacant';
      await pool.query(
        'UPDATE tables SET current_customers=$1, status=$2, updated_at=NOW() WHERE id=$3',
        [customer_count, status, id]
      );
      const io = req.app.get('io');
      if (io) {
        io.emit('table_status_update', { table_id: Number(id), status, current_customers: customer_count });
      }
      res.json({ success: true, message: 'อัปเดตสำเร็จ' });
    } catch (err) {
      console.error('[menuController.updateTableCustomers]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },
};

module.exports = menuController;
