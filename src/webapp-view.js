const express = require("express");
const cors = require("cors");
const open = require("open");

function start_webapp(node_file, edge_file) {
    return new Promise((resolve,reject)=>{
        // create express app
        const app = express();

        // use cors
        // todo: define cors routes
        app.use(cors());

        // share the html/css/js folder
        app.use("/", express.static("html-viewer"));

        let PORT = 51298;

        // start the server
        app.listen(PORT, () => {
            console.log(`Web view app listening at http://127.0.0.1:${PORT} !`);
        });

        // open link to webapp
        open("http://127.0.0.1:"+PORT);

        // this function will never resolve
    });
}

module.exports = {start_webapp};