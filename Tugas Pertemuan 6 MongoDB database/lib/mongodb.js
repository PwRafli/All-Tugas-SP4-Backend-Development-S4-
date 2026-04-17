import { MongoClient } from "mongodb";

const uri = "mongodb://127.0.0.1:27017";
const options = {};

let client;
let clientPromise;

// Hindari koneksi berulang di Next.js
if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
}

clientPromise = global._mongoClientPromise;

export default clientPromise;