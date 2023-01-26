/**Interaction: click on a node, then highlight nodes */

function clickNode(nodeD){
    let id = nodeD.id;
    let t = nodeD.t;

    let highlight = true;

    // 1. if node is focused, then restore
    if(focusNode && id == focusNode.id){
        restoreNode();
        // restore the 2d scalar fields and the 3D scalar fields
        return;
    }
    // 2. focus node already exits
    if(focusNode){
        if(focusT == t){
            restoreNode();
        }
        else if(focusT != ''){
            restoreNode();
            fishEyeLayoutHandler(t, nodeD);
            focusT = t;
            // vis scalar fields
            // visScalarFields(t, nodeD);
            highlight = false;
        }
    }
    else{ // new focus node
        if(focusT == '' || focusT != t){ // no focus T or t != T
            fishEyeLayoutHandler(t, nodeD);
            focusT = t;
            // vis scalar fields
            // visScalarFields(t, nodeD);
            highlight = false;
        }
    }

    focusNode = nodeD;

    // 3. store and highlight current node, parent nodes, child nodes/ and links 
    let parentData = getPorCInfo(nodeD, 'parents');
    let childData = getPorCInfo(nodeD, 'children');
    highlightNodes = parentData[0].concat(childData[0]);  
    highlightNodes.push(nodeD);     // curNode + parents + children
    highlightLinks = parentData[1].concat(childData[1]);
   
    // 4. highlight these nodes and links
    styleNodesLinks();

    if(highlight){
        console.log('we need to highlight');
        // 5. hightlight the nodes in the five scalar fields
        higlightNodesSSF(nodeD);

        // 6. highlight the nodes and path in the scalar feilds
        trajectorySF.highlightPath(nodeD);
    }
}

function higlightNodesSSF(node){
    /**
     * highlight features of the five scalar fields 
     */
    console.log('highlight the feature');
    let centerIdx = focusT-tRange[0];
    let singleSFMiddle = singleSFObjLst[centerIdx];
    let singleSFLeft = centerIdx-1>=0? singleSFObjLst[centerIdx-1]:'';
    let singleSFLeftL = centerIdx-2>=0? singleSFObjLst[centerIdx-2]:'';
    let singleSFRight = centerIdx+1<singleSFObjNum? singleSFObjLst[centerIdx+1]:'';
    let singleSFRightR = centerIdx+2<singleSFObjNum? singleSFObjLst[centerIdx+2]:'';

    singleSFMiddle.highlightFeatures([node]);

    // highight the parents and children of this feature
    let pNodes = [];
    let cNodes = [];
    let ppNodes = [];
    let ccNodes = [];

    for(let i = 0; i < node['parents'].length; i++){
        if(node['parents'][i]['p']>pThreshould){
            pNodes.push(node['parents'][i]['node']);
        }
    }
    for(let i = 0; i < node['children'].length; i++){
        if(node['children'][i]['p']>pThreshould){
            cNodes.push(node['children'][i]['node']);
        }
    }
    for(let i = 0; i < pNodes.length; i++){
        let curNode = pNodes[i];
        for(let j = 0; j < curNode['parents'].length; j++){
            if(curNode['parents'][j]['p']>pThreshould){
                ppNodes.push(curNode['parents'][j]['node']);
            }
        }
    }
    for(let i = 0; i < cNodes.length; i++){
        let curNode = cNodes[i];
        for(let j = 0; j < curNode['children'].length; j++){
            if(curNode['children'][j]['p']>pThreshould){
                ccNodes.push(curNode['children'][j]['node']);
            }
        }
    }

    if(pNodes.length != 0){
        singleSFLeft.highlightFeatures(pNodes);
    }
    if(cNodes.length != 0){
        singleSFRight.highlightFeatures(cNodes);
    }
    if(ppNodes.length != 0){
        singleSFLeftL.highlightFeatures(ppNodes);
    }
    if(ccNodes.length != 0){
        singleSFRightR.highlightFeatures(ccNodes);
    }
}

function styleNodesLinks(highlight = true){
    /** highlight or restore the nodes and links
     */
    let colorScale = visTrackingGraphObj.highlightColorScale;
    // nodes
    // highlightNodes.forEach((ele)=>{
    //     d3.select('#node-'+ele['id'])
    //         .style('fill', ()=>highlight? 'red':null);
    // });
    // links
    highlightLinks.forEach((ele)=>{
        d3.select('#link-'+ele['id'])
            .style('stroke', (d)=>highlight? colorScale(d.p):null)
            .style('stroke-width', ()=>highlight? '2.3': null);
    });
    d3.select('#node-'+focusNode.id)
        .style('fill', ()=>highlight? greenStopColor:null)
        .style('r', ()=>highlight? '4':null)
        .style('fill-opacity', ()=>highlight? 1 : null);
}

function restoreNode(){
    /** 
     * 1. restore the highlighted node/link
     * 2. set the focus node to be null
     * 3. clear the 2D and 3D scalar fields
     */
    styleNodesLinks(false);
    focusNode = '';
    highlightNodes = [];
    highlightLinks = [];
    trajectorySF.restorePath(1);

    for(let i = 0; i < singleSFObjLst.length; i++){
        singleSFObjLst[i].restore();
    }
}

function getPorCInfo(node, drt, dis=10000000){
    /* get the parent or child nodes and links of a node, within dis distance
    Args:
        node: the object of node
        drt(str): 'parents' or 'children'
        dis(int): with in dis steps 
    
    Res:
        (nodesList, linksList) 
    */
    let focusNodes = [];
    let focusLinks = [];
    
    let waitingNodes = [node];  // nodes to be find parents/children
    let curDis = 0;     // the current distance
    
    while(waitingNodes.length!=0 && curDis <= dis){
        let newWaitNodes = [];
        waitingNodes.forEach((ele)=>{
            let pNodeList = ele[drt];
            pNodeList.forEach((e)=>{    // for each parent/children
                if(e.p>pThreshould){
                    // add a link
                    focusLinks.push(e.link);
                    // add this node if it isn't in the newWaitNodes
                    let pNode = e.node;
                    if(!newWaitNodes.includes(pNode)){
                        newWaitNodes.push(pNode);
                        focusNodes.push(pNode);
                }
                }
            });
        });
        waitingNodes = newWaitNodes;
        curDis += 1;
    }

    return [focusNodes, focusLinks];
}

