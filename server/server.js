const express = require("express");
const cors = require("cors");
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const routes = require("./routes/routes")

dotenv.config({ path: './config.env' });
console.log("die env")

const server = express();
server.use(cors({ origin: /^http:\/\/localhost:\d+$/ }));
console.log("1")

server.use(express.json());

server.use("/", routes);

//user






// this is a test server 

server.get("/test", (req, res) => {
    let message = "testing booyah backend APIs"
    return res.status(400).json({ error: message });

    return res.json({ test: message });
})


// async function to connect to DB
async function connectDB() {
    try {
        await mongoose.connect(process.env.DB);
        console.log("MongoDB connected successfully");
    } catch (error) {
        console.error("MongoDB connection failed:", error.message);
        process.exit(1);
    }
};

function startServer() {
    const hostname = "localhost"; // Define server hostname
    const port = 8000;// Define port number
    // Start the server and listen on the specified hostname and port
    server.listen(port, hostname, () => {
        console.log(`API running at http://${hostname}:${port}/`);
    });
}
// call connectDB first and when connection is ready, we start the web server
connectDB().then(startServer);