const ghpages = require('gh-pages');
ghpages.publish(
	'public', // path to public directory
	{
		branch: 'gh-pages',
		repo: 'https://github.com/cell-org/script.cell.computer.git',
		user: {
			name: 'skogard',
			email: 'skogard@protonmail.com'
		},
		dotfiles: true
	},
	() => {
		console.log('Deploy Complete!');
	}
);
