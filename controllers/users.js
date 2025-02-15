const usersRouter = require('express').Router();
const User = require('../models/user');
const Item = require('../models/item');

const bcrypt = require('bcrypt');
const SALT_ROUNDS = 10;

//Middleware
const auth = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/users/login');
    };
};

// login GET route - renders login page
usersRouter.get('/login', (req, res) => {
    res.render('./users/login.ejs', { 
        err: '' 
    });
});

// login POST route - authenticate/login user
usersRouter.post('/login', (req, res) => {
    // step 1 - find the user in the database by their email/username
    User.findOne({ email: req.body.email }, '+password', (err, foundUser) => {
        // step 1.1 - if the user is not found, respond with a error saying that the user does not exist
        if (!foundUser) return res.render('./users/login.ejs', { err: `Account for ${req.body.email} doesn't exist` });
        // step 2 - assuming we've found user, now we compare passwords - plain text - password digest
        if (!bcrypt.compareSync(req.body.password, foundUser.password)) {
            // step 2.1 - if there is not match, respond with a error saying invalid credentials
            return res.render('./users/login.ejs', { err: 'Invalid credentials' });
        }
        // step 3 assuming there is a match, we create a session and redirect to dashboard
        req.session.user = foundUser._id
        res.redirect('/users/profile');
    });
});

//Signup GET Route- renders signup form
usersRouter.get('/signup', (req, res) => {
    res.render('./users/signup.ejs', { 
        err: '' 
    });
});

//Signup POST Route - create a new user
usersRouter.post('/signup', (req, res) => {
    if (req.body.password.length < 8) {
        return res.render('./users/signup.ejs', { err: 'Password must be at least 8 characters long' });
    }
    const hash = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(SALT_ROUNDS));
    req.body.password = hash;
    User.create(req.body, (error, user) => {
        if (error) {
            res.render('./users/signup.ejs', { err: 'Email already taken' });
        } else {
            req.session.user = user._id; // this is a login
            res.redirect('/users/profile'); // send the logged in user to a private space in the site
        };
    });
});

//Logout
usersRouter.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/users/login');
    });
});

//Profile Get 
usersRouter.get('/profile', auth, (req, res) => {
    User.findById(req.session.user, (err, user) => {
        res.render('./users/profile.ejs', { 
            user 
        });
    });
});

//Profile EDIT Route-renders edit form
usersRouter.get('/profile/edit', auth, (req, res) => {
    User.findById(req.session.user, (err, user) => {
        res.render('./users/edit.ejs', { 
            user, 
            err: '' 
        });
    });
});

//Profile UPDATE Route - updates the user in the database
usersRouter.put('/profile/edit', auth, (req, res) => {
    if (req.body.password.length < 8) {
        return res.render('./users/edit.ejs', { err: 'Password must be at least 8 characters long' });
    }
    const hash = bcrypt.hashSync(req.body.password, bcrypt.genSaltSync(SALT_ROUNDS));
    req.body.password = hash;
    User.findByIdAndUpdate(req.session.user, req.body, { new: true }, (err, user) => {
        res.redirect('/users/profile');
    });
});

//Profile DELETE route - deletes the user from the database
usersRouter.delete('/profile', auth, (req, res) => {
    User.findByIdAndDelete(req.session.user, (err, user) => {
        Log.deleteMany({ user: req.session.user }, (err, logs) => {
            req.session.destroy(() => {
                res.redirect('/users/signup');
            });
        });
    });
});

module.exports = usersRouter;