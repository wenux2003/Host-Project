import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Search, Filter, Edit, Trash2 } from 'lucide-react';

export default function ListProducts() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [loading, setLoading] = useState(true);
    const [editingProduct, setEditingProduct] = useState(null);
    // Image editing state
    const [imageEditingId, setImageEditingId] = useState(null);
    const [imagePreviewById, setImagePreviewById] = useState({});
    const [imageFileById, setImageFileById] = useState({});
    const fileInputRef = useRef(null);

    const fetchProducts = async () => {
        try {
            setLoading(true);
            let url = `http://localhost:5000/api/products/search?query=${searchQuery}&category=${selectedCategory}`;
            const { data } = await axios.get(url);
            setProducts(data.products || data);
        } catch (err) {
            console.error('Error fetching products:', err);
        } finally {
            setLoading(false);
        }
    };
    
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const { data } = await axios.get('http://localhost:5000/api/products/categories');
                setCategories(data);
            } catch (err) {
                console.error('Error fetching categories:', err);
            }
        };
        fetchCategories();
    }, []);

    useEffect(() => {
        const handler = setTimeout(() => fetchProducts(), 300); // Debounce search
        return () => clearTimeout(handler);
    }, [searchQuery, selectedCategory]);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this product?')) {
            try {
                const userInfo = JSON.parse(localStorage.getItem('userInfo'));
                await axios.delete(`http://localhost:5000/api/products/${id}`, {
                    headers: { Authorization: `Bearer ${userInfo.token}` },
                });
                fetchProducts();
            } catch (err) {
                alert('Error deleting product: ' + (err.response?.data?.message || err.message));
            }
        }
    };
    
    const handleEdit = (product) => {
        setEditingProduct(product);
    };

    const handleSaveEdit = async () => {
        if (!editingProduct) return;
        
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const { data } = await axios.put(
                `http://localhost:5000/api/products/${editingProduct._id}`,
                editingProduct,
                {
                    headers: { Authorization: `Bearer ${userInfo.token}` }
                }
            );
            
            setProducts(products.map(p => p._id === editingProduct._id ? data : p));
            setEditingProduct(null);
        } catch (err) {
            alert('Error updating product: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleCancelEdit = () => {
        setEditingProduct(null);
    };

    const handleEditChange = (field, value) => {
        setEditingProduct(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // --- Image Edit Handlers ---
    const startImageEdit = (productId) => {
        setImageEditingId(productId);
        // Clear any previous selection for this product
        setImagePreviewById(prev => ({ ...prev, [productId]: null }));
        setImageFileById(prev => ({ ...prev, [productId]: null }));
    };

    const cancelImageEdit = (productId) => {
        setImageEditingId(current => (current === productId ? null : current));
        setImagePreviewById(prev => ({ ...prev, [productId]: null }));
        setImageFileById(prev => ({ ...prev, [productId]: null }));
    };

    const onPickImage = (productId) => {
        // Trigger hidden file input
        if (fileInputRef.current) {
            // Attach a temporary marker for which product to assign to
            fileInputRef.current.dataset.productId = productId;
            fileInputRef.current.click();
        }
    };

    const onImageFileChange = (e) => {
        const files = e.target.files || [];
        if (!files.length) return;
        const file = files[0];
        const productId = e.target.dataset.productId;
        if (!productId) return;

        // Validate type
        if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
            alert('Only JPG or PNG images are allowed.');
            e.target.value = '';
            return;
        }

        const reader = new FileReader();
        reader.onload = (ev) => {
            setImagePreviewById(prev => ({ ...prev, [productId]: ev.target.result }));
            setImageFileById(prev => ({ ...prev, [productId]: file }));
        };
        reader.readAsDataURL(file);
        // Reset input so the same file can be re-selected if needed
        e.target.value = '';
    };

    const saveImage = async (product) => {
        const file = imageFileById[product._id];
        if (!file) {
            alert('Please select an image first.');
            return;
        }
        try {
            const userInfo = JSON.parse(localStorage.getItem('userInfo'));
            const formData = new FormData();
            formData.append('image', file);
            // Do not include other fields to avoid modifying them

            const { data } = await axios.put(
                `http://localhost:5000/api/products/${product._id}`,
                formData,
                {
                    headers: { Authorization: `Bearer ${userInfo.token}` }
                }
            );

            // Update local products list with new image_url immediately
            setProducts(prev => prev.map(p => p._id === product._id ? { ...p, image_url: data.image_url } : p));
            cancelImageEdit(product._id);
        } catch (err) {
            alert('Error updating product image: ' + (err.response?.data?.message || err.message));
        }
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-lg">
            <h1 className="text-3xl font-bold text-[#072679] mb-6">Product List</h1>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input type="text" placeholder="Search by name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg"/>
                </div>
                <div className="flex items-center gap-2">
                    <Filter className="text-gray-400 w-5 h-5" />
                    <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="border rounded-lg px-4 py-2">
                        <option value="">All Categories</option>
                        {categories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50 border-b">
                            <th className="p-4">Image</th>
                            <th className="p-4">Name</th>
                            <th className="p-4">Stock</th>
                            <th className="p-4">Category</th>
                            <th className="p-4">Price</th>
                            <th className="p-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" className="p-8 text-center text-gray-500">Loading products...</td></tr>
                        ) : products.length === 0 ? (
                            <tr><td colSpan="6" className="p-8 text-center text-gray-500">No products found.</td></tr>
                        ) : (
                            products.map((product) => (
                                <tr key={product._id} className="border-b hover:bg-gray-50">
                                    <td className="p-4">
                                        <div className="flex items-center gap-3">
                                        <img 
                                                src={(imageEditingId === product._id && imagePreviewById[product._id]) || product.image_url || 'https://placehold.co/64'} 
                                            alt={product.name} 
                                                className="w-16 h-16 object-cover rounded-md border" 
                                            onError={(e) => {
                                                console.error(`Image failed to load for product: ${product.name}`);
                                                console.error(`Image URL: ${product.image_url}`);
                                                e.target.src = 'https://placehold.co/64';
                                            }}
                                            />
                                            {imageEditingId === product._id ? (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => onPickImage(product._id)}
                                                        className="px-2 py-1 text-sm border rounded hover:bg-gray-100"
                                                    >Choose Image</button>
                                                    <button
                                                        onClick={() => saveImage(product)}
                                                        className="px-2 py-1 text-sm border rounded text-green-700 hover:bg-green-50"
                                                    >Save</button>
                                                    <button
                                                        onClick={() => cancelImageEdit(product._id)}
                                                        className="px-2 py-1 text-sm border rounded text-gray-700 hover:bg-gray-100"
                                                    >Cancel</button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => startImageEdit(product._id)}
                                                    className="px-2 py-1 text-sm border rounded text-blue-700 hover:bg-blue-50"
                                                    title="Edit Image"
                                                >Edit Image</button>
                                            )}
                                        </div>
                                        {/* Hidden file input for selecting image */}
                                        {imageEditingId === product._id && (
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/png, image/jpeg"
                                                className="hidden"
                                                onChange={onImageFileChange}
                                            />
                                        )}
                                    </td>
                                    <td className="p-4 font-medium text-gray-800">
                                        {editingProduct && editingProduct._id === product._id ? (
                                            <input 
                                                type="text" 
                                                value={editingProduct.name} 
                                                onChange={(e) => handleEditChange('name', e.target.value)}
                                                className="w-full px-2 py-1 border rounded"
                                            />
                                        ) : (
                                            product.name
                                        )}
                                    </td>
                                    <td className="p-4">
                                        {editingProduct && editingProduct._id === product._id ? (
                                            <input 
                                                type="number" 
                                                value={editingProduct.stock_quantity} 
                                                onChange={(e) => handleEditChange('stock_quantity', parseInt(e.target.value))}
                                                className="w-20 px-2 py-1 border rounded"
                                                min="0"
                                            />
                                        ) : (
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                product.stock_quantity <= 10 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                            }`}>{product.stock_quantity || 0}</span>
                                        )}
                                    </td>
                                    <td className="p-4 text-gray-600">
                                        {editingProduct && editingProduct._id === product._id ? (
                                            <select 
                                                value={editingProduct.category} 
                                                onChange={(e) => handleEditChange('category', e.target.value)}
                                                className="px-2 py-1 border rounded"
                                            >
                                                {categories.map((cat) => (
                                                    <option key={cat} value={cat}>{cat}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            product.category
                                        )}
                                    </td>
                                    <td className="p-4 font-semibold text-[#072679]">
                                        {editingProduct && editingProduct._id === product._id ? (
                                            <input 
                                                type="number" 
                                                value={editingProduct.price} 
                                                onChange={(e) => handleEditChange('price', parseFloat(e.target.value))}
                                                className="w-24 px-2 py-1 border rounded"
                                                min="0"
                                                step="0.01"
                                            />
                                        ) : (
                                            `LKR ${product.price}`
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-2">
                                            {editingProduct && editingProduct._id === product._id ? (
                                                <>
                                                    <button onClick={handleSaveEdit} className="p-2 text-green-600 hover:bg-green-100 rounded-full" title="Save">
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <polyline points="20,6 9,17 4,12"></polyline>
                                                        </svg>
                                                    </button>
                                                    <button onClick={handleCancelEdit} className="p-2 text-gray-600 hover:bg-gray-100 rounded-full" title="Cancel">
                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                                        </svg>
                                                    </button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => handleEdit(product)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full"><Edit size={16} /></button>
                                                    <button onClick={() => handleDelete(product._id)} className="p-2 text-red-600 hover:bg-red-100 rounded-full"><Trash2 size={16} /></button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
