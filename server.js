var sitescript = require('./sitescript');

sitescript.setup(
	'./site/content', 
	'./site/templates',
	'./site/www',
	process.env.VCAP_APP_PORT || 8080
);