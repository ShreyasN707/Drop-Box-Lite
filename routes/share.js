const express = require('express');
const router = express.Router();
const File = require('../models/File');
const { formatBytes, formatDate, isExpired, getFileType } = require('../utils/formatters');
const { optionalAuth } = require('../middleware/auth');

router.use(optionalAuth);

/**
 * GET /s/:token
 * Landing page for expiring download link
 */
router.get('/s/:token', async (req, res) => {
  try {
    const { token } = req.params;
    const file = await File.findOne({ 'shareLinks.token': token }).populate('owner', 'name');

    if (!file) {
      return res.status(404).render('error', {
        title: 'Link Not Found',
        message: 'This download link does not exist or has been removed.',
        status: 404,
      });
    }

    const shareLink = file.shareLinks.find((l) => l.token === token);
    if (!shareLink) {
      return res.status(404).render('error', {
        title: 'Link Not Found',
        message: 'Share link not found.',
        status: 404,
      });
    }

    const expired = isExpired(shareLink.expiresAt);

    res.render('public-download', {
      title: `${file.originalName} - DropBox Lite Share`,
      file,
      shareLink,
      isExpired: expired,
      isExpiringLink: true,
      downloadUrl: `/s/${token}/download`,
      formatBytes,
      formatDate,
      getFileType,
      error: req.query.error || null,
      success: req.query.success || null,
    });
  } catch (err) {
    console.error('Share link page error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to process share link.',
      status: 500,
    });
  }
});

/**
 * GET /s/:token/download
 * Direct download for expiring link with download tracking
 */
router.get('/s/:token/download', async (req, res) => {
  try {
    const { token } = req.params;
    const file = await File.findOne({ 'shareLinks.token': token });

    if (!file) {
      return res.status(404).render('error', {
        title: 'Link Not Found',
        message: 'This download link does not exist or has been removed.',
        status: 404,
      });
    }

    const shareLink = file.shareLinks.find((l) => l.token === token);
    if (!shareLink || isExpired(shareLink.expiresAt)) {
      return res.status(410).render('error', {
        title: 'Link Expired',
        message: 'This download link has expired and is no longer valid.',
        status: 410,
      });
    }

    // Update tracking
    file.downloadCount += 1;
    file.lastDownloadedAt = new Date();
    shareLink.downloads += 1;
    await file.save();

    res.download(file.path, file.originalName, (err) => {
      if (err && !res.headersSent) {
        console.error('Share download stream error:', err);
        res.status(500).render('error', {
          title: 'Download Failed',
          message: 'Error streaming file.',
          status: 500,
        });
      }
    });
  } catch (err) {
    console.error('Share link download error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to download file.',
      status: 500,
    });
  }
});

/**
 * GET /f/:id
 * Landing page for public file link
 */
router.get('/f/:id', async (req, res) => {
  try {
    const file = await File.findById(req.params.id).populate('owner', 'name');

    if (!file) {
      return res.status(404).render('error', {
        title: 'File Not Found',
        message: 'The requested file was not found.',
        status: 404,
      });
    }

    if (!file.isPublic) {
      return res.status(403).render('error', {
        title: 'Access Denied',
        message: 'This file is private and cannot be accessed publicly.',
        status: 403,
      });
    }

    res.render('public-download', {
      title: `${file.originalName} - Public File`,
      file,
      shareLink: null,
      isExpired: false,
      isExpiringLink: false,
      downloadUrl: `/f/${file._id}/download`,
      formatBytes,
      formatDate,
      getFileType,
      error: req.query.error || null,
      success: req.query.success || null,
    });
  } catch (err) {
    console.error('Public file view error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to retrieve public file.',
      status: 500,
    });
  }
});

/**
 * GET /f/:id/download
 * Public download endpoint with download tracking
 */
router.get('/f/:id/download', async (req, res) => {
  try {
    const file = await File.findById(req.params.id);

    if (!file) {
      return res.status(404).render('error', {
        title: 'File Not Found',
        message: 'The requested file was not found.',
        status: 404,
      });
    }

    if (!file.isPublic) {
      return res.status(403).render('error', {
        title: 'Forbidden',
        message: 'This file is private.',
        status: 403,
      });
    }

    // Update tracking
    file.downloadCount += 1;
    file.lastDownloadedAt = new Date();
    await file.save();

    res.download(file.path, file.originalName, (err) => {
      if (err && !res.headersSent) {
        console.error('Public download stream error:', err);
        res.status(500).render('error', {
          title: 'Download Failed',
          message: 'Error streaming file.',
          status: 500,
        });
      }
    });
  } catch (err) {
    console.error('Public download error:', err);
    res.status(500).render('error', {
      title: 'Error',
      message: 'Failed to download public file.',
      status: 500,
    });
  }
});

module.exports = router;
