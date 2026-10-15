import { useState } from "react";
import { Link } from "react-router-dom";

import api from "../services/api";

function WishlistCard({ product, onRemoved }) {
    const [removing, setRemoving] = useState(false);
    const [removeError, setRemoveError] = useState("");

    const handleRemove = async () => {
        setRemoving(true);
        setRemoveError("");

        try {
            await api.delete(`/wishlist/${product._id}`);
            onRemoved(product._id);
        } catch (err) {
            setRemoveError(
                err.response?.data?.message ||
                "Unable to remove product. Please try again."
            );
        } finally {
            setRemoving(false);
        }
    };

    return (
        <article className="wishlist-card">
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

            <div className="wishlist-card-content">
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

                <div className="wishlist-card-actions">
                    <Link
                        to={`/products/${product._id}`}
                        className="details-button"
                    >
                        View Details
                    </Link>

                    <button
                        type="button"
                        className="wishlist-remove-button"
                        onClick={handleRemove}
                        disabled={removing}
                        aria-busy={removing}
                    >
                        {removing ? "Removing..." : "Remove ♥"}
                    </button>
                </div>

                {removeError ? (
                    <p className="card-inline-error" role="alert">
                        {removeError}
                    </p>
                ) : null}
            </div>
        </article>
    );
}

export default WishlistCard;
