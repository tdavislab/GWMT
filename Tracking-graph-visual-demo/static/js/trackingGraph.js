/**The data structure of tracking graph*/

/*
Args:
TGData:
{
    nodes: [
        {id: , t: , yId: , 
        parents: [{node: , p: , link; }, ...], 
        children: [{node: , p: , link; }, ...]}, ...
    ],  
    links: [{{id: , src: , tgt: , p}}],     // links
    timestamps: ,                           // the number of timestamp
    nodesPerT: [[], [], ..],                            // the nodes in each timestamp
    mostFeatures: ,                         // the number of rows
    pRange: [0.1, 0.9],                     // probability range
}

This object converts the 'id' into the real object of link or node
*/

class TrackingGraph{
    constructor(TGData){
        this.nodeNum = TGData.nodes.length;
        this.linkNum = TGData.links.length;
        this.nodes = this.initNodes(TGData.nodes, TGData.links);
        this.links = this.initLinks(TGData.nodes, TGData.links);
        this.timestamps = TGData.timestamps;
        this.biggestYId = TGData.mostFeatures;
        this.nodesPerT = TGData.nodesPerT;
        this.pRange = TGData.pRange;
        this.SFDim = TGData.scalarFields;
    }

    /**
     * convert the node ids and link ids into real object
     * add 'focus' + 'visible' features on each node
     * @param {*} nodes 
     * @param {*} links 
     * @returns 
     */
    initNodes(nodes, links){
        for(let i = 0; i < this.nodeNum; i++){
            let node = nodes[i];
            let parents = node['parents'];
            let children = node['children'];

            // add focus attribute for node to indicate if this node is the focus node
            node['focus'] = false;
    
            for(let j = 0; j < parents.length; j++){
                let parent = parents[j];
                parent['node'] = nodes[parent['node']];
                parent['link'] = links[parent['link']];
            }
            for(let j = 0; j < children.length; j++){
                let child = children[j];
                child['node'] = nodes[child['node']];
                child['link'] = links[child['link']];
            }
    
            // add visible attribute for each node, visible = false, iff both the number of parents and childen is 1
            if(parents.length==1 && children.length==1){
                node['visible'] = false;
            }
            else{
                node['visible'] = true;
            }
    
        }
        return nodes;
    }
    
    /**
     * convert the node id in links into real object
     * @param {*} nodes 
     * @param {*} links 
     * @returns 
     */
    initLinks(nodes, links){
        for(let i = 0; i < this.linkNum; i++){
            let link = links[i];
            link['src'] = nodes[link['src']];
            link['tgt'] = nodes[link['tgt']];
            // add the attr of dyProba to indicate the dynamic probability
            link['dyProba'] = link['p'];
            link['visible'] = true;
        }
        return links;
    }
}