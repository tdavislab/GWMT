/**the start script*/

let trackingGraphObj;   // the data structure object of the tracking graph
let visTrackingGraphObj;    // the visualization object of the tracking graph


// the probability threshould for the lines
let pThreshould = 0;

// color of the line
// let blueScale = d3.scaleSequential([0,1], d3.interpolateBlues);     
// let blueScale = d3.scaleSequential([0,1], d3.interpolateGnBu);  
// let blueScale = d3.scaleSequential([0,1], d3.interpolatePuBuGn);  
let blueScale = d3.scaleSequential([0,1], d3.interpolateYlGnBu);  
// let blueScale = d3.scaleSequential([0,1], d3.interpolateRdBu);  


let startColor = blueScale(0.1);    // 0.1 / 075
let stopColor = blueScale(0.8);
let nodeColor = '#888888';
let lineColorScale;     // scalar feilds
let SFgbColor = '#FFFFFF';
let track3DHei = 3;

// selected node color
let orangeScale = d3.scaleSequential([0,1], d3.interpolateOranges);     // the color range of the line
let orangeStartColor = orangeScale(0.05);
let orangeStopColor = orangeScale(0.9);

// let greenScale = d3.scaleSequential([0,1], d3.interpolateGreens);     // the color range of the line
// let greenScale = d3.scaleSequential([0,1], d3.interpolateOrRd);     // the color range of the line
let greenScale = d3.scaleSequential([0,1], d3.interpolateYlOrRd);     // the color range of the line
let greenStartColor = greenScale(0.05);
let greenStopColor = greenScale(0.9);

// focused node or timestamp
let focusT = '';
let focusNode = '';
let highlightNodes = [];    // the node id list of highlighted nodes
let highlightLinks = [];    // the link id list of highlighted links

// the attrs of scalar fields
let SFAttr = {rows: '', cols: '', rotateAngle: '', h: '', w: ''};

// color map for the scalar fields
// let scalarFieldColorScale = d3.scaleSequential([-0.05, 0.8], d3.interpolateGnBu); 
let scalarFieldColorScale = d3.scaleSequential([8000, 0], d3.interpolateGnBu); 

// five scalar fields
// let singleSFMiddle = '';
// let singleSFLeft = '';
// let singleSFRight = '';
// let singleSFLeftL = '';
// let singleSFRightR = '';
let singleSFObjNum = 5;     // the number of shown 2D scalar fields
let singleSFObjLst = [];    // the list of shown 2D scalar field objects
let tRange = [];    // the timestamp range of scalar fields, like [1, 3] means 1, 2, 3

// 3D scalar fields
let trajectorySF = '';

// color for features in scalar fields

let featureColor = 0xE06666;
let featureHLColor = 0xFF00FF;  //   FF9900 FF0000  

// color map for the scalar fields
let colorMapTemp = ['rgb(45, 0, 75)',
'rgb(69, 24, 113)',
'rgb(95, 58, 145)',
'rgb(122, 106, 167)',
'rgb(153, 143, 191)',
'rgb(183, 177, 213)',
'rgb(207, 206, 229)',
'rgb(228, 229, 239)',
'rgb(247, 246, 245)',
'rgb(251, 232, 204)',
'rgb(253, 213, 159)',
'rgb(253, 188, 107)',
'rgb(237, 155, 57)',
'rgb(217, 123, 18)',
'rgb(189, 97, 9)',
'rgb(158, 76, 7)'];
// transform the rgb to hex
let colorMap = [];
colorMapTemp.forEach(ele=>{
    colorMap.push(d3.color(ele).formatHex());
});

// 1. get the Json file of tracking graph
axios.post('/getTGData', {
    type: 'name'
    })
    .then((result) => {
        let TGData = result['data'];
        trackingGraphObj = new TrackingGraph(TGData);
        visTrackingGraphObj = new VisTrackingGraph();
        initSFAttr();
        initSF();
        lineColorScale = d3.scaleLinear()
            .domain([0, trackingGraphObj.pRange[1]])
            .range([startColor, stopColor]);
        // scalarFieldColorScale = d3.scaleSequential(TGData.SFRange, d3.interpolateGnBu); 
        scalarFieldColorScale = d3.scaleSequential(TGData.SFRange, d3.interpolateViridis); 
        // scalarFieldColorScale = d3.scaleSequential(TGData.SFRange, d3.interpolateInferno); 
        // scalarFieldColorScale = d3.scaleSequential(TGData.SFRange, d3.interpolateWarm); 
        // scalarFieldColorScale = d3.scaleSequential(TGData.SFRange, d3.interpolatePRGn); 
        // scalarFieldColorScale = d3.scaleSequential(TGData.SFRange, d3.interpolateSpectral); 


        // split the values into 15 
        // let vLst = [];
        // let vGap = (TGData.SFRange[1]-TGData.SFRange[0])/15;
        // for(let i = 0; i < 16; i++){
        //     vLst.push(TGData.SFRange[0]+vGap*i);
        // }
        // console.log('vLst', vLst);
        // console.log('colorMap', colorMap);
        // scalarFieldColorScale = d3.scaleLinear().domain(vLst).range(colorMap); 
    }).catch((err) => {
        console.log(err);
    });


function changeDataset(event){
    // trigger this when change the dataset
    const dataName = event.target.value;
    singleSFObjNum = dataName == 'Sample'? 9:5;
    axios.post('/changeData', {
            data: dataName
        })
        .then((result) => {
            let TGData = result['data'];
            trackingGraphObj = new TrackingGraph(TGData);
            visTrackingGraphObj = new VisTrackingGraph();
            initSFAttr();
            initSF();
            lineColorScale = d3.scaleLinear()
                .domain([0, trackingGraphObj.pRange[1]])
                .range([startColor, stopColor]);
            // scalarFieldColorScale = d3.scaleSequential(TGData.SFRange, d3.interpolateGnBu); 
            // let vLst = [];
            // let vGap = (TGData.SFRange[1]-TGData.SFRange[0])/15;
            // for(let i = 0; i < 16; i++){
            //     vLst.push(TGData.SFRange[0]+vGap*i);
            // }
            // scalarFieldColorScale = d3.scaleLinear().domain(vLst).range(colorMap); 
            scalarFieldColorScale = d3.scaleSequential(TGData.SFRange, d3.interpolateViridis); 

        }).catch((err) => {
            console.log(err);
        });
    

}

function initSFAttr(){
    SFAttr.rows = trackingGraphObj.SFDim[0]-1;    // the number of rows, the node num in this row = rows + 1   (150, 450) (600, 248)
    SFAttr.cols = trackingGraphObj.SFDim[1]-1;
    // when row > col, rotation is needec
    SFAttr.rotateAngle = SFAttr.rows>SFAttr.cols? Math.PI/2 : 0;
    SFAttr.h = 1.2;  // the width and height of the scalar fields in this scalar fields
    SFAttr.w = (d3.max([SFAttr.rows+1, SFAttr.cols+1])/d3.min([SFAttr.rows+1, SFAttr.cols+1]))*SFAttr.h; 
    if(SFAttr.rows>SFAttr.cols){
        let temp = SFAttr.h;
        SFAttr.h = SFAttr.w;
        SFAttr.w = temp;
    }
}

function initSF(){
    /**
     * reset the width of time div
     * init the 2d and 3d Saclar fields
     */
    // clear all divs insides
    d3.select('#timeAnalysisDiv').selectAll('*').remove();
    singleSFObjLst = [];    // clear all scalar fields objects
    // change the number of items in this div
    d3.select('#timeAnalysisDiv').style('grid-template-columns', `repeat(${singleSFObjNum}, ${100/singleSFObjNum}%)`);
    let height = parseInt(d3.select('#timeAnalysisDiv').style('height'));
    let width = SFAttr.w / SFAttr.h > 1?  height * SFAttr.w / SFAttr.h*(singleSFObjNum-0.12) : height * SFAttr.h / SFAttr.w*(singleSFObjNum-0.12);

    d3.select('#timeAnalysisDiv').style('width', width+'px');

    // recreate all divs objects
    for(let i = 0; i < singleSFObjNum; i++){
        let divId = `div_${i}`;
        d3.select('#timeAnalysisDiv').append('div').attr('id', divId);
        singleSFObjLst.push(new SingleSF(`#${divId}`));
    }   
    // 3D scalar fields
    trajectorySF = new Trajectory3D('#threeDPathDiv');
}

function visScalarFields(t, nodeD){
    /**
     * visualize the five scalar feilds down below the tracking graph
     * 
     * Args:
     *  t: the focused timestamp
     *  nodeD: the focus feature
     */

    // get the range of t, like [t-2, t-1, t, t+1, t+2, ...]; total number = SingleSFNum
    let T = trackingGraphObj.timestamps;
    let leftT = t-parseInt(singleSFObjNum/2);
    let rightT = leftT + singleSFObjNum - 1;
    if(leftT<0){rightT += -(leftT); leftT = 0;}
    if(rightT>=T){leftT -= rightT-T+1; rightT = T-1;}
    tRange = [leftT, rightT];

    axios.post('/getScalarFields', {'tRange': tRange})
        .then((result) => {
            let scalarFields = result['data']; // [[], [], ...]
            console.log('sca', scalarFields);
            // scalarFields for the 3D rendering
            let scalarFieldsDict = {'LL-SF': -1, 'L-SF': -1, 'SF': -1, 'SF-R': -1, 'SF-RR': -1};     
            for(let i = 0; i < singleSFObjNum; i++){ 
                let tp = leftT+i;
                let color = 0xFFFFFF;
                if(tp==t){
                    color = greenStopColor;
                    scalarFieldsDict['SF'] = scalarFields[i];
                }
                else if(tp > t && tp < t+3){color = 0xA4C2F4;}
                else if(tp < t && tp > t-3){color = 0xF9CB9C;}
                if(tp == t-1){scalarFieldsDict['L-SF'] = scalarFields[i];}
                else if(tp == t-2){scalarFieldsDict['LL-SF'] = scalarFields[i];}
                else if(tp == t+1){scalarFieldsDict['SF-R'] = scalarFields[i];}
                else if(tp == t+2){scalarFieldsDict['SF-RR'] = scalarFields[i];}
                // console.log('i', i, scalarFields[i]);

                singleSFObjLst[i].renderSF(scalarFields[i], tp, color);
            }

            trajectorySF.rendering(scalarFieldsDict, t);

            if(nodeD){
                // five scalar feilds
                higlightNodesSSF(nodeD);
                trajectorySF.highlightPath(nodeD); // 3D scalar feilds
            }

        })
        .catch((err)=>{
            console.log(err);
        });
}

// clear all scalar fields
function clearScalarFields(){
    if(trajectorySF){
        trajectorySF.reset();
        for(let i = 0; i < singleSFObjLst.length; i++){
            singleSFObjLst[i].reset();
        }
    }
}