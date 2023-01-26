/**
 * This script is used to visualize the 3d Trajectory3D
 */

class Trajectory3D{
    constructor(divId){
        // clear first
        d3.select(divId).selectAll('*').remove();

        this.divId = divId;
        this.width = parseInt(d3.select(this.divId).style('width'));
        this.height = parseInt(d3.select(this.divId).style('height'));
    
        this.camera = '';
        this.scene = '';
        this.renderer = '';
        this.controls = '';
        this.lines = {};    // {lineId: lineGeometry}
        this.features = {};
        this.highlightFeatureIndex = '';
        this.centerT = '';  // center timestamp
        this.init();
        this.renderer.render( this.scene, this.camera );

        this.lineWid = 0.01;    // render the path

        this.highlightLinesId = [];   // the id of highlight line
    }    
}

/**
 * animate
 */
Trajectory3D.prototype.animate = function(){
    // notice here, callback
    window.webkitRequestAnimationFrame(this.animate.bind(this));
    // requestAnimationFrame( animate );
    this.controls.update();
    this.renderer.render( this.scene, this.camera );
}

/**
 * init camera, scene, renderer, controls
 */
 Trajectory3D.prototype.init = function(){
    this.camera = new THREE.PerspectiveCamera( 45, this.width / this.height, 0.01, 10 );
    this.camera.position.z = 3.5;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color( SFgbColor );

    this.renderer = new THREE.WebGLRenderer( { antialias: true, alpha: true } );
    this.renderer.setSize( this.width, this.height );

    this.controls = new OrbitControls( this.camera, this.renderer.domElement);

    d3.select(this.divId).node().appendChild( this.renderer.domElement);
}

/**
 * render the 3d scalar field regarding the centerT
 * @param {*} SFDict: {'LL-SF': [scalar filed], 'L-SF': [], 'SF': t, []: t+1, 'SF-RR': []} 
 */
Trajectory3D.prototype.rendering = function(SFDict, centerT){
    // reset
    this.camera = new THREE.PerspectiveCamera( 70, this.width / this.height, 0.01, 10 );
    this.camera.position.z = 3.5;
    this.scene.clear();
    this.controls = new OrbitControls( this.camera, this.renderer.domElement);
    this.lines = {};    // {lineId: lineGeometry}
    this.features = {};
    this.highlightFeatureIndex = '';
    // scalar fields 
    let SFLst = [];  
    
    if(SFDict['LL-SF']!=-1){SFLst.push([SFDict['LL-SF'], 'LL-SF']);}
    if(SFDict['L-SF']!=-1){SFLst.push([SFDict['L-SF'], 'L-SF']);}
    if(SFDict['SF']!=-1){SFLst.push([SFDict['SF'], 'SF']);}
    if(SFDict['SF-R']!=-1){SFLst.push([SFDict['SF-R'], 'SF-R']);}
    if(SFDict['SF-RR']!=-1){SFLst.push([SFDict['SF-RR'], 'SF-RR']);}

    let gap = track3DHei/(SFLst.length-1);    // the gap among different layers
    let startZ = -track3DHei/2;       // the start Z

    // add each scalar field into the scene 
    for(let i = 0; i < SFLst.length; i++){
        // get the position of Z
        this.addSF(SFLst[i][0], startZ+gap*i, SFLst[i][1]);
    }

    // visualize the lines
    this.centerT = centerT;
    for(let i = 0; i < SFLst.length-1; i++){
        let T = centerT;
        let key = SFLst[i][1];
        if(key=='LL-SF'){T -= 2}
        if(key=='L-SF'){T -= 1}
        if(key=='SF-RR'){T += 2}
        if(key=='SF-R'){T += 1}
        this.renderLines(T, startZ+gap*i, startZ+gap*(i+1));
    }

    let cnt = 0, i = 0;
    // for(key in SFDict){
    //     if(SFDict[key]!=-1 && i<4){
    //         let T = centerT;
    //         if(key=='LL-SF'){T -= 2}
    //         if(key=='L-SF'){T -= 1}
    //         if(key=='SF-RR'){T += 2}
    //         if(key=='SF-R'){T += 1}
    //         this.renderLines(T, startZ+gap*cnt, startZ+gap*(cnt+1));
    //         // cnt += 1;
    //     }
    //     i += 1;
    // }

    // render the features of this timestamp
    let tIdx = 0;
    if(SFDict['LL-SF']!=-1){
        tIdx += 1;
    }
    if(SFDict['L-SF']!=-1){
        tIdx += 1;
    }
    this.renderFeatures(centerT, startZ+gap*tIdx);

    this.animate();
}

/**
 * add the scalar field at timestamp t into the scene
 * @param {} t: timestamp
 * z: the translation in the z direction
 * key: 'LL-SF', 'L-SF', 'SF', 'SF-R', 'SF-RR'} 
 */
Trajectory3D.prototype.addSF = function(scalarField, z, key){
    let geometry = new THREE.PlaneBufferGeometry( SFAttr.w, SFAttr.h, SFAttr.cols, SFAttr.rows ).translate(0, 0, z)
        .rotateX(Math.PI/2+Math.PI)
        .rotateY(SFAttr.rotateAngle);
    let position = geometry.attributes.position;
    let colors = [];

    for ( let i = 0; i < position.count; i ++ ) {
        // find the value at this point in matrix
        let row = parseInt(i/(SFAttr.cols+1)), col = i%(SFAttr.cols+1);
        let value = scalarField[row][col];
        // convert this value into the color
        let d3Color = scalarFieldColorScale(value);
        // change the color into the THREE color
        let color = new THREE.Color(d3Color);
        colors.push( color.r, color.g, color.b );
    }
		
	geometry.setAttribute( 'color', new THREE.Float32BufferAttribute( colors, 3 ) );
    let material = new THREE.MeshBasicMaterial( { side: THREE.DoubleSide, vertexColors: THREE.VertexColors } );
    mesh = new THREE.Mesh( geometry, material );
    this.scene.add(mesh);

    // add border
    let colorMap = {'SF': greenStopColor, 'LL-SF': 0xF9CB9C, 'L-SF': 0xF9CB9C, 'SF-RR': 0xA4C2F4, 'SF-R': 0xA4C2F4}
    let BorderMesh = this.renderBorder(colorMap[key], z);
    this.scene.add(BorderMesh);
}

Trajectory3D.prototype.renderBorder = function(color, z){
    // add line
    let lineWid = 0.01;
    let points = [];
    points.push(new THREE.Vector3(-SFAttr.w/2-lineWid, SFAttr.h/2+lineWid, 0));
    points.push(new THREE.Vector3(SFAttr.w/2+lineWid, SFAttr.h/2+lineWid, 0));
    points.push(new THREE.Vector3(SFAttr.w/2+lineWid, -SFAttr.h/2-lineWid, 0));
    points.push(new THREE.Vector3(-SFAttr.w/2-lineWid, -SFAttr.h/2-lineWid, 0));
    points.push(new THREE.Vector3(-SFAttr.w/2-lineWid, SFAttr.h/2+lineWid, 0));

    let geometryBorder = new THREE.BufferGeometry().setFromPoints(points);
    geometryBorder
        .translate(0, 0, z)
        .rotateX(Math.PI/2+Math.PI)
        .rotateY(SFAttr.rotateAngle);
    let border = new MeshLine();
    border.setGeometry(geometryBorder);
    let borderMaterial = new MeshLineMaterial({lineWidth: lineWid*2, color: new THREE.Color(color)});

    return new THREE.Mesh(border, borderMaterial); 
}

/**
 * render lines of the parents of t 
 * @param {*} t; z1 z2 represent the z-value of the layers
 */
Trajectory3D.prototype.renderLines = function(t, z1, z2){
    // nodes at this layer
    let nodeIds = trackingGraphObj.nodesPerT[t];

    // for each node find its parentnode and link
    for(let i = 0; i < nodeIds.length; i++){
        let node = trackingGraphObj.nodes[nodeIds[i]];
        let nodeX = node['c']*SFAttr.w/SFAttr.cols-SFAttr.w/2, nodeY = -(node['r']*SFAttr.h/SFAttr.rows-SFAttr.h/2);
    
        // find all parents node
        let parents = node['children'];
        for(let j = 0; j < parents.length; j++){
            // for each node, find the position of this node
            let parent = parents[j];
            let parentNode = parent['node'];
            let pro = parent['p'];
            let linkId = parent['link']['id'];
            let pNodeX = parentNode['c']*SFAttr.w/SFAttr.cols-SFAttr.w/2, pNodeY = -(parentNode['r']*SFAttr.h/SFAttr.rows-SFAttr.h/2);
            this.addLine([nodeX, nodeY, z1], [pNodeX, pNodeY, z2], pro, linkId);
        }

    }

    // render the line
}


/**
 * add one line into the scene
 * @param {*} pos1  [x, y, z]
 * @param {*} pos2  [x, y, z]
 * @param {*} pro 
 */
Trajectory3D.prototype.addLine = function(pos1, pos2, pro, linkId){
    // add a link
    let points = [];
    points.push( new THREE.Vector3( pos1[0], pos1[1], pos1[2] ) );
    points.push( new THREE.Vector3( pos2[0], pos2[1], pos2[2] ) );
    let geometryLine = new THREE.BufferGeometry().setFromPoints( points )
        .rotateX(Math.PI/2+Math.PI)
        .rotateY(SFAttr.rotateAngle);
    
    let lineMesh = new MeshLine();
    lineMesh.setGeometry(geometryLine);

    let color = visTrackingGraphObj.lineColorScale(pro);
    let lineMaterial = new MeshLineMaterial({lineWidth: this.lineWid*2, color: new THREE.Color(color)});

    let line = new THREE.Mesh(lineMesh, lineMaterial);

    line.material.transparent = true;
    line.material.opacity = pro < pThreshould? 0 : 1;
    line.material.depthWrite = false;

    this.scene.add(line);
    this.lines[linkId+''] = line;
}

/**
 * render all of the features at the time t, z means the z value
 */
Trajectory3D.prototype.renderFeatures = function(t, z){
    // find all nodes in this timestamp
    let node_ids = trackingGraphObj.nodesPerT[t];
    for(let i = 0; i < node_ids.length; i++){
        // for each node, record the index, row, and col
        let node_index = node_ids[i]; 
        let node = trackingGraphObj.nodes[node_index];
        let row = node['r'], col = node['c'];
        
        // generate this circle
        let geometry = new THREE.CircleGeometry( 0.02, 32 )
            .translate(col*SFAttr.w/SFAttr.cols-SFAttr.w/2, -(row*SFAttr.h/SFAttr.rows-SFAttr.h/2),z)
            .rotateX(Math.PI/2+Math.PI)
            .rotateY(SFAttr.rotateAngle);
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
 * hightlight this node and the relevant path 
 * @param {*} node 
 */
Trajectory3D.prototype.highlightPath = function(node){
    this.restorePath();

    // highlight this node
    let index = node['id']+'';
    this.features[index].material = new THREE.MeshBasicMaterial( { color:  new THREE.Color(featureHLColor)} );

    // highlight path
    let selectedLinks = [];
    let ct = this.centerT;
    findParents(node);
    findChildren(node);

    for(let j = 0; j < selectedLinks.length; j++){
        let link = selectedLinks[j];
        // get the color of this line
        let color = visTrackingGraphObj.highlightColorScale(link['p']);
        // this.lines[link['id']].material = new THREE.LineBasicMaterial( { color: new THREE.Color(color), linewidth: 1} );
        this.lines[link['id']].material= new MeshLineMaterial({lineWidth: this.lineWid*2, color: new THREE.Color(color), depthWrite: false});
        this.highlightLinesId.push(link['id']);
        this.lines[link['id']].material.transparent = true;
        if(link['p']<pThreshould){        
            this.lines[link['id']].material.opacity = 0;
        }
        else{
            this.lines[link['id']].material.opacity = 1;
        }
    }

    this.animate();

    // find all parents
    function findParents(node_){
        let t = parseInt(node_['t']);
        if(Math.abs(t-ct)<2){
            let parents = node_['parents'];
            for(let i = 0; i < parents.length; i++){
                let parent = parents[i]['node'];
                let link = parents[i]['link'];
                if(link.p>pThreshould){
                    selectedLinks.push(link);
                    findParents(parent);
                }
            }
        }
        
    }
    // find all descents
    function findChildren(node_){
        let t = parseInt(node_['t']);
        if(Math.abs(t-ct)<2){
            let children = node_['children'];
            for(let i = 0; i < children.length; i++){
                let child = children[i]['node'];
                let link = children[i]['link'];
                if(link.p>pThreshould){
                    selectedLinks.push(link);
                    findChildren(child);
                }
            }
        }
        
    }

}

/**
 * restore the previous highlighted path
 */
Trajectory3D.prototype.restorePath = function(opa = 0){
    // restore all feature
    for(key in this.features){
        this.features[key].material = new THREE.MeshBasicMaterial( { color:  featureColor} );   
    }
    // restore all lines
    for(key in this.lines){
        let link = trackingGraphObj.links[parseInt(key)];
         // get the color of this line
        let color = visTrackingGraphObj.lineColorScale(link['p']);
        // color = '#888888';
        // this.lines[key].material = new THREE.LineBasicMaterial( { transparent: true, opacity: opa } );
        if(opa == 1){
            if(pThreshould<link['p']){
                this.lines[key].material.transparent = true;
                this.lines[key].material.opacity = opa;}
        }
        else{
            this.lines[key].material.transparent = true;
            this.lines[key].material.opacity = opa;
        }
        this.lines[key].material.color = new THREE.Color(color);
    }
    // reset the highlight lines
    this.highlightLinesId = [];
}

// update links when threshould changes
Trajectory3D.prototype.updatePath = function(){
    for(key in this.lines){
        let link = trackingGraphObj.links[parseInt(key)];
        let line = this.lines[key];
        // increase threshould
        if(line.material.opacity!=0){
            if(link['p']<pThreshould){
                line.material.opacity = 0;
                line.material.transparent = true;
            }
        }
        // decrease threshould
        else{
            if(link['p']>pThreshould){
                // when have focus node
                if(focusNode && !this.highlightLinesId.includes(parseInt(key))){
                }
                else{
                    line.material.opacity = 1;
                    line.material.transparent = true;
                }
            }
            
        }
    }
}

/**
 * reset
 */

Trajectory3D.prototype.reset = function(){
    this.camera = new THREE.PerspectiveCamera( 70, this.width / this.height, 0.01, 10 );
    this.camera.position.z = 3.5;
    this.scene.clear();
    this.controls = new OrbitControls( this.camera, this.renderer.domElement);
    this.lines = {};    // {lineId: lineGeometry}
    this.features = {};
    this.highlightFeatureIndex = '';
    this.animate();
}