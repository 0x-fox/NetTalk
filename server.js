        socket.on('message', function(msg){
                hashes = JSON.parse(fs.readFileSync('hashes.json'));
                try{
                msg = filterHTML(msg);
                }catch(e){};
                io.emit('message', "<div class='message'>"+hashes[sessions[socket.handshake.address.replace('::ff$
                try{
                }catch(e){};
        });
