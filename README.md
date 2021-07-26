# Bitcoin Graph Extractor
Nodejs script to extract a few transactions into csv with nodes and edges from Bitcoin Core rpc api. Recently added a dashboard to explore the data interractively in your web browser.

![alt text](https://github.com/QuentinFAIDIDE/Bitcoin-Graph-Extractor/raw/master/html-viewer/app.jpg)

## Scalability
This was not meant for huge datasets, but rather as a way to get a quick visualization into Gephi from the Bitcoin Core client. The Bitcoin client has a maximum queue limit for concurrent request and has poor performances whenever we use the getrawtransaction command. If you are looking into exporting larger dataset, consider using a distributed ETL that get whole blocks into a database.



Nonetheless, you can provide bitcoin clients as a comma separated list if you want to dispatch the api calls between more bitcoin clients.

## Requirements
The bitcoin core node used must have the `txindex` parameter set to 1.

## Installation
Clone this repo and run:
```bash
npm install
```

## Usage
Run the help command on each command to get help.
```bash
./bitcoin-graph-extractor --help 
./bitcoin-graph-extractor input_transaction_graph --help 
```

There is currently only the input_transaction_graph command, which goes through all tx inputs recursively and has a few setting to configure transaction research and limit its cardinality:
```
  usage: bitcoin-graph-extractor input_transaction_graph [-h] [-b BITCOIN_HOSTS] [-d DEPTH] [-c CONCURRENCY] -t TRANSACTION -l LOGIN [-m MAX_DEGREE] [-n NODE_OUTPUT] [-e EDGE_OUTPUT] -p PASSWORD [-w] [-H]

optional arguments:
  -h, --help            show this help message and exit
  -b BITCOIN_HOSTS, --bitcoin-hosts BITCOIN_HOSTS
                        Comma separated list of HOST:PORT to reach bitcoin core clients rpc api.
  -d DEPTH, --depth DEPTH
                        The maximum depth to look at (warning: tx count will grow exponentially as you increase it).
  -c CONCURRENCY, --concurrency CONCURRENCY
                        The maximum number of concurrent HTTP requests to have in threadpool at any time.
  -t TRANSACTION, --transaction TRANSACTION
                        The transaction hash in hexa without the 0x prefix.
  -l LOGIN, --login LOGIN
                        BTC RPC API Login.
  -m MAX_DEGREE, --max-degree MAX_DEGREE
                        Do not search nodes that have this degree of higher.
  -n NODE_OUTPUT, --node-output NODE_OUTPUT
                        File to dump the nodes in.
  -e EDGE_OUTPUT, --edge-output EDGE_OUTPUT
                        File to dump the edges in.
  -p PASSWORD, --password PASSWORD
                        BTC RPC API Password.
  -w, --webapp-view     Deploy a graph visualization webapp on local host and open in browser
  -H, --hide-prunned    Hide the prunned nodes that were input of a tx with more than max-degree inputs
```

A call to the single command available yet to open the graph viewer in browser would look like:
```
./bitcoin-graph-extractor input_transaction_graph --bitcoin-hosts 10.45.33.60:31749 --depth 8 --concurrency 18 --login mylogin --password mypassword --max-degree 10 --transaction 609e187d3ca77fd22bddf11bff4def4eabdc24ddcb85156e33a082566c25d2f6 --webapp-view --hide-prunned
```

## Disclaimer
I cannot guanrantee the integrity of the data retrieved with this script.