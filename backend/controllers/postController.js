const Post = require("../models/Post.js");
const { redisClient } = require("../config/redis.js");

const CACHE_KEY = "posts"; // Redis hash key for all post-related queries

// CREATE POST
exports.createPost = async (req, res) => {
  try {
    const { title, content } = req.body;

    if (!title || !content) {
      return res
        .status(400)
        .json({ message: "Title and content are required" });
    }

    const post = await Post.create({ title, content });

    // Invalidate the entire "posts" hash so stale data isn't served
    await redisClient.del(CACHE_KEY);
    console.log(`✅ Cache invalidated for key: "${CACHE_KEY}"`);

    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// GET POSTS
exports.getPosts = async (req, res) => {
  try {
    // Build a deterministic field key for hGet/hSet lookup
    const fieldKey = JSON.stringify({
      fields: req.query.fields || "all",
    });

    // STEP 1: Check Redis hash cache first (CACHE HIT)
    const cachedPosts = await redisClient.hGet(CACHE_KEY, fieldKey);

    if (cachedPosts) {
      console.log("✅ Data from Redis (hGet)");
      return res.json(JSON.parse(cachedPosts));
    }

    // STEP 2: Cache miss — fetch from MongoDB
    console.log("✅ Data from MongoDB");

    let query = Post.find().cache({ key: CACHE_KEY });

    if (req.query.fields) {
      const showFields = req.query.fields.split(",").join(" ");
      query = query.select(showFields);
    } else {
      query = query.select("-__v");
    }

    const posts = await query;

    // STEP 3: Store result in Redis hash + set TTL
    await redisClient.hSet(CACHE_KEY, fieldKey, JSON.stringify(posts));
    await redisClient.expire(CACHE_KEY, 60); // 60 seconds TTL
    console.log(`✅ Cache set for key: "${CACHE_KEY}", field: ${fieldKey}`);

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
