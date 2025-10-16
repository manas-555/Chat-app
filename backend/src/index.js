// index.js
import dotenv from "dotenv";
import path from "path";
import { connectDB } from "./lib/db.js";
import { app, server } from "./lib/socket.js"; // keep your socket server

dotenv.config();

const PORT = process.env.PORT || 5000;

// Serve frontend in production
const __dirname = path.resolve();
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "frontend", "dist")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
  });
}

// Start server
server.listen(PORT, () => {
  console.log("Server is running on PORT:", PORT);
  connectDB();
});

