const express = require('express'),
    router = express.Router({ mergeParams: true }),
    Campground = require("../models/campground"),
    Comment = require("../models/comment"),
    // middleware = require("../middleware/index")
    middleware = require("../middleware"); //bc the file above is named index.js so i can skip writing it


//==================
//COMMENTS ROUTE
//==================

//NEW
router.get('/new', middleware.isLoggedIn, (req, res) => {
    //find campground by id
    Campground.findOne({ slug: req.params.slug }, (err, campground) => {
        if (err || !campground) { return req.flash("error", "Campground not found"); }
        res.render('comments/new', { campground: campground })
    })
})
//CREATE
router.post('/', middleware.isLoggedIn, (req, res) => {
    //look up campground using id
    Campground.findOne({ slug: req.params.slug }, (err, campground) => {
        if (err) {
            req.flash('error', err.message);
            res.redirect('/campgrounds');
        } else { //create new comment
            Comment.create(req.body.comment, async (err, comment) => {
                if (err) {
                    req.flash('error', `Something went wrong, ${err.message}`);
                    return res.redirect('back')
                };
                //add username and id to comment
                comment.author.id = req.user._id;
                comment.author.username = req.user.username;
                //save comment
                comment.save();
                //connect new comment to campground
                campground.comments.push(comment);
                await campground.save()
                //redirect to campground show page
                req.flash("success", "Succesfully added Comment!")
                res.redirect("/campgrounds/" + campground.slug);
            })
        }
    })
})

//Edit comments
router.get("/:comment_id/edit", middleware.isLoggedIn, middleware.checkCommentOwnership, (req, res) => {
    Comment.findById(req.params.comment_id, (err, foundComment) => {
        if (err) {
            res.redirect("back");
        } else {
            res.render("comments/edit", { campground_slug: req.params.slug, comment: foundComment });
        }
    });
});

//Update comment
router.put("/:comment_id", middleware.checkCommentOwnership, (req, res) => {
    Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, (err, updatedComment) => {
        if (err) return res.redirect("back");
        res.redirect("/campgrounds/" + req.params.slug)
    })
})

//comment destroy route
router.delete("/:comment_id", middleware.checkCommentOwnership, (req, res) => {
    Comment.findByIdAndRemove(req.params.comment_id, err => {
        if (err) {
            req.flash('error', err.message)
            return res.redirect("back");
        }
        req.flash("success", "Comment deleted!")
        res.redirect("/campgrounds/" + req.params.slug)
    })
})



module.exports = router;