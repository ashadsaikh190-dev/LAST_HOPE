const { sendError } = require('../utils/responseHandler');

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return sendError(
        res,
        `User role '${req.user?.role || 'ANONYMOUS'}' is not authorized to access this resource`,
        403,
        'AUTHORIZATION_ERROR'
      );
    }
    next();
  };
};

module.exports = {
  authorize,
};
