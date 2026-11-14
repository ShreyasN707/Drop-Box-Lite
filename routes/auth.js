const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { requireGuest } = require('../middleware/auth');

router.get('/login', requireGuest, (req, res) => {
  res.render('auth/login', {
    title: 'Sign In - DropBox Lite',
    error: req.query.error || null,
    success: req.query.success || null,
  });
});

router.post('/login', requireGuest, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.render('auth/login', {
        title: 'Sign In - DropBox Lite',
        error: 'Email and password are required',
        success: null,
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.render('auth/login', {
        title: 'Sign In - DropBox Lite',
        error: 'Invalid email or password',
        success: null,
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.render('auth/login', {
        title: 'Sign In - DropBox Lite',
        error: 'Invalid email or password',
        success: null,
      });
    }

    req.session.userId = user._id;
    const returnTo = req.session.returnTo || '/dashboard';
    delete req.session.returnTo;
    res.redirect(returnTo);
  } catch (err) {
    console.error('Login error:', err);
    res.render('auth/login', {
      title: 'Sign In - DropBox Lite',
      error: 'An unexpected error occurred. Please try again.',
      success: null,
    });
  }
});

router.get('/register', requireGuest, (req, res) => {
  res.render('auth/register', {
    title: 'Create Account - DropBox Lite',
    error: req.query.error || null,
    success: req.query.success || null,
  });
});

router.post('/register', requireGuest, async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    if (!name || !email || !password) {
      return res.render('auth/register', {
        title: 'Create Account - DropBox Lite',
        error: 'All fields are required',
        success: null,
      });
    }

    if (password.length < 6) {
      return res.render('auth/register', {
        title: 'Create Account - DropBox Lite',
        error: 'Password must be at least 6 characters long',
        success: null,
      });
    }

    if (password !== confirmPassword) {
      return res.render('auth/register', {
        title: 'Create Account - DropBox Lite',
        error: 'Passwords do not match',
        success: null,
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.render('auth/register', {
        title: 'Create Account - DropBox Lite',
        error: 'An account with this email already exists',
        success: null,
      });
    }

    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
    });
    await user.save();

    req.session.userId = user._id;
    res.redirect('/dashboard?success=Account created successfully! Welcome to DropBox Lite.');
  } catch (err) {
    console.error('Registration error:', err);
    res.render('auth/register', {
      title: 'Create Account - DropBox Lite',
      error: 'Registration failed. Please try again.',
      success: null,
    });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/login?success=You have logged out successfully');
  });
});

router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    }
    res.redirect('/login?success=You have logged out successfully');
  });
});

module.exports = router;
