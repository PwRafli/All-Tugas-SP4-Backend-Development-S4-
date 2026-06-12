const express = require('express');
const router = express.Router();
const db = require('../library/database');
const { body, validationResult } = require('express-validator');

// Validation Rules for Creating and Updating Posts
const postValidationRules = [
    body('title')
        .trim()
        .notEmpty().withMessage('Title is required.')
        .isLength({ min: 5 }).withMessage('Title must be at least 5 characters long.'),
    body('content')
        .trim()
        .notEmpty().withMessage('Content is required.')
        .isLength({ min: 10 }).withMessage('Content must be at least 10 characters long.')
];

/**
 * INDEX ROUTE - Fetch posts (with optional search)
 * GET /posts or GET /posts?search=...
 */
router.get('/', async (req, res, next) => {
    try {
        const searchQuery = req.query.search ? req.query.search.trim() : '';
        let posts;
        
        if (searchQuery) {
            const querySql = 'SELECT * FROM posts WHERE title LIKE ? OR content LIKE ? ORDER BY id DESC';
            const searchParam = `%${searchQuery}%`;
            posts = await db.query(querySql, [searchParam, searchParam]);
        } else {
            posts = await db.query('SELECT * FROM posts ORDER BY id DESC');
        }
        
        res.render('posts/index', {
            title: 'Dashboard | Postify',
            posts: posts,
            searchQuery: searchQuery
        });
    } catch (err) {
        console.error('Error fetching posts:', err);
        req.flash('error', 'Failed to retrieve publications from database.');
        res.render('posts/index', {
            title: 'Dashboard | Postify',
            posts: [],
            searchQuery: req.query.search || ''
        });
    }
});

/**
 * CREATE ROUTE - Render new post form
 * GET /posts/create
 */
router.get('/create', (req, res) => {
    res.render('posts/create', {
        title: 'Create Publication | Postify',
        errors: null,
        formData: null
    });
});

/**
 * STORE ROUTE - Save new post to DB
 * POST /posts/store
 */
router.post('/store', postValidationRules, async (req, res) => {
    const errors = validationResult(req);
    
    // If validation fails, re-render creation form with error flags
    if (!errors.isEmpty()) {
        // Map the errors into a key-value object for easy display in EJS
        const mappedErrors = errors.mapped();
        return res.render('posts/create', {
            title: 'Create Publication | Postify',
            errors: mappedErrors,
            formData: req.body
        });
    }

    const { title, content } = req.body;

    try {
        await db.query('INSERT INTO posts (title, content) VALUES (?, ?)', [title, content]);
        req.flash('success', 'Publication successfully created!');
        res.redirect('/posts');
    } catch (err) {
        console.error('Error storing post:', err);
        req.flash('error', 'An error occurred while saving the publication to the database.');
        res.render('posts/create', {
            title: 'Create Publication | Postify',
            errors: { database: 'Database write error' },
            formData: req.body
        });
    }
});

/**
 * EDIT ROUTE - Fetch post and render edit form
 * GET /posts/edit/:id
 */
router.get('/edit/:id', async (req, res) => {
    const { id } = req.params;
    
    try {
        const posts = await db.query('SELECT * FROM posts WHERE id = ?', [id]);
        
        if (posts.length === 0) {
            req.flash('error', `Publication with ID ${id} was not found.`);
            return res.redirect('/posts');
        }

        res.render('posts/edit', {
            title: 'Edit Publication | Postify',
            post: posts[0],
            errors: null,
            formData: null
        });
    } catch (err) {
        console.error(`Error retrieving post with ID ${id}:`, err);
        req.flash('error', 'Error retrieving publication data.');
        res.redirect('/posts');
    }
});

/**
 * UPDATE ROUTE - Modify an existing post in the DB
 * PUT /posts/update/:id
 */
router.put('/update/:id', postValidationRules, async (req, res) => {
    const { id } = req.params;
    const errors = validationResult(req);
    
    // If validation fails, re-render the edit form with fields populated
    if (!errors.isEmpty()) {
        const mappedErrors = errors.mapped();
        return res.render('posts/edit', {
            title: 'Edit Publication | Postify',
            post: { id: id }, // pass minimum structure to render URL
            errors: mappedErrors,
            formData: req.body
        });
    }

    const { title, content } = req.body;

    try {
        const result = await db.query('UPDATE posts SET title = ?, content = ? WHERE id = ?', [title, content, id]);
        
        if (result.affectedRows === 0) {
            req.flash('error', `Failed to update. Publication with ID ${id} does not exist.`);
        } else {
            req.flash('success', 'Publication successfully updated!');
        }
        res.redirect('/posts');
    } catch (err) {
        console.error(`Error updating post with ID ${id}:`, err);
        req.flash('error', 'An error occurred while updating the publication in the database.');
        res.render('posts/edit', {
            title: 'Edit Publication | Postify',
            post: { id: id, title: title, content: content },
            errors: { database: 'Database write error' },
            formData: req.body
        });
    }
});

/**
 * DELETE ROUTE - Remove a post from the DB
 * DELETE /posts/delete/:id
 */
router.delete('/delete/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const result = await db.query('DELETE FROM posts WHERE id = ?', [id]);
        
        if (result.affectedRows === 0) {
            req.flash('error', `Failed to delete. Publication with ID ${id} does not exist.`);
        } else {
            req.flash('success', 'Publication successfully deleted!');
        }
        res.redirect('/posts');
    } catch (err) {
        console.error(`Error deleting post with ID ${id}:`, err);
        req.flash('error', 'An error occurred while deleting the publication.');
        res.redirect('/posts');
    }
});

module.exports = router;
