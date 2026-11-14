const User = require('../models/User');

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

async function optionalAuth(req, res, next) {
  if (req.session && req.session.userId) {
    try {
      const user = await User.findById(req.session.userId);
      if (user) {
        req.user = user;
        res.locals.currentUser = user;
      }
    } catch (err) {
    }
  }
  next();
}

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
