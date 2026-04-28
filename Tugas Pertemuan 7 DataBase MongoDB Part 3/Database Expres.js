Berdasarkan file yang ada di modul (seperti app.js, mongodb.js, dan folder controllers), berikut adalah struktur folder proyek

Project_Backend/
├── controllers/
│   └── databaseController.js   # Berisi logika bisnis (viewRoom, createRoom, dll)
├── models/
│   └── mongodb.js              # Definisi skema Room/Mahasiswa
├── node_modules/               # Package dependensi (Express, Mongoose, dll)
├── routes/
│   └── dataHotels.js           # Definisi endpoint (GET, POST, PUT, DELETE)
├── uploads/                    # Folder penyimpanan file foto yang diunggah
├── views/                      # Template mesin (EJS)
│   ├── add.ejs                 # Form tambah data
│   ├── edit.ejs                # Form edit data
│   ├── index.ejs               # Halaman utama (daftar data)
│   ├── table.ejs               # Komponen tabel data
│   ├── add_modal.ejs           # Modal untuk input (opsional)
│   ├── edit_modal.ejs          # Modal untuk update (opsional)
│   └── js.ejs                  # Script library pendukung (jQuery/Bootstrap)
├── app.js                      # Entry point aplikasi utama (Web Version)
├── app-api.js                  # Entry point aplikasi versi REST API
├── package.json                # Informasi project dan dependensi
└── package-lock.json


Implementasi CRUD
A. Create (Menambahkan Data)
-Proses: Data dikirim melalui form di add.ejs.  
-Fitur: Menggunakan multer untuk menangani unggahan foto.  
-Logika: Menggunakan Room.create() atau Mahasiswa.create() untuk menyimpan data ke MongoDB.

Read (Menampilkan Data)
-Proses: Menampilkan daftar homestay di halaman utama (index.ejs).
-Fitur: Dilengkapi dengan fungsi Search menggunakan regex untuk mencari nama atau kode kamar, serta Pagination untuk membatasi 
tampilan data per halaman (misal: 5 data per halaman).

C. Update (Mengubah Data)
-Proses: Menggunakan library method-override agar form HTML dapat mendukung method PUT.  
-Logika: Mencari data berdasarkan ID (findById), memperbarui field yang diubah, dan mengganti foto lama jika ada foto baru yang diunggah.

D. Delete (Menghapus Data)
-Proses: Menghapus data berdasarkan ID melalui method DELETE.  
-Logika: Menghapus dokumen dari database dan secara otomatis menghapus file foto fisik dari folder uploads untuk menghemat penyimpanan.
