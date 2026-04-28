const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1:27017/homestay')
    .then(() => console.log('Terhubung ke MongoDB database'))
    .catch((err) => console.error('Gagal terhubung ke MongoDB:', err));

const roomSchema = new mongoose.Schema({
    photo: { type: String, default: 'noimage.svg' },
    code_room: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    facilities: { type: String, default: '' },
    room_size: { type: String, default: '' },
    price: { type: Number, default: null },
    guests: { type: Number, default: null },
    available: { type: String, default: '0' } // Keeps compatibility with '0' or '1' strings
});

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
