var express = require('express')
var sha256 = require('js-sha256')
var app = express()
var http = require('http').Server(app)
var io = require('socket.io')(http)
var path = require('path')
var fs = require('fs')
var port = process.env.PORT || 5000

var filterHTML = function(string){
    return string.replace(/>/g,"&gt;").replace(/</g,"&lt;").replace("javascript:","javascript˸") // preventing xss (ofc not perfect)
}
var usersonline = []

if(!fs.existsSync("hashes.json")){
    fs.writeFileSync("hashes.json", "{}")
}
function getHashes() {
    return JSON.parse(fs.readFileSync('hashes.json'))
}
function saveHashes(hashes) {
    fs.writeFileSync('hashes.json', JSON.stringify(hashes, null, "\t"));
}

if(!fs.existsSync("banned.json")){
    fs.writeFileSync("banned.json", "{}")
}
function getBanned() {
    return JSON.parse(fs.readFileSync('banned.json'))
}
function saveBanned(banlist) {
    fs.writeFileSync('banned.json', JSON.stringify(banned, null, "\t"));
}

if(!fs.existsSync("specials.json")){
    fs.writeFileSync("specials.json", "{}")
}
function getSpecials() {
    return JSON.parse(fs.readFileSync('specials.json'))
}

function getIP(socket) {
    return socket.handshake.address.replace("::","").replace("ffff:","")
}

class User {
    constructor(name, ip, session, sock) {
            this.name = name
            this.ip = ip
            this.session = session
            this.sock = sock
            
            //this.leaveVoicechannel()
            usersonline.push(this)
    }

    getname() {
        return this.name
    }

    getip() {
        return this.ip
    }

    getsession() {
        return this.session
    }

    setsocket(sock) {
        this.sock = sock
    }

    getsocket() {
        return this.sock
    }

    /*joinVoicechannel() {
        this.voicechannel = true
    }

    leaveVoicechannel() {
        this.voicechannel = false
    }

    getVoicechannel() {
        return this.voicechannel
    }*/

    disconnect() {
        var userindex = usersonline.indexOf(this)
        usersonline.splice(userindex, 1)
    }
}

function getUserByName(name) {
    for (user of usersonline) {
        if (user.getname() == name) {
            return user
        }
    }
    return 0
}

function getUserByIP(ip) {
    for (user of usersonline) {
        if (user.getip() == ip) {
            return user
        }
    }
    return 0
}

function getSession(ip) {
    var user = getUserByIP(ip)
    if (user == 0)
        return 0
    return user.getsession()
}

app.use('/', express.static( __dirname + "/site" ) )
app.get('/', function(req, res){
    res.sendFile(__dirname + '/site/html/index.html')
})

function login(sock, pass) {
    var failed = true
    var hashes = getHashes();

    if(getUserByIP(getIP(sock)) != 0) {
        getUserByIP(getIP(sock)).disconnect()
    }

    for (c_pass of Object.keys(hashes)) {
        if (pass == c_pass) {
            failed = false
            var name = hashes[c_pass]
            var name = filterHTML(name)
            var ip = getIP(sock)
            var session = {ip, c_pass}
            new User(name, ip, session, sock)
            break
        }
    }

    if (failed)
        sock.emit("loginFail")
    else
        sock.emit("loginSuccess")
}

function register(sock, username, pass) {
    var user = getUserByIP(getIP(sock))
    if (user != 0) 
        return

    var failed = false
    var hashes = getHashes();

    for (c_pass of Object.keys(hashes)) {
        if ((c_pass == pass) || (hashes[c_pass] == username)) {
            failed = true
            break
        }
    }
    
    if (failed)
        sock.emit("registerFail")
    else {
        hashes[pass] = username
        saveHashes(hashes)

        sock.emit("registerSuccess")
    }
}

function UserDisconnect(sock) {
    var user = getUserByIP(getIP(sock))
    if (user == 0)
        return
    user.disconnect()
}

function sendMessage(sock, message) {
    var user = getUserByIP(getIP(sock))
    if (user == 0)
        return

    var message = filterHTML(message)
    if (!message) {return}

    var specials = getSpecials()
    for (key of Object.keys(specials)) {
        message = message.replace(key, specials[key])
    }
    var sendedMessage = "<div class='message'><b>"+user.name+"</b>\n <span style='txt'>"+message+"</span></div>"

    for (user of usersonline) {
        if (user.getsocket().connected) {
            user.getsocket().emit("message", sendedMessage)
        }
    }
}

function checkSession(sock) {
    var session = getSession(getIP(sock))
    if (session != 0)
        sock.emit('checkSuccess')
    else
        sock.emit('checkFail')
}

function getOnlineUsers() {
    OnlineList = []
    for (user of usersonline) {
        if (user.getsocket().connected)
            OnlineList.push(user.name)
    }

    return OnlineList
}

function sendOnlineUsers(sock) {
    sock.emit("getOnlineUsers", getOnlineUsers())
}

function sendVoice(sock, stream) {
    for (user of usersonline) {
        if (user.getsocket().connected && user.getVoicechannel()) {
            user.getsocket().emit("getVoice", stream)
        }
    }
}

/*function joinVoiceChannel(sock) {
    var user = getUserByIP(getIP(sock))
    if (user !== 0) {
        user.joinVoicechannel()
    }
}

function leaveVoicechannel(sock) {
    var user = getUserByIP(getIP(sock))
    if (user !== 0) {
        user.leaveVoicechannel()
    }
}*/

function eventConnect(sock) {
    var ip = getIP(sock)
    
    var banlist = getBanned()
    for(i of Object.keys(banlist)){
        i = i.toString()
        if(banlist[i].toString() == ip){
            sock.emit('message', "This ip / account has been banned from using our services", "NetTalk")
            sock.emit('message', "Of course, this could be a mistake. If you think so contact @_creepi on Twitter", "NetTalk")
            UserDisconnect(sock)
            sock.disconnect()
            return
        }
    }

    var _u = getUserByIP(ip)
    if (_u !== 0) {_u.setsocket(sock)}

    sock.on('disconnect', function(){leaveVoicechannel(sock)})
    sock.on('login', function(pass){login(sock, pass)})
    sock.on('destroySession', function(){UserDisconnect(sock)})
    sock.on('register', function(username, pass){register(sock, username, pass)})
    sock.on('message', function(message){sendMessage(sock, message)})
    sock.on('checkSession', function(){checkSession(sock)})
    sock.on("sendOnlineUsers", function(){sendOnlineUsers(sock)})
    /*sock.on("sendVoice", function(stream){sendVoice(sock, stream)})
    sock.on("joinVoiceChannel", function(){joinVoiceChannel(sock)})*/
}

io.on('connection',eventConnect)

http.listen(port, function(){
    console.log('listening on *:' + port);
})