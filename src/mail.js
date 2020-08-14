const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		user: 'ogame.alert.watch@gmail.com',
		pass: 'alertwatch94' // Naturally, replace both with your real credentials or an application-specific password
	}
});

module.exports = {
	send: to => {
		const mailOptions = {
			from: 'vindication@enron.com',
			to,
			subject: '[Warning] - Incoming attack',
			text: 'no detail for this alpha'
		};

		transporter.sendMail(mailOptions, (error, info) => {
			if (error) {
				console.log(error);
			} else {
				console.log('Email sent: ' + info.response);
			}
		});
	}
};
