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
});

module.exports = db;
