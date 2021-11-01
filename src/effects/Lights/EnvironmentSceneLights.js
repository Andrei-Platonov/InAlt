// Script to build different lights setup
import * as THREE from '/build/three.module.js';


export function createMovingPointLights(scene){
  // lights
  let light1, light2, light3, light4;
  let movingPointLights = [];
  
  const sphere = new THREE.SphereGeometry( 10, 16, 8 );
  light1 = new THREE.PointLight( 0xff0040, 2, 50 );
  light1.add( new THREE.Mesh( sphere, new THREE.MeshBasicMaterial( { color: 0xff0040 } ) ) );
  scene.add( light1 );

  light2 = new THREE.PointLight( 0x0040ff, 2, 50 );
  light2.add( new THREE.Mesh( sphere, new THREE.MeshBasicMaterial( { color: 0x0040ff } ) ) );
  scene.add( light2 );
  light3 = new THREE.PointLight( 0x80ff80, 2, 50 );
  light3.add( new THREE.Mesh( sphere, new THREE.MeshBasicMaterial( { color: 0x80ff80 } ) ) );
  scene.add( light3 );
  light4 = new THREE.PointLight( 0xffaa00, 2, 50 );
  light4.add( new THREE.Mesh( sphere, new THREE.MeshBasicMaterial( { color: 0xffaa00 } ) ) );
  scene.add( light4 );
  // certian materials require a light source, which you can add here:
  var directionalLight = new THREE.DirectionalLight( 0xffffff, 1.0 );
  //directionalLight.position.set(0, 10, 0);
  scene.add( directionalLight );

  movingPointLights.push(light1, light2, light3, light4)
  
  return movingPointLights;
}

export function updateMovingPointLights(movingPointLights) {
    
    const time = Date.now() * 0.0005;

    movingPointLights[0].position.x = Math.sin( time * 0.7 ) * 100;
    movingPointLights[0].position.y = Math.cos( time * 0.5 ) * 120;
    movingPointLights[0].position.z = Math.cos( time * 0.3 ) * 100;

    movingPointLights[1].position.x = Math.cos( time * 0.3 ) * 100;
    movingPointLights[1].position.y = Math.sin( time * 0.5 ) * 120;
    movingPointLights[1].position.z = Math.sin( time * 0.7 ) * 100;

    movingPointLights[2].position.x = Math.sin( time * 0.7 ) * 30;
    movingPointLights[2].position.y = Math.cos( time * 0.3 ) * 40;
    movingPointLights[2].position.z = Math.sin( time * 0.5 ) * 30;

    movingPointLights[3].position.x = Math.sin( time * 0.3 ) * 30;
    movingPointLights[3].position.y = Math.cos( time * 0.7 ) * 40;
    movingPointLights[3].position.z = Math.sin( time * 0.5 ) * 30;
}

export function createSpaceLights(scene){
    var particleTexture = new THREE.TextureLoader().load(  '../../../assets/spark.png' );


	let particleGroup = new THREE.Object3D();
	let particleAttributes = { startSize: [], startPosition: [], randomness: [] };
	
	var totalParticles = 150;
	var radiusRange = 450;
	for( var i = 0; i < totalParticles; i++ ) 
	{
	    var spriteMaterial = new THREE.SpriteMaterial( { map: particleTexture, color: 0xffffff } );
		
		var sprite = new THREE.Sprite( spriteMaterial );
		sprite.scale.set( 32, 32, 1.0 ); // imageWidth, imageHeight
		sprite.position.set( Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5 );
		
		sprite.position.setLength( radiusRange * (Math.random() * 0.1 + 0.9) );
		
		// sprite.color.setRGB( Math.random(),  Math.random(),  Math.random() ); 
		sprite.material.color.setHSL( Math.random(), 0.9, 0.7 ); 
		
		// sprite.opacity = 0.80; // translucent particles
		sprite.material.blending = THREE.AdditiveBlending; // "glowing" particles
		
		particleGroup.add( sprite );
		// add variable qualities to arrays, if they need to be accessed later
		particleAttributes.startPosition.push( sprite.position.clone() );
		particleAttributes.randomness.push( Math.random() );
	}
	particleGroup.position.y = 50;
	scene.add( particleGroup );

}
