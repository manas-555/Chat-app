import User from "../models/user.model.js";
import Message from "../models/message.model.js";
import cloudinary from "../lib/cloudinary.js";
import { getReceiverSocketId, io } from "../lib/socket.js";
import redisClient from "../lib/redisClient.js";

const MAX_MESSAGES = 20; // last 20 messages
const TTL_SECONDS = 24 * 60 * 60; // 24 hours

// 🟢 Get users for sidebar
export const getUsersForSidebar = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const filteredUsers = await User.find({ _id: { $ne: loggedInUserId } }).select("-password");
    res.status(200).json(filteredUsers);
  } catch (error) {
    console.error("❌ Error in getUsersForSidebar:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

// 🧠 Fetch messages between two users (with Redis cache)
export const getMessages = async (req, res) => {
  try {
    const { id: userToChatId } = req.params;
    const myId = req.user._id.toString();

    const cacheKey = [`chat:messages:${myId}:${userToChatId}`, `chat:messages:${userToChatId}:${myId}`].sort()[0];

    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      try {
       // safe because we stringify before storing
        console.log(`✅ [Redis Hit] Conversation ${myId} ↔ ${userToChatId}`);
        return res.status(200).json(cachedData);
      } catch (err) {
        console.warn(`⚠️ [Redis Parse Error] Clearing bad cache for ${cacheKey}`);
        await redisClient.del(cacheKey);
      }
    }

    console.log(`⚠️ [Redis Miss] Fetching from MongoDB for ${myId} ↔ ${userToChatId}`);
    const messagesFromDb = await Message.find({
      $or: [
        { senderId: myId, receiverId: userToChatId },
        { senderId: userToChatId, receiverId: myId },
      ],
    })
      .sort({ createdAt: 1 })
      .lean();

    const lastMessages = messagesFromDb.slice(-MAX_MESSAGES);

    // ✅ Store as valid JSON string in Redis
    await redisClient.set(cacheKey, JSON.stringify(lastMessages), { EX: TTL_SECONDS });

    console.log(`💾 [Redis Cache Set] Cached ${lastMessages.length} messages for ${cacheKey}`);
    res.status(200).json(lastMessages);
  } catch (error) {
    console.error("❌ Error in getMessages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

// 🧠 Send message and update Redis cache
export const sendMessage = async (req, res) => {
  try {
    const { text, image } = req.body;
    const { id: receiverId } = req.params;
    const senderId = req.user._id.toString();

    let imageUrl;
    if (image) {
      const uploadResponse = await cloudinary.uploader.upload(image);
      imageUrl = uploadResponse.secure_url;
    }

    const newMessage = await Message.create({ senderId, receiverId, text, image: imageUrl });

    const cacheKey = [`chat:messages:${senderId}:${receiverId}`, `chat:messages:${receiverId}:${senderId}`].sort()[0];

    let messages = [];
    const cachedData = await redisClient.get(cacheKey);

    if (cachedData) {
      // cachedData is already an object/array, so just use it
      messages = Array.isArray(cachedData) ? cachedData : [];
    }

    messages.push(newMessage); // add new message
    messages = messages.slice(-MAX_MESSAGES); // keep last MAX_MESSAGES

    await redisClient.set(cacheKey, messages, { EX: TTL_SECONDS }); // no JSON.stringify needed
    console.log(`🔄 [Redis Cache Updated] ${messages.length} messages cached for ${cacheKey}`);

    // Emit via socket.io
    const receiverSocketId = getReceiverSocketId(receiverId);
    if (receiverSocketId) {
      io.to(receiverSocketId).emit("newMessage", newMessage);
    }

    res.status(201).json(newMessage);
  } catch (error) {
    console.error("❌ Error in sendMessage:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
};



