const mongoose = require("mongoose");
const { redisClient } = require("./config/redis.js");

const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function (options = {}) {
  this.useCache = true;
  this.hashKey = JSON.stringify(options.key || "default");
  return this;
};

mongoose.Query.prototype.exec = async function (...args) {
  if (!this.useCache) {
    return exec.apply(this, args);
  }

  const queryObj = {
    ...this.getQuery(),
    collection: this.mongooseCollection.name,
  };

  if (this.projection()) {
    queryObj.projection = this.projection();
  }

  const fieldKey = JSON.stringify(queryObj);

  // Check Redis hash cache first
  const cachedResult = await redisClient.hGet(this.hashKey, fieldKey);

  if (cachedResult) {
    console.log("✅ Data from Redis (hGet)");
    const parsed = JSON.parse(cachedResult);

    return Array.isArray(parsed)
      ? parsed.map((doc) => new this.model(doc))
      : new this.model(parsed);
  }

  console.log("✅ Data from MongoDB");
  const result = await exec.apply(this, args);

  // Store in Redis hash + set expiry on the hash key
  await redisClient.hSet(this.hashKey, fieldKey, JSON.stringify(result));
  await redisClient.expire(this.hashKey, 60); // 60 seconds TTL on the hash

  return result;
};
