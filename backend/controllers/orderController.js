const pool = require('../config/db');
const { sendOrderNotification: sendTelegram } = require('../config/telegram');

const orderController = {
  getAllOrders: async (req, res) => {
    try {
      const { table_id } = req.query;
      let query = `SELECT o.*, t.table_number FROM orders o JOIN tables t ON o.table_id = t.id`;
      const params = [];
      if (table_id) {
        query += ' WHERE o.table_id = $1';
        params.push(Number(table_id));
      }
      query += ' ORDER BY o.created_at DESC';
      const { rows: orders } = await pool.query(query, params);

      for (const order of orders) {
        const { rows: items } = await pool.query(
          `SELECT oi.*,
                  COALESCE(oi.ordered_menu_name, m.name)         AS name,
                  COALESCE(oi.ordered_menu_price, oi.price)       AS unit_snapshot_price
           FROM order_items oi
           LEFT JOIN menus m ON oi.menu_id = m.id
           WHERE oi.order_id = $1`,
          [order.id]
        );
        order.items = items.map(item => ({
          ...item,
          options: Array.isArray(item.options) ? item.options : (item.options || []),
          note: item.note || '',
        }));
      }
      res.json({ success: true, data: orders });
    } catch (err) {
      console.error('[orderController.getAllOrders]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  createOrder: async (req, res) => {
    const { table_id, customer_count, items } = req.body;
    if (!table_id || !customer_count || !items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      let totalPrice = 0;
      const enrichedItems = [];

      for (const item of items) {
        const { rows: [menu] } = await client.query(
          'SELECT * FROM menus WHERE id=$1 AND is_available=TRUE', [item.menu_id]
        );
        if (!menu) throw new Error(`เมนู id ${item.menu_id} ไม่พบหรือไม่พร้อมให้บริการ`);
        const itemOptions = Array.isArray(item.options) ? item.options : [];
        const optionsExtra = itemOptions.reduce((s, o) => s + (Number(o.extra) || 0), 0);
        const unitPrice = Number(menu.price) + optionsExtra;
        totalPrice += unitPrice * item.quantity;
        enrichedItems.push({
          ...item,
          name:      menu.name,
          price:     Number(menu.price),
          unitPrice,
          options:   itemOptions,
          note:      item.note || null,
        });
      }

      const { rows: [{ id: orderId }] } = await client.query(
        `INSERT INTO orders (table_id, total_price, status, customer_count)
         VALUES ($1, $2, 'pending', $3) RETURNING id`,
        [table_id, totalPrice, customer_count]
      );

      for (const item of enrichedItems) {
        await client.query(
          `INSERT INTO order_items
             (order_id, menu_id, quantity, price, options, note, ordered_menu_name, ordered_menu_price)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [orderId, item.menu_id, item.quantity, item.unitPrice,
           JSON.stringify(item.options || []), item.note || null,
           item.name, item.price]
        );
      }

      await client.query(
        `UPDATE tables SET status='occupied', current_customers=$1, updated_at=NOW() WHERE id=$2`,
        [customer_count, table_id]
      );

      await client.query('COMMIT');

      const { rows: [table] } = await pool.query('SELECT * FROM tables WHERE id=$1', [table_id]);

      const orderData = {
        id: orderId, table_id, table_number: table.table_number,
        total_price: totalPrice, status: 'pending', customer_count,
        items: enrichedItems, created_at: new Date(),
      };

      const io = req.app.get('io');
      if (io) {
        io.emit('new_order', orderData);
        io.emit('table_status_update', { table_id, status: 'occupied', current_customers: customer_count });
      }

      sendTelegram(orderData, table.table_number, enrichedItems).catch(e =>
        console.error('[Telegram Notify Error]', e.message)
      );

      res.status(201).json({ success: true, data: orderData });
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[orderController.createOrder]', err);
      res.status(500).json({ success: false, message: err.message || 'เกิดข้อผิดพลาด' });
    } finally {
      client.release();
    }
  },

  updateOrderStatus: async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const validStatuses = ['pending', 'preparing', 'serving', 'served', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'สถานะไม่ถูกต้อง' });
    }
    try {
      await pool.query('UPDATE orders SET status=$1, updated_at=NOW() WHERE id=$2', [status, id]);
      const { rows: [order] } = await pool.query(
        `SELECT o.*, t.table_number FROM orders o JOIN tables t ON o.table_id = t.id WHERE o.id=$1`, [id]
      );
      if (!order) return res.status(404).json({ success: false, message: 'ไม่พบออเดอร์' });

      if (status === 'completed' || status === 'cancelled') {
        await pool.query(
          `UPDATE tables SET status='vacant', current_customers=0, updated_at=NOW() WHERE id=$1`,
          [order.table_id]
        );
      }

      const io = req.app.get('io');
      if (io) {
        const payload = { order_id: Number(id), status, table_id: order.table_id };
        io.emit('order_status_update', payload);
        io.emit('client_receive_status', payload);
        if (status === 'completed' || status === 'cancelled') {
          io.emit('table_status_update', { table_id: order.table_id, status: 'vacant', current_customers: 0 });
        }
      }
      res.json({ success: true, data: order });
    } catch (err) {
      console.error('[orderController.updateOrderStatus]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  getTodayStats: async (req, res) => {
    try {
      const { rows: [r1] } = await pool.query(
        `SELECT COALESCE(SUM(customer_count),0) AS val FROM orders WHERE created_at::date = CURRENT_DATE`
      );
      const { rows: [r2] } = await pool.query(
        `SELECT COUNT(*) AS val FROM orders WHERE created_at::date = CURRENT_DATE`
      );
      const { rows: [r3] } = await pool.query(
        `SELECT COALESCE(SUM(total_price),0) AS val FROM orders
         WHERE created_at::date = CURRENT_DATE AND status NOT IN ('cancelled')`
      );
      res.json({
        success: true,
        data: {
          totalCustomers: Number(r1.val),
          totalOrders:    Number(r2.val),
          totalSales:     Number(r3.val),
        },
      });
    } catch (err) {
      console.error('[orderController.getTodayStats]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  getTopMenus: async (req, res) => {
    try {
      const { rows: topMenus } = await pool.query(
        `SELECT oi.menu_id AS id,
                COALESCE(oi.ordered_menu_name, m.name) AS name,
                SUM(oi.quantity) AS total_qty,
                COALESCE(SUM(oi.price * oi.quantity), 0) AS total_sales
         FROM order_items oi
         LEFT JOIN menus m ON oi.menu_id = m.id
         JOIN orders o ON oi.order_id = o.id
         WHERE o.created_at::date = CURRENT_DATE AND o.status NOT IN ('cancelled')
         GROUP BY oi.menu_id, COALESCE(oi.ordered_menu_name, m.name)
         ORDER BY total_qty DESC
         LIMIT 5`
      );
      res.json({
        success: true,
        data: topMenus.map(r => ({
          id:          r.id,
          name:        r.name,
          total_qty:   Number(r.total_qty),
          total_sales: Number(r.total_sales),
        })),
      });
    } catch (err) {
      console.error('[orderController.getTopMenus]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },
};

module.exports = orderController;
