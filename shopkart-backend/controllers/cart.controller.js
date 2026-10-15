const mongoose = require("mongoose");

const Customer = require("../models/customer.model");
const Product = require("../models/product.model");

const isValidProductId = (productId) => {
    if (!mongoose.Types.ObjectId.isValid(productId)) {
        return false;
    }

    return String(new mongoose.Types.ObjectId(productId)) === productId;
};

// POST /cart/:productId - Add product to cart (or increment quantity if already present)
const addToCart = async (req, res) => {
    try {
        const { productId } = req.params;

        if (!isValidProductId(productId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID"
            });
        }

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        const customer = await Customer.findById(req.user._id);

        if (!customer) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        if (!customer.cart) {
            customer.cart = [];
        }

        const existingItem = customer.cart.find(
            (item) => item.product.toString() === productId
        );

        const currentQuantity = existingItem ? existingItem.quantity : 0;
        const targetQuantity = currentQuantity + 1;

        if (targetQuantity > product.stock) {
            return res.status(400).json({
                success: false,
                message: product.stock <= 0
                    ? "Product is out of stock"
                    : `Cannot add more. Only ${product.stock} units available in stock.`
            });
        }

        if (existingItem) {
            existingItem.quantity = targetQuantity;
        } else {
            customer.cart.push({
                product: productId,
                quantity: 1
            });
        }

        await customer.save();

        await customer.populate({
            path: "cart.product",
            select: "name price category image stock description"
        });

        const validCart = (customer.cart || []).filter(
            (item) => item.product != null
        );

        return res.status(200).json({
            success: true,
            message: "Cart updated",
            cart: validCart
        });
    } catch (error) {
        console.error("Add to cart error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// GET /cart - Retrieve authenticated customer's cart with populated product data
const getCart = async (req, res) => {
    try {
        const customer = await Customer.findById(req.user._id).populate({
            path: "cart.product",
            select: "name price category image stock description"
        });

        if (!customer) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        const validCart = (customer.cart || []).filter(
            (item) => item.product != null
        );

        return res.status(200).json({
            success: true,
            cart: validCart
        });
    } catch (error) {
        console.error("Get cart error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// PATCH /cart/:productId - Update item quantity in cart
const updateCartItemQuantity = async (req, res) => {
    try {
        const { productId } = req.params;
        const { quantity } = req.body;

        if (!isValidProductId(productId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID"
            });
        }

        if (
            quantity === undefined ||
            quantity === null ||
            typeof quantity !== "number" ||
            isNaN(quantity) ||
            !Number.isInteger(quantity) ||
            quantity < 1
        ) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be an integer and at least 1"
            });
        }

        const product = await Product.findById(productId);

        if (!product) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        const customer = await Customer.findById(req.user._id);

        if (!customer) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        if (!customer.cart) {
            customer.cart = [];
        }

        const existingItem = customer.cart.find(
            (item) => item.product.toString() === productId
        );

        if (!existingItem) {
            return res.status(404).json({
                success: false,
                message: "Product not in cart"
            });
        }

        if (quantity > product.stock) {
            return res.status(400).json({
                success: false,
                message: `Requested quantity exceeds available stock (${product.stock} available)`
            });
        }

        existingItem.quantity = quantity;
        await customer.save();

        await customer.populate({
            path: "cart.product",
            select: "name price category image stock description"
        });

        const validCart = (customer.cart || []).filter(
            (item) => item.product != null
        );

        return res.status(200).json({
            success: true,
            message: "Cart updated",
            cart: validCart
        });
    } catch (error) {
        console.error("Update cart error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

// DELETE /cart/:productId - Remove item from cart
const removeFromCart = async (req, res) => {
    try {
        const { productId } = req.params;

        if (!isValidProductId(productId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID"
            });
        }

        const customer = await Customer.findById(req.user._id);

        if (!customer) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        if (!customer.cart) {
            customer.cart = [];
        }

        const isInCart = customer.cart.some(
            (item) => item.product.toString() === productId
        );

        if (!isInCart) {
            return res.status(404).json({
                success: false,
                message: "Product not in cart"
            });
        }

        customer.cart = customer.cart.filter(
            (item) => item.product.toString() !== productId
        );

        await customer.save();

        await customer.populate({
            path: "cart.product",
            select: "name price category image stock description"
        });

        const validCart = (customer.cart || []).filter(
            (item) => item.product != null
        );

        return res.status(200).json({
            success: true,
            message: "Product removed from cart",
            cart: validCart
        });
    } catch (error) {
        console.error("Remove from cart error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

module.exports = {
    addToCart,
    getCart,
    updateCartItemQuantity,
    removeFromCart
};
