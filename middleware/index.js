const Campground = require("../models/campground"),
    Comment = require('../models/comment'),
    Review = require("../models/review");

//all middleware goes here

var middlewareObj = {}

middlewareObj.checkCampgroundOwnership = (req, res, next) => {
    Campground.findOne({ slug: req.params.slug }, (err, foundCampground) => {
        if (err || !foundCampground) {
            req.flash("error", "Sorry, that Campground does not exist")
            res.redirect("/campgrounds");
            console.log(err);
        } else if (foundCampground.author.id.equals(req.user._id) || req.user.isAdmin) {
            req.campground = foundCampground;
            next();
        } else {
            req.flash('error', 'You don\'t have permission to do that!');
            res.redirect('back');
        }
    })
}
middlewareObj.checkCommentOwnership = (req, res, next) => {
    Comment.findById(req.params.comment_id, (err, foundComment) => {
        if (err) { req.flash("error", "Comment not found"); res.redirect("/campgrounds"); console.error(err); }
        else if (foundComment.author.id.equals(req.user._id) || req.user.isAdmin) {
            req.comment = foundComment;
            next();
        } else {
            req.flash('error', 'You don\'t have permission to do that!');
            res.redirect('/campgrounds/' + req.params.id);
        }
    })
}

middlewareObj.checkReviewOwnership = (req, res, next) => {
    Review.findById(req.params.review_id, (err, foundReview) => {
        if (err || !foundReview) {
            res.redirect("back");
        } else {
            // does user own the comment?
            if (foundReview.author.id.equals(req.user._id) || req.user.isAdmin) {
                req.review = foundReview;
                next();
            } else {
                req.flash("error", "You don't have permission to do that");
                res.redirect("back");
            }
        }
    });
};

middlewareObj.checkReviewExistence = (req, res, next) => {
    Campground.findOne({ slug: req.params.slug }).populate("reviews").exec((err, foundCampground) => {
        if (err || !foundCampground) {
            req.flash("error", "Campground not found.");
            res.redirect("back");
        } else {
            // check if req.user._id exists in foundCampground.reviews
            var foundUserReview = foundCampground.reviews.some(function (review) {
                return review.author.id.equals(req.user._id);
            });
            if (foundUserReview) {
                req.flash("error", "You already wrote a review.");
                return res.redirect("/campgrounds/" + foundCampground.slug);
            }
            // if the review was not found, go to the next middleware
            next();
        }
    });
};


middlewareObj.isLoggedIn = (req, res, next) => {
    if (req.isAuthenticated()) return next();
    req.flash('error', "You need to be Logged In to do that!")
    res.redirect('/login')
}

module.exports = middlewareObj;