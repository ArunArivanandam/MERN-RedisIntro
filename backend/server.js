const dotenv = require("dotenv");
dotenv.config();

const app = require("./app");
const connectToMongoDB = require("./config/connectToMongoDB");
const { connectRedis } = require("./config/redis");

const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  await connectToMongoDB();
  await connectRedis();
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
