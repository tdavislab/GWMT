/**visulize the legend*/

/**
 * visulize the interactable legend in the divSelector
 * @param {*} divSelector 
 * @param {*} param1    style for the lengend svg
 */
function Legend(divSelector, {width = 200, height = 10, probRange = [0, 1]} = {}){
    // clear 
    divSelector.selectAll('svg').remove();
    // add the legend svg (size is the same as divSelector)
    let divWid = divSelector.style('width'),
    divHei = divSelector.style('height');
    // tailer the range
    probRange[0] = 0;
    probRange[1] = parseInt(probRange[1]*100+1)/100;

    // scale proba->width
    let pScale = d3.scaleLinear().domain([0, width]).range(probRange);

    let legendSvg = divSelector.append('svg')
        .attr('width', divWid)
        .attr('height', divHei);

    // padding for the color legend
    let legendPadding = {left: 10, top: 20};

    // visualize the  color legend filled with gradient (linear interplote)
    // design the linearGradient
    let gradient = legendSvg.append('defs').append('linearGradient')
        .attr('id', 'legendGradient');
    gradient.append('stop')
        .attr('stop-color', startColor)
        .attr('offset', '0');
    gradient.append('stop')
        .attr('stop-color', stopColor)
        .attr('offset', '1');

    let colorRect = legendSvg.append('rect')
        .attr('x', legendPadding.left)
        .attr('y', legendPadding.top)
        .attr('width', width)
        .attr('height', height)
        .attr('fill', `url(#${gradient.attr('id')})`);

    // visualize the time bar text at the two end
    let legendSText = legendSvg.append('text')
        .attr('font-size', '9px')
        .attr('x', legendPadding.left-2)
        .attr('y', legendPadding.top+height-2)
        .attr('text-anchor', 'end')
        .attr('fill', 'grey')
        .text(probRange[0]);

    let legendEText = legendSvg.append('text')
        .attr('font-size', '9px')
        .attr('font-family', 'Arial, Helvetica, sans-serif')
        .attr('x', legendPadding.left + width+2)
        .attr('y', legendPadding.top+height-2)
        .attr('text-anchor', 'start')
        .attr('fill', 'grey')
        .text(probRange[1]);

    // visulize the control line, and add some interactions, get the move
    let controlLine = legendSvg.append('line')
        .attr('x1', legendPadding.left)
        .attr('y1', legendPadding.top)
        .attr('x2', legendPadding.left)
        .attr('y2', legendPadding.top+height+12)
        .attr('stroke', 'black')
        .attr('stroke-opacity', 0.5)
        .attr('stroke-width', 2)
        .style("cursor", "pointer")
        .call(d3.drag()
            .on("start", dragStarted)
            .on('drag', dragged)
            .on('end', dragEnded));

    let controlLineText = legendSvg.append('text')
        .attr('font-size', '8px')
        .attr('x', legendPadding.left)
        .attr('y', legendPadding.top+height+20)
        .attr('text-anchor', 'middle')
        .attr('fill', 'black')
        .text(formularData(probRange[0]));

    // handle three kinds of events
    let minTranslation = legendPadding.left, maxTranslation = legendPadding.left + width;

    function dragStarted(event){
        let curX = event.x;
        if(curX>=minTranslation && curX<=maxTranslation){
            d3.select(this).attr('x1', curX).attr('x2', curX);
            controlLineText.attr('x', curX)
                .text(formularData(pScale(curX-legendPadding.left)));
        }      
    }
    function dragged(event){
        let curX = event.x;
        if(curX>=minTranslation && curX<=maxTranslation){
            d3.select(this).attr('x1', curX).attr('x2', curX);
            controlLineText.attr('x', curX)
                .text(formularData(pScale(curX-legendPadding.left)));
            pThreshould = formularData(pScale(curX-legendPadding.left));
        }      
    }
    function dragEnded(event){
        let curX = event.x;
        if(curX>=minTranslation && curX<=maxTranslation){
            d3.select(this).attr('x1', curX).attr('x2', curX);
            controlLineText.attr('x', curX)
                .text(formularData(pScale(curX-legendPadding.left)));
            // change the threshould
            pThreshould = formularData(pScale(curX-legendPadding.left));
            threshChangeReaction();     // dynamically update the appears or disappears of links and nodes
        }
        else{ // when drag too much
            threshChangeReaction();
        }
    }

    function formularData(num){
        return Math.floor(num * 10000) / 10000
    }
}
