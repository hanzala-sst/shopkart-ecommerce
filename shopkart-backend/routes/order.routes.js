const express = require("express");
const router = express.Router();

const authMiddleware = require("../middlewares/auth.middleware");
const {
    createPaymentOrder,
    verifyPayment,
    getOrders,
    getOrderById,
    updateOrderStatus
} = require("../controllers/order.controller");

// All order routes require customer authentication
router.post("/create-payment-order", authMiddleware, createPaymentOrder);
router.post("/verify-payment", authMiddleware, verifyPayment);
router.get("/", authMiddleware, getOrders);
router.get("/:id", authMiddleware, getOrderById);
router.patch("/:id/status", authMiddleware, updateOrderStatus);

module.exports = router;
