if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const fs = require('fs');
const http = require('http');
const https = require('https');

const express = require('express');
const passport = require('passport');
const session = require('express-session');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

const config = require('./config');
const routes = require('./routes');

const app = express();

const sessionOption = config.sessionOption;

if (app.get('env') === 'production') {
    app.set('trust proxy', 1) // trust first proxy
    sessionOption.cookie.secure = true // serve secure cookies
}

//middleware
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session(sessionOption));
app.use(passport.initialize());
app.use(passport.session());

//passportjs configuration
require('./lib/passport');
const checkAuthentication = (req, res, next) => {
    if (req.isAuthenticated()) {
        next();
    } else {
        res.status(401).json({
            message: 'Please login to continue.'
        });
    }
}

//routing
app.use('/user', routes.user);
app.use('/post', checkAuthentication, routes.post);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
});
// error handler
app.use(function (err, req, res, next) {
    res.locals.message = err.message;
    const result = {
        message: err.message,
        error: process.env.NODE_ENV !== 'production' ? err : {}
    }
    res.status(err.status || 500);
    res.json(result);
});


if (config.server.sslPrivateKey && config.server.sslCertificate) {
    const options = {
        key: fs.readFileSync(config.server.sslPrivateKey),
        cert: fs.readFileSync(config.server.sslCertificate)
    };
    https.createServer(options, app).listen(config.server.port, () => {
        console.info(`API running at https://${config.server.host}:${config.server.port}`);
    });
} else {
    http.createServer(app).listen(config.server.port, () => {
        console.info(`API running at http://${config.server.host}:${config.server.port}`);
    });
}