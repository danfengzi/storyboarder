const THREE = require('three')
window.THREE = window.THREE || THREE

const path = require('path')

const JDLoader = require('../vendor/JDLoader.min.js')

require('../vendor/three/examples/js/loaders/LoaderSupport')
require('../vendor/three/examples/js/loaders/OBJLoader2')
require('../vendor/three/examples/js/loaders/GLTFLoader')
require('../vendor/three/examples/js/loaders/DRACOLoader')
require('../vendor/three/examples/js/loaders/DDSLoader')
require('../vendor/three/examples/js/libs/jszip.min')
require('../vendor/three/examples/js/libs/inflate.min')
require('../vendor/three/examples/js/loaders/FBXLoader')


THREE.DRACOLoader.setDecoderPath( '../vendor/three/examples/js/libs/draco/' )

const MAP_NAMES = [
  'map',
  'aoMap',
  'emissiveMap',
  'glossinessMap',
  'metalnessMap',
  'normalMap',
  'roughnessMap',
  'specularMap',
]

const characterHeights = {
  'adult-male': 1.8,
  'teen-male': 1.6,
  'adult-female': 1.65,
  'teen-female': 1.6
}

const toonMaterial = new THREE.MeshToonMaterial({
  color: 0xffffff,
  emissive: 0x0,
  specular: 0x0,
  skinning: true,
  shininess: 0,
  flatShading: false,
  morphNormals: true,
  morphTargets: true,
})

const Zlib = require("../vendor/three/examples/js/libs/inflate.min")

window.Zlib = Zlib.Zlib
let loadingManager = new THREE.LoadingManager()
let loader = new THREE.JDLoader()
let fbxLoader = new THREE.FBXLoader(loadingManager)
let objLoader = new THREE.OBJLoader2(loadingManager)
let gltfLoader = new THREE.GLTFLoader(loadingManager)
gltfLoader.setDRACOLoader(new THREE.DRACOLoader())
objLoader.setLogging(false, false)
let textures = {}
let characterModels = {}

const loadTextures = () => {
  let imageLoader = new THREE.ImageLoader(loadingManager)

  textures.femaleAdultBody = new THREE.Texture()
  imageLoader.load('data/shot-generator/dummies/textures/female-adult-texture-diff.jpg', ( image ) => {
    textures.femaleAdultBody.image = image
    textures.femaleAdultBody.needsUpdate = true
  })

  textures.maleAdultBody = new THREE.Texture()
  imageLoader.load('data/shot-generator/dummies/textures/male-adult-texture-diff.jpg', ( image ) => {
    textures.maleAdultBody.image = image
    textures.maleAdultBody.needsUpdate = true
  })

  textures.maleYouthBody = new THREE.Texture()
  imageLoader.load('data/shot-generator/dummies/textures/male-youth-texture-diff.jpg', ( image ) => {
    textures.maleYouthBody.image = image
    textures.maleYouthBody.needsUpdate = true
  })

  textures.femaleYouthBody = new THREE.Texture()
  imageLoader.load('data/shot-generator/dummies/textures/female-youth-texture-diff.jpg', ( image ) => {
    textures.femaleYouthBody.image = image
    textures.femaleYouthBody.needsUpdate = true
  })

  textures.chair = new THREE.Texture()
  imageLoader.load('data/shot-generator/objects/chair_uv.png', ( image ) => {
    textures.chair.image = image
    textures.chair.needsUpdate = true
  })

  textures.tree = new THREE.Texture()
  imageLoader.load('data/shot-generator/objects/tree_uv.png', ( image ) => {
    textures.tree.image = image
    textures.tree.needsUpdate = true
  })
}

const loadModelFBXPromise = ( file, textureBody, textureHead, meshHeight ) => {
  return new Promise((resolve, reject) => {
    fbxLoader.load( file, (object) => {
      let mesh = null
      let armature = null
      let obj = new THREE.Object3D()


      object.traverse( function ( child ) {
        if ( child instanceof THREE.Mesh ) {
          mesh = child
        } else {
          if (child instanceof THREE.Group) armature = child
        }
      })
      let bone = mesh.children[0].children[0];
      obj = obj.add(object.children[0])

      let material = new THREE.MeshToonMaterial({
        color: 0xffffff,
        emissive: 0x0,
        specular: 0x0,
        skinning: true,
        shininess: 0,
        flatShading: false,
      })

      let bbox = new THREE.Box3().setFromObject(mesh)
      let height = bbox.max.y - bbox.min.y

      let heightX = bbox.max.x - bbox.min.x
      let heightY = bbox.max.y - bbox.min.y
      let heightZ = bbox.max.z - bbox.min.z
      heightX = heightX > heightY ? heightX : heightY
      heightX = heightX > heightZ ? heightX : heightZ
      height = heightX

      mesh.material = material //[material2, material]
      mesh.rotation.set(0, 0, 0)
      let targetHeight = meshHeight
      //height = height * 100
      let scale = targetHeight / height
      obj.originalHeight = height
      mesh.scale.set(1,1,1)
      //console.log('setting scale: : ', scale)
      obj.scale.set(scale, scale, scale)

      mesh.updateMatrix()
      mesh.renderOrder = 1.0

      resolve (obj)
    })
  })
}

const loadModelGLTFPromise = (file, textureBody, textureHead, meshHeight) => {

  return new Promise((resolve, reject) => {

    gltfLoader.load(file, (data) => {
      let material = new THREE.MeshToonMaterial({
        color: 0xffffff,
        emissive: 0x0,
        specular: 0x0,
        skinning: true,
        shininess: 0,
        flatShading: false,
        morphNormals: true,
        morphTargets: true
      })
      let mesh = null
      let armature = null
      let obj = new THREE.Object3D()
      obj = data.scene.children[0]

      // first type of GLTF structure, where Skinned Mesh and the bone structure are inside the object3D
      for (var i in data.scene.children[0].children) {
        let child = data.scene.children[0].children[i]
        if ( child instanceof THREE.Mesh ) {
          mesh = child.clone()
        } else {
          if (child instanceof THREE.Object3D && armature === null) armature = child //new THREE.Skeleton(child)
        }
      }

      if (mesh === null)
      {
        //try loading second type of GLTF structure, mesh is outside the Object3D that contains the armature
        for (var i in data.scene.children)
        {
          let child = data.scene.children[i]
          if ( child instanceof THREE.Mesh ) {
            mesh = child
            obj.add(mesh)
          }
        }
      }
      material.map = mesh.material.map//.clone()
      material.map.image = textureBody.image
      material.map.needsUpdate = true
      let bbox = new THREE.Box3().setFromObject(mesh)

      let height = bbox.max.y - bbox.min.y
      obj.originalHeight = height
      mesh.material = material
      //mesh.rotation.set(0, Math.PI/2, 0)
      let targetHeight = meshHeight
      let scale = targetHeight / height
      obj.scale.set(scale, scale, scale)
      //mesh.geometry.translate(0, targetHeight/2, 0)
      mesh.renderOrder = 1.0
      mesh.original = data

      resolve(obj)

    })
  })
}

const loadModels = () => {
  // FBX loading trials
  //const female2 = loadModelFBXPromise("data/shot-generator/dummies/female-adult-test.fbx", textures.femaleAdultBody, textures.maleHead, characterHeights['adult-female'])
  //const male2 = loadModelFBXPromise("data/shot-generator/dummies/male-adult.fbx", textures.maleAdultBody, textures.maleHead, characterHeights.maleAdult)
  //const male_youth2 = loadModelFBXPromise("data/shot-generator/dummies/male-youth.fbx", textures.maleYouthBody, textures.maleHead, characterHeights.maleYouth )

  const female = loadModelGLTFPromise("data/shot-generator/dummies/gltf/adult-female.glb", textures.femaleAdultBody, textures.maleHead, characterHeights['adult-female'] )
  const male = loadModelGLTFPromise("data/shot-generator/dummies/gltf/adult-male.glb", textures.maleAdultBody, textures.maleHead, characterHeights['adult-male'] )
  const male_youth = loadModelGLTFPromise("data/shot-generator/dummies/gltf/youth-male.glb", textures.maleYouthBody, textures.maleHead, characterHeights['teen-male'] )
  const female_youth = loadModelGLTFPromise("data/shot-generator/dummies/gltf/youth-female.glb", textures.femaleYouthBody, textures.maleHead, characterHeights['teen-female'] )

  return Promise.all([ male, male_youth, female_youth, female ]).then( (values) => {
    // GLTF models are loaded async so we're waiting for all of them to get resolved
    characterModels['adult-male'] = values[0]
    characterModels['teen-male'] = values[1]
    characterModels['teen-female'] = values[2]
    characterModels['adult-female'] = values[3]
    return new Promise(resolve => {
      resolve(characterModels) } )
  });

}

function init () {
  loadTextures()
  return loadModels()
}

function getCharacterModels () {
  return characterModels
}

const isCustomModel = string => {
  const { root, dir, base, ext, name } = path.parse(string)
  if (dir && dir !== '') {
    if (ext && ext !== '') {
      // { model: '/path/to/custom/model.glb' } // absolute path and extension; load directly
      return true
    } else {
      // { model: '/path/to/custom/model' } // absolute path and no extension -- fail, shouldn't be allowed
      throw new Error('invalid model file path')
    }
  } else {
    if (ext && ext !== '') {
      // { model: 'model.glb' } // no path and extension; load from `images/` folder
      throw new Error('unsupported')
    } else {
      // { model: 'box' } // no path and no extension; use built-in model
      return false
    }
  }
}

module.exports = {
  isCustomModel
}