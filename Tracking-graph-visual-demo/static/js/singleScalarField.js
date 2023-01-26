/**
 * This script is used to visualize one scalarField at the bottom of the screen
 */

/**
 * SingleSF is used to handle the rendering and interactions of the single scalar field div
 * @param {*} scalarField scalar field matrix
 */

class SingleSF {
    constructor(divId) {
        // remove first
        d3.select(divId).selectAll('*').remove();

        this.divId = divId;
        this.width = parseInt(d3.select(this.divId).style('width'));
        this.height = parseInt(d3.select(this.divId).style('height'));

        this.camera = '';
        this.scene = '';
        this.renderer = '';
        this.controls = '';
        this.features = {};     // all features at this timestamp {'index': node geometry}
        this.highlightFeatureIndex = '';     // the feature id

        this.init();
        // this.controls = new OrbitControls( this.camera, this.renderer.domElement);
        this.renderer.render( this.scene, this.camera );
    }

}

/**
 * animate
 */
 SingleSF.prototype.animate = function(){
    // notice here, callback
    window.webkitRequestAnimationFrame(this.animate.bind(this));
    this.renderer.render( this.scene, this.camera );
}

/**
 * init camera, scene, renderer, controls
 */
SingleSF.prototype.init = function(){
    this.camera = new THREE.PerspectiveCamera( 45, this.width / this.height, 0.01, 10 );
    this.camera.position.z = 1.5;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color( SFgbColor );

    this.renderer = new THREE.WebGLRenderer( { antialias: true } );
    this.renderer.setSize( this.width, this.height );

    d3.select(this.divId).node().appendChild( this.renderer.domElement);
}


/**
 * render the scalar field
 */
SingleSF.prototype.renderSF = function(scalarField, t, color){
    if(scalarField == -1){
        return;
    }
    // first remove previous scalarfield
    this.scene.clear();
    this.renderer.clear();
    this.animate();

    const geometry = new THREE.PlaneBufferGeometry( SFAttr.w, SFAttr.h, SFAttr.cols, SFAttr.rows ).rotateZ(SFAttr.rotateAngle);
    const position = geometry.attributes.position;
    const colors = [];

    for ( let i = 0; i < position.count; i ++ ) {
        // find the value at this point in matrix
        let row = parseInt(i/(SFAttr.cols+1)), col = i%(SFAttr.cols+1);
        // console.log('row', row, 'col', col);
        let value = scalarField[row][col];
        // convert this value into the color
        let d3Color = scalarFieldColorScale(value);
        // change the color into the THREE color
        const color = new THREE.Color(d3Color);
        colors.push( color.r, color.g, color.b );
    }
		
	geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
    let material = new THREE.MeshBasicMaterial( { side: THREE.DoubleSide, vertexColors: THREE.VertexColors } );
    mesh = new THREE.Mesh( geometry, material );
    this.scene.add(mesh);

    // add border
    let BorderMesh = this.renderBorder(color);
    this.scene.add(BorderMesh);

    this.renderFeatures(t);
    this.animate();
}

SingleSF.prototype.renderBorder = function(color){
    // add line
    let lineWid = 0.01;
    let points = [];
    points.push(new THREE.Vector3(-SFAttr.w/2-lineWid, SFAttr.h/2+lineWid, 0));
    points.push(new THREE.Vector3(SFAttr.w/2+lineWid, SFAttr.h/2+lineWid, 0));
    points.push(new THREE.Vector3(SFAttr.w/2+lineWid, -SFAttr.h/2-lineWid, 0));
    points.push(new THREE.Vector3(-SFAttr.w/2-lineWid, -SFAttr.h/2-lineWid, 0));
    points.push(new THREE.Vector3(-SFAttr.w/2-lineWid, SFAttr.h/2+lineWid, 0));

    let geometryBorder = new THREE.BufferGeometry().setFromPoints(points);
    geometryBorder.rotateZ(SFAttr.rotateAngle);
    let border = new MeshLine();
    border.setGeometry(geometryBorder);
    let borderMaterial = new MeshLineMaterial({lineWidth: lineWid*2, color: new THREE.Color(color)});

    return new THREE.Mesh(border, borderMaterial); 
}


/**
 * render all of the features at the time t
 */
SingleSF.prototype.renderFeatures = function(t){
    // clear the last time
    this.features = {};
    this.highlightFeatureIndex = '';

    // find all nodes in this timestamp
    let node_ids = trackingGraphObj.nodesPerT[t];

    for(let i = 0; i < node_ids.length; i++){
        // for each node, record the index, row, and col
        let node_index = node_ids[i]; 
        let node = trackingGraphObj.nodes[node_index];
        let row = node['r'], col = node['c'];
        
        // generate this circle
        let geometry = new THREE.CircleGeometry( 0.02, 32 )             
            .translate(col*SFAttr.w/SFAttr.cols-SFAttr.w/2, -(row*SFAttr.h/SFAttr.rows-SFAttr.h/2), 0)
            .rotateZ(SFAttr.rotateAngle);
        const material = new THREE.MeshBasicMaterial( { color: featureColor } );
        const circle = new THREE.Mesh( geometry, material );

        // add this node into the features
        this.features[node_index+''] = circle

        // add this node into scene
        this.scene.add( circle );
    }
    this.animate();
}

/**
 * restore previous node, and highlight the current node
 * @param {*} node
 */
SingleSF.prototype.highlightFeatures = function(nodeLst){
    // restore the previous one
    this.restore();
    // console.log(this.features);
    // console.log(nodeLst);
    
    for(let i = 0; i < nodeLst.length; i++){
        let node = nodeLst[i];
        let index = node['id']+'';
        let row = node['r'], col = node['c'];
        this.features[index].geometry = new THREE.CircleGeometry( 0.04, 64 )
            .translate(col*SFAttr.w/SFAttr.cols-SFAttr.w/2, -(row*SFAttr.h/SFAttr.rows-SFAttr.h/2), 0)
            .rotateZ(SFAttr.rotateAngle);
        this.features[index].material = new THREE.MeshBasicMaterial( { color: new THREE.Color(featureHLColor)} );
    }
    
    this.animate();
}

/**
 * restore the style of all features
 */
SingleSF.prototype.restore = function(){
    for(key in this.features){
        let curNode = trackingGraphObj.nodes[key];
        let row = curNode['r'], col = curNode['c'];
        this.features[key].geometry = new THREE.CircleGeometry( 0.02, 32 )
            .translate(col*SFAttr.w/SFAttr.cols-SFAttr.w/2, -(row*SFAttr.h/SFAttr.rows-SFAttr.h/2), 0)
            .rotateZ(SFAttr.rotateAngle);
        this.features[key].material = new THREE.MeshBasicMaterial( { color:  featureColor} );   
    }
}

// reset the scalar fields
SingleSF.prototype.reset = function(){
     // first remove previous scalarfield
     this.scene.clear();
     this.renderer.clear();
     this.animate();
}
