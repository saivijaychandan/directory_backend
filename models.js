const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const FolderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const ImageBlobSchema = new mongoose.Schema({
  data: Buffer,
  contentType: String,
  // Optional: A hash (md5) could go here to prevent duplicate uploads entirely
});

// 2. The Lightweight Pointer (The "File")
const ImageFileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  folder: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder' },
  
  // THE LINK: Points to the centralized blob
  blob: { type: mongoose.Schema.Types.ObjectId, ref: 'ImageBlob', required: true } 
});

const ImageBlob = mongoose.model('ImageBlob', ImageBlobSchema);
const ImageFile = mongoose.model('ImageFile', ImageFileSchema);
const Folder = mongoose.model('Folder', FolderSchema);
const User = mongoose.model('User', UserSchema);

module.exports = { ImageBlob, ImageFile, Folder, User };