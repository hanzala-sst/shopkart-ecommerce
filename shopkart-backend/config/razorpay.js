const Razorpay = require("razorpay");

/**
 * Checks whether Razorpay credentials are set in environment variables.
 * @returns {boolean}
 */
const isRazorpayConfigured = () => {
    return Boolean(
        process.env.RAZORPAY_KEY_ID &&
        process.env.RAZORPAY_KEY_SECRET &&
        process.env.RAZORPAY_KEY_ID.trim().length > 0 &&
        process.env.RAZORPAY_KEY_SECRET.trim().length > 0
    );
};

/**
 * Returns a configured Razorpay instance or throws a descriptive error.
 * @returns {Razorpay}
 */
const getRazorpayInstance = () => {
    if (!isRazorpayConfigured()) {
        const error = new Error(
            "Razorpay Test Mode credentials are not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in shopkart-backend/.env"
        );
        error.code = "RAZORPAY_NOT_CONFIGURED";
        throw error;
    }

    return new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID.trim(),
        key_secret: process.env.RAZORPAY_KEY_SECRET.trim()
    });
};

module.exports = {
    isRazorpayConfigured,
    getRazorpayInstance
};
