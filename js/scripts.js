import * as THREE from 'https://cdn.skypack.dev/three@0.118.2';
import * as BufferGeometryUtils  from 'https://cdn.skypack.dev/three@0.118.2/examples/jsm/utils/BufferGeometryUtils.js';
const iPhoneDimensions = {
    cornerSize: 0.12,
    height: 2,
    width: 0.97,
    depth: 0.09
};

const lockDimensions = {
    cornerSize: 0.12,
    baseHeight: 1.5,
    baseWidth: 1.5,
    baseDepth: 0.5
};

var conditionalLineVertShader = /* glsl */`
attribute vec3 control0;
attribute vec3 control1;
attribute vec3 direction;
attribute float collapse;

#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
    #include <color_vertex>

    // Transform the line segment ends and control points into camera clip space
    vec4 c0 = projectionMatrix * modelViewMatrix * vec4( control0, 1.0 );
    vec4 c1 = projectionMatrix * modelViewMatrix * vec4( control1, 1.0 );
    vec4 p0 = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    vec4 p1 = projectionMatrix * modelViewMatrix * vec4( position + direction, 1.0 );

    c0.xy /= c0.w;
    c1.xy /= c1.w;
    p0.xy /= p0.w;
    p1.xy /= p1.w;

    // Get the direction of the segment and an orthogonal vector
    vec2 dir = p1.xy - p0.xy;
    vec2 norm = vec2( -dir.y, dir.x );

    // Get control point directions from the line
    vec2 c0dir = c0.xy - p1.xy;
    vec2 c1dir = c1.xy - p1.xy;

    // If the vectors to the controls points are pointed in different directions away
    // from the line segment then the line should not be drawn.
    float d0 = dot( normalize( norm ), normalize( c0dir ) );
    float d1 = dot( normalize( norm ), normalize( c1dir ) );
    float discardFlag = float( sign( d0 ) != sign( d1 ) );

vec3 p = position + ((discardFlag > 0.5) ? direction * collapse : vec3(0));
vec4 mvPosition = modelViewMatrix * vec4( p, 1.0 );
    gl_Position = projectionMatrix * mvPosition;

    #include <logdepthbuf_vertex>
    #include <clipping_planes_vertex>
    #include <fog_vertex>
}
`;

var conditionalLineFragShader = /* glsl */`
uniform vec3 diffuse;
uniform float opacity;

#include <common>
#include <color_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
    #include <clipping_planes_fragment>
    vec3 outgoingLight = vec3( 0.0 );
    vec4 diffuseColor = vec4( diffuse, opacity );
    #include <logdepthbuf_fragment>
    #include <color_fragment>
    outgoingLight = diffuseColor.rgb; // simple shader
    gl_FragColor = vec4( outgoingLight, diffuseColor.a );
    #include <tonemapping_fragment>
    #include <encodings_fragment>
    #include <fog_fragment>
    #include <premultiplied_alpha_fragment>
}
`;



var shader = {
    outline: {
        vertex_shader: [
            "uniform float offset;",
            "void main() {",
                "vec4 pos = modelViewMatrix * vec4( position + normal * offset, 1.0 );",
                "gl_Position = projectionMatrix * pos;",
            "}"
        ].join("\n"),
        fragment_shader: [
            "void main(){",
                "gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );",
            "}"
        ].join("\n")
    }
};


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer( { alpha: true });
renderer.setClearColor(0xffffff);
renderer.autoClear = false;
renderer.gammaInput = true;
renderer.gammaOutput = true;

renderer.setSize( window.innerWidth, window.innerHeight );
document.body.prepend( renderer.domElement );

const obj = lockMesh();

scene.add( obj );

// const geometry = new THREE.BoxGeometry();
// const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
// const cube = new THREE.Mesh( geometry, material );
// scene.add( cube );

camera.position.z = 5;

function animate() {
    requestAnimationFrame( animate );

    obj.rotateX(0.01);
    obj.rotateY(0.01);

    renderer.render( scene, camera );
}
animate();




function lockMesh() {

    const bw = lockDimensions.baseWidth;
    const bh = lockDimensions.baseHeight;
    const bd = lockDimensions.baseDepth;

    const front = groupJoin(
        shapeToMesh(roundedRectShape(bw, bh, lockDimensions.cornerSize)),
    )

    const shape = roundedRectShape(bw, bh, lockDimensions.cornerSize);

    // var outline_material = new THREE.ShaderMaterial({
    //     uniforms: THREE.UniformsUtils.clone(outline_shader.uniforms),
    //     vertexShader: outline_shader.vertex_shader,
    //     fragmentShader: outline_shader.fragment_shader
    // });


    var mat = new THREE.LineBasicMaterial( {
            color: 0x000000,
            linewidth: 2,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1
        } );


    // shader
    let uniforms = {
        offset: {
            type: "f",
            value: 0.1
        }
    };

    let geometry = new THREE.SphereBufferGeometry(1, 16, 8);/*new THREE.ExtrudeGeometry(
        shape, {
            depth: bd,
            bevelEnabled: false
        }
    );*/

    let mesh = createOutlinedMesh(geometry, 'red');

    let outShader = shader['outline'];

    let matShader = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: outShader.vertex_shader,
        fragmentShader: outShader.fragment_shader
    })

    let matColor = new THREE.MeshPhongMaterial(0xffffff)
    let mesh1 = new THREE.Mesh(geometry, matColor)

    let mesh3 = new THREE.Mesh(geometry, matShader)
    mesh3.material.depthWrite = false; // <==============
    //mesh3.quaternion = mesh1.quaternion;
    //outScene.add mesh3


    // const line = new THREE.Mesh(
    //     new THREE.ExtrudeGeometry(
    //         shape, {
    //             depth: bd,
    //             bevelEnabled: false
    //         }
    //     ),
    //         outline_material
    //     );

    let s = roundedRectShape(bw, bh, lockDimensions.cornerSize);

    const sg = new THREE.ExtrudeGeometry( s, {
        depth: bd,
        bevelEnabled: false
    } );

    var solidMat = new THREE.MeshBasicMaterial( {
        color: false,//0x000000,
        side: THREE.DoubleSide,
        depthTest: true,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1
    } );

    const solidMesh = new THREE.Mesh(sg, solidMat);

    //front.translateZ(bd / 2);
    //back.translateZ(-bd / 2);
    //solidMesh.translateZ(-bd / 2 + 0.01);

    return groupJoin(mesh);

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

function shapeToMesh(shape, mat) {
    if (!mat)
        mat = new THREE.LineBasicMaterial( {
            color: 0x000000,
            linewidth: 2,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1
        } );

    return new THREE.LineSegments(
        new THREE.EdgesGeometry(
            new THREE.ExtrudeGeometry(
                shape, {
                    depth: 0.001,
                    bevelEnabled: false
                }
            )
        ),
        mat
    );
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

function createOutlinedMesh(geometry, color){
    let eg = EdgesGeometry(geometry);
    let m = new THREE.ShaderMaterial({
      vertexShader: conditionalLineVertShader,
      fragmentShader: conditionalLineFragShader,
      uniforms: {
        diffuse: {
          value: new THREE.Color(color)
        },
        opacity: {
          value: 0
        }
      },
      transparent: false
    });
    let o = new THREE.LineSegments(eg, m);
    let b = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
      color: 0x444444,
      map: new THREE.TextureLoader().load("https://threejs.org/examples/textures/uv_grid_opengl.jpg"),
      polygonOffset: true,
      polygonOffsetFactor: 1
    }));
    o.add(b);
    return o;
}


function EdgesGeometry( geometry, thresholdAngle ) {


	let g = new THREE.BufferGeometry();

	g.type = 'EdgesGeometry';

	g.parameters = {
		thresholdAngle: thresholdAngle
	};

	thresholdAngle = ( thresholdAngle !== undefined ) ? thresholdAngle : 1;

	// buffer

	const vertices = [];
  const control0 = [];
  const control1 = [];
  const direction = [];
  const collapse = [];

	// helper variables

	const thresholdDot = Math.cos( THREE.MathUtils.DEG2RAD * thresholdAngle );
	const edge = [ 0, 0 ], edges = {};
	let edge1, edge2, key;
	const keys = [ 'a', 'b', 'c' ];

	// prepare source geometry

	let geometry2;

	if ( geometry.isBufferGeometry ) {

		geometry2 = new THREE.Geometry();
		geometry2.fromBufferGeometry( geometry );

	} else {

		geometry2 = geometry.clone();

	}

	geometry2.mergeVertices();
	geometry2.computeFaceNormals();

	const sourceVertices = geometry2.vertices;
	const faces = geometry2.faces;

	// now create a data structure where each entry represents an edge with its adjoining faces

	for ( let i = 0, l = faces.length; i < l; i ++ ) {

		const face = faces[ i ];

		for ( let j = 0; j < 3; j ++ ) {

			edge1 = face[ keys[ j ] ];
			edge2 = face[ keys[ ( j + 1 ) % 3 ] ];
			edge[ 0 ] = Math.min( edge1, edge2 );
			edge[ 1 ] = Math.max( edge1, edge2 );

			key = edge[ 0 ] + ',' + edge[ 1 ];

			if ( edges[ key ] === undefined ) {

				edges[ key ] = { index1: edge[ 0 ], index2: edge[ 1 ], face1: i, face2: undefined };

			} else {

				edges[ key ].face2 = i;

			}

		}

	}

	// generate vertices
  const v3 = new THREE.Vector3();
  const n = new THREE.Vector3();
  const n1 = new THREE.Vector3();
  const n2 = new THREE.Vector3();
  const d = new THREE.Vector3();
	for ( key in edges ) {

		const e = edges[ key ];

		// an edge is only rendered if the angle (in degrees) between the face normals of the adjoining faces exceeds this value. default = 1 degree.

		if ( e.face2 === undefined || faces[ e.face1 ].normal.dot( faces[ e.face2 ].normal ) <= thresholdDot ) {

			let vertex1 = sourceVertices[ e.index1 ];
      let vertex2 = sourceVertices[ e.index2 ];

			vertices.push( vertex1.x, vertex1.y, vertex1.z );
      vertices.push( vertex2.x, vertex2.y, vertex2.z );

      d.subVectors(vertex2, vertex1);
      collapse.push(0, 1);
      n.copy(d).normalize();
      direction.push(d.x, d.y, d.z);
      n1.copy(faces[ e.face1 ].normal);
      n1.crossVectors(n, n1);
      d.subVectors(vertex1, vertex2);
      n.copy(d).normalize();
      n2.copy(faces[ e.face2 ].normal);
      n2.crossVectors(n, n2);
      direction.push(d.x, d.y, d.z);

      v3.copy(vertex1).add(n1); // control0
      control0.push(v3.x, v3.y, v3.z);
      v3.copy(vertex1).add(n2); // control1
      control1.push(v3.x, v3.y, v3.z);

      v3.copy(vertex2).add(n1); // control0
      control0.push(v3.x, v3.y, v3.z);
      v3.copy(vertex2).add(n2); // control1
      control1.push(v3.x, v3.y, v3.z);
    }

	}

	// build geometry

	g.setAttribute( 'position', new THREE.Float32BufferAttribute( vertices, 3 ) );
  g.setAttribute( 'control0', new THREE.Float32BufferAttribute( control0, 3 ) );
  g.setAttribute( 'control1', new THREE.Float32BufferAttribute( control1, 3 ) );
  g.setAttribute( 'direction', new THREE.Float32BufferAttribute( direction, 3 ) );
  g.setAttribute( 'collapse', new THREE.Float32BufferAttribute( collapse, 1 ) );
  return g;

}