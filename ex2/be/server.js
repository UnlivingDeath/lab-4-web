const crypto = require('crypto');
const cors = require('cors');
const express = require('express');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = 5001;
const UPLOAD_DIR = path.join(__dirname, 'uploads');
const allowedTypes = new Set(['image/jpeg', 'image/png', 'image/webp']);
const extensionsByType = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(cors());
app.use('/uploads', express.static(UPLOAD_DIR));

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => callback(null, UPLOAD_DIR),
  filename: (_req, file, callback) => {
    const extension = extensionsByType[file.mimetype];
    callback(null, `avatar-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (allowedTypes.has(file.mimetype)) {
      return callback(null, true);
    }
    const error = new Error('Only image files are accepted (JPG, PNG, WEBP).');
    error.status = 400;
    callback(error);
  }
});

function publicFileUrls(req, filename) {
  const encodedName = encodeURIComponent(filename);
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return {
    viewUrl: `${baseUrl}/uploads/${encodedName}`,
    downloadUrl: `${baseUrl}/api/v1/download/${encodedName}`
  };
}

app.post('/api/v1/upload-avatar', upload.single('avatar'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, message: 'Please choose an image file!' });
  }

  const urls = publicFileUrls(req, req.file.filename);
  res.status(201).json({
    success: true,
    message: 'Image uploaded successfully',
    fileInfo: {
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      url: urls.viewUrl
    }
  });
});

app.get('/api/v1/files', async (req, res) => {
  const filenames = await fs.promises.readdir(UPLOAD_DIR);
  const files = await Promise.all(filenames.map(async (name) => {
    const filePath = path.join(UPLOAD_DIR, name);
    const stats = await fs.promises.stat(filePath);
    if (!stats.isFile()) return null;
    return { name, size: stats.size, ...publicFileUrls(req, name) };
  }));
  res.json({ success: true, data: files.filter(Boolean) });
});

app.get('/api/v1/download/:filename', async (req, res, next) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(UPLOAD_DIR, filename);
  try {
    const stats = await fs.promises.stat(filePath);
    if (!stats.isFile()) {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }
    res.download(filePath, filename, (error) => {
      if (error && !res.headersSent) next(error);
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }
    next(error);
  }
});

app.delete('/api/v1/files/:filename', async (req, res, next) => {
  const filename = path.basename(req.params.filename);
  const filePath = path.join(UPLOAD_DIR, filename);
  try {
    await fs.promises.unlink(filePath);
    res.json({ success: true, message: 'File deleted successfully.' });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ success: false, message: 'File not found.' });
    }
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'The file is too large (max 2 MB)!'
      : error.message;
    return res.status(400).json({ success: false, message });
  }
  res.status(error.status || 500).json({
    success: false,
    message: error.status ? error.message : 'An unexpected server error occurred.'
  });
});

app.listen(PORT, () => {
  console.log(`Upload server running at http://localhost:${PORT}`);
});
