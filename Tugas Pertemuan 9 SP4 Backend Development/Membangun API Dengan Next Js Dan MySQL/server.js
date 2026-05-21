const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Membuat koneksi database
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'database_db',
    charset: 'utf8mb4'
});

// Koneksi ke MySQL
db.connect((err) => {
    if (err) {
        console.error('❌ Gagal terhubung ke MySQL:', err.message);
        return;
    }

    console.log('✅ Terhubung Ke MySQL!');

    // Query membuat tabel rooms
    const query = `
    CREATE TABLE IF NOT EXISTS rooms (
        id INT AUTO_INCREMENT PRIMARY KEY,
        photo TEXT,
        code_room VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        room_size VARCHAR(100),
        amenities TEXT,
        price DOUBLE NOT NULL,
        guests INT NOT NULL,
        available BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
    `;

    // Menjalankan query CREATE TABLE
    db.query(query, (err, result) => {
        if (err) {
            console.error('❌ Gagal membuat tabel rooms:', err.message);
            return;
        }

        console.log('✅ Tabel rooms berhasil dibuat atau sudah ada');

        // SELECT * FROM rooms
        db.query('SELECT * FROM rooms', (err, results) => {
            if (err) {
                console.error('❌ Gagal mengambil data rooms:', err.message);
                return;
            }

            console.log('📦 Data Rooms:');
            console.log(results);
        });
    });
});

// Route dasar
app.get('/', (req, res) => {
    res.send('Server is running and connected to MySQL database_db');
});

// Jalankan Express Server
app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});

// Export database
module.exports = db;
