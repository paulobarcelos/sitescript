var sitescript = require('./sitescript');

sitescript.setup({
	posts: './site/posts', 
	templates: './site/templates',
	serve: './site/serve',
	port: process.env.VCAP_APP_PORT || 8080
});