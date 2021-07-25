var {
    get_tx_inputs,
    build_clients_object,
    set_btc_client_max_concurrency,
    set_clients
} = require("./bitcoin-clients.js");

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

    // set the max concurrency for the btc client request
    set_btc_client_max_concurrency(args.concurrency);

    // prepare the csv wriing functions
    initialize_graph_csvs(args.node_output, args.edge_output).then((ioFunctions)=>{

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
        ioFunctions.writeNode(0, args.transaction);
        
        let depthCallback = ()=>{
            depth++;
            // if we are done, (max depth is our limit)
            if(depth>args.depth) {
                // end the csv streams
                ioFunctions.doneWriting();
                // and exit the program
                console.log("The transactions have been written.");
                process.exit(0);
            }

            let txInputsFound = 0;
            let txInputsToFind = depth_txhashes[depth-1].length;
            depth_txhashes[depth] = [];

            // for each transaction hash we have at depth
            for(let i=0;i<depth_txhashes[depth-1].length;i++) {
                // get its neightbors (inputs here)
                get_tx_inputs(depth_txhashes[depth-1][i]).then((neighbours)=>{

                    // id of the source tx (should always be set)
                    let sourceTxId = hashIdMap[depth_txhashes[depth-1][i]];
                    // if no neighbours (only tx is coinbase?)
                    if(neighbours.length==0) {
                        // increase counter
                        txInputsFound++;
                        // if we are done finding neighbours for this tx
                        if(txInputsFound>=txInputsToFind) {
                            // iterate to next depth
                            depthCallback();
                            return;
                        }
                    }
                    // for each neighbours
                    for(let j=0;j<neighbours.length;j++) {
                        // if it's not already searched
                        if(txhashes.has(neighbours[j].hash)==false) {
                            // add it to hashes set
                            txhashes.add(neighbours[j].hash);
                            // get it a new id
                            lastIdUsed++;
                            hashIdMap[neighbours[j].hash] = lastIdUsed;
                            // write the node
                            ioFunctions.writeNode(lastIdUsed,neighbours[j].hash);
                            depth_txhashes[depth].push(neighbours[j].hash);
                        }
                        // write a new edge
                        ioFunctions.writeEdge(hashIdMap[neighbours[j].hash], sourceTxId, null, neighbours[j].value);
                    }
                    // increase counter
                    txInputsFound++;
                    // if we are done finding neighbours for this tx
                    if(txInputsFound>=txInputsToFind) {
                        // iterate to next depth
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