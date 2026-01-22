const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const { Folder, User, ImageFile, ImageBlob } = require('./models');
const authMiddleware = require('./middleware');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch(err => console.log(err));

app.use(express.json());
app.use(cors());

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

async function getUniqueFolderName(model, fieldName, desiredName, filter = {}) {
  const escapedName = escapeRegex(desiredName);
  const regex = new RegExp(`^${escapedName}( \\(\\d+\\))?$`);

  const duplicates = await model.find({ 
    [fieldName]: { $regex: regex }, 
    ...filter 
  });

  if (duplicates.length === 0) return desiredName;

  let maxNumber = 0;
  duplicates.forEach(doc => {
    const name = doc[fieldName];
    if (name === desiredName) {
    } else {
        const match = name.match(/ \((\d+)\)$/);
        if (match) {
            const num = parseInt(match[1]);
            if (num > maxNumber) maxNumber = num;
        }
    }
  });

  return `${desiredName} (${maxNumber + 1})`;
}

async function getUniqueFileName(model, folderId, originalName) {
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
  
    const escapedBase = escapeRegex(baseName);
    const escapedExt = escapeRegex(extension);
  
    const regex = new RegExp(`^${escapedBase}( \\(\\d+\\))?${escapedExt}$`);
  
    const duplicates = await model.find({ 
      folder: folderId, 
      name: { $regex: regex } 
    });
  
    if (duplicates.length === 0) return originalName;
  
    let maxNumber = 0;
    
    duplicates.forEach(doc => {
      const currentName = doc.name;
      if (currentName === originalName) return; 
  
      const nameNoExt = path.basename(currentName, extension);
      const match = nameNoExt.match(/ \((\d+)\)$/);
      if (match) {
        const num = parseInt(match[1]);
        if (num > maxNumber) maxNumber = num;
      }
    });
  
    return `${baseName} (${maxNumber + 1})${extension}`;
  }

app.post('/api/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!password || password.length < 6) {
        return res.status(400).json({ msg: "Password too short" });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(username)) {
        return res.status(400).json({ msg: "Username must be a valid email address." });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) return res.status(400).json({ msg: "User already exists" });

    await User.create({ username, password });
    res.json({ message: "User created" });

  } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (!user || user.password !== password) return res.status(400).json({ msg: "Invalid credentials" });
    const token = jwt.sign({ user: { id: user.id } }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) { res.status(500).send(err.message); }
});

app.get('/api/folders', authMiddleware, async (req, res) => {
  try {
    const folders = await Folder.find({ user: req.user.id });
    res.json(folders);
  } catch (err) { res.status(500).send(err.message); }
});

app.get('/api/folders/:id', authMiddleware, async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) return res.status(404).json({ msg: "Folder not found" });
    res.json(folder);
  } catch (err) { res.status(500).send("Server Error"); }
});

app.post('/api/folders', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    const uniqueName = await getUniqueFolderName(Folder, 'name', name, { user: req.user.id });
    const newFolder = await Folder.create({ name: uniqueName, user: req.user.id });
    res.json(newFolder);
  } catch (err) { res.status(500).send(err.message); }
});

app.put('/api/folders/:id', authMiddleware, async (req, res) => {
  try {
    const { name } = req.body;
    const uniqueName = await getUniqueFolderName(Folder, 'name', name, { user: req.user.id });
    const updatedFolder = await Folder.findByIdAndUpdate(req.params.id, { name: uniqueName }, { new: true });
    res.json(updatedFolder);
  } catch (err) { res.status(500).send(err.message); }
});

app.delete('/api/folders/:id', authMiddleware, async (req, res) => {
  try {
    const files = await ImageFile.find({ folder: req.params.id });
    for (const file of files) {
       const blobId = file.blob;
       await ImageFile.findByIdAndDelete(file._id);
       const remaining = await ImageFile.countDocuments({ blob: blobId });
       if (remaining === 0) await ImageBlob.findByIdAndDelete(blobId);
    }
    await Folder.findByIdAndDelete(req.params.id);
    res.json({ message: "Folder and contents deleted" });
  } catch (err) { res.status(500).send(err.message); }
});

app.get('/api/folders/:folderId/images', authMiddleware, async (req, res) => {
  try {
    const images = await ImageFile.find({ folder: req.params.folderId });
    res.json(images);
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/images', authMiddleware, upload.single('imageFile'), async (req, res) => {
  try {
    const { folderId } = req.body;
    const originalName = req.file.originalname;

    const newBlob = new ImageBlob({
      data: req.file.buffer,
      contentType: req.file.mimetype
    });
    const savedBlob = await newBlob.save();

    const uniqueFileName = await getUniqueFileName(ImageFile, folderId, originalName);
    
    const newFile = new ImageFile({
      name: uniqueFileName,
      folder: folderId,
      blob: savedBlob._id 
    });

    await newFile.save();
    res.json(newFile);
  } catch (err) { res.status(500).send("Server Error"); }
});

app.get('/api/images/:id', async (req, res) => {
  try {
    const file = await ImageFile.findById(req.params.id);
    if (!file) return res.status(404).send("File not found");
    const blob = await ImageBlob.findById(file.blob);
    if (!blob) return res.status(404).send("Data corrupted or missing");

    res.set('Content-Type', blob.contentType);
    res.send(blob.data);
  } catch (err) { res.status(500).send(err.message); }
});

app.put('/api/images/:id', authMiddleware, async (req, res) => {
  try {
    const image = await ImageFile.findById(req.params.id);
    if (!image) return res.status(404).send("Image not found");
    
    const newName = req.body.name;
    const uniqueName = await getUniqueFileName(ImageFile, image.folder, newName);

    image.name = uniqueName;
    await image.save();
    res.json(image);
  } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/images/:id/copy', authMiddleware, async (req, res) => {
  try {
    const { targetFolderId } = req.body;
    const originalFile = await ImageFile.findById(req.params.id);
    if (!originalFile) return res.status(404).send("File not found");

    const destFolderId = targetFolderId || originalFile.folder;

    const newName = await getUniqueFileName(ImageFile, destFolderId, originalFile.name);

    const newFile = new ImageFile({
      name: newName,
      folder: destFolderId,
      blob: originalFile.blob
    });

    await newFile.save();
    res.json(newFile);

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.put('/api/images/:id/move', authMiddleware, async (req, res) => {
  try {
    const { targetFolderId } = req.body;
    const file = await ImageFile.findById(req.params.id);
    
    if (!file) return res.status(404).send("File not found");
    if (!targetFolderId) return res.status(400).send("Target folder required");

    const uniqueName = await getUniqueFileName(ImageFile, targetFolderId, file.name);

    file.folder = targetFolderId;
    file.name = uniqueName;
    
    await file.save();
    res.json(file);

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

app.delete('/api/images/:id', authMiddleware, async (req, res) => {
  try {
    const file = await ImageFile.findById(req.params.id);
    if (!file) return res.status(404).send("File not found");
    
    const blobId = file.blob;
    await ImageFile.findByIdAndDelete(req.params.id);
    
    const remainingUsers = await ImageFile.countDocuments({ blob: blobId });

    if (remainingUsers === 0) {
      await ImageBlob.findByIdAndDelete(blobId);
      console.log("Blob deleted (No more references)");
    } else {
      console.log(`Blob preserved (${remainingUsers} other references exist)`);
    }
    
    res.json({ message: "File deleted" });
  } catch (err) { res.status(500).send(err.message); }
});


app.get("/", function (req, res) { res.send("Hello, world"); });

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});