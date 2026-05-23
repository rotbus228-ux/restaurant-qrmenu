require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');

const supabase    = require('./config/supabase');
const apiRoutes   = require('./routes/api');
const authRoutes  = require('./routes/auth');
const { sendOrderNotification } = require('./config/telegram');

const app    = express();
const server = http.createServer(app);

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
      && data.table_id && Array.isArray(data.items) && data.items.length > 0;

    if (needsSave) {
      try {
        const { data: result, error } = await supabase.rpc('create_order', {
          p_table_id: data.table_id,
          p_customer_count: data.customer_count || 1,
          p_items: data.items,
        });
        if (error) throw error;
        orderData = { ...orderData, id: result.order_id };
        console.log(`[Socket.io] saved order #${result.order_id}`);

        const { data: table } = await supabase.from('tables').select('table_number').eq('id', data.table_id).single();
        sendOrderNotification({ total_price: result.total_price }, table?.table_number ?? data.table_id, data.items || [])
          .catch(e => console.error('[Telegram]', e.message));
      } catch (err) {
        console.error('[Socket.io] new_order error:', err.message);
      }
    }
    io.emit('admin_receive_order', orderData);
  });

  socket.on('update_status', (data) => io.emit('client_receive_status', data));
  socket.on('disconnect', () => console.log(`[Socket.io] disconnected : ${socket.id}`));
});

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => res.json({ message: 'Server is running', status: 'ok', timestamp: new Date().toISOString() }));
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));
app.get('/health/db', async (req, res) => {
  try {
    const { data, error } = await supabase.from('tables').select('count', { count: 'exact', head: true });
    if (error) throw error;
    res.json({ status: 'ok', db: 'supabase connected' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});
app.use('/api/auth', authRoutes);
app.use('/api', apiRoutes);
app.use((req, res) => res.status(404).json({ success: false, message: 'Route not found' }));
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => res.status(err.status || 500).json({ success: false, message: err.message || 'Internal server error' }));

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  console.log(`🚀  Server   → http://localhost:${PORT}`);
  console.log(`📡  Socket.io ready`);
  console.log(`🌐  CORS     → ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  const { error } = await supabase.from('tables').select('count', { count: 'exact', head: true });
  if (error) console.error(`❌  Supabase → FAILED: ${error.message}`);
  else console.log(`✅  Supabase → connected via HTTPS`);
});
