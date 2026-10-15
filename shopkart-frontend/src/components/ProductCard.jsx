import { useState } from "react";
import { Link } from "react-router-dom";

import api from "../services/api";
import { useCart } from "../context/CartContext";

function ProductCard({ product }) {
    const { addToCart, pendingItemMap, isItemInCart, getItemQuantity } = useCart();
    const [wishlistState, setWishlistState] = useState("idle");
    const [wishlistMessage, setWishlistMessage] = useState("");
    const [cartMessage, setCartMessage] = useState("");

    const isAddingToCart = pendingItemMap[product._id] === "adding";
    const inCart = isItemInCart(product._id);
    const quantityInCart = getItemQuantity(product._id);
    const isOutOfStock = product.stock <= 0;
    const isAtMaxStock = inCart && quantityInCart >= product.stock;

    const handleAddToWishlist = async () => {
        if (wishlistState === "saving") {
            return;
        }

        setWishlistState("saving");
        setWishlistMessage("");

        try {
            await api.post(`/wishlist/${product._id}`);
            setWishlistState("success");
            setWishlistMessage("♥ Added to Wishlist");
        } catch (err) {
            setWishlistState("error");

            const status = err.response?.status;
            const serverMessage = err.response?.data?.message;

            if (status === 401) {
                setWishlistMessage(
                    "Please log in to save products to your wishlist."
                );
            } else if (status === 409) {
                setWishlistState("success");
                setWishlistMessage("♥ Already in your wishlist");
            } else {
                setWishlistMessage(
                    serverMessage ||
                    "Unable to save product. Please try again."
                );
            }
        }
    };

    const handleAddToCart = async () => {
        if (isAddingToCart || isOutOfStock || isAtMaxStock) {
            return;
        }

        setCartMessage("");
        const result = await addToCart(product._id);

        if (!result.success) {
            if (result.status === 401) {
                setCartMessage("Please log in to add items to your cart.");
            } else {
                setCartMessage(result.message || "Failed to add to cart.");
            }
        }
    };

    return (
        <article className="product-card">
            <div className="product-image-container">
                <img
                    src={product.image}
                    alt={product.name}
                    className="product-image"
                    onError={(event) => {
                        event.currentTarget.src =
                            "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect fill='%231a1f2e' width='200' height='200'/%3E%3Ctext fill='%2394a3b8' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='14'%3ENo image%3C/text%3E%3C/svg%3E";
                    }}
                />
            </div>

            <div className="product-card-content">
                <span className="product-category">{product.category}</span>

                <h2>{product.name}</h2>

                <p className="product-price">
                    ₹{product.price.toLocaleString("en-IN")}
                </p>

                <p
                    className={
                        product.stock > 0
                            ? "stock-status in-stock"
                            : "stock-status out-of-stock"
                    }
                >
                    {product.stock > 0
                        ? `${product.stock} units left`
                        : "Out of stock"}
                </p>

                <div className="product-card-actions">
                    <button
                        type="button"
                        className="add-to-cart-button"
                        onClick={handleAddToCart}
                        disabled={isAddingToCart || isOutOfStock || isAtMaxStock}
                        aria-busy={isAddingToCart}
                    >
                        {isOutOfStock
                            ? "Out of Stock"
                            : isAddingToCart
                                ? "⏳ Adding..."
                                : isAtMaxStock
                                    ? `Max in Cart (${quantityInCart})`
                                    : inCart
                                        ? `Add Another (${quantityInCart})`
                                        : "Add to Cart"}
                    </button>

                    <div className="secondary-actions">
                        <Link
                            to={`/products/${product._id}`}
                            className="details-button"
                        >
                            View Details
                        </Link>

                        <button
                            type="button"
                            className="wishlist-button"
                            onClick={handleAddToWishlist}
                            disabled={wishlistState === "saving"}
                            aria-busy={wishlistState === "saving"}
                            title="Add to Wishlist"
                        >
                            {wishlistState === "saving"
                                ? "⏳"
                                : wishlistState === "success"
                                    ? "♥ Saved"
                                    : "♡ Save"}
                        </button>
                    </div>
                </div>

                {cartMessage ? (
                    <p className="card-inline-error" role="alert">
                        {cartMessage}
                    </p>
                ) : null}

                {wishlistState === "error" && wishlistMessage ? (
                    <p className="card-inline-error" role="alert">
                        {wishlistMessage}
                    </p>
                ) : null}
            </div>
        </article>
    );
}

export default ProductCard;
