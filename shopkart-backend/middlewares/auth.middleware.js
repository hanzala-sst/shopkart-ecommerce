const jwt = require("jsonwebtoken");

const Customer = require("../models/customer.model");

const authMiddleware = async (req, res, next) => {
    try {
        // 1. Read JWT from HttpOnly cookie (browser) or Bearer header (Postman)
        let token = req.cookies.token;

        if (
            !token &&
            req.headers.authorization?.startsWith("Bearer ")
        ) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        // 2. Verify JWT
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // 3. Find customer from JWT customerId
        const customer = await Customer
            .findById(decoded.customerId)
            .select("-password");

        // 4. Customer may no longer exist
        if (!customer) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized"
            });
        }

        // 5. Attach customer to request
        req.user = customer;

        // 6. Continue to next handler
        next();

    } catch (error) {
        return res.status(401).json({
            success: false,
            message: "Unauthorized"
        });
    }
};

module.exports = authMiddleware;