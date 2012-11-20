var 
fs = require('fs'),
handlebars = require('handlebars'),
http = require('http'),
wrench = require('wrench'),
static = require('node-static');

var setup = function(templatesPath, contentPath, publishPath){
	templatesPath = templatesPath || './site/templates';
	contentPath = contentPath || './site/content';
	publishPath = publishPath || './site/www';

	var templates = getTemplates(templatesPath);
	var content = getContent(contentPath);
	
	compileTemplates(content, templates);
	createPermalinks(content);
	publish(content, publishPath)
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
	try{
		var parent = content.data.parent;
		if(parent){
			content.data.permalink = parent.data.permalink + content.data.slug + '/';
		}
		else content.data.permalink = '/';
	}
	catch(e){
		return null;	
	}

	for(slug in content.children){
		createPermalinks(content.children[slug]);
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
var publish = function(content, path){
	wrench.rmdirSyncRecursive(path, true);
	fs.mkdirSync(path);
}


setup();


/*

var file = new(static.Server)('./www');

http.createServer(function (request, response) {
	console.log(request)
	request.addListener('end', function () {
		file.serve(request, response);
	});
}).listen(process.env.VCAP_APP_PORT || 8080);*/

