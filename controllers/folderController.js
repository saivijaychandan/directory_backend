const { Folder, ImageFile, ImageBlob } = require('../models/models');
const { getUniqueFolderName } = require('../utils/nameUtils');
const { Folder, ImageFile, ImageBlob } = require('../models/models');
const { getUniqueFolderName } = require('../utils/nameUtils');

exports.getAllFolders = async (req, res) => {
  try {
    const folders = await Folder.find({ user: req.user.id });
    res.json(folders);
  } catch (err) { res.status(500).send(err.message); }
};

exports.createFolder = async (req, res) => {
  try {
    const { name } = req.body;
    const uniqueName = await getUniqueFolderName(Folder, 'name', name, { user: req.user.id });
    const newFolder = await Folder.create({ name: uniqueName, user: req.user.id });
    res.json(newFolder);
  } catch (err) { res.status(500).send(err.message); }
};

exports.updateFolder = async (req, res) => {
  try {
    const { name } = req.body;
    const uniqueName = await getUniqueFolderName(Folder, 'name', name, { user: req.user.id });
    const updatedFolder = await Folder.findByIdAndUpdate(
        req.params.id, 
        { name: uniqueName }, 
        { new: true }
    );

    if (!updatedFolder) {
        return res.status(404).json({ msg: "Folder not found" });
    }

    res.json(updatedFolder);
  } catch (err) { 
    console.error(err);
    res.status(500).send(err.message); 
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