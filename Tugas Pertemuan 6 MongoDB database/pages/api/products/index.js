import clientPromise from "../../../lib/mongodb";

export default async function handler(req, res) {
    const client = await clientPromise;
    const db = client.db("ecommerce");

    if (req.method === "GET") {
        const products = await db.collection("products").find({}).toArray();
        res.status(200).json(products);
    }

    if (req.method === "POST") {
        const data = req.body;
        const result = await db.collection("products").insertOne(data);
        res.status(201).json(result);
    }
}