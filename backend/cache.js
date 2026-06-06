const mongoose = require("mongoose");
const { redisClient } = require("./config/redis.js");
const exec = mongoose.Query.prototype.exec;

mongoose.Query.prototype.cache = function () {
  this.useCache = true;
  // console.log("✅ Caching enabled for query:", this);
  return this;
};

mongoose.Query.prototype.exec = async function () {
  // console.log("✅ Executing query:", this);
  if (!this.useCache) {
    return exec.apply(this, arguments);
  }
  const queryObj = { ...this.projection() };
  const collectionName = this.mongooseCollection.name;
  const queryStr = JSON.stringify({ queryObj, collectionName });
  // console.log("Query String:", queryStr);

  // Check Redis cache first
  const cachedResult = await redisClient.get(queryStr);
  console.log("✅ Cached Result:", cachedResult);

  if (cachedResult) {
    console.log("Data from Redis");
    // console.log(JSON.parse(cachedResult));
    return JSON.parse(cachedResult);
  }

  console.log("Data from MongoDB");
  const result = await exec.apply(this, arguments);

  // Store in Redis
  await redisClient.set(queryStr, JSON.stringify(result), "EX", 60); // Cache for 60 seconds

  return result;
};
