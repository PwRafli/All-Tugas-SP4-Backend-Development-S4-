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

    db.all(
        `SELECT * FROM room
         WHERE name LIKE ?
         OR code_room LIKE ?
         OR description LIKE ?`,
        [`%${search}%`, `%${search}%`, `%${search}%`],
        (err, rows) => {
            if (err) return next(err);

            res.render("index", {
                rooms: rows,
                search: search
            });

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
