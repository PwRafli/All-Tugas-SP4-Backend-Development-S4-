import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import ProductCart from "../components/ProductCart";

export default function Home() {
    const [products, setProducts] = useState([]);

    useEffect(() => {
        fetch("/api/products")
            .then(res => res.json())
            .then(data => setProducts(data));
    }, []);

    return (
        <div>
            <Navbar />
            <div className="container mt-4">
                <div className="row">
                    {products.map((item) => (
                        <ProductCart key={item._id} product={item} />
                    ))}
                </div>
            </div>
        </div>
    );
}