const Post = require("../models/Post.js");
const { redisClient } = require("../config/redis.js");

// CREATE POST
exports.createPost = async (req, res) => {
  try {
    const { title, content } = req.body;

    const post = await Post.create({
      title,
      content,
    });

    /*
      IMPORTANT

      We delete old cache because
      posts data changed now.
    */

    // await redisClient.del("posts");

    res.status(201).json(post);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};

// GET POSTS
exports.getPosts = async (req, res) => {
  try {
    /*
      STEP 1
      Check Redis cache first
    */

    // const cachedPosts = await redisClient.get("posts");

    /*
      CACHE HIT
    */

    // if (cachedPosts) {
    //   console.log("Data from Redis");

    //   return res.json(JSON.parse(cachedPosts));
    // }

    /*
      CACHE MISS
    */

    console.log("Data from MongoDB");
    let queryObj = {};
    let query = Post.find().cache();

    if (req.query.fields) {
      const showFields = req.query.fields.split(",").join(" ");
      query = query.select(showFields);
    } else {
      query = query.select("-__v");
    }

    const posts = await query;

    /*
      Store in Redis

      EX = expiry time in seconds
    */

    // await redisClient.set("posts", JSON.stringify(posts));

    res.json(posts);
  } catch (error) {
    res.status(500).json({
      message: error.message,
    });
  }
};
