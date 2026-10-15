import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

function CartItem({ item }) {
    const { updateQuantity, removeFromCart, pendingItemMap } = useCart();
    const [localError, setLocalError] = useState("");

    const product = item.product;
    if (!product) return null;

    const productId = product._id;
    const quantity = Number(item.quantity) || 1;
    const currentAction = pendingItemMap[productId];
    const isUpdating = currentAction === "updating";
    const isRemoving = currentAction === "removing";
    const isBusy = isUpdating || isRemoving;

    const lineTotal = (Number(product.price) || 0) * quantity;
    const isMinQuantity = quantity <= 1;
    const isMaxQuantity = quantity >= product.stock;

    const handleDecrement = async () => {
        if (isMinQuantity || isBusy) return;
        setLocalError("");
        const res = await updateQuantity(productId, quantity - 1);
        if (!res.success) {
            setLocalError(res.message);
        }
    };

    const handleIncrement = async () => {
        if (isMaxQuantity || isBusy) return;
        setLocalError("");
        const res = await updateQuantity(productId, quantity + 1);
        if (!res.success) {
            setLocalError(res.message);
        }
    };

    const handleRemove = async () => {
        if (isBusy) return;
        setLocalError("");
        const res = await removeFromCart(productId);
        if (!res.success) {
            setLocalError(res.message);
        }
    };

    return (
        <article className="cart-item">
            <div className="cart-item-image-wrapper">
                <img
                    src={product.image}
                    alt={product.name}
                    className="cart-item-image"
                    onError={(event) => {
                        event.currentTarget.src =
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Crect fill='%231a1f2e' width='120' height='120'/%3E%3Ctext fill='%2394a3b8' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='12'%3ENo image%3C/text%3E%3C/svg%3E";
                    }}
                />
            </div>

            <div className="cart-item-details">
                <div className="cart-item-header">
                    <span className="cart-item-category">{product.category}</span>
                    <h3 className="cart-item-title">
                        <Link to={`/products/${productId}`}>{product.name}</Link>
                    </h3>
                </div>

                <div className="cart-item-price-info">
                    <span className="unit-price">₹{product.price.toLocaleString("en-IN")} each</span>
                    <span className="stock-hint">
                        {product.stock > 0
                            ? `${product.stock} in stock`
                            : "Out of stock"}
                    </span>
                </div>

                <div className="cart-item-controls">
                    <div className="quantity-stepper" role="group" aria-label="Quantity controls">
                        <button
                            type="button"
                            className="stepper-btn"
                            onClick={handleDecrement}
                            disabled={isMinQuantity || isBusy}
                            aria-label="Decrease quantity"
                            title={isMinQuantity ? "Quantity cannot be less than 1" : "Decrease quantity"}
                        >
                            −
                        </button>

                        <span className="stepper-value" aria-live="polite">
                            {isUpdating ? "…" : quantity}
                        </span>

                        <button
                            type="button"
                            className="stepper-btn"
                            onClick={handleIncrement}
                            disabled={isMaxQuantity || isBusy}
                            aria-label="Increase quantity"
                            title={isMaxQuantity ? `Maximum available stock (${product.stock})` : "Increase quantity"}
                        >
                            +
                        </button>
                    </div>

                    <button
                        type="button"
                        className="cart-remove-btn"
                        onClick={handleRemove}
                        disabled={isBusy}
                        aria-busy={isRemoving}
                    >
                        {isRemoving ? "Removing…" : "Remove"}
                    </button>
                </div>

                {localError ? (
                    <p className="card-inline-error" role="alert">
                        {localError}
                    </p>
                ) : null}
            </div>

            <div className="cart-item-subtotal">
                <span className="subtotal-label">Subtotal</span>
                <span className="subtotal-amount">₹{lineTotal.toLocaleString("en-IN")}</span>
            </div>
        </article>
    );
}

export default CartItem;
