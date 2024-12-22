const passport = require('passport');
const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');
const { roleRights } = require('../config/roles');
const { tokenTypes } = require('../config/tokens');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const { Token } = require('../models');

const verifyCallback = (req, resolve, reject, requiredRights) => async (err, user, info) => {
  console.log("err, user, info",err, user, info);
  
  if (err || info || !user) {
    return reject(new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate'));
  }
  req.user = user;

  if (requiredRights.length) {
    const userRights = roleRights.get(user.role);
    const hasRequiredRights = requiredRights.every((requiredRight) => userRights.includes(requiredRight));
    if (!hasRequiredRights && req.params.userId !== user.id) {
      return reject(new ApiError(httpStatus.FORBIDDEN, 'Forbidden'));
    }
  }

  resolve();
};

const auth = (...requiredRights) => async (req, res, next) => {
  console.log("req.user ====>>>",req.user);
  console.log("requiredRights ====>>>",requiredRights);
  
  return new Promise((resolve, reject) => {
    passport.authenticate('jwt', { session: false }, verifyCallback(req, resolve, reject, requiredRights))(req, res, next);
  })
    .then(() => next())
    .catch((err) => next(err));
};

const verifyToken = () => async (req, res, next) => {
  const token = req.headers.authorization;
  console.log("token ====>>>",token, config.jwt.secret);
  
  if (!token) {
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate'));
  }
  try {
    const payload = jwt.verify(token, config.jwt.secret);
    
    const tokenDoc = await Token.findOne({ token, type: tokenTypes.REFRESH, user: payload.sub, blacklisted: false });
    if (!tokenDoc) {
      return next(new ApiError(httpStatus.UNAUTHORIZED, 'Token not found'));
    }
    req.user = payload.sub;
    next();
  } catch (error) {
    console.log("error ====>>>",error);
    
    return next(new ApiError(httpStatus.UNAUTHORIZED, error.message));
  }
};

module.exports = {auth, verifyToken};
