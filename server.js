var 
fs = require('fs'),
handlebars = require('handlebars'),
http = require('http'),
requirejs = require('requirejs'),
static = require('node-static');

var setup = function(){
	var templates = getTemplates('./templates');
	var content = getContent('./content');
	compile(content, templates);
	console.log(content);
}

var compile = function(content, templates){
	try{
		content.compiled = templates[content.data.template](content.data);
	}
	catch(e){
		return null;	
	}

	for(slug in content.children){
		compile(content.children[slug], templates);
	}
}

var getContent = function(path){
	var content = {
		data: null,
		children: {}
	}
	try{
		content.data = require(path + '/_data');
	}
	catch(e){
		return null;	
	}

	var dir = fs.readdirSync(path);
	for (var i = 0; i < dir.length; i++) {
		var slug = dir[i];
		if(slug !== '_data.js'){
			var stat = fs.statSync(path + '/' + slug);
			if(stat.isDirectory()){
				var child = getContent(path + '/' + slug)
				if(child){
					child.data.slug = slug;
					content.children[slug] = child;
				}
			}

		}
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
setup();


/*

var file = new(static.Server)('./www');

http.createServer(function (request, response) {
	console.log(request)
	request.addListener('end', function () {
		file.serve(request, response);
	});
}).listen(process.env.VCAP_APP_PORT || 8080);*/

