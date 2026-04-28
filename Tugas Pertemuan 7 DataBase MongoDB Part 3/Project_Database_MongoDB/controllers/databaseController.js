const Room = require("../mongodb");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

const UPLOAD_DIR = path.join(__dirname, "../uploads");
const DEFAULT_PHOTOS = new Set(["noimage.svg", "noimage.png"]);

function deletePhotoIfExists(filename) {
    if (!filename || DEFAULT_PHOTOS.has(filename)) return;
    const filePath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
}

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

module.exports = {

    /* ================= WEB (VIEW) CONTROLLERS ================= */

    viewRoom: async (req, res) => {
        try {
            // Keep existing search & pagination logic
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

            const roomsData = await Room.find(query).skip(safeOffset).limit(pageSize);

            const rooms = roomsData.map(room => ({
                ...room.toObject(),
                id: room._id.toString()
            }));

            // Adapted Alert code from user snippet
            let alertMessage = [];
            let alertStatus = [];
            if (typeof req.flash === 'function') {
                alertMessage = req.flash("alertMessage");
                alertStatus = req.flash("alertStatus");
            }
            const alert = { message: alertMessage, status: alertStatus };

            // Render index exactly as adapted
            res.render("index", {
                rooms,      // Matching the 'mahasiswa' convention
                search,     // Keeping extra variables needed by the view
                page: safePage,
                totalPages,
                alert,      // Added from user snippet
                title: "CRUD" // Added from user snippet
            });
        } catch (error) {
            res.redirect("/");
        }
    },

    showAddForm: (req, res) => {
        res.render("add", { title: "Add Room" });
    },

    createRoomWeb: async (req, res, next) => {
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
                if (typeof req.flash === 'function') {
                    req.flash("alertMessage", "code_room and name are required");
                    req.flash("alertStatus", "danger");
                }
                return res.redirect("/");
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

            if (typeof req.flash === 'function') {
                req.flash("alertMessage", "Success Add Room");
                req.flash("alertStatus", "success");
            }
            res.redirect("/");
        } catch (err) {
            if (req.file) deletePhotoIfExists(req.file.filename);
            if (typeof req.flash === 'function') {
                req.flash("alertMessage", err.message);
                req.flash("alertStatus", "danger");
            }
            res.redirect("/");
        }
    },

    showEditForm: async (req, res, next) => {
        try {
            const id = req.params.id;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                return res.redirect("/");
            }

            const room = await Room.findById(id);
            if (!room) return res.redirect("/");

            res.render("edit", { room: { ...room.toObject(), id: room._id.toString() }, title: "Edit Room" });
        } catch (err) {
            res.redirect("/");
        }
    },

    updateRoomWeb: async (req, res, next) => {
        try {
            const id = req.params.id;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                if (req.file) deletePhotoIfExists(req.file.filename);
                return res.redirect("/");
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
                if (typeof req.flash === 'function') {
                    req.flash("alertMessage", "code_room and name are required");
                    req.flash("alertStatus", "danger");
                }
                return res.redirect("/");
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

            if (typeof req.flash === 'function') {
                req.flash("alertMessage", "Success Update Room");
                req.flash("alertStatus", "success");
            }
            res.redirect("/");
        } catch (err) {
            if (req.file) deletePhotoIfExists(req.file.filename);
            if (typeof req.flash === 'function') {
                req.flash("alertMessage", err.message);
                req.flash("alertStatus", "danger");
            }
            res.redirect("/");
        }
    },

    deleteRoomWeb: async (req, res, next) => {
        try {
            const id = req.params.id;
            if (!mongoose.Types.ObjectId.isValid(id)) {
                if (typeof req.flash === 'function') {
                    req.flash("alertMessage", "Invalid Room ID");
                    req.flash("alertStatus", "danger");
                }
                return res.redirect("/");
            }

            const room = await Room.findById(id);
            if (room) {
                await Room.findByIdAndDelete(id);
                if (room.photo) deletePhotoIfExists(room.photo);
            }

            if (typeof req.flash === 'function') {
                req.flash("alertMessage", "Success Delete Room");
                req.flash("alertStatus", "success");
            }

            res.redirect("/");
        } catch (err) {
            if (typeof req.flash === 'function') {
                req.flash("alertMessage", err.message);
                req.flash("alertStatus", "danger");
            }
            res.redirect("/");
        }
    },

    /* ================= API CONTROLLERS ================= */

    getAllRoomsAPI: async (req, res, next) => {
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
    },

    getRoomByIdAPI: async (req, res, next) => {
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
    },

    createRoomAPI: async (req, res, next) => {
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
    },

    updateRoomAPI: async (req, res, next) => {
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
    },

    deleteRoomAPI: async (req, res, next) => {
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
    }
};
