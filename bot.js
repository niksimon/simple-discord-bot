const Discord = require("discord.js");
const bot = new Discord.Client();
const ytdl = require('ytdl-core');
const snoowrap = require('snoowrap');
const fs = require("fs");

bot.on('ready', function (evt) {
    bot.user.setActivity('Movie', { type: 'WATCHING' });
});

var soundFiles = fs.readdirSync("./sound/");
var sounds = soundFiles.filter(file => file.endsWith(".mp3") || file.endsWith(".wav"));
var soundsMap = sounds.map(function(val) { return val.substring(0, val.length - 4); });

var dispatcher = null;
var botVoiceChannel = null;

function hexToRGB(hex) {
    var r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
    return [r, g, b];
}

function hexToOLE(hex, opacity = 1) {
    var rgba = [...hexToRGB(hex), opacity];
    return (rgba[0] << 16) + (rgba[1] << 8) + rgba[2];
}

function randomHex() {
    return '#' + Math.floor(Math.random() * 16777215).toString(16);
}

function getMemes(numberOfMemes = 3, subReddit = 'memes') {
    // meme image filter
    const whiteList = ['jpg', 'jpeg', 'png', 'gif'];
  
    // create reddit client
    const r = new snoowrap({
        userAgent: 'Mozilla/5.0',
        clientId: '',
        clientSecret: '',
        username: '',
        password: '',
    });
    
    // execute query
    return r.getRandomSubmission(subReddit);
}

bot.on('message', message => {
    if(!message.author.bot) {
        var msg = message.content;
        var userVoiceChannel = message.member.voiceChannel;

        // pelican commands
        if(msg.toLowerCase().startsWith("pelican ")) {
            var command = msg.split(" ")[1];

            // play audio
            var localAudioId = soundsMap.indexOf(command);
            var isRadio = command === "radio";
            if(localAudioId > -1 || isRadio || command.startsWith("https://www.youtube.com/") || command.startsWith("https://youtu.be/")) {
                if(userVoiceChannel) {

                    botVoiceChannel = userVoiceChannel;
                    
                    userVoiceChannel.join().then(connection => {

                        // local audio
                        if(localAudioId > -1) {
                            message.delete(1000);
                            message.channel.send( { embed:
                                {
                                    color: hexToOLE(randomHex()),
                                    title: message.member.user.tag.split("#")[0] + " is playing",
                                    description: sounds[localAudioId]
                                    /*fields: [
                                        {
                                            name: "File",
                                            value: sounds[localAudioId]
                                        }
                                    ]*/
                                }
                            });
                            dispatcher = connection.playFile("./sound/" + sounds[localAudioId]);
                        }

                        // radio
                        else if(isRadio) {
                            var radioURL = msg.split(" ")[2];
                            if(radioURL === "") {
                                message.channel.send("Specify radio URL to play \:eggplant\:");
                            }
                            else {
                                dispatcher = connection.playStream(radioURL);
                            }
                        }

                        // youtube
                        else {
                            const streamOptions = { seek: 0, volume: 1 };
                            const stream = ytdl(command, { filter : 'audio' });
                            message.delete(1000);
                            ytdl.getInfo(command, function(err, info) {
                                var playingInfo = info.title.length < 50 ? info.title : info.title.substring(0, 70) + '...';
                                message.channel.send( { embed:
                                    {
                                        color: hexToOLE(randomHex()),
                                        title: message.member.user.tag.split("#")[0] + " is playing",
                                        description: playingInfo,
                                        fields: [
                                            {
                                                name: "Link",
                                                value: command
                                            }
                                        ]
                                    }
                                });
                            });

                            dispatcher = connection.playStream(stream, streamOptions);
                        }

                        dispatcher.on("end", end => {
                            dispatcher = null;
                        });

                        dispatcher.on('error', err => console.log(err));

                    }).catch(err => console.log(err));
                }
                else {
                    message.channel.send("Join a voice channel \:eggplant\:");
                }
            }

            // pause audio
            else if(command === "pause") {
                if(!dispatcher.paused) {
                    dispatcher.pause();
                }
                else {
                    message.channel.send("Already paused \:eggplant\:");
                }
            }

            // resume audio
            else if(command === "resume") {
                if(dispatcher.paused) {
                    dispatcher.resume();
                }
                else {
                    message.channel.send("Already playing \:eggplant\:");
                }
            }

            // stop audio
            else if(command === "stop") {
                if(dispatcher !== null && !dispatcher.destroyed) {
                    dispatcher.end();
                }
                else {
                    message.channel.send("Not playing \:eggplant\:");
                }
            }

            // leave voice channel
            else if(command === "leave" && botVoiceChannel !== null) {
                try {
                    botVoiceChannel.leave();
                    botVoiceChannel = null;
                }
                catch(err) {
                    // 
                }
            }

            // memes
            else if(command === "meme") {
                getMemes().fetch().then(function meme(data) {
                    const embed = new Discord.RichEmbed()
                    .setTitle(data.title)
                    .setColor(0x00AE86)
                    .setDescription("Upvotes: " + data.ups.toLocaleString())
                    .setImage(data.url);
                    
                    message.channel.send({embed});
                });
            }

            // commands list
            else if(command === "help") {
                message.channel.send( { embed:
                    {
                        color: hexToOLE(randomHex()),
                        title: "PelicanOS commands",
                        description: "Use prefix pelican",
                        fields: [
                            {
                                name: "Sounds",
                                value: soundsMap.join(", ")
                            },
                            {
                                name: "YouTube",
                                value: "Play YouTube audio, url must start with *https://www.youtube.com/* or *https://youtu.be/*"
                            },
                            {
                                name: "Memes",
                                value: "Use `pelican meme` to get random meme from Reddit"
                            },
                            {
                                name: "General",
                                value: "*stop* - stops playing music\n*leave* - leave voice channel\n*pause* - pause music\n*resume* - resume playing music"
                            }
                        ]
                    }
                });
            }
            else if(command === "chance") {
                var sliced = msg.slice(15, msg.length);
                //console.log(msg.slice(15, msg.length));

                if(sliced === "count") {
                    var counter = mainDb("get").catch(console.error);

                    counter.then(function(result) {
                        message.channel.send( { embed:
                            {
                                color: hexToOLE(randomHex()),
                                title: "Chance command count: " + result
                            }
                        });
                    })
                } else {
                    message.channel.send( { embed:
                        {
                            color: hexToOLE(randomHex()),
                            title: "Chance " + sliced,
                            description: "There is " + (Math.floor(Math.random() * 100) + 1) + "% chance " + sliced
                        }
                    });

                    mainDb("update").catch(console.error);
                }
            }

            // unknown command
            else {
                message.channel.send("Unknown command \:eggplant\:");
            }
        }
    }
});

bot.login("");