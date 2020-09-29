const express = require('express'),
    router = express.Router({ mergeParams: true }),
    passport = require("passport"),
    User = require("../models/user")


router.get('/', (req, res) => {
    res.render('landing')
})



//===================
//AUTH ROUTES
//===================
//show sign up form
router.get('/register', (req, res) => {
    res.render('register')
})
//handle signup logic
router.post('/register', (req, res) => {
    const newUser = new User({ username: req.body.username });
    if (req.body.adminCode === process.env.ADMIN_CODE) {
        newUser.isAdmin = true;
    }
    User.register(newUser, req.body.password, (err, user) => {
        if (err) {
            req.flash('error', err.message)//err gives an object which "message" is the property we need
            return res.redirect('register');
        }
        passport.authenticate('local')(req, res, () => {
            req.flash("success", "Welcome to Campgrounds " + user.username)
            res.redirect('/campgrounds')
        })
    })
})

//show login form
router.get('/login', (req, res) => {
    res.render('login')
})
//handling login logic
router.post('/login', passport.authenticate('local', { successRedirect: '/campgrounds', successFlash: 'Welcome Back!', failureRedirect: '/register', failureFlash: 'Account does not exist or invalid credentials' }), (req, res) => { })
//logout route
router.get('/logout', (req, res) => {
    req.logout();
    req.flash("success", "Logged Out!")
    res.redirect('/campgrounds')
})


module.exports = router;