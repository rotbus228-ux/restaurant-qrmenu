require('dotenv').config();
const express   = require('express');
const http      = require('http');
const { Server } = require('socket.io');
const cors      = require('cors');

const pool       = require('./config/db');
const apiRoutes  = require('./routes/api');
const authRoutes = require('./routes/auth');
const { sendOrderNotification } = require('./config/telegram');

const app    = express();
const server = http.createServer(app);

// ─── Socket.io ─────────────────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin:  process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  },
});

app.set('io', io);

io.on('connection', (socket) => {
  console.log(`[Socket.io] connected    : ${socket.id}`);

  socket.on('new_order', async (data) => {
    console.log(`[Socket.io] new_order | table=${data.table_id} | mock=${data.isMock}`);

    let orderData = { ...data };

    const needsSave = !data.isMock
      && !(Number.isInteger(data.id) && data.id > 0)
      && data.table_id
      && Array.isArray(data.items)
      && data.items.length > 0;

    if (needsSave) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        const totalPrice = data.total_price > 0
          ? data.total_price
          : data.items.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 1), 0);

        const customerCount = data.customer_count || 1;

        const { rows: [{ id: orderId }] } = await client.query(
          `INSERT INTO orders (table_id, total_price, status, customer_count)
           VALUES ($1, $2, 'pending', $3) RETURNING id`,
          [data.table_id, totalPrice, customerCount]
        );

        for (const item of data.items) {
          const menuId   = item.menu_id ?? item.id;
          const price    = Number(item.price) || 0;
          const qty      = Number(item.quantity) || 1;
          const opts     = item.options ? JSON.stringify(item.options) : null;
          const itemNote = item.note || null;
          await client.query(
            `INSERT INTO order_items (order_id, menu_id, quantity, price, options, note)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [orderId, menuId, qty, price, opts, itemNote]
          );
        }

        await client.query(
          `UPDATE tables SET status='occupied', current_customers=$1, updated_at=NOW() WHERE id=$2`,
          [customerCount, data.table_id]
        );

        await client.query('COMMIT');
        orderData = { ...orderData, id: orderId };
        console.log(`[Socket.io] saved order #${orderId}`);

        pool.query('SELECT table_number FROM tables WHERE id=$1', [data.table_id])
          .then(({ rows }) => {
            const tableNumber = rows[0]?.table_number ?? data.table_id;
            return sendOrderNotification({ total_price: totalPrice }, tableNumber, data.items || []);
          })
          .catch(e => console.error('[Socket.io Telegram Error]', e.message));

      } catch (err) {
        await client.query('ROLLBACK');
        console.error('[Socket.io] new_order error:', err.message);
      } finally {
        client.release();
      }
    }

    io.emit('admin_receive_order', orderData);
  });

  socket.on('update_status', (data) => {
    io.emit('client_receive_status', data);
  });

  socket.on('disconnect', () => {
    console.log(`[Socket.io] disconnected : ${socket.id}`);
  });
});

// ─── Middleware ─────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Routes ─────────────────────────────────────────────────────────────────
app.get('/', (req, res) => res.json({ message: 'Server is running', status: 'ok', timestamp: new Date().toISOString() }));
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[Global Error]', err.stack || err);
  res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' });
});

// ─── Start ──────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`🚀  Server   → http://localhost:${PORT}`);
  console.log(`📡  Socket.io ready`);
  console.log(`🌐  CORS     → ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  try {
    const { rows } = await pool.query('SELECT COUNT(*) AS cnt FROM tables');
    console.log(`✅  Supabase → connected | tables: ${rows[0].cnt} rows`);
  } catch (err) {
    console.error(`❌  Supabase → FAILED: ${err.message}`);
  }
});
