import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { useCart } from "../context/CartContext";
import api from "../services/api";
import { loadRazorpayScript } from "../utils/loadRazorpay";

function Checkout() {
    const navigate = useNavigate();
    const { cartItems, loading: cartLoading, subtotal, clearCart } = useCart();

    const [formData, setFormData] = useState({
        fullName: "",
        phone: "",
        addressLine1: "",
        city: "",
        state: "",
        pincode: ""
    });

    const [fieldErrors, setFieldErrors] = useState({});
    const [generalError, setGeneralError] = useState(null);
    const [generalNotice, setGeneralNotice] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        if (fieldErrors[name]) {
            setFieldErrors((prev) => {
                const next = { ...prev };
                delete next[name];
                return next;
            });
        }
    };

    const validateForm = () => {
        const errors = {};

        if (!formData.fullName || formData.fullName.trim().length === 0) {
            errors.fullName = "Full name is required";
        }

        if (!formData.phone || formData.phone.trim().length === 0) {
            errors.phone = "Phone number is required";
        } else {
            const cleanPhone = formData.phone.trim().replace(/[\s-]/g, "");
            if (!/^\+?[0-9]{10,13}$/.test(cleanPhone)) {
                errors.phone = "Please enter a valid 10-digit phone number";
            }
        }

        if (!formData.addressLine1 || formData.addressLine1.trim().length === 0) {
            errors.addressLine1 = "Street address is required";
        }

        if (!formData.city || formData.city.trim().length === 0) {
            errors.city = "City is required";
        }

        if (!formData.state || formData.state.trim().length === 0) {
            errors.state = "State is required";
        }

        if (!formData.pincode || formData.pincode.trim().length === 0) {
            errors.pincode = "Pincode is required";
        } else if (!/^[0-9]{6}$/.test(formData.pincode.trim())) {
            errors.pincode = "Pincode must contain exactly 6 digits";
        }

        setFieldErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handlePlaceOrder = async (e) => {
        e.preventDefault();
        setGeneralError(null);
        setGeneralNotice(null);

        // 1. Client-side form validation
        if (!validateForm()) {
            setGeneralError("Please fix the highlighted errors before continuing.");
            return;
        }

        if (cartItems.length === 0) {
            setGeneralError("Your cart is empty. Please add items before checking out.");
            return;
        }

        setIsSubmitting(true);

        try {
            // 2. Ensure Razorpay Checkout script is loaded
            const isScriptLoaded = await loadRazorpayScript();
            if (!isScriptLoaded) {
                setGeneralError(
                    "Unable to load Razorpay payment gateway. Please verify your internet connection and retry."
                );
                setIsSubmitting(false);
                return;
            }

            // 3. Request payment order creation from backend
            const response = await api.post("/orders/create-payment-order", {
                shippingAddress: {
                    fullName: formData.fullName.trim(),
                    phone: formData.phone.trim(),
                    addressLine1: formData.addressLine1.trim(),
                    city: formData.city.trim(),
                    state: formData.state.trim(),
                    pincode: formData.pincode.trim()
                }
            });

            const {
                shopKartOrderId,
                razorpayOrderId,
                amount,
                currency,
                key
            } = response.data;

            // 4. Initialize Razorpay Standard Checkout
            const options = {
                key,
                amount,
                currency: currency || "INR",
                name: "ShopKart",
                description: "Complete your ShopKart order",
                order_id: razorpayOrderId,
                prefill: {
                    name: formData.fullName.trim(),
                    contact: formData.phone.trim()
                },
                theme: {
                    color: "#3b82f6"
                },
                handler: async function (paymentResponse) {
                    setIsSubmitting(true);
                    setGeneralNotice("Verifying payment with ShopKart server...");

                    try {
                        // 5. Mandatory backend payment signature verification
                        const verifyRes = await api.post("/orders/verify-payment", {
                            shopKartOrderId,
                            razorpay_order_id: paymentResponse.razorpay_order_id,
                            razorpay_payment_id: paymentResponse.razorpay_payment_id,
                            razorpay_signature: paymentResponse.razorpay_signature
                        });

                        if (verifyRes.data.success) {
                            // 6. Reset global cart state and navigate to confirmation
                            clearCart();
                            navigate(`/order-success/${shopKartOrderId}`, {
                                state: { order: verifyRes.data.order }
                            });
                        } else {
                            setGeneralError(
                                verifyRes.data.message || "Payment verification failed."
                            );
                            setIsSubmitting(false);
                        }
                    } catch (verifyErr) {
                        console.error("Verification error:", verifyErr);
                        setGeneralError(
                            verifyErr.response?.data?.message ||
                            "Payment verification failed on the server. Your cart is preserved."
                        );
                        setIsSubmitting(false);
                    }
                },
                modal: {
                    ondismiss: function () {
                        setIsSubmitting(false);
                        setGeneralNotice(
                            "Payment was cancelled. Your cart items have been preserved."
                        );
                    }
                }
            };

            const rzp = new window.Razorpay(options);

            rzp.on("payment.failed", function (failResponse) {
                console.error("Payment failed:", failResponse.error);
                setIsSubmitting(false);
                setGeneralError(
                    `Payment failed: ${failResponse.error?.description || "Transaction declined"}. Your cart has been preserved.`
                );
            });

            rzp.open();
        } catch (err) {
            console.error("Create payment order error:", err);
            const message =
                err.response?.data?.message ||
                "Failed to initiate order. Please try again.";
            setGeneralError(message);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="app-shell">
            <Navbar />

            <main className="checkout-page">
                <header className="page-header">
                    <p className="eyebrow">Secure Checkout</p>
                    <h1>Shipping & Payment</h1>
                    <p className="page-subtitle">
                        Enter your delivery details and complete payment in Razorpay Test Mode.
                    </p>
                </header>

                {cartLoading ? (
                    <div className="status-panel" aria-live="polite">
                        <p className="status-loading-text">Loading checkout details...</p>
                    </div>
                ) : cartItems.length === 0 ? (
                    <div className="status-panel status-panel-empty">
                        <span className="empty-icon" aria-hidden="true">
                            🛒
                        </span>
                        <h2>Your cart is empty</h2>
                        <p>You need items in your cart before you can checkout.</p>
                        <Link to="/products" className="primary-button inline">
                            Browse Products
                        </Link>
                    </div>
                ) : (
                    <div className="checkout-layout">
                        {/* Left column: Shipping Details Form */}
                        <section className="checkout-form-section" aria-label="Shipping Address">
                            <div className="checkout-card">
                                <h2>Shipping Address</h2>
                                <p className="card-hint">
                                    Please provide accurate details for delivery.
                                </p>

                                {generalError ? (
                                    <div className="alert-box alert-error" role="alert">
                                        <span>⚠️</span>
                                        <p>{generalError}</p>
                                    </div>
                                ) : null}

                                {generalNotice ? (
                                    <div className="alert-box alert-info" role="status">
                                        <span>ℹ️</span>
                                        <p>{generalNotice}</p>
                                    </div>
                                ) : null}

                                <form onSubmit={handlePlaceOrder} noValidate>
                                    <div className="form-grid">
                                        <div className="form-group full-width">
                                            <label htmlFor="fullName">
                                                Full Name <span className="req">*</span>
                                            </label>
                                            <input
                                                id="fullName"
                                                name="fullName"
                                                type="text"
                                                placeholder="e.g. Aarav Sharma"
                                                value={formData.fullName}
                                                onChange={handleChange}
                                                disabled={isSubmitting}
                                                className={fieldErrors.fullName ? "input-error" : ""}
                                            />
                                            {fieldErrors.fullName ? (
                                                <span className="field-error-text">
                                                    {fieldErrors.fullName}
                                                </span>
                                            ) : null}
                                        </div>

                                        <div className="form-group full-width">
                                            <label htmlFor="phone">
                                                Phone Number <span className="req">*</span>
                                            </label>
                                            <input
                                                id="phone"
                                                name="phone"
                                                type="tel"
                                                placeholder="e.g. 9876543210"
                                                value={formData.phone}
                                                onChange={handleChange}
                                                disabled={isSubmitting}
                                                className={fieldErrors.phone ? "input-error" : ""}
                                            />
                                            {fieldErrors.phone ? (
                                                <span className="field-error-text">
                                                    {fieldErrors.phone}
                                                </span>
                                            ) : null}
                                        </div>

                                        <div className="form-group full-width">
                                            <label htmlFor="addressLine1">
                                                Address Line 1 <span className="req">*</span>
                                            </label>
                                            <input
                                                id="addressLine1"
                                                name="addressLine1"
                                                type="text"
                                                placeholder="Flat / House No., Street, Area"
                                                value={formData.addressLine1}
                                                onChange={handleChange}
                                                disabled={isSubmitting}
                                                className={fieldErrors.addressLine1 ? "input-error" : ""}
                                            />
                                            {fieldErrors.addressLine1 ? (
                                                <span className="field-error-text">
                                                    {fieldErrors.addressLine1}
                                                </span>
                                            ) : null}
                                        </div>

                                        <div className="form-group half-width">
                                            <label htmlFor="city">
                                                City <span className="req">*</span>
                                            </label>
                                            <input
                                                id="city"
                                                name="city"
                                                type="text"
                                                placeholder="e.g. Bengaluru"
                                                value={formData.city}
                                                onChange={handleChange}
                                                disabled={isSubmitting}
                                                className={fieldErrors.city ? "input-error" : ""}
                                            />
                                            {fieldErrors.city ? (
                                                <span className="field-error-text">
                                                    {fieldErrors.city}
                                                </span>
                                            ) : null}
                                        </div>

                                        <div className="form-group half-width">
                                            <label htmlFor="state">
                                                State <span className="req">*</span>
                                            </label>
                                            <input
                                                id="state"
                                                name="state"
                                                type="text"
                                                placeholder="e.g. Karnataka"
                                                value={formData.state}
                                                onChange={handleChange}
                                                disabled={isSubmitting}
                                                className={fieldErrors.state ? "input-error" : ""}
                                            />
                                            {fieldErrors.state ? (
                                                <span className="field-error-text">
                                                    {fieldErrors.state}
                                                </span>
                                            ) : null}
                                        </div>

                                        <div className="form-group full-width">
                                            <label htmlFor="pincode">
                                                Pincode (6 Digits) <span className="req">*</span>
                                            </label>
                                            <input
                                                id="pincode"
                                                name="pincode"
                                                type="text"
                                                maxLength="6"
                                                placeholder="e.g. 560001"
                                                value={formData.pincode}
                                                onChange={handleChange}
                                                disabled={isSubmitting}
                                                className={fieldErrors.pincode ? "input-error" : ""}
                                            />
                                            {fieldErrors.pincode ? (
                                                <span className="field-error-text">
                                                    {fieldErrors.pincode}
                                                </span>
                                            ) : null}
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </section>

                        {/* Right column: Order Summary & Action */}
                        <aside className="checkout-summary-section" aria-label="Order Review">
                            <div className="order-summary-card">
                                <h2>Order Summary</h2>
                                <p className="card-hint">
                                    {cartItems.length} product{cartItems.length === 1 ? "" : "s"} in cart
                                </p>

                                <div className="checkout-items-list">
                                    {cartItems.map((item) => (
                                        <div
                                            key={item.product?._id || item._id}
                                            className="checkout-item-row"
                                        >
                                            <div className="checkout-item-details">
                                                <span className="checkout-item-name">
                                                    {item.product?.name || "Product"}
                                                </span>
                                                <span className="checkout-item-qty">
                                                    Qty: {item.quantity} × ₹
                                                    {Number(item.product?.price || 0).toLocaleString("en-IN")}
                                                </span>
                                            </div>
                                            <span className="checkout-item-price">
                                                ₹
                                                {(
                                                    Number(item.product?.price || 0) * item.quantity
                                                ).toLocaleString("en-IN")}
                                            </span>
                                        </div>
                                    ))}
                                </div>

                                <hr className="summary-divider" />

                                <div className="summary-row">
                                    <span className="summary-label">Subtotal</span>
                                    <span className="summary-value">
                                        ₹{subtotal.toLocaleString("en-IN")}
                                    </span>
                                </div>

                                <div className="summary-row">
                                    <span className="summary-label">Delivery</span>
                                    <span className="summary-value text-success">FREE</span>
                                </div>

                                <div className="summary-row">
                                    <span className="summary-label">Payment Mode</span>
                                    <span className="summary-value payment-badge">
                                        Razorpay Test Mode
                                    </span>
                                </div>

                                <hr className="summary-divider" />

                                <div className="summary-row summary-total-row">
                                    <span className="summary-total-label">Total Payable</span>
                                    <span className="summary-total-value">
                                        ₹{subtotal.toLocaleString("en-IN")}
                                    </span>
                                </div>

                                <button
                                    type="button"
                                    className="checkout-btn place-order-btn"
                                    onClick={handlePlaceOrder}
                                    disabled={isSubmitting}
                                    id="place-order-button"
                                >
                                    {isSubmitting ? (
                                        <span className="btn-spinner-content">
                                            <span className="spinner" aria-hidden="true" />
                                            Processing Payment...
                                        </span>
                                    ) : (
                                        `Pay ₹${subtotal.toLocaleString("en-IN")} with Razorpay`
                                    )}
                                </button>

                                <div className="summary-footer-links">
                                    <Link to="/cart" className="continue-shopping-link">
                                        ← Back to Cart
                                    </Link>
                                </div>
                            </div>
                        </aside>
                    </div>
                )}
            </main>
        </div>
    );
}

export default Checkout;
