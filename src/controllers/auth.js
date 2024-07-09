import mongoose, { isValidObjectId } from "mongoose";
import AuthVerificationTokenModel from "../models/authVerificationTokenModel.js";
import UserModel from "../models/userModel.js"
import mail from "../utils/mail.js";
import { sendErrorRes } from '../utils/sendErrorRes.js';
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import cloudUploader from "../cloud/index.js";
import PasswordResetTokenModel from "../models/passwordResetTokenModel.js";

const VERIFICATION_LINK = process.env.VERIFICATION_LINK;
const PASSWORD_RESET_LINK = process.env.PASSWORD_RESET_LINK;

const JWT_SECRET = process.env.JWT_SECRET
export const createNewUser = async (req, res) => {
  //Read incoming data
  const { email, name, password } = req.body

  //Check if we already have account with same user
  const existingUser = await UserModel.findOne({ email })

  if (existingUser) return sendErrorRes(res, "Email is already in use!", 400)
  const user = await UserModel.create({ email, name, password })

  //Generate and store verification token
  const token = crypto.randomBytes(36).toString('hex')
  await AuthVerificationTokenModel.create({ owner: user._id, token })

  const link = `${VERIFICATION_LINK}?id=${user._id}&token=${token}`;
  console.log(link);

  await mail.sendVerificationLink(user.email, link)

  res.json({ message: "Please check your inbox" })
}


export const verifyEmail = async (req, res) => {
  const { id, token } = req.body

  const authToken = await AuthVerificationTokenModel.findOne({ owner: id })
  if (!authToken) return sendErrorRes(res, "Unauthorized request, invalid id!", 400)

  const isMatched = await authToken.compareToken(token)
  if (!isMatched) return sendErrorRes(res, "Invalid token!", 400)

  await UserModel.findByIdAndUpdate(id, { verified: true })
  await AuthVerificationTokenModel.findByIdAndDelete(authToken._id)

  res.json({ message: "Thank you for joining us, your email is verified!" })
}


export const signIn = async (req, res) => {
  const { email, password } = req.body

  const user = await UserModel.findOne({ email })
  if (!user) return sendErrorRes(res, "Email/Password is mismatch!", 400)

  const isMatched = await user.comparePassword(password);
  if (!isMatched) return sendErrorRes(res, "Email/Password is mismatch!", 400)

  const payload = { id: user._id }
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "1m" });
  const refreshToken = jwt.sign(payload, JWT_SECRET)

  if (!user.tokens) user.tokens = [refreshToken]
  else user.tokens.push(refreshToken)

  await user.save();

  res.json({
    profile: {
      id: user._id,
      email: user.email,
      name: user.name,
      verified: user.verified,
      avatar: user.avatar?.url
    },
    tokens: {
      refresh: refreshToken,
      access: accessToken
    }
  })

}

export const sendProfile = async (req, res) => {
  res.json({
    // profile: req.user
    ...req.user
  })
}


export const grantTokens = async (req, res) => {
  const { refreshToken } = req.body
  if (!refreshToken) return sendErrorRes(res, "Unauthorized request!", 400)

  const payload = jwt.verify(refreshToken, JWT_SECRET);
  if (!payload.id) return sendErrorRes(res, "Unauthorized request!", 400)
  const userId = new mongoose.Types.ObjectId(payload.id)


  const user = await UserModel.findOne({
    _id: userId,
    tokens: refreshToken
  })

  if (!user) {
    //user is compromised, remove all the previous tokens
    await UserModel.findByIdAndUpdate(payload.id, { tokens: [] })
    return sendErrorRes(res, "Unauthorized request", 400)
  }

  const newRefreshToken = jwt.sign({ id: user._id }, JWT_SECRET)
  const newAccessToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "15m" })

  const filteredTokens = user.tokens.filter((t) => t !== refreshToken)
  user.tokens = filteredTokens
  user.tokens.push(newRefreshToken);
  await user.save()

  res.json({
    tokens: { refresh: newRefreshToken, access: newAccessToken }
  })

}


export const signOut = async (req, res) => {
  const { refreshToken } = req.body;

  const user = await UserModel.findOne({
    _id: req.user.id,
    tokens: refreshToken
  })

  if (!user) return sendErrorRes(res, "Unauthorized request, user not found!", 400)

  const filteredToken = user.tokens.filter((t) => t !== refreshToken)
  user.tokens = filteredToken
  await user.save()

  res.send()
}

export const generateForgetPasswordLink = async (req, res) => {
  const { email } = req.body

  const user = await UserModel.findOne({ email })
  if (!user) return sendErrorRes(res, "User not found!", 400)

  // Remove token in the case of sending the link earlier but user hasn't verify it yet and 
  // if we keep sending one more link, that user will have two veryfing link 
  // so make sure to remove the previous one before creating a new one
  await PasswordResetTokenModel.findOneAndDelete({ owner: user._id })

  const token = crypto.randomBytes(36).toString("hex")
  await PasswordResetTokenModel.create({ owner: user._id, token })

  const passResetLink = `${PASSWORD_RESET_LINK}?id=${user._id}&token=${token}`
  await mail.sendPasswordResetLink(user.email, passResetLink)

  res.json({ message: "Please check your email!" })
}

export const grantValid = async (req, res) => {
  res.send({ valid: true })
}


export const updatePassword = async (req, res) => {
  const { id, password } = req.body;

  const user = await UserModel.findById(id)
  if (!user) return sendErrorRes(res, "Unauthorized request", 400)

  const matched = await user.comparePassword(password)
  if (matched) return sendErrorRes(res, "The new password must be different!", 400)

  user.password = password
  await user.save()

  await PasswordResetTokenModel.findOneAndDelete({ owner: user._id })

  await mail.sendPasswordUpdateMessage(user.email)
  res.json({ message: "Password resets successfully" })
}

export const updateProfile = async (req, res) => {
  const { name } = req.body

  if (typeof name !== "string" || name.trim().length < 3) {
    return sendErrorRes(res, "Invalid name!", 400)
  }

  await UserModel.findByIdAndUpdate(req.user.id, name)

  res.json({ profile: { ...req.user, name } })
}

export const generateVerificationLink = async (req, res) => {

}

export const updateAvatar = async (req, res) => {
  const { avatar } = req.files

  if (Array.isArray(avatar)) {
    return sendErrorRes(res, "Muliple files are not allowed!", 400)
  }

  if (!avatar.mimetype?.startsWith("image")) {
    return sendErrorRes(res, "Invalid image file", 400)
  }

  const user = await UserModel.findById(req.user.id)
  if (!user) {
    return sendErrorRes(res, "User not found!", 400)
  }

  if (user.avatar.id) {
    // remove avatar file
    await cloudUploader.destroy(user.avatar.id)
  }

  // upload avatar file
  const { secure_url: url, public_id: id } = await cloudUploader.upload(
    avatar.filepath,
    {
      width: 300,
      height: 300,
      crop: "thumb",
      gravity: "face",
    }
  )

  user.avatar = { url, id }
  await user.save()

  res.json({ profile: { ...req.user, avatar: user.avatar.url } })
}

export const sendPublicProfile = async (req, res) => {
  const profileId = req.params.id
  if (!isValidObjectId(profileId)) {
    return sendErrorRes(res, "Invalid profile id", 400)
  }

  const user = await UserModel.findById(profileId)
  if (!user) {
    return sendErrorRes(res, "Profile not found", 400)
  }

  res.json({
    profile: { id: user._id, name: user.name, avatar: user.avatar?.url }
  })
}



//To fix accessing to .env: 1. npm install dotenv again, 2. place this import 'dotenv/config on the top in endpoint file, 3. create file .env same place as package.json, 4. restart server