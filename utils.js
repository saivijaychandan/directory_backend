function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

async function getUniqueName(model, fieldName, desiredName, filter = {}) {
  const escapedName = escapeRegex(desiredName);
  const regex = new RegExp(`^${escapedName}( \\(\\d+\\))?$`);

  const duplicates = await model.find({ 
    [fieldName]: { $regex: regex }, 
    ...filter 
  });

  if (duplicates.length === 0) return desiredName;

  let maxNumber = 0;
  let hasExactMatch = false;

  duplicates.forEach(doc => {
    const name = doc[fieldName];
    if (name === desiredName) {
      hasExactMatch = true;
    } else {
      const match = name.match(/ \((\d+)\)$/); 
      if (match) {
        const num = parseInt(match[1]);
        if (num > maxNumber) maxNumber = num;
      }
    }
  });

  if (hasExactMatch) {
    return `${desiredName} (${maxNumber + 1})`;
  }

  return desiredName;
}