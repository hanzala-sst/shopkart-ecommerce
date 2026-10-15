import { Link, useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import CartItem from "../components/CartItem";
import { useCart } from "../context/CartContext";

function Cart() {
    const navigate = useNavigate();
    const { cartItems, loading, error, totalItems, subtotal, fetchCart } = useCart();

    const handleProceedToCheckout = () => {
        navigate("/checkout");
    };

    return (
        <div className="app-shell">
            <Navbar />

            <main className="cart-page">
                <header className="page-header">
                    <p className="eyebrow">Ready for purchase</p>
                    <h1>My Cart</h1>
                    {!loading && !error && cartItems.length > 0 ? (
                        <p className="page-subtitle">
                            {totalItems} unit{totalItems === 1 ? "" : "s"} across {cartItems.length} product{cartItems.length === 1 ? "" : "s"}
                        </p>
                    ) : null}
                </header>

                {loading ? (
                    <div className="status-panel" aria-live="polite">
                        <p className="status-loading-text">Loading your cart...</p>
                    </div>
                ) : error ? (
                    <div className="status-panel status-panel-error" role="alert">
                        <h2>Unable to load your cart.</h2>
                        <p>{error}</p>
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={fetchCart}
                        >
                            Try Again
                        </button>
                    </div>
                ) : cartItems.length === 0 ? (
                    <div className="status-panel status-panel-empty">
                        <span className="empty-icon" aria-hidden="true">
                            🛒
                        </span>
                        <h2>Your cart is empty 🛒</h2>
                        <p>Looks like you haven&apos;t added anything yet.</p>
                        <Link to="/products" className="primary-button inline">
                            Browse Products
                        </Link>
                    </div>
                ) : (
                    <div className="cart-layout">
                        <section className="cart-items-section" aria-label="Cart items list">
                            {cartItems.map((item) => (
                                <CartItem key={item.product?._id || item._id} item={item} />
                            ))}
                        </section>

                        <aside className="cart-summary-section" aria-label="Order summary">
                            <div className="order-summary-card">
                                <h2>Order Summary</h2>

                                <div className="summary-row">
                                    <span className="summary-label">Total Units</span>
                                    <span className="summary-value">{totalItems}</span>
                                </div>

                                <div className="summary-row">
                                    <span className="summary-label">Items Count</span>
                                    <span className="summary-value">{cartItems.length}</span>
                                </div>

                                <div className="summary-row">
                                    <span className="summary-label">Subtotal</span>
                                    <span className="summary-value">₹{subtotal.toLocaleString("en-IN")}</span>
                                </div>

                                <div className="summary-row">
                                    <span className="summary-label">Shipping</span>
                                    <span className="summary-value text-success">FREE</span>
                                </div>

                                <hr className="summary-divider" />

                                <div className="summary-row summary-total-row">
                                    <span className="summary-total-label">Estimated Total</span>
                                    <span className="summary-total-value">₹{subtotal.toLocaleString("en-IN")}</span>
                                </div>

                                <button
                                    type="button"
                                    className="checkout-btn"
                                    onClick={handleProceedToCheckout}
                                    id="proceed-to-checkout-button"
                                >
                                    Proceed to Checkout
                                </button>

                                <div className="summary-footer-links">
                                    <Link to="/products" className="continue-shopping-link">
                                        ← Continue Shopping
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

export default Cart;
