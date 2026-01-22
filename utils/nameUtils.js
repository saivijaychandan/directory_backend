const path = require('path');

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

async function getUniqueFileName(model, folderId, originalName, excludeId = null) {
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
  
    const escapedBase = escapeRegex(baseName);
    const escapedExt = escapeRegex(extension);
  
    const regex = new RegExp(`^${escapedBase}( \\(\\d+\\))?${escapedExt}$`);
  
    const filter = { folder: folderId, name: { $regex: regex } };
    if (excludeId) filter._id = { $ne: excludeId };

    const duplicates = await model.find(filter);
  
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

module.exports = { getUniqueFolderName, getUniqueFileName };