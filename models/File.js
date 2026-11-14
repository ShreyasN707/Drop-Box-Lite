const mongoose = require('mongoose');

const shareLinkSchema = new mongoose.Schema({
  token: {
    type: String,
    required: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  downloads: {
    type: Number,
    default: 0,
  },
});

const sharedUserSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

const fileSchema = new mongoose.Schema(
  {
    originalName: {
      type: String,
      required: true,
      trim: true,
    },
    filename: {
      type: String,
      required: true,
      unique: true,
    },
    path: {
      type: String,
      required: true,
    },
    mimetype: {
      type: String,
      default: 'application/octet-stream',
    },
    size: {
      type: Number,
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    isPublic: {
      type: Boolean,
      default: false,
    },
    sharedWith: [sharedUserSchema],
    shareLinks: [shareLinkSchema],
    downloadCount: {
      type: Number,
      default: 0,
    },
    lastDownloadedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

fileSchema.methods.canAccess = function (userId) {
  if (this.isPublic) return true;
  if (!userId) return false;
  if (this.owner.toString() === userId.toString()) return true;
  return this.sharedWith.some((s) => s.user.toString() === userId.toString());
};

module.exports = mongoose.model('File', fileSchema);
