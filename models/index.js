const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: {type: String, default: ''},
  age: {type: Number, default: null},
  phone: {type: String, unique: true},
  isProfileSetup: {type: Boolean, default: false}
});

const FolderSchema = new mongoose.Schema({
  name: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

const ImageBlobSchema = new mongoose.Schema({
  data: Buffer,
  contentType: String,
});

const ImageFileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  folder: { type: mongoose.Schema.Types.ObjectId, ref: 'Folder' },
  blob: { type: mongoose.Schema.Types.ObjectId, ref: 'ImageBlob', required: true }
});

const ImageBlob = mongoose.model('ImageBlob', ImageBlobSchema);
const ImageFile = mongoose.model('ImageFile', ImageFileSchema);
const Folder = mongoose.model('Folder', FolderSchema);
const User = mongoose.model('User', UserSchema);

module.exports = { ImageBlob, ImageFile, Folder, User };