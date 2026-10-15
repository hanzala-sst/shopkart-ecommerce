
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../services/api";
import Navbar from "../components/Navbar";
import { useCart } from "../context/CartContext";

function ProductDetails() {
    const { id } = useParams();
    const { addToCart, pendingItemMap, isItemInCart, getItemQuantity } = useCart();

    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [cartFeedback, setCartFeedback] = useState("");

    useEffect(() => {
        async function fetchProduct() {
            setLoading(true);
            setError("");

            try {
                const response = await api.get(`/products/${id}`);
                setProduct(response.data.product);
            } catch (err) {
                setError(
                    err.response?.data?.message ||
                    "Failed to load product details."
                );
            } finally {
                setLoading(false);
            }
        }

        fetchProduct();
    }, [id]);

    const isAdding = pendingItemMap[id] === "adding";
    const inCart = isItemInCart(id);
    const quantityInCart = getItemQuantity(id);
    const isOutOfStock = product ? product.stock <= 0 : false;
    const isAtMaxStock = product && inCart && quantityInCart >= product.stock;

    const handleAddToCart = async () => {
        if (!product || isAdding || isOutOfStock || isAtMaxStock) return;
        setCartFeedback("");
        const result = await addToCart(product._id);
        if (result.success) {
            setCartFeedback("✓ Added to Cart!");
        } else {
            setCartFeedback(result.message || "Failed to add to cart.");
        }
    };

    return (
        <div className="app-shell">
            <Navbar />

            <main className="product-details-container">
                {loading ? (
                    <p className="status-panel">Loading product details...</p>
                ) : error ? (
                    <p className="status-panel status-panel-error">{error}</p>
                ) : product ? (
                    <div className="product-details">
                        <img
                            src={product.image}
                            alt={product.name}
                            className="product-details-image"
                            onError={(event) => {
                                event.currentTarget.src =
                                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400' viewBox='0 0 400 400'%3E%3Crect fill='%231a1f2e' width='400' height='400'/%3E%3Ctext fill='%2394a3b8' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='16'%3ENo image available%3C/text%3E%3C/svg%3E";
                            }}
                        />

                        <div className="product-details-info">
                            <p className="product-category">
                                {product.category}
                            </p>

                            <h1>{product.name}</h1>

                            <p>{product.description}</p>

                            <h2>
                                ₹{product.price.toLocaleString("en-IN")}
                            </h2>

                            <p className={product.stock > 0 ? "in-stock" : "out-of-stock"}>
                                {product.stock > 0
                                    ? `${product.stock} units available`
                                    : "Out of stock"}
                            </p>

                            <button
                                type="button"
                                className="primary-button"
                                disabled={isOutOfStock || isAdding || isAtMaxStock}
                                onClick={handleAddToCart}
                            >
                                {isOutOfStock
                                    ? "Out of Stock"
                                    : isAdding
                                        ? "⏳ Adding to Cart..."
                                        : isAtMaxStock
                                            ? `Max Quantity in Cart (${quantityInCart})`
                                            : inCart
                                                ? `Add Another to Cart (${quantityInCart})`
                                                : "Add to Cart"}
                            </button>

                            {cartFeedback ? (
                                <p className="card-inline-feedback" role="alert">
                                    {cartFeedback}
                                </p>
                            ) : null}
                        </div>
                    </div>
                ) : (
                    <p className="status-panel">Product not found.</p>
                )}
            </main>
        </div>
    );
}

export default ProductDetails;
