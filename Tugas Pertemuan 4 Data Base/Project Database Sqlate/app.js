const express = require("express");
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const db = require("./Sqlitedb");

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

app.get("/", (req, res, next) => {

    const search = req.query.search || "";
    const pageSize = 5;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const offset = (page - 1) * pageSize;

    const whereClause = `
        WHERE name LIKE ?
        OR code_room LIKE ?
        OR description LIKE ?
        OR facilities LIKE ?
        OR room_size LIKE ?
    `;
    const params = [
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`
    ];

    db.get(
        `SELECT COUNT(*) as total FROM room ${whereClause}`,
        params,
        (countErr, countRow) => {
            if (countErr) return next(countErr);

            const total = countRow ? countRow.total : 0;
            const totalPages = Math.max(1, Math.ceil(total / pageSize));
            const safePage = Math.min(page, totalPages);
            const safeOffset = (safePage - 1) * pageSize;

            db.all(
                `SELECT * FROM room ${whereClause} LIMIT ? OFFSET ?`,
                [...params, pageSize, safeOffset],
                (err, rows) => {
                    if (err) return next(err);

                    res.render("index", {
                        rooms: rows,
                        search: search,
                        page: safePage,
                        totalPages: totalPages
                    });

                }
            );
        }
    );

});

/* ================= ADD FORM ================= */

app.get("/add", (req, res) => {
    res.render("add");
});

/* ================= INSERT ================= */

app.post("/add", upload.single("photo"), (req, res, next) => {

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

    db.run(
        `INSERT INTO room
        (photo,code_room,name,description,facilities,room_size,price,guests,available)
        VALUES (?,?,?,?,?,?,?,?,?)`,
        [
            photo,
            codeRoomValue,
            nameValue,
            safeTrim(description),
            safeTrim(facilities),
            safeTrim(room_size),
            toNullableNumber(price),
            toNullableNumber(guests),
            normalizeAvailable(available)
        ],
        (err) => {
            if (err) {
                if (req.file) deletePhotoIfExists(req.file.filename);
                return next(err);
            }

            res.redirect("/");
        }
    );

});

/* ================= EDIT FORM ================= */

app.get("/edit/:id", (req, res, next) => {

    const id = req.params.id;

    db.get("SELECT * FROM room WHERE id=?", [id], (err, row) => {
        if (err) return next(err);

        if (!row) return res.status(404).send("Room not found");

        res.render("edit", { room: row });

    });

});

/* ================= UPDATE ================= */

app.post("/edit/:id", upload.single("photo"), (req, res, next) => {

    const id = req.params.id;

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

    db.run(
        `UPDATE room SET
        photo=?,
        code_room=?,
        name=?,
        description=?,
        facilities=?,
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
            safeTrim(facilities),
            safeTrim(room_size),
            toNullableNumber(price),
            toNullableNumber(guests),
            normalizeAvailable(available),
            id
        ],
        (err) => {
            if (err) {
                if (req.file) deletePhotoIfExists(req.file.filename);
                return next(err);
            }

            if (req.file && req.body.oldphoto !== photo) {
                deletePhotoIfExists(req.body.oldphoto);
            }

            res.redirect("/");

        }
    );

});

/* ================= DELETE ================= */

app.post("/delete/:id", (req, res, next) => {

    const id = req.params.id;

    db.get("SELECT photo FROM room WHERE id=?", [id], (err, row) => {
        if (err) return next(err);

        db.run("DELETE FROM room WHERE id=?", [id], (deleteErr) => {

            if (deleteErr) return next(deleteErr);

            if (row && row.photo) deletePhotoIfExists(row.photo);

            res.redirect("/");

        });

    });

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
