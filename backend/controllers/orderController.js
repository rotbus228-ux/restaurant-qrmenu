const supabase = require('../config/supabase');
const { sendOrderNotification: sendTelegram } = require('../config/telegram');

const orderController = {
  getAllOrders: async (req, res) => {
    try {
      const { table_id, order_type } = req.query;
      let q = supabase.from('orders').select(`*, tables(table_number), order_items(*, menus(name))`).order('created_at', { ascending: false });
      if (table_id) q = q.eq('table_id', Number(table_id));
      if (order_type) q = q.eq('order_type', order_type);
      const { data: orders, error } = await q;
      if (error) throw error;
      const result = orders.map(o => ({
        ...o,
        table_number: o.tables?.table_number,
        tables: undefined,
        items: (o.order_items || []).map(item => ({
          ...item,
          name: item.ordered_menu_name || item.menus?.name,
          menus: undefined,
          options: Array.isArray(item.options) ? item.options : (item.options || []),
          note: item.note || '',
        })),
        order_items: undefined,
      }));
      res.json({ success: true, data: result });
    } catch (err) {
      console.error('[getAllOrders]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  createOrder: async (req, res) => {
    const { table_id, customer_count, items, order_type, customer_name, customer_phone } = req.body;
    const isTakeaway = order_type === 'takeaway';

    // validate
    if (!customer_count || !items?.length) {
      return res.status(400).json({ success: false, message: 'ข้อมูลไม่ครบถ้วน' });
    }
    if (isTakeaway) {
      if (!customer_name || !customer_phone) {
        return res.status(400).json({ success: false, message: 'กรุณากรอกชื่อและเบอร์โทรสำหรับออเดอร์กลับบ้าน' });
      }
    } else {
      if (!table_id || isNaN(Number(table_id))) {
        return res.status(400).json({ success: false, message: 'ข้อมูลโต๊ะไม่ถูกต้อง' });
      }
    }

    try {
      const { data, error } = await supabase.rpc('create_order', {
        p_table_id: isTakeaway ? null : Number(table_id),
        p_customer_count: customer_count,
        p_items: items,
        p_order_type: isTakeaway ? 'takeaway' : 'dine_in',
        p_customer_name: customer_name || null,
        p_customer_phone: customer_phone || null,
      });
      if (error) throw new Error(error.message);

      let tableNumber = null;
      if (!isTakeaway) {
        const { data: table } = await supabase.from('tables').select('table_number').eq('id', table_id).single();
        tableNumber = table?.table_number;
      }

      const enrichedItems = (data.items || []).map(i => ({
        menu_id: i.menu_id, name: i.name, price: i.base_price, unitPrice: i.unit_price,
        quantity: i.quantity, options: i.options || [], note: i.note || null,
      }));

      const orderData = {
        id: data.order_id,
        table_id: isTakeaway ? null : Number(table_id),
        table_number: isTakeaway ? null : tableNumber,
        order_type: isTakeaway ? 'takeaway' : 'dine_in',
        customer_name: customer_name || null,
        customer_phone: customer_phone || null,
        total_price: data.total_price,
        status: 'pending',
        customer_count,
        items: enrichedItems,
        created_at: new Date(),
      };

      const io = req.app.get('io');
      if (io) {
        io.emit('new_order', orderData);
        if (!isTakeaway) {
          io.emit('table_status_update', { table_id: Number(table_id), status: 'occupied', current_customers: customer_count });
        }
      }
      sendTelegram(orderData, tableNumber, enrichedItems).catch(e => console.error('[Telegram]', e.message));
      res.status(201).json({ success: true, data: orderData });
    } catch (err) {
      console.error('[createOrder]', err);
      res.status(500).json({ success: false, message: err.message || 'เกิดข้อผิดพลาด' });
    }
  },

  // ─── Takeaway: ดูออเดอร์ทั้งหมดของเบอร์โทรนี้ ───
  getTakeawayOrders: async (req, res) => {
    const { phone } = req.query;
    if (!phone) return res.status(400).json({ success: false, message: 'กรุณาระบุเบอร์โทร' });
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*, order_items(*, menus(name))')
        .eq('order_type', 'takeaway')
        .eq('customer_phone', phone)
        .not('status', 'in', '("completed","cancelled")')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const result = (orders || []).map(o => ({
        ...o,
        items: (o.order_items || []).map(item => ({
          ...item,
          name: item.ordered_menu_name || item.menus?.name,
          menus: undefined,
          options: Array.isArray(item.options) ? item.options : [],
          note: item.note || '',
        })),
        order_items: undefined,
      }));
      res.json({ success: true, data: result });
    } catch (err) {
      console.error('[getTakeawayOrders]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  updateOrderStatus: async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!['pending','preparing','serving','served','completed','cancelled','request_checkout'].includes(status))
      return res.status(400).json({ success: false, message: 'สถานะไม่ถูกต้อง' });
    try {
      await supabase.from('orders').update({ status, updated_at: new Date() }).eq('id', id);
      const { data: order } = await supabase.from('orders').select('*, tables(table_number)').eq('id', id).single();
      if (!order) return res.status(404).json({ success: false, message: 'ไม่พบออเดอร์' });
      if (status === 'completed' || status === 'cancelled') {
        await supabase.from('tables').update({ status: 'vacant', current_customers: 0, updated_at: new Date() }).eq('id', order.table_id);
      }
      const io = req.app.get('io');
      if (io) {
        const payload = { order_id: Number(id), status, table_id: order.table_id };
        io.emit('order_status_update', payload);
        io.emit('client_receive_status', payload);
        if (status === 'completed' || status === 'cancelled')
          io.emit('table_status_update', { table_id: order.table_id, status: 'vacant', current_customers: 0 });
      }
      res.json({ success: true, data: { ...order, table_number: order.tables?.table_number, tables: undefined } });
    } catch (err) {
      console.error('[updateOrderStatus]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  requestCheckout: async (req, res) => {
    const { id } = req.params;
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, total_price')
        .eq('table_id', id)
        .in('status', ['pending', 'preparing', 'serving', 'served']);
      if (error) throw error;
      if (!orders?.length)
        return res.status(400).json({ success: false, message: 'ไม่มีออเดอร์ที่ต้องชำระ' });

      const orderIds = orders.map(o => o.id);
      await supabase.from('orders')
        .update({ status: 'request_checkout', updated_at: new Date() })
        .in('id', orderIds);

      // ปิดโต๊ะอัตโนมัติทันทีที่ลูกค้าขอเช็คบิล
      await supabase.from('tables')
        .update({ status: 'vacant', current_customers: 0, updated_at: new Date() })
        .eq('id', id);

      const { data: table } = await supabase.from('tables').select('table_number').eq('id', id).single();
      const total = orders.reduce((s, o) => s + Number(o.total_price || 0), 0);

      const io = req.app.get('io');
      if (io) {
        io.emit('checkout_requested', { table_id: Number(id), table_number: table?.table_number, total_price: total, order_ids: orderIds });
        orderIds.forEach(oid => {
          const payload = { order_id: oid, status: 'request_checkout', table_id: Number(id) };
          io.emit('order_status_update', payload);
          io.emit('client_receive_status', payload);
        });
        // แจ้งทุก client ว่าโต๊ะนี้ว่างแล้ว
        io.emit('table_status_update', { table_id: Number(id), status: 'vacant', current_customers: 0 });
      }
      res.json({ success: true, message: 'ส่งคำขอเช็คบิลแล้ว' });
    } catch (err) {
      console.error('[requestCheckout]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  closeTable: async (req, res) => {
    const { id } = req.params;
    try {
      await supabase.from('orders')
        .update({ status: 'completed', updated_at: new Date() })
        .eq('table_id', id)
        .in('status', ['pending', 'preparing', 'serving', 'served', 'request_checkout']);

      await supabase.from('tables')
        .update({ status: 'vacant', current_customers: 0, updated_at: new Date() })
        .eq('id', id);

      const io = req.app.get('io');
      if (io) {
        io.emit('table_closed', { table_id: Number(id) });
        io.emit('table_status_update', { table_id: Number(id), status: 'vacant', current_customers: 0 });
      }
      res.json({ success: true, message: 'ปิดโต๊ะสำเร็จ' });
    } catch (err) {
      console.error('[closeTable]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  getTableOrders: async (req, res) => {
    const { id } = req.params;
    try {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('*, tables(table_number), order_items(*, menus(name))')
        .eq('table_id', Number(id))
        .not('status', 'in', '("completed","cancelled")')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const result = (orders || []).map(o => ({
        ...o,
        table_number: o.tables?.table_number,
        tables: undefined,
        items: (o.order_items || []).map(item => ({
          ...item,
          name: item.ordered_menu_name || item.menus?.name,
          menus: undefined,
          options: Array.isArray(item.options) ? item.options : [],
          note: item.note || '',
        })),
        order_items: undefined,
      }));
      res.json({ success: true, data: result });
    } catch (err) {
      console.error('[getTableOrders]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  getTodayStats: async (req, res) => {
    try {
      const { data, error } = await supabase.rpc('get_today_stats');
      if (error) throw error;
      const s = data[0] || {};
      res.json({ success: true, data: { totalCustomers: Number(s.totalCustomers||0), totalOrders: Number(s.totalOrders||0), totalSales: Number(s.totalSales||0) } });
    } catch (err) {
      console.error('[getTodayStats]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },

  getTopMenus: async (req, res) => {
    try {
      const period = ['today', 'month', 'year'].includes(req.query.period) ? req.query.period : 'today';
      const { data, error } = await supabase.rpc('get_top_menus_period', { p_period: period });
      if (error) throw error;
      res.json({ success: true, data: (data||[]).map(r => ({ id: r.id, name: r.name, total_qty: Number(r.total_qty), total_sales: Number(r.total_sales) })) });
    } catch (err) {
      console.error('[getTopMenus]', err);
      res.status(500).json({ success: false, message: 'เกิดข้อผิดพลาด' });
    }
  },
};

module.exports = orderController;
