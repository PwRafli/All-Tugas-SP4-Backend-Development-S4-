import Link from "next/link";

export default function Navbar() {
    return (
        <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
            <div className="container">
                <Link href="/" className="navbar-brand">
                    E-Commerce
                </Link>

                <div>
                    <Link href="/" className="btn btn-outline-light me-2">
                        Home
                    </Link>
                    <Link href="/cart" className="btn btn-warning">
                        Cart
                    </Link>
                </div>
            </div>
        </nav>
    );
}