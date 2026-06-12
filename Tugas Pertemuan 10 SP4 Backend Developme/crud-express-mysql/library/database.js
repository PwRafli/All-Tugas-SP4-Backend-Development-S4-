const mysql = require('mysql2/promise');
const path = require('path');
// Load .env relative to the app root (one level up from library/)
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dbHost = process.env.DB_HOST || 'localhost';
const dbUser = process.env.DB_USER || 'root';
const dbPassword = process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '';
const dbPort = process.env.DB_PORT || 3306;
const dbName = process.env.DB_NAME || 'db_express_crud';

const connectionConfig = {
    host: dbHost,
    user: dbUser,
    password: dbPassword,
    port: parseInt(dbPort, 10)
};

let pool;

/**
 * Initializes the database by:
 * 1. Connecting to MySQL server.
 * 2. Creating the database if it doesn't exist.
 * 3. Creating a connection pool targeting the database.
 * 4. Creating the "posts" table if it doesn't exist.
 */
async function initializeDatabase() {
    try {
        console.log(`Connecting to MySQL server at ${dbHost}:${dbPort}...`);
        
        // Connect to server (without DB name)
        const connection = await mysql.createConnection(connectionConfig);
        
        // Create DB
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        console.log(`Database "${dbName}" verified or created.`);
        await connection.end();

        // Establish connection pool targeting the DB
        pool = mysql.createPool({
            ...connectionConfig,
            database: dbName,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        // Create posts table if not exists
        const tableSchema = `
            CREATE TABLE IF NOT EXISTS posts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        `;
        await pool.query(tableSchema);
        console.log('Table "posts" verified or created.');

        return pool;
    } catch (error) {
        console.error('Database connection or initialization error:');
        console.error(error.message);
        console.error('Please verify that your MySQL server is running and your .env credentials are correct.');
        // Don't kill the process immediately, let the app start but print details
        throw error;
    }
}

// We expose the initialization promise and a helper query wrapper
const poolPromise = initializeDatabase();

module.exports = {
    /**
     * Executes a SQL query with parameters.
     * @param {string} sql 
     * @param {Array} params 
     * @returns {Promise<any>}
     */
    query: async (sql, params) => {
        // Wait until pool is ready
        const activePool = await poolPromise;
        const [results] = await activePool.query(sql, params);
        return results;
    },
    poolPromise
};
