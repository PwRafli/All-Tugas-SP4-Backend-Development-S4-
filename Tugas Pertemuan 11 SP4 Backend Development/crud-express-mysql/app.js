const express = require('express');
const path = require('path');
const morgan = require('morgan');
const methodOverride = require('method-override');
const session = require('express-session');
const flash = require('express-flash');
const db = require('./library/database');

// Load environment configurations
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Set EJS view engine and directory
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware setup
app.use(morgan('dev')); // HTTP requests logging
app.use(express.json()); // Parsing JSON requests
app.use(express.urlencoded({ extended: true })); // Parsing urlencoded form requests
app.use(methodOverride('_method')); // Method override support for PUT/DELETE in HTML forms
app.use(express.static(path.join(__dirname, 'public'))); // Serve static assets

// Session and Flash middleware setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'postify_super_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 } // Session expires in 24 hours
}));
app.use(flash());

// Middleware to inject flash messages directly into template locals
app.use((req, res, next) => {
    res.locals.messages = req.flash();
    next();
});

// Routes definition
const postsRouter = require('./routes/posts');
app.use('/posts', postsRouter);

// Root path redirects to /posts
app.get('/', (req, res) => {
    res.redirect('/posts');
});

// Error handling middleware for 404 Not Found
app.use((req, res, next) => {
    res.status(404).redirect('/posts');
});

// Bootstrap application after database verification
db.poolPromise.then(() => {
    app.listen(PORT, () => {
        console.log(`====================================================`);
        console.log(`🚀 Server running successfully at: http://localhost:${PORT}`);
        console.log(`📁 Environment: development`);
        console.log(`====================================================`);
    });
}).catch((err) => {
    console.error('CRITICAL: Database failed to initialize. Starting Express anyway in fail-safe mode...');
    // Boot server anyway so user can see errors or configure database
    app.listen(PORT, () => {
        console.log(`====================================================`);
        console.log(`⚠️  Server running in FAIL-SAFE mode at: http://localhost:${PORT}`);
        console.log(`💥 Database connection is offline. Check database logs.`);
        console.log(`====================================================`);
    });
});
