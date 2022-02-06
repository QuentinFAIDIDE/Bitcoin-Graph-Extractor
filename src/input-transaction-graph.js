var {
    get_tx_inputs,
    build_clients_object,
    set_btc_client_max_concurrency,
    set_clients
} = require("./bitcoin-clients.js");

const ora = require("ora");

var {initialize_graph_csvs} = require("./csv-writer.js");

function exec_input_transaction_graph(args) {
    // build the object representing bitcoin clients and send it to btc client manager
    let clients = build_clients_object(args.bitcoin_hosts, args.login, args.password);
    set_clients(clients);
    
    // check depth format 
    if(Number.isNaN(Number(args.depth))==true || Number(args.depth)<1) {
        console.error("Invalid depth");
        process.exit(1);
    }
    // check concurrency format
    if(Number.isNaN(Number(args.concurrency))==true || Number(args.concurrency)<1) {
        console.error("Invalid depth");
        process.exit(1);
    }

    let max_degree = 0;
    if(Object.prototype.hasOwnProperty.call(args, "max_degree")==true) {
        // check max_degree format
        if(Number.isNaN(Number(args.max_degree))==true || Number(args.max_degree)<3) {
            console.error("Invalid max_degree");
            process.exit(1);
        }
        max_degree = args.max_degree;
    }

    // set the max concurrency for the btc client request
    set_btc_client_max_concurrency(args.concurrency);

    // spinner widget for logs
    const spinnerStreams = ora({
        text:"Initializing steams...",
        stream: process.stdout
    }).start();
    spinnerStreams.color = "red";

    // prepare the csv wriing functions
    initialize_graph_csvs(args.node_output, args.edge_output).then((ioFunctions)=>{

        // change spinner
        spinnerStreams.succeed();

        // ioFunctions has function members:
        // writeNode, writeEdge, doneWriting

        // iterate over depths
        let depth = 0;
        let depth_txhashes = [
            [
                args.transaction
            ]
        ];

        // list of all hashes to prevent writing or searching nodes two times
        let txhashes = new Set();
        txhashes.add(args.transaction);
        
        let hashIdMap = {};
        hashIdMap[args.transaction] = 0;
        let lastIdUsed=0;

        // write the first node
        ioFunctions.writeNode(0, args.transaction, "Source");
        
        let depthCallback = ()=>{
            depth++;

            // if we are done, (max depth is our limit)
            if(depth>Number(args.depth)) {
                // end the csv streams
                ioFunctions.doneWriting(args.webapp_view).then(()=>{
                    //
                }).catch((err)=>{
                    console.error("Error while trying to copy csv and start webapp.");
                    console.error(err);
                    process.exit(1);
                });
                return;
            }

            // spinner widget for logs 
            let spinnerDepth = ora({
                text:"Extracting depth "+depth,
                stream: process.stdout
            }).start();
            spinnerDepth.color = "blue";
    
            let txInputsFound = 0;
            let txInputsToFind = depth_txhashes[depth-1].length;
            depth_txhashes[depth] = [];

            // for each transaction hash we have at depth
            for(let i=0;i<depth_txhashes[depth-1].length;i++) {
                // get its neightbors (inputs here)
                get_tx_inputs(depth_txhashes[depth-1][i]).then((neighbours)=>{

                    // id of the source tx (should always be set)
                    let sourceTxId = hashIdMap[depth_txhashes[depth-1][i]];

                    // for each neighbours
                    for(let j=0;j<neighbours.length;j++) {
                        // if it's not already searched
                        let new_tx = false;
                        if(txhashes.has(neighbours[j].hash)==false) {
                            // add it to hashes set
                            txhashes.add(neighbours[j].hash);
                            new_tx = true;
                            // get it a new id
                            lastIdUsed++;
                            hashIdMap[neighbours[j].hash] = lastIdUsed;
                        }
                        // if this is the last depth, the group is "End"
                        if((depth+1)>Number(args.depth)) {
                            if(new_tx==true) {
                                // write the node
                                ioFunctions.writeNode(hashIdMap[neighbours[j].hash],neighbours[j].hash, "End");
                            }
                            // write a new edge
                            ioFunctions.writeEdge(hashIdMap[neighbours[j].hash], sourceTxId, neighbours[j].address, neighbours[j].value);
                        }
                        // if max_degree is disabled or if we have not reached it
                        else if(max_degree==0 || neighbours.length<=max_degree) {
                            if(new_tx==true) {
                                // write the node
                                depth_txhashes[depth].push(neighbours[j].hash);
                                // write the node
                                ioFunctions.writeNode(hashIdMap[neighbours[j].hash],neighbours[j].hash, "Neutral");
                            }
                            // write a new edge
                            ioFunctions.writeEdge(hashIdMap[neighbours[j].hash], sourceTxId, neighbours[j].address, neighbours[j].value);
                        }
                        // else, the node is prunned so we check if it should be dispalyed or not
                        else if(args.hide_prunned==false) {
                            if(new_tx==true) {
                                // write the node
                                ioFunctions.writeNode(hashIdMap[neighbours[j].hash],neighbours[j].hash, "Prunned");
                            }
                            ioFunctions.writeEdge(hashIdMap[neighbours[j].hash], sourceTxId, neighbours[j].address, neighbours[j].value);
                        }
                    }
                    // increase counter
                    txInputsFound++;
                    // if we are done finding neighbours for this tx
                    if(txInputsFound>=txInputsToFind) {
                        // iterate to next depth
                        spinnerDepth.succeed();
                        depthCallback();
                        return;
                    }
                });
            }
        };
        // call to start first depth
        depthCallback();
    });
}

module.exports = { exec_input_transaction_graph };