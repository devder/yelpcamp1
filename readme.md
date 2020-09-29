RESTFUL ROUTES

name      path                         verb      description
=======================================================================================================
INDEX     /dogs                        GET       Display a list of all dogs
NEW       /dogs/new                    GET       Shows the form for adding a new dog
CREATE    /dogs                        POST      Add new dog to DB
SHOW      /dogs/:id                    GET       Show info about one dog
EDIT      /dogs/:id/edit               GET       Show edit form for one dog
UPDATE    /dogs/:id                    PUT       Update a particular dog then redirect somewhere
DESTROY   /dogs/:id                    DELETE    Delete a particular dog then redirect somewhere


NEW       /dogs/:id/comments/new       GET       Display form for new comment to be added to DB
CREATE    /dogs/:id/comments           POST