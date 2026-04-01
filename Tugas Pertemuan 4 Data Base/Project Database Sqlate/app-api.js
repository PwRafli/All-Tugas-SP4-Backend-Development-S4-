const express = require("express");
const cors = require("cors");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const db = require("./Sqlitedb");

const app = express();
const port = 3000;
const UPLOAD_DIR = path.join(__dirname, "uploads");

// CORS Configuration
app.use(cors({
    origin: ["http://localhost:3001", "http://localhost:3000"],
    credentials: true,
    optionsSuccessStatus: 200
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/uploads", express.static(UPLOAD_DIR));

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/* ================= UPLOAD CONFIG ================= */

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_DIR);
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            return cb(new Error("Only image files are allowed"));
        }
        cb(null, true);
    }
});

function safeTrim(value) {
    return typeof value === "string" ? value.trim() : "";
}

function toNullableNumber(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
}

const DEFAULT_PHOTOS = new Set(["noimage.svg", "noimage.png"]);

function deletePhotoIfExists(filename) {
    if (!filename || DEFAULT_PHOTOS.has(filename)) return;
    const filePath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

/* ================= API: GET ALL ROOMS (READ + SEARCH) ================= */

app.get("/api/rooms", (req, res, next) => {
    const search = req.query.search || "";

    db.all(
        `SELECT * FROM room
         WHERE name LIKE ?
         OR code_room LIKE ?
         OR description LIKE ?`,
        [`%${search}%`, `%${search}%`, `%${search}%`],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows || []);
        }
    );
});

/* ================= API: GET SINGLE ROOM ================= */

app.get("/api/rooms/:id", (req, res, next) => {
    const id = req.params.id;

    db.get("SELECT * FROM room WHERE id=?", [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (!row) {
            return res.status(404).json({ error: "Room not found" });
        }
        res.json(row);
    });
});

/* ================= API: CREATE ROOM (INSERT) ================= */

app.post("/api/rooms", upload.single("photo"), (req, res, next) => {
    const photo = req.file ? req.file.filename : "noimage.svg";

    const {
        code_room,
        name,
        description,
        room_size,
        price,
        guests,
        available
    } = req.body;

    const codeRoomValue = safeTrim(code_room);
    const nameValue = safeTrim(name);

    if (!codeRoomValue || !nameValue) {
        if (req.file) deletePhotoIfExists(req.file.filename);
        return res.status(400).json({ error: "code_room and name are required" });
    }

    db.run(
        `INSERT INTO room
        (photo,code_room,name,description,room_size,price,guests,available)
        VALUES (?,?,?,?,?,?,?,?)`,
        [
            photo,
            codeRoomValue,
            nameValue,
            safeTrim(description),
            safeTrim(room_size),
            toNullableNumber(price),
            toNullableNumber(guests),
            safeTrim(available)
        ],
        (err) => {
            if (err) {
                if (req.file) deletePhotoIfExists(req.file.filename);
                return res.status(500).json({ error: err.message });
            }

            db.get("SELECT last_insert_rowid() as id", (lastErr, lastRow) => {
                if (lastErr) return res.status(500).json({ error: lastErr.message });
                res.status(201).json({ id: lastRow.id, photo, code_room: codeRoomValue, name: nameValue });
            });
        }
    );
});

/* ================= API: UPDATE ROOM ================= */

app.put("/api/rooms/:id", upload.single("photo"), (req, res, next) => {
    const id = req.params.id;

    const {
        code_room,
        name,
        description,
        room_size,
        price,
        guests,
        available,
        oldphoto
    } = req.body;

    const photo = req.file ? req.file.filename : oldphoto;

    const codeRoomValue = safeTrim(code_room);
    const nameValue = safeTrim(name);

    if (!codeRoomValue || !nameValue) {
        if (req.file) deletePhotoIfExists(req.file.filename);
        return res.status(400).json({ error: "code_room and name are required" });
    }

    db.run(
        `UPDATE room SET
        photo=?,
        code_room=?,
        name=?,
        description=?,
        room_size=?,
        price=?,
        guests=?,
        available=?
        WHERE id=?`,
        [
            photo,
            codeRoomValue,
            nameValue,
            safeTrim(description),
            safeTrim(room_size),
            toNullableNumber(price),
            toNullableNumber(guests),
            safeTrim(available),
            id
        ],
        (err) => {
            if (err) {
                if (req.file) deletePhotoIfExists(req.file.filename);
                return res.status(500).json({ error: err.message });
            }

            if (req.file && oldphoto !== photo) {
                deletePhotoIfExists(oldphoto);
            }

            res.json({ id, message: "Room updated successfully" });
        }
    );
});

/* ================= API: DELETE ROOM ================= */

app.delete("/api/rooms/:id", (req, res, next) => {
    const id = req.params.id;

    db.get("SELECT photo FROM room WHERE id=?", [id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        db.run("DELETE FROM room WHERE id=?", [id], (deleteErr) => {
            if (deleteErr) {
                return res.status(500).json({ error: deleteErr.message });
            }

            if (row && row.photo) deletePhotoIfExists(row.photo);

            res.json({ id, message: "Room deleted successfully" });
        });
    });
});

/* ================= ERROR HANDLER ================= */

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError || err.message === "Only image files are allowed") {
        return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message || "Internal Server Error" });
});

app.listen(port, () => {
    console.log(`Server berjalan di http://localhost:${port}`);
});
