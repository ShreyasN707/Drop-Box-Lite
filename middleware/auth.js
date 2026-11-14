const User = require('../models/User');

/**
 * Require user to be logged in
 */
async function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    req.session.returnTo = req.originalUrl;
    return res.redirect('/login?error=Please log in to continue');
  }

  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      req.session.destroy();
      return res.redirect('/login?error=Session expired. Please log in again.');
    }
    req.user = user;
    res.locals.currentUser = user;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err);
    res.redirect('/login?error=An error occurred while verifying your session.');
  }
}

/**
 * Optional authentication: populates res.locals.currentUser if logged in
 */
async function optionalAuth(req, res, next) {
  if (req.session && req.session.userId) {
    try {
      const user = await User.findById(req.session.userId);
      if (user) {
        req.user = user;
        res.locals.currentUser = user;
      }
    } catch (err) {
      // ignore
    }
  }
  next();
}

/**
 * Guest only: redirect to dashboard if already logged in
 */
function requireGuest(req, res, next) {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  next();
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireGuest,
};
