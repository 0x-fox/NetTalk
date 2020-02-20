
let sock = undefined 

function initSock(){ 
    return new Promise((resolve, reject) => {
        sock = io.connect(`http://${document.domain}:${location.port}`)
        .on('connect', () => {
            if (sock.disconnected) 
                reject("Couldn't connect to the server")
            setInterval(function() {
                redirectifnotSession(sock, '/')
                fetchOnlineUsers(sock)
            }, 500)
        })
        resolve(sock)
    })
}

function initChat(){
    initSock()
    .then(sock => initMessageHandler(sock))
    .catch(err => console.error(err))
}

$(document).on('ready', initChat)

$('#message-button').on('click', handleMessage(sock))