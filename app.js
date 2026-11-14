const express = require('express');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const fileRoutes = require('./routes/files');
const shareRoutes = require('./routes/share');
const { optionalAuth } = require('./middleware/auth');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const mongoUrl = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dropbox_lite';
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dropbox-lite-secret-key-default',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl,
      ttl: 14 * 24 * 60 * 60,
    }),
    cookie: {
      httpOnly: true,
      maxAge: 14 * 24 * 60 * 60 * 1000,
    },
  })
);

app.use(optionalAuth);

app.get('/', (req, res) => {
  if (req.session && req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.redirect('/login');
});

app.use('/', authRoutes);
app.use('/', shareRoutes);
app.use('/', fileRoutes);

app.use((req, res) => {
  res.status(404).render('error', {
    title: 'Page Not Found',
    message: 'The page you requested could not be found.',
    status: 404,
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled application error:', err);
  res.status(500).render('error', {
    title: 'Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected internal error occurred.' : err.message,
    status: 500,
  });
});

module.exports = app;
