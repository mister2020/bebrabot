const easyvk = require('easyvk');
const conn = require('./dbConnection').promise();

easyvk({
    token: 'e13be26cb8b8fc04feebffd48acf639702df9982610cf5b506253b23ff3eb8f47367a37a71758db506f54'
  }).then(vk => {
  
    console.log(vk.session.group_id);
  
    vk.bots.longpoll.connect({
        forGetLongPollServer: {
            grop_id: vk.session.group_id
        }
    }).then((connection) => {
        
        connection.on("message_new", async (msg) => {

            const user = await vk.call("users.get", {
                user_ids: msg.from_id
            }).catch(console.error);

            const [row] = await conn.execute(
                "SELECT `vk_id` FROM `users` WHERE `vk_id`=?",
                [msg.from_id]
              );

            if (row.length > 0) {
                console.log("---Reg ["+user[0].first_name+" "+user[0].last_name+"]: "+msg.text);

                const [user_row] = await conn.execute(
                    "SELECT * FROM `users` WHERE `vk_id`=?",
                    [msg.from_id]
                  );

                const all_messages = user_row[0].messages + 1;
                const all_balance = user_row[0].balance + 0.1;

                conn.execute(
                    "UPDATE `users` SET `messages`=?, `balance`=? WHERE `vk_id`=?",[
                        all_messages,
                        all_balance.toFixed(1),
                        msg.from_id
                    ]);
            } else {
                const [rows] = await conn.execute('INSERT INTO `users`(`vk_id`,`first_name`,`last_name`,`balance`,`messages`) VALUES(?,?,?,?,?)',[
                    msg.from_id,
                    user[0].first_name,
                    user[0].last_name,
                    0,
                    0
                ]);
                const [all_rows] = await conn.execute('SELECT * FROM users');
                console.log("+1 NEW: "+all_rows.length+" [[["+user[0].first_name+" "+user[0].last_name+"]]]");
            }


            const [global_row] = await conn.execute(
                "SELECT * FROM `users` WHERE `vk_id`=?",
                [msg.from_id]
              );


            const ban_words = ["бля", "сук", "пидор", "пидр", "еб"];
            let total_ban_words = 0;
            let i = 0;
            while(i < ban_words.length){
                let str = msg.text;
                let target = ban_words[i];
    
                let pos = -1;
                while ((pos = str.indexOf(target, pos + 1)) != -1) {
                    total_ban_words += 1;
                }
                i++;
            }

            if(total_ban_words > 0){

                const [user_row] = await conn.execute(
                    "SELECT * FROM `users` WHERE `vk_id`=?",
                    [msg.from_id]
                  );

                const all_balance = user_row[0].balance - (total_ban_words * 0.3);

                if (all_balance <= 0) {
                    conn.execute(
                        "UPDATE `users` SET `balance`=? WHERE `vk_id`=?",[
                            0,
                            msg.from_id
                        ]);

                    let res = await vk.call("messages.send", {
                        peer_id: msg.peer_id,
                        message: `Мат запрещен! Матерных слов: ${total_ban_words}
                        ВЫ ОБНОКРОТИЛИСЬ ИЗ-ЗА МАТА!!!
                        Баланс: 0₽`,
                        random_id: easyvk.randomId()
                    }).catch(console.error);
        
                    setTimeout(function(){
                        vk.call("messages.delete", {
                            peer_id: msg.peer_id,
                            message_ids: JSON.stringify(res),
                            delete_for_all: 1
                        }).catch(console.error);
                    }, 3000);

                } else {
                    conn.execute(
                        "UPDATE `users` SET `balance`=? WHERE `vk_id`=?",[
                            all_balance.toFixed(1),
                            msg.from_id
                        ]);

                    let res = await vk.call("messages.send", {
                        peer_id: msg.peer_id,
                        message: `Мат запрещен! Матерных слов: ${total_ban_words}
                        Вычитаем ${total_ban_words * 0.3}₽!
                        Баланс: ${all_balance.toFixed(1)}₽`,
                        random_id: easyvk.randomId()
                    }).catch(console.error);
        
                    setTimeout(function(){
                        vk.call("messages.delete", {
                            peer_id: msg.peer_id,
                            message_ids: JSON.stringify(res),
                            delete_for_all: 1
                        }).catch(console.error);
                    }, 3000);
                }         
            }
           
            
            if(msg.text === "test" || msg.text === "[club204786036|@bebra_bot] test"){
                return vk.call("messages.send", {
                    peer_id: msg.peer_id,
                    message: "Ping!",
                    random_id: easyvk.randomId()
                }).catch(console.error);
            }

            if(msg.text === "баланс" || msg.text === "[club204786036|@bebra_bot] баланс"){
                let res = await vk.call("messages.send", {
                    peer_id: msg.peer_id,
                    message: global_row[0].balance + "₽",
                    random_id: easyvk.randomId()
                }).catch(console.error);
                console.log(JSON.stringify(res));
                return;
            }
            //console.log(msg);
        });

    });
  
  })
