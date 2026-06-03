// FORM EDIT
router.get('/edit/:id', function (req, res) {

    let id = req.params.id;

    connection.query(
        'SELECT * FROM posts WHERE id = ?',
        [id],
        function (err, rows) {

            res.render('posts/edit', {
                data: rows[0]
            });

        }
    );

});

router.get('/delete/:id', function (req, res) {

    let id = req.params.id;

    connection.query(
        'DELETE FROM posts WHERE id = ?',
        [id],
        function (err, result) {

            if (err) {
                console.log(err);
            } else {
                req.flash('success',
                    'Data Berhasil Dihapus!');
                res.redirect('/posts');
            }

        }
    );

});

// UPDATE DATA
router.post('/update/:id', function (req, res) {

    let id = req.params.id;

    let formData = {
        title: req.body.title,
        content: req.body.content
    };

    connection.query(
        'UPDATE posts SET ? WHERE id = ?',
        [formData, id],
        function (err, result) {

            if (err) {
                console.log(err);
            } else {
                req.flash('success',
                    'Data Berhasil Diupdate!');
                res.redirect('/posts');
            }

        }
    );

});