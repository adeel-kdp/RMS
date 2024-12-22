const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const mongoose = require('mongoose');

const { authService, userService, tokenService, emailService } = require('../services');

const register = catchAsync(async (req, res) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const user = await userService.createUser(req.body, { session });
      await emailService.sendVerificationEmail(user.email, user.name, await tokenService.generateVerifyEmailToken(user), { session });
      const tokens = await tokenService.generateAuthTokens(user, { session });
      res.status(httpStatus.CREATED).send({ user, tokens });
    });
  } finally {
    await session.endSession();
  }
});

const login = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.loginUserWithEmailAndPassword(email, password, "user");
  const tokens = await tokenService.generateAuthTokens(user);
  res.send({ user, tokens });
});

const adminLogin = catchAsync(async (req, res) => {
  const { email, password } = req.body;
  const user = await authService.loginUserWithEmailAndPassword(email, password, "admin");
  const tokens = await tokenService.generateAuthTokens(user);
  res.send({ user, tokens });
});

const logout = catchAsync(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await authService.refreshAuth(req.body.refreshToken);
  res.send({ ...tokens });
});

const forgotPassword = catchAsync(async (req, res) => {
  const resetPasswordToken = await tokenService.generateResetPasswordToken(req.body.email);
  await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const resetPassword = catchAsync(async (req, res) => {
  await authService.resetPassword(req.query.token, req.body.password);
  res.status(httpStatus.NO_CONTENT).send();
});

// on signup, send verification email
const sendVerificationEmail = catchAsync(async (req, res) => {
  const verifyEmailToken = await tokenService.generateVerifyEmailToken(req.user);
  await emailService.sendVerificationEmail(req.user.email, verifyEmailToken);
  res.status(httpStatus.NO_CONTENT).send();
});

const verifyEmail = catchAsync(async (req, res) => {
  console.log("req.query.token ====>>>",req.query.token);
  
  await authService.verifyEmail(req.query.token);
  res.redirect("https://gamming-charecter.vercel.app/");
});

const updatePassword = catchAsync(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await authService.updatePassword(req.user, oldPassword, newPassword);
  res.send(user);
});

module.exports = {
  register,
  login,
  adminLogin,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  sendVerificationEmail,
  verifyEmail,
  updatePassword,
};
