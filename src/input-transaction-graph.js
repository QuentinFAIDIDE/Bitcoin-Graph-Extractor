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
        ioFunctions.writeNode(0, args.transaction);
        
        let depthCallback = ()=>{
            depth++;

            // spinner widget for logs
            const spinnerDepth = ora({
                text:"Extracting depth 1 with 0 transactions",
                stream: process.stdout
            }).start();
            spinnerDepth.color = "blue";

            // if we are done, (max depth is our limit)
            if(depth>args.depth) {
                // end the csv streams
                ioFunctions.doneWriting();
                spinnerDepth.succeed();
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

                    // update spinner text
                    spinnerDepth.text = "Extracting depth "+depth+" with "+txInputsFound+"/"+txInputsToFind+" transactions";

                    // id of the source tx (should always be set)
                    let sourceTxId = hashIdMap[depth_txhashes[depth-1][i]];
                    // if no neighbours (only tx is coinbase?)
                    if(neighbours.length==0) {
                        // increase counter
                        txInputsFound++;
                        // if we are done finding neighbours for this tx
                        if(txInputsFound>=txInputsToFind) {
                            // iterate to next depth
                            spinnerDepth.succeed();
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
                            // if max_degree is disabled or if we have reached it
                            if(max_degree==0 || neighbours.length<=max_degree) {
                                depth_txhashes[depth].push(neighbours[j].hash);
                            }
                        }
                        // write a new edge
                        ioFunctions.writeEdge(hashIdMap[neighbours[j].hash], sourceTxId, null, neighbours[j].value);
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