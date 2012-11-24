var sitescript = require('./sitescript');

sitescript.setup({
	posts: './site/posts', 
	theme: './site/theme',
	port: process.env.VCAP_APP_PORT || 8080
});