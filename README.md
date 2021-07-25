# Bitcoin Graph Extractor
Nodejs script to extract csv with nodes and edges from Bitcoin Core rpc api.

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

## Disclaimer
I cannot guanrantee the integrity of the data retrieved with this script.