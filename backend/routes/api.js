const express    = require('express');
const router     = express.Router();
const adminAuth  = require('../middleware/adminAuth');
const orderController    = require('../controllers/orderController');
const menuController     = require('../controllers/menuController');
const settingsController = require('../controllers/settingsController');
const { upload, uploadMenuImage } = require('../controllers/uploadController');

// ─── Upload ──────────────────────────────────────────────────────────────────
router.post('/upload/menu-image', adminAuth, upload.single('file'), uploadMenuImage);

// ─── Tables ──────────────────────────────────────────────────────────────────
// GET + PUT /status ไม่ต้องล็อก — ลูกค้าต้องใช้ทั้งสองนี้ตอนเลือกโต๊ะ
router.get   ('/tables',               menuController.getAllTables);
router.post  ('/tables',               adminAuth, menuController.addTable);
router.delete('/tables/last',          adminAuth, menuController.deleteLastTable);
router.put   ('/tables/:id/status',            menuController.updateTableStatus);
router.patch ('/tables/:id/customers',         adminAuth, menuController.updateTableCustomers);
router.post  ('/tables/:id/request-checkout',  orderController.requestCheckout);
router.post  ('/tables/:id/close',             adminAuth, orderController.closeTable);

// ─── Settings ────────────────────────────────────────────────────────────────
router.get('/settings',      settingsController.getSettings);
router.put('/settings/:key', adminAuth, settingsController.setSetting);

// ─── Categories ──────────────────────────────────────────────────────────────
router.get   ('/categories',     menuController.getAllCategories);                   // public — ลูกค้าดูเมนูได้
router.post  ('/categories',     adminAuth, menuController.createCategory);
router.delete('/categories/:id', adminAuth, menuController.deleteCategory);

// ─── Menus ───────────────────────────────────────────────────────────────────
router.get   ('/menus',                  menuController.getAllMenus);                 // public — ลูกค้าดูเมนูได้
router.post  ('/menus',                  adminAuth, menuController.createMenu);
router.put   ('/menus/:id/availability', adminAuth, menuController.updateMenuAvailability);  // ต้องอยู่ก่อน /:id
router.put   ('/menus/:id/options',      adminAuth, menuController.setMenuOptions);
router.put   ('/menus/:id',              adminAuth, menuController.updateMenu);
router.delete('/menus/:id',              adminAuth, menuController.deleteMenu);

// ─── Orders ──────────────────────────────────────────────────────────────────
router.get  ('/tables/:id/orders', orderController.getTableOrders);        // public — ลูกค้าดูออเดอร์ตัวเองได้
router.get  ('/takeaway/orders',   orderController.getTakeawayOrders);     // public — ลูกค้า takeaway ดูออเดอร์ตัวเองด้วยเบอร์
router.get  ('/orders',            adminAuth, orderController.getAllOrders);
router.post ('/orders',            orderController.createOrder);                     // public — ลูกค้าสั่งได้
router.put  ('/orders/:id/status', adminAuth, orderController.updateOrderStatus);
router.patch('/orders/:id/status', adminAuth, orderController.updateOrderStatus);

// ─── Stats ───────────────────────────────────────────────────────────────────
router.get('/stats/today',     adminAuth, orderController.getTodayStats);
router.get('/stats/top-menus', adminAuth, orderController.getTopMenus);

module.exports = router;
