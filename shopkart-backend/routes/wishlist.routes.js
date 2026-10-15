const express = require("express");

const authMiddleware = require("../middlewares/auth.middleware");
const {
    addToWishlist,
    getWishlist,
    removeFromWishlist
} = require("../controllers/wishlist.controller");

const router = express.Router();

router.post("/:productId", authMiddleware, addToWishlist);
router.get("/", authMiddleware, getWishlist);
router.delete("/:productId", authMiddleware, removeFromWishlist);

module.exports = router;
