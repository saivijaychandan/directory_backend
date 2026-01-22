const { Folder, ImageFile, ImageBlob } = require('../models');
const { getUniqueFolderName } = require('../utils/nameUtils');

exports.getAllFolders = async (req, res) => {
  try {
    const folders = await Folder.find({ user: req.user.id });
    res.json(folders);
  } catch (err) { res.status(500).send(err.message); }
};

exports.getFolderByName = async (req, res) => {
  try {
    const folderName = req.params.name;
    const userId = req.user.id;
    const folder = await Folder.findOne({ 
        name: folderName, 
        user: userId 
    });

    if (!folder) {
        return res.status(404).json({ msg: "Folder not found" });
    }

    res.json(folder);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

exports.getFolder = async (req, res) => {
  try {
    const param = req.params.id;
    const userId = req.user.id;

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(param);

    let folder;

    if (isObjectId) {
      folder = await Folder.findOne({ _id: param, user: userId });
    }

    if (!folder && !isObjectId) {
      folder = await Folder.findOne({ name: param, user: userId });
    }

    if (!folder) {
      return res.status(404).json({ msg: "Folder not found" });
    }

    res.json(folder);

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};

exports.getFolderById = async (req, res) => {
  try {
    const folder = await Folder.findById(req.params.id);
    if (!folder) return res.status(404).json({ msg: "Folder not found" });
    
    if (folder.user.toString() !== req.user.id) {
       return res.status(401).json({ msg: "Not authorized" });
    }

    res.json(folder);
  } catch (err) {
    console.error(err);
    if (err.kind === 'ObjectId') {
        return res.status(404).json({ msg: "Folder not found" });
    }
    res.status(500).send("Server Error");
  }
};

exports.createFolder = async (req, res) => {
  try {
    const { name } = req.body;
    const userId = req.user.id;

    const trimmedName = name.trim();
    if (!trimmedName) return res.status(400).json({ msg: "Folder name cannot be empty" });

    const existingFolder = await Folder.findOne({ name: trimmedName, user: userId });
    if (existingFolder) {
      return res.status(400).json({ msg: "Folder name already exists" });
    }

    const newFolder = await Folder.create({ name: trimmedName, user: userId });
    res.json(newFolder);

  } catch (err) { 
    console.error(err);
    res.status(500).send("Server Error"); 
  }
};

exports.updateFolder = async (req, res) => {
  try {
    const { name } = req.body;
    const folderId = req.params.id;
    const userId = req.user.id;

    const trimmedName = name.trim();
    if (!trimmedName) return res.status(400).json({ msg: "Name required" });

    const duplicate = await Folder.findOne({ name: trimmedName, user: userId });
    
    if (duplicate && duplicate._id.toString() !== folderId) {
       return res.status(400).json({ msg: "Folder name already exists" });
    }

    const updatedFolder = await Folder.findByIdAndUpdate(
        folderId, 
        { name: trimmedName }, 
        { new: true }
    );

    if (!updatedFolder) return res.status(404).json({ msg: "Folder not found" });

    res.json(updatedFolder);
  } catch (err) { 
    console.error(err);
    res.status(500).send("Server Error"); 
  }
};

exports.deleteFolder = async (req, res) => {
  try {
    const folderId = req.params.id;

    const files = await ImageFile.find({ folder: folderId });

    for (const file of files) {
       const blobId = file.blob;

       await ImageFile.findByIdAndDelete(file._id);

       const remainingReferences = await ImageFile.countDocuments({ blob: blobId });
       
       if (remainingReferences === 0) {
           await ImageBlob.findByIdAndDelete(blobId);
           console.log(`Blob ${blobId} deleted (No references left)`);
       }
    }

    const deletedFolder = await Folder.findByIdAndDelete(folderId);

    if (!deletedFolder) {
        return res.status(404).json({ msg: "Folder not found" });
    }

    res.json({ message: "Folder and contents deleted" });
  } catch (err) { 
    console.error(err);
    res.status(500).send(err.message); 
  }
};