const bcrypt = require("bcrypt");

const Customer = require("../models/customer.model");
const generateToken = require("../utils/generateToken");

const registerCustomer = async (req, res) => {
    try {
        const {
            fullName,
            email,
            password,
            phone
        } = req.body;

        // 1. Validate required fields
        if (!fullName || !email || !password || !phone) {
            return res.status(400).json({
                success: false,
                message: "All fields are required"
            });
        }

        // 2. Validate password length
        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must contain at least 6 characters"
            });
        }

        // 3. Check if email already exists
        const existingCustomer = await Customer.findOne({
            email
        });

        if (existingCustomer) {
            return res.status(409).json({
                success: false,
                message: "Email already exists"
            });
        }

        // 4. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 5. Create customer
        const customer = await Customer.create({
            fullName,
            email,
            password: hashedPassword,
            phone
        });

        // 6. Send only safe customer information
        return res.status(201).json({
            success: true,
            message: "Customer registered successfully",
            customer: {
                _id: customer._id,
                fullName: customer.fullName,
                email: customer.email,
                phone: customer.phone
            }
        });

    } catch (error) {
        console.error("Registration error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const loginCustomer = async (req, res) => {
    try {
        const {
            email,
            password
        } = req.body;

        if (!email || !password) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        // 1. Find customer by email
        const customer = await Customer.findOne({
            email
        });

        // 2. Do not reveal whether email exists
        if (!customer) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        // 3. Compare entered password with stored bcrypt hash
        const passwordMatch = await bcrypt.compare(
            password,
            customer.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid credentials"
            });
        }

        // 4. Generate JWT
        const token = generateToken(
            customer._id.toString()
        );

        // 5. Store JWT in HttpOnly cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 24 * 60 * 60 * 1000
        });

        // 6. Return customer information without password
        return res.status(200).json({
            success: true,
            message: "Login successful",
            customer: {
                _id: customer._id,
                fullName: customer.fullName,
                email: customer.email,
                phone: customer.phone
            }
        });

    } catch (error) {
        console.error("Login error:", error);

        return res.status(500).json({
            success: false,
            message: "Server error"
        });
    }
};

const getMyProfile = async (req, res) => {
    return res.status(200).json(req.user);
};

const logoutCustomer = async (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax"
    });

    return res.status(200).json({
        success: true,
        message: "Logged out successfully"
    });
};

module.exports = {
    registerCustomer,
    loginCustomer,
    getMyProfile,
    logoutCustomer
};