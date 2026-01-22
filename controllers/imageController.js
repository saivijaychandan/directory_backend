const { ImageFile, ImageBlob } = require('../models');
const { getUniqueFileName } = require('../utils/nameUtils');

exports.uploadImage = async (req, res) => {
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
  } catch (err) { 
    console.error(err);
    res.status(500).send("Server Error: " + err.message); 
  }
};

exports.getImagesByFolder = async (req, res) => {
  try {
    const images = await ImageFile.find({ folder: req.params.folderId });
    res.json(images);
  } catch (err) { 
    console.error(err);
    res.status(500).send("Server Error: " + err.message); 
  }
};

exports.getImageData = async (req, res) => {
  try {
    const file = await ImageFile.findById(req.params.id);
    if (!file) return res.status(404).send("File not found");
    
    const blob = await ImageBlob.findById(file.blob);
    if (!blob) return res.status(404).send("Data corrupted");

    res.set('Content-Type', blob.contentType);
    res.send(blob.data);
  } catch (err) { res.status(500).send(err.message); }
};

exports.renameImage = async (req, res) => {
  try {
    const image = await ImageFile.findById(req.params.id);
    if (!image) return res.status(404).send("Image not found");
    
    let newName = req.body.name;
    if (!newName || !newName.trim()) return res.status(400).json({ msg: "Name required" });

    const uniqueName = await getUniqueFileName(ImageFile, image.folder, newName, image._id);

    image.name = uniqueName;
    await image.save();
    res.json(image);
  } catch (err) { res.status(500).send(err.message); }
};

exports.deleteImage = async (req, res) => {
  try {
    const file = await ImageFile.findById(req.params.id);
    if (!file) return res.status(404).send("File not found");
    
    const blobId = file.blob;
    await ImageFile.findByIdAndDelete(req.params.id);
    
    const remainingRefs = await ImageFile.countDocuments({ blob: blobId });
    if (remainingRefs === 0) {
      await ImageBlob.findByIdAndDelete(blobId);
      console.log("Blob deleted (Cleaned up)");
    }
    
    res.json({ message: "File deleted" });
  } catch (err) { res.status(500).send(err.message); }
};

exports.copyImage = async (req, res) => {
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
    } catch (err) { res.status(500).send("Server Error"); }
};

exports.moveImage = async (req, res) => {
    try {
      const { targetFolderId } = req.body;
      const file = await ImageFile.findById(req.params.id);
      if (!file) return res.status(404).send("File not found");
  
      const uniqueName = await getUniqueFileName(ImageFile, targetFolderId, file.name);
  
      file.folder = targetFolderId;
      file.name = uniqueName;
      await file.save();
      res.json(file);
    } catch (err) { res.status(500).send("Server Error"); }
};