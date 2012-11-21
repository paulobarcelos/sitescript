var 
exports = module.exports,
fs = require('fs'),
handlebars = require('handlebars'),
http = require('http'),
wrench = require('wrench'),
static = require('node-static');

var setup = function(contentPath, templatesPath, publishPath, serverPort){
	contentPath = contentPath || './site/content';
	templatesPath = templatesPath || './site/templates';
	publishPath = publishPath || './site/www';
	serverPort = serverPort|| 8080;

	var templates = getTemplates(templatesPath);
	var content = getContent(contentPath);
	
	compileTemplates(content, templates);
	createPermalinks(content);
	createPaths(content);
	
	publish(content, contentPath, publishPath);
	
	serve(publishPath, serverPort);
}
var compileTemplates = function(content, templates){
	try{
		content.data.compiled = templates[content.data.template](content.data);
	}
	catch(e){
		return null;	
	}

	for(slug in content.children){
		compileTemplates(content.children[slug], templates);
	}
}
var createPermalinks = function(content){
	var parent = content.data.parent;
	if(parent){
		content.data.permalink = parent.data.permalink + content.data.slug + '/';
	}
	else content.data.permalink = '/';

	for(slug in content.children){
		createPermalinks(content.children[slug]);
	}
}
var createPaths = function(content){
	var parent = content.data.parent;
	if(parent){
		content.data.path = parent.data.path + "_" + content.data.slug + '/';
	}
	else content.data.path = '/';

	for(slug in content.children){
		createPaths(content.children[slug]);
	}
}
var createDirectories = function(content, rootPath){
	wrench.mkdirSyncRecursive(rootPath + content.data.permalink , 0777);

	for(slug in content.children){
		createDirectories(content.children[slug], rootPath);
	}
}
var createIndexes = function(content, rootPath){
	fs.writeFileSync(rootPath + content.data.permalink + 'index.html', content.data.compiled, 'utf8');

	for(slug in content.children){
		createIndexes(content.children[slug], rootPath);
	}
}
var linkResources = function(content, rootContentPath, rootPublishPath){
	for (var i = 0; i < content.resources.length; i++) {
		var src = __dirname + '/' + rootContentPath + content.data.path +  content.resources[i];
		var dst = __dirname + '/' + rootPublishPath + content.data.permalink +  content.resources[i];
		fs.symlinkSync(src, dst);
	};
	for(slug in content.children){
		linkResources(content.children[slug], rootContentPath, rootPublishPath);
	}
}
var getContent = function(path){
	var content = {
		data: {},
		resources: [],
		children: {}
	}
	
	var dir = fs.readdirSync(path);
	for (var i = 0; i < dir.length; i++) {
		var filename = dir[i];
		var filepath = path + '/' + filename;
		var stat = fs.statSync(filepath);

		// Data File
		if(filename == 'data.js'){
			try{
				content.data = require(path + '/data');
			}
			catch(e){
				console.log(filename + ' is not a valid data file.');	
			}			
			continue;
		}

		// Ignore hidden files
		if(filename.substr(0,1) === '.'){
			continue;
		}

		// Preprocess content
		if(filename == 'content.html' || filename == 'content.htm'){
			continue;
		}
		
		// Recurse children
		if(stat.isDirectory() && filename.substr(0,1) === '_'){
			var child = getContent(filepath)
			if(child){
				var slug = filename.substring(1);
				child.data.slug = slug;
				child.data.parent = content;
				content.children[slug] = child;
			}
			continue;
		}

		// Resources references
		content.resources.push(filename);

	}
	return content;
}
var getTemplates = function(path){
	var templates = {};

	var dir = fs.readdirSync(path);
	for (var i = 0; i < dir.length; i++) {
		var file = dir[i];
		var ext = file.substr(file.lastIndexOf('.')+1);
		var stat = fs.statSync(path + '/' + file);
		if(stat.isFile() && (ext == 'html' || ext == 'htm')){
			var id = file.substr(0, file.lastIndexOf('.')); // ignore extension
			var source = fs.readFileSync(path + '/' + file, 'utf8');
			var template = handlebars.compile(source);
			templates[id] = template;
		}		
	}
	return templates;
}
var publish = function(content, contentPath, publishPath){
	wrench.rmdirSyncRecursive(publishPath, true);
	fs.mkdirSync(publishPath);

	createDirectories(content, publishPath);
	createIndexes(content, publishPath);

	linkResources(content, contentPath, publishPath);
}
var serve = function(path, port){
	console.log("Serving " + path + " at port " + port + "...");
	var file = new(static.Server)(path);

	http.createServer(function (request, response) {
		request.addListener('end', function () {
			file.serve(request, response);
		});
	}).listen(port);
}

exports.setup = setup;