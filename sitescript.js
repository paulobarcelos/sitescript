var 
exports = module.exports,
fs = require('fs'),
http = require('http'),
handlebars = require('handlebars'),
wrench = require('wrench'),
md = require('marked'),
static = require('node-static');

var setup = function(options){
	var settings = generateValidSettings(options);
	
	var templates = exctractTemplates(settings.templates);
	var rootPost = extractPost(settings.posts);
	
	applyPermalinks(rootPost);
	applyPaths(rootPost);

	preprocessContent(rootPost, templates);
	applyCompiledTemplates(rootPost, templates);
	applyCompiled404Template(rootPost, templates);
		
	clearRoot(settings.serve);

	createDirectories(rootPost, settings.serve);
	createIndexFiles(rootPost, settings.serve);
	create404File(rootPost, settings.serve);
	createResourceSymlinks(rootPost, settings.posts, settings.serve);
	
	serve(settings.serve, settings.port);
}
var generateValidSettings = function(options){
	if(typeof(options) !== 'object'){
		options = {};
		console.log('"options" are invalid!');
	}
	if(!options.posts){
		options.posts = './site/posts';
		console.log('"posts" path not specified, using default '+ options.posts);
	}
	else {
		console.log('"posts" path - ' + options.posts);
	}
	if(!options.templates){
		options.templates = './site/templates';
		console.log('"templates" path not specified, using default '+ options.templates);
	}
	else {
		console.log('"templates" path - ' + options.templates);
	}
	if(!options.serve){
		options.serve = './site/serve';
		console.log('"serve" path not specified, using default '+ options.serve);
	}
	else {
		console.log('"serve" path - ' + options.serve);
	}
	if(!options.port){
		options.port = 8080;
		console.log('"port" not specified, using default '+ options.port);
	}
	else {
		console.log('"port" - ' + options.port);
	}

	return options;
}
var extractPost = function(path, root){
	var post;
	try{
		post = require(path + '/data');
	}
	catch(e){
		console.log(filename + ' is not a valid data file.');
		post = {};	
	}
	post.children = [];
	post.root = root || post;
	post.resources = [];

	var dir = fs.readdirSync(path);
	for (var i = 0; i < dir.length; i++) {
		var filename = dir[i];
		var filepath = path + '/' + filename;
		var stat = fs.lstatSync(filepath);

		// Ignore hidden files and data.js
		if(filename.substr(0,1) === '.' || filename === 'data.js'){
			continue;
		}

		// Store raw content
		if(filename === 'content.md' || filename === 'content.mdown' || filename === 'content.markdown'){
			try{
				post.rawContent = fs.readFileSync(path + '/' + filename, 'utf8');
			}
			catch(e){
				console.log(filename + ' is not a valid content file.');	
			}
			continue;
		}
		
		// Recurse children
		if(stat.isDirectory() && filename.substr(0,1) === '_'){
			var child = extractPost(filepath, post.root)
			if(child){
				var slug = filename.substring(1);
				child.slug = slug;
				child.parent = post;
				post.children.push(child);
			}
			continue;
		}

		// Resources references
		post.resources.push(filename);

	}
	return post;
}
var exctractTemplates = function(path){
	var templates = {};
	var dir = fs.readdirSync(path);
	for (var i = 0; i < dir.length; i++) {
		var file = dir[i];
		var ext = file.substr(file.lastIndexOf('.')+1);
		var stat = fs.statSync(path + '/' + file);
		if(stat.isFile() && (ext == 'html' || ext == 'html')){
			var id = file.substr(0, file.lastIndexOf('.')); // ignore extension
			
			var source = fs.readFileSync(path + '/' + file, 'utf8');
			handlebars.registerPartial(id, source);			
			var template = handlebars.compile(source);
			
			templates[id] = template;
		}		
	}
	return templates;
}
var applyPermalinks = function(post){
	var parent = post.parent;
	if(parent){
		post.permalink = parent.permalink + post.slug + '/';
	}
	else post.permalink = '/';

	for(var i = 0; i < post.children.length; i++){
		applyPermalinks(post.children[i]);
	}
}
var applyPaths = function(post){
	var parent = post.parent;
	if(parent){
		post.path = parent.path + "_" + post.slug + '/';
	}
	else {
		post.path = '/';
	}

	for(var i = 0; i < post.children.length; i++){
		applyPaths(post.children[i]);
	}
}
var preprocessContent = function(post, templates){
	if(post.rawContent){
		// Make the content into a template and run the data through it
		var template = handlebars.compile(post.rawContent);
		var markdown = template(post);
		// Finally convert the MD to markup
		post.content = md(markdown);
	}

	for(var i = 0; i < post.children.length; i++){
		preprocessContent(post.children[i], templates);
	}
}
var applyCompiledTemplates = function(post, templates){
	try{
		post.compiled = templates[post.template](post);
	}
	catch(e){}

	for(var i = 0; i < post.children.length; i++){
		applyCompiledTemplates(post.children[i], templates);
	}
}
var applyCompiled404Template = function(post, templates){
	var parent = post.parent;
	if(!parent){
		if(templates['404']){
			post.compiled404 = templates['404'](post);
		}
		else post.compiled404 = '<h1>404</h1>';
	}
}
var clearRoot = function(path){
	wrench.rmdirSyncRecursive(path, true);
	fs.mkdirSync(path);
}
var createDirectories = function(post, rootPath){
	wrench.mkdirSyncRecursive(rootPath + post.permalink , 0777);

	for(var i = 0; i < post.children.length; i++){
		createDirectories(post.children[i], rootPath);
	}
}
var createIndexFiles = function(post, rootPath){
	fs.writeFileSync(rootPath + post.permalink + 'index.html', post.compiled, 'utf8');

	for(var i = 0; i < post.children.length; i++){
		createIndexFiles(post.children[i], rootPath);
	}
}
var create404File = function(post, rootPath){
	var parent = post.parent;
	if(!parent){
		fs.writeFileSync(rootPath + post.permalink + '404.html', post.compiled404, 'utf8');
	}
}
var createResourceSymlinks = function(post, rootContentPath, rootPublishPath){
	for (var i = 0; i < post.resources.length; i++) {
		var src = __dirname + '/' + rootContentPath + post.path +  post.resources[i];
		var dst = __dirname + '/' + rootPublishPath + post.permalink +  post.resources[i];
		fs.symlinkSync(src, dst);
	};
	for(var i = 0; i < post.children.length; i++){
		createResourceSymlinks(post.children[i], rootContentPath, rootPublishPath);
	}
}
var serve = function(path, port){
	var file = new(static.Server)(path);

	var serve404 = function(request, response){
		file.serveFile('/404.html', 404, {}, request, response);
	}
	http.createServer(function (request, response) {
		request.addListener('end', function () {
			if(request.url == '/404.html'){
				serve404(request, response);
				return;
			}
			file.serve(request, response, function (e, res) {
				if ((e && (e.status === 404))) {
					serve404(request, response);
				}
			});
		});
	}).listen(port);
}

exports.setup = setup;
