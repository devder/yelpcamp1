var express = require("express"),
    router = express.Router({ mergeParams: true }),
    Campground = require("../models/campground"),
    Review = require("../models/review"),
    middleware = require("../middleware");

// Reviews Index
router.get("/", (req, res) => {
    Campground.findOne({ slug: req.params.slug }).populate({
        path: "reviews",
        options: { sort: { createdAt: -1 } } // sorting the populated reviews array to show the latest first
    }).exec((err, foundCampground) => {
        if (err || !foundCampground) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
        res.render("reviews/index", { campground: foundCampground });
    });
});

// Reviews New
router.get("/new", middleware.isLoggedIn, middleware.checkReviewExistence, (req, res) => {
    // middleware.checkReviewExistence checks if a user already reviewed the campground, only one review per user is allowed
    Campground.findOne({ slug: req.params.slug }, (err, foundCampground) => {
        if (err) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
        res.render("reviews/new", { campground: foundCampground });

    });
});

// Reviews Create
router.post("/", middleware.isLoggedIn, middleware.checkReviewExistence, (req, res) => {
    //lookup campground using ID
    Campground.findOne({ slug: req.params.slug }).populate("reviews").exec((err, campground) => {
        if (err) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
        Review.create(req.body.review, async (err, review) => {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            //add author username/id and associated campground to the review
            review.author.id = req.user._id;
            review.author.username = req.user.username;
            review.campground = campground;
            //save review
            review.save();
            campground.reviews.push(review);
            // calculate the new average review for the campground
            campground.rating = calculateAverage(campground.reviews);
            //save campground
            await campground.save();
            req.flash("success", "Your review has been successfully added.");
            res.redirect('/campgrounds/' + campground.slug);
        });
    });
});

// Reviews Edit
router.get("/:review_id/edit", middleware.checkReviewOwnership, (req, res) => {
    Review.findById(req.params.review_id, (err, foundReview) => {
        if (err) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
        res.render("reviews/edit", { campground_slug: req.params.slug, review: foundReview });
    });
});

// Reviews Update
router.put("/:review_id", middleware.checkReviewOwnership, (req, res) => {
    Review.findByIdAndUpdate(req.params.review_id, req.body.review, { new: true }, (err, updatedReview) => {
        if (err) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
        Campground.findOne({ slug: req.params.slug }).populate("reviews").exec((err, campground) => {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            // recalculate campground average
            campground.rating = calculateAverage(campground.reviews);
            //save changes
            campground.save();
            req.flash("success", "Your review was successfully edited.");
            res.redirect('/campgrounds/' + campground.slug);
        });
    });
});

// Reviews Delete
router.delete("/:review_id", middleware.checkReviewOwnership, function (req, res) {
    Review.findByIdAndRemove(req.params.review_id, function (err) {
        if (err) {
            req.flash("error", err.message);
            return res.redirect("back");
        }
        Campground.findOneAndUpdate({ slug: req.params.slug }, { $pull: { reviews: req.params.review_id } }, { new: true }).populate("reviews").exec(function (err, campground) {
            if (err) {
                req.flash("error", err.message);
                return res.redirect("back");
            }
            // recalculate campground average
            campground.rating = calculateAverage(campground.reviews);
            //save changes
            campground.save();
            req.flash("success", "Your review was deleted successfully.");
            res.redirect("/campgrounds/" + req.params.slug);
        });
    });
});

function calculateAverage(reviews) {
    if (reviews.length === 0) {
        return 0;
    }
    var sum = 0;
    reviews.forEach(function (element) {
        sum += element.rating;
    });
    return sum / reviews.length;
}

module.exports = router;