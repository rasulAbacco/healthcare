import dotenv from "dotenv";
dotenv.config();

import app from "./src/index.js";
import ipdRoutes from "./src/IPD/ipd.routes.js";
import ipdPaymentRoutes from "./src/IPD/ipdPayment.routes.js";

const PORT = process.env.PORT || 4000;

app.use("/api/ipd", ipdRoutes);
app.use("/api/ipd-payments", ipdPaymentRoutes);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});