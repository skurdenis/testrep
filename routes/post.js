const async = require("async");
const express = require("express");
const okta = require("@okta/okta-sdk-nodejs");
const sequelize = require("sequelize");
const slugify = require("slugify");

const models = require("../models");

const client = new okta.Client({
  orgUrl: "",
  token: ""
});
const router = express.Router();


function ensureAuthenticated(req, res, next) {
  if (!req.user) {
    return res.status(401).render("unauthenticated");
  }

  next();
}


router.get("/", (req, res) => {
  models.Post.findAll({
    order: sequelize.literal("createdAt DESC")
  }).then(posts => {
    let postData = [];

    async.eachSeries(posts, (post, callback) => {
      post = post.get({ plain: true });
      client.getUser(post.authorId).then(user => {
        postData.push({
          title: post.title,
          body: post.body,
          createdAt: post.createdAt,
          authorName: user.profile.firstName + " " + user.profile.lastName,
          slug: post.slug
        });
        callback();
      }).catch(err => {
        postData.push({
          title: post.title,
          body: post.body,
          createdAt: post.createdAt,
          slug: post.slug
        });
        callback();
      });
    }, err => {
      return res.render("index", { posts: postData });
    });
  });
});


router.get("/dashboard", ensureAuthenticated, (req, res, next) => {
  models.Post.findAll({
    where: {
      authorId: req.user.id
    },
    order: sequelize.literal("createdAt DESC")
  }).then(posts => {
    let postData = [];

    posts.forEach(post => {
      postData.push(post.get({ plain: true }));
    });

    return res.render("dashboard", { posts: postData });
  });
});


router.post("/dashboard", ensureAuthenticated, (req, res, next) => {
  models.Post.create({
    title: req.body.title,
    body: req.body.body,
    authorId: req.user.id,
    slug: slugify(req.body.title).toLowerCase()
  }).then(newPost => {
    models.Post.findAll({
      where: {
        authorId: req.user.id
      },
      order: sequelize.literal("createdAt DESC")
    }).then(posts => {
      let postData = [];

      posts.forEach(post => {
        postData.push(post.get({ plain: true }));
      });

      res.render("dashboard", { post: newPost, posts: postData });
    });
  });
});


router.get("/:slug/edit", ensureAuthenticated, (req, res, next) => {
  models.Post.findOne({
    where: {
      slug: req.params.slug,
      authorId: req.user.id
    }
  }).then(post => {
    if (!post) {
      return res.render("error", {
        message: "Page not found.",
        error: {
          status: 404,
        }
      });
    }

    post = post.get({ plain: true });
    client.getUser(post.authorId).then(user => {
      post.authorName = user.profile.firstName + " " + user.profile.lastName;
      res.render("edit", { post });
    });
  });
});


router.post("/:slug/edit", ensureAuthenticated, (req, res, next) => {
  models.Post.findOne({
    where: {
      slug: req.params.slug,
      authorId: req.user.id
    }
  }).then(post => {
    if (!post) {
      return res.render("error", {
        message: "Page not found.",
        error: {
          status: 404,
        }
      });
    }

    post.update({
      title: req.body.title,
      body: req.body.body,
      slug: slugify(req.body.title).toLowerCase()
    }).then(() => {
      post = post.get({ plain: true });
      client.getUser(post.authorId).then(user => {
        post.authorName = user.profile.firstName + " " + user.profile.lastName;
        res.redirect("/" + slugify(req.body.title).toLowerCase());
      });
    });
  });
});


router.post("/:slug/delete", (req, res, next) => {
  models.Post.findOne({
    where: {
      slug: req.params.slug,
      authorId: req.user.id
    }
  }).then(post => {
    if (!post) {
      return res.render("error", {
        message: "Page not found.",
        error: {
          status: 404,
        }
      });
    }

    post.destroy();
    res.redirect("/dashboard");
  });
});

router.get("/:slug", (req, res, next) => {
  models.Post.findOne({
    where: {
      slug: req.params.slug
    }
  }).then(post => {
    if (!post) {
      return res.render("error", {
        message: "Page not found.",
        error: {
          status: 404,
        }
      });
    }

    post = post.get({ plain: true });
    client.getUser(post.authorId).then(user => {
      post.authorName = user.profile.firstName + " " + user.profile.lastName;
      res.render("post", { post });
    });
  });
});


module.exports = router;
