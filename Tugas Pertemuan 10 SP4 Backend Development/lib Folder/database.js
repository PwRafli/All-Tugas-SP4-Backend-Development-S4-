const mysql = require('mysql');

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'db_posts'
});

connection.connect(function (err) {
    if (err) {
        console.log(err);
    } else {
        console.log('Database Connected!');
    }
});

module.exports = connection;

