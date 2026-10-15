const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const {
    addToCart,
    getCart,
    updateCartItemQuantity,
    removeFromCart
} = require("../controllers/cart.controller");

router.post("/:productId", authMiddleware, addToCart);
router.get("/", authMiddleware, getCart);
router.patch("/:productId", authMiddleware, updateCartItemQuantity);
router.delete("/:productId", authMiddleware, removeFromCart);

module.exports = router;
