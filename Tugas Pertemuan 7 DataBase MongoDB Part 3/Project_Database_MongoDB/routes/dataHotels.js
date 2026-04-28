const express = require('express');
const router = express.Router();

// Import the controller we previously created
const databaseController = require('../controllers/databaseController');

// ** Note: For the create and update routes, you will still need to apply your multer `upload.single("photo")` middleware where needed **
// Example: const upload = require('../middlewares/multerConfig');

/* ================= WEB (VIEW) ROUTES ================= */

// 1. Read (View all rooms/data)
router.get('/', databaseController.viewRoom);

// 2. Show Add Form
router.get('/add', databaseController.showAddForm);

// 3. Create (Process Add Form)
// Example with upload: router.post('/add', upload.single('photo'), databaseController.createRoomWeb);
router.post('/add', databaseController.createRoomWeb);

// 4. Show Edit Form
router.get('/edit/:id', databaseController.showEditForm);

// 5. Update (Process Edit Form)
// Example with upload: router.post('/edit/:id', upload.single('photo'), databaseController.updateRoomWeb);
router.post('/edit/:id', databaseController.updateRoomWeb);

// 6. Delete
router.post('/delete/:id', databaseController.deleteRoomWeb);


/* ================= API ROUTES (Optional here) ================= */

router.get('/api/rooms', databaseController.getAllRoomsAPI);
router.get('/api/rooms/:id', databaseController.getRoomByIdAPI);
router.post('/api/rooms', databaseController.createRoomAPI);
router.put('/api/rooms/:id', databaseController.updateRoomAPI);
router.delete('/api/rooms/:id', databaseController.deleteRoomAPI);

module.exports = router;
