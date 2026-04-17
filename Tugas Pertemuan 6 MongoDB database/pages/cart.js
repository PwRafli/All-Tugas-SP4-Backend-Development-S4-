import Navbar from "../components/Navbar";

export default function Cart() {
    return (
        <div>
            <Navbar />
            <div className="container mt-4">
                <h3>Keranjang Belanja</h3>
                <p>Belum ada item di keranjang.</p>
            </div>
        </div>
    );
}