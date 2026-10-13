const dotenv = require('dotenv');
// Load local config.env if running locally
dotenv.config({ path: './config.env' });

const express = require("express");
const cors = require("cors");
const mongoose = require('mongoose');
const dns = require('dns');
const routes = require("./routes/routes");

// Force Node.js DNS servers for local SRV resolution
if (process.env.NODE_ENV !== 'production') {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
}

const server = express();

// 1. Updated CORS Configuration
// Allows requests from both local development and your deployed Vercel Vue app
const allowedOrigins = [
    /^http:\/\/localhost:\d+$/,
    process.env.CLIENT_URL // Set this in Vercel settings to your Vue Vercel URL
].filter(Boolean);

server.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

server.use(express.json());

// 2. Serverless MongoDB Connection Manager
let isConnected = false;

async function connectDB() {
    if (isConnected && mongoose.connection.readyState === 1) {
        return;
    }
    try {
        const db = await mongoose.connect(process.env.DB);
        isConnected = db.connections[0].readyState === 1;
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
    }
}

// Ensure DB connection on every request before routing
server.use(async (req, res, next) => {
    if (process.env.DB) {
        await connectDB();
    }
    next();
});

server.use("/", routes);

// Test Route
server.get("/test", (req, res) => {
    return res.json({ test: "testing booyah backend APIs" });
});

// 3. Export for Vercel
module.exports = server;

// 4. Run local server only when NOT on Vercel production
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 8000;
    server.listen(PORT, () => {
        console.log(`API running at http://localhost:${PORT}/`);
    });
}