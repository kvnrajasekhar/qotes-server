import dotenv from "dotenv";
import User from "../../models/user.model";
import Token from "../../models/token.model";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { forgotPasswordLink } from "../../infrastructure/mailer/forgotPasswordMailer";
import { promises as fs } from "fs";
import cloudinaryService from "../../infrastructure/media/cloudinary.service";
import { producer } from "../../infrastructure/kafka/config/kafka.config";

dotenv.config();

const findUserByUsernameOrEmail = async (identifier: string) => {
  return await User.findOne({
    $or: [{ username: identifier }, { email: identifier }],
  }).select("+password");
};

const login = async (identifier: string, password: string) => {
  const user = await findUserByUsernameOrEmail(identifier);
  if (!user) return null;

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) return null;

  const JWT_SECRET = process.env.JWT_SECRET;
  const REFRESH_SECRET = process.env.REFRESH_SECRET;

  const payload = {
    userId: user._id,
    username: user.username,
  };

  const accessToken = jwt.sign(payload, JWT_SECRET || "", { expiresIn: "25m" });

  const refreshToken = jwt.sign({ userId: user._id }, REFRESH_SECRET || "", {
    expiresIn: "7d",
  });

  await saveRefreshToken(user._id.toString(), refreshToken);
  try {
    await producer.send({
      topic: "auth-events",
      messages: [
        {
          key: user._id.toString(),
          value: JSON.stringify({ userId: user._id, action: "login_warmup" }),
        },
      ],
    });
  } catch (kafkaErr: any) {
    console.error("Cache warm-up trigger failed:", kafkaErr);
  }

  return {
    accessToken,
    refreshToken,
    userId: user._id,
  };
};

const saveUser = async (
  username: string,
  email: string,
  hashedPassword: string,
  firstName: string,
  lastName: string,
  bio: string,
  avatarFile: any,
) => {
  let avatarUrl = null;
  let filePath = avatarFile ? avatarFile.path : null;

  try {
    if (avatarFile) {
      avatarUrl = await cloudinaryService.uploadImage(filePath);
    }

    const newUser = new User({
      username,
      email,
      password: hashedPassword,
      firstName,
      lastName,
      bio,
      avatarUrl: avatarUrl,
    });

    const savedUser = await newUser.save();

    if (filePath) await fs.unlink(filePath);

    return savedUser;
  } catch (error: any) {
    if (filePath) {
      await fs
        .unlink(filePath)
        .catch((err) =>
          console.error("Cleanup error after service failure:", err),
        );
    }
    throw error;
  }
};

const saveRefreshToken = async (userId: string, token: string) => {
  await Token.deleteMany({ userId: userId });
  const newToken = new Token({ userId, refreshToken: token });
  return await newToken.save();
};

const savePasswordResetToken = async (
  userId: string,
  token: string,
  expiresAt: Date,
) => {
  const resetToken = new Token({
    userId,
    passwordResetToken: token,
    expiresAt,
  });
  return await resetToken.save();
};

const deleteRefreshToken = async (token: string) => {
  return await Token.deleteOne({ refreshToken: token });
};

const findToken = async (token: string) => {
  return await Token.findOne({ refreshToken: token });
};

const findUserById = async (userId: string) => {
  return await User.findById(userId).select("+password");
};

const refreshAccessToken = async (refreshToken: string) => {
  let decoded: any;

  try {
    decoded = jwt.verify(refreshToken, process.env.REFRESH_SECRET || "");
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

  const newAccessToken = jwt.sign(
    { userId: user._id, username: user.username },
    process.env.JWT_SECRET || "",
    { expiresIn: "15m" },
  );

  return { accessToken: newAccessToken };
};

const generateResetTokenAndSendEmail = async (email: string) => {
  const user = await User.findOne({ email }).select("+password");

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

  const token = jwt.sign(payload, secret, {
    expiresIn: "15m",
  });

  const link = `${LOCALHOST}/forgotpassword/${user._id}/${token}`;

  forgotPasswordLink(user.email, link);

  return {
    success: true,
    message: "A password reset link has been sent to your email",
  };
};

const resetPasswordWithToken = async (
  userId: string,
  token: string,
  newPassword: string,
  cnfPassword: string,
) => {
  if (newPassword !== cnfPassword) {
    throw new Error("Passwords didn't match");
  }

  const validUser = await User.findOne({ _id: userId }).select("+password");

  if (!validUser) {
    throw new Error("Invalid reset link. User not found.");
  }

  const secret = process.env.JWT_SECRET + validUser.password;
  let payload: any;
  try {
    payload = jwt.verify(token, secret);
  } catch (error) {
    throw new Error("Password reset link is invalid or has expired");
  }

  const hashPassword = await bcrypt.hash(newPassword, 10);

  const user = await User.findOneAndUpdate(
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
  userId: string,
  oldPassword: string,
  newPassword: string,
  confirmPassword: string,
) => {
  const user = await User.findById(userId).select("+password");

  if (!user) {
    throw new Error("User account not found.");
  }

  const isMatch = await bcrypt.compare(oldPassword, user.password);

  if (!isMatch) {
    throw new Error("Current password incorrect.");
  }
  if (newPassword !== confirmPassword) {
    throw new Error("New passwords do not match.");
  }
  const hashedNewPassword = await bcrypt.hash(newPassword, 10);

  await User.findByIdAndUpdate(
    userId,
    { $set: { password: hashedNewPassword } },
    { new: true },
  );

  await Token.deleteMany({ userId: userId });

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

export default authService;
