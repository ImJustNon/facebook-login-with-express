require("dotenv").config();
const express = require('express');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const http = require("http");
const morgan = require("morgan");
const app = express();
const server = http.createServer(app);
const port = process.env.PORT;

// setup mongodb session
const mongoDBStore = new MongoDBStore({
    uri: process.env.MONGO_URI,
    collection: 'test-facebook-login-session',
});
mongoDBStore.on('error', (error) => {
    console.log('[SESSION-ERROR] MongoDB session store error:', error);
});
mongoDBStore.on('connected', (error) => {
    console.log('[SESSION] MongoDB session store : Connected');
    startListenPort();
});

// Initialize Passport
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: process.env.FACEBOOK_CALLBACK_URL,
}, function(accessToken, refreshToken, profile, done) {
    // This function will be called after successful authentication
    // You can store user information or perform additional actions here
    return done(null, profile);
}));

// Serialize and deserialize user data
passport.serializeUser((user, done) => {
    done(null, user);
});
passport.deserializeUser((user, done) => {
    done(null, user);
});

// MongoDB ver
app.use(session({
    secret: 'nonlnwza',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false,
        maxAge: 86400000,  // 86400000 ms = 1 day
    },
    store: mongoDBStore,
}));
app.use(morgan("dev"));
app.use(passport.initialize());
app.use(passport.session());

// Facebook authentication routes
app.get('/auth/facebook', passport.authenticate('facebook'));

app.get('/auth/facebook/callback', passport.authenticate('facebook', { successRedirect: '/dashboard', failureRedirect: '/login' }));

app.get('/dashboard', (req, res) => {
    // Check if the user is logged in
    if (!req.isAuthenticated()) {
        return res.redirect('/auth/facebook'); // Redirect to Facebook login if not logged in
    }

    // User is logged in, display the dashboard
    const user = req.user;
    res.json(user);
});


// logout
app.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('/');
    });
});

// start server
function startListenPort() {
    server.listen(port);
}
server.on("listening", async () => {
    console.log(("[APP] ") + (`Localhost : http://127.0.0.1:${port}`));
    console.log(("[APP] ") + (`Listening on port : `) + (port));
});
server.on("error", (err) => {
    console.log("[APP-ERROR] " + err);
});


// test route
// app.get("/test", (req, res) =>{
//     if (!req.isAuthenticated()) {
//         return res.send("not login");
//     }
//     else {
//         return res.send("loging in");
//     }
// });