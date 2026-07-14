import express from "express";
import cors from "cors";
import authRoutes from "./auth/auth.routes.js";
import opdRoutes from "./opd/opd.routes.js";
import categoryRoutes from "./pharmacy/category.routes.js";
import medicineRoutes from "./pharmacy/medicine.routes.js";

const app = express();

// Middleware
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check Route
app.get("/", (req, res) => {
  res.json({
    message: "Server is Live",
  });
});

// Auth routes
app.use("/api/auth", authRoutes);

// OPD routes
app.use("/api/opd/patients", opdRoutes);

// Pharmacy routes
app.use("/api/pharmacy/categories", categoryRoutes);
app.use("/api/pharmacy/medicines", medicineRoutes);

export default app;