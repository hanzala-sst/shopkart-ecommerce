const crypto = require("crypto");
const mongoose = require("mongoose");

const Customer = require("../models/customer.model");
const Product = require("../models/product.model");
const Order = require("../models/order.model");
const razorpayConfig = require("../config/razorpay");

/**
 * Validates a standard 24-character hex MongoDB ObjectId.
 */
const isValidObjectId = (id) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return false;
    }
    return String(new mongoose.Types.ObjectId(id)) === id;
};

/**
 * Helper to validate shipping address.
 * Returns null if valid, or an error message string if invalid.
 */
const validateShippingAddress = (address) => {
    if (!address || typeof address !== "object") {
        return "Shipping address is required";
    }

    const { fullName, phone, addressLine1, city, state, pincode } = address;

    if (!fullName || typeof fullName !== "string" || fullName.trim().length === 0) {
        return "Full name is required";
    }

    if (!phone || typeof phone !== "string" || phone.trim().length === 0) {
        return "Phone number is required";
    }

    const cleanPhone = phone.trim().replace(/[\s\-]/g, "");
    if (!/^\+?[0-9]{10,13}$/.test(cleanPhone)) {
        return "Please enter a valid phone number (10 to 12 digits)";
    }

    if (!addressLine1 || typeof addressLine1 !== "string" || addressLine1.trim().length === 0) {
        return "Address line is required";
    }

    if (!city || typeof city !== "string" || city.trim().length === 0) {
        return "City is required";
    }

    if (!state || typeof state !== "string" || state.trim().length === 0) {
        return "State is required";
    }

    if (!pincode || typeof pincode !== "string" || pincode.trim().length === 0) {
        return "Pincode is required";
    }

    if (!/^[0-9]{6}$/.test(pincode.trim())) {
        return "Pincode must contain exactly 6 digits";
    }

    return null;
};

/**
 * POST /orders/create-payment-order
 * 1. Authenticate user (via authMiddleware)
 * 2. Load user's cart from MongoDB
 * 3. Reject empty cart
 * 4. Load latest product data and verify existence
 * 5. Re-verify available stock
 * 6. Calculate totalAmount on the server
 * 7. Snapshot product details into order items
 * 8. Persist ShopKart order (PENDING_PAYMENT)
 * 9. Create Razorpay Order in paise
 * 10. Save razorpayOrderId and return checkout data
 */
const createPaymentOrder = async (req, res) => {
    try {
        const { shippingAddress } = req.body;

        // 1. Validate shipping address
        const validationError = validateShippingAddress(shippingAddress);
        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError
            });
        }

        // 2. Fetch authenticated customer and their cart
        const customer = await Customer.findById(req.user._id);
        if (!customer) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const cart = customer.cart || [];
        if (cart.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Your cart is empty. Add products before checking out."
            });
        }

        // 3. Load latest product data for each item
        const productIds = cart.map((item) => item.product);
        const products = await Product.find({ _id: { $in: productIds } });
        const productMap = new Map(products.map((p) => [p._id.toString(), p]));

        // 4. Verify each product exists and check stock limits
        for (const item of cart) {
            const product = productMap.get(item.product.toString());

            if (!product) {
                return res.status(400).json({
                    success: false,
                    message: "One or more products in your cart are no longer available"
                });
            }

            if (product.stock <= 0) {
                return res.status(400).json({
                    success: false,
                    message: `Product "${product.name}" is out of stock`
                });
            }

            if (item.quantity > product.stock) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for "${product.name}". Only ${product.stock} units available.`
                });
            }
        }

        // 5. Server-side total calculation and snapshot creation
        let totalAmount = 0;
        const snapshotItems = cart.map((item) => {
            const product = productMap.get(item.product.toString());
            const itemSubtotal = product.price * item.quantity;
            totalAmount += itemSubtotal;

            return {
                product: product._id,
                name: product.name,
                price: product.price,
                quantity: item.quantity,
                image: product.image || ""
            };
        });

        // Ensure total is valid
        if (totalAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Invalid order total calculated"
            });
        }

        // 6. Create pending ShopKart order
        const shopKartOrder = new Order({
            user: customer._id,
            items: snapshotItems,
            shippingAddress: {
                fullName: shippingAddress.fullName.trim(),
                phone: shippingAddress.phone.trim(),
                addressLine1: shippingAddress.addressLine1.trim(),
                city: shippingAddress.city.trim(),
                state: shippingAddress.state.trim(),
                pincode: shippingAddress.pincode.trim()
            },
            totalAmount,
            paymentStatus: "PENDING",
            status: "PENDING_PAYMENT"
        });

        await shopKartOrder.save();

        // 7. Verify Razorpay credentials before calling Razorpay API
        if (!razorpayConfig.isRazorpayConfigured()) {
            return res.status(500).json({
                success: false,
                code: "RAZORPAY_NOT_CONFIGURED",
                message: "Razorpay Test Mode credentials are not configured in backend .env. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
            });
        }

        // 8. Create Razorpay order via SDK (amount in paise: ₹1 = 100 paise)
        const amountInPaise = Math.round(totalAmount * 100);
        const razorpay = razorpayConfig.getRazorpayInstance();

        const razorpayOrder = await razorpay.orders.create({
            amount: amountInPaise,
            currency: "INR",
            receipt: shopKartOrder._id.toString()
        });

        // 9. Save razorpayOrderId on the ShopKart order
        shopKartOrder.razorpayOrderId = razorpayOrder.id;
        await shopKartOrder.save();

        // 10. Return safe checkout payload (Key Secret is NEVER returned)
        return res.status(201).json({
            success: true,
            message: "Payment order created successfully",
            shopKartOrderId: shopKartOrder._id,
            razorpayOrderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency || "INR",
            key: process.env.RAZORPAY_KEY_ID.trim()
        });
    } catch (error) {
        console.error("Create payment order error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Failed to create payment order"
        });
    }
};

/**
 * POST /orders/verify-payment
 * 1. Verify all required payment callback fields
 * 2. Find ShopKart order and enforce customer ownership
 * 3. Match razorpayOrderId with stored order ID
 * 4. Verify HMAC-SHA256 signature using RAZORPAY_KEY_SECRET
 * 5. On valid signature:
 *    - Update order: paymentStatus = "PAID", status = "PLACED"
 *    - Save razorpayPaymentId
 *    - Clear customer's cart in MongoDB
 *    - Return confirmed order
 * 6. On invalid signature:
 *    - Mark order FAILED, DO NOT clear cart, return 400
 */
const verifyPayment = async (req, res) => {
    try {
        const {
            shopKartOrderId,
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        if (
            !shopKartOrderId ||
            !razorpay_order_id ||
            !razorpay_payment_id ||
            !razorpay_signature
        ) {
            return res.status(400).json({
                success: false,
                message: "Missing required payment verification details"
            });
        }

        if (!isValidObjectId(shopKartOrderId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID"
            });
        }

        const order = await Order.findById(shopKartOrderId);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        // Ownership enforcement
        if (order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You do not have access to this order"
            });
        }

        // Idempotency: if already verified and paid
        if (order.paymentStatus === "PAID") {
            return res.status(200).json({
                success: true,
                message: "Payment is already verified",
                order
            });
        }

        // Order ID integrity check: must match persisted Razorpay order ID
        if (order.razorpayOrderId !== razorpay_order_id) {
            return res.status(400).json({
                success: false,
                message: "Razorpay order ID mismatch"
            });
        }

        const secret = process.env.RAZORPAY_KEY_SECRET;
        if (!secret) {
            return res.status(500).json({
                success: false,
                message: "Server payment configuration error"
            });
        }

        // Generate expected HMAC-SHA256 signature
        const payload = `${order.razorpayOrderId}|${razorpay_payment_id}`;
        const expectedSignature = crypto
            .createHmac("sha256", secret.trim())
            .update(payload)
            .digest("hex");

        // Safe timing-equal comparison
        const expectedBuffer = Buffer.from(expectedSignature, "utf8");
        const receivedBuffer = Buffer.from(String(razorpay_signature), "utf8");

        const isValid =
            expectedBuffer.length === receivedBuffer.length &&
            crypto.timingSafeEqual(expectedBuffer, receivedBuffer);

        if (!isValid) {
            order.paymentStatus = "FAILED";
            await order.save();

            // Note: Cart is intentionally NOT cleared on payment failure
            return res.status(400).json({
                success: false,
                message: "Invalid payment signature"
            });
        }

        // Payment verification succeeded!
        order.paymentStatus = "PAID";
        order.status = "PLACED";
        order.razorpayPaymentId = razorpay_payment_id;
        await order.save();

        // Clear customer cart only after verified payment
        const customer = await Customer.findById(req.user._id);
        if (customer) {
            customer.cart = [];
            await customer.save();
        }

        return res.status(200).json({
            success: true,
            message: "Payment verified and order placed successfully",
            order
        });
    } catch (error) {
        console.error("Verify payment error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to verify payment"
        });
    }
};

/**
 * GET /orders
 * Retrieves all orders belonging to the authenticated customer, sorted newest first.
 */
const getOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            orders
        });
    } catch (error) {
        console.error("Get orders error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch orders"
        });
    }
};

/**
 * GET /orders/:id
 * Retrieves a single order by ID, enforcing customer ownership.
 */
const getOrderById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID"
            });
        }

        const order = await Order.findById(id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        if (order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You do not have access to this order"
            });
        }

        return res.status(200).json({
            success: true,
            order
        });
    } catch (error) {
        console.error("Get order by ID error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch order details"
        });
    }
};

/**
 * PATCH /orders/:id/status
 * Bonus: Order status progression (PLACED -> CONFIRMED -> SHIPPED -> DELIVERED)
 */
const updateOrderStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!isValidObjectId(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid order ID"
            });
        }

        const allowedStatuses = [
            "PENDING_PAYMENT",
            "PLACED",
            "CONFIRMED",
            "SHIPPED",
            "DELIVERED",
            "CANCELLED"
        ];

        if (!status || !allowedStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: `Status must be one of: ${allowedStatuses.join(", ")}`
            });
        }

        const order = await Order.findById(id);

        if (!order) {
            return res.status(404).json({
                success: false,
                message: "Order not found"
            });
        }

        if (order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: "Forbidden: You do not have access to this order"
            });
        }

        order.status = status;
        await order.save();

        return res.status(200).json({
            success: true,
            message: `Order status updated to ${status}`,
            order
        });
    } catch (error) {
        console.error("Update order status error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to update order status"
        });
    }
};

module.exports = {
    createPaymentOrder,
    verifyPayment,
    getOrders,
    getOrderById,
    updateOrderStatus
};
