
import { useEffect, useState } from "react";
import api from "../services/api";
import Navbar from "../components/Navbar";
import ProductCard from "../components/ProductCard";
import SearchBar from "../components/SearchBar";

function Products() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [search, setSearch] = useState("");
    const [category, setCategory] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function fetchProducts() {
            setLoading(true);
            setError("");

            try {
                const response = await api.get("/products", {
                    params: {
                        search: search || undefined,
                        category: category || undefined
                    }
                });

                const fetchedProducts = response.data.products;

                setProducts(fetchedProducts);

                // Store all available categories on the initial,
                // unfiltered request.
                if (!search && !category) {
                    const uniqueCategories = [
                        ...new Set(
                            fetchedProducts.map(
                                (product) => product.category
                            )
                        )
                    ];

                    setCategories(uniqueCategories);
                }
            } catch (err) {
                setError(
                    err.response?.data?.message ||
                    "Failed to load products. Please try again."
                );
            } finally {
                setLoading(false);
            }
        }

        fetchProducts();
    }, [search, category]);

    return (
        <div className="app-shell">
            <Navbar />

            <main className="products-container">
                <header className="page-header">
                    <p className="eyebrow">Catalogue</p>
                    <h1>Our Products</h1>
                </header>

                <SearchBar
                    search={search}
                    onSearchChange={setSearch}
                    category={category}
                    onCategoryChange={setCategory}
                    categories={categories}
                />

                {loading ? (
                    <p>Loading products...</p>
                ) : error ? (
                    <p className="error-message">{error}</p>
                ) : products.length === 0 ? (
                    <p>No products found.</p>
                ) : (
                    <>
                        <p>
                            {products.length} product(s) found
                        </p>

                        <div className="products-grid">
                            {products.map((product) => (
                                <ProductCard
                                    key={product._id}
                                    product={product}
                                />
                            ))}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

export default Products;
