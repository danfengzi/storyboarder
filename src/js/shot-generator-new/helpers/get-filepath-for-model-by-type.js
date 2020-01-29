const isUserModel = model => !!model.match(/\//)

const getFilepathForModelByType = ({ type, model }) => {
  if (isUserModel(model)) {
    const parts = model.split(/\//)
    const filename = parts[parts.length - 1]
    switch (type) {
      case 'character':
        return `/data/user/characters/${filename}`
      case 'object':
        return `/data/user/objects/${filename}`
      case 'environment':
        return `/data/user/environments/${filename}`
      case 'attachable':
        return `/data/user/attachables/${filename}`
      default:
        return null
    }
  } else {
    switch (type) {
      case 'character':
        return `/data/system/dummies/gltf/${model}-lod.glb`
      case 'object':
        return `/data/system/objects/${model}.glb`
      case 'attachable':
        return `/data/system/attachables/${model}.glb`
      default:
        return null
    }
  }
}

export default getFilepathForModelByType