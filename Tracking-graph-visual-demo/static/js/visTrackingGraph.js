/**the object is used to visualize the tracking graph and handle the interaction*/

class VisTrackingGraph{
    constructor(){
        // 0. clear
        d3.select('#pureGTDiv').selectAll('*').remove();

        // 1. set the dimension of the tracking graph div
        this.dim = {
            padding: {left: 15, right: 15, top: 25, bottom: 5},
        }
        let divWid = parseInt(d3.select('#pureGTDiv').style('width'));
        let divHei = parseInt(d3.select('#pureGTDiv').style('height'));
        this.dim.wid = trackingGraphObj.timestamps*26 > divWid? trackingGraphObj.timestamps*26:divWid;
        this.dim.hei = trackingGraphObj.biggestYId*15 > divHei? trackingGraphObj.biggestYId*15:divHei;
        // set the width of line
        this.edgeWid = 1.5;

        // 2. set the color scale
        // this.lineColorScale = '';
        this.highlightColorScale = '';
        this.initColorScale();

        // 3. visualize the svg
        this.TGSvg = d3.select('#pureGTDiv').append('svg')
            .attr('width', this.dim.wid+'px')
            .attr('height', this.dim.hei+'px');
        // 3.1 tooltip
        this.tooltip = d3.select("#pureGTDiv").append("div")	
            .attr("class", "tooltip")				
            .style("opacity", 0);
        
        // 4. init the scale
        this.xScale = '';
        this.yScale = '';
        this.initScale();

        // 5. visulize the axis, text, and the time bars
        this.timeLinesSelection = '';
        this.visCoordsSys();

        // 6. visualize the legend
        Legend(d3.select('#pureGTDiv').append('div').classed('legendDiv', true), 
            {probRange: [0, trackingGraphObj.pRange[1]]});
        d3.select('.legendDiv').style('top', 35+divHei-60+'px')
            .style('left', parseInt(d3.select('#threeDPathDiv').style('wdith'))+60+'px');

        // 7. visualize the links
        this.linksSelection = '';
        this.visLinks();

        // 8. visualize the nodes
        this.nodesSelection = '';
        this.visNodes();
    }

    initColorScale(){
        this.lineColorScale = d3.scaleLinear()
            .domain([0, trackingGraphObj.pRange[1]])
            .range([startColor, stopColor]);
        this.highlightColorScale = d3.scaleLinear()
            .domain([0, trackingGraphObj.pRange[1]])
            .range([greenStartColor, greenStopColor]);
    }

    // init the x, y scale
    initScale(){
        this.xScale = d3.scaleLinear()
            .domain([0, trackingGraphObj.timestamps-1])
            .range([this.dim.padding.left, this.dim.wid-this.dim.padding.right]);

        this.yScale = d3.scaleLinear()
            .domain([-1, trackingGraphObj.biggestYId+1])
            .range([this.dim.padding.top, this.dim.hei-this.dim.padding.bottom]);
    }

    // visualize the coordinates system, including text and time lines
    visCoordsSys(){
        let that = this;
        let timelineData = [];
        for(let i = 0; i < trackingGraphObj.timestamps; i++){
            timelineData.push(this.xScale(i));
        }

        this.timeLinesSelection = this.TGSvg
            .attr('id', 'timestamps')
            .selectAll('#timestamp')
            .data(timelineData)
            .enter()
            .append('g')
            .attr('id', (_, i)=>'timestamp-'+i)
            .each(function(d, i){
                // add a time line
                d3.select(this).append('line')
                    .attr('x1', d)
                    .attr('y1', that.dim.padding.top)
                    .attr('x2', d)
                    .attr('y2', that.dim.hei-that.dim.padding.bottom)
                    .classed('timeLineStyle', true);
                
                // add text 
                d3.select(this).append('text')
                    .attr("dy", "-0.5em")
                    .attr("x", d)
                    .attr("y", that.dim.padding.top)
                    .text(i)
                    .attr('id', 'timeText-'+i)
                    .classed('labelText', true)
                    .on('click', ()=>{
                        // that.clickTimestamp(i);
                        // visScalarFields(i);
                        fishEyeLayoutHandler(i);
                    });
            });
    }

    // visualize the nodes
    visNodes(){
        this.nodesSelection = this.TGSvg.append('g').attr('id', 'nodesG').selectAll('nodes')
            .data(trackingGraphObj.nodes)
            .enter()
            .append('circle')
            .attr('id', d=>'node-'+d['id'])
            .attr('cx', (d)=>this.xScale(d.t))
            .attr('cy', (d)=>this.yScale(d.yId))
            .attr('r', 3)
            .attr('fill', nodeColor)
            .attr('fill-opacity', d=>d['visible']? 1:0)
            .attr('stroke', 'none')
            // .on('dblclick', function(_, d){
            //     // if already exist, then restore
            //     let nodeId = d['id'];
            //     if(nodeId in selectedNodes){
            //         // restore
            //         restoreHightlightDouble(d);
            //     }
            //     else{
            //         // change the location of each time bar in a fisheye way
            //         fishEyeLayoutHandler(d);
            //     }
            // })
            .on('click', function(_, d){
                clickNode(d);
            });
    }

    visLinks(){
        let that = this;
        let link = d3.linkHorizontal()
            .source(d => [this.xScale(d.src.t), this.yScale(d.src.yId)])
            .target(d =>[this.xScale(d.tgt.t), this.yScale(d.tgt.yId)]);

        this.linksSelection = this.TGSvg.append('g').attr('id', 'linksG').selectAll('links')
            .data(trackingGraphObj.links)
            .enter()
            .append('path')
            .attr('id', d=>'link-'+d['id'])
            .attr('stroke', d=>this.lineColorScale(d.p))
            .attr('stroke-width', this.edgeWid)
            .attr('stroke-opacity', 1)
            .attr('fill', 'none')
            .attr('d', link)
            .on('mouseover', function(e, d){
                d3.select(this).attr('stroke-width', that.edgeWid*2);
                that.tooltip.transition().duration(100).style("opacity", .9);		
                that.tooltip.html(d.p)	
                    .style("left", e.offsetX + "px")		
                    .style("top", (e.offsetY - 25) + "px");	
            })
            .on("mouseout", function(d) {	
                d3.select(this).attr('stroke-width', that.edgeWid);	
                that.tooltip.transition().duration(100).style("opacity", 0);	
            });
    }

    // change the style of timebars after clicking on a node
    clickTimestamp(timestamp){
        // 1. restore the style of the timebar
        this.timeLinesSelection
            .selectAll('line')
            .style('stroke-width', null)
            .style('stroke', null);
        // 2. restore the style of the text
        this.timeLinesSelection
            .selectAll('text')
            .style("fill", null)
            .style('font-size', null)
            .style('font-weight', null);
        
        let HLt = (t, color)=>{
            // 3. highlight the selected timebar
            d3.select('#timestamp-'+t)
                .selectAll('line')
                .style('stroke', color)
                .style('stroke-width', 2);
            // 4. highlight the time text
            d3.select('#timestamp-'+t) 
                .selectAll('text')
                .style('fill', color)
                .style('font-size', '15px')
                .style('font-weight', 800);
        }
        // highliht the focus t, and previous and following two timestamps
        HLt(timestamp, greenStopColor); // CC4125 DC7E6B 980100
        HLt(timestamp+1, '#A4C2F4');
        HLt(timestamp+2, '#A4C2F4');
        HLt(timestamp-1, '#F9CB9C');
        HLt(timestamp-2, '#F9CB9C');
    }
}