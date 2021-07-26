var nodes=[];
var edges=[];
var nodes_ready=false;
var edges_ready=false;

// Parse local CSV file
Papa.parse("./exported_nodes.csv", {
	download: true,
	step: function(row) {
        if(row.data[0]!="Id") {
            nodes.push({
                id: row.data[0],
                label: row.data[1],
                group: row.data[2]
            });
        }
	},
	complete: function() {
		nodes_ready=true;
	}
});

// Parse local CSV file
Papa.parse("./exported_edges.csv", {
	download: true,
	step: function(row) {
        if(row.data[0]!="Source") {
            edges.push({
                from: row.data[0],
                to: row.data[1],
                label: row.data[2],
                weight: row.data[3]
            });
        }
	},
	complete: function() {
		edges_ready=true;
	}
});