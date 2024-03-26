import { asyncHandler } from "../utils/asyncHandler.js";
import User from "../models/userModel.js";
import { sendEmail } from "../utils/mailing.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import crypto from "crypto";
import Chat from "../models/chat.js";
/**
 * Registers a new user.
 *
 * @param {Object} req - The request object.
 * @param {Object} res - The response object.
 * @returns {Promise<void>} - A promise that resolves when the user is registered.
 */
export const registerUser = asyncHandler(async (req, res) => {
  // Destructure the request body
  const { email, username, password, confirmPassword } = req.body;

  // Check if the user already exists
  const userExists = await User.findOne({
    $or: [{ email }, { username }],
  });

  // If the user exists, throw an error
  if (userExists) {
    res.status(400).json(new ApiResponse(400, {}, "User already exists"));
  }

  // Create a new user
  const user = await User.create({
    email,
    username,
    password,
    isEmailVerified: false,
  });

  const chatBoard = await Chat.create({
    user:user._id
  })

  user.chatBoard = chatBoard._id;

  /**
   * unHashedToken: unHashed token is something we will send to the user's mail
   * hashedToken: we will keep record of hashedToken to validate the unHashedToken in verify email controller
   * tokenExpiry: Expiry to be checked before validating the incoming token
   */

  const { unHashedToken, hashedToken, tokenExpiry } =
    user.generateTemporaryToken();

  // Save the user to the database
  user.emailVerificationToken = hashedToken;
  user.emailVerificationTokenExpires = tokenExpiry;
  await user.save({ validateBeforeSave: false });

  // Send the unhashed token to the user's email
  const verificationURL = `http://localhost:5173/verify-email/${unHashedToken}`;

  // Send the email
  await sendEmail({
    email: user.email,
    subject: "Email Verification",
    text: `Please verify your email by clicking on the link below: ${verificationURL}`,
  });


  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -emailVerificationToken -emailVerificationTokenExpiry"
  );

  // If the user is not created, throw an error
  if (!createdUser) {
    res.status(500);
    throw new Error("Something went wrong while registering the user");
  }

  // the user is created, send the response
  return res
    .status(201)
    .json(
      new ApiResponse(
        200,
        { user: createdUser },
        "Users registered successfully and verification email has been sent on your email."
      )
    );
});

export const verifyEmail = asyncHandler(async (req, res) => {
  // Destructure the verification token from the request params
  const { unHashedToken } = req.params;

  // Check if the verification token is missing
  if (!unHashedToken) {
    res.status(400);
    throw new Error("Email verification token is missing");
  }

  // Hash the verification token
  let hashedToken = crypto
    .createHash("sha256")
    .update(unHashedToken)
    .digest("hex");


  // While registering the user, same time when we are sending the verification mail
  // we have saved a hashed value of the original email verification token in the db
  // We will try to find user with the hashed token generated by received token
  // If we find the user another check is if token expiry of that token is greater than current time if not that means it is expired
  const user = await User.findOne({
    emailVerificationToken: hashedToken,
    // emailVerificationTokenExpires: { $gt: Date.now() },
  });

  // If the user is not found, throw an error
  if (!user) {
    res.status(400);
    throw new Error("Invalid or expired email verification token");
  }

  // If we found the user that means the token is valid
  // Now we can remove the associated email token and expiry date as we no  longer need them
  user.emailVerificationToken = undefined;
  user.emailVerificationTokenExpires = undefined;
  // Tun the email verified flag to `true`
  user.isEmailVerified = true;
  await user.save({ validateBeforeSave: false });

  // Send the response
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { isEmailVerified: true },
        "Email verified successfully"
      )
    );
});

const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // attach refresh token to the user document to avoid refreshing the accesstoken with multiple refresh tokens
    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    res.status(500).json({
      message: "Something went wrong while generating the access token",
    });
  }
};

export const loginUser = asyncHandler(async (req, res) => {
  const { userData } = req.body;

  if (!userData) {
    return res.status(400).json({
      message: "User data is required",
    });
  }

  const { email, password } = userData;

  if (!email) {
    return res.status(400).json({
      message: "Email is required",
    });
  }

  const user = await User.findOne({
    $or: [{ email }, { username: email }],
  });

  if (!user) {
    return res.status(404).json({
      message: "User does not exist",
    });
  }

  const isPasswordValid = await user.comparePassword(password);

  if (!isPasswordValid) {
    return res.status(401).json({
      message: "Invalid user credentials",
    });
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // get the user document ignoring the password and refreshToken field
  const loggedInUser = await User.findById(user._id).select('-password -refreshToken');

  return res
    .status(200)
    .cookie("accessToken", accessToken, { httpOnly: true, secure: true, sameSite: 'lax', domain: '.finance-vision.vercel.app'})
    .cookie("refreshToken", refreshToken, { httpOnly: true, secure: true, sameSite: 'lax', domain: '.finance-vision.vercel.app' })
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken: accessToken,
        },
        "User logged in successfully"
      )
    );
});

export const logoutUser = asyncHandler(async (req, res) =>{
    await User.findByIdAndUpdate(
      req.user._id,
      {
        $set: {
          refreshToken: undefined,
        },
      },
      { new: true }
    );

    return res
      .status(200)
      .clearCookie("accessToken")
      .clearCookie("refreshToken")
      .json(new ApiResponse(200, {}, "User logged out successfully"));
})

export const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

export const forgotPasswordRequest = asyncHandler(async (req, res)=>{
    const {email} = req.body;

    // Get email from the client and check if user exists
    const user = await User.findOne({email});

    if (!user){
      res.status(404).json({message:"User does not exists"});
    }


    // Generate a temporary token
    const {unHashedToken, hashedToken, tokenExpiry} = user.generateTemporaryToken();  // generate password reset creds

    // save the hashed version of the token and expiry in the database
    user.forgotPasswordToken = hashedToken;
    user.forgotPasswordExpiry = tokenExpiry;
    await user.save({validateBeforeSave: false});


    // Send mail with the password reset link, It should be the link of the frontend url with token

    await sendEmail({
      email: user.email,
      Subject:"Reset Password",
      text:`If you have sent this reset password request, Click the like http://localhost:5173/resetPassword/${unHashedToken} <br/> but if this request is not from you, you dont have to anything!`
    })

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {},
          "Password reset mail has been sent on your email"
        )
      )
});

export const resetForgottenPassword = asyncHandler(async (req, res)=>{
    const {resetToken} = req.params;
    const {newPassword} = req.body;

    // Create a hash of the incoming reset token
    let hashedToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex')

        // See if user with hash simplar to resetToken exists
        // If yse then check if token expiry is greater than current date

    const user = await User.findOne({
      forgotPasswordToken: hashedToken,
      forgotPasswordExpiry: {$gt: Date.now()}
    });

    // if either of the one is false that means the token is invalid or expired
    if (!user){
      res.status(489).json({
        message:"Token is invalid or expired"
      })
    }

    // if everything is ok and token id valid
    // reset the forgot password token and expiry
    user.password = newPassword;
    await user.save({validateBeforeSave:false});
    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Password reset successfully"));
});