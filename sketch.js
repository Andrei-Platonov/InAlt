
import * as THREE from '/build/three.module.js';

//import GUI
import { GUI } from '/src/jsm/libs/dat.gui.module.js';


// Three js objects
import { EffectComposer } from '/src/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '/src/jsm/postprocessing/RenderPass.js';
import { AfterimagePass } from '/src/jsm/postprocessing/AfterimagePass.js';
import { OutlinePass } from '/src/jsm/postprocessing/OutlinePass.js';
import { UnrealBloomPass } from '/src/jsm/postprocessing/UnrealBloomPass.js';

// Costum objects setup
import * as EnvironmentSceneLights from '/src/effects/Lights/EnvironmentSceneLights.js';

// GLOBAL VARIABLES

// document 
var dbg, capture;

// three js
var scene, camera, renderer, gui, geometry;

// lights
let movingPointLights = [];

// effects
let outlinePass;

// stabalizer
let pivot_point;
let sensitivity = 5; // defines the minimum distance change between frames requiered for the mesh position update

//after imagee
let afterimagePass, composer;
const params = {
  edgeStrength: 3.0,
  edgeGlow: 0.0,
  edgeThickness: 1.0,
  enable: true
};

//Hand thickness
const handParams = {
  radTop:1,
  radBottom:20,
  len:10
}


// glow effect
let selectedObjects = [];
let particleGroups = [];
var particleGroup;

//bloom
var bloomPass;

/* global describe handpose tf io THREE*/

var handposeModel = null; // this will be loaded with the handpose model

var videoDataLoaded = false; // is webcam capture ready?

var statusText = "Loading handpose model...";

var myHands = []; // hands detected
                  // currently handpose only supports single hand, so this will be either empty or singleton

var handMeshes = []; // array of threejs objects that makes up the hand rendering

var palms = [0,1,2,5,9,13,17] //landmark indices that represent the palm

var bones =true;

let uniforms, clock;
 
function init(){

// html canvas for drawing debug view
  dbg = document.createElement("canvas").getContext('2d');
  dbg.canvas.style.position="absolute";
  dbg.canvas.style.left = "0px";
  dbg.canvas.style.top = "0px";
  //dbg.canvas.style.display = "none";

  dbg.canvas.style.zIndex = 100; // "bring to front"
  document.body.appendChild(dbg.canvas);

  //initialize threejs scene
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera( 90, window.innerWidth / window.innerHeight, 0.1, 1000 );
  camera.layers.enable(1);
  renderer = new THREE.WebGLRenderer();
  renderer.setSize( window.innerWidth, window.innerHeight );
  document.body.appendChild( renderer.domElement );

  // read video from webcam
  capture = document.createElement("video");
  capture.playsinline="playsinline";
  capture.autoplay="autoplay";
  navigator.mediaDevices.getUserMedia({audio:false,video:true}).then(function(stream){
    window.stream = stream;
    capture.srcObject = stream;
  })

  // signal when capture is ready and set size for debug canvas
  capture.onloadeddata = function(){
    console.log("video initialized");
    videoDataLoaded = true;
    dbg.canvas.width = capture.videoWidth /2; // half size
    dbg.canvas.height= capture.videoHeight/2;
    
    camera.position.z = capture.videoWidth/2; // rough estimate for suitable camera distance based on FOV
  }
  movingPointLights = EnvironmentSceneLights.createMovingPointLights(scene);

  //Fog
  scene.fog = new THREE.Fog( 0x000000, 1, 1000 );

  // space lights
  EnvironmentSceneLights.createSpaceLights(scene);

  composer = new EffectComposer( renderer );
  composer.addPass( new RenderPass( scene, camera ) );
  composer.setSize( window.innerWidth, window.innerHeight );
  afterimagePass = new AfterimagePass();
  composer.addPass( afterimagePass );
  afterimagePass.uniforms[ "damp" ].value = 0.8

  outlinePass = new OutlinePass( new THREE.Vector2( window.innerWidth, window.innerHeight ), scene, camera );
  composer.addPass( outlinePass );
  outlinePass.edgeGlow = 1;
  outlinePass.edgeThickness = 3;
  outlinePass.edgeStrength = 2;
  outlinePass.visibleEdgeColor.set('#ff0000');

  //Bloom
  bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), 1.5, 0.4, 0.85 )
  bloomPass.threshold = 0.21
  bloomPass.strength = 1.2
  bloomPass.radius = 0.55
  bloomPass.renderToScreen = true
  composer.addPass( bloomPass );


  var particleTexture = new THREE.TextureLoader().load( 'assets/spark.png' );
  particleGroup = new THREE.Object3D();


  clock = new THREE.Clock();
  const textureLoader2 = new THREE.TextureLoader();

  uniforms = {

    "fogDensity": { value: 0.45 },
    "fogColor": { value: new THREE.Vector3( 0, 0, 0 ) },
    "time": { value: 1.0 },
    "uvScale": { value: new THREE.Vector2( 3.0, 1.0 ) },
    "texture1": { value: textureLoader2.load( 'assets/lava/cloud.png' ) },
    "texture2": { value: textureLoader2.load( 'assets/lava/lavatile.jpg' ) }

  };

  uniforms[ "texture1" ].value.wrapS = uniforms[ "texture1" ].value.wrapT = THREE.RepeatWrapping;
  uniforms[ "texture2" ].value.wrapS = uniforms[ "texture2" ].value.wrapT = THREE.RepeatWrapping;

  const shader_material = new THREE.ShaderMaterial( {

    uniforms: uniforms,
    vertexShader: document.getElementById( 'vertexShader' ).textContent,
    fragmentShader: document.getElementById( 'fragmentShader' ).textContent

  } );

  //TEST SPHERE
  var testSphere = new THREE.SphereGeometry( 80, 32, 16 );
  const t_sphere = new THREE.Mesh( testSphere, shader_material );
  //scene.add( t_sphere );
  
  var particleAttributes = { startSize: [], startPosition: [], randomness: [] };
  var totalParticles = 10;
  var radiusRange = 14;
  for( var i = 0; i < totalParticles; i++ ) 
    {
      var spriteMaterial = new THREE.SpriteMaterial( { map: particleTexture, color: 0xffffff } );
      
      var sprite = new THREE.Sprite( spriteMaterial );
      sprite.scale.set( 16, 16, 1.0 ); // imageWidth, imageHeight
      sprite.position.set( Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5 );
      sprite.position.setLength( radiusRange );
      
      // sprite.color.setRGB( Math.random(),  Math.random(),  Math.random() ); 
      sprite.material.color.setHSL( Math.random(), 0.9, 0.7 ); 
      
      // sprite.opacity = 0.80; // translucent particles
      sprite.material.blending = THREE.AdditiveBlending; // "glowing" particles
      
      particleGroup.add( sprite );
      // add variable qualities to arrays, if they need to be accessed later
      particleAttributes.startPosition.push( sprite.position.clone() );
      particleAttributes.randomness.push( Math.random() );
    }

    for(let i = 0; i < 21 ; i++){
      particleGroups.push(particleGroup.clone());
      scene.add( particleGroups[i] );
    }
  
  for (var i = 0; i < 21; i++){ // 21 keypoints
    var {isPalm,next} = getLandmarkProperty(i);

    var obj = new THREE.Object3D(); // a parent object to facilitate rotation/scaling
  
    // we make each bone a cylindrical shape, but you can use your own models here too
    geometry = new THREE.CylinderGeometry( isPalm?22:20, 10, 2);
    
    // another possible material (after adding a light source):
    var material = new THREE.MeshPhongMaterial({color:0x00ffff});

    var mesh = new THREE.Mesh( geometry, shader_material );
    mesh.rotation.x = Math.PI/2;
    
    obj.add( mesh );
    scene.add(obj);
    handMeshes.push(obj);
  }


  // Load the MediaPipe handpose model assets.
  handpose.load().then(function(_model){
  console.log("model initialized.")
  statusText = "Model loaded."
  handposeModel = _model;
  })


  // Create the GUI
  gui = new GUI();

  // Glow-gui
  const glowFolder = gui.addFolder('Glow effect');
  glowFolder.add( params, 'edgeStrength', 0.01, 10 ).onChange( function ( value ) {

    outlinePass.edgeStrength = Number( value );

  } );

  glowFolder.add( params, 'edgeGlow', 0.0, 1 ).onChange( function ( value ) {

    outlinePass.edgeGlow = Number( value );

  } );

  glowFolder.add( params, 'edgeThickness', 1, 50 ).onChange( function ( value ) {

    outlinePass.edgeThickness = Number( value );

  } );

  
  render(); // kick off the rendering loop!

}

init();


// update threejs object position and orientation from the detected hand pose
// threejs has a "scene" model, so we don't have to specify what to draw each frame,
// instead we put objects at right positions and threejs renders them all
function updateMeshes(hand){
  var time = 4 * Date.now() * 0.001;
  if (bones){
    var mid; //mid point for the bone
  
    //Run trough all the meshes composing the hand
    for (var i = 0; i < handMeshes.length; i++){
      
      var {isPalm,next} = getLandmarkProperty(i);
      var p0 = webcam2space(...hand.landmarks[i]);  // one end of the bone
      var p1 = webcam2space(...hand.landmarks[next]);  // the other end of the bone
      
      // compute the center of the bone (midpoint)
      mid = p0.clone().lerp(p1,0.5);
    }
  
    // enters on first render
    if (pivot_point == undefined){
      for (var i = 0; i < handMeshes.length; i++){
        
        // set the positions for the bones
        handMeshes[i].position.set(mid.x,mid.y,mid.z);
    
        // compute the length of the bone
        handMeshes[i].scale.z = p0.distanceTo(p1);
    
        // compute orientation of the bone
        handMeshes[i].lookAt(p1);
    
        // Pushes the objects that will be outlined with glow
        selectedObjects.push(handMeshes[i]);
  
        if (i == 0){
          // set the initial palm point as the current palmbone mid point
          pivot_point = mid.clone();
        }
      }
    
    }else{
      // enters from second render
      if (pivot_point.distanceTo(mid) > sensitivity){
        pivot_point.copy(mid);
        for (var i = 0; i < handMeshes.length; i++){
          var {isPalm,next} = getLandmarkProperty(i);
      
          var p0 = webcam2space(...hand.landmarks[i]);  // one end of the bone
          var p1 = webcam2space(...hand.landmarks[next]);  // the other end of the bone
          
          // compute the center of the bone (midpoint)
          mid = p0.clone().lerp(p1,0.5);
          handMeshes[i].position.set(mid.x,mid.y,mid.z);
    
          // compute the length of the bone
          handMeshes[i].scale.z = p0.distanceTo(p1);
    
          // compute orientation of the bone
          handMeshes[i].lookAt(p1);
  
          // Pushes the objects that will be outlined with glow
          selectedObjects.push(handMeshes[i]);
        }
      }else{
        for (var i = 0; i < handMeshes.length; i++){
          // Pushes the objects that will be outlined with glow
          selectedObjects.push(handMeshes[i]);
  
        }
      }
    }
    outlinePass.selectedObjects = selectedObjects;
    selectedObjects = [];
  }else{
    
    for (var i = 0; i < handMeshes.length; i++){
      var {isPalm,next} = getLandmarkProperty(i);
      var p0 = webcam2space(...hand.landmarks[i]);  // one end of the bone
      var p1 = webcam2space(...hand.landmarks[next]);  // the other end of the bone
      
      // compute the center of the bone (midpoint)
      let mid = p0.clone().lerp(p1,0.5);
      handMeshes[i].position.set(mid.x,mid.y,mid.z);
        // Update particle group position
      particleGroups[i].position.x = handMeshes[i].position.x;
      particleGroups[i].position.y = handMeshes[i].position.y;
      particleGroups[i].position.z = handMeshes[i].position.z;
      particleGroups[i].rotation.y = time * 0.75;
      
    
    }
  }
}



// compute some metadata given a landmark index
// - is the landmark a palm keypoint or a finger keypoint?
// - what's the next landmark to connect to if we're drawing a bone?
function getLandmarkProperty(i){
  var idx = palms.indexOf(i);
  var isPalm = idx != -1;
  var next; // who to connect with?
  if (!isPalm){ // connect with previous finger landmark if it's a finger landmark
    next = i-1;
  }else{ // connect with next palm landmark if it's a palm landmark
    next = palms[(idx+1) % palms.length];
  }
  return {isPalm,next};
}

// draw a hand object (2D debug view) returned by handpose
function drawHands(hands,noKeypoints){
  
  // Each hand object contains a `landmarks` property,
  // which is an array of 21 3-D landmarks.
  for (var i = 0; i < hands.length; i++){

    var landmarks = hands[i].landmarks;

    var palms = [0,1,2,5,9,13,17] //landmark indices that represent the palm

    for (var j = 0; j < landmarks.length; j++){
      var [x,y,z] = landmarks[j]; // coordinate in 3D space

      // draw the keypoint and number
      if (!noKeypoints){
        dbg.fillRect(x-2,y-2,4,4);
        dbg.fillText(j,x,y);
      }
        
      // draw the skeleton
      var {isPalm,next} = getLandmarkProperty(j);
      dbg.beginPath();
      dbg.moveTo(x,y);
      dbg.lineTo(...landmarks[next]);
      dbg.stroke();
    }

  }
}


// transform webcam coordinates to threejs 3d coordinates
function webcam2space(x,y,z){
  return new THREE.Vector3(
     (x-capture.videoWidth /2),
    -(y-capture.videoHeight/2), // in threejs, +y is up
    - z
  )
}

function render() {
  requestAnimationFrame(render); // this creates an infinite animation loop
    
  if (handposeModel && videoDataLoaded){ // model and video both loaded
    
    handposeModel.estimateHands(capture).then(function(_hands){
      // we're handling an async promise
      // best to avoid drawing something here! it might produce weird results due to racing
      
      myHands = _hands; // update the global myHands object with the detected hands
      if (!myHands.length){
        // haven't found any hands
        statusText = "Show some hands!"
      }else{
        // display the confidence, to 3 decimal places
        statusText = "Confidence: "+ (Math.round(myHands[0].handInViewConfidence*1000)/1000);
        
        // update 3d objects
        updateMeshes(myHands[0]);
      }
    })
  }
  
  dbg.clearRect(0,0,dbg.canvas.width,dbg.canvas.height);
  
  dbg.save();
  dbg.fillStyle="red";
  dbg.strokeStyle="red";
  dbg.scale(0.5,0.5); //halfsize;
  
  dbg.drawImage(capture,0,0);
  drawHands(myHands);
  dbg.restore();
  
  dbg.save();
  dbg.fillStyle="red";
  dbg.fillText(statusText,2,60);
  dbg.restore();

  //Moving point lights
  EnvironmentSceneLights.updateMovingPointLights(movingPointLights);
  
  if ( params.enable ) {
    // renders with post processing
    const delta = 5 * clock.getDelta();

    uniforms[ 'time' ].value += 0.7 *  delta;
    renderer.clear();
    composer.render();

  } else {
    // renders without post processing effect
    renderer.render( scene, camera );

  }

}
