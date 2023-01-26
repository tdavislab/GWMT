/**response to the event of clicking a timestamp, and the focus node, if applicable*/

function fishEyeLayoutHandler(t, nodeD = ''){
    clearScalarFields(); // clear all scalar fields
    // if this t is already focused, restore the focusnode and fisheye
    if(t == focusT){
        restoreFishEye();
        return;
    }
    // else change the style, then use fisheye
    restoreNode();
    visTrackingGraphObj.clickTimestamp(t);  // change the style of nodes/links/text/timestamps in the tracking graph visualization
    
    // parameter of fisheye
    focusT = t;
    let mF = 3;
    let fisheyeT = new Array(trackingGraphObj.timestamps).fill(0);
    fisheye([-0.1, t, trackingGraphObj.timestamps-1+0.1]);

    // update the nodes and edges
    let timeLinesSelection = visTrackingGraphObj.timeLinesSelection;
    let nodesSelection = visTrackingGraphObj.nodesSelection;
    let linksSelection = visTrackingGraphObj.linksSelection;
    let xScale = visTrackingGraphObj.xScale;
    let yScale = visTrackingGraphObj.yScale;

    visFisheyeTimelines();
    visFisheyeLinks();
    visFisheyeNodes();

    // compute the fisheye result
    function fisheye(pair){
        let start = pair[0], focus = pair[1], end = pair[2];
        let startId = parseInt(start+1); 
        let endId = parseInt(end);

        // traverse each timesatmp, calculate new position.
        for(let i = startId; i <= endId; i++){
            if(i<focus){
                let beta = Math.abs(i-focus)/Math.abs(start-focus);
                let beta_ = (mF+1)*beta/(mF*beta+1);
                fisheyeT[i] = focus + (start-focus)*beta_;
            }
            else{
                let beta = Math.abs(i-focus)/Math.abs(end-focus);
                let beta_ = (mF+1)*beta/(mF*beta+1);
                fisheyeT[i] = focus + (end-focus)*beta_;
            }
        }
    }

    // update timestamp bar / nodes / links positions
    function visFisheyeTimelines(){
        // update timestamp bar 
        timeLinesSelection.each(function(_, i){
            let x = xScale(fisheyeT[i]);
            d3.select(this).selectAll('line')
                .transition()
                .duration(500)
                .attr('x1', x)
                .attr('x2', x); 
            d3.select(this).selectAll('text')
                .transition()
                .duration(500)
                .attr('x', x);
        });
    }

    // visualize all links
    function visFisheyeNodes(){
        // update all nodes
        nodesSelection.each(function(d){
            let t  = d['t'];
            let x = xScale(fisheyeT[t]);
            d3.select(this)
                .transition()
                .duration(500)
                .attr('cx', x);
        });
    }

    // visualize all nodes
    function visFisheyeLinks(){
        // update all links
        let link = d3.linkHorizontal()
            .source(function(d) {
                return [xScale(fisheyeT[d['src']['t']]), yScale(d.src.yId)];
            })
            .target(function(d) {
                return [xScale(fisheyeT[d['tgt']['t']]), yScale(d.tgt.yId)];
            });

        linksSelection.each(function(){
            d3.select(this)
                .transition()
                .duration(500)
                .attr('d', link);
        });
    }

    /*********Finally, render the scalar feilds********/
    visScalarFields(t, nodeD);
}

function restoreFishEye(){
    // change the focusT
    focusT = '';

    // if have focus node already, restore first
    if(focusNode){
        clickNode(focusNode);
    }

    // visualize all nodes and links
    let timeLinesSelection = visTrackingGraphObj.timeLinesSelection;
    let nodesSelection = visTrackingGraphObj.nodesSelection;
    let linksSelection = visTrackingGraphObj.linksSelection;
    let xScale = visTrackingGraphObj.xScale;
    let yScale = visTrackingGraphObj.yScale;

    // nodes
    nodesSelection.each(function(d){
        let t  = d['t'];
        let x = xScale(t);
        d3.select(this)
            .transition()
            .duration(500)
            .attr('cx', x);
    });
    
    // links
    let link = d3.linkHorizontal()
        .source(function(d) {
            return [xScale(d['src']['t']), yScale(d.src.yId)];
        })
        .target(function(d) {
            return [xScale(d['tgt']['t']), yScale(d.tgt.yId)];
        });
    linksSelection.each(function(){
        d3.select(this)
            .transition()
            .duration(500)
            .attr('d', link);   
    });

    // timelines
    timeLinesSelection.each(function(_, i){
        let x = xScale(i);
        d3.select(this).selectAll('line')
            .transition()
            .duration(500)
            .attr('x1', x)
            .attr('x2', x); 
        d3.select(this).selectAll('text')
            .transition()
            .duration(500)
            .attr('x', x);
    });

    // modify the style of timebar and  text
    timeLinesSelection
        .selectAll('line')
        .style('stroke-width', null)
        .style('stroke', null);
    timeLinesSelection
        .selectAll('text')
        .style("fill", null)
        .style('font-size', null)
        .style('font-weight', null);   
}

