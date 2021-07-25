const fs = require("fs");
const { format } = require("@fast-csv/format");

function initialize_graph_csvs(node_file, edge_file) {
    return new Promise((resolve,reject)=>{
        // returned object has function members:
        // writeNode, writeEdge, doneWriting
        
        // create writing stream
        var nodeWriteStream = fs.createWriteStream(node_file);
        var edgeWriteStream = fs.createWriteStream(edge_file);

        var nodeStream = format({ headers: ["Id", "Label"] });
        nodeStream.pipe(nodeWriteStream);

        var edgeStream = format({ headers: ["Source", "Target", "Label", "Weight"] }); 
        edgeStream.pipe(edgeWriteStream);

        // create callbacks to return
        resolve( {
            "writeNode": (id, label)=>{
                nodeStream.write([id,label]);
            },
            "writeEdge": (source, target, label, weight)=>{
                edgeStream.write([source, target, label, weight]);
            },
            "doneWriting": ()=>{
                nodeStream.end();
                edgeStream.end();
            }
        });
    });
}

module.exports = {initialize_graph_csvs};