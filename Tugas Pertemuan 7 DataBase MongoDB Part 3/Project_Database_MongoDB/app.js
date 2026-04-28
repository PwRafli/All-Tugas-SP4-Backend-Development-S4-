const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const multer = require("multer");
const fs = require("fs");
const Room = require("./mongodb");

const app = express();
const port = 3000;
const UPLOAD_DIR = path.join(__dirname, "uploads");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

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

function normalizeAvailable(value) {
    if (value === undefined || value === null) return "0";
    const text = String(value).trim().toLowerCase();
    if (text === "1" || text === "true" || text === "on" || text === "yes") return "1";
    return "0";
}

const DEFAULT_PHOTOS = new Set(["noimage.svg", "noimage.png"]);

function deletePhotoIfExists(filename) {
    if (!filename || DEFAULT_PHOTOS.has(filename)) return;
    const filePath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

/* ================= READ + SEARCH ================= */

app.get("/", async (req, res, next) => {
    try {
        const search = req.query.search || "";
        const pageSize = 5;
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        
        const query = {
            $or: [
                { name: { $regex: search, $options: "i" } },
                { code_room: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
                { facilities: { $regex: search, $options: "i" } },
                { room_size: { $regex: search, $options: "i" } }
            ]
        };

        const total = await Room.countDocuments(query);
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const safePage = Math.min(page, totalPages);
        const safeOffset = (safePage - 1) * pageSize;

        const rooms = await Room.find(query).skip(safeOffset).limit(pageSize);

        const mappedRooms = rooms.map(room => ({
            ...room.toObject(),
            id: room._id.toString()
        }));

        res.render("index", {
            rooms: mappedRooms,
            search: search,
            page: safePage,
            totalPages: totalPages
        });
    } catch (err) {
        next(err);
    }
});

/* ================= ADD FORM ================= */

app.get("/add", (req, res) => {
    res.render("add");
});

/* ================= INSERT ================= */

app.post("/add", upload.single("photo"), async (req, res, next) => {
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
            return res.status(400).send("code_room and name are required");
        }

        await Room.create({
            photo,
            code_room: codeRoomValue,
            name: nameValue,
            description: safeTrim(description),
            facilities: safeTrim(facilities),
            room_size: safeTrim(room_size),
            price: toNullableNumber(price),
            guests: toNullableNumber(guests),
            available: normalizeAvailable(available)
        });

        res.redirect("/");
    } catch (err) {
        if (req.file) deletePhotoIfExists(req.file.filename);
        next(err);
    }
});

/* ================= EDIT FORM ================= */

app.get("/edit/:id", async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).send("Invalid Room ID");
        }

        const room = await Room.findById(id);
        if (!room) return res.status(404).send("Room not found");

        res.render("edit", { room: { ...room.toObject(), id: room._id.toString() } });
    } catch (err) {
        next(err);
    }
});

/* ================= UPDATE ================= */

app.post("/edit/:id", upload.single("photo"), async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            if (req.file) deletePhotoIfExists(req.file.filename);
            return res.status(404).send("Invalid Room ID");
        }

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

        const photo = req.file ? req.file.filename : req.body.oldphoto;

        const codeRoomValue = safeTrim(code_room);
        const nameValue = safeTrim(name);
        if (!codeRoomValue || !nameValue) {
            if (req.file) deletePhotoIfExists(req.file.filename);
            return res.status(400).send("code_room and name are required");
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
            available: normalizeAvailable(available)
        });

        if (req.file && req.body.oldphoto !== photo) {
            deletePhotoIfExists(req.body.oldphoto);
        }

        res.redirect("/");
    } catch (err) {
        if (req.file) deletePhotoIfExists(req.file.filename);
        next(err);
    }
});

/* ================= DELETE ================= */

app.post("/delete/:id", async (req, res, next) => {
    try {
        const id = req.params.id;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(404).send("Invalid Room ID");
        }

        const room = await Room.findById(id);
        if (room) {
            await Room.findByIdAndDelete(id);
            if (room.photo) deletePhotoIfExists(room.photo);
        }

        res.redirect("/");
    } catch (err) {
        next(err);
    }
});

app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError || err.message === "Only image files are allowed") {
        return res.status(400).send(err.message);
    }
    next(err);
});

app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send("Internal server error");
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
