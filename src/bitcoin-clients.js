let request = require("request");
var cq = require("concurrent-queue");

// default RPC client port
let DEFAULT_BTC_RPC_PORT = 8332;

// this will be used to cache blocks locally
let blocks_cache = {};
let tx_cache = {};

let MAX_CLIENT_CONCURRENCY = 50;

// transform the comma separated list of clients into an object
function build_clients_object (clients_str, login, password) {
    // split list of clients
    let clients_raw = clients_str.split(",");
    // initialize final object structure
    let clients = {
        hosts: [],
        ports: [],
        last_used_id: 0,
        login: login,
        password: password
    };
    // for each client
    for(let i=0;i<clients_raw.length;i++) {
        // if they have a port
        if(clients_raw[i].split(":").length==2) {
            clients.hosts.push(clients_raw[i].split(":")[0]);
            clients.ports.push(clients_raw[i].split(":")[1]);
        // if they don't but stil are valid
        } else if(clients_raw[i].split(":").length==1) {
            clients.hosts.push(clients_raw[i].split(":")[0]);
            clients.ports.push(String(DEFAULT_BTC_RPC_PORT));
        // it may be possible that password was send in url
        // that would result in the ":" split having more elems
        } else {
            throw new Error("Unable to parse Bitcoin clients hosts and ports");
        }
    }
    // return the object
    return clients;
}

// this function will setup the callback for requests and put em in cache
var node_req_queue;
function set_btc_client_max_concurrency(concurrency) {
    node_req_queue = cq().limit({concurrency: Number(concurrency)}).process((task)=>{
        return new Promise((resolve,reject)=>{
            let instructions = task.split(":");
            // what happen if it's a tx task
            if(instructions[0]=="tx") {
                get_and_cache_tx(instructions[1]).then(resolve).catch(reject);
            // fallback
            } else {
                console.error("Unrecognised task instruction received");
                process.exit(1);
            }
        });
    });
}

var btc_clients;
function set_clients(clients) {
    btc_clients=clients;
}

function get_and_cache_tx(hash) {
    return new Promise((resolve,reject)=>{
        // start a request to the rpc api
        var dataString = JSON.stringify({
            "jsonrpc": "1.0",
            "id": "curltext",
            "method": "getrawtransaction",
            "params": [hash, true]
        });
            // get the client infos to reach
        let client =  next_crypto_client(btc_clients);
        // build the REST request
        var options = {
            url: `http://${btc_clients.login}:${btc_clients.password}@${client}/`,
            method: "POST",
            headers: {"content-type": "text/plain;"},
            body: dataString
        };

        request(options, (error, response, body)=>{

            // if errors, exit and print it
            if(error) {
                reject(error);
                return;
            }
            if(response.statusCode!=200) {
                console.error("BTC Client error with code on get_tx:"+response.statusCode);
                console.error(JSON.parse(body).error.message);
                reject(new Error("Unexpected bitcoin client status code: "+response.statusCode));
                return;
            }
            // we parse the json and return it while handling errors
            let obj;
            try {
                obj = JSON.parse(body);
            } catch(parseErr) {
                console.error("Invalid JSON returned by Bitcoin RPC Api");
                reject(parseErr);
                return;
            }
            // save it in cache
            tx_cache[hash]=obj.result;
            resolve();
        });
    });
}

// Will help in equally dispatching request to btc clients.
// It simply iterate over next client and return host/port
function next_crypto_client (clients)  {
    // change the id to the next 
    clients.last_used_id +=1;
    // watch for when we need to go back to first one
    if(clients.last_used_id>=clients.hosts.length) {
        clients.last_used_id = 0;
    }
    // now we can return the client
    return ""+clients.hosts[clients.last_used_id]+":"+clients.ports[clients.last_used_id];
}

function get_block(hash) {
    return new Promise((resolve,reject)=>{

        // if the block is already queried previously
        if(Object.prototype.hasOwnProperty.call(blocks_cache, hash)==false) {
            // build RPC request to bitcoin rpc api
            var dataString = JSON.stringify({
                "jsonrpc": "1.0",
                "id": "curltext",
                "method": "getblock",
                "params": [hash, 2]
            });
            // get the client infos to reach
            let client =  next_crypto_client(btc_clients);
            // build the REST request
            var options = {
                url: `http://${btc_clients.login}:${btc_clients.password}@${client}/`,
                method: "POST",
                headers: {"content-type": "text/plain;"},
                body: dataString
            };
            request(options, (error, response, body)=>{
                if(error) {
                    reject(error);
                    return;
                }
                if(response.statusCode!=200) {
                    console.error(JSON.parse(body).error.message);
                    reject(new Error("Unexpected bitcoin client status code: "+response.statusCode));
                    return;
                }
                // we parse the json and return it while handling errors
                let obj;
                try {
                    obj = JSON.parse(body);
                } catch(parseErr) {
                    console.error("Invalid JSON returned by Bitcoin RPC Api");
                    reject(parseErr);
                    return;
                }
                // save it in the cache
                blocks_cache[hash] = obj;
                // return it
                resolve(obj);
            });
        // if the block was in the cache return it right away
        } else {
            resolve(blocks_cache[hash]);
        }
    });
}

// get the tx or the tx value (if nout is set), from cache or rpc api
function get_tx(tx_hash, nout=null) {
    return new Promise((resolve,reject)=>{
        // if tx is in cache
        if(Object.prototype.hasOwnProperty.call(tx_cache, tx_hash)==true) {
            // if nout is unset
            if(nout==null) {
                // return it
                resolve(tx_cache[tx_hash]);
                return;
            // if nout is set
            } else {
                // return the output value
                resolve(tx_cache[tx_hash].vout[nout].value);
                return;
            }
        // if tx is not in cache
        } else {

            // register callback when tx is found
            node_req_queue("tx:"+tx_hash).then(()=>{

                // if nout is unset
                if(nout==null) {
                    // return it
                    resolve(tx_cache[tx_hash]);
                    return;
                // if nout is set
                } else {
                    // return the output value
                    resolve(tx_cache[tx_hash].vout[nout].value);
                    return;
                }
            });
        }
    });
}

function get_tx_inputs(hash) {
    return new Promise((resolve,reject)=>{
        let inputs = [];
        let txFounds=0;
        get_tx(hash).then((target_tx)=>{
            for(let i=0;i<target_tx.vin.length;i++) {
                // if coinbase, ignore
                if(Object.prototype.hasOwnProperty.call(target_tx.vin[i], "coinbase")==true) {
                    txFounds++;
                    if(txFounds>=target_tx.vin.length) {
                        resolve(inputs);
                        return;
                    }
                // if it's a normal tx, we get it and save values
                } else {
                    get_tx(target_tx.vin[i].txid, target_tx.vin[i].vout).then((value)=>{
                        inputs.push({
                            "value": value,
                            "hash": target_tx.vin[i].txid
                        });
                        txFounds++;
                        if(txFounds>=target_tx.vin.length) {
                            resolve(inputs);
                            return;
                        }
                    });
                }
            }
        });
    });
}

module.exports = { get_block, get_tx_inputs, build_clients_object, set_btc_client_max_concurrency, set_clients };