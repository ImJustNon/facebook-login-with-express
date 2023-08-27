require("dotenv").config();
const express = require('express');
const session = require('express-session');
const MongoDBStore = require('connect-mongodb-session')(session);
const axios = require('axios');
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

// Facebook login route
app.get('/auth/facebook', (req, res) => {
    const params = new URLSearchParams({
        client_id: process.env.FACEBOOK_APP_ID,
        redirect_uri: process.env.FACEBOOK_CALLBACK_URL,
        response_type: 'code',
        scope: 'public_profile email', // Include the email scope
    });

    res.redirect(`https://www.facebook.com/v14.0/dialog/oauth?${params}`);
});

// Facebook callback route
app.get('/auth/facebook/callback', async (req, res) => {
    const code = req.query.code;
    try {
        const response = await axios.get(`https://graph.facebook.com/v14.0/oauth/access_token?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${process.env.FACEBOOK_CALLBACK_URL}&client_secret=${process.env.FACEBOOK_APP_SECRET}&code=${code}`);

        const accessToken = response.data.access_token;

        // Fetch user data from Facebook Graph API using the access token
        const userResponse = await axios.get(`https://graph.facebook.com/v14.0/me?fields=id,name,email&access_token=${accessToken}`);

        const user = userResponse.data;

        // Save user data in the session
        req.session.user = user;

        res.redirect('/dashboard'); // Redirect to the dashboard or authorized page
    } catch (error) {
        console.error('Error exchanging code for access token:', error.response.data);
        res.status(500).send('An error occurred during login.');
    }
});

// Logout route
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
        }
        res.redirect('/');
    });
});

app.get('/dashboard', (req, res) => {
    // Check if the user is logged in
    if (!req.session.user) {
        return res.redirect('/auth/facebook'); // Redirect to Facebook login if not logged in
    }

    // User is logged in, display the dashboard
    const user = req.session.user;
    res.json(user);
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
