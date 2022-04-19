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
    depth: 0.09
};


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );

console.log("New Scene")

const renderer = new THREE.WebGLRenderer( { alpha: true });
renderer.setSize( window.innerWidth, window.innerHeight );
document.body.appendChild( renderer.domElement );

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

    const front = groupJoin(
        shapeToMesh(roundedRectShape(bw, bh, lockDimensions.cornerSize))
    );

    const back = groupJoin(
        
    )

    return groupJoin(front);

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
        depth: d * 0.75,
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

    const solidMesh = new THREE.Mesh( sg, solidMat );


    front.translateZ(d / 2);
    back.translateZ(-d / 2);
    solidMesh.translateZ(-d / 2 + 0.0125);

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

    console.log(s)

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