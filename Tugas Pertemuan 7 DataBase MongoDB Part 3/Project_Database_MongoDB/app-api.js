const express = require("express");
const cors = require("cors");
const path = require("path");
const mongoose = require("mongoose");
const multer = require("multer");
const fs = require("fs");
const Room = require("./mongodb");

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

app.get("/api/rooms", async (req, res, next) => {
    try {
        const search = req.query.search || "";
        const query = {
            $or: [
                { name: { $regex: search, $options: "i" } },
                { code_room: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } }
            ]
        };

        const rooms = await Room.find(query);
        const mappedRooms = rooms.map(r => ({ ...r.toObject(), id: r._id.toString() }));
        res.json(mappedRooms);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ================= API: GET SINGLE ROOM ================= */

app.get("/api/rooms/:id", async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ error: "Invalid Room ID" });
        }

        const room = await Room.findById(id);
        if (!room) {
            return res.status(404).json({ error: "Room not found" });
        }
        res.json({ ...room.toObject(), id: room._id.toString() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/* ================= API: CREATE ROOM (INSERT) ================= */

app.post("/api/rooms", upload.single("photo"), async (req, res, next) => {
    try {
        const photo = req.file ? req.file.filename : "noimage.svg";

        const {
            code_room,
            name,
            description,
            facilities,
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

        const newRoom = await Room.create({
            photo,
            code_room: codeRoomValue,
            name: nameValue,
            description: safeTrim(description),
            facilities: safeTrim(facilities),
            room_size: safeTrim(room_size),
            price: toNullableNumber(price),
            guests: toNullableNumber(guests),
            available: safeTrim(available)
        });

        res.status(201).json({ id: newRoom._id.toString(), photo, code_room: codeRoomValue, name: nameValue });
    } catch (err) {
        if (req.file) deletePhotoIfExists(req.file.filename);
        res.status(500).json({ error: err.message });
    }
});

/* ================= API: UPDATE ROOM ================= */

app.put("/api/rooms/:id", upload.single("photo"), async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            if (req.file) deletePhotoIfExists(req.file.filename);
            return res.status(404).json({ error: "Invalid Room ID" });
        }

        const {
            code_room,
            name,
            description,
            facilities,
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

        await Room.findByIdAndUpdate(id, {
            photo,
            code_room: codeRoomValue,
            name: nameValue,
            description: safeTrim(description),
            facilities: safeTrim(facilities),
            room_size: safeTrim(room_size),
            price: toNullableNumber(price),
            guests: toNullableNumber(guests),
            available: safeTrim(available)
        });

        if (req.file && oldphoto !== photo) {
            deletePhotoIfExists(oldphoto);
        }

        res.json({ id, message: "Room updated successfully" });
    } catch (err) {
        if (req.file) deletePhotoIfExists(req.file.filename);
        res.status(500).json({ error: err.message });
    }
});

/* ================= API: DELETE ROOM ================= */

app.delete("/api/rooms/:id", async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).json({ error: "Invalid Room ID" });
        }

        const room = await Room.findById(id);
        if (room) {
            await Room.findByIdAndDelete(id);
            if (room.photo) deletePhotoIfExists(room.photo);
        }

        res.json({ id, message: "Room deleted successfully" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
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
