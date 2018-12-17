const express = require("express");


const router = express.Router();


router.get("/logout", (req, res, next) => {
  req.logout();
  res.redirect("/");
});


module.exports = router;