var express = require('express'),
    router = express.Router({ mergeParams: true }),
    Campground = require("../models/campground"),
    Comment = require("../models/comment"),
    Review = require("../models/review"),
    // middleware = require("../middleware/index")
    middleware = require("../middleware"), //bc the file above is named index.js so i can skip writing it
    multer = require('multer'),
    storage = multer.diskStorage({
        filename: function (req, file, callback) {
            callback(null, Date.now() + file.originalname);
        }
    }),
    imageFilter = function (req, file, cb) {
        //accept image files only
        if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
            return cb(new Error('Only image files are allowed!'), false);
        }
        cb(null, true);
    },
    upload = multer({ storage: storage, fileFilter: imageFilter }),
    cloudinary = require('cloudinary');

cloudinary.config({
    cloud_name: "dyeyoxzwb",
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET
})


//INDEX
router.get('/', (req, res) => {
    var noMatch = null;
    if (req.query.search) {
        const regex = new RegExp(escapeRegex(req.query.search), 'gi');
        Campground.find({ name: regex }, (err, allCampgrounds) => {
            if (err) return console.log(err);
            else {
                if (allCampgrounds.length < 1) {
                    noMatch = 'No Campgrounds match that query, please try again'
                }
                res.render('campgrounds/index', { campgrounds: allCampgrounds, noMatch: noMatch });
            }
        })
    } else {
        //Get all campgrounds
        Campground.find({}, (err, allCampgrounds) => {
            if (err) return console.error(err);
            else {
                res.render('campgrounds/index', { campgrounds: allCampgrounds, noMatch: noMatch });
            }
        })
    }
})
//CREATE
router.post('/', middleware.isLoggedIn, upload.single('image'), (req, res) => {
    cloudinary.v2.uploader.upload(req.file.path, function (err, result) {
        if (err) {
            req.flash('error', err.message);
            return res.redirect('back')
        }
        // add cloudinary url for the image to the campground object under image property
        req.body.campground.image = result.secure_url;
        //add image public id to campground object
        req.body.campground.imageId = result.public_id;
        // add author to campground
        req.body.campground.author = {
            id: req.user._id,
            username: req.user.username
        }
        Campground.create(req.body.campground, function (err, campground) {
            if (err) {
                req.flash('error', err.message);
                return res.redirect('back');
            }
            res.redirect('/campgrounds/' + campground.slug);
        });
    });
})
//NEW
router.get('/new', middleware.isLoggedIn, (req, res) => {
    res.render('campgrounds/new')
})
//SHOW
router.get("/:slug", (req, res) => {
    //find the campground with provided ID
    Campground.findOne({ slug: req.params.slug }).populate('comments likes').populate({
        path: "reviews",
        options: { sort: { createdAt: -1 } }
    }).exec((err, foundCampground) => {
        if (err || !foundCampground) {
            req.flash('error', 'Campground not found')
            res.redirect('back')
            console.log(err);
        }
        //render show template with that campground
        res.render("campgrounds/show", { campground: foundCampground });
    })
})

// Campground Like Route
router.post("/:slug/like", middleware.isLoggedIn, (req, res) => {
    Campground.findOne({ slug: req.params.slug }, (err, foundCampground) => {
        if (err) {
            console.log(err);
            return res.redirect("/campgrounds");
        }

        // check if req.user._id exists in foundCampground.likes
        var foundUserLike = foundCampground.likes.some(function (like) {
            return like.equals(req.user._id);
        });

        if (foundUserLike) {
            // user already liked, removing like
            foundCampground.likes.pull(req.user._id);
        } else {
            // adding the new user like
            foundCampground.likes.push(req.user);
        }

        foundCampground.save(err => {
            if (err) {
                console.log(err);
                return res.redirect("/campgrounds");
            }
            return res.redirect("/campgrounds/" + foundCampground.slug);
        });
    });
});

//EDIT Campground routes
router.get("/:slug/edit", middleware.isLoggedIn, middleware.checkCampgroundOwnership, (req, res) => {
    Campground.findOne({ slug: req.params.slug }, (err, foundCampground) => {
        res.render("campgrounds/edit", { campground: foundCampground })
    });
});

//UPDATE CAMPGROUND ROUTES(new)
router.put('/:slug', middleware.isLoggedIn, middleware.checkCampgroundOwnership, upload.single('image'), (req, res) => {
    //find and update
    Campground.findOne({ slug: req.params.slug }, async function (err, updatedCampground) {
        if (err) {
            req.flash('error', err.message);
            res.redirect('/campgrounds');
        } else {
            if (req.file) {
                try {
                    await cloudinary.v2.uploader.destroy(updatedCampground.imageId);
                    var result = await cloudinary.v2.uploader.upload(req.file.path);
                    updatedCampground.imageId = result.public_id;
                    updatedCampground.image = result.secure_url;
                } catch (err) {
                    req.flash('error', err.message);
                    return res.redirect('/campgrounds');
                }
            }
            updatedCampground.name = req.body.campground.name
            updatedCampground.price = req.body.campground.price
            updatedCampground.description = req.body.campground.description
            await updatedCampground.save()
            req.flash('sucess', 'Successfully Updated!')
            res.redirect("/campgrounds/" + updatedCampground.slug)
        }
    })
})

//DESTROY CAMPGROUND(new)
router.delete("/:slug", middleware.isLoggedIn, middleware.checkCampgroundOwnership, (req, res) => {
    Campground.findOne({ slug: req.params.slug }, async function (err, removedCampground) {
        if (err) {
            req.flash('error', err.message);
            return res.redirect("/campgrounds");
        }
        try {
            await Comment.deleteMany({ "_id": { $in: removedCampground.comments } })
            await Review.deleteMany({ "_id": { $in: removedCampground.reviews } })
            await cloudinary.v2.uploader.destroy(removedCampground.imageId);
            await removedCampground.remove();
            req.flash('success', 'Campground Deleted!');
            return res.redirect("/campgrounds");
        } catch (err) {
            req.flash('error', err.message);
            return res.redirect("/campgrounds");
        }
    })
})


function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};



module.exports = router;