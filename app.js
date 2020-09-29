var campground = require('./models/campground');
var express = require('express'),
    expsess = require('express-session'),
    app = express(),
    bodyParser = require('body-parser'),
    mongoose = require('mongoose'),
    flash = require("connect-flash"),
    passport = require('passport'),
    localStrategy = require('passport-local'),
    methodOverride = require("method-override"),
    passportLocalMongoose = require('passport-local-mongoose'),
    Campground = require("./models/campground"),
    Comment = require("./models/comment"),
    User = require('./models/user'),
    seedDB = require("./seeds");


require('dotenv').config();


var campgroundRoutes = require("./routes/campgrounds"),
    commentRoutes = require("./routes/comments"),
    reviewRoutes = require("./routes/reviews"),
    indexRoutes = require("./routes/index");

// seedDB();

mongoose.connect(process.env.DATABASE_URI, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false })
    .then(() => { console.log('Connected to database') })
    .catch(error => console.log(error.message));


app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(methodOverride("_method"));
app.use(flash())// docs for express v4
//PASSPORT CONFIG
app.locals.moment = require('moment');
app.use(expsess({ secret: 'i make this look easy ', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()))
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.error = req.flash("error");
    res.locals.success = req.flash("success");
    next()
})

// app.use(campgroundRoutes);
// app.use(commentRoutes);
// app.use(indexRoutes);
// app.use(reviewRoutes);

// for requiring routes and removing the suffixes
app.use("/", indexRoutes);
app.use("/campgrounds", campgroundRoutes);
app.use("/campgrounds/:slug/comments", commentRoutes);
app.use("/campgrounds/:slug/reviews", reviewRoutes);

app.get('*', (req, res) => {
    res.status(404).send('What?')
});

app.listen(process.env.PORT, process.env.IP, () => {
    console.log('YelpCamp on Ground!!!')
})