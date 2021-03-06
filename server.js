// Modules required: child_process, ejs, express, libxmljs

// Where did you install python to?
var pythonPath = "C:/Python27/python.exe";

// Script and data paths
var fbrbPath = __dirname + "/../dist/linux/levels/mp_common/level-00.fbrb";
var dbxPath = __dirname + "/scripts/dbx.py";
var archivePath = __dirname + "/scripts/archive.py";
var objectsPath = __dirname + "/../dist/linux/levels/mp_common/level-00 FbRB";
var weaponPath = objectsPath + "/Objects/Weapons/Handheld";

// Hold major important categories
var listOfWeapons = [];

// working holder
var reading = 0;
var writing = 0;

var spawn = require("child_process").spawn;
var express = require("express");
var app = express();

app.set("views", __dirname + "/views");
app.engine("html", require("ejs").renderFile);

app.use("/fonts", express.static(__dirname + "/fonts"));
app.use("/css", express.static(__dirname + "/css"));
app.use("/images", express.static(__dirname + "/images"));
app.use("/js", express.static(__dirname + "/js"));
app.use("/scripts", express.static(__dirname + "/scripts"));

app.use(express.urlencoded());
app.use(express.json());

// Server starting...
var loading = "Initializing...";
extract();
// writeFiles(weaponPath);
// compress();
// testWithoutExtract();

app.get("/", function(req, res) {
	res.render("index.html");
});

app.get("/ready", function(req, res) {
	res.end(loading);
});

app.post("/save", function(req, res) {
	res.end("rcvd");
	console.log(req.body.tabs);

	var fs = require('fs');
	var filename = "./save/tabs.xml";
	fs.writeFile(filename, JSON.stringify(req.body.tabs));
});

app.get("/read", function(req, res) {
	var fs = require('fs');
	var filename = "./save/tabs.xml";

	fs.readFile(filename, function(err, data) {
		if (err) {
			res.end("undefined");
		} else {
			res.end(data);
		}
	});
});

app.get("/getAllWeapons", function(req, res) {
	readFiles(weaponPath, false, function() {
		res.end(JSON.stringify(listOfWeapons));
	});
});

app.get("/index.html", function(req, res) {
	res.render("index.html");
});

app.get("/editor.html", function(req, res) {
	res.render("editor.html");
});

app.listen(8888);

function testWithoutExtract() {
	loading = "Task complete!";
}

// Start the unarchiver
function extract() {
	console.log("Starting unarchiver...");

	var unarchive = spawn(pythonPath, [archivePath, fbrbPath]);

	loading = "Extracting mp_common fbrb archive...";

	unarchive.stdout.on("data", function(data) {
		console.log("Output: " + data);
	});

	unarchive.stderr.on("data", function(data) {
		console.log("Error: " + data);
	});

	unarchive.on("close", function(code) {
		console.log("Unarchive complete!");
		loading = "Task complete!";
		//readFiles(weaponPath);
	});
}

function compress() {
	console.log("Starting compressor...");

	var folderPath = fbrbPath.substring(0, fbrbPath.length - 5) + " FbRB";
	var archive = spawn(pythonPath, [archivePath, folderPath]);

	loading = "Compressing mp_common fbrb archive...";

	archive.stdout.on("data", function(data) {
		console.log("Output: " + data);
	});

	archive.stderr.on("data", function(data) {
		console.log("Error: " + data);
	});

	archive.on("close", function(code) {
		console.log("Compression complete!");
		loading = "Task complete!";
	});
}

function readFiles(objPath, convert, callback) {
	console.log("Reading files...");
	reading = 0;
	readDir(objPath, function(err, files) {
		for (var a in files) {
			if (files[a].endsWith("_firing.dbx") || files[a].endsWith("_Firing.dbx")) {
				loading = "Reading " + files[a];
				if (convert) {
					dbxConvert(files[a]);
				}
				
				var path = require("path");
				listOfWeapons.push(path.basename(files[a].toUpperCase().replace("_FIRING.DBX", "")));
				
				reading++;
			}
		}
		if (!convert) {
			callback();
			return;
		}
	});

	// Check if it's over
	var check = setInterval(function() {
		if (reading == 0) {
			clearInterval(check);
			loading = "Task complete!";
			console.log("Reading complete!");
			callback();
		}
	}, 1000);
}

function writeFiles(objPath) {
	console.log("Writing files...");
	writing = 0;
	readDir(objPath, function(err, files) {
		for (var a in files) {
			if (files[a].endsWith("_firing.xml") || files[a].endsWith("_Firing.xml")) {
				loading = "Writing " + files[a];
				xmlConvert(files[a]);
				writing++;
			}
		}
	});

	// Check if it's over
	var check = setInterval(function() {
		if (writing == 0) {
			clearInterval(check);
			loading = "Task complete!";
			console.log("Writing complete!");
			compress();
		}
	}, 1000);
}

function dbxConvert(dbxFile) {
	var dbxToXml = spawn(pythonPath, [dbxPath, dbxFile]);

	dbxToXml.stdout.on("data", function(path) {
		/* var fs = require('fs');
		 var parseString = require('xml2js').parseString;
		 var filename = path.toString().substring(0, path.toString().length - 5) + "xml";
		 fs.readFile(filename, function(err, data) {
		 xmlToJson(data, function(result) {
		 fs.writeFile(filename, result);
		 console.log(">> Write file");
		 });
		 if (err) {
		 console.log(err);
		 }
		 }); */
	});

	dbxToXml.stderr.on("data", function(data) {
		console.log("Error: " + data);
	});

	dbxToXml.on("close", function(code) {
		reading--;
	});
}

function xmlConvert(xmlFile) {
	var xmlToDbx = spawn(pythonPath, [dbxPath, xmlFile]);

	xmlToDbx.stdout.on("data", function(path) {
		//console.log(path);
	});

	xmlToDbx.stderr.on("data", function(data) {
		console.log("Error: " + data);
	});

	xmlToDbx.on("close", function(code) {
		writing--;
	});
}

function xmlToJson(xml, callback) {
	var libxmljs = require("libxmljs");
	var doc = libxmljs.parseXml(xml);
	var support = require("./scripts/support.js");
	var path = ["FiringFunctionData", "FireLogic", "Recoil", "RecoilFollowsDispersion"];
	doc.get(objectToXpath(path, support)).text(true);
	//console.log(doc.get(objectToXpath(path, support)).text());
	console.log(">> Read file");
	callback(doc.toString());
}

function objectToXpath(obj, path) {
	var currentPath = path.xpath;

	// partition
	var xpath = currentPath.path;

	// loop until almost end
	for (var i = 0; i < obj.length - 1; i++) {
		currentPath = currentPath[obj[i]];
		xpath += currentPath.path;
	}

	// last element
	xpath += currentPath[obj[obj.length - 1]];
	return xpath;
}

// Recursively read all files in the directory
function readDir(dir, done) {
	var fs = require("fs");
	var path = require("path");

	var results = [];
	fs.readdir(dir, function(err, list) {
		if (err)
			return done(err);
		var pending = list.length;
		if (!pending)
			return done(null, results);
		list.forEach(function(file) {
			file = path.resolve(dir, file);
			fs.stat(file, function(err, stat) {
				if (stat && stat.isDirectory()) {
					readDir(file, function(err, res) {
						results = results.concat(res);
						if (!--pending)
							done(null, results);
					});
				} else {
					results.push(file);
					if (!--pending)
						done(null, results);
				}
			});
		});
	});
}

String.prototype.endsWith = function(suffix) {
	return this.indexOf(suffix, this.length - suffix.length) !== -1;
};
