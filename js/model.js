import * as THREE from '//cdn.skypack.dev/three@0.130.1/build/three.module.js';
// import { FontLoader } from '//cdn.skypack.dev/three@0.130.1/examples/jsm/loaders/FontLoader.js';
import { OrbitControls } from '//cdn.skypack.dev/three@0.130.1/examples/jsm/controls/OrbitControls.js';
import { BufferGeometryUtils } from '//cdn.skypack.dev/three@0.130.1/examples/jsm/utils/BufferGeometryUtils.js';

import { LineSegmentsGeometry } from '//cdn.skypack.dev/three@0.130.1/examples/jsm/lines/LineSegmentsGeometry.js';
import { LineSegments2 } from '//cdn.skypack.dev/three@0.130.1/examples/jsm/lines/LineSegments2.js';
import { LineMaterial } from '//cdn.skypack.dev/three@0.130.1/examples/jsm/lines/LineMaterial.js';

import { ConditionalEdgesGeometry } from './conditional-lines/ConditionalEdgesGeometry.js';
import { ConditionalEdgesShader } from './conditional-lines/ConditionalEdgesShader.js';
import { ConditionalLineSegmentsGeometry } from './conditional-lines/Lines2/ConditionalLineSegmentsGeometry.js';
import { ConditionalLineMaterial } from './conditional-lines/Lines2/ConditionalLineMaterial.js';

var windowSize = new THREE.Vector2(window.innerWidth, window.innerHeight);


window.addEventListener('resize', () => {
    windowSize.x = window.innerWidth;
    windowSize.y = window.innerHeight;
});

var pointerPos = new THREE.Vector2(0, 0);

window.addEventListener('pointermove', (e) => {
    pointerPos.x = e.pageX;
    pointerPos.y = e.pageY;
});


var prevScrollX = window.scrollX;
var prevScrollY = window.scrollY;

window.addEventListener('scroll', (e) => {
    let sX = window.scrollX;
    let sY = window.scrollY;

    pointerPos.x += sX - prevScrollX;
    pointerPos.y += sY - prevScrollY;

    prevScrollX = sX;
    prevScrollY = sY;
}, {passive: true});

class ModelView extends HTMLElement {
    constructor() {

        super();

        this.style.position = 'absolute';
        this.parentNode.style.overflow = 'visible';

        this.resizeAttempts = 0;

        this.options = {
            lineColor: '#F5335E',
            fillOpacity: 0.95,
            fillColor: '#15151E',
            maxRotX: Math.PI / 3,
            maxRotY: Math.PI / 3
        }


        //If there where more modules, a signle listener should be used, but this is easier
        window.addEventListener('resize', () => {
            this.recalcCenter();
        });
    }

    connectedCallback() {
        setTimeout(() => {

            //Setup the scene
            let boundingBox = this.parentNode.getBoundingClientRect();

            this.center = new THREE.Vector2(boundingBox.top + document.documentElement.scrollTop + boundingBox.width / 2, boundingBox.left + document.documentElement.scrollLeft + boundingBox.height / 2)

            this.recalcCenter(false);

            this.center = new THREE.Vector2(0, 0);

            let scale = Math.min(boundingBox.width, boundingBox.height) * -0.005 + 6;


            this.scene = new THREE.Scene();
            this.camera = new THREE.PerspectiveCamera(40, boundingBox.width / boundingBox.height, 0.1, 2000);
            this.camera.position.set(0, 0.5, 5).multiplyScalar(scale);
            this.camera.lookAt(0, 0, 0);
            this.scene.add(this.camera);

            this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            //Sizes are set by the resize observer

            this.appendChild(this.renderer.domElement);

            //Load the model
            this.model = models[this.getAttribute('data-model')];

            if (this.model) {
                this.loadEdgeModel();
                this.loadBackgroundModel();
                this.loadConditionalModel();
            }


            //Listen for resize events
            this.resizeObs = new ResizeObserver((e) => {
                for (let i = 0; i < e.length; i++) this.onResize(e[i]);
            }).observe(this.parentNode);

            // this.controls = new OrbitControls(this.camera, this.renderer.domElement);
            // this.controls.maxDistance = 200;
            // this.controls.enableZoom = false;
            // this.controls.enablePan = false;

            this.animate();
        });
    }

    reload() {
        while (this.scene.children.length > 0) {
            this.scene.remove(this.scene.children[0]);
        }

        this.model = models[this.getAttribute('data-model')];

        if (this.model) {
            this.loadEdgeModel();
            this.loadBackgroundModel();
            this.loadConditionalModel();
        }
    }

    loadEdgeModel() {
        //No model
        if (!this.model) return;

        //Clone
        this.edgesModel = this.model.clone();
        this.scene.add(this.edgesModel);

        const meshes = [];
        this.edgesModel.traverse(c => {
            if (c.isMesh) meshes.push(c);
        });


        //Create line geo
        for (const key in meshes) {

            const mesh = meshes[key];
            const parent = mesh.parent;

            let lineGeom = new THREE.EdgesGeometry(mesh.geometry, 40);

            const line = new THREE.LineSegments(lineGeom, new THREE.LineBasicMaterial({ color: this.options.lineColor }));
            line.position.copy(mesh.position );
            line.scale.copy(mesh.scale);
            line.rotation.copy(mesh.rotation);

            const thickLineGeom = new LineSegmentsGeometry().fromEdgesGeometry(lineGeom);
            const thickLines = new LineSegments2( thickLineGeom, new LineMaterial({ color: this.options.lineColor, linewidth: 3 }));
            thickLines.position.copy(mesh.position);
            thickLines.scale.copy(mesh.scale);
            thickLines.rotation.copy(mesh.rotation);

            parent.remove(mesh);
            parent.add(line);
            parent.add(thickLines);
        }

        this.edgesModel.traverse( c => {

            if (c.material && c.material.resolution) {
                this.renderer.getSize(c.material.resolution);
                c.material.resolution.multiplyScalar( window.devicePixelRatio );
                //c.material.linewidth = params.thickness;
            }

            if ( c.material ) {

                c.visible = true; //c instanceof LineSegments2 ? params.useThickLines : ! params.useThickLines;
                c.material.color.set( this.options.linesColor );

            }

        } );
    }

    loadConditionalModel() {
        //No model
        if (!this.model) return;

        //Clone
        this.conditionalModel = this.model.clone();
        this.scene.add(this.conditionalModel);
        this.conditionalModel.visible = false;


        const meshes = [];
        this.conditionalModel.traverse(c => {
            if (c.isMesh) meshes.push(c);
        });

        for (const key in meshes) {

            const mesh = meshes[key];
            const parent = mesh.parent;

            //Remove everything but the position attribute
            const mergedGeom = mesh.geometry.clone();
            for (const key in mergedGeom.attributes) {
                if (key !== 'position') mergedGeom.deleteAttribute(key);
            }

            //Create the conditional edges geometry and associated material
            const lineGeom = new ConditionalEdgesGeometry(BufferGeometryUtils.mergeVertices(mergedGeom));
            const material = new THREE.ShaderMaterial(ConditionalEdgesShader);
            material.uniforms.diffuse.value.set(this.options.lineColor);

            //Create the line segments objects and replace the mesh
            const line = new THREE.LineSegments(lineGeom, material);
            line.position.copy(mesh.position);
            line.scale.copy(mesh.scale);
            line.rotation.copy(mesh.rotation);

            const thickLineGeom = new ConditionalLineSegmentsGeometry().fromConditionalEdgesGeometry(lineGeom);
            const thickLines = new LineSegments2(thickLineGeom, new ConditionalLineMaterial({ color: this.options.lineColor, linewidth: 2 }));
            thickLines.position.copy(mesh.position);
            thickLines.scale.copy(mesh.scale);
            thickLines.rotation.copy(mesh.rotation);

            parent.remove(mesh);
            parent.add(line);
            parent.add(thickLines);
        }

        this.conditionalModel.visible = true;//params.displayConditionalEdges;
        this.conditionalModel.traverse( c => {

            if ( c.material && c.material.resolution ) {

                this.renderer.getSize(c.material.resolution);
                c.material.resolution.multiplyScalar( window.devicePixelRatio );
                //c.material.linewidth = params.thickness;

            }

            if ( c.material ) {

                c.visible = true //c instanceof LineSegments2 ? params.useThickLines : ! params.useThickLines;
                c.material.uniforms.diffuse.value.set( this.options.linesColor );

            }

        } );
    }

    loadBackgroundModel() {
        //No model
        if (!this.model) return;


        this.backgroundModel = this.model.clone();
        this.backgroundModel.traverse( c => {

            if (c.isMesh) {

                c.material = new THREE.MeshBasicMaterial( { color: 'green' } );
                c.material.polygonOffset = true;
                c.material.polygonOffsetFactor = 1;
                c.material.polygonOffsetUnits = 1;
                c.renderOrder = 2;

            }

        } );
        this.scene.add(this.backgroundModel);

        this.backgroundModel.traverse(c => {
            if (c.isMesh) {
                c.material.transparent = true;
                c.material.opacity = this.options.fillOpacity;
                c.material.color.set(this.options.fillColor);
            }
        });
    }

    animate() {
        requestAnimationFrame((e) => { this.animate(e) });

        let x = this.clampRotX(((pointerPos.x - this.center.x) / windowSize.x) * this.options.maxRotX);
        let y = this.clampRotY(((pointerPos.y - this.center.y) / windowSize.y) * this.options.maxRotY);

        this.rotateModel(x, y);

        this.renderer.render(this.scene, this.camera);
    }

    clampRotX(x) {
        return Math.min(Math.max(x, -this.options.maxRotX), this.options.maxRotX);
    }

    clampRotY(x) {
        return Math.min(Math.max(x, -this.options.maxRotY), this.options.maxRotY);
    }


    rotateModel(x, y) {
        if (this.model) {
            this.model.rotation.y = x;
            this.model.rotation.x = y;
        }

        if (this.edgesModel) {
            this.edgesModel.rotation.y = x;
            this.edgesModel.rotation.x = y;
        }

        if (this.conditionalModel) {
            this.conditionalModel.rotation.y = x;
            this.conditionalModel.rotation.x = y;
        }

        if (this.backgroundModel) {
            this.backgroundModel.rotation.y = x;
            this.backgroundModel.rotation.x = y;
        }
    }

    recalcCenter() {
        window.requestAnimationFrame(() => {
            let box = this.getBoundingClientRect()

            var body = document.body;
            var docEl = document.documentElement;

            var scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
            var scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

            var clientTop = docEl.clientTop || body.clientTop || 0;
            var clientLeft = docEl.clientLeft || body.clientLeft || 0;

            var top  = box.top +  scrollTop - clientTop;
            var left = box.left + scrollLeft - clientLeft;

            this.center = new THREE.Vector2(
                left + box.width / 2,
                top + box.height / 2
            );
            let scale = Math.min(box.width, box.height) * -0.005 + 6;
            this.camera.position.set(0, 0.5, 5).multiplyScalar(scale);

            // body.appendChild(objToHtml.toNode({
            //     style: {
            //         position: 'absolute',
            //         height: '10px',
            //         width: '10px',
            //         backgroundColor: 'red',
            //         borderRadius: '50%',
            //         top: `${this.center.y}px`,
            //         left: `${this.center.x}px`,
            //     }
            // }));

            // body.appendChild(objToHtml.toNode({
            //     style: {
            //         position: 'absolute',
            //         height: '10px',
            //         width: '10px',
            //         color: 'white',
            //         top: `${this.center.y + 16}px`,
            //         left: `${this.center.x + 16}px`,
            //     },
            //     text: this.getAttribute('data-model')
            // }));
        });
    }

    onResize(e) {

        let boxSize = (Array.isArray(e.borderBoxSize)) ? e.borderBoxSize[0] : e.borderBoxSize;

        this.recalcCenter();


        //Since we are resizing the child there is a possiblity
        //for the parent to resize, causing an infinate loop.
        //This breaks it eventually
        if (this.resizeAttempts > 10000) return;
        this.resizeAttempts++;

        let w = boxSize.inlineSize;
        let h = boxSize.blockSize;

        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(w, h);
        this.renderer.setPixelRatio(window.devicePixelRatio);

        if (this.conditionalModel) {
            this.conditionalModel.traverse( c => {

               if ( c.material && c.material.resolution ) {

                   this.renderer.getSize(c.material.resolution);

               }

            } );

       }

       if (this.edgesModel) {

           this.edgesModel.traverse( c => {

               if (c.material && c.material.resolution) {
                   this.renderer.getSize(c.material.resolution);
               }
           } );

       }
    }
}




customElements.define('model-view', ModelView);

var models = {};

{
    const lockDimensions = {
        cornerSize: 0.12,
        baseHeight: 1.25,
        baseWidth: 1.35,
        baseDepth: 0.5
    };
    const iPhoneDimensions = {
        cornerSize: 0.12,
        height: 2,
        width: 0.97,
        depth: 0.09
    };
    const MessagingDimensions = {
        cornerSize: 0.12,
        height: 0.7,
        width: 1,
        depth: 0.1
    };
    const HealthcareDimensions = {
        height: 3,
        width: 3,
        depth: 0.1
    };
    const RansomewareDimensions = {
        size: 1.5,
        depth: 0.2
    };


    models['lock'] = lockMesh();
    models['iphone'] = iPhoneMesh();
    models['messaging'] = messagingMesh();
    models['healthcare'] = healthcareMesh();
    loadRansomewareMesh();


    function loadRansomewareMesh() {
        const s = RansomewareDimensions.size;
        const d = RansomewareDimensions.depth;

        const loader = new THREE.FontLoader();
        loader.load('assets/fonts/helvtiker_bold.typeface.json', (font) => {

            const geometry = new THREE.TextGeometry( '$', {
                font: font,
                size: s,
                height: d,
                curveSegments: 12,
                bevelEnabled: false
            } );

            const mesh = new THREE.Mesh(geometry);

            mesh.geometry.computeBoundingBox();
            mesh.castShadow = true;

            //Center
            const offset = mesh.geometry.boundingBox.getCenter(new THREE.Vector3());

            mesh.translateX(-offset.x);
            mesh.translateY(-offset.y);
            mesh.translateZ(-offset.z);

            models['ransomeware'] = groupJoin(mesh);

            //There is a chance that the dom will load first
            reloadAllModels('ransomeware');
        } );
    }

    function reloadAllModels(model) {
        let models = document.querySelectorAll(`model-view[data-model="${model}"]`);

        for (let i = 0; i < models.length; i++) {
            models[i].reload();
        }
    }


    function healthcareMesh() {
        const w = HealthcareDimensions.width;
        const h = HealthcareDimensions.height;
        const d = HealthcareDimensions.depth;

        return groupJoin(
            shapeToMesh(heartShape(w, h), d).translateY(h * 0.25),
            shapeToMesh(plusShape(w * 0.1, h * 0.1, (w + h) * 0.015), 0.001).translateY(h * 0.05).translateZ(d)
        ).translateY(-h * 0.05)
    }

    function plusShape(w, h, d) {
        const shape = new THREE.Shape();

        shape.moveTo(-d, d);
        shape.lineTo(-d, h);
        shape.lineTo(d, h);
        shape.lineTo(d, d);
        shape.lineTo(w, d);
        shape.lineTo(w, -d);
        shape.lineTo(d, -d);
        shape.lineTo(d, -h);
        shape.lineTo(-d, -h);
        shape.lineTo(-d, -d);
        shape.lineTo(-w, -d);
        shape.lineTo(-w, d);

        return shape;
    }

    function heartShape(w, h) {
        const shape = new THREE.Shape();

        shape.moveTo(0, -h / 2);
        shape.bezierCurveTo(-w / 2, -h / 5, -w / 4, h / 3, 0, 0);
        shape.bezierCurveTo(w / 4, h / 3, w / 2, -h / 5, 0, -h / 2);

        return shape;
    }


    function messagingMesh() {

        const xr = MessagingDimensions.width;
        const yr= MessagingDimensions.height;
        const d = MessagingDimensions.depth;

        const bubbleOne = groupJoin(
            shapeToMesh(chatBubbleShape(xr, yr), d),
            shapeToMesh(arcShape(0, 0, 0.1)).translateZ(d),
            shapeToMesh(arcShape(0, 0, 0.1)).translateZ(d).translateX(0.3),
            shapeToMesh(arcShape(0, 0, 0.1)).translateZ(d).translateX(-0.3),
        );

        const bubbleTwo = groupJoin(
            shapeToMesh(chatBubbleShape(xr * 0.75, yr * 0.75), d),
            shapeToMesh(arcShape(0, 0, 0.075)).translateZ(d),
            shapeToMesh(arcShape(0, 0, 0.075)).translateZ(d).translateX(0.3),
            shapeToMesh(arcShape(0, 0, 0.075)).translateZ(d).translateX(-0.3),
        );


        return groupJoin(
            bubbleOne.translateX(xr * 0.25).translateY(yr * 0.1).translateZ(d * -1.5),
            bubbleTwo.translateX(-xr * 0.25).translateY(-yr * 0.1).translateZ(d * 1.5)
        );

    }

    function chatBubbleShape(xr, yr) {
        const shape = new THREE.Shape();

        shape.absellipse(0, 0, xr, yr, Math.PI * 1.15, Math.PI * 1.35, true);

        shape.lineTo(-xr, -yr);

        return shape;
    }




    function iPhoneMesh() {

        const w = iPhoneDimensions.width;
        const h = iPhoneDimensions.height;
        const d = iPhoneDimensions.depth;

        const body = shapeToMesh(roundedRectShape(w, h, iPhoneDimensions.cornerSize), d);

        //Front

        const front = groupJoin(
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

        front.translateZ(d / 2);
        back.translateZ(-d / 2);
        body.translateZ(-d / 2);

        return groupJoin(body, front, back);
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

        return groupJoin(base, circle, key_hole, ring).translateY(-0.2);
    }

    function shapeToMesh(shape, depth = 0.0001) {
        const mesh = new THREE.Mesh( new THREE.ExtrudeGeometry(shape, {depth: depth, bevelEnabled: false} ) );

        mesh.geometry.computeBoundingBox();
        mesh.castShadow = true;

        return mesh;
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

    function groupJoin(...m) {
        let g = new THREE.Group();

        for (let i = 0; i < m.length; i++) g.add(m[i])

        return g;
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
}