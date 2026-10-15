
function SearchBar({
    search,
    onSearchChange,
    category,
    onCategoryChange,
    categories
}) {
    return (
        <div className="search-bar">
            <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(event) =>
                    onSearchChange(event.target.value)
                }
            />

            <select
                value={category}
                onChange={(event) =>
                    onCategoryChange(event.target.value)
                }
            >
                <option value="">All Categories</option>

                {categories.map((item) => (
                    <option key={item} value={item}>
                        {item}
                    </option>
                ))}
            </select>
        </div>
    );
}

export default SearchBar;
