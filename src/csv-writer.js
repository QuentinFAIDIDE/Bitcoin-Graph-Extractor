const fs = require("fs");
const { format } = require("@fast-csv/format");
const { start_webapp } = require("./webapp-view");
const { exec } = require("child_process");

function initialize_graph_csvs(node_file, edge_file) {
    return new Promise((resolve,reject)=>{
        // returned object has function members:
        // writeNode, writeEdge, doneWriting
        
        // create writing stream
        var nodeWriteStream = fs.createWriteStream(node_file);
        var edgeWriteStream = fs.createWriteStream(edge_file);

        var nodeStream = format({ headers: ["Id", "Label", "Group"] });
        nodeStream.pipe(nodeWriteStream);

        var edgeStream = format({ headers: ["Source", "Target", "Label", "Weight"] }); 
        edgeStream.pipe(edgeWriteStream);

        // create callbacks to return
        resolve( {
            "writeNode": (id, label, group)=>{
                nodeStream.write([id,label,group]);
            },
            "writeEdge": (source, target, label, weight)=>{
                edgeStream.write([source, target, label, weight]);
            },
            "doneWriting": (use_webapp)=>{
                return new Promise((resolve,reject)=>{
                    nodeStream.end();
                    edgeStream.end();
                    if(use_webapp==true) {
                        exec("cp "+node_file+" html-viewer/exported_nodes.csv && cp "+edge_file+" html-viewer/exported_edges.csv", (errEx, stdOEx, stdEEx)=>{
                            if(errEx) {
                                reject(errEx);
                                return;
                            }
                            start_webapp().then(resolve).catch(reject);
                        });
                    } else {
                        resolve();
                    }
                });
            }
        });
    });
}

module.exports = {initialize_graph_csvs};