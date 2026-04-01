const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./database.db", (err) => {
    if (err) {
        console.log(err.message);
    } else {
        console.log("Terhubung ke SQLite database");
    }
});

db.serialize(() => {
    db.run(
        `
        CREATE TABLE IF NOT EXISTS room(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            photo TEXT,
            code_room TEXT NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            facilities TEXT,
            room_size TEXT,
            price REAL,
            guests INTEGER,
            available TEXT
        )
        `,
        (err) => {
            if (err) {
                console.log("Failed to create table:", err.message);
            }
        }
    );

    db.all("PRAGMA table_info(room)", (err, columns) => {
        if (err) {
            console.log("Failed to read table info:", err.message);
            return;
        }

        const hasFacilities = columns.some((col) => col.name === "facilities");
        if (!hasFacilities) {
            db.run("ALTER TABLE room ADD COLUMN facilities TEXT", (alterErr) => {
                if (alterErr) {
                    console.log("Failed to add facilities column:", alterErr.message);
                }
            });
        }
    });
});

module.exports = db;
