"use strict";
var __importDefault =
  (this && this.__importDefault) ||
  function (mod) {
    return mod && mod.__esModule ? mod : { default: mod };
  };
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const user_model_1 = __importDefault(require("../../models/user.model"));
const token_model_1 = __importDefault(require("../../models/token.model"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const forgotPasswordMailer_1 = require("../../infrastructure/mailer/forgotPasswordMailer");
const fs_1 = require("fs");
const cloudinary_service_1 = __importDefault(
  require("../../infrastructure/media/cloudinary.service"),
);
const kafka_config_1 = require("../../infrastructure/kafka/config/kafka.config");
dotenv_1.default.config();
const findUserByUsernameOrEmail = async (identifier) => {
  return await user_model_1.default
    .findOne({
      $or: [{ username: identifier }, { email: identifier }],
    })
    .select("+password");
};
const login = async (identifier, password) => {
  const user = await findUserByUsernameOrEmail(identifier);
  if (!user) return null;
  const isValidPassword = await bcryptjs_1.default.compare(
    password,
    user.password,
  );
  if (!isValidPassword) return null;
  const JWT_SECRET = process.env.JWT_SECRET;
  const REFRESH_SECRET = process.env.REFRESH_SECRET;
  const payload = {
    userId: user._id,
    username: user.username,
  };
  const accessToken = jsonwebtoken_1.default.sign(payload, JWT_SECRET || "", {
    expiresIn: "25m",
  });
  const refreshToken = jsonwebtoken_1.default.sign(
    { userId: user._id },
    REFRESH_SECRET || "",
    {
      expiresIn: "7d",
    },
  );
  await saveRefreshToken(user._id.toString(), refreshToken);
  try {
    await kafka_config_1.producer.send({
      topic: "auth-events",
      messages: [
        {
          key: user._id.toString(),
          value: JSON.stringify({ userId: user._id, action: "login_warmup" }),
        },
      ],
    });
  } catch (kafkaErr) {
    console.error("Cache warm-up trigger failed:", kafkaErr);
  }
  return {
    accessToken,
    refreshToken,
    userId: user._id,
  };
};
const saveUser = async (
  username,
  email,
  hashedPassword,
  firstName,
  lastName,
  bio,
  avatarFile,
) => {
  let avatarUrl = null;
  let filePath = avatarFile ? avatarFile.path : null;
  try {
    if (avatarFile) {
      avatarUrl = await cloudinary_service_1.default.uploadImage(filePath);
    }
    const newUser = new user_model_1.default({
      username,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      bio,
      avatarUrl: avatarUrl,
    });
    const savedUser = await newUser.save();
    if (filePath) await fs_1.promises.unlink(filePath);
    return savedUser;
  } catch (error) {
    if (filePath) {
      await fs_1.promises
        .unlink(filePath)
        .catch((err) =>
          console.error("Cleanup error after service failure:", err),
        );
    }
    throw error;
  }
};
const saveRefreshToken = async (userId, token) => {
  await token_model_1.default.deleteMany({ userId: userId });
  const newToken = new token_model_1.default({ userId, refreshToken: token });
  return await newToken.save();
};
const savePasswordResetToken = async (userId, token, expiresAt) => {
  const resetToken = new token_model_1.default({
    userId,
    passwordResetToken: token,
    expiresAt,
  });
  return await resetToken.save();
};
const deleteRefreshToken = async (token) => {
  return await token_model_1.default.deleteOne({ refreshToken: token });
};
const findToken = async (token) => {
  return await token_model_1.default.findOne({ refreshToken: token });
};
const findUserById = async (userId) => {
  return await user_model_1.default.findById(userId).select("+password");
};
const refreshAccessToken = async (refreshToken) => {
  let decoded;
  try {
    decoded = jsonwebtoken_1.default.verify(
      refreshToken,
      process.env.REFRESH_SECRET || "",
    );
  } catch (err) {
    throw { status: 403, message: "Expired or invalid refresh token" };
  }
  const userId = decoded.userId;
  const tokenRecord = await findToken(refreshToken);
  if (!tokenRecord || tokenRecord.userId.toString() !== userId) {
    throw { status: 403, message: "Invalid refresh token state" };
  }
  const user = await findUserById(userId);
  if (!user) {
    throw { status: 403, message: "User not found" };
  }
  const newAccessToken = jsonwebtoken_1.default.sign(
    { userId: user._id, username: user.username },
    process.env.JWT_SECRET || "",
    { expiresIn: "15m" },
  );
  return { accessToken: newAccessToken };
};
const generateResetTokenAndSendEmail = async (email) => {
  const user = await user_model_1.default
    .findOne({ email })
    .select("+password");
  if (!user) {
    return { success: true, message: "If account exists, email sent" };
  }
  const JWT_SECRET = process.env.JWT_SECRET;
  const LOCALHOST = process.env.LOCALHOST || "http://localhost:3030";
  const secret = JWT_SECRET + user.password;
  const payload = {
    email: user.email,
    id: user._id,
  };
  const token = jsonwebtoken_1.default.sign(payload, secret, {
    expiresIn: "15m",
  });
  const link = `${LOCALHOST}/forgotpassword/${user._id}/${token}`;
  (0, forgotPasswordMailer_1.forgotPasswordLink)(user.email, link);
  return {
    success: true,
    message: "A password reset link has been sent to your email",
  };
};
const resetPasswordWithToken = async (
  userId,
  token,
  newPassword,
  cnfPassword,
) => {
  if (newPassword !== cnfPassword) {
    throw new Error("Passwords didn't match");
  }
  const validUser = await user_model_1.default
    .findOne({ _id: userId })
    .select("+password");
  if (!validUser) {
    throw new Error("Invalid reset link. User not found.");
  }
  const secret = process.env.JWT_SECRET + validUser.password;
  let payload;
  try {
    payload = jsonwebtoken_1.default.verify(token, secret);
  } catch (error) {
    throw new Error("Password reset link is invalid or has expired");
  }
  const hashPassword = await bcryptjs_1.default.hash(newPassword, 10);
  const user = await user_model_1.default.findOneAndUpdate(
    { _id: payload.id, email: payload.email },
    { password: hashPassword },
    { new: true },
  );
  if (!user) {
    throw new Error("User not found during update");
  }
  return { success: true, message: "Password updated successfully" };
};
const updateUserPassword = async (
  userId,
  oldPassword,
  newPassword,
  confirmPassword,
) => {
  const user = await user_model_1.default.findById(userId).select("+password");
  if (!user) {
    throw new Error("User account not found.");
  }
  const isMatch = await bcryptjs_1.default.compare(oldPassword, user.password);
  if (!isMatch) {
    throw new Error("Current password incorrect.");
  }
  if (newPassword !== confirmPassword) {
    throw new Error("New passwords do not match.");
  }
  const hashedNewPassword = await bcryptjs_1.default.hash(newPassword, 10);
  await user_model_1.default.findByIdAndUpdate(
    userId,
    { $set: { password: hashedNewPassword } },
    { new: true },
  );
  await token_model_1.default.deleteMany({ userId: userId });
  return {
    success: true,
    message: "Password updated successfully. Please log in again.",
  };
};
const authService = {
  findUserByUsernameOrEmail,
  login,
  saveUser,
  saveRefreshToken,
  savePasswordResetToken,
  deleteRefreshToken,
  findToken,
  findUserById,
  refreshAccessToken,
  generateResetTokenAndSendEmail,
  resetPasswordWithToken,
  updateUserPassword,
};
exports.default = authService;
//# sourceMappingURL=auth.service.js.map
