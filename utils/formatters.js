/**
 * Format bytes to human readable string (KB, MB, GB)
 */
function formatBytes(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Format date to human-readable string
 */
function formatDate(date) {
  if (!date) return 'Never';
  const d = new Date(date);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Check if a date is expired
 */
function isExpired(date) {
  if (!date) return false;
  return new Date(date).getTime() < Date.now();
}

/**
 * Get category & icon type based on mimetype
 */
function getFileType(mimetype = '') {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype.includes('pdf')) return 'pdf';
  if (mimetype.includes('zip') || mimetype.includes('tar') || mimetype.includes('compressed') || mimetype.includes('7z') || mimetype.includes('rar')) return 'archive';
  if (mimetype.includes('text/') || mimetype.includes('javascript') || mimetype.includes('json') || mimetype.includes('xml')) return 'code';
  if (mimetype.includes('word') || mimetype.includes('officedocument') || mimetype.includes('msword')) return 'doc';
  if (mimetype.includes('excel') || mimetype.includes('spreadsheet') || mimetype.includes('csv')) return 'sheet';
  return 'file';
}

module.exports = {
  formatBytes,
  formatDate,
  isExpired,
  getFileType,
};
