/**INT=> interaction
 * This script handle when the threshould changes
*/

function threshChangeReaction(){
    let linksSelection = visTrackingGraphObj.linksSelection;
    let nodesSelection = visTrackingGraphObj.nodesSelection;

    let checkLinkChange = (linkD)=>{
        let curVis = linkD['visible'];
        let realVis = linkD['p']>pThreshould? true:false;
        if(curVis == realVis){
            return -1;   // don't change
        }
        else{
            return realVis? 1 : 0;  // 1: appear; 0: disappear
        }
    }
    // update links (visible/invisible/don't change)
    linksSelection.each(function(d){
        let status = checkLinkChange(d);
        let opacity = status == 0? 0 : 1;

        if(status != -1){
            // change the visible feature
            d['visible'] = !d['visible'];
            d3.select(this).transition().duration(500)
                .attr('stroke-opacity', opacity);
        }
    });

    // check nodes
    let checkNodeChange = (nodeD)=>{
        let getRealVis = (nodeD)=>{
            let visible = false;
            let parents = nodeD['parents'];
            let children = nodeD['children'];
            let pNum = 0, cNum = 0;   // at first, set the number of visible parents/children to be 0
            
            for(let i = 0; i < parents.length; i++){
                if(parents[i]['link']['visible']){
                    pNum += 1;
                    if(pNum > 1){
                        return true;
                    }
                }
            }
            if(pNum == 0){
                return true;
            }
            else{
                for(let i = 0; i < children.length; i++){
                    if(children[i]['link']['visible']){
                        cNum += 1;
                        if(cNum > 1){
                            return true;
                        }
                    }
                }
            }
            return cNum == 1? false : true;
        }

        let curVis = nodeD['visible'];
        let realVis = getRealVis(nodeD);

        if(curVis == realVis){
            return -1;   // don't change
        }
        else{
            return realVis? 1 : 0;  // 1: appear; 0: disappear
        }
    }
    // update nodes appear or disappear
    nodesSelection.each(function(d){
        let status = checkNodeChange(d);
        let opacity = status == 0? 0 : 1;

        if(status != -1){
            d['visible'] = !d['visible'];
            d3.select(this).transition().duration(500)
                .attr('fill-opacity', opacity);
        }      
    });

    // check links in 3D scalar feilds
    if(trajectorySF){trajectorySF.updatePath();}
    // if focusnode exists,
    if(focusNode){
        trajectorySF.highlightPath(focusNode);
        // then highlight features in the scalar fields again
        for(let i = 0; i < singleSFObjLst.length; i++){
            singleSFObjLst[i].restore();
        }
        higlightNodesSSF(focusNode);
        // highlight the links in the tracking graph again
      
        styleNodesLinks(false);
        let parentData = getPorCInfo(focusNode, 'parents');
        let childData = getPorCInfo(focusNode, 'children');
        highlightLinks = parentData[1].concat(childData[1]);
        styleNodesLinks();
    }
}

