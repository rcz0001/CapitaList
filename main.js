class User {
    constructor(con, email, password, meta, session) {
        this.con = con;
        this.email = email;
        this.password = password;
        this.meta = meta;
        this.session = session;
    }
}

process.title = 'server-main';
var wsServerPort = 1337;
var webSocketServer = require('websocket').server;
var http = require('http');
var clients = [];
var users = [];
var assets;

function valUser(data) {
    try {
        var user = JSON.parse(data);
        console.log(data);
        return validate(user.email, user.sessionid);
    }
    catch(e) {
        console.log("failed to parse");
        return false;
    }
}
function makeid(n) {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < n; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}
function validate(email, sessionid) {
    var loggedIn = -1;
    for (var i = 0; i < clients.length; i++) {
        if (clients[i].email === email) loggedIn = i;
    }
    if (loggedIn === -1) return false;
    else if (clients[loggedIn].session !== email) return false;
    clients[loggedIn].lastActive = new Date();
    return true;
}
function getUser(data, isLoggedIn) {
    try {
        var user = JSON.parse(data);
        if (isLoggedIn) {
            for (var i = 0; i < clients.length; i++)
                if (clients[i].email === user.email) return clients[i];
        }
        else {
            for (var i = 0; i < users.length; i++)
                if (users[i].email === user.email) return users[i];
        }
        return null;
    }
    catch(e) {
        console.log("failed to parse");
        return null;
    }
}
var server = http.createServer(function(req, res) {});
server.listen(wsServerPort, function() {
    console.log((new Date()) + " Server is listening on port "
            + wsServerPort);
});
var wsServer = new webSocketServer({ httpServer: server });
wsServer.on('request', function(request) {
    console.log((new Date()) + ' Connection from origin '
            + request.origin + '.');
    var con = request.accept(null, request.origin); 
    console.log((new Date()) + ' Connection accepted.');
    con.on('message', function(message) {
        try {
            var data = JSON.parse(message.utf8Data);
            console.log(data.type);
            var data2 = data.data2;
            switch (data.type) {
                case "login":
                    try {
                        var user = data2[0];
                        if (user.email === null || user.email === undefined) user.email = "";
                        var user2 = getUser(user, false);
                        if (user2 === null) con.sendUTF('login~false');
                        else {
                            if (user2.password === user.password) {
                                var id = makeid(50);
                                user2.con = con;
                                user2.session = id;
                                clients.push(user2);
                                con.sendUTF('login~true~' + user.email + '~' + id);
                            }
                            else con.sendUTF('login~false');
                        }
                    }
                    catch(e) {
                        con.sendUTF('login~false');
                    }
                    break;
                case "signOut":
                    if (valUser(data2[0])) {
                        var user = getUser(data2[0]);
                        for (var i = 0; i < clients.length; i++) {
                            if (clients[i] === user) {
                                clients.splice(i, 1);
                                console.log("account logged out");
                            }
                        }
                    }
                    break;
                case "signedIn":
                    if (valUser(data2[0])) {
                        var user = getUser(data2[0]);
                        user.con = con;
                        con.sendUTF("signedIn~true");
                    }
                    else con.sendUTF("signedIn~false");
                    break;
            }
        }
        catch(e) {
            console.log(e);
        }
    });
});