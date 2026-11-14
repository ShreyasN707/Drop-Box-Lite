const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const crypto = require('crypto');
const File = require('../models/File');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');
const { upload, maxFileSizeMb } = require('../middleware/upload');
const { formatBytes, formatDate, isExpired, getFileType } = require('../utils/formatters');

// All routes in this router require authentication
router.use(requireAuth);

/**
 * GET /dashboard
 * Show user files, shared files, and storage usage
 */
router.get('/dashboard', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    // Get files owned by user
    const myFiles = await File.find({ owner: user._id }).sort({ createdAt: -1 });

    // Get files shared with user
    const sharedFiles = await File.find({ 'sharedWith.user': user._id })
      .populate('owner', 'name email')
      .sort({ createdAt: -1 });

    const quota = user.storageQuota || 50 * 1024 * 1024;
    const used = user.storageUsed || 0;
    const percentage = Math.min(100, Math.round((used / quota) * 100));

    res.render('dashboard', {
      title: 'My Storage - DropBox Lite',
      user,
      myFiles,
      sharedFiles,
      quotaUsedFormatted: formatBytes(used),
      quotaTotalFormatted: formatBytes(quota),
      quotaPercentage: percentage,
      maxFileSizeMb,
      formatBytes,
      formatDate,
      getFileType,
      error: req.query.error || null,
      success: req.query.success || null,
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).render('error', {
      title: 'Error - DropBox Lite',
      message: 'Failed to load dashboard. Please try again.',
      status: 500,
    });
  }
});

/**
 * POST /files/upload
 * Handle file upload with Multer and enforce storage quota
 */
router.post('/files/upload', (req, res) => {
  const uploadSingle = upload.single('file');

  uploadSingle(req, res, async function (err) {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.redirect(`/dashboard?error=File is too large! Maximum allowed size is ${maxFileSizeMb} MB.`);
      }
      return res.redirect(`/dashboard?error=${encodeURIComponent(err.message || 'File upload failed.')}`);
    }

    if (!req.file) {
      return res.redirect('/dashboard?error=Please select a file to upload.');
    }

    try {
      const user = await User.findById(req.user._id);
      const remainingQuota = user.storageQuota - user.storageUsed;

      // Check if file fits in user storage quota
      if (req.file.size > remainingQuota) {
        // Clean up uploaded file
        try {
          await fs.unlink(req.file.path);
        } catch (unlinkErr) {
          console.error('Failed to remove temp file after quota exceeded:', unlinkErr);
        }
        return res.redirect(
          `/dashboard?error=Storage quota exceeded! You have ${formatBytes(Math.max(0, remainingQuota))} remaining, but the file is ${formatBytes(req.file.size)}.`
        );
      }

      // Save file metadata
      const newFile = new File({
        originalName: req.file.originalname,
        filename: req.file.filename,
        path: req.file.path,
        mimetype: req.file.mimetype,
        size: req.file.size,
        owner: user._id,
      });

      await newFile.save();

      // Update user storage quota
      user.storageUsed += req.file.size;
      await user.save();

      res.redirect(`/dashboard?success=File "${encodeURIComponent(newFile.originalName)}" uploaded successfully!`);
    } catch (saveErr) {
      console.error('File save error:', saveErr);
      if (req.file && req.file.path) {
        try {
          await fs.unlink(req.file.path);
        } catch (_) {}
      }
      res.redirect('/dashboard?error=An error occurred while saving the file metadata.');
    }
  });
});

/**
 * GET /files/:id
 * View file details and sharing configuration
 */
router.get('/files/:id', async (req, res) => {
  try {
    const file = await File.findById(req.params.id).populate('owner', 'name email');
    if (!file) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'The requested file was not found.',
        status: 404,
      });
    }

    const isOwner = file.owner._id.toString() === req.user._id.toString();
    const isShared = file.sharedWith.some((s) => s.user.toString() === req.user._id.toString());

    if (!isOwner && !isShared && !file.isPublic) {
      return res.status(403).render('error', {
        title: 'Access Denied',
        message: 'You do not have permission to view this file.',
        status: 403,
      });
    }

    const host = req.get('host');
    const protocol = req.protocol;
    const baseUrl = `${protocol}://${host}`;

    res.render('file-details', {
      title: `${file.originalName} - File Details`,
      file,
      isOwner,
      isShared,
      baseUrl,
      formatBytes,
      formatDate,
      isExpired,
      getFileType,
      error: req.query.error || null,
      success: req.query.success || null,
    });
  } catch (err) {
    console.error('File details error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to retrieve file details.',
      status: 500,
    });
  }
});

/**
 * GET /files/:id/download
 * Download file directly with permission check and download tracking
 */
router.get('/files/:id/download', async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.status(404).render('error', {
        title: 'Not Found',
        message: 'File not found.',
        status: 404,
      });
    }

    // Permission check
    const isOwner = file.owner.toString() === req.user._id.toString();
    const isShared = file.sharedWith.some((s) => s.user.toString() === req.user._id.toString());

    if (!file.isPublic && !isOwner && !isShared) {
      return res.status(403).render('error', {
        title: 'Forbidden',
        message: 'You do not have permission to download this file.',
        status: 403,
      });
    }

    // Track download
    file.downloadCount += 1;
    file.lastDownloadedAt = new Date();
    await file.save();

    res.download(file.path, file.originalName, (err) => {
      if (err && !res.headersSent) {
        console.error('Download stream error:', err);
        res.status(500).render('error', {
          title: 'Download Failed',
          message: 'Error streaming the file from disk.',
          status: 500,
        });
      }
    });
  } catch (err) {
    console.error('Download error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to initiate download.',
      status: 500,
    });
  }
});

/**
 * POST /files/:id/delete
 * Delete file from disk, update quota, remove record
 */
router.post('/files/:id/delete', async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) {
      return res.redirect('/dashboard?error=File not found.');
    }

    // Only owner can delete
    if (file.owner.toString() !== req.user._id.toString()) {
      return res.redirect('/dashboard?error=You are not authorized to delete this file.');
    }

    // Remove file on disk
    try {
      await fs.unlink(file.path);
    } catch (fsErr) {
      console.warn('File already deleted or missing on disk:', fsErr.message);
    }

    // Decrement user storage
    const user = await User.findById(req.user._id);
    user.storageUsed = Math.max(0, user.storageUsed - file.size);
    await user.save();

    // Remove file record
    await File.findByIdAndDelete(file._id);

    res.redirect('/dashboard?success=File deleted successfully.');
  } catch (err) {
    console.error('File delete error:', err);
    res.redirect('/dashboard?error=Failed to delete file.');
  }
});

/**
 * POST /files/:id/toggle-public
 * Toggle public / private status
 */
router.post('/files/:id/toggle-public', async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.redirect('/dashboard?error=File not found.');

    if (file.owner.toString() !== req.user._id.toString()) {
      return res.redirect(`/files/${file._id}?error=Permission denied.`);
    }

    file.isPublic = !file.isPublic;
    await file.save();

    const statusText = file.isPublic ? 'public' : 'private';
    res.redirect(`/files/${file._id}?success=File is now ${statusText}.`);
  } catch (err) {
    console.error('Toggle public error:', err);
    res.redirect(`/files/${req.params.id}?error=Failed to toggle visibility.`);
  }
});

/**
 * POST /files/:id/share-user
 * Grant read/download access to another user by email
 */
router.post('/files/:id/share-user', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.redirect(`/files/${req.params.id}?error=Please provide an email address.`);
    }

    const file = await File.findById(req.params.id);
    if (!file) return res.redirect('/dashboard?error=File not found.');

    if (file.owner.toString() !== req.user._id.toString()) {
      return res.redirect(`/files/${file._id}?error=Only the file owner can manage sharing.`);
    }

    const cleanEmail = email.toLowerCase().trim();
    const targetUser = await User.findOne({ email: cleanEmail });

    if (!targetUser) {
      return res.redirect(`/files/${file._id}?error=No user found with email "${cleanEmail}".`);
    }

    if (targetUser._id.toString() === req.user._id.toString()) {
      return res.redirect(`/files/${file._id}?error=You cannot share a file with yourself.`);
    }

    const alreadyShared = file.sharedWith.some((s) => s.user.toString() === targetUser._id.toString());
    if (alreadyShared) {
      return res.redirect(`/files/${file._id}?error=File is already shared with ${cleanEmail}.`);
    }

    file.sharedWith.push({
      user: targetUser._id,
      email: targetUser.email,
    });
    await file.save();

    res.redirect(`/files/${file._id}?success=File successfully shared with ${cleanEmail}.`);
  } catch (err) {
    console.error('Share with user error:', err);
    res.redirect(`/files/${req.params.id}?error=Failed to share file.`);
  }
});

/**
 * POST /files/:id/unshare-user
 * Revoke file access from a specific user
 */
router.post('/files/:id/unshare-user', async (req, res) => {
  try {
    const { userId } = req.body;
    const file = await File.findById(req.params.id);
    if (!file) return res.redirect('/dashboard?error=File not found.');

    if (file.owner.toString() !== req.user._id.toString()) {
      return res.redirect(`/files/${file._id}?error=Only the owner can revoke access.`);
    }

    file.sharedWith = file.sharedWith.filter((s) => s.user.toString() !== userId);
    await file.save();

    res.redirect(`/files/${file._id}?success=Access revoked successfully.`);
  } catch (err) {
    console.error('Unshare user error:', err);
    res.redirect(`/files/${req.params.id}?error=Failed to revoke access.`);
  }
});

/**
 * POST /files/:id/create-share-link
 * Generate a new expiring download link
 */
router.post('/files/:id/create-share-link', async (req, res) => {
  try {
    const { duration } = req.body; // e.g. "15m", "1h", "24h", "7d"
    const file = await File.findById(req.params.id);
    if (!file) return res.redirect('/dashboard?error=File not found.');

    if (file.owner.toString() !== req.user._id.toString()) {
      return res.redirect(`/files/${file._id}?error=Only the owner can create expiring links.`);
    }

    let durationMs = 24 * 60 * 60 * 1000; // default 24h
    switch (duration) {
      case '15m':
        durationMs = 15 * 60 * 1000;
        break;
      case '1h':
        durationMs = 60 * 60 * 1000;
        break;
      case '6h':
        durationMs = 6 * 60 * 60 * 1000;
        break;
      case '24h':
        durationMs = 24 * 60 * 60 * 1000;
        break;
      case '7d':
        durationMs = 7 * 24 * 60 * 60 * 1000;
        break;
      default:
        durationMs = 24 * 60 * 60 * 1000;
    }

    const token = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + durationMs);

    file.shareLinks.push({
      token,
      expiresAt,
      createdAt: new Date(),
      downloads: 0,
    });

    await file.save();

    res.redirect(`/files/${file._id}?success=Expiring download link generated successfully.`);
  } catch (err) {
    console.error('Create share link error:', err);
    res.redirect(`/files/${req.params.id}?error=Failed to generate share link.`);
  }
});

/**
 * POST /files/:id/revoke-share-link
 * Revoke an existing expiring share link
 */
router.post('/files/:id/revoke-share-link', async (req, res) => {
  try {
    const { token } = req.body;
    const file = await File.findById(req.params.id);
    if (!file) return res.redirect('/dashboard?error=File not found.');

    if (file.owner.toString() !== req.user._id.toString()) {
      return res.redirect(`/files/${file._id}?error=Only the owner can revoke share links.`);
    }

    file.shareLinks = file.shareLinks.filter((link) => link.token !== token);
    await file.save();

    res.redirect(`/files/${file._id}?success=Share link revoked.`);
  } catch (err) {
    console.error('Revoke share link error:', err);
    res.redirect(`/files/${req.params.id}?error=Failed to revoke share link.`);
  }
});

module.exports = router;
