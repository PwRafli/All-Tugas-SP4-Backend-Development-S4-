export default function ProductCart({ product }) {
    return (
        <div className="col-md-4">
            <div className="card mb-4">
                <div className="card-body">
                    <h5 className="card-title">{product.name}</h5>
                    <p className="card-text">{product.description}</p>
                    <h6>Rp {product.price}</h6>
                    <button className="btn btn-primary">Tambah ke Keranjang</button>
                </div>
            </div>
        </div>
    );
}