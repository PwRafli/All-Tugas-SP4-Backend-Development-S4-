Buka file package.json, lalu tambahkan:
{
  "name": "express-app",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "dependencies": {
    "express": "^4.18.0"
  }
}

Pastikan ada: "type": "module"

Lalu simpan → restart terminal → jalankan lagi: node index.js

Kalau tidak mau pakai ES Module, ubah saja ke CommonJS (lebih stabil untuk pemula).

Ganti seluruh index.js menjadi seperti ini:
const express = require("express");

const app = express();
const PORT = 3000;

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Server berjalan dengan baik 🚀");
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});

Lalu jalankan: node index.js
