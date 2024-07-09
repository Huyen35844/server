import { Router } from "express";
import validate from "../middleware/validator.js";
import { newUserSchema, resetPasswordSchema, verifyTokenSchema } from "../utils/validationSchema.js";
import { createNewUser, generateForgetPasswordLink, grantTokens, grantValid, sendProfile, sendPublicProfile, signIn, signOut, updateAvatar, updatePassword, updateProfile, verifyEmail } from "../controllers/auth.js";
import { isAuth, isValidPassResetToken } from "../middleware/auth.js";
import fileParser from "../middleware/fileParser.js";

const authRouter = Router();

// Check existing account 
// Create a account 
// Generate and store a token 
// Send email including id (user) and token
authRouter.post("/sign-up", validate(newUserSchema), createNewUser)

// =>Use in verify.html
// Find the user by comparing the id to AuthVerificationModel's owner property 
// compare the token in the link vs the token in database 
// delete that record (authVerificationModel) if verify successfully 
// Update verified property as true in userModel
authRouter.post("/verify-email", validate(verifyTokenSchema), verifyEmail)

// Check email and password 
// Generate access and refresh tokens 
// Gtore refresh token in database 
// Return profile and tokens for user
authRouter.post('/sign-in', signIn)


// Decode the id in the access token from header 
// Attach the info in req.user 
// Send the info req.user to user
authRouter.get('/profile', isAuth, sendProfile)

// When access token expired, send refreshToken to the server to request new tokens (access, refresh).
authRouter.post('/refresh-token', grantTokens)

// Decode the id in access token from header 
// Find user in database with that id and refresh token from body 
// Filter that refresh token in tokens property
authRouter.post("/sign-out", isAuth, signOut)

// Find user by email 
// Delete the record has the owner's id in PasswordResetTokenModel 
// Create a token 
// Create a new object in PasswordResetTokenModel
// Send the link has the token and id inside
authRouter.post("/forget-pass", generateForgetPasswordLink)

// =>After clicking the reset password link
// Verify id and token in the link
// Validating id and token 
// FindById in PasswordResetTokenModel 
// Compare provided token to token in database 
// Return valid: true
authRouter.post('/verify-pass-reset-token', validate(verifyTokenSchema), isValidPassResetToken, grantValid)

// Validating id, token, password 
// Do the same steps as verify-pass-reset-token 
// Find user by id 
// Compare provided password to previous password 
// Update password 
// Delete the record with this id in PasswordResetTokenModel
authRouter.post("/reset-pass", validate(resetPasswordSchema), isValidPassResetToken, updatePassword)

// Read the provided data 
// Validate data 
// Find and update 
// Return the updated data
authRouter.post("/update-profile", isAuth, updateProfile)

// Review fileParser
// Destructing fields, files from formidable's parse method
authRouter.post("/update-avatar", isAuth, fileParser, updateAvatar)

authRouter.get("/profile/:id", isAuth, sendPublicProfile)

// In case of wanting to resend the link from user to verify email, because token in the link will expire after 24 hours
// authRouter.post("/resend-link-verify-email", generateVerificationLink)


export default authRouter;
