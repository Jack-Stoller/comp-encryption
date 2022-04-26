import * as THREE from '//cdn.skypack.dev/three@0.130.1/build/three.module.js';
import { GLTFLoader } from '//cdn.skypack.dev/three@0.130.1/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from '//cdn.skypack.dev/three@0.130.1/examples/jsm/controls/OrbitControls.js';
import { BufferGeometryUtils } from '//cdn.skypack.dev/three@0.130.1/examples/jsm/utils/BufferGeometryUtils.js';
import dat from '//cdn.skypack.dev/dat.gui/build/dat.gui.module.js';

import { LineSegmentsGeometry } from '//cdn.skypack.dev/three@0.130.1/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineSegments2 } from '//cdn.skypack.dev/three@0.130.1/examples/jsm/lines/LineSegments2.js';
import { LineMaterial } from '//cdn.skypack.dev/three@0.130.1/examples/jsm/lines/LineMaterial.js';

import { OutsideEdgesGeometry } from './conditional-lines/OutsideEdgesGeometry.js';
import { ConditionalEdgesGeometry } from './conditional-lines/ConditionalEdgesGeometry.js';
import { ConditionalEdgesShader } from './conditional-lines/ConditionalEdgesShader.js';
import { ConditionalLineSegmentsGeometry } from './conditional-lines/Lines2/ConditionalLineSegmentsGeometry.js';
import { ConditionalLineMaterial } from './conditional-lines/Lines2/ConditionalLineMaterial.js';
import { ColoredShadowMaterial } from './conditional-lines/ColoredShadowMaterial.js';


const iPhoneDimensions = {
    cornerSize: 0.12,
    height: 2,
    width: 0.97,
    depth: 0.09
};

const lockDimensions = {
    cornerSize: 0.12,
    baseHeight: 1.25,
    baseWidth: 1.35,
    baseDepth: 0.5
};

// globals
var params = {
    colors: 'LIGHT',
    backgroundColor: '#0d2a28',
    modelColor: '#0d2a28',
    lineColor: '#ffb400',
    shadowColor: '#44491f',

    lit: false,
    opacity: 0.85,
    threshold: 40,
    display: 'THRESHOLD_EDGES',
    displayConditionalEdges: true,
    thickness: 1,
    useThickLines: false,
    model: 'LOCK',

    randomize: () => randomizeColors(),
};
let camera, scene, renderer, controls, edgesModel, originalModel, backgroundModel, conditionalModel, shadowModel, floor, depthModel, gui;

const models = {};
const color = new THREE.Color();
const color2 = new THREE.Color();

const LIGHT_BACKGROUND = 0xeeeeee;
const LIGHT_MODEL = 0xffffff;
const LIGHT_LINES = 0x455A64;
const LIGHT_SHADOW = 0xc4c9cb;

const DARK_BACKGROUND = 0x111111;
const DARK_MODEL = 0x111111;
const DARK_LINES = 0xb0bec5;
const DARK_SHADOW = 0x2c2e2f;

init();
animate();

function randomizeColors() {

    const lineH = Math.random();
    const lineS = Math.random() * 0.2 + 0.8;
    const lineL = Math.random() * 0.2 + 0.4;

    const lineColor = '#' + color.setHSL( lineH, lineS, lineL ).getHexString();
    const backgroundColor = '#' + color.setHSL(
        ( lineH + 0.35 + 0.3 * Math.random() ) % 1.0,
        lineS * ( 0.25 + Math.random() * 0.75 ),
        1.0 - lineL,
    ).getHexString();

    color.set( lineColor );
    color2.set( backgroundColor );
    const shadowColor = '#' + color.lerp( color2, 0.7 ).getHexString();

    params.shadowColor = shadowColor;
    params.lineColor = lineColor;
    params.backgroundColor = backgroundColor;
    params.modelColor = backgroundColor;
    params.colors = 'CUSTOM';

    initGui();

};

function updateModel() {

    originalModel = models[ params.model ];

    initEdgesModel();

    initBackgroundModel();

    initConditionalModel();

}

function mergeObject( object ) {

    object.updateMatrixWorld( true );

    const geometry = [];
    object.traverse( c => {

        if ( c.isMesh ) {

            const g = c.geometry;
            g.applyMatrix4( c.matrixWorld );
            for ( const key in g.attributes ) {

                if ( key !== 'position' && key !== 'normal' ) {

                    g.deleteAttribute( key );

                }

            }
            geometry.push( g.toNonIndexed() );

        }

    } );

    const mergedGeometries = BufferGeometryUtils.mergeBufferGeometries( geometry, false );
    const mergedGeometry = BufferGeometryUtils.mergeVertices( mergedGeometries ).center();

    const group = new THREE.Group();
    const mesh = new THREE.Mesh( mergedGeometry );
    group.add( mesh );
    return group;

}

function initBackgroundModel() {

    if ( backgroundModel ) {

        backgroundModel.parent.remove( backgroundModel );
        shadowModel.parent.remove( shadowModel );
        depthModel.parent.remove( depthModel );

        backgroundModel.traverse( c => {

            if ( c.isMesh ) {

                c.material.dispose();

            }

        } );

        shadowModel.traverse( c => {

            if ( c.isMesh ) {

                c.material.dispose();

            }

        } );

        depthModel.traverse( c => {

            if ( c.isMesh ) {

                c.material.dispose();

            }

        } );

    }

    if ( ! originalModel ) {

        return;

    }

    backgroundModel = originalModel.clone();
    backgroundModel.traverse( c => {

        if ( c.isMesh ) {

            c.material = new THREE.MeshBasicMaterial( { color: LIGHT_MODEL } );
            c.material.polygonOffset = true;
            c.material.polygonOffsetFactor = 1;
            c.material.polygonOffsetUnits = 1;
            c.renderOrder = 2;

        }

    } );
    scene.add( backgroundModel );

    shadowModel = originalModel.clone();
    shadowModel.traverse( c => {

        if ( c.isMesh ) {

            c.material = new ColoredShadowMaterial( { color: LIGHT_MODEL, shininess: 1.0 } );
            c.material.polygonOffset = true;
            c.material.polygonOffsetFactor = 1;
            c.material.polygonOffsetUnits = 1;
            c.receiveShadow = true;
            c.renderOrder = 2;

        }

    } );
    scene.add( shadowModel );

    depthModel = originalModel.clone();
    depthModel.traverse( c => {

        if ( c.isMesh ) {

            c.material = new THREE.MeshBasicMaterial( { color: LIGHT_MODEL } );
            c.material.polygonOffset = true;
            c.material.polygonOffsetFactor = 1;
            c.material.polygonOffsetUnits = 1;
            c.material.colorWrite = false;
            c.renderOrder = 1;

        }

    } );
    scene.add( depthModel );

}

function initEdgesModel() {

    // remove any previous model
    if ( edgesModel ) {

        edgesModel.parent.remove( edgesModel );
        edgesModel.traverse( c => {

            if ( c.isMesh ) {

                if ( Array.isArray( c.material ) ) {

                    c.material.forEach( m => m.dispose() );

                } else {

                    c.material.dispose();

                }

            }

        } );

    }

    // early out if there's no model loaded
    if ( ! originalModel ) {

        return;

    }

    // store the model and add it to the scene to display
    // behind the lines
    edgesModel = originalModel.clone();
    scene.add( edgesModel );

    // early out if we're not displaying any type of edge
    if ( params.display === 'NONE' ) {

        edgesModel.visible = false;
        return;

    }

    const meshes = [];
    edgesModel.traverse( c => {

        if ( c.isMesh ) {

            meshes.push( c );

        }

    } );

    for ( const key in meshes ) {

        const mesh = meshes[ key ];
        const parent = mesh.parent;

        let lineGeom;
        if ( params.display === 'THRESHOLD_EDGES' ) {

            lineGeom = new THREE.EdgesGeometry( mesh.geometry, params.threshold );

        } else {

            const mergeGeom = mesh.geometry.clone();
            mergeGeom.deleteAttribute( 'uv' );
            mergeGeom.deleteAttribute( 'uv2' );
            lineGeom = new OutsideEdgesGeometry( BufferGeometryUtils.mergeVertices( mergeGeom, 1e-3 ) );

        }

        const line = new THREE.LineSegments( lineGeom, new THREE.LineBasicMaterial( { color: LIGHT_LINES } ) );
        line.position.copy( mesh.position );
        line.scale.copy( mesh.scale );
        line.rotation.copy( mesh.rotation );

        const thickLineGeom = new LineSegmentsGeometry().fromEdgesGeometry( lineGeom );
        const thickLines = new LineSegments2( thickLineGeom, new LineMaterial( { color: LIGHT_LINES, linewidth: 3 } ) );
        thickLines.position.copy( mesh.position );
        thickLines.scale.copy( mesh.scale );
        thickLines.rotation.copy( mesh.rotation );

        parent.remove( mesh );
        parent.add( line );
        parent.add( thickLines );

    }

}

function initConditionalModel() {

    // remove the original model
    if ( conditionalModel ) {

        conditionalModel.parent.remove( conditionalModel );
        conditionalModel.traverse( c => {

            if ( c.isMesh ) {

                c.material.dispose();

            }

        } );

    }

    // if we have no loaded model then exit
    if ( ! originalModel ) {

        return;

    }

    conditionalModel = originalModel.clone();
    scene.add( conditionalModel );
    conditionalModel.visible = false;

    // get all meshes
    const meshes = [];
    conditionalModel.traverse( c => {

        if ( c.isMesh ) {

            meshes.push( c );

        }

    } );

    for ( const key in meshes ) {

        const mesh = meshes[ key ];
        const parent = mesh.parent;

        // Remove everything but the position attribute
        const mergedGeom = mesh.geometry.clone();
        for ( const key in mergedGeom.attributes ) {

            if ( key !== 'position' ) {

                mergedGeom.deleteAttribute( key );

            }

        }

        // Create the conditional edges geometry and associated material
        const lineGeom = new ConditionalEdgesGeometry( BufferGeometryUtils.mergeVertices( mergedGeom ) );
        const material = new THREE.ShaderMaterial( ConditionalEdgesShader );
        material.uniforms.diffuse.value.set( LIGHT_LINES );

        // Create the line segments objects and replace the mesh
        const line = new THREE.LineSegments( lineGeom, material );
        line.position.copy( mesh.position );
        line.scale.copy( mesh.scale );
        line.rotation.copy( mesh.rotation );

        const thickLineGeom = new ConditionalLineSegmentsGeometry().fromConditionalEdgesGeometry( lineGeom );
        const thickLines = new LineSegments2( thickLineGeom, new ConditionalLineMaterial( { color: LIGHT_LINES, linewidth: 2 } ) );
        thickLines.position.copy( mesh.position );
        thickLines.scale.copy( mesh.scale );
        thickLines.rotation.copy( mesh.rotation );

        parent.remove( mesh );
        parent.add( line );
        parent.add( thickLines );

    }

}

function init() {

    // initialize renderer, scene, camera
    scene = new THREE.Scene();
    scene.background = new THREE.Color( LIGHT_BACKGROUND );

    camera = new THREE.PerspectiveCamera( 40, window.innerWidth / window.innerHeight, 0.1, 2000 );
    camera.position.set( -1, 0.5, 2 ).multiplyScalar( 0.75 );
    scene.add( camera );

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    document.body.prepend( renderer.domElement );

    // Floor
    floor = new THREE.Mesh(
        new THREE.PlaneBufferGeometry(),
        new THREE.ShadowMaterial( { color: LIGHT_LINES, opacity: 0.25, transparent: true } )
    );
    floor.rotation.x = - Math.PI / 2;
    floor.scale.setScalar( 20 );
    floor.receiveShadow = true;
    scene.add( floor );

    // Lights
    const dirLight = new THREE.DirectionalLight( 0xffffff, 1.0 );
    dirLight.position.set( 5, 10, 5 );
    dirLight.castShadow = true;
    dirLight.shadow.bias = -1e-10;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;

    window.dirLight = dirLight;

    const shadowCam = dirLight.shadow.camera;
    shadowCam.left = shadowCam.bottom = -1;
    shadowCam.right = shadowCam.top = 1;

    scene.add( dirLight );

    const cylinder = new THREE.Group();
    cylinder.add( new THREE.Mesh( new THREE.CylinderBufferGeometry( 0.25, 0.25, 0.5, 100 ) ) );
    cylinder.children[ 0 ].geometry.computeBoundingBox();
    cylinder.children[ 0 ].castShadow = true;
    models.CYLINDER = cylinder;


    const rect = new THREE.Group();
    rect.add( new THREE.Mesh( new THREE.ExtrudeGeometry( roundedRectShape(1, 1, 0.25), {depth: 0.25, bevelEnabled: false} ) ) );
    rect.children[ 0 ].geometry.computeBoundingBox();
    rect.children[ 0 ].castShadow = true;

    models.RECT = rect;

    models.HELMET = null;
    new GLTFLoader().load(
        'https://rawgit.com/KhronosGroup/glTF-Sample-Models/master/2.0/FlightHelmet/glTF/FlightHelmet.gltf',
        gltf => {

            const model = mergeObject( gltf.scene );
            model.children[ 0 ].geometry.computeBoundingBox();
            model.children[ 0 ].castShadow = true;

            models.HELMET = model;
            updateModel();

        }
    );

    models.LOCK = lockMesh();

    // camera controls
    controls = new OrbitControls( camera, renderer.domElement );
    controls.maxDistance = 200;

    window.addEventListener( 'resize', onWindowResize, false );

    initGui();

}



function lockMesh() {

    const bw = lockDimensions.baseWidth;
    const bh = lockDimensions.baseHeight;
    const bd = lockDimensions.baseDepth;
    const br = lockDimensions.cornerSize;

    const base = shapeToMesh(roundedRectShape(bw, bh, br), bd);
    const circle = shapeToMesh(arcShape(0, 0, 0.35), 0.1).translateZ(bd).translateY(0.05);
    const key_hole = shapeToMesh(keyHoleShape(), 0).translateZ(bd + 0.1);
    const ring = ringMesh().translateY(bh / 2).translateZ(bd / 2);

    return groupJoin(base, circle, key_hole, ring);
}

function shapeToMesh(shape, depth) {
    const mesh = new THREE.Mesh( new THREE.ExtrudeGeometry(shape, {depth: depth, bevelEnabled: false} ) );

    mesh.geometry.computeBoundingBox();
    mesh.castShadow = true;

    return mesh;
}



function ringMesh() {
    const cr = lockDimensions.baseWidth * 0.3;
    const h = lockDimensions.baseHeight * 0.2;

    const lineUp = new THREE.LineCurve3(
        new THREE.Vector3(-cr, 0, 0),
        new THREE.Vector3(-cr, h, 0)
    );

    const p1Curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-cr, h, 0),
        new THREE.Vector3(-cr, h + cr, 0),
        new THREE.Vector3(0, h + cr, 0)
    );

    const p2Curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, h + cr, 0),
        new THREE.Vector3(cr, h + cr, 0),
        new THREE.Vector3(cr, h, 0)
    );

    const lineDown = new THREE.LineCurve3(
        new THREE.Vector3(cr, h, 0),
        new THREE.Vector3(cr, 0, 0)
    );


    const path = new THREE.CurvePath();

    path.add(lineUp);
    path.add(p1Curve);
    path.add(p2Curve);
    path.add(lineDown);


    const geometry = new THREE.TubeGeometry( path, 30, 0.1, 20, false );
    const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
    const mesh = new THREE.Mesh( geometry, material );

    mesh.geometry.computeBoundingBox();
    mesh.castShadow = true;

    return mesh;
}

function keyHoleShape() {
    const rw = 0.1;
    const rh = 0.08;
    const cr = 0.08;

    const shape = new THREE.Shape();

    shape.absarc(0, cr, cr, 1.25 * Math.PI, 1.75 * Math.PI, true);
    shape.lineTo(rw * 0.5, -rh);
    shape.lineTo(-rw * 0.5, -rh);

    return shape;
}

function iPhoneMesh() {

    const w = iPhoneDimensions.width;
    const h = iPhoneDimensions.height;
    const d = iPhoneDimensions.depth;

    //Front

    const front = groupJoin(
        //Body Outline
        shapeToMesh(roundedRectShape(w, h, iPhoneDimensions.cornerSize)),
        //Top Line
        shapeToMesh(lineShape(-w / 2, h * 0.88 - h / 2, w / 2, h * 0.88 - h / 2)),
        //Top Bar,
        shapeToMesh(roundedRectShape(w * 0.25, h * 0.006, h * 0.003)).translateY(h / 2 - h * 0.06),
        //Top Mic
        shapeToMesh(arcShape(-w * 0.165, h / 2 - h * 0.06, h * 0.004)),
        //Bottom Line
        shapeToMesh(lineShape(-w / 2, h * 0.12 - h / 2, w / 2, h * 0.12 - h / 2)),
        //Home Button Circle
        shapeToMesh(arcShape(0, h * 0.06 - h / 2, h * 0.035))
    );

    //Back

    const back = groupJoin(
        //Body Outline
        shapeToMesh(roundedRectShape(w, h, iPhoneDimensions.cornerSize)),
        //Camera
        shapeToMesh(arcShape(w * 0.5 - 0.12, h / 2 - 0.12, 0.05)),
        shapeToMesh(arcShape(w * 0.5 - 0.12, h / 2 - 0.12, 0.04)),
        //Mic
        shapeToMesh(arcShape(w * 0.5 - 0.2, h / 2 - 0.12, 0.01)),
        //LED
        shapeToMesh(arcShape(w * 0.5 - 0.25, h / 2 - 0.12, 0.02)),
        //Logo,
        appleLogoMesh(-w * 0.01, h / 2 * 0.5, 0.25)
    );

    let s = roundedRectShape(w, h, iPhoneDimensions.cornerSize);

    const sg = new THREE.ExtrudeGeometry( s, {
        depth: d * 0.99,
        bevelEnabled: false
    } );

    var solidMat = new THREE.MeshBasicMaterial( {
        color: false,
        side: THREE.DoubleSide,
        depthTest: true,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1
    } );

    const solidMesh = new THREE.Mesh(sg, solidMat);


    front.translateZ(d / 2);
    back.translateZ(-d / 2);
    solidMesh.translateZ(-d / 2 + 0.01);

    return groupJoin(solidMesh, front, back);
}


function groupJoin(...m) {
    let g = new THREE.Group();

    for (let i = 0; i < m.length; i++) g.add(m[i])

    return g;
}


// function shapeToMesh(shape, mat) {
//     if (!mat)
//         mat = new THREE.LineBasicMaterial( {
//             color: 0x000000,
//             linewidth: 2,
//             polygonOffset: true,
//             polygonOffsetFactor: 1,
//             polygonOffsetUnits: 1
//         } );

//     return new THREE.LineSegments(
//         new THREE.EdgesGeometry(
//             new THREE.ExtrudeGeometry(
//                 shape, {
//                     depth: 0.001,
//                     bevelEnabled: false
//                 }
//             )
//         ),
//         mat
//     );
// }

function lineShape(x1, y1, x2, y2) {
    let s = new THREE.Shape();

    //If only x1 and y1 are given, start at 0, 0
    if (!x2 && !y2) [x2, y2, x1, y1] = [x1, y2, 0, 0]

    s.moveTo(x1, y1);
    s.lineTo(x2, y2);

    return s;
}

function arcShape(x, y, r, s = 0, e = 2 * Math.PI, d = true) {
    let sh = new THREE.Shape();

    sh.absarc(x, y, r, s, e, d);

    return sh;
}

function appleLogoMesh(dx, dy, s) {
    let s1 = new THREE.Shape();

    let x = (val) => (470 - val) * s * 0.001 + dx;
    let y = (val) => (500 - val) * s * 0.001 + dy;

    s1.moveTo(x(234), y(245));
    s1.bezierCurveTo(x(317), y(241), x(374), y(288), x(414), y(288));
    s1.bezierCurveTo(x(460), y(287), x(504), y(244), x(590), y(242));
    s1.bezierCurveTo(x(695), y(245), x(749), y(287), x(788), y(341));
    s1.bezierCurveTo(x(708), y(396), x(675), y(458), x(681), y(551));
    s1.bezierCurveTo(x(685), y(621), x(726), y(692), x(814), y(734));
    s1.bezierCurveTo(x(750), y(900), x(676), y(995), x(589), y(999));
    s1.bezierCurveTo(x(534), y(995), x(478), y(959), x(424), y(959));
    s1.bezierCurveTo(x(369), y(959), x(315), y(996), x(260), y(1000));
    s1.bezierCurveTo(x(164), y(1000), x(14), y(781), x(2), y(582));
    s1.bezierCurveTo(x(-16), y(398), x(80), y(262), x(234), y(245));

    let s2 = new THREE.Shape();

    s2.moveTo(x(605), y(0));
    s2.bezierCurveTo(x(482), y(12), x(392), y(130), x(405), y(229));
    s2.bezierCurveTo(x(515), y(235), x(615), y(121), x(605), y(0));

    return groupJoin(shapeToMesh(s1), shapeToMesh(s2));
}

function roundedRectShape(w, h, r) {
    let s = new THREE.Shape();

    s.moveTo(-w / 2, -h / 2 + r);
    s.lineTo(-w / 2, h / 2 - r);
    s.absarc(-w / 2 + r, h / 2 - r, r, 1 * Math.PI, 0.5 * Math.PI, true);
    s.lineTo(w / 2 - r, h / 2);
    s.absarc(w / 2 - r, h / 2 - r, r, 0.5 * Math.PI, 0 * Math.PI, true);
    s.lineTo(w / 2, -h / 2 + r);
    s.absarc(w / 2 - r, -h / 2 + r, r, 2 * Math.PI, 1.5 * Math.PI, true);
    s.lineTo(-w / 2 + r, -h / 2);
    s.absarc(-w / 2 + r, -h / 2 + r, r, 1.5 * Math.PI, 1 * Math.PI, true);

    return s;
}


function initGui() {

    if ( gui ) {

        gui.destroy();

    }

    // dat gui
    gui = new dat.GUI();
    gui.width = 300;
    gui.add( params, 'colors', [ 'LIGHT', 'DARK', 'CUSTOM' ] );
    gui.addColor( params, 'backgroundColor' );
    gui.addColor( params, 'modelColor' );
    gui.addColor( params, 'lineColor' );
    gui.addColor( params, 'shadowColor' );
    gui.add( params, 'randomize' );

    const modelFolder = gui.addFolder( 'model' );

    modelFolder.add( params, 'model', Object.keys( models ) ).onChange( updateModel );

    modelFolder.add( params, 'opacity' ).min( 0 ).max( 1.0 ).step( 0.01 );

    modelFolder.add( params, 'lit' );

    modelFolder.open();

    const linesFolder = gui.addFolder( 'conditional lines' );

    linesFolder.add( params, 'threshold' )
        .min( 0 )
        .max( 120 )
        .onChange( initEdgesModel );

    linesFolder.add( params, 'display', [
        'THRESHOLD_EDGES',
        'NORMAL_EDGES',
        'NONE',
    ] ).onChange( initEdgesModel );

    linesFolder.add( params, 'displayConditionalEdges' );

    linesFolder.add( params, 'useThickLines' );

    linesFolder.add( params, 'thickness', 0, 5 );

    linesFolder.open();

    gui.open();

}

function onWindowResize() {

    var width = window.innerWidth;
    var height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setSize( width, height );
    renderer.setPixelRatio( window.devicePixelRatio );

}

function animate() {

    requestAnimationFrame( animate );

    let linesColor = LIGHT_LINES;
    let modelColor = LIGHT_MODEL;
    let backgroundColor = LIGHT_BACKGROUND;
    let shadowColor = LIGHT_SHADOW;

    if ( params.colors === 'DARK' ) {

        linesColor = DARK_LINES;
        modelColor = DARK_MODEL;
        backgroundColor = DARK_BACKGROUND;
        shadowColor = DARK_SHADOW;

    } else if ( params.colors === 'CUSTOM' ) {

        linesColor = params.lineColor;
        modelColor = params.modelColor;
        backgroundColor = params.backgroundColor;
        shadowColor = params.shadowColor;

    }

    if ( conditionalModel ) {

        conditionalModel.visible = params.displayConditionalEdges;
        conditionalModel.traverse( c => {

            if ( c.material && c.material.resolution ) {

                renderer.getSize( c.material.resolution );
                c.material.resolution.multiplyScalar( window.devicePixelRatio );
                c.material.linewidth = params.thickness;

            }

            if ( c.material ) {

                c.visible = c instanceof LineSegments2 ? params.useThickLines : ! params.useThickLines;
                c.material.uniforms.diffuse.value.set( linesColor );

            }

        } );

    }


    if ( edgesModel ) {

        edgesModel.traverse( c => {

            if ( c.material && c.material.resolution ) {

                renderer.getSize( c.material.resolution );
                c.material.resolution.multiplyScalar( window.devicePixelRatio );
                c.material.linewidth = params.thickness;

            }

            if ( c.material ) {

                c.visible = c instanceof LineSegments2 ? params.useThickLines : ! params.useThickLines;
                c.material.color.set( linesColor );

            }

        } );

    }

    if ( backgroundModel ) {

        backgroundModel.visible = ! params.lit;
        backgroundModel.traverse( c => {

            if ( c.isMesh ) {

                c.material.transparent = params.opacity !== 1.0;
                c.material.opacity = params.opacity;
                c.material.color.set( modelColor );

            }

        } );

    }

    if ( shadowModel ) {

        shadowModel.visible = params.lit;
        shadowModel.traverse( c => {

            if ( c.isMesh ) {

                c.material.transparent = params.opacity !== 1.0;
                c.material.opacity = params.opacity;
                c.material.color.set( modelColor );
                c.material.shadowColor.set( shadowColor );

            }

        } );

    }

    if ( originalModel ) {

        floor.position.y = originalModel.children[ 0 ].geometry.boundingBox.min.y;

    }

    scene.background.set( backgroundColor );
    floor.material.color.set( shadowColor );
    floor.material.opacity = params.opacity;
    floor.visible = params.lit;

    render();

}

function render() {

    renderer.render( scene, camera );

}